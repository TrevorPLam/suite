import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { UsageMonitor, type UsageRepository, type UsageRecord } from './usage-monitor.js';

type Variables = {
  userId: string | undefined;
  tenantId: string | undefined;
  requestId: string | undefined;
};

describe('UsageMonitor middleware', () => {
  const mockUsageRepository: UsageRepository = {
    findOrCreateUsage: vi.fn(),
    incrementUsage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip usage monitoring for unauthenticated requests', async () => {
    const app = new Hono<{ Variables: Variables }>();

    app.use('/api/*', UsageMonitor({
      limit: 100,
      usageRepository: mockUsageRepository,
    }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    // Make requests without userId (should all pass without monitoring)
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/test');
      expect(res.status).toBe(200);
    }

    expect(mockUsageRepository.findOrCreateUsage).not.toHaveBeenCalled();
    expect(mockUsageRepository.incrementUsage).not.toHaveBeenCalled();
  });

  it('should skip usage monitoring for health checks', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', UsageMonitor({
      limit: 100,
      usageRepository: mockUsageRepository,
    }));
    app.get('/api/v1/health', (c) => c.json({ ok: true }));

    // Make multiple health check requests (should all pass without monitoring)
    for (let i = 0; i < 10; i++) {
      const res = await app.request('/api/v1/health');
      expect(res.status).toBe(200);
    }

    expect(mockUsageRepository.findOrCreateUsage).not.toHaveBeenCalled();
    expect(mockUsageRepository.incrementUsage).not.toHaveBeenCalled();
  });

  it('should track usage for authenticated requests', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';
    const testTenantId = 'tenant-123';

    const mockUsageRecord: UsageRecord = {
      id: 'usage-1',
      userId: testUserId,
      requestCount: 0,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 3600000),
    };

    vi.mocked(mockUsageRepository.findOrCreateUsage).mockResolvedValue(mockUsageRecord);
    vi.mocked(mockUsageRepository.incrementUsage).mockResolvedValue(undefined);

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      c.set('tenantId', testTenantId);
      await next();
    });
    app.use('/api/*', UsageMonitor({
      limit: 100,
      usageRepository: mockUsageRepository,
    }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');

    expect(res.status).toBe(200);
    expect(mockUsageRepository.findOrCreateUsage).toHaveBeenCalledWith(
      testUserId,
      expect.any(Date),
      expect.any(Date),
      expect.objectContaining({
        userId: testUserId,
        tenantId: testTenantId,
      })
    );
    expect(mockUsageRepository.incrementUsage).toHaveBeenCalledWith('usage-1', expect.any(Object));
  });

  it('should block requests when usage exceeds 80% threshold', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    const mockUsageRecord: UsageRecord = {
      id: 'usage-1',
      userId: testUserId,
      requestCount: 80, // At 80% of 100
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 3600000),
    };

    vi.mocked(mockUsageRepository.findOrCreateUsage).mockResolvedValue(mockUsageRecord);

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', UsageMonitor({
      limit: 100,
      usageRepository: mockUsageRepository,
    }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Rate limit exceeded');
    expect(body.usage).toBe(80);
    expect(body.limit).toBe(100);
    // incrementUsage should not be called because the request is blocked before next()
    expect(mockUsageRepository.incrementUsage).not.toHaveBeenCalled();
  });

  it('should allow requests below 80% threshold', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    const mockUsageRecord: UsageRecord = {
      id: 'usage-1',
      userId: testUserId,
      requestCount: 79, // Below 80% of 100
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 3600000),
    };

    vi.mocked(mockUsageRepository.findOrCreateUsage).mockResolvedValue(mockUsageRecord);
    vi.mocked(mockUsageRepository.incrementUsage).mockResolvedValue(undefined);

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', UsageMonitor({
      limit: 100,
      usageRepository: mockUsageRepository,
    }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');

    expect(res.status).toBe(200);
    expect(mockUsageRepository.incrementUsage).toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    vi.mocked(mockUsageRepository.findOrCreateUsage).mockRejectedValue(new Error('Database error'));

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', UsageMonitor({
      limit: 100,
      usageRepository: mockUsageRepository,
    }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/test');

    // Should allow request to proceed despite error
    expect(res.status).toBe(200);
  });

  it('should use custom period when specified', async () => {
    const app = new Hono<{ Variables: Variables }>();
    const testUserId = 'user-123';

    const mockUsageRecord: UsageRecord = {
      id: 'usage-1',
      userId: testUserId,
      requestCount: 0,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 3600000),
    };

    vi.mocked(mockUsageRepository.findOrCreateUsage).mockResolvedValue(mockUsageRecord);
    vi.mocked(mockUsageRepository.incrementUsage).mockResolvedValue(undefined);

    app.use('/api/*', async (c, next) => {
      c.set('userId', testUserId);
      await next();
    });
    app.use('/api/*', UsageMonitor({
      limit: 100,
      periodMs: 1800000, // 30 minutes
      usageRepository: mockUsageRepository,
    }));
    app.get('/api/test', (c) => c.json({ ok: true }));

    await app.request('/api/test');

    expect(mockUsageRepository.findOrCreateUsage).toHaveBeenCalledWith(
      testUserId,
      expect.any(Date),
      expect.any(Date),
      expect.any(Object)
    );
  });
});
