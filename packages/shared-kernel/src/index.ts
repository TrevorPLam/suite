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
