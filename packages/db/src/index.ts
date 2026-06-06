/**
 * Persistence adapter port interfaces
 * These are minimal contracts for domain packages to depend on
 * without knowing implementation details (repository pattern)
 */

export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T | null>;
  delete(id: ID): Promise<boolean>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryRepository<T, ID = string> extends Repository<T, ID> {
  findWhere(criteria: Partial<T>, options?: QueryOptions): Promise<T[]>;
  count(criteria?: Partial<T>): Promise<number>;
}

export const dbPackageName = '@suite/db';

// Drizzle ORM exports
export { drizzle } from 'drizzle-orm/postgres-js';
export { pgTable, serial, varchar, timestamp, text, integer, boolean } from 'drizzle-orm/pg-core';

// Database interface and implementations
export type { Database, DatabaseEnvironment, TransactionContext, QueryResult } from './database.interface.js';
export { PostgresDatabase } from './postgres-database.js';
export { WorkerDatabase } from './worker-database.js';

// Transaction support
export type { TransactionScope, TransactionConfig, IsolationLevel, AccessMode } from './transaction-scope.js';
export { UnitOfWork } from './unit-of-work.js';

// Tenant context for multi-tenancy
export { setTenantContext, getTenantIdFromHeaders, getTenantIdFromToken, isValidTenantId } from './tenant-context.js';

// Factory function
export { createDbClient } from './database-factory.js';

// Connection exports (deprecated - use createDbClient instead)
export { getDb, getDbOrNull, closeDb } from './connection.js';

// Schema exports
export * from './schema/calendar.js';
export * from './schema/tasks.js';
export * from './schema/drive.js';
export * from './schema/users.js';
export * from './schema/usage.js';

// Repository exports
export * from './repositories/index.js';
