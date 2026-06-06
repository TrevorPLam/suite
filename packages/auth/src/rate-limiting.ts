/**
 * Advanced Rate Limiting Module
 * 
 * Implements token bucket algorithm for rate limiting with:
 * - Per-endpoint configuration
 * - Rate limit headers (X-RateLimit-*)
 * - Exponential backoff guidance (Retry-After)
 * - Per-tenant rate limit tracking
 * 
 * Token Bucket Algorithm:
 * - Each bucket has a capacity (max tokens)
 * - Tokens refill at a constant rate (tokens per second)
 * - Each request consumes one token
 * - If bucket is empty, request is rate limited
 * 
 * This provides smoother rate limiting than fixed window algorithms
 * and allows burst traffic within the bucket capacity.
 */

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RateLimitConfig {
  window: number; // Time window in seconds
  max: number; // Max requests per window
  burst?: number; // Burst capacity (defaults to max)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when bucket resets
  retryAfter: number | null; // Seconds to wait before retry (null if not rate limited)
}

export interface PerEndpointConfig {
  [endpoint: string]: RateLimitConfig;
}

export interface RateLimitOptions {
  kv?: KVNamespace;
  defaultConfig: RateLimitConfig;
  endpointConfigs?: PerEndpointConfig;
  tenantId?: string; // For per-tenant rate limiting
}

interface TokenBucket {
  tokens: number;
  lastRefill: number; // Unix timestamp in milliseconds
}

/**
 * Token bucket rate limiter
 * 
 * @param identifier - Unique identifier for the rate limit (e.g., user ID, IP, tenant ID)
 * @param config - Rate limit configuration
 * @param options - Rate limit options
 * @returns Rate limit result with headers
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { kv, tenantId } = options;
  const now = Date.now();
  const windowMs = config.window * 1000;
  const burst = config.burst || config.max;
  
  // Calculate token refill rate (tokens per millisecond)
  const refillRate = config.max / windowMs;
  
  // Generate storage key (includes tenant ID for per-tenant limits)
  const key = tenantId 
    ? `rate_limit:${tenantId}:${identifier}`
    : `rate_limit:${identifier}`;
  
  let bucket: TokenBucket = {
    tokens: burst,
    lastRefill: now,
  };
  
  // Try to load existing bucket from KV
  if (kv) {
    try {
      const stored = await kv.get(key);
      if (stored) {
        const parsed = JSON.parse(stored) as TokenBucket;
        bucket = parsed;
      }
    } catch {
      // If KV fails, proceed with empty bucket (fail open)
    }
  }
  
  // Refill tokens based on time elapsed
  const timeElapsed = now - bucket.lastRefill;
  const tokensToAdd = timeElapsed * refillRate;
  bucket.tokens = Math.min(burst, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
  
  // Check if request is allowed
  const allowed = bucket.tokens >= 1;
  
  if (allowed) {
    // Consume one token
    bucket.tokens -= 1;
  }
  
  // Save bucket state to KV
  if (kv) {
    try {
      // Set TTL to window duration to prevent stale data
      await kv.put(key, JSON.stringify(bucket), {
        expirationTtl: config.window,
      });
    } catch {
      // Silently fail if KV is unavailable
    }
  }
  
  // Calculate rate limit headers
  const remaining = Math.max(0, Math.floor(bucket.tokens));
  const reset = Math.floor((bucket.lastRefill + windowMs) / 1000);
  
  // Calculate retry-after if rate limited
  let retryAfter: number | null = null;
  if (!allowed) {
    // Time to refill one token
    const timeToRefill = (1 - bucket.tokens) / refillRate;
    retryAfter = Math.ceil(timeToRefill / 1000); // Convert to seconds
  }
  
  return {
    allowed,
    limit: config.max,
    remaining,
    reset,
    retryAfter,
  };
}

/**
 * Check rate limit for a specific endpoint
 * 
 * @param identifier - Unique identifier for the rate limit
 * @param endpoint - Endpoint path (e.g., '/sign-in/email')
 * @param options - Rate limit options with endpoint configs
 * @returns Rate limit result
 */
