import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

/**
 * Setup database migrations for integration tests
 * This module provides functions to apply and rollback migrations
 * before and after test suites
 */

/**
 * Apply database migrations
 * @param dbUrl - Database connection string
 */
export async function setupMigrations(dbUrl: string): Promise<void> {
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required for migration setup');
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    // Apply migrations from the drizzle directory
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database migrations applied successfully');
  } finally {
    await client.end();
  }
}

/**
 * Rollback database migrations (for cleanup)
 * Note: Drizzle doesn't support automatic rollback, so we use
 * a different approach: clean all tables instead
 * @param dbUrl - Database connection string
 */
export async function teardownMigrations(dbUrl: string): Promise<void> {
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required for migration teardown');
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    // Clean all tables (alternative to rollback)
    // This is a simple approach - in production you might want
    // to use drizzle-kit's rollback command or a more sophisticated
    // migration management system
    const { calendarEvents } = await import('../schema/calendar/index.js');
    const { driveFiles, driveFolders } = await import('../schema/drive/index.js');
    const { tasks } = await import('../schema/tasks/index.js');
    const { users } = await import('../schema/users.js');
    const { usage } = await import('../schema/usage.js');

    await db.delete(calendarEvents);
    await db.delete(driveFiles);
    await db.delete(driveFolders);
    await db.delete(tasks);
    await db.delete(users);
    await db.delete(usage);

    console.log('Database tables cleaned successfully');
  } finally {
    await client.end();
  }
}

/**
 * Create a test database connection
 * @param dbUrl - Database connection string
 * @returns Database instance and client
 */
export async function createTestDb(dbUrl: string) {
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required for test database');
  }

  const client = postgres(dbUrl);
  const db = drizzle(client);

  return { db, client };
}

/**
 * Close test database connection
 * @param client - Postgres client
 */
export async function closeTestDb(client: postgres.Sql): Promise<void> {
  await client.end();
}
