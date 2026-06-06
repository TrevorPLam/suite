import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

/**
 * @deprecated Use createDbClient factory from @suite/db instead
 * 
 * This singleton pattern is deprecated in favor of dependency injection.
 * Migrate to:
 * 
 * ```ts
 * import { createDbClient } from '@suite/db';
 * const db = createDbClient({ DATABASE_URL: process.env.DATABASE_URL });
 * ```
 */

let client: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * @deprecated Use createDbClient factory from @suite/db instead
 */
export function getDb(): ReturnType<typeof drizzle> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!client) {
    client = postgres(process.env.DATABASE_URL);
    db = drizzle(client);
  }

  return db!;
}

/**
 * @deprecated Use createDbClient factory from @suite/db instead
 */
export function getDbOrNull(): ReturnType<typeof drizzle> | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!client) {
    client = postgres(process.env.DATABASE_URL);
    db = drizzle(client);
  }

  return db!;
}

/**
 * @deprecated Use db.close() on Database instance from createDbClient instead
 */
export async function closeDb() {
  if (client) {
    await client.end();
    client = null;
    db = null;
  }
}
