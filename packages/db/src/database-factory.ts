/**
 * Environment-aware database client factory
 * 
 * Creates the appropriate Database implementation based on environment:
 * - WorkerDatabase: If HYPERDRIVE binding is present (Cloudflare Workers)
 * - PostgresDatabase: If DATABASE_URL is present (Node.js)
 * 
 * This enables the same code to run in both environments without changes.
 */

import { PostgresDatabase } from './postgres-database.js';
import { WorkerDatabase } from './worker-database.js';
import type { Database, DatabaseEnvironment } from './database.interface.js';

/**
 * Type guard to check if environment has Hyperdrive binding
 */
function isWorkersEnvironment(env: DatabaseEnvironment): env is DatabaseEnvironment & { HYPERDRIVE: Required<DatabaseEnvironment['HYPERDRIVE']> } {
  return !!env.HYPERDRIVE && !!env.HYPERDRIVE.connectionString;
}

/**
 * Type guard to check if environment has DATABASE_URL
 */
function isNodeEnvironment(env: DatabaseEnvironment): env is DatabaseEnvironment & { DATABASE_URL: string } {
  return !!env.DATABASE_URL;
}

/**
 * Create a database client based on environment
 * 
 * @param env - Environment configuration
 * @returns Database instance
 * @throws Error if no valid environment configuration is found
 * 
 * @example
 * ```ts
 * // In Cloudflare Workers
 * const db = createDbClient({ HYPERDRIVE: { connectionString: '...' } });
 * 
 * // In Node.js
 * const db = createDbClient({ DATABASE_URL: 'postgres://...' });
 * ```
 */
export function createDbClient(env: DatabaseEnvironment): Database {
  if (isWorkersEnvironment(env)) {
    return new WorkerDatabase(env.HYPERDRIVE);
  }

  if (isNodeEnvironment(env)) {
    return new PostgresDatabase(env.DATABASE_URL, env.pool);
  }

  throw new Error(
    'Invalid database environment configuration. ' +
    'Either DATABASE_URL (Node.js) or HYPERDRIVE.binding (Workers) must be provided.'
  );
}
