/**
 * WorkerDatabase implementation for Cloudflare Workers
 * 
 * Uses Hyperdrive for connection pooling and postgres.js for queries.
 * Designed for Cloudflare Workers environment limitations.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database, DatabaseEnvironment, TransactionContext, QueryResult } from './database.interface.js';

/**
 * WorkerDatabase implementation using Hyperdrive
 */
export class WorkerDatabase implements Database {
  private pool: postgres.Sql;
  private db: ReturnType<typeof drizzle>;
  private isClosed = false;

  constructor(hyperdriveBinding: DatabaseEnvironment['HYPERDRIVE']) {
    if (!hyperdriveBinding?.connectionString) {
      throw new Error('HYPERDRIVE binding with connectionString is required for WorkerDatabase');
    }

    // Use Hyperdrive connection string with Workers-safe configuration
    // max: 1 - Workers runtime manages connection pooling via Hyperdrive
    // prepare: false - Disable prepared statements for compatibility with Hyperdrive
    this.pool = postgres(hyperdriveBinding.connectionString, {
      max: 1,
      prepare: false,
    });
    this.db = drizzle(this.pool);
  }

  /**
   * Execute a SQL query with optional parameters
   * Note: This is a simplified wrapper. For production use, prefer Drizzle ORM via getDrizzleDb()
   */
  async query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
    if (this.isClosed) {
      throw new Error('Database connection is closed');
    }

    try {
      const result = await this.pool.unsafe(sql, params as any[]);
      return result as unknown as QueryResult<T>;
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute a function within a database transaction
   * Note: This is a simplified wrapper. For production use, prefer Drizzle ORM via getDrizzleDb()
   */
  async transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T> {
    if (this.isClosed) {
      throw new Error('Database connection is closed');
    }

    const client = this.pool;
    let committed = false;

    const txContext: TransactionContext = {
      query: async <U = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<U>> => {
        const result = await client.unsafe(sql, params as any[]);
        return result as unknown as QueryResult<U>;
      },
      commit: async () => {
        await client`COMMIT`;
        committed = true;
      },
      rollback: async () => {
        await client`ROLLBACK`;
      },
    };

    try {
      await client`BEGIN`;
      const result = await fn(txContext);
      if (!committed) {
        await client`COMMIT`;
      }
      return result;
    } catch (error) {
      await client`ROLLBACK`;
      throw error;
    }
  }

  /**
   * Close database connections gracefully
   * Note: In Workers, connections are managed by the runtime
   */
  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    await this.pool.end();
  }

  /**
   * Get the underlying Drizzle DB instance
   */
  getDrizzleDb(): ReturnType<typeof drizzle> {
    if (this.isClosed) {
      throw new Error('Database connection is closed');
    }
    return this.db;
  }

  /**
   * Set RLS context for the current database session
   * 
   * Uses SET LOCAL to set PostgreSQL session variables that RLS policies
   * reference for tenant and user isolation. SET LOCAL is transaction-scoped
   * and automatically resets at transaction end, preventing context leaks.
   */
  async setTenantContext(tenantId: string, userId: string): Promise<void> {
    if (this.isClosed) {
      throw new Error('Database connection is closed');
    }

    try {
      // Set tenant context for RLS policies
      await this.pool`SET LOCAL app.current_tenant_id = ${tenantId}`;
      // Set user context for RLS policies
      await this.pool`SET LOCAL app.current_user_id = ${userId}`;
    } catch (error) {
      throw new Error(`Failed to set tenant context: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
