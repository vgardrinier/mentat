import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { workerService } from '@/features/workers/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { rateLimit } from '@/lib/middleware/rate-limit';

const offerSchema = z.object({
  id: z.string(),
  title: z.string(),
  priceCents: z.number().min(500), // Minimum $5
  currency: z.string().default('USD'),
  etaMinutesMin: z.number().min(1),
  etaMinutesMax: z.number().min(1),
  revisionsIncluded: z.number().min(0).max(5),
  scopeNotes: z.string(),
  tags: z.array(z.string()),
});

const registerWorkerSchema = z.object({
  name: z.string().min(1),
  workerType: z.enum(['solo', 'company']).default('solo'),
  description: z.string().optional(),
  specialty: z.string().min(1),
  offers: z.array(offerSchema).optional(), // New offers-based pricing
  capabilities: z.object({
    list: z.array(z.string()),
  }).optional(),
  limitations: z.object({
    list: z.array(z.string()),
  }).optional(),
  requiredInputs: z.record(z.any()).optional(),
  requiredContext: z.array(z.string()).optional(),
  avgCompletionTime: z.number().min(1),
  p90CompletionTime: z.number().min(1),
  pricing: z.number().min(0), // Legacy - kept for backward compatibility
  apiEndpoint: z.string().url(),
  webhookSecret: z.string().optional(),
  stripeAccountId: z.string().optional(), // From Stripe Connect
  acceptingJobs: z.boolean().default(false),
  maxConcurrentJobs: z.number().min(1).max(100).default(5),
});

export async function GET(req: NextRequest) {
  // Rate limit check (normal)
  const limitCheck = rateLimit(req);
  if (limitCheck) return limitCheck;

  try {
    const { searchParams } = new URL(req.url);
    const specialty = searchParams.get('specialty');

    const workers = specialty
      ? await workerService.listWorkersBySpecialty(specialty)
      : await workerService.listActiveWorkers();

    return NextResponse.json({ workers });
  } catch (error) {
    console.error('Workers fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit by userId (not IP - prevents proxy bypass)
    const limitCheck = rateLimit(req, true, `user:${clerkId}`);
    if (limitCheck) return limitCheck;

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const data = registerWorkerSchema.parse(body);

    // PRODUCTION ENFORCEMENT: webhookSecret is REQUIRED in production
    if (!data.webhookSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        {
          error: 'webhookSecret is required in production for worker security',
          details: 'Workers must provide a webhookSecret to sign and verify deliveries'
        },
        { status: 400 }
      );
    }

    const worker = await workerService.registerWorker({
      userId: user.id,
      name: data.name,
      workerType: data.workerType,
      description: data.description || null,
      specialty: data.specialty,
      offers: data.offers || null,
      capabilities: data.capabilities || { list: [] },
      limitations: data.limitations || { list: [] },
      requiredInputs: data.requiredInputs || {},
      requiredContext: data.requiredContext || [],
      avgCompletionTime: data.avgCompletionTime,
      p90CompletionTime: data.p90CompletionTime,
      pricing: data.pricing.toString(),
      apiEndpoint: data.apiEndpoint,
      webhookSecret: data.webhookSecret || null,
      stripeAccountId: data.stripeAccountId || null,
      acceptingJobs: data.acceptingJobs,
      maxConcurrentJobs: data.maxConcurrentJobs,
    });

    return NextResponse.json({ worker }, { status: 201 });
  } catch (error) {
    console.error('Worker registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register worker' },
      { status: 500 }
    );
  }
}
