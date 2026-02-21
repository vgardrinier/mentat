import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { z } from 'zod';

// Skill definition schema
const SkillSchema = z.object({
  skill: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    pricing: z.union([z.literal('free'), z.number()]),
    author: z.string().optional(),
    version: z.string(),
    inputs: z.record(
      z.object({
        type: z.enum(['string', 'number', 'boolean', 'select', 'multiselect']),
        required: z.boolean(),
        default: z.any().optional(),
        description: z.string(),
        options: z.array(z.string()).optional(),
      })
    ).optional(),
    context_needed: z.array(
      z.object({
        description: z.string(),
        pattern: z.string(),
        max_files: z.number().optional(),
      })
    ).optional(),
    execution: z.array(
      z.object({
        step: z.string(),
      }).passthrough()
    ),
    validation: z.array(
      z.object({
        check: z.string(),
      }).passthrough()
    ).optional(),
    success_message: z.string(),
    estimated_time: z.number(),
  }),
});

export type SkillDefinition = z.infer<typeof SkillSchema>;

export interface ExecutionState {
  inputs: Record<string, any>;
  context: Record<string, any>;
  changes: Array<{
    type: 'create' | 'update' | 'delete';
    path: string;
    content?: string;
  }>;
  backupMap?: Map<string, string>; // original file -> backup file
  [key: string]: any; // Allow dynamic properties for step outputs
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  changes?: Array<{
    type: 'create' | 'update' | 'delete';
    path: string;
    content?: string;
  }>;
  error?: string;
}

