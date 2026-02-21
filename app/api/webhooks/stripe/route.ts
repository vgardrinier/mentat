import { NextRequest, NextResponse } from 'next/server';
import { stripeWebhookHandler } from '@/features/payments/stripe-webhooks';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    const event = stripeWebhookHandler.verifyWebhook(body, signature);

    // Handle event
    await stripeWebhookHandler.handleEvent(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
