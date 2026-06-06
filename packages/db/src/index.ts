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

// Connection exports
export { getDb, getDbOrNull, closeDb } from './connection.js';

// Schema exports
export * from './schema/calendar.js';
export * from './schema/tasks.js';
export * from './schema/drive.js';
export * from './schema/users.js';
export * from './schema/usage.js';

// Repository exports
export * from './repositories/index.js';
