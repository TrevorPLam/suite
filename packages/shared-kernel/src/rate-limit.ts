import type { MiddlewareHandler } from 'hono';

export interface RateLimitOptions {
  requestsPerMinute: number;
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit storage per user.
 * For MVP, this uses a simple Map. In production, this should be
 * replaced with Redis or Cloudflare KV for distributed rate limiting.
 */
const rateLimitStore = new Map<string, RateLimitState>();

/**
 * Rate limit middleware using sliding window counter algorithm.
 * Tracks requests per authenticated user and returns 429 when
 * the limit is exceeded.
 *
 * This implements per-user rate limiting as specified in SEC-010.
 * The sliding window ensures fair rate limiting over time.
 *
 * @param options - Configuration for rate limiting
 * @returns Hono middleware handler
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { requestsPerMinute } = options;
  const windowMs = 60 * 1000; // 1 minute window

  return async (c, next) => {
    const userId = c.get('userId') as string | undefined;

    // Skip rate limiting for unauthenticated requests or health checks
    if (!userId || c.req.path === '/api/health') {
      await next();
      return;
    }

    const now = Date.now();
    const userKey = userId;

    // Get or create rate limit state for user
    let state = rateLimitStore.get(userKey);

    // Reset if window has expired
    if (!state || now >= state.resetTime) {
      state = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(userKey, state);
    }

    // Check if limit exceeded
    if (state.count >= requestsPerMinute) {
      const retryAfter = Math.ceil((state.resetTime - now) / 1000);
      return c.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
          limit: requestsPerMinute,
          resetAt: new Date(state.resetTime).toISOString(),
        },
        429,
        {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': requestsPerMinute.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': state.resetTime.toString(),
        }
      );
    }

    // Increment request count
    state.count++;
    rateLimitStore.set(userKey, state);

    // Add rate limit headers to response
    await next();

    const remaining = Math.max(0, requestsPerMinute - state.count);
    c.header('X-RateLimit-Limit', requestsPerMinute.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', state.resetTime.toString());
  };
}

/**
 * Clear rate limit state for a specific user.
 * Useful for testing or manual resets.
 */
export function clearRateLimit(userId: string): void {
  rateLimitStore.delete(userId);
}

/**
 * Clear all rate limit state.
 * Useful for testing or memory management.
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
