/**
 * Environment-aware database client factory
 * 
 * Creates the appropriate Database implementation based on environment:
 * - WorkerDatabase: If HYPERDRIVE binding is present (Cloudflare Workers)
 * - PostgresDatabase: If DATABASE_URL is present (Node.js)
 * 
 * This enables the same code to run in both environments without changes.
 */

import { PostgresDatabase } from './postgres-database.js';
import { WorkerDatabase } from './worker-database.js';
import type { Database, DatabaseEnvironment, TransactionContext, QueryResult } from './database.interface.js';
import { CircuitBreaker, CircuitBreakerOptions } from './error-handling/circuit-breaker.js';

/**
 * Type guard to check if environment has Hyperdrive binding
 */
function isWorkersEnvironment(env: DatabaseEnvironment): env is DatabaseEnvironment & { HYPERDRIVE: Required<DatabaseEnvironment['HYPERDRIVE']> } {
  return !!env.HYPERDRIVE && !!env.HYPERDRIVE.connectionString;
}

/**
 * Type guard to check if environment has DATABASE_URL
 */
function isNodeEnvironment(env: DatabaseEnvironment): env is DatabaseEnvironment & { DATABASE_URL: string } {
  return !!env.DATABASE_URL;
}

/**
 * Circuit breaker wrapper for Database instances
 * 
 * Wraps database query operations with circuit breaker protection
 * to prevent cascading failures when the database is unavailable.
 */
class CircuitBreakerDatabase implements Database {
  private db: Database;
  private circuitBreaker: CircuitBreaker;

  constructor(db: Database, options?: CircuitBreakerOptions) {
    this.db = db;
    this.circuitBreaker = new CircuitBreaker(options);
  }

  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    return this.circuitBreaker.execute(() => this.db.query<T>(sql, params));
  }

  async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(() => this.db.transaction(fn));
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  getDrizzleDb(): ReturnType<typeof import('drizzle-orm/postgres-js').drizzle> {
    return this.db.getDrizzleDb();
  }

  async setTenantContext(tenantId: string, userId: string): Promise<void> {
    return this.circuitBreaker.execute(() => this.db.setTenantContext(tenantId, userId));
  }

  /**
   * Get the circuit breaker state for monitoring
   */
  getCircuitBreakerState() {
    return this.circuitBreaker.getStats();
  }
}

/**
 * Create a database client based on environment
 * 
 * @param env - Environment configuration
 * @param circuitBreakerOptions - Optional circuit breaker configuration
 * @param disableCircuitBreaker - If true, returns unwrapped database instance (for testing)
 * @returns Database instance wrapped with circuit breaker (unless disabled)
 * @throws Error if no valid environment configuration is found
 * 
 * @example
 * ```ts
 * // In Cloudflare Workers
 * const db = createDbClient({ HYPERDRIVE: { connectionString: '...' } });
 * 
 * // In Node.js
 * const db = createDbClient({ DATABASE_URL: 'postgres://...' });
 * 
 * // With custom circuit breaker options
 * const db = createDbClient(
 *   { DATABASE_URL: 'postgres://...' },
 *   { failureThreshold: 10, resetTimeoutMs: 120000 }
 * );
 * 
 * // Without circuit breaker (for testing)
 * const db = createDbClient({ DATABASE_URL: 'postgres://...' }, undefined, true);
 * ```
 */
export function createDbClient(
  env: DatabaseEnvironment,
  circuitBreakerOptions?: CircuitBreakerOptions,
  disableCircuitBreaker = false
): Database {
  let db: Database;

  if (isWorkersEnvironment(env)) {
    db = new WorkerDatabase(env.HYPERDRIVE);
  } else if (isNodeEnvironment(env)) {
    db = new PostgresDatabase(env.DATABASE_URL, env.pool);
  } else {
    throw new Error(
      'Invalid database environment configuration. ' +
      'Either DATABASE_URL (Node.js) or HYPERDRIVE.binding (Workers) must be provided.'
    );
  }

  // Wrap with circuit breaker for resilience (unless disabled for testing)
  if (disableCircuitBreaker) {
    return db;
  }
  return new CircuitBreakerDatabase(db, circuitBreakerOptions);
}