export async function checkEndpointRateLimit(
  identifier: string,
  endpoint: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const config = options.endpointConfigs?.[endpoint] || options.defaultConfig;
  return checkRateLimit(identifier, config, options);
}

/**
 * Apply rate limit headers to a response
 * 
 * @param response - Response object
 * @param result - Rate limit result
 * @returns Response with headers applied
 */
export function applyRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = new Headers(response.headers);
  
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.reset.toString());
  
  if (!result.allowed && result.retryAfter !== null) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Create a rate-limited response
 * 
 * @param result - Rate limit result
 * @returns Response with 429 status and headers
 */
export function createRateLimitedResponse(result: RateLimitResult): Response {
  const body = JSON.stringify({
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: result.retryAfter,
  });
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  });
  
  if (result.retryAfter !== null) {
    headers.set('Retry-After', result.retryAfter.toString());
  }
  
  return new Response(body, {
    status: 429,
    headers,
  });
}

/**
 * Calculate exponential backoff delay
 * 
 * @param attempt - Current attempt number (1-based)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @param maxDelay - Maximum delay in milliseconds (default: 30000ms)
 * @returns Delay in milliseconds
 */
export function calculateExponentialBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Get recommended retry delay with jitter
 * 
 * @param retryAfter - Retry-After header value in seconds
 * @param _attempt - Current attempt number (reserved for future use)
 * @returns Delay in milliseconds with jitter
 */
export function getRetryDelayWithJitter(
  retryAfter: number,
  _attempt: number = 1
): number {
  // Use Retry-After header if available
  const baseDelay = retryAfter * 1000;
  
  // Add jitter (±25%) to prevent thundering herd
  const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1);
  
  return Math.max(0, baseDelay + jitter);
}

/**
 * Default rate limit configurations for common endpoints
 */
export const DEFAULT_ENDPOINT_CONFIGS: PerEndpointConfig = {
  '/sign-in/email': { window: 60, max: 10, burst: 15 },
  '/sign-up/email': { window: 60, max: 5, burst: 8 },
  '/sign-out': { window: 60, max: 30, burst: 40 },
  '/reset-password/email': { window: 900, max: 3, burst: 5 },
  '/reset-password': { window: 900, max: 5, burst: 8 },
  '/send-verification-email': { window: 900, max: 3, burst: 5 },
  '/verify-email': { window: 60, max: 10, burst: 15 },
};

/**
 * Configure rate limiting for Better Auth
 * 
 * This function returns a configuration object that can be used
 * with Better Auth's advanced.rateLimit configuration.
 * 
 * @param options - Rate limit options
 * @returns Better Auth rate limit configuration
 */
export function configureBetterAuthRateLimit(options: RateLimitOptions) {
  const { defaultConfig, endpointConfigs = DEFAULT_ENDPOINT_CONFIGS, kv } = options;
  
  return {
    window: defaultConfig.window,
    max: defaultConfig.max,
    customRules: Object.fromEntries(
      Object.entries(endpointConfigs).map(([endpoint, config]) => [
        endpoint,
        {
          window: config.window,
          max: config.max,
        },
      ])
    ),
    ...(kv ? {
      customStorage: {
        get: async (key: string) => {
          try {
            const value = await kv.get(key);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        set: async (key: string, value: unknown, ttl: number) => {
          try {
            await kv.put(key, JSON.stringify(value), {
              expirationTtl: ttl,
            });
          } catch {
            // Silently fail if KV is unavailable
          }
        },
        delete: async (key: string) => {
          try {
            await kv.delete(key);
          } catch {
            // Silently fail if KV is unavailable
          }
        },
      },
    } : {}),
  };
}
