/**
 * E2E Worker Flow Test
 *
 * Tests the complete worker job lifecycle:
 * 1. Register a worker
 * 2. Add funds to wallet
 * 3. Create a job (hire worker)
 * 4. Worker receives webhook notification
 * 5. Worker delivers job with signed webhook
 * 6. User approves job
 * 7. Verify payment is released
 *
 * Run with: npx tsx scripts/e2e-worker-flow.ts
 */

import { config } from 'dotenv';
import http from 'http';
import crypto from 'crypto';

config();

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const MOCK_WORKER_PORT = 3001;

// Store received webhooks
let receivedWebhook: any = null;
let workerSecret: string = '';

/**
 * Create a mock worker server to receive webhooks
 */
function createMockWorkerServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method === 'POST') {
        let body = '';

        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const webhook = JSON.parse(body);
            console.log('📨 Mock worker received webhook:', {
              jobId: webhook.jobId,
              task: webhook.task,
              budget: webhook.budget,
              hasSignature: !!req.headers['x-webhook-signature'],
              hasTimestamp: !!req.headers['x-webhook-timestamp'],
            });

            receivedWebhook = {
              ...webhook,
              headers: {
                signature: req.headers['x-webhook-signature'],
                timestamp: req.headers['x-webhook-timestamp'],
              },
            };

            // Verify signature if worker has secret
            if (workerSecret && req.headers['x-webhook-signature']) {
              const signature = req.headers['x-webhook-signature'] as string;
              const expectedSig = crypto
                .createHmac('sha256', workerSecret)
                .update(body)
                .digest('hex');

              if (signature === expectedSig) {
                console.log('✅ Webhook signature verified!');
              } else {
                console.log('❌ Webhook signature verification failed!');
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            console.error('Error processing webhook:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(MOCK_WORKER_PORT, () => {
      console.log(`🤖 Mock worker server listening on port ${MOCK_WORKER_PORT}`);
      resolve(server);
    });
  });
}

/**
 * Helper to sign webhook for delivery
 */
