import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { workerMatcher } from '@/features/workers/matcher';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';

const matchRequestSchema = z.object({
  task: z.string().min(1),
  specialty: z.string().optional(),
  budget: z.number().optional(),
  requiredCapabilities: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // CRITICAL: Verify authentication (expensive AI operation)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by userId (not IP - prevents proxy bypass)
    const limitCheck = rateLimit(req, true, `user:${userId}`);
    if (limitCheck) return limitCheck;

    const body = await req.json();
    const request = matchRequestSchema.parse(body);

    const match = await workerMatcher.findMatch(request);

    return NextResponse.json({ match });
  } catch (error) {
    console.error('Match error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to find match' },
      { status: 500 }
    );
  }
}
