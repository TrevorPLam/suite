---
name: usage-monitor-middleware
description: Guides implementation of UsageMonitor middleware for tracking free tier limits and blocking requests when limits approach 80%
---

## Usage Monitor Middleware Guide

This skill guides implementation of usage monitoring middleware to track free tier limits and block requests when limits approach 80%.

## Why Usage Monitoring?

Without rate limiting and usage monitoring, a single client can overwhelm your API. Whether it's a bug in a client library, a denial-of-service attack, or a misconfigured integration, uncontrolled traffic can bring down your entire service.

## Architecture

```
Incoming Request
    ↓
Usage Monitor Middleware
    ↓
Check Usage Limits
    ↓
Under Limit? → API Server
    ↓ Yes
Over Limit? → 429 Too Many Requests
    ↓ No
```

## Free Tier Limits

Define free tier limits per user/organization:

```typescript
// packages/usage/src/limits.ts
export interface UsageLimits {
  requestsPerMinute: number;
  requestsPerDay: number;
  storageGB: number;
  apiCallsPerMonth: number;
}

export const FREE_TIER_LIMITS: UsageLimits = {
  requestsPerMinute: 100,
  requestsPerDay: 10000,
  storageGB: 10,
  apiCallsPerMonth: 100000,
};

export const PRO_TIER_LIMITS: UsageLimits = {
  requestsPerMinute: 1000,
  requestsPerDay: 100000,
  storageGB: 100,
  apiCallsPerMonth: 1000000,
};
```

## Database Schema

```typescript
// packages/db/src/schema/usage.ts
import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const usageMetrics = pgTable('usage_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  organizationId: uuid('organization_id').notNull(),
  metricType: text('metric_type').notNull(), // 'requests_per_minute', 'requests_per_day', etc.
  value: integer('value').notNull().default(0),
  windowStart: timestamp('window_start').notNull(),
  windowEnd: timestamp('window_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Middleware Implementation

### Fixed Window Rate Limiter

```typescript
// packages/usage/src/middleware/rate-limiter.ts
import { Hono } from 'hono';

export class RateLimiter {
  private storage: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private limits: { requestsPerMinute: number; requestsPerDay: number }) {}

  async check(userId: string, organizationId: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `${organizationId}:${userId}`;
    const now = Date.now();
    const minuteWindow = 60 * 1000;
    const dayWindow = 24 * 60 * 60 * 1000;

    // Check per-minute limit
    const minuteKey = `${key}:minute`;
    const minuteData = this.storage.get(minuteKey);

    if (!minuteData || now >= minuteData.resetTime) {
      this.storage.set(minuteKey, { count: 1, resetTime: now + minuteWindow });
    } else {
      minuteData.count++;
      if (minuteData.count > this.limits.requestsPerMinute) {
        return { allowed: false, remaining: 0 };
      }
    }

    // Check per-day limit
    const dayKey = `${key}:day`;
    const dayData = this.storage.get(dayKey);

    if (!dayData || now >= dayData.resetTime) {
      this.storage.set(dayKey, { count: 1, resetTime: now + dayWindow });
    } else {
      dayData.count++;
      if (dayData.count > this.limits.requestsPerDay) {
        return { allowed: false, remaining: 0 };
      }
    }

    const remaining = Math.min(
      this.limits.requestsPerMinute - minuteData.count,
      this.limits.requestsPerDay - dayData.count
    );

    return { allowed: true, remaining };
  }
}
```

### Hono Middleware

```typescript
// packages/usage/src/middleware/usage-monitor.ts
import { Hono } from 'hono';
import { RateLimiter } from './rate-limiter';
import { FREE_TIER_LIMITS } from '../limits';

