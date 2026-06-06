/**
 * Unit of Work pattern for transaction management
 * 
 * This class provides a way to execute multiple repository operations
 * within a single transaction, ensuring atomicity - either all operations
 * commit or none do.
 */

import type { Database, TransactionScope, TransactionConfig } from './index.js';

/**
 * Unit of Work for managing transactions across multiple repositories
 * 
 * Usage:
 * ```typescript
 * const unitOfWork = new UnitOfWork(database);
 * 
 * const result = await unitOfWork.transaction(async (tx) => {
 *   const event = await calendarRepo.create(eventData, tx);
 *   const task = await taskRepo.create(taskData, tx);
 *   return { event, task };
 * });
 * 
 * // If the callback completes without error, the transaction commits
 * // If an error is thrown, the transaction rolls back
 * ```
 */
export class UnitOfWork {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Execute a function within a database transaction
   * 
   * @param fn - Function to execute within the transaction. Receives a TransactionScope.
   * @param config - Optional transaction configuration (isolation level, access mode)
   * @returns The result of the transaction function
   * @throws If the transaction function throws, the transaction is rolled back and the error is re-thrown
   */
  async transaction<T>(
    fn: (tx: TransactionScope) => Promise<T>,
    config?: TransactionConfig
  ): Promise<T> {
    const drizzleDb = this.db.getDrizzleDb();
    
    // Build transaction configuration SQL
    let configSql = '';
    if (config) {
      const parts: string[] = [];
      if (config.isolationLevel) {
        parts.push(`ISOLATION LEVEL ${config.isolationLevel}`);
      }
      if (config.accessMode) {
        parts.push(config.accessMode);
      }
      if (parts.length > 0) {
        configSql = `SET TRANSACTION ${parts.join(', ')};`;
      }
    }

    // Use Drizzle's transaction API
    return drizzleDb.transaction(async (tx) => {
      // Apply transaction configuration if provided
      if (configSql) {
        await tx.execute(configSql);
      }
      
      // Execute the user's function with the transaction context
      // Type assertion is safe because Drizzle transaction has the same interface as the database client
      return fn(tx as unknown as TransactionScope);
    });
  }
}
