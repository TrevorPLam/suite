import type { MiddlewareHandler } from 'hono';

export interface UsageRecord {
  id: string;
  userId: string;
  requestCount: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface UsageRepository {
  findOrCreateUsage(userId: string, periodStart: Date, periodEnd: Date): Promise<UsageRecord>;
  incrementUsage(id: string): Promise<void>;
}

export interface UsageMonitorOptions {
  limit: number;
  periodMs?: number; // Default to 1 hour (3600000ms)
  usageRepository: UsageRepository;
}

/**
 * UsageMonitor middleware tracks API usage per user and blocks requests
 * when usage reaches 80% of the configured limit.
 *
 * This implements AGENTS.md rule 10: Free tier limits must be monitored.
 * Each API must implement UsageMonitor middleware that blocks requests
 * when limits approach 80%.
 *
 * Uses dependency injection for the usage repository to avoid circular
 * dependencies between shared-kernel and db packages.
 */
export function UsageMonitor(options: UsageMonitorOptions): MiddlewareHandler {
  const { limit, periodMs = 3600000, usageRepository } = options; // Default 1 hour period
  const blockThreshold = Math.floor(limit * 0.8); // Block at 80%

  return async (c, next) => {
    const userId = c.get('userId') as string | undefined;

    // Skip usage monitoring for unauthenticated requests or health checks
    if (!userId || c.req.path === '/api/health') {
      await next();
      return;
    }

    const now = new Date();

    try {
      // Get or create usage record for current period
      const newPeriodStart = new Date(now.getTime() - (now.getTime() % periodMs));
      const newPeriodEnd = new Date(newPeriodStart.getTime() + periodMs);

      const currentUsage = await usageRepository.findOrCreateUsage(userId, newPeriodStart, newPeriodEnd);

      // Check if user has exceeded 80% threshold
      if (currentUsage.requestCount >= blockThreshold) {
        return c.json(
          {
            error: 'Rate limit exceeded',
            message: `You have exceeded ${blockThreshold} requests in the current period. Please wait before making more requests.`,
            limit,
            usage: currentUsage.requestCount,
            periodEnd: currentUsage.periodEnd,
          },
          429
        );
      }

      // Allow request to proceed
      await next();

      // Increment usage count after successful request
      await usageRepository.incrementUsage(currentUsage.id);
    } catch (error) {
      // Log error but don't block requests on database failures
      console.error('UsageMonitor error:', error);
      await next();
    }
  };
}
