import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { skills } from '@/lib/db/schema';
import { eq, like } from 'drizzle-orm';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function GET(req: NextRequest) {
  // Rate limit check (normal)
  const limitCheck = rateLimit(req);
  if (limitCheck) return limitCheck;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    let query = db.select().from(skills);

    if (search) {
      query = query.where(like(skills.name, `%${search}%`)) as any;
    }

    const allSkills = await query;

    return NextResponse.json({ skills: allSkills });
  } catch (error) {
    console.error('Skills fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch skills' },
      { status: 500 }
    );
  }
}