function signDeliveryWebhook(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Main E2E test flow
 */
async function runE2ETest() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🔄 E2E WORKER FLOW TEST');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Start mock worker server
  const mockServer = await createMockWorkerServer();

  try {
    // Note: This test requires authentication, which we don't have in CLI
    // This is a skeleton showing what the full E2E would look like
    console.log('⚠️  This E2E test requires authenticated API calls');
    console.log('');
    console.log('📋 MANUAL E2E TEST CHECKLIST:');
    console.log('');
    console.log('1. Register Worker:');
    console.log(`   POST ${BASE_URL}/api/workers`);
    console.log('   Body: {');
    console.log('     name: "Test Worker",');
    console.log('     specialty: "testing",');
    console.log('     capabilities: { list: ["test"] },');
    console.log('     limitations: { list: [] },');
    console.log('     requiredInputs: {},');
    console.log('     requiredContext: [],');
    console.log('     avgCompletionTime: 5,');
    console.log('     p90CompletionTime: 10,');
    console.log('     pricing: 10,');
    console.log(`     apiEndpoint: "http://localhost:${MOCK_WORKER_PORT}",`);
    console.log('     webhookSecret: "test_secret_123"');
    console.log('   }');
    console.log('');
    console.log('2. Add Funds to Wallet:');
    console.log(`   POST ${BASE_URL}/api/wallet/add-funds`);
    console.log('   Body: { amount: 50 }');
    console.log('   → Complete Stripe checkout');
    console.log('');
    console.log('3. Create Job (Hire Worker):');
    console.log(`   POST ${BASE_URL}/api/jobs`);
    console.log('   Body: {');
    console.log('     type: "worker",');
    console.log('     workerId: "<worker_id_from_step_1>",');
    console.log('     task: "Test job for E2E flow",');
    console.log('     inputs: {},');
    console.log('     context: { files: { "test.txt": "hello world" } },');
    console.log('     budget: 10');
    console.log('   }');
    console.log('');
    console.log('4. Verify Mock Worker Receives Webhook:');
    console.log('   → Check console above for webhook receipt');
    console.log('   → Verify signature is present and valid');
    console.log('');
    console.log('5. Worker Delivers Job:');
    console.log(`   POST ${BASE_URL}/api/jobs/<job_id>/deliver`);
    console.log('   Headers:');
    console.log('     X-Webhook-Signature: <signed_with_worker_secret>');
    console.log('     X-Webhook-Timestamp: <current_timestamp>');
    console.log('   Body: {');
    console.log('     deliverableText: "Job completed successfully!",');
    console.log('     deliverableUrl: "https://example.com/result"');
    console.log('   }');
    console.log('');
    console.log('6. User Approves Job:');
    console.log(`   POST ${BASE_URL}/api/jobs/<job_id>/approve`);
    console.log('   Body: {');
    console.log('     rating: 5,');
    console.log('     feedback: "Great work!"');
    console.log('   }');
    console.log('');
    console.log('7. Verify Payment Released:');
    console.log(`   GET ${BASE_URL}/api/jobs/<job_id>`);
    console.log('   → Check status: "approved"');
    console.log('   → Check completedAt timestamp');
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('✅ WHAT TO VERIFY:');
    console.log('');
    console.log('Security Checks:');
    console.log('  ✓ Secrets scanner blocks jobs with .env in context');
    console.log('  ✓ Rate limiter prevents more than 10 job creations/min');
    console.log('  ✓ Worker webhook includes signature header');
    console.log('  ✓ Delivery without signature is rejected (401)');
    console.log('  ✓ Delivery with wrong signature is rejected (401)');
    console.log('  ✓ Delivery with old timestamp is rejected (401)');
    console.log('');
    console.log('Payment Flow:');
    console.log('  ✓ Funds locked in escrow when job created');
    console.log('  ✓ Wallet balance decreases by job budget');
    console.log('  ✓ Escrow released to worker on approval');
    console.log('  ✓ Platform fee (5%) deducted correctly');
    console.log('  ✓ Refund to wallet if job cancelled/rejected');
    console.log('');
    console.log('Job Lifecycle:');
    console.log('  ✓ Job status: posted → in_progress → delivered → approved');
    console.log('  ✓ Timeout auto-cancels after p90*2 minutes');
    console.log('  ✓ Worker reputation updated on approval');
    console.log('  ✓ Timestamps recorded (acceptedAt, deliveredAt, completedAt)');
    console.log('');

    console.log('📝 AUTOMATED TEST CODE EXAMPLE:');
    console.log('');
    console.log('```typescript');
    console.log('// This would work with proper auth headers:');
    console.log('const worker = await registerWorker({...});');
    console.log('await addFunds(50);');
    console.log('const job = await createJob({ workerId: worker.id, ... });');
    console.log('');
    console.log('// Wait for webhook');
    console.log('await sleep(1000);');
    console.log('expect(receivedWebhook).toBeDefined();');
    console.log('expect(receivedWebhook.headers.signature).toBeDefined();');
    console.log('');
    console.log('// Deliver with signature');
    console.log('const payload = JSON.stringify({ deliverableText: "Done!" });');
    console.log('const signature = signDeliveryWebhook(payload, workerSecret);');
    console.log('await deliverJob(job.id, payload, signature);');
    console.log('');
    console.log('// Approve');
    console.log('await approveJob(job.id, 5, "Great!");');
    console.log('');
    console.log('// Verify');
    console.log('const finalJob = await getJob(job.id);');
    console.log('expect(finalJob.status).toBe("approved");');
    console.log('```');
    console.log('');

    console.log('🎯 READY TO TEST MANUALLY');
    console.log('');
    console.log(`Mock worker server running on http://localhost:${MOCK_WORKER_PORT}`);
    console.log('Press Ctrl+C to stop when done testing');
    console.log('');

    // Keep server running
    await new Promise(() => {}); // Run forever until Ctrl+C
  } catch (error) {
    console.error('Error in E2E test:', error);
    mockServer.close();
    process.exit(1);
  }
}

// Run test
runE2ETest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
