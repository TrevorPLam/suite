import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map domain to unique advisory lock ID
export const lockIds: Record<string, number> = {
  shared: 1000,
  calendar: 1001,
  drive: 1002,
  tasks: 1003,
  // Add more domains as needed
};

export function getLockId(domain: string): number {
  const lockId = lockIds[domain];
  if (!lockId) {
    throw new Error(`Unknown domain: ${domain}`);
  }
  return lockId;
}

export function getMigrationsFolder(domain: string): string {
  // Shared migrations are in the root drizzle folder
  if (domain === 'shared') {
    return path.join(__dirname, '..', 'drizzle');
  }
  // Domain-specific migrations are in subfolders
  return path.join(__dirname, '..', 'drizzle', domain);
}

export async function runMigrations(domain: string, databaseUrl: string): Promise<void> {
  const lockId = getLockId(domain);
  const migrationsFolder = getMigrationsFolder(domain);

  // Create postgres client for migrations
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);

  // Acquire advisory lock (blocks if another migration is in progress)
  await client`SELECT pg_advisory_lock(${lockId})`;

  try {
    await migrate(db, {
      migrationsFolder: migrationsFolder,
      migrationsTable: `__drizzle_migrations_${domain}`,
    });
    console.log(`✅ Migrations applied for domain: ${domain}`);
  } catch (error) {
    console.error(`❌ Migration failed for domain: ${domain}`, error);
    throw error;
  } finally {
    // Always release the lock, even on error
    await client`SELECT pg_advisory_unlock(${lockId})`;
    await client.end();
  }
}

// Main execution
async function main(): Promise<void> {
  const domain = process.env.APP_DOMAIN;
  if (!domain) {
    throw new Error('APP_DOMAIN environment variable is required');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  await runMigrations(domain, databaseUrl);
}

main().catch((error) => {
  console.error('Migration runner failed:', error);
  process.exit(1);
});
