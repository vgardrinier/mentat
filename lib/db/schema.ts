import { pgTable, uuid, varchar, text, decimal, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Re-export audit logs table
export { auditLogs, type AuditLog, type NewAuditLog } from './schema-audit';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id', { length: 255 }).unique().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  walletBalance: decimal('wallet_balance', { precision: 10, scale: 2 }).default('0.00').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Skills table (metadata only)
export const skills = pgTable('skills', {
  id: varchar('id', { length: 100 }).primaryKey(), // e.g., "seo-meta-tags"
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  latestVersion: varchar('latest_version', { length: 20 }).notNull(), // e.g., "1.0.0"
  authorId: uuid('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Skill versions table (versioned content)
export const skillVersions = pgTable('skill_versions', {
  skillId: varchar('skill_id', { length: 100 }).references(() => skills.id).notNull(),
  version: varchar('version', { length: 20 }).notNull(), // e.g., "1.0.0"
  yamlContent: text('yaml_content').notNull(), // Raw YAML
  sha256: varchar('sha256', { length: 64 }).notNull(), // Integrity hash
  instructions: text('instructions').notNull(),
  contextPatterns: jsonb('context_patterns'), // Array of glob patterns
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  pk: { name: 'skill_versions_pkey', columns: [table.skillId, table.version] }
}));

// Skill executions table (usage tracking)
export const skillExecutions = pgTable('skill_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  skillId: varchar('skill_id', { length: 100 }).notNull(),
  version: varchar('version', { length: 20 }).notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
});

// Workers table
export const workers = pgTable('workers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  workerType: varchar('worker_type', { length: 20 }).default('solo').notNull(), // solo, company
  description: text('description'), // What the worker does
  specialty: varchar('specialty', { length: 100 }).notNull(),
  capabilities: jsonb('capabilities').notNull(),
  limitations: jsonb('limitations').notNull(),
  requiredInputs: jsonb('required_inputs').notNull(),
  requiredContext: jsonb('required_context').notNull(),
  avgCompletionTime: integer('avg_completion_time').notNull(), // minutes
  p90CompletionTime: integer('p90_completion_time').notNull(), // minutes (for timeout)
  pricing: decimal('pricing', { precision: 10, scale: 2 }).notNull(), // Legacy - use offers instead
  offers: jsonb('offers'), // Array of structured offers (name, price, ETA, revisions, scope)
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  apiEndpoint: varchar('api_endpoint', { length: 500 }).notNull(),
  webhookSecret: varchar('webhook_secret', { length: 255 }),
  reputationScore: decimal('reputation_score', { precision: 3, scale: 2 }).default('0.00'),
  completionCount: integer('completion_count').default(0).notNull(),
  acceptingJobs: boolean('accepting_jobs').default(false).notNull(), // Toggle for going live
  maxConcurrentJobs: integer('max_concurrent_jobs').default(5).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, active, suspended
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Jobs table
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'skill' or 'worker'
  skillId: varchar('skill_id', { length: 100 }).references(() => skills.id),
  workerId: uuid('worker_id').references(() => workers.id),
  task: text('task').notNull(),
  inputs: jsonb('inputs'),
  context: jsonb('context'), // Files and metadata sent to worker
  status: varchar('status', { length: 20 }).notNull(), // posted, in_progress, delivered, approved, rejected, cancelled
  deliverableText: text('deliverable_text'),
  deliverableUrl: varchar('deliverable_url', { length: 500 }),
  deliverableFiles: jsonb('deliverable_files'),
  budget: decimal('budget', { precision: 10, scale: 2 }).notNull(),
  rating: integer('rating'),
  feedback: text('feedback'),
  timeoutAt: timestamp('timeout_at'), // Auto-cancel if not delivered by this time
  createdAt: timestamp('created_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  deliveredAt: timestamp('delivered_at'),
  completedAt: timestamp('completed_at'),
});

// Escrow table
export const escrow = pgTable('escrow', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => jobs.id).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  platformFee: decimal('platform_fee', { precision: 10, scale: 2 }).notNull(),
  workerPayout: decimal('worker_payout', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // locked, released, refunded
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
  lockedAt: timestamp('locked_at').defaultNow().notNull(),
  releasedAt: timestamp('released_at'),
});

// Transactions table (audit log)
export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // deposit, deduction, refund, payout
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 10, scale: 2 }).notNull(),
  reference: varchar('reference', { length: 255 }), // job_id or stripe_id
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

export type SkillVersion = typeof skillVersions.$inferSelect;
export type NewSkillVersion = typeof skillVersions.$inferInsert;

export type SkillExecution = typeof skillExecutions.$inferSelect;
export type NewSkillExecution = typeof skillExecutions.$inferInsert;

export type Worker = typeof workers.$inferSelect;
export type NewWorker = typeof workers.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Escrow = typeof escrow.$inferSelect;
export type NewEscrow = typeof escrow.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
