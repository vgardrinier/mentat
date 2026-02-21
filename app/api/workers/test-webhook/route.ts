import { NextRequest, NextResponse } from 'next/server';
import { signWebhookWithTimestamp } from '@/lib/security/webhook-crypto';

/**
 * Test a worker's webhook endpoint
 * Sends a test job and expects signed delivery back
 */
export async function POST(req: NextRequest) {
  try {
    const { apiEndpoint, webhookSecret } = await req.json();

    if (!apiEndpoint || !webhookSecret) {
      return NextResponse.json(
        { error: 'apiEndpoint and webhookSecret required' },
        { status: 400 }
      );
    }

    // Prepare test webhook payload
    const testPayload = JSON.stringify({
      jobId: 'test-' + Date.now(),
      task: 'Test webhook connection',
      inputs: {},
      context: {},
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/workers/test-webhook/callback`,
      budget: 0,
      deadline: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
    });

    const timestamp = Date.now().toString();
    const signature = signWebhookWithTimestamp(testPayload, timestamp, webhookSecret);

    // Send test webhook to worker's endpoint
    const startTime = Date.now();

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp,
      },
      body: testPayload,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Webhook returned ${response.status}: ${response.statusText}`,
        latencyMs,
      });
    }

    // Check if worker responded
    const responseData = await response.json();

    return NextResponse.json({
      success: true,
      latencyMs,
      response: responseData,
      message: 'Webhook endpoint is working correctly',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({
        success: false,
        error: 'Webhook endpoint timeout (10s). Make sure your server is running and accessible.',
      });
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test webhook',
    });
  }
}
