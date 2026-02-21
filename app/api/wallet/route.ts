import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { walletService } from '@/features/payments/wallet';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by userId (not IP - prevents proxy bypass)
    const limitCheck = rateLimit(req, false, `user:${clerkId}`);
    if (limitCheck) return limitCheck;

    // Get user from database
    let user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    // Auto-create user on first access
    if (!user) {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || 'unknown@example.com';

      [user] = await db.insert(users).values({
        clerkId,
        email,
        walletBalance: '0.00',
      }).returning();
    }

    // Get wallet info
    const walletInfo = await walletService.getWalletInfo(user.id);

    // Check for low balance alert
    const needsTopUp = await walletService.checkLowBalanceAlert(user.id);

    return NextResponse.json({
      balance: walletInfo.balance,
      transactions: walletInfo.transactions,
      needsTopUp,
    });
  } catch (error) {
    console.error('Wallet fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}
