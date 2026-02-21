import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Public routes that do NOT require Clerk authentication
// CRITICAL: Be very careful adding routes here - default to protected
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Stripe webhooks (verified by Stripe signature, not Clerk)
  '/api/webhooks/stripe',

  // Worker delivery webhook (verified by webhook signature, not Clerk)
  '/api/jobs/(.*)/deliver',

  // Public read-only routes (browsing)
  '/api/skills',
  '/api/skills/(.*)',
  '/api/workers',
  '/api/workers/(.*)',
]);

// ALL OTHER ROUTES REQUIRE CLERK AUTHENTICATION
// This includes:
// - /api/jobs (POST) - create job
// - /api/jobs/[id]/approve - release escrow
// - /api/jobs/[id]/reject - refund escrow
// - /api/wallet - view wallet
// - /api/wallet/add-funds - add funds
// - /api/match - match job

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
