import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimit, clearAllRateLimits } from './rate-limit.js';

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
