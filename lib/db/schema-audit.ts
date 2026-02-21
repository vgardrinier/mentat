import { pgTable, uuid, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

/**
 * Security Audit Logs
 *
 * Tracks all security events for forensics and monitoring
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Event classification
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'secrets_blocked', 'webhook_failed', 'rate_limited', etc.
  severity: varchar('severity', { length: 20 }).notNull(), // 'critical', 'warning', 'info'

  // Who/What/Where
  userId: varchar('user_id', { length: 255 }), // Clerk user ID (if authenticated)
  workerId: uuid('worker_id'), // Worker ID (if related to worker)
  jobId: uuid('job_id'), // Job ID (if related to job)
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),

  // Event details
  message: text('message').notNull(), // Human-readable description
  details: jsonb('details'), // Structured data (blocked files, patterns, headers, etc.)

  // Context
  endpoint: varchar('endpoint', { length: 255 }), // API route that triggered event
  method: varchar('method', { length: 10 }), // HTTP method

  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
