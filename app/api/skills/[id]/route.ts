import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { skills } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Rate limit check (normal)
  const limitCheck = rateLimit(req);
  if (limitCheck) return limitCheck;

  try {
    const skill = await db.query.skills.findFirst({
      where: eq(skills.id, params.id),
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    return NextResponse.json({ skill });
  } catch (error) {
    console.error('Skill fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}
