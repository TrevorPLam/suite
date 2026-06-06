/**
 * Database interface for dependency injection
 * 
 * This interface abstracts database operations to support multiple implementations:
 * - PostgresDatabase: Node.js environments with pg.Pool
 * - WorkerDatabase: Cloudflare Workers with Hyperdrive
 * 
 * Using an interface enables:
 * - Testability: Mock implementations for unit tests
 * - Flexibility: Swap implementations without changing repository code
 * - Multi-environment: Support both Node.js and Workers
 */


/**
 * Query result type for type-safe database operations
 */
export type QueryResult<T = unknown> = T[];

/**
 * Transaction context for database transactions
 */
export interface TransactionContext {
  /**
   * Execute a query within the transaction
   */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  
  /**
   * Commit the transaction
   */
  commit(): Promise<void>;
  
  /**
   * Rollback the transaction
   */
  rollback(): Promise<void>;
}

/**
 * Database interface for dependency injection
 * 
 * Implementations must provide:
 * - query(): Execute SQL queries
 * - transaction(): Execute operations in a transaction
 * - close(): Gracefully close connections
 */
export interface Database {
  /**
   * Execute a SQL query with optional parameters
   * 
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Query results
   */
  query<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;

  /**
   * Execute a function within a database transaction
   * 
   * @param fn - Function to execute within transaction
   * @returns Result of the transaction function
   */
  transaction<T>(fn: (ctx: TransactionContext) => Promise<T>): Promise<T>;

  /**
   * Close database connections gracefully
   * 
   * Should handle:
   * - Connection pool cleanup
   - Pending query completion
   * - Resource release
   */
  close(): Promise<void>;

  /**
   * Get the underlying Drizzle DB instance
   * 
   * This is provided for compatibility with existing repository code
   * that uses Drizzle ORM directly. New code should prefer query() and transaction().
   */
  getDrizzleDb(): ReturnType<typeof import('drizzle-orm/postgres-js').drizzle>;
}

/**
 * Environment configuration for database factory
 */
export interface DatabaseEnvironment {
  /**
   * PostgreSQL connection string
   * Required for Node.js environments
   */
  DATABASE_URL?: string;

  /**
   * Hyperdrive binding for Cloudflare Workers
   * Required for Workers environments
   */
  HYPERDRIVE?: {
    connectionString: string;
  };

  /**
   * Connection pool configuration (Node.js only)
   */
  pool?: {
    max?: number;
    idle?: number;
    connectionTimeoutMillis?: number;
  };
}
