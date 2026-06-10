/**
 * WorkerDatabase implementation for Cloudflare Workers
 * 
 * Uses Hyperdrive for connection pooling and postgres.js for queries.
 * Designed for Cloudflare Workers environment limitations.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database, DatabaseEnvironment, TransactionContext, QueryResult } from './database.interface.js';
import { logQuery, extractOperation, extractTableName, type QueryLogContext } from './observability/query-logger.js';
import { recordQueryDuration, incrementQueryCount, incrementErrorCount, incrementTransactionCount, setPoolUtilization } from './observability/metrics.js';
import { detectSlowQuery } from './observability/slow-query-detector.js';
import { retryWithBackoff } from './error-handling/retry.js';
import { getDatabaseErrorCode } from './error-handling/error-codes.js';
import { validateQueryWithParams } from './security/query-validator.js';
import { checkRateLimit } from './security/rate-limiter.js';

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

    // Observability: set pool utilization metrics
    // Workers use Hyperdrive with max: 1, so we track that
    setPoolUtilization(0, 1);
  }

  /**
   * Execute a SQL query with optional parameters
   * Note: This is a simplified wrapper. For production use, prefer Drizzle ORM via getDrizzleDb()
   */
  async query<T = unknown>(sql: string, params?: unknown[], context?: QueryLogContext): Promise<QueryResult<T>> {
    if (this.isClosed) {
      throw new Error('Database connection is closed');
    }

    // Security: validate query and parameters before execution
    const validation = validateQueryWithParams(sql, params);
    if (!validation.valid) {
      throw new Error(`Query validation failed: ${validation.error}`);
    }

    // Security: rate limit per tenant
    if (context?.tenantId) {
      const rateLimitResult = checkRateLimit(context.tenantId);
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded for tenant ${context.tenantId}. Reset at ${rateLimitResult.resetTime.toISOString()}`);
      }
    }

    const operation = extractOperation(sql);
    const table = extractTableName(sql);
    const queryContext: QueryLogContext = {
      ...context,
      ...(operation && { operation }),
      ...(table && { table }),
    };

    return retryWithBackoff(async () => {
      const startTime = Date.now();

      try {
        const result = await this.pool.unsafe(sql, params as never[]);
        const duration = Date.now() - startTime;

        // Observability: log query, record metrics, detect slow queries
        logQuery(sql, duration, queryContext);
        recordQueryDuration(duration, operation);
        incrementQueryCount(operation);
        detectSlowQuery(sql, duration, undefined, queryContext);

        return result as unknown as QueryResult<T>;
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorCode = getDatabaseErrorCode(error);

        // Observability: log error, increment error counter
        logQuery(sql, duration, queryContext, error instanceof Error ? error : new Error(String(error)));
        incrementErrorCount(error instanceof Error ? error.constructor.name : 'unknown');

        throw new Error(
          `Database query failed [${errorCode}]: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
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
        const result = await client.unsafe(sql, params as never[]);
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
      incrementTransactionCount(true);
      return result;
    } catch (error) {
      await client`ROLLBACK`;
      incrementTransactionCount(false);
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
