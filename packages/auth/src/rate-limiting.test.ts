/**
 * Advanced Rate Limiting Tests
 * 
 * Tests for token bucket algorithm, rate limit headers,
 * exponential backoff, and per-tenant rate limiting.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkRateLimit,
  checkEndpointRateLimit,
  applyRateLimitHeaders,
  createRateLimitedResponse,
  calculateExponentialBackoff,
  getRetryDelayWithJitter,
  configureBetterAuthRateLimit,
  DEFAULT_ENDPOINT_CONFIGS,
  type RateLimitConfig,
  type RateLimitOptions,
  type RateLimitResult,
} from './rate-limiting.js';

// Mock KV namespace with vitest mock methods
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockKV: any = {
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow requests within limit', async () => {
    const config: RateLimitConfig = { window: 60, max: 10, burst: 15 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    mockKV.get.mockResolvedValue(null);

    const result = await checkRateLimit('user-123', config, options);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBeGreaterThan(0);
    expect(result.remaining).toBeLessThanOrEqual(14);
    expect(result.retryAfter).toBeNull();
  });

  it('should rate limit when bucket is empty', async () => {
    const config: RateLimitConfig = { window: 60, max: 1, burst: 1 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    // First request consumes the only token
    mockKV.get.mockResolvedValue(null);
    await checkRateLimit('user-123', config, options);

    // Second request should be rate limited
    mockKV.get.mockResolvedValue(JSON.stringify({
      tokens: 0,
      lastRefill: Date.now(),
    }));

    const result = await checkRateLimit('user-123', config, options);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should refill tokens over time', async () => {
    const config: RateLimitConfig = { window: 60, max: 10, burst: 15 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Simulate bucket with 0 tokens from 1 minute ago
    mockKV.get.mockResolvedValue(JSON.stringify({
      tokens: 0,
      lastRefill: oneMinuteAgo,
    }));

    const result = await checkRateLimit('user-123', config, options);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('should use burst capacity for initial requests', async () => {
    const config: RateLimitConfig = { window: 60, max: 10, burst: 20 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    mockKV.get.mockResolvedValue(null);

    const result = await checkRateLimit('user-123', config, options);

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(10);
    expect(result.remaining).toBeGreaterThan(10); // Burst allows more than max
  });

  it('should handle KV unavailability gracefully', async () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    mockKV.get.mockRejectedValue(new Error('KV unavailable'));
    mockKV.put.mockRejectedValue(new Error('KV unavailable'));

    const result = await checkRateLimit('user-123', config, options);

    // Should fail open (allow request) when KV is unavailable
    expect(result.allowed).toBe(true);
  });

  it('should work without KV (in-memory only)', async () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      defaultConfig: config,
    };

    const result = await checkRateLimit('user-123', config, options);

    expect(result.allowed).toBe(true);
    expect(mockKV.get).not.toHaveBeenCalled();
    expect(mockKV.put).not.toHaveBeenCalled();
  });

  it('should include tenant ID in storage key when provided', async () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
      tenantId: 'tenant-abc',
    };

    mockKV.get.mockResolvedValue(null);

    await checkRateLimit('user-123', config, options);

    expect(mockKV.get).toHaveBeenCalledWith('rate_limit:tenant-abc:user-123');
  });

  it('should not include tenant ID in storage key when not provided', async () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    mockKV.get.mockResolvedValue(null);

    await checkRateLimit('user-123', config, options);

    expect(mockKV.get).toHaveBeenCalledWith('rate_limit:user-123');
  });

  it('should set appropriate TTL on KV storage', async () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    mockKV.get.mockResolvedValue(null);

    await checkRateLimit('user-123', config, options);

    expect(mockKV.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { expirationTtl: 60 }
    );
  });
});

describe('checkEndpointRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use endpoint-specific config when available', async () => {
    const endpointConfig: RateLimitConfig = { window: 30, max: 5 };
    const defaultConfig: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig,
      endpointConfigs: {
        '/sign-in/email': endpointConfig,
      },
    };

    mockKV.get.mockResolvedValue(null);

    const result = await checkEndpointRateLimit('user-123', '/sign-in/email', options);

    expect(result.limit).toBe(5); // Endpoint-specific limit
  });

  it('should use default config when endpoint not found', async () => {
    const defaultConfig: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig,
      endpointConfigs: {
        '/sign-in/email': { window: 30, max: 5 },
      },
    };

    mockKV.get.mockResolvedValue(null);

    const result = await checkEndpointRateLimit('user-123', '/unknown-endpoint', options);

    expect(result.limit).toBe(10); // Default limit
  });

  it('should use default config when no endpoint configs provided', async () => {
    const defaultConfig: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig,
    };

    mockKV.get.mockResolvedValue(null);

    const result = await checkEndpointRateLimit('user-123', '/sign-in/email', options);

    expect(result.limit).toBe(10); // Default limit
  });
});

describe('applyRateLimitHeaders', () => {
  it('should add rate limit headers to response', () => {
    const result: RateLimitResult = {
      allowed: true,
      limit: 10,
      remaining: 5,
      reset: 1234567890,
      retryAfter: null,
    };

    const response = new Response('OK', { status: 200 });
    const modifiedResponse = applyRateLimitHeaders(response, result);

    expect(modifiedResponse.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(modifiedResponse.headers.get('X-RateLimit-Remaining')).toBe('5');
    expect(modifiedResponse.headers.get('X-RateLimit-Reset')).toBe('1234567890');
  });

  it('should add Retry-After header when rate limited', () => {
    const result: RateLimitResult = {
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 1234567890,
      retryAfter: 30,
    };

    const response = new Response('OK', { status: 200 });
    const modifiedResponse = applyRateLimitHeaders(response, result);

    expect(modifiedResponse.headers.get('Retry-After')).toBe('30');
  });

  it('should not add Retry-After header when not rate limited', () => {
    const result: RateLimitResult = {
      allowed: true,
      limit: 10,
      remaining: 5,
      reset: 1234567890,
      retryAfter: null,
    };

    const response = new Response('OK', { status: 200 });
    const modifiedResponse = applyRateLimitHeaders(response, result);

    expect(modifiedResponse.headers.get('Retry-After')).toBeNull();
  });

  it('should preserve existing response headers', () => {
    const result: RateLimitResult = {
      allowed: true,
      limit: 10,
      remaining: 5,
      reset: 1234567890,
      retryAfter: null,
    };

    const response = new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
    const modifiedResponse = applyRateLimitHeaders(response, result);

    expect(modifiedResponse.headers.get('Content-Type')).toBe('text/plain');
  });
});

describe('createRateLimitedResponse', () => {
  it('should create 429 response with error body', () => {
    const result: RateLimitResult = {
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 1234567890,
      retryAfter: 30,
    };

    const response = createRateLimitedResponse(result);

    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should include rate limit headers', () => {
    const result: RateLimitResult = {
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 1234567890,
      retryAfter: 30,
    };

    const response = createRateLimitedResponse(result);

    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1234567890');
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('should include retryAfter in response body', async () => {
    const result: RateLimitResult = {
      allowed: false,
      limit: 10,
      remaining: 0,
      reset: 1234567890,
      retryAfter: 30,
    };

    const response = createRateLimitedResponse(result);
    const body = await response.json();

    expect(body.error).toBe('Rate limit exceeded');
    expect(body.message).toBe('Too many requests. Please try again later.');
    expect(body.retryAfter).toBe(30);
  });
});

describe('calculateExponentialBackoff', () => {
  it('should calculate exponential backoff', () => {
    expect(calculateExponentialBackoff(1)).toBe(1000);
    expect(calculateExponentialBackoff(2)).toBe(2000);
    expect(calculateExponentialBackoff(3)).toBe(4000);
    expect(calculateExponentialBackoff(4)).toBe(8000);
  });

  it('should use custom base delay', () => {
    expect(calculateExponentialBackoff(1, 500)).toBe(500);
    expect(calculateExponentialBackoff(2, 500)).toBe(1000);
  });

  it('should cap at max delay', () => {
    expect(calculateExponentialBackoff(10, 1000, 5000)).toBe(5000);
    expect(calculateExponentialBackoff(100, 1000, 5000)).toBe(5000);
  });

  it('should use default max delay when not specified', () => {
    const result = calculateExponentialBackoff(10);
    expect(result).toBeLessThanOrEqual(30000);
  });
});

describe('getRetryDelayWithJitter', () => {
  it('should add jitter to retry delay', () => {
    const delay = getRetryDelayWithJitter(10);
    expect(delay).toBeGreaterThan(7500); // 10s - 25%
    expect(delay).toBeLessThan(12500); // 10s + 25%
  });

  it('should handle zero retry after', () => {
    const delay = getRetryDelayWithJitter(0);
    expect(delay).toBeGreaterThanOrEqual(0);
  });

  it('should always return non-negative delay', () => {
    const delay = getRetryDelayWithJitter(1);
    expect(delay).toBeGreaterThanOrEqual(0);
  });
});

describe('configureBetterAuthRateLimit', () => {
  it('should configure Better Auth rate limit', () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      defaultConfig: config,
      endpointConfigs: {
        '/sign-in/email': { window: 30, max: 5 },
      },
    };

    const betterAuthConfig = configureBetterAuthRateLimit(options);

    expect(betterAuthConfig.window).toBe(60);
    expect(betterAuthConfig.max).toBe(10);
    expect(betterAuthConfig.customRules).toBeDefined();
    expect(betterAuthConfig.customRules['/sign-in/email']).toEqual({
      window: 30,
      max: 5,
    });
  });

  it('should include custom storage when KV is provided', () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      kv: mockKV,
      defaultConfig: config,
    };

    const betterAuthConfig = configureBetterAuthRateLimit(options);

    expect(betterAuthConfig.customStorage).toBeDefined();
    expect(betterAuthConfig.customStorage?.get).toBeDefined();
    expect(betterAuthConfig.customStorage?.set).toBeDefined();
    expect(betterAuthConfig.customStorage?.delete).toBeDefined();
  });

  it('should not include custom storage when KV is not provided', () => {
    const config: RateLimitConfig = { window: 60, max: 10 };
    const options: RateLimitOptions = {
      defaultConfig: config,
    };

    const betterAuthConfig = configureBetterAuthRateLimit(options);

    expect(betterAuthConfig.customStorage).toBeUndefined();
  });
});

describe('DEFAULT_ENDPOINT_CONFIGS', () => {
  it('should have configs for common endpoints', () => {
    expect(DEFAULT_ENDPOINT_CONFIGS['/sign-in/email']).toBeDefined();
    expect(DEFAULT_ENDPOINT_CONFIGS['/sign-up/email']).toBeDefined();
    expect(DEFAULT_ENDPOINT_CONFIGS['/reset-password/email']).toBeDefined();
  });

  it('should have reasonable limits for sign-in', () => {
    const config = DEFAULT_ENDPOINT_CONFIGS['/sign-in/email'];
    if (!config) throw new Error('Config not found');
    expect(config.window).toBe(60);
    expect(config.max).toBe(10);
    expect(config.burst).toBe(15);
  });

  it('should have stricter limits for password reset', () => {
    const config = DEFAULT_ENDPOINT_CONFIGS['/reset-password/email'];
    if (!config) throw new Error('Config not found');
    expect(config.window).toBe(900); // 15 minutes
    expect(config.max).toBe(3);
  });
});
