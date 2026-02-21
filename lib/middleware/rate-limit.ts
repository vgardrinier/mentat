import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimiter, expensiveRateLimiter } from '@/lib/security/rate-limiter';

/**
 * Get safe IP address from request
 * IMPORTANT: Only use x-forwarded-for if behind a trusted proxy (Vercel, etc.)
 * Otherwise, attackers can spoof this header
 */
function getIpIdentifier(req: NextRequest): string {
  // In production (Vercel), x-forwarded-for is safe
  // In development, use it as fallback but it's not trusted
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.ip ||
    'unknown'
  );
}

/**
 * Rate limit middleware for API routes
 *
 * IMPORTANT: Prefer userId-based limiting for authenticated routes
 * Only use IP-based limiting for public routes
 *
 * @param req - Next.js request
 * @param expensive - Use stricter limit (10/min vs 100/min)
 * @param identifier - Optional identifier (userId, workerId, etc.). If not provided, uses IP
 */
export function rateLimit(
  req: NextRequest,
  expensive: boolean = false,
  identifier?: string
): NextResponse | null {
  // Use provided identifier (userId/workerId) or fallback to IP
  const rateLimitKey = identifier || `ip:${getIpIdentifier(req)}`;

  const limiter = expensive ? expensiveRateLimiter : apiRateLimiter;
  const result = limiter.check(rateLimitKey);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': expensive ? '10' : '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to response (will be added by caller)
  return null; // null means allowed
}

export function getRateLimitHeaders(
  req: NextRequest,
  expensive: boolean = false,
  identifier?: string
) {
  const rateLimitKey = identifier || `ip:${getIpIdentifier(req)}`;

  const limiter = expensive ? expensiveRateLimiter : apiRateLimiter;
  const result = limiter.check(rateLimitKey);

  return {
    'X-RateLimit-Limit': expensive ? '10' : '100',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  };
}
