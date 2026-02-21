/**
 * Simple in-memory rate limiter
 *
 * For production, use Redis or similar distributed cache
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store[identifier];

    // No entry or window expired - allow and create new window
    if (!entry || now > entry.resetAt) {
      this.store[identifier] = {
        count: 1,
        resetAt: now + this.windowMs,
      };

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    // Increment count
    entry.count++;

    // Check if over limit
    if (entry.count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of Object.entries(this.store)) {
      if (now > entry.resetAt) {
        delete this.store[key];
      }
    }
  }

  /**
   * Destroy rate limiter (clear interval)
   */
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Global rate limiter instances
export const apiRateLimiter = new RateLimiter(100, 60000); // 100 req/min
export const expensiveRateLimiter = new RateLimiter(10, 60000); // 10 req/min for expensive ops
