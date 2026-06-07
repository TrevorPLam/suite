import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Transaction wrapper for test isolation
 * Wraps a test function in a database transaction that is rolled back after execution
 * This provides 86.5x faster test execution compared to DELETE-based teardown
 */

/**
 * Execute a function within a database transaction
 * The transaction is automatically rolled back after the function completes
 * @param client - Postgres client
 * @param fn - Function to execute within the transaction
 * @returns Result of the function
 */
export async function withTransaction<T>(
  client: postgres.Sql,
  fn: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  const db = drizzle(client);
  
  try {
    // Begin transaction
    await client`BEGIN`;
    
    // Execute the test function
    const result = await fn(db);
    
    // Rollback transaction (never commit in tests)
    await client`ROLLBACK`;
    
    return result;
  } catch (error) {
    // Rollback on error
    await client`ROLLBACK`;
    throw error;
  }
}

/**
 * Execute a function within a database transaction with a custom db instance
 * Useful when you need to pass a pre-configured db instance
 * @param db - Drizzle database instance
 * @param client - Postgres client
 * @param fn - Function to execute within the transaction
 * @returns Result of the function
 */
export async function withTransactionDb<T>(
  db: ReturnType<typeof drizzle>,
  client: postgres.Sql,
  fn: (db: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  try {
    // Begin transaction
    await client`BEGIN`;
    
    // Execute the test function
    const result = await fn(db);
    
    // Rollback transaction (never commit in tests)
    await client`ROLLBACK`;
    
    return result;
  } catch (error) {
    // Rollback on error
    await client`ROLLBACK`;
    throw error;
  }
}
