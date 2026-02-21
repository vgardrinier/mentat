import { db } from '@/lib/db';
import { auditLogs, type NewAuditLog } from '@/lib/db/schema-audit';

/**
 * Security event types
 */
export enum SecurityEventType {
  // Secrets protection
  SECRETS_BLOCKED = 'secrets_blocked',

  // Webhook security
  WEBHOOK_SIGNATURE_FAILED = 'webhook_signature_failed',
  WEBHOOK_TIMESTAMP_EXPIRED = 'webhook_timestamp_expired',
  WEBHOOK_MISSING_SECRET = 'webhook_missing_secret',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',

  // Authentication
  AUTH_FAILED = 'auth_failed',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',

  // Job ownership
  JOB_OWNERSHIP_VIOLATION = 'job_ownership_violation',

  // Success events (for forensics)
  JOB_APPROVED = 'job_approved',
  JOB_REJECTED = 'job_rejected',
  ESCROW_RELEASED = 'escrow_released',
  WALLET_CREDITED = 'wallet_credited',
}

/**
 * Severity levels
 */
export enum Severity {
  CRITICAL = 'critical', // Immediate action required
  WARNING = 'warning',   // Potential security issue
  INFO = 'info',         // Normal operation
}

/**
 * Audit logger for security events
 */
