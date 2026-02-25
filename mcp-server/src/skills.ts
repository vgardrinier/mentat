import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import yaml from 'yaml';
import { glob } from 'glob';

/**
 * Skills = curated prompt library for Claude
 * This module just loads YAML and formats instructions + context
 * Claude does all the actual work using its Edit/Read/Bash tools
 */

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  instructions: string;
  context_patterns?: string[];
  examples?: string;
}

export interface GatheredContext {
  files: Array<{ path: string; content: string; lines: number }>;
  totalChars: number;
  truncated: boolean;
}

const LIMITS = {
  maxFiles: 10,
  maxFileSize: 50_000,
  maxTotalChars: 400_000,
};

export class SkillLibrary {
  constructor(
    private skillsPath: string,
    private workspacePath: string,
    private apiBaseUrl?: string
  ) {}

  /**
   * Load skill from YAML with 3-tier resolution:
   * 1. Project override (./skills/)
   * 2. Cache (~/.mentat/skills/)
   * 3. API fetch with SHA256 verification
   */
  async loadSkill(skillId: string, version: string = 'latest'): Promise<SkillDefinition> {
    // 1. Check project override: ./skills/{skillId}.yaml
    const projectPath = path.join(this.workspacePath, 'skills', `${skillId}.yaml`);
    if (await this.fileExists(projectPath)) {
      const content = await fs.readFile(projectPath, 'utf-8');
      return this.parseSkillYaml(content);
    }

    // 2. Check cache: ~/.mentat/skills/{skillId}/{version}.yaml
    const cachedPath = path.join(os.homedir(), '.mentat', 'skills', skillId, `${version}.yaml`);
    if (await this.fileExists(cachedPath)) {
      const content = await fs.readFile(cachedPath, 'utf-8');
      return this.parseSkillYaml(content);
    }

    // 3. Fetch from API (if configured)
    if (!this.apiBaseUrl) {
      throw new Error(`Skill ${skillId} not found locally and no API configured`);
    }

    const response = await fetch(`${this.apiBaseUrl}/api/skills/${skillId}/${version}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch skill ${skillId}@${version}: ${response.statusText}`);
    }

    const { yaml_content, sha256, version: actualVersion } = await response.json();

    // 4. Verify integrity
    const computedHash = crypto.createHash('sha256').update(yaml_content).digest('hex');
    if (computedHash !== sha256) {
      throw new Error(`SHA256 mismatch for ${skillId}@${actualVersion}`);
    }

    // 5. Cache locally
    const cachePath = path.join(os.homedir(), '.mentat', 'skills', skillId, `${actualVersion}.yaml`);
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    await fs.writeFile(cachePath, yaml_content);

    return this.parseSkillYaml(yaml_content);
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse skill YAML content
   */
  private parseSkillYaml(content: string): SkillDefinition {
    const parsed = yaml.parse(content);
    return {
      id: parsed.skill.id,
      name: parsed.skill.name,
      description: parsed.skill.description,
      instructions: parsed.skill.instructions || this.generateInstructions(parsed.skill),
      context_patterns: parsed.skill.context_patterns,
      examples: parsed.skill.examples,
    };
  }

  /**
   * Gather file context based on patterns or explicit files
   * If explicit files are provided, patterns are ignored (respects user intent)
   */
  async gatherContext(
    patterns: string[] = [],
    explicitFiles: string[] = []
  ): Promise<GatheredContext> {
    const filePaths = new Set<string>();

    // Add explicit files
    explicitFiles.forEach((f) => filePaths.add(path.resolve(this.workspacePath, f)));

    // Only use patterns if no explicit files were provided
    // This prevents bloat when user specifies exact target files
    if (filePaths.size === 0) {
      for (const pattern of patterns) {
        const matches = await glob(pattern, {
          cwd: this.workspacePath,
          absolute: true,
          ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
        });
        matches.slice(0, LIMITS.maxFiles).forEach((f) => filePaths.add(f));
      }
    }

    // Rank and limit files
    const rankedFiles = await this.rankFiles(Array.from(filePaths));
    const limitedFiles = rankedFiles.slice(0, LIMITS.maxFiles);

    // Read file contents
    const files = [];
    let totalChars = 0;
    let truncated = false;

    for (const filePath of limitedFiles) {
      try {
        const stats = await fs.stat(filePath);

        if (stats.size > LIMITS.maxFileSize) {
          truncated = true;
          continue;
        }

        if (totalChars + stats.size > LIMITS.maxTotalChars) {
          truncated = true;
          break;
        }

        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').length;

        files.push({
          path: path.relative(this.workspacePath, filePath),
          content,
          lines,
        });

        totalChars += content.length;
      } catch (error) {
        console.error(`Failed to read ${filePath}:`, error);
      }
    }

    return { files, totalChars, truncated };
  }

  /**
   * Rank files by relevance
   */
  private async rankFiles(files: string[]): Promise<string[]> {
    const scored = await Promise.all(
      files.map(async (f) => {
        const stats = await fs.stat(f).catch(() => null);
        const relativePath = path.relative(this.workspacePath, f);

        let score = 0;

        // Deprioritize test files
        if (relativePath.includes('test') || relativePath.includes('spec')) {
          score -= 100;
        }

        // Prefer root-level files
        const depth = relativePath.split(path.sep).length;
        score -= depth * 10;

        // Slight preference for smaller files
        if (stats) {
          score -= stats.size / 10000;
        }

        return { path: f, score };
      })
    );

    return scored.sort((a, b) => b.score - a.score).map((s) => s.path);
  }

  /**
   * Format skill + context for Claude to read
   */
  formatForClaude(skill: SkillDefinition, context: GatheredContext): string {
    const parts = [];

    // Add friendly preamble
    parts.push(`Applying the **${skill.name}** skill...`);
    parts.push(`${skill.description}\n`);

    parts.push(`## Instructions`);
    parts.push(skill.instructions);
    parts.push('');

    if (skill.examples) {
      parts.push(`## Examples`);
      parts.push(skill.examples);
      parts.push('');
    }

    if (context.files.length > 0) {
      const fileCount = context.files.length;
      const fileWord = fileCount === 1 ? 'file' : 'files';
      parts.push(`## Working with ${fileCount} ${fileWord}`);

      for (const file of context.files) {
        // Show just the filename for readability, not the full path
        const fileName = file.path.split('/').pop() || file.path;
        parts.push(`\n### ${fileName}`);
        parts.push(`<details><summary>View content (${file.lines} lines)</summary>\n`);
        parts.push('```');
        parts.push(file.content);
        parts.push('```');
        parts.push('</details>');
      }

      if (context.truncated) {
        parts.push(`\n⚠️  Some files were excluded due to size limits.`);
      }
    }

    parts.push(`\n---`);
    parts.push(`**Next steps:**`);
    parts.push(`1. Review the instructions above`);
    parts.push(`2. Use your Edit tool to make the changes`);
    parts.push(`3. Use Read tool if you need to check additional files`);

    return parts.join('\n');
  }

  /**
   * Backward compatibility for old YAML format
   */
  private generateInstructions(skillDef: any): string {
    return skillDef.description || 'Complete the task as described.';
  }
}