export function usageMonitorMiddleware(tier: 'free' | 'pro' = 'free') {
  const limits = tier === 'free' ? FREE_TIER_LIMITS : PRO_TIER_LIMITS;
  const rateLimiter = new RateLimiter(limits);

  return async (c: any, next: any) => {
    const userId = c.get('userId');
    const organizationId = c.get('organizationId');

    if (!userId || !organizationId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { allowed, remaining } = await rateLimiter.check(userId, organizationId);

    // Add rate limit headers
    c.header('X-RateLimit-Limit', limits.requestsPerMinute.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + 60).toString());

    if (!allowed) {
      return c.json(
        {
          error: 'Rate limit exceeded',
          message: 'You have exceeded your rate limit. Please upgrade to Pro for higher limits.',
        },
        429
      );
    }

    // Block at 80% of limit
    const usagePercent = (limits.requestsPerMinute - remaining) / limits.requestsPerMinute;
    if (usagePercent >= 0.8) {
      return c.json(
        {
          error: 'Approaching rate limit',
          message: 'You are approaching your rate limit. Consider upgrading to Pro.',
          usagePercent: Math.floor(usagePercent * 100),
        },
        429
      );
    }

    await next();
  };
}
```

## Redis-Based Rate Limiter (Production)

For production with multiple instances, use Redis:

```typescript
// packages/usage/src/middleware/redis-rate-limiter.ts
import { Redis } from 'ioredis';

export class RedisRateLimiter {
  constructor(private redis: Redis, private limits: UsageLimits) {}

  async check(userId: string, organizationId: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `${organizationId}:${userId}`;
    const now = Date.now();
    const minuteWindow = 60;
    const dayWindow = 24 * 60 * 60;

    // Check per-minute limit using Redis INCR
    const minuteKey = `rate:${key}:minute`;
    const minuteCount = await this.redis.incr(minuteKey);

    if (minuteCount === 1) {
      await this.redis.expire(minuteKey, minuteWindow);
    }

    if (minuteCount > this.limits.requestsPerMinute) {
      return { allowed: false, remaining: 0 };
    }

    // Check per-day limit
    const dayKey = `rate:${key}:day`;
    const dayCount = await this.redis.incr(dayKey);

    if (dayCount === 1) {
      await this.redis.expire(dayKey, dayWindow);
    }

    if (dayCount > this.limits.requestsPerDay) {
      return { allowed: false, remaining: 0 };
    }

    const remaining = Math.min(
      this.limits.requestsPerMinute - minuteCount,
      this.limits.requestsPerDay - dayCount
    );

    return { allowed: true, remaining };
  }
}
```

## Storage Usage Monitoring

```typescript
// packages/usage/src/middleware/storage-monitor.ts
export class StorageMonitor {
  async checkStorageUsage(organizationId: string): Promise<{ allowed: boolean; usedGB: number; limitGB: number }> {
    // Query total storage used by organization
    const result = await db
      .select({ totalSize: sql`SUM(size)` })
      .from(files)
      .where(eq(files.organizationId, organizationId));

    const usedBytes = result[0]?.totalSize || 0;
    const usedGB = usedBytes / (1024 * 1024 * 1024);
    const limitGB = FREE_TIER_LIMITS.storageGB;

    const usagePercent = usedGB / limitGB;

    // Block at 80% of storage limit
    if (usagePercent >= 0.8) {
      return { allowed: false, usedGB, limitGB };
    }

    return { allowed: true, usedGB, limitGB };
  }
}
```

## Applying Middleware

```typescript
// apps/calendar/api/index.ts
import { Hono } from 'hono';
import { usageMonitorMiddleware } from '@suite/usage/middleware/usage-monitor';
import { storageMonitor } from '@suite/usage/middleware/storage-monitor';

const app = new Hono();

// Apply usage monitor to all API routes
app.use('/api/*', usageMonitorMiddleware('free'));

// Apply storage monitor to file upload routes
app.use('/api/files/*', async (c, next) => {
  const organizationId = c.get('organizationId');
  const { allowed, usedGB, limitGB } = await storageMonitor.checkStorageUsage(organizationId);

  if (!allowed) {
    return c.json(
      {
        error: 'Storage limit exceeded',
        message: `You have used ${usedGB.toFixed(2)}GB of ${limitGB}GB. Please upgrade to Pro for more storage.`,
      },
      429
    );
  }

  await next();
});

