export type UserId = string & { readonly __brand: unique symbol };
export type TenantId = string & { readonly __brand: unique symbol };

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export { generateUUID } from './uuid.js';
export { UsageMonitor } from './usage-monitor.js';
export type { UsageMonitorOptions, UsageRepository, UsageRecord } from './usage-monitor.js';
export { rateLimit, clearRateLimit, clearAllRateLimits } from './rate-limit.js';
export type { RateLimitOptions } from './rate-limit.js';
export { structuredLogger, logger } from './logger.js';
export type { LoggerOptions, LogLevel } from './logger.js';
