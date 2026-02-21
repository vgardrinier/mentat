/**
 * Migration: Add audit_logs table
 *
 * Run with: npx tsx scripts/migrate-audit-logs.ts
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

config();

async function migrateAuditLogs() {
  console.log('🗄️  Creating audit_logs table...');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found in environment');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Create audit_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "event_type" varchar(50) NOT NULL,
        "severity" varchar(20) NOT NULL,
        "user_id" varchar(255),
        "worker_id" uuid,
        "job_id" uuid,
        "ip_address" varchar(45),
        "user_agent" text,
        "message" text NOT NULL,
        "details" jsonb,
        "endpoint" varchar(255),
        "method" varchar(10),
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    console.log('✅ Table created');

    // Create indexes
    console.log('Creating indexes...');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_severity
      ON "audit_logs"("severity", "created_at" DESC)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type
      ON "audit_logs"("event_type", "created_at" DESC)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
      ON "audit_logs"("user_id", "created_at" DESC)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_job_id
      ON "audit_logs"("job_id", "created_at" DESC)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
      ON "audit_logs"("created_at" DESC)
    `);

    console.log('✅ Indexes created');

    console.log('');
    console.log('🎉 Migration complete!');
    console.log('');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await client.end();
    process.exit(1);
  }
}

migrateAuditLogs();
