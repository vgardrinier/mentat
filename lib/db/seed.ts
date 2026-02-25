import { config } from 'dotenv';
config();

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'yaml';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { skills, skillVersions } from './schema';

async function seedSkills() {
  console.log('Seeding skills...');

  // Create DB connection after env is loaded
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString);
  const db = drizzle(client, { schema: { skills, skillVersions } });

  const skillsDir = path.join(process.cwd(), 'skills');
  const skillFiles = await fs.readdir(skillsDir);

  for (const file of skillFiles) {
    if (!file.endsWith('.yaml')) continue;

    const skillPath = path.join(skillsDir, file);
    const yamlContent = await fs.readFile(skillPath, 'utf-8');
    const parsed = yaml.parse(yamlContent);
    const skill = parsed.skill;

    // Compute SHA256 hash
    const sha256 = crypto.createHash('sha256').update(yamlContent).digest('hex');

    // Insert or update skill metadata
    await db.insert(skills).values({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      latestVersion: skill.version || '1.0.0',
    }).onConflictDoUpdate({
      target: skills.id,
      set: {
        latestVersion: skill.version || '1.0.0',
      },
    });

    // Insert skill version
    await db.insert(skillVersions).values({
      skillId: skill.id,
      version: skill.version || '1.0.0',
      yamlContent,
      sha256,
      instructions: skill.instructions,
      contextPatterns: skill.context_patterns || [],
    }).onConflictDoNothing();

    console.log(`  ✓ ${skill.name} (v${skill.version || '1.0.0'})`);
  }

  console.log('Skills seeded!');
  await client.end();
}

seedSkills()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
