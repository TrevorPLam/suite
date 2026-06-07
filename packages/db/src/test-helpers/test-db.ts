import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * Test database configuration
 * Provides a singleton database instance for test execution
 */

let testDbInstance: { db: ReturnType<typeof drizzle>; client: postgres.Sql } | null = null;

/**
 * Get or create a test database instance
 * Uses a singleton pattern to reuse the same connection across tests
 * @returns Database instance and client
 */
export function getTestDb() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required for test database');
  }

  // Return existing instance if available
  if (testDbInstance) {
    return testDbInstance;
  }

  // Create new instance
  const client = postgres(dbUrl);
  const db = drizzle(client);
  
  testDbInstance = { db, client };
  
  return testDbInstance;
}

/**
 * Close the test database connection
 * Should be called in afterAll hooks
 */
export async function closeTestDb() {
  if (testDbInstance) {
    await testDbInstance.client.end();
    testDbInstance = null;
  }
}

/**
 * Reset the test database instance
 * Useful for forcing a new connection in specific test scenarios
 */
export function resetTestDb() {
  testDbInstance = null;
}
