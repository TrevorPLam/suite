/**
 * PostgresDatabase implementation for Node.js environments
 * 
 * Uses pg.Pool for connection pooling and drizzle-orm for query building.
 * Provides graceful shutdown handling and transaction support.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database, DatabaseEnvironment, TransactionContext, QueryResult } from './database.interface.js';

/**
 * PostgresDatabase implementation using pg.Pool
 */
export class PostgresDatabase implements Database {
  private pool: postgres.Sql;
  private db: ReturnType<typeof drizzle>;
  private isClosed = false;

  constructor(connectionString: string, poolConfig?: DatabaseEnvironment['pool']) {
    const config = {
      max: poolConfig?.max ?? 20,
      idle_timeout: poolConfig?.idle ?? 10,
      connect_timeout: poolConfig?.connectionTimeoutMillis ?? 10000,
    };

    this.pool = postgres(connectionString, config);
    this.db = drizzle(this.pool);

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
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
   */
  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    
    // Remove shutdown handlers
    this.removeShutdownHandlers();

    // Close the pool
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
   * Setup graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      await this.close();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  /**
   * Remove graceful shutdown handlers
   */
  private removeShutdownHandlers(): void {
    process.removeListener('SIGTERM', this.shutdownHandler);
    process.removeListener('SIGINT', this.shutdownHandler);
  }

  private shutdownHandler = async () => {
    await this.close();
  };
}
