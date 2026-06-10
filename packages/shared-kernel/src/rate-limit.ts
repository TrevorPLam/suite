import type { MiddlewareHandler } from 'hono';

// Cloudflare Workers KV namespace type (for distributed rate limiting)
// This is available in Workers runtime as env.KV_BINDING
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RateLimitOptions {
  requestsPerMinute: number;
  kv?: KVNamespace; // Cloudflare KV binding for distributed rate limiting
}

interface RateLimitState {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit storage per user (fallback for local development).
 * Used when KV binding is not available.
 *
 * Note: This fallback is for local development only. In production,
 * rate limit state must be stored in Cloudflare KV for distributed
 * coordination across multiple Workers instances.
 */
const inMemoryRateLimitStore = new Map<string, RateLimitState>();

/**
 * Serialize rate limit state for KV storage.
 */
function serializeState(state: RateLimitState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize rate limit state from KV storage.
 */
function deserializeState(value: string | null): RateLimitState | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as RateLimitState;
  } catch {
    return null;
  }
}

/**
 * Get rate limit state from KV or in-memory fallback.
 */
async function getRateLimitState(
  userKey: string,
  kv?: KVNamespace
): Promise<RateLimitState | null> {
  if (kv) {
    try {
      const value = await kv.get(userKey);
      return deserializeState(value);
    } catch (error) {
      // Fall back to in-memory on KV error
      console.warn('KV get error, falling back to in-memory:', error);
      return inMemoryRateLimitStore.get(userKey) || null;
    }
  }
  return inMemoryRateLimitStore.get(userKey) || null;
}

/**
 * Set rate limit state in KV or in-memory fallback.
 * KV stores with TTL for automatic cleanup (60 seconds).
 */
async function setRateLimitState(
  userKey: string,
  state: RateLimitState,
  kv?: KVNamespace
): Promise<void> {
  if (kv) {
    try {
      // Store with 60 second TTL (matches rate limit window)
      await kv.put(userKey, serializeState(state), { expirationTtl: 60 });
    } catch (error) {
      // Fall back to in-memory on KV error
      console.warn('KV put error, falling back to in-memory:', error);
      inMemoryRateLimitStore.set(userKey, state);
    }
  } else {
    inMemoryRateLimitStore.set(userKey, state);
  }
}

/**
 * Rate limit middleware using sliding window counter algorithm.
 * Tracks requests per authenticated user and returns 429 when
 * the limit is exceeded.
 *
 * This implements per-user rate limiting as specified in SEC-010.
 * The sliding window ensures fair rate limiting over time.
 *
 * Uses Cloudflare KV for distributed storage when available,
 * with in-memory fallback for local development.
 *
 * @param options - Configuration for rate limiting
 * @returns Hono middleware handler
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { requestsPerMinute, kv } = options;
  const windowMs = 60 * 1000; // 1 minute window

  return async (c, next) => {
    const userId = c.get('userId') as string | undefined;

    // Skip rate limiting for unauthenticated requests or health checks
    if (!userId || c.req.path === '/api/v1/health') {
      await next();
      return;
    }

    const now = Date.now();
    const userKey = userId;

    // Get or create rate limit state for user
    let state = await getRateLimitState(userKey, kv);

    // Reset if window has expired
    if (!state || now >= state.resetTime) {
      state = {
        count: 0,
        resetTime: now + windowMs,
      };
      await setRateLimitState(userKey, state, kv);
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
    await setRateLimitState(userKey, state, kv);

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
 * Note: Only clears in-memory state. KV state will expire via TTL.
 */
export function clearRateLimit(userId: string): void {
  inMemoryRateLimitStore.delete(userId);
}

/**
 * Clear all rate limit state.
 * Useful for testing or memory management.
 * Note: Only clears in-memory state. KV state will expire via TTL.
 */
export function clearAllRateLimits(): void {
  inMemoryRateLimitStore.clear();
}
