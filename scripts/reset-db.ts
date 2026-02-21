import { config } from 'dotenv';
config();

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

async function main() {
  const client = postgres(connectionString, { max: 1 });

  console.log('Dropping all tables...');

  await client`DROP TABLE IF EXISTS escrow CASCADE`;
  await client`DROP TABLE IF EXISTS transactions CASCADE`;
  await client`DROP TABLE IF EXISTS jobs CASCADE`;
  await client`DROP TABLE IF EXISTS workers CASCADE`;
  await client`DROP TABLE IF EXISTS skills CASCADE`;
  await client`DROP TABLE IF EXISTS users CASCADE`;

  console.log('✓ All tables dropped');

  await client.end();
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