class AuditLogger {
  /**
   * Log a security event
   */
  async log(event: {
    eventType: SecurityEventType;
    severity: Severity;
    message: string;
    details?: Record<string, any>;
    userId?: string;
    workerId?: string;
    jobId?: string;
    ipAddress?: string;
    userAgent?: string;
    endpoint?: string;
    method?: string;
  }): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        eventType: event.eventType,
        severity: event.severity,
        message: event.message,
        details: event.details || null,
        userId: event.userId || null,
        workerId: event.workerId || null,
        jobId: event.jobId || null,
        ipAddress: event.ipAddress || null,
        userAgent: event.userAgent || null,
        endpoint: event.endpoint || null,
        method: event.method || null,
      });

      // Console log for development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${event.severity.toUpperCase()}: ${event.message}`, event.details || '');
      }

      // Send critical alerts
      if (event.severity === Severity.CRITICAL) {
        await this.sendCriticalAlert(event);
      }
    } catch (error) {
      // Audit logging should never crash the app
      console.error('Failed to write audit log:', error);
    }
  }

  /**
   * Send critical alert (Slack, email, Sentry, etc.)
   */
  private async sendCriticalAlert(event: {
    eventType: SecurityEventType;
    message: string;
    details?: Record<string, any>;
    userId?: string;
    jobId?: string;
  }): Promise<void> {
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Option 1: Slack webhook
      if (process.env.SLACK_SECURITY_WEBHOOK_URL) {
        try {
          await fetch(process.env.SLACK_SECURITY_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 CRITICAL SECURITY EVENT`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Type:* ${event.eventType}\n*Message:* ${event.message}\n*User:* ${event.userId || 'Anonymous'}\n*Job:* ${event.jobId || 'N/A'}`,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `\`\`\`${JSON.stringify(event.details, null, 2)}\`\`\``,
                  },
                },
              ],
            }),
          });
        } catch (error) {
          console.error('Failed to send Slack alert:', error);
        }
      }

      // Option 2: Sentry
      if (process.env.SENTRY_DSN) {
        // Send to Sentry (would need @sentry/nextjs installed)
        console.error(`[CRITICAL SECURITY EVENT] ${event.eventType}: ${event.message}`, event.details);
      }

      // Option 3: Email (SendGrid, Resend, etc.)
      if (process.env.SECURITY_ALERT_EMAIL) {
        // Send email alert (implementation depends on email service)
        console.log(`Would send email to: ${process.env.SECURITY_ALERT_EMAIL}`);
      }
    }
  }

  /**
   * Helper: Log secrets blocked
   */
  async logSecretsBlocked(params: {
    userId: string;
    jobId: string;
    blockedFiles: string[];
    blockedPatterns: string[];
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      eventType: SecurityEventType.SECRETS_BLOCKED,
      severity: Severity.CRITICAL,
      message: `Blocked job with secrets in context`,
      details: {
        blockedFiles: params.blockedFiles,
        blockedPatterns: params.blockedPatterns,
      },
      userId: params.userId,
      jobId: params.jobId,
      ipAddress: params.ipAddress,
      endpoint: '/api/jobs',
      method: 'POST',
    });
  }

  /**
   * Helper: Log webhook signature failure
   */
  async logWebhookSignatureFailed(params: {
    workerId?: string;
    jobId?: string;
    ipAddress?: string;
    reason: string;
  }): Promise<void> {
    await this.log({
      eventType: SecurityEventType.WEBHOOK_SIGNATURE_FAILED,
      severity: Severity.CRITICAL,
      message: `Webhook signature verification failed: ${params.reason}`,
      details: { reason: params.reason },
      workerId: params.workerId || undefined,
      jobId: params.jobId || undefined,
      ipAddress: params.ipAddress,
      endpoint: '/api/jobs/[id]/deliver',
      method: 'POST',
    });
  }

  /**
   * Helper: Log rate limit exceeded
   */
  async logRateLimitExceeded(params: {
    userId?: string;
    ipAddress?: string;
    endpoint: string;
    method: string;
    limit: number;
  }): Promise<void> {
    await this.log({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: Severity.WARNING,
      message: `Rate limit exceeded (${params.limit} req/min)`,
      details: {
        limit: params.limit,
        endpoint: params.endpoint,
      },
      userId: params.userId,
      ipAddress: params.ipAddress,
      endpoint: params.endpoint,
      method: params.method,
    });
  }

  /**
   * Helper: Log unauthorized access attempt
   */
  async logUnauthorizedAccess(params: {
    endpoint: string;
    method: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS_ATTEMPT,
      severity: Severity.WARNING,
      message: `Unauthorized access attempt to protected route`,
      details: {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      endpoint: params.endpoint,
      method: params.method,
    });
  }

  /**
   * Helper: Log job ownership violation
   */
  async logJobOwnershipViolation(params: {
    userId: string;
    jobId: string;
    actualOwnerId: string;
    endpoint: string;
  }): Promise<void> {
    await this.log({
      eventType: SecurityEventType.JOB_OWNERSHIP_VIOLATION,
      severity: Severity.CRITICAL,
      message: `User attempted to access job they don't own`,
      details: {
        attemptedBy: params.userId,
        actualOwner: params.actualOwnerId,
      },
      userId: params.userId,
      jobId: params.jobId,
      endpoint: params.endpoint,
      method: 'POST',
    });
  }

  /**
   * Helper: Log successful escrow release (for forensics)
   */
  async logEscrowReleased(params: {
    userId: string;
    jobId: string;
    workerId: string;
    amount: number;
  }): Promise<void> {
    await this.log({
      eventType: SecurityEventType.ESCROW_RELEASED,
      severity: Severity.INFO,
      message: `Escrow released to worker`,
      details: {
        amount: params.amount,
      },
      userId: params.userId,
      jobId: params.jobId,
      workerId: params.workerId,
      endpoint: '/api/jobs/[id]/approve',
      method: 'POST',
    });
  }

  /**
   * Query audit logs (for admin dashboard)
   */
  async getRecentLogs(params: {
    limit?: number;
    severity?: Severity;
    eventType?: SecurityEventType;
    userId?: string;
  } = {}): Promise<any[]> {
    const limit = params.limit || 100;

    // Build query (simplified - would use proper Drizzle query builder)
    const logs = await db.query.auditLogs.findMany({
      limit,
      orderBy: (auditLogs, { desc }) => [desc(auditLogs.createdAt)],
    });

    return logs;
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
