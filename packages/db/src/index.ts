/**
 * Persistence adapter port interfaces
 * These are minimal contracts for domain packages to depend on
 * without knowing implementation details (repository pattern)
 */

// Import RepositoryContext from shared-kernel (canonical definition)
import type { RepositoryContext } from '@suite/shared-kernel';

// Re-export for consumers
export type { RepositoryContext };

// DB-specific validation and creation utilities
export { validateRepositoryContext, createRepositoryContext } from './repository-context.js';

export interface Repository<T, ID = string> {
  findById(id: ID, context: RepositoryContext): Promise<T | null>;
  findAll(context: RepositoryContext): Promise<T[]>;
  create(entity: Omit<T, 'id'>, context: RepositoryContext): Promise<T>;
  update(id: ID, entity: Partial<T>, context: RepositoryContext): Promise<T | null>;
  delete(id: ID, context: RepositoryContext): Promise<boolean>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface QueryRepository<T, ID = string> extends Repository<T, ID> {
  findWhere(criteria: Partial<T>, context: RepositoryContext, options?: QueryOptions): Promise<T[]>;
  count(criteria: Partial<T>, context: RepositoryContext): Promise<number>;
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

// Schema exports
export * from './schema/index.js';

// Repository exports
export * from './repositories/index.js';
