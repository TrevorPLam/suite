import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'fs';
import { trackSchemaVersion, calculateSchemaChecksum } from '../src/schema-registry/version-tracker.js';

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

    // Track schema version in registry after successful migration
    await trackLatestSchemaVersion(db, domain, migrationsFolder);
  } catch (error) {
    console.error(`❌ Migration failed for domain: ${domain}`, error);
    throw error;
  } finally {
    // Always release the lock, even on error
    await client`SELECT pg_advisory_unlock(${lockId})`;
    await client.end();
  }
}

/**
 * Track the latest schema version after migration
 * 
 * @param db - Drizzle database instance
 * @param domain - Domain name
 * @param migrationsFolder - Path to migrations folder
 */
async function trackLatestSchemaVersion(
  db: ReturnType<typeof drizzle>,
  domain: string,
  migrationsFolder: string
): Promise<void> {
  try {
    // Find the latest migration snapshot
    const metaFolder = path.join(migrationsFolder, 'meta');
    const journalPath = path.join(metaFolder, '_journal.json');

    if (!existsSync(journalPath)) {
      console.log(`⚠️  No migration journal found for domain: ${domain}`);
      return;
    }

    const journalContent = readFileSync(journalPath, 'utf-8');
    const journal = JSON.parse(journalContent) as { entries: Array<{ tag: string }> };

    if (!journal.entries || journal.entries.length === 0) {
      console.log(`⚠️  No migration entries found for domain: ${domain}`);
      return;
    }

    // Get the latest migration tag
    const latestEntry = journal.entries[journal.entries.length - 1];
    const version = latestEntry.tag;

    // Load the snapshot for the latest migration
    const snapshotPath = path.join(metaFolder, `${version}_snapshot.json`);
    if (!existsSync(snapshotPath)) {
      console.log(`⚠️  No snapshot found for version: ${version}`);
      return;
    }

    const snapshotContent = readFileSync(snapshotPath, 'utf-8');
    const snapshot = JSON.parse(snapshotContent);

    // Calculate checksum
    const checksum = await calculateSchemaChecksum(snapshot);

    // Track version using the database connection
    // We need to use the raw postgres client for this
    const postgresClient = (db as any).getClient();
    await trackSchemaVersion(
      {
        query: async (sql: string, params: unknown[]) => {
          return postgresClient.unsafe(sql, params);
        },
      } as any,
      domain,
      version,
      checksum
    );

    console.log(`✅ Schema version tracked: ${domain}@${version}`);
  } catch (error) {
    console.warn(`⚠️  Failed to track schema version for domain: ${domain}`, error);
    // Don't fail the migration if version tracking fails
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
