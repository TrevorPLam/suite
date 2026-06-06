import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { rateLimit, clearAllRateLimits, type KVNamespace } from './rate-limit.js';

type Variables = {
  userId: string | undefined;
};

describe('rateLimit middleware', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
  });

  it('should allow requests within the limit', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 5 }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Make 5 requests (within limit)
    for (let i = 0; i < 5; i++) {
      const res = await app.request('/api/test');
      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe((5 - (i + 1)).toString());
    }
  });

  it('should block requests exceeding the limit', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 3 }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Make 3 requests (at limit)
    for (let i = 0; i < 3; i++) {
      const res = await app.request('/api/test');
      expect(res.status).toBe(200);
    }

    // 4th request should be blocked
    const res = await app.request('/api/test');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should skip rate limiting for unauthenticated requests', async () => {
    const app = new Hono<{ Variables: Variables }>();

    app.use('/api/*', rateLimit({ requestsPerMinute: 2 }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Make 10 requests without userId (should all pass)
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/test');
      expect(res.status).toBe(200);
    }
  });

  it('should skip rate limiting for health checks', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 1 }));
    app.get('/api/health', (c) => c.json({ ok: true }));

    // Make multiple health check requests (should all pass)
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/health');
      expect(res.status).toBe(200);
    }
  });

  it('should track rate limits per user independently', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const user1 = 'user-1';
    const user2 = 'user-2';

    app.use('/api/*', async (c, next) => {
      const userId = c.req.header('X-User-Id');
      c.set('userId', userId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 2 }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // User 1 makes 2 requests (at limit)
    for (let i = 0; i < 2; i++) {
      const res = await app.request('/api/test', {
        headers: { 'X-User-Id': user1 },
      });
      expect(res.status).toBe(200);
    }

    // User 1 should be blocked on 3rd request
    const res1 = await app.request('/api/test', {
      headers: { 'X-User-Id': user1 },
    });
    expect(res1.status).toBe(429);

    // User 2 should still be able to make requests
    const res2 = await app.request('/api/test', {
      headers: { 'X-User-Id': user2 },
    });
    expect(res2.status).toBe(200);
  });

  it('should return proper error response when rate limited', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 1 }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // First request
    await app.request('/api/test');

    // Second request should be rate limited
    const res = await app.request('/api/test');
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Rate limit exceeded');
    expect(body.message).toContain('Too many requests');
    expect(body.limit).toBe(1);
    expect(body.resetAt).toBeTruthy();
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('should include rate limit headers on successful requests', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 10 }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');

    expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('9');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });
});

describe('rateLimit middleware with KV (distributed)', () => {
  const mockKV: KVNamespace = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearAllRateLimits();
  });

  it('should use KV storage when available', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 5, kv: mockKV }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Mock KV to return null (no existing state)
    vi.mocked(mockKV.get).mockResolvedValue(null);

    const res = await app.request('/api/test');

    expect(res.status).toBe(200);
    expect(mockKV.get).toHaveBeenCalledWith('user-123');
    // Middleware calls put twice: initial state (count: 0) then after increment (count: 1)
    expect(mockKV.put).toHaveBeenCalledTimes(2);
    // Verify the structure of the calls without exact number matching
    const firstCall = vi.mocked(mockKV.put).mock.calls[0];
    const secondCall = vi.mocked(mockKV.put).mock.calls[1];
    if (firstCall && secondCall) {
      expect(firstCall[0]).toBe('user-123');
      expect(firstCall[2]).toEqual({ expirationTtl: 60 });
      const firstState = JSON.parse(firstCall[1] as string);
      expect(firstState.count).toBe(0);
      expect(typeof firstState.resetTime).toBe('number');
      expect(secondCall[0]).toBe('user-123');
      expect(secondCall[2]).toEqual({ expirationTtl: 60 });
      const secondState = JSON.parse(secondCall[1] as string);
      expect(secondState.count).toBe(1);
      expect(typeof secondState.resetTime).toBe('number');
    }
  });

  it('should fall back to in-memory when KV is unavailable', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 5 })); // No KV
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');

    expect(res.status).toBe(200);
    expect(mockKV.get).not.toHaveBeenCalled();
    expect(mockKV.put).not.toHaveBeenCalled();
  });

  it('should handle KV errors gracefully', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 5, kv: mockKV }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Mock KV to throw error
    vi.mocked(mockKV.get).mockRejectedValue(new Error('KV error'));

    // Should fall back to in-memory on error
    const res = await app.request('/api/test');

    expect(res.status).toBe(200);
  });

  it('should respect existing KV state', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 3, kv: mockKV }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Mock KV to return existing state at limit
    const existingState = { count: 3, resetTime: Date.now() + 60000 };
    vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(existingState));

    const res = await app.request('/api/test');

    expect(res.status).toBe(429);
    expect(mockKV.get).toHaveBeenCalledWith('user-123');
  });

  it('should reset window when KV state is expired', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', rateLimit({ requestsPerMinute: 5, kv: mockKV }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Mock KV to return expired state
    const expiredState = { count: 100, resetTime: Date.now() - 1000 };
    vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(expiredState));

    const res = await app.request('/api/test');

    expect(res.status).toBe(200);
    expect(mockKV.put).toHaveBeenCalled();
  });
});
