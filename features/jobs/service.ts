import { db } from '@/lib/db';
import { jobs, workers, type Job, type NewJob } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { walletService } from '@/features/payments/wallet';
import { workerService } from '@/features/workers/service';
import { sanitizeText } from '@/lib/sanitize';
import { secretsScanner } from '@/lib/security/secrets-scanner';
import { signWebhookWithTimestamp } from '@/lib/security/webhook-crypto';

export interface CreateJobInput {
  userId: string;
  type: 'skill' | 'worker';
  skillId?: string;
  workerId?: string;
  task: string;
  inputs?: Record<string, any>;
  context?: Record<string, any>;
  budget: number;
}

export interface DeliverJobInput {
  jobId: string;
  deliverableText?: string;
  deliverableUrl?: string;
  deliverableFiles?: Record<string, string>;
}

export class JobService {
  /**
   * Create new job and lock funds
   */
  async createJob(input: CreateJobInput): Promise<Job> {
    // Validate input
    if (input.type === 'worker' && !input.workerId) {
      throw new Error('Worker ID required for worker jobs');
    }
    if (input.type === 'skill' && !input.skillId) {
      throw new Error('Skill ID required for skill jobs');
    }

    // Generate unique temp ID to avoid race conditions
    const tempJobId = `temp_${crypto.randomUUID()}`;

    // Lock funds in escrow with unique temp ID
    const lockResult = await walletService.lockFundsForJob(
      input.userId,
      tempJobId,
      input.budget
    );

    if (!lockResult.success) {
      throw new Error(lockResult.error || 'Failed to lock funds');
    }

    // Calculate timeout (worker's p90 * 2)
    let timeoutAt: Date | null = null;
    if (input.type === 'worker' && input.workerId) {
      const worker = await db.query.workers.findFirst({
        where: eq(workers.id, input.workerId),
      });

      if (worker) {
        const timeoutMinutes = worker.p90CompletionTime * 2;
        timeoutAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);
      }
    }

    // Create job
    const [job] = await db
      .insert(jobs)
      .values({
        userId: input.userId,
        type: input.type,
        skillId: input.skillId,
        workerId: input.workerId,
        task: input.task,
        inputs: input.inputs,
        context: input.context,
        budget: input.budget.toString(),
        status: input.type === 'skill' ? 'in_progress' : 'posted',
        timeoutAt,
      })
      .returning();

    // Update escrow with actual job ID (safe - unique temp ID per request)
    await db.execute(
      sql`UPDATE escrow SET job_id = ${job.id} WHERE job_id = ${tempJobId}`
    );

    // If worker job, send webhook notification
    if (input.type === 'worker' && input.workerId) {
      await this.notifyWorker(job);
    }

