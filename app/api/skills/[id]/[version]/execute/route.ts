import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { skillExecutions } from '@/lib/db/schema';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  // Rate limit check (normal)
  const limitCheck = rateLimit(req);
  if (limitCheck) return limitCheck;

  try {
    const { id, version } = params;

    // Record execution
    await db.insert(skillExecutions).values({
      skillId: id,
      version,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Skill execution tracking error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to track execution' },
      { status: 500 }
    );
  }
}
