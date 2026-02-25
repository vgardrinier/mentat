import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { skills, skillVersions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { rateLimit } from '@/lib/middleware/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  // Rate limit check (normal)
  const limitCheck = rateLimit(req);
  if (limitCheck) return limitCheck;

  try {
    const { id, version } = params;

    // If version is "latest", fetch the latest version
    let targetVersion = version;
    if (version === 'latest') {
      const skill = await db.query.skills.findFirst({
        where: eq(skills.id, id),
      });

      if (!skill) {
        return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
      }

      targetVersion = skill.latestVersion;
    }

    // Fetch the specific version
    const skillVersion = await db.query.skillVersions.findFirst({
      where: and(
        eq(skillVersions.skillId, id),
        eq(skillVersions.version, targetVersion)
      ),
    });

    if (!skillVersion) {
      return NextResponse.json(
        { error: `Skill version ${targetVersion} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      yaml_content: skillVersion.yamlContent,
      sha256: skillVersion.sha256,
      version: skillVersion.version,
      skill_id: skillVersion.skillId,
    });
  } catch (error) {
    console.error('Skill fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch skill' },
      { status: 500 }
    );
  }
}
