/**
 * Rate Limiter for Tenant-Level Request Throttling
 * 
 * Implements token bucket algorithm for rate limiting per tenant.
 * Prevents abuse and ensures fair resource allocation across tenants.
 */

/**
 * Rate limit configuration per tenant
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
}

/**
 * Token bucket state for a tenant
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Default rate limit configuration
 * 1000 requests per minute per tenant
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 1000,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * In-memory token bucket storage per tenant
 * In production, this should be replaced with a distributed cache
 * (e.g., Redis, Cloudflare KV, or Durable Objects)
 */
const tokenBuckets = new Map<string, TokenBucket>();

/**
 * Rate limiter class using token bucket algorithm
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRequests: config?.maxRequests ?? DEFAULT_CONFIG.maxRequests,
      windowMs: config?.windowMs ?? DEFAULT_CONFIG.windowMs,
    };
  }

  /**
   * Check if a request is allowed for a tenant
   * 
   * @param tenantId - The tenant ID
   * @returns RateLimitResult indicating if the request is allowed
   */
  checkLimit(tenantId: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.getOrCreateBucket(tenantId, now);

    // Refill tokens based on time elapsed
    this.refillTokens(bucket, now);

    // Check if request is allowed
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      bucket.lastRefill = now;
      this.saveBucket(tenantId, bucket);

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetTime: new Date(now + this.config.windowMs),
      };
    }

    // Rate limit exceeded
    const resetTime = bucket.lastRefill + this.config.windowMs;
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(resetTime),
    };
  }

  /**
   * Get or create a token bucket for a tenant
   */
  private getOrCreateBucket(tenantId: string, now: number): TokenBucket {
    let bucket = tokenBuckets.get(tenantId);
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: now,
      };
      tokenBuckets.set(tenantId, bucket);
    }
    return bucket;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(bucket: TokenBucket, now: number): void {
    const elapsed = now - bucket.lastRefill;
    if (elapsed >= this.config.windowMs) {
      // Full refill
      bucket.tokens = this.config.maxRequests;
      bucket.lastRefill = now;
    } else {
      // Partial refill based on elapsed time
      const refillAmount = (elapsed / this.config.windowMs) * this.config.maxRequests;
      bucket.tokens = Math.min(this.config.maxRequests, bucket.tokens + refillAmount);
    }
  }

  /**
   * Save bucket state
   */
  private saveBucket(tenantId: string, bucket: TokenBucket): void {
    tokenBuckets.set(tenantId, bucket);
  }

  /**
   * Reset rate limit for a tenant (useful for testing or admin actions)
   * 
   * @param tenantId - The tenant ID
   */
  resetLimit(tenantId: string): void {
    tokenBuckets.delete(tenantId);
  }

  /**
   * Get current token count for a tenant
   * 
   * @param tenantId - The tenant ID
   * @returns Current token count
   */
  getTokenCount(tenantId: string): number {
    const bucket = tokenBuckets.get(tenantId);
    return bucket ? Math.floor(bucket.tokens) : this.config.maxRequests;
  }

  /**
   * Clear all rate limit state (useful for testing)
   */
  clearAll(): void {
    tokenBuckets.clear();
  }
}

/**
 * Global rate limiter instance with default configuration
 */
export const globalRateLimiter = new RateLimiter();

/**
 * Check rate limit using global rate limiter
 * 
 * @param tenantId - The tenant ID
 * @returns RateLimitResult indicating if the request is allowed
 */
export function checkRateLimit(tenantId: string): RateLimitResult {
  return globalRateLimiter.checkLimit(tenantId);
}

/**
 * Reset rate limit for a tenant using global rate limiter
 * 
 * @param tenantId - The tenant ID
 */
export function resetRateLimit(tenantId: string): void {
  globalRateLimiter.resetLimit(tenantId);
}

/**
 * Get token count for a tenant using global rate limiter
 * 
 * @param tenantId - The tenant ID
 * @returns Current token count
 */
export function getTokenCount(tenantId: string): number {
  return globalRateLimiter.getTokenCount(tenantId);
}

/**
 * Clear all rate limit state using global rate limiter (useful for testing)
 */
export function clearAllRateLimits(): void {
  globalRateLimiter.clearAll();
}