    return job;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
    });

    return job || null;
  }

  /**
   * Worker delivers job results
   * IMPORTANT: Idempotent - returns success if already delivered
   */
  async deliverJob(input: DeliverJobInput): Promise<Job> {
    const job = await this.getJob(input.jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    // IDEMPOTENT: If already delivered, return existing job (no state change)
    if (job.status === 'delivered' || job.status === 'approved' || job.status === 'rejected') {
      console.log(`Job ${input.jobId} already delivered (status: ${job.status}), returning existing job`);
      return job;
    }

    if (job.status !== 'in_progress' && job.status !== 'posted') {
      throw new Error(`Cannot deliver job in ${job.status} status`);
    }

    // Sanitize deliverable text to prevent XSS
    const sanitizedText = input.deliverableText
      ? sanitizeText(input.deliverableText)
      : null;

    // Update job with deliverables
    const [updatedJob] = await db
      .update(jobs)
      .set({
        status: 'delivered',
        deliverableText: sanitizedText,
        deliverableUrl: input.deliverableUrl,
        deliverableFiles: input.deliverableFiles,
        deliveredAt: new Date(),
      })
      .where(eq(jobs.id, input.jobId))
      .returning();

    return updatedJob;
  }

  /**
   * User approves job and releases payment
   * CRITICAL: Validates job ownership before releasing escrow
   */
  async approveJob(jobId: string, userId: string, rating: number, feedback?: string): Promise<Job> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    // CRITICAL: Verify job ownership (prevent unauthorized escrow release)
    if (job.userId !== userId) {
      throw new Error('Unauthorized: You do not own this job');
    }

    if (job.status !== 'delivered') {
      throw new Error(`Cannot approve job in ${job.status} status`);
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Update job status
    const [updatedJob] = await db
      .update(jobs)
      .set({
        status: 'approved',
        rating,
        feedback: feedback ? sanitizeText(feedback) : null,
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Release escrow to worker
    if (job.type === 'worker' && job.workerId) {
      const releaseResult = await walletService.releaseEscrowToWorker(
        jobId,
        job.workerId
      );

      if (!releaseResult.success) {
        throw new Error(`Failed to release payment: ${releaseResult.error}`);
      }

      // Update worker reputation
      await workerService.updateReputation(job.workerId, rating);
    }

    return updatedJob;
  }

  /**
   * User rejects job and requests refund
   * CRITICAL: Validates job ownership before processing refund
   */
  async rejectJob(jobId: string, userId: string, reason: string): Promise<Job> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    // CRITICAL: Verify job ownership (prevent unauthorized refunds)
    if (job.userId !== userId) {
      throw new Error('Unauthorized: You do not own this job');
    }

    if (job.status !== 'delivered') {
      throw new Error(`Cannot reject job in ${job.status} status`);
    }

    // Update job status
    const [updatedJob] = await db
      .update(jobs)
      .set({
        status: 'rejected',
        feedback: sanitizeText(reason),
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Refund escrowed funds to wallet
    const refundResult = await walletService.refundEscrowToWallet(jobId);

    if (!refundResult.success) {
      throw new Error(`Failed to refund: ${refundResult.error}`);
    }

    return updatedJob;
  }

  /**
   * Cancel job (timeout or user cancellation)
   */
  async cancelJob(jobId: string, reason: string): Promise<Job> {
    const job = await this.getJob(jobId);

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.status === 'approved' || job.status === 'rejected') {
      throw new Error('Cannot cancel completed job');
    }

    // Update job status
    const [updatedJob] = await db
      .update(jobs)
      .set({
        status: 'cancelled',
        feedback: reason,
        completedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Refund escrowed funds
    const refundResult = await walletService.refundEscrowToWallet(jobId);

    if (!refundResult.success) {
      throw new Error(`Failed to refund: ${refundResult.error}`);
    }

    return updatedJob;
  }

  /**
   * Check for timed-out jobs and auto-cancel
   */
  async processTimeouts(): Promise<void> {
    const timedOutJobs = await db.query.jobs.findMany({
      where: sql`
        ${jobs.status} IN ('posted', 'in_progress') AND
        ${jobs.timeoutAt} IS NOT NULL AND
        ${jobs.timeoutAt} < NOW()
      `,
    });

    for (const job of timedOutJobs) {
      await this.cancelJob(job.id, 'Job timed out - worker did not deliver within deadline');
    }
  }

  /**
   * Send webhook notification to worker
   */
  private async notifyWorker(job: Job): Promise<void> {
    if (!job.workerId) {
      return;
    }

    const worker = await db.query.workers.findFirst({
      where: eq(workers.id, job.workerId),
    });

    if (!worker || !worker.apiEndpoint) {
      throw new Error('Worker endpoint not configured');
    }

    // SECURITY: Scan context for secrets before sending to worker
    if (job.context && typeof job.context === 'object' && 'files' in job.context) {
      const scanResult = secretsScanner.scanContext(job.context as { files: Record<string, string> });

      if (!scanResult.safe) {
        console.error('Secrets detected in context:', {
          jobId: job.id,
          blockedFiles: scanResult.blockedFiles,
          patterns: scanResult.blockedPatterns,
        });

        // Cancel job and refund
        await this.cancelJob(
          job.id,
          `Security: Blocked sending context with potential secrets (files: ${scanResult.blockedFiles.join(', ')})`
        );

        throw new Error(
          `Security: Cannot send job context - contains sensitive files or patterns. ` +
          `Blocked files: ${scanResult.blockedFiles.join(', ')}`
        );
      }
    }

    // Prepare webhook payload
    const timestamp = Date.now().toString();
    const payload = JSON.stringify({
      jobId: job.id,
      task: job.task,
      inputs: job.inputs,
      context: job.context,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/${job.id}/deliver`,
      budget: parseFloat(job.budget),
      deadline: job.timeoutAt,
    });

    // Sign webhook if worker has secret
    // IMPORTANT: Signature includes timestamp to prevent replay attacks
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Timestamp': timestamp,
    };

    if (worker.webhookSecret) {
      const signature = signWebhookWithTimestamp(payload, timestamp, worker.webhookSecret);
      headers['X-Webhook-Signature'] = signature;
    }

    try {
      const response = await fetch(worker.apiEndpoint, {
        method: 'POST',
        headers,
        body: payload,
      });

      if (!response.ok) {
        throw new Error(`Worker webhook failed: ${response.statusText}`);
      }

      // Update job to in_progress
      await db
        .update(jobs)
        .set({
          status: 'in_progress',
          acceptedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));
    } catch (error) {
      console.error('Failed to notify worker:', error);
      // Cancel job and refund if webhook fails
      await this.cancelJob(job.id, 'Failed to notify worker');
      throw new Error('Failed to reach worker. Job cancelled and funds refunded.');
    }
  }

  /**
   * Get user's job history
   */
  async getUserJobs(userId: string) {
    return await db.query.jobs.findMany({
      where: eq(jobs.userId, userId),
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    });
  }

  /**
   * Get worker's job history
   */
  async getWorkerJobs(workerId: string) {
    return await db.query.jobs.findMany({
      where: eq(jobs.workerId, workerId),
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    });
  }
}

export const jobService = new JobService();