export default app;
```

## Usage Analytics

Track usage for billing and analytics:

```typescript
// packages/usage/src/analytics.ts
export async function recordUsage(organizationId: string, metricType: string, value: number) {
  await db.insert(usageMetrics).values({
    id: crypto.randomUUID(),
    organizationId,
    metricType,
    value,
    windowStart: new Date(),
    windowEnd: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

// Usage in API routes
app.post('/api/files', async (c) => {
  const organizationId = c.get('organizationId');
  const fileSize = c.req.header('Content-Length');

  // Record storage usage
  await recordUsage(organizationId, 'storage_gb', fileSize / (1024 * 1024 * 1024));

  // ... rest of route
});
```

## Rate Limiting Algorithms

### Fixed Window

Simple but allows bursts at window boundaries:

```typescript
// Window resets at fixed intervals (e.g., every minute)
const currentWindow = Math.floor(Date.now() / 60000);
const key = `rate:${userId}:${currentWindow}`;
```

### Sliding Window Log

More accurate but requires more storage:

```typescript
// Track timestamps of each request
const timestamps = await redis.lrange(`rate:${userId}`, 0, -1);
const now = Date.now();
const oneMinuteAgo = now - 60000;

// Remove old timestamps
const validTimestamps = timestamps.filter((ts) => ts > oneMinuteAgo);

if (validTimestamps.length >= limit) {
  return { allowed: false };
}

// Add current request
await redis.rpush(`rate:${userId}`, now);
```

### Token Bucket

Allows bursts but smooths over time:

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private refillRate: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<boolean> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }
}
```

## Error Responses

Standard error response format:

```typescript
{
  "error": "Rate limit exceeded",
  "message": "You have exceeded your rate limit.",
  "rateLimit": {
    "limit": 100,
    "remaining": 0,
    "reset": 1640995200
  }
}
```

## Monitoring and Alerting

Monitor rate limit hits to detect abuse:

```typescript
// packages/usage/src/monitoring.ts
export async function checkRateLimitAlerts() {
  const recentBlocks = await db
    .select()
    .from(usageMetrics)
    .where(
      and(
        eq(usageMetrics.metricType, 'rate_limit_block'),
        gte(usageMetrics.createdAt, new Date(Date.now() - 60 * 60 * 1000))
      )
    );

  if (recentBlocks.length > 100) {
    // Alert: Possible abuse or misconfiguration
    await sendAlert('High rate limit block rate detected');
  }
}
```

## Testing

```typescript
// packages/usage/src/__tests__/rate-limiter.test.ts
import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../middleware/rate-limiter';

describe('RateLimiter', () => {
  it('should allow requests under limit', async () => {
    const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerDay: 1000 });
    const result = await limiter.check('user-1', 'org-1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it('should block requests over limit', async () => {
    const limiter = new RateLimiter({ requestsPerMinute: 2, requestsPerDay: 1000 });

    await limiter.check('user-1', 'org-1');
    await limiter.check('user-1', 'org-1');
    const result = await limiter.check('user-1', 'org-1');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should block at 80% of limit', async () => {
    const limiter = new RateLimiter({ requestsPerMinute: 10, requestsPerDay: 1000 });

    // Make 8 requests (80% of 10)
    for (let i = 0; i < 8; i++) {
      await limiter.check('user-1', 'org-1');
    }

    const result = await limiter.check('user-1', 'org-1');
    expect(result.allowed).toBe(false);
  });
});
```

## Checklist

- [ ] Usage limits defined for free and pro tiers
- [ ] Database schema for usage metrics
- [ ] Rate limiter middleware implemented
- [ ] 80% threshold blocking implemented
- [ ] Rate limit headers added to responses
- [ ] Storage usage monitoring implemented
- [ ] Redis-based limiter for production
- [ ] Usage analytics tracking
- [ ] Monitoring and alerting configured
- [ ] Tests cover rate limiting scenarios

## Related Skills

- **thin-api-route-implementation**: Apply usage monitor to API routes
- **spec-first-development**: Specify usage limits in feature specs
- **hono-api-development**: Integrate middleware with Hono
