/**
 * Transaction scope for database transactions
 * 
 * This type extends the Drizzle database client to provide transaction-specific
 * context that can be passed to repository methods for cross-repository operations.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { PgTransaction } from 'drizzle-orm/pg-core';

/**
 * Transaction isolation levels
 */
export type IsolationLevel = 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

/**
 * Transaction access mode
 */
export type AccessMode = 'READ WRITE' | 'READ ONLY';

/**
 * Transaction configuration options
 */
export interface TransactionConfig {
  /**
   * Transaction isolation level
   * @default 'READ COMMITTED'
   */
  isolationLevel?: IsolationLevel;

  /**
   * Transaction access mode
   * @default 'READ WRITE'
   */
  accessMode?: AccessMode;
}

/**
 * Transaction scope type
 * 
 * This is a union type that accepts both the regular database client and the transaction client.
 * It can be passed to repository methods to execute operations within the same transaction.
 */
export type TransactionScope = PostgresJsDatabase | PgTransaction<any, any>;
