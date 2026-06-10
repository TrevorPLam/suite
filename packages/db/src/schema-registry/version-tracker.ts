import { Database } from '../database.interface.js';

/**
 * Schema version tracking for detecting drift and enabling contract testing
 * 
 * This module tracks schema versions per domain to enable:
 * - Schema drift detection
 * - Contract testing between environments
 * - Rollback verification
 * - Migration history auditing
 */

export interface SchemaVersion {
  domain: string;
  version: string;
  appliedAt: Date;
  checksum: string;
}

export interface VersionTrackerOptions {
  tableName?: string;
}

/**
 * Track schema version in the registry
 * 
 * @param db - Database instance
 * @param domain - Domain name (e.g., 'calendar', 'tasks', 'drive', 'shared')
 * @param version - Migration version/tag
 * @param checksum - Schema checksum for validation
 */
export async function trackSchemaVersion(
  db: Database,
  domain: string,
  version: string,
  checksum: string
): Promise<void> {
  const tableName = 'schema_registry';
  
  // Ensure registry table exists
  await ensureRegistryTable(db, tableName);
  
  // Insert version record
  await db.query(
    `INSERT INTO ${tableName} (domain, version, applied_at, checksum)
     VALUES ($1, $2, NOW(), $3)
     ON CONFLICT (domain) DO UPDATE SET
       version = EXCLUDED.version,
       applied_at = EXCLUDED.applied_at,
       checksum = EXCLUDED.checksum`,
    [domain, version, checksum]
  );
}

/**
 * Get current schema version for a domain
 * 
 * @param db - Database instance
 * @param domain - Domain name
 * @returns Current schema version or null if not tracked
 */
export async function getCurrentSchemaVersion(
  db: Database,
  domain: string
): Promise<SchemaVersion | null> {
  const tableName = 'schema_registry';
  
  const result = await db.query(
    `SELECT domain, version, applied_at, checksum
     FROM ${tableName}
     WHERE domain = $1`,
    [domain]
  );
  
  if (!result || result.length === 0) {
    return null;
  }
  
  const row = result[0] as { domain: string; version: string; applied_at: string; checksum: string };
  return {
    domain: row.domain,
    version: row.version,
    appliedAt: new Date(row.applied_at),
    checksum: row.checksum,
  };
}

/**
 * Get all tracked schema versions
 * 
 * @param db - Database instance
 * @returns All schema versions
 */
export async function getAllSchemaVersions(
  db: Database
): Promise<SchemaVersion[]> {
  const tableName = 'schema_registry';
  
  const result = await db.query(
    `SELECT domain, version, applied_at, checksum
     FROM ${tableName}
     ORDER BY domain`,
    []
  );
  
  if (!result || result.length === 0) {
    return [];
  }
  
  return result.map((row) => {
    const typedRow = row as { domain: string; version: string; applied_at: string; checksum: string };
    return {
      domain: typedRow.domain,
      version: typedRow.version,
      appliedAt: new Date(typedRow.applied_at),
      checksum: typedRow.checksum,
    };
  });
}

/**
 * Calculate schema checksum from migration metadata
 * 
 * @param migrationData - Migration snapshot data
 * @returns SHA-256 checksum of schema
 */
export async function calculateSchemaChecksum(
  migrationData: unknown
): Promise<string> {
  const crypto = await import('crypto');
  const dataObj = migrationData as Record<string, unknown>;
  const dataStr = JSON.stringify(dataObj, Object.keys(dataObj).sort());
  return crypto.createHash('sha256').update(dataStr).digest('hex');
}

/**
 * Ensure the schema registry table exists
 * 
 * @param db - Database instance
 * @param tableName - Registry table name
 */
async function ensureRegistryTable(
  db: Database,
  tableName: string
): Promise<void> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
      domain TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      applied_at TIMESTAMP NOT NULL,
      checksum TEXT NOT NULL
    )`,
    []
  );
}
