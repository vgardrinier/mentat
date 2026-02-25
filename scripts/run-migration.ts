import { config } from 'dotenv';
config();

import { promises as fs } from 'fs';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL not found in environment');
}

async function main() {
  const client = postgres(connectionString, { max: 1 });

  console.log('Reading migration file...');
  const sql = await fs.readFile('drizzle/0003_skills_versioning.sql', 'utf-8');

  console.log('Running migration...');
  await client.unsafe(sql);
  console.log('✓ Migration complete');

  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
