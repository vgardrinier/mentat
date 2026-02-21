/**
 * Test Worker Webhook Integration
 *
 * This script helps test worker webhook signature verification
 * with the new timestamp-in-signature format.
 *
 * Usage:
 * 1. Start your Next.js dev server: npm run dev
 * 2. Run this script: npx tsx scripts/test-worker-webhook.ts
 * 3. The script will simulate a worker receiving and responding to webhooks
 */

import { createServer } from 'http';
import { signWebhookWithTimestamp } from '../lib/security/webhook-crypto';

const WORKER_PORT = 3001;
const WEBHOOK_SECRET = 'test_worker_secret_123';
const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Mock worker server that receives platform webhooks
const workerServer = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const signature = req.headers['x-webhook-signature'] as string;
      const timestamp = req.headers['x-webhook-timestamp'] as string;

      console.log('');
      console.log('📨 Received webhook from platform:');
      console.log(`   Timestamp: ${timestamp}`);
      console.log(`   Signature: ${signature?.substring(0, 16)}...`);
      console.log(`   Body: ${body.substring(0, 100)}...`);

      // Verify the webhook signature
      const { verifyWebhookWithTimestamp } = require('../lib/security/webhook-crypto');
      const verification = verifyWebhookWithTimestamp(
        body,
        signature,
        timestamp,
        WEBHOOK_SECRET
      );

      if (verification.valid) {
        console.log('   ✅ Signature verified successfully!');

        const payload = JSON.parse(body);
        console.log(`   Job ID: ${payload.jobId}`);
        console.log(`   Task: ${payload.task}`);

        // Simulate worker processing
        setTimeout(() => {
          console.log('');
          console.log('🔨 Worker processing complete, sending delivery...');
          sendDelivery(payload.jobId, payload.callbackUrl);
        }, 2000);

        res.writeHead(200);
        res.end(JSON.stringify({ received: true }));
      } else {
        console.log(`   ❌ Signature verification failed: ${verification.error}`);
        res.writeHead(401);
        res.end(JSON.stringify({ error: verification.error }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Send delivery back to platform
async function sendDelivery(jobId: string, callbackUrl: string) {
  const deliveryPayload = JSON.stringify({
    deliverableText: 'Job completed successfully!',
    deliverableUrl: 'https://example.com/result.json',
  });

  const timestamp = Date.now().toString();
  const signature = signWebhookWithTimestamp(deliveryPayload, timestamp, WEBHOOK_SECRET);

  console.log('📤 Sending delivery to platform:');
  console.log(`   Callback URL: ${callbackUrl}`);
  console.log(`   Timestamp: ${timestamp}`);
  console.log(`   Signature: ${signature.substring(0, 16)}...`);

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
      },
      body: deliveryPayload,
    });

    if (response.ok) {
      console.log('   ✅ Delivery accepted by platform!');
      const result = await response.json();
      console.log('   Result:', result);
    } else {
      console.log(`   ❌ Delivery rejected: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('   ❌ Failed to send delivery:', error);
  }

  console.log('');
  console.log('✅ Test complete. You can:');
  console.log('   1. Try again with a different job');
  console.log('   2. Test replay attack (reuse old signature with new timestamp)');
  console.log('   3. Test duplicate delivery (send same jobId twice)');
  console.log('');
  console.log('Press Ctrl+C to exit.');
}

// Start the mock worker server
workerServer.listen(WORKER_PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('🤖 WORKER WEBHOOK TEST SERVER');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`Worker listening on: http://localhost:${WORKER_PORT}/webhook`);
  console.log(`Webhook secret: ${WEBHOOK_SECRET}`);
  console.log(`Platform URL: ${PLATFORM_URL}`);
  console.log('');
  console.log('📋 To test with a real job:');
  console.log('');
  console.log('1. Register a worker with this webhook endpoint:');
  console.log(`   {`);
  console.log(`     "name": "Test Worker",`);
  console.log(`     "specialty": "testing",`);
  console.log(`     "webhookSecret": "${WEBHOOK_SECRET}",`);
  console.log(`     "apiEndpoint": "http://localhost:${WORKER_PORT}/webhook",`);
  console.log(`     ...other fields...`);
  console.log(`   }`);
  console.log('');
  console.log('2. Create a job for this worker');
  console.log('');
  console.log('3. Watch this terminal for webhook events');
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('Waiting for webhooks...');
  console.log('');
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('Shutting down worker server...');
  workerServer.close();
  process.exit(0);
});
