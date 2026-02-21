import { config } from 'dotenv';
config();

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { skills } from './schema';

async function seedSkills() {
  console.log('Seeding skills...');

  // Create DB connection after env is loaded
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString);
  const db = drizzle(client, { schema: { skills } });

  const skillsDir = path.join(process.cwd(), 'skills');
  const skillFiles = await fs.readdir(skillsDir);

  for (const file of skillFiles) {
    if (!file.endsWith('.yaml')) continue;

    const skillPath = path.join(skillsDir, file);
    const content = await fs.readFile(skillPath, 'utf-8');
    const parsed = yaml.parse(content);
    const skill = parsed.skill;

    await db.insert(skills).values({
      id: `${skill.id}@${skill.version}`,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      definition: parsed,
      pricing: skill.pricing === 'free' ? '0' : skill.pricing.toString(),
      version: skill.version,
      usageCount: 0,
    }).onConflictDoNothing();

    console.log(`  ✓ ${skill.name}`);
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