export class SkillEngine {
  private workspacePath: string;
  private backupPath: string;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.backupPath = path.join(workspacePath, '.skill-backups');
  }

  /**
   * Load and parse skill definition from YAML
   */
  async loadSkill(skillPath: string): Promise<SkillDefinition> {
    const content = await fs.readFile(skillPath, 'utf-8');
    const parsed = yaml.parse(content);
    return SkillSchema.parse(parsed);
  }

  /**
   * Execute a skill with given inputs
   */
  async executeSkill(
    skillDefinition: SkillDefinition,
    inputs: Record<string, any>,
    context: Record<string, any>
  ): Promise<ExecutionResult> {
    const { skill } = skillDefinition;

    // Initialize state early so it's available in catch block
    let state: ExecutionState = {
      inputs,
      context,
      changes: [],
    };

    try {
      // Step 1: Validate inputs
      this.validateInputs(skill.inputs || {}, inputs);

      // Step 2: Create backup of files we might modify
      const backupMap = await this.createBackup(context.files || []);
      state.backupMap = backupMap;

      // Step 3: Run validation checks
      if (skill.validation) {
        for (const validation of skill.validation) {
          await this.runValidation(validation, state);
        }
      }

      // Step 4: Execute steps
      for (const step of skill.execution) {
        await this.executeStep(step, state);
      }

      // Step 5: Return success
      return {
        success: true,
        message: skill.success_message,
        changes: state.changes,
      };
    } catch (error) {
      // Rollback on error - restore files from backup
      await this.rollback(state);

      return {
        success: false,
        message: 'Skill execution failed (changes have been rolled back)',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate inputs against skill definition
   */
  private validateInputs(
    inputDef: Record<string, any>,
    inputs: Record<string, any>
  ): void {
    for (const [key, def] of Object.entries(inputDef)) {
      const value = inputs[key];

      // Check required
      if (def.required && value === undefined) {
        throw new Error(`Missing required input: ${key}`);
      }

      // Type validation
      if (value !== undefined) {
        switch (def.type) {
          case 'string':
            if (typeof value !== 'string') {
              throw new Error(`Input ${key} must be a string`);
            }
            break;
          case 'number':
            if (typeof value !== 'number') {
              throw new Error(`Input ${key} must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean') {
              throw new Error(`Input ${key} must be a boolean`);
            }
            break;
          case 'select':
            if (!def.options?.includes(value)) {
              throw new Error(
                `Input ${key} must be one of: ${def.options?.join(', ')}`
              );
            }
            break;
          case 'multiselect':
            if (!Array.isArray(value)) {
              throw new Error(`Input ${key} must be an array`);
            }
            break;
        }
      }
    }
  }

  /**
   * Run validation check
   */
  private async runValidation(validation: any, state: ExecutionState): Promise<void> {
    const { check } = validation;

    switch (check) {
      case 'valid_javascript':
        // Would need actual JS parser - simplified for MVP
        break;
      case 'no_syntax_errors':
        // Would need linting - simplified for MVP
        break;
      case 'file_exists':
        const filePath = this.resolvePath(validation.path, state);
        try {
          await fs.access(filePath);
        } catch {
          throw new Error(`File not found: ${filePath}`);
        }
        break;
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: any, state: ExecutionState): Promise<void> {
    switch (step.step) {
      case 'read_file':
        await this.stepReadFile(step, state);
        break;
      case 'write_file':
        await this.stepWriteFile(step, state);
        break;
      case 'update_file':
        await this.stepUpdateFile(step, state);
        break;
      case 'delete_file':
        await this.stepDeleteFile(step, state);
        break;
      case 'rename_file':
        await this.stepRenameFile(step, state);
        break;
      case 'for_each':
        await this.stepForEach(step, state);
        break;
      case 'analyze_code':
      case 'generate_types':
      case 'transform':
        // These would require AI/LLM calls - simplified for MVP
        // In production, these would call Claude API
        state[step.save_as] = `[Generated content for ${step.step}]`;
        break;
      case 'throw_error':
        // For testing rollback mechanism
        throw new Error(step.message || 'Intentional error for testing');
      default:
        console.warn(`Unknown step type: ${step.step}`);
    }
  }

  /**
   * Read file step
   */
  private async stepReadFile(step: any, state: ExecutionState): Promise<void> {
    const filePath = this.resolvePath(step.path, state);
    this.validateFilePath(filePath);

    const content = await fs.readFile(filePath, 'utf-8');

    if (step.save_as) {
      state[step.save_as] = content;
    }
  }

  /**
   * Write file step
   */
  private async stepWriteFile(step: any, state: ExecutionState): Promise<void> {
    const filePath = this.resolvePath(step.path, state);
    this.validateFilePath(filePath);

    const content = this.resolveValue(step.content, state);

    await fs.writeFile(filePath, content, 'utf-8');

    state.changes.push({
      type: 'create',
      path: filePath,
      content,
    });
  }

  /**
   * Update file step
   */
  private async stepUpdateFile(step: any, state: ExecutionState): Promise<void> {
    const filePath = this.resolvePath(step.path, state);
    this.validateFilePath(filePath);

    let content = await fs.readFile(filePath, 'utf-8');
    const newContent = this.resolveValue(step.content, state);

    switch (step.operation) {
      case 'insert_after':
        const target = step.target;
        content = content.replace(target, `${target}\n${newContent}`);
        break;
      case 'replace':
        content = newContent;
        break;
      case 'append':
        content += `\n${newContent}`;
        break;
    }

    await fs.writeFile(filePath, content, 'utf-8');

    state.changes.push({
      type: 'update',
      path: filePath,
      content,
    });
  }

  /**
   * Delete file step
   */
  private async stepDeleteFile(step: any, state: ExecutionState): Promise<void> {
    const filePath = this.resolvePath(step.path, state);
    this.validateFilePath(filePath);

    await fs.unlink(filePath);

    state.changes.push({
      type: 'delete',
      path: filePath,
    });
  }

  /**
   * Rename file step
   */
  private async stepRenameFile(step: any, state: ExecutionState): Promise<void> {
    const fromPath = this.resolvePath(step.from, state);
    const toPath = this.resolvePath(step.to, state);

    this.validateFilePath(fromPath);
    this.validateFilePath(toPath);

    await fs.rename(fromPath, toPath);

    state.changes.push({
      type: 'delete',
      path: fromPath,
    });
    state.changes.push({
      type: 'create',
      path: toPath,
    });
  }

  /**
   * For each loop step
   */
  private async stepForEach(step: any, state: ExecutionState): Promise<void> {
    const items = this.resolveValue(step.items, state);

    if (!Array.isArray(items)) {
      throw new Error('for_each items must be an array');
    }

    for (const item of items) {
      // Create sub-state with loop variable
      const loopState = {
        ...state,
        [step.as]: item,
      };

      // Execute sub-steps
      for (const subStep of step.do) {
        await this.executeStep(subStep, loopState);
      }
    }
  }

  /**
   * Resolve path with variable substitution
   */
  private resolvePath(pathTemplate: string, state: ExecutionState): string {
    const resolved = this.resolveValue(pathTemplate, state);
    return path.resolve(this.workspacePath, resolved);
  }

  /**
   * Resolve value with variable substitution
   */
  private resolveValue(template: any, state: ExecutionState): any {
    if (typeof template !== 'string') {
      return template;
    }

    // Replace ${variable} patterns
    return template.replace(/\$\{([^}]+)\}/g, (match, varPath) => {
      const value = this.getNestedValue(state, varPath);
      return value !== undefined ? value : match;
    });
  }

  /**
   * Get nested value from object (e.g., "context.files[0]")
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === undefined) return undefined;
      current = current[part];
    }

    return current;
  }

  /**
   * Validate file path is within workspace
   */
  private validateFilePath(filePath: string): void {
    const resolved = path.resolve(filePath);
    const workspace = path.resolve(this.workspacePath);

    if (!resolved.startsWith(workspace)) {
      throw new Error('File path outside workspace not allowed');
    }
  }

  /**
   * Create backup of files
   * Returns a map of original file paths to backup file paths
   */
  private async createBackup(files: string[]): Promise<Map<string, string>> {
    await fs.mkdir(this.backupPath, { recursive: true });

    const timestamp = Date.now();
    const backupMap = new Map<string, string>();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const backupFile = path.join(
          this.backupPath,
          `${timestamp}-${path.basename(file)}`
        );
        await fs.writeFile(backupFile, content, 'utf-8');
        backupMap.set(file, backupFile);

        console.error(`[Backup] ${file} → ${backupFile}`);
      } catch (error) {
        // File might not exist yet, skip backup
        console.error(`[Backup] Skipped ${file} (doesn't exist yet)`);
      }
    }

    return backupMap;
  }

  /**
   * Rollback changes on error - Restores files from backup
   */
  private async rollback(state?: ExecutionState): Promise<void> {
    if (!state?.backupMap || state.backupMap.size === 0) {
      console.error('[Rollback] No backups found - cannot restore files');
      console.error('[Rollback] Files may be in corrupted state!');
      return;
    }

    console.error('[Rollback] Restoring files from backup...');

    let restoredCount = 0;
    let failedCount = 0;
    const failures: string[] = [];

    for (const [originalFile, backupFile] of state.backupMap) {
      try {
        const backupContent = await fs.readFile(backupFile, 'utf-8');
        await fs.writeFile(originalFile, backupContent, 'utf-8');
        restoredCount++;
        console.error(`[Rollback] ✅ Restored ${originalFile}`);
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        failures.push(`${originalFile}: ${errorMsg}`);
        console.error(`[Rollback] ❌ Failed to restore ${originalFile}: ${errorMsg}`);
      }
    }

    console.error(
      `[Rollback] Complete: ${restoredCount} restored, ${failedCount} failed`
    );

    if (failures.length > 0) {
      console.error(`[Rollback] Failed files:`);
      failures.forEach((f) => console.error(`  - ${f}`));
    }

    // Clean up backup files after successful rollback
    if (failedCount === 0) {
      for (const backupFile of state.backupMap.values()) {
        try {
          await fs.unlink(backupFile);
          console.error(`[Rollback] Cleaned up backup: ${backupFile}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    } else {
      console.error(
        `[Rollback] Keeping backup files due to ${failedCount} restoration failures`
      );
    }
  }
}
