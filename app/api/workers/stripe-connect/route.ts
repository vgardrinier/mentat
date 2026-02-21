import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * Create Stripe Connect account link for worker onboarding
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workerType, name } = await req.json();

    if (!workerType || !name) {
      return NextResponse.json(
        { error: 'workerType and name required' },
        { status: 400 }
      );
    }

    // Create Stripe Connected Account
    const account = await stripe.accounts.create({
      type: 'express', // Express for quick onboarding
      country: 'US', // TODO: Make this configurable
      email: userId, // Use Clerk user ID as reference
      capabilities: {
        transfers: { requested: true },
      },
      business_type: workerType === 'company' ? 'company' : 'individual',
      metadata: {
        clerkUserId: userId,
        workerName: name,
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/workers/register?step=4&refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/workers/register?step=5&stripe_connected=true&account_id=${account.id}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      url: accountLink.url,
      accountId: account.id,
    });
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create Stripe Connect link',
      },
      { status: 500 }
    );
  }
}
