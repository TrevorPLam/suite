---
trigger: glob
globs: apps/*/api/**/*.ts
---

# Usage Monitoring and Rate Limiting

Each API must implement `UsageMonitor` middleware that blocks requests when free tier limits approach 80%.

## Required Middleware

Every API route must include usage monitoring:

```typescript
import { usageMonitor } from '@suite/monitoring';

app.use(usageMonitor({
  maxRequests: 1000,      // Free tier limit
  threshold: 0.8,         // Block at 80%
  windowMs: 60 * 1000,    // 1 minute window
}));
```

## Rate Limiting Strategy

Based on 2026 best practices, use the sliding window algorithm for accurate rate limiting:

```typescript
// Sliding window rate limiter
class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Remove requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < windowMs
    );
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
}
```

## Free Tier Enforcement

Free tier limits must be enforced at 80% threshold:

```typescript
export function usageMonitor(options: UsageOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers.get('x-user-id');
    const usage = await getUserUsage(userId);
    
    if (usage / options.maxRequests >= options.threshold) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: options.maxRequests,
        remaining: options.maxRequests - usage,
        resetAt: getResetTime()
      });
    }
    
    await incrementUsage(userId);
    next();
  };
}
```

## Response Headers

Include rate limit headers in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 750
X-RateLimit-Reset: 1717234567
X-RateLimit-Used: 250
```

## Monitoring Metrics

Track the following metrics:

- Request count per user
- 429 response rate (indicates limits may need adjustment)
- Peak usage times
- User behavior patterns

## Distributed Rate Limiting

For multi-instance deployments, use Redis for shared state:

```typescript
import Redis from 'ioredis';

const redis = new Redis();

async function isAllowedWithRedis(
  userId: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowMs / 1000);
  }
  
  return current <= maxRequests;
}
```

## Per-Endpoint Limits

Different endpoints may have different limits:

```typescript
const limits = {
  '/api/search': { maxRequests: 100, windowMs: 60000 },  // 100/min
  '/api/upload': { maxRequests: 10, windowMs: 60000 },   // 10/min
  '/api/read': { maxRequests: 1000, windowMs: 60000 },   // 1000/min
};
```

## Enforcement

- Code reviews check for missing usage monitoring middleware
- Load testing verifies rate limiting works correctly
- Monitoring alerts on high 429 rates
- Regular audits of free tier usage patterns
