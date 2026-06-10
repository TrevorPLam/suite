# Schema Registry

The schema registry provides version tracking, contract testing, and schema diffing capabilities to prevent schema drift and detect breaking changes before deployment.

## Overview

The schema registry consists of three main components:

1. **Version Tracker** - Tracks schema versions per domain with checksums
2. **Contract Tester** - Validates schema contracts and detects breaking changes
3. **Schema Diff Tool** - Compares schema versions and shows changes

## Version Tracking

### Purpose

Version tracking maintains a record of which schema version is currently deployed for each domain (calendar, tasks, drive, shared). This enables:

- Schema drift detection between environments
- Rollback verification
- Migration history auditing
- Checksum-based validation

### How It Works

When migrations run successfully, the migration script automatically:

1. Reads the latest migration snapshot from Drizzle metadata
2. Calculates a SHA-256 checksum of the schema
3. Stores the version, checksum, and timestamp in the `schema_registry` table

### API

```typescript
import { trackSchemaVersion, getCurrentSchemaVersion, getAllSchemaVersions, calculateSchemaChecksum } from '@suite/db/schema-registry/version-tracker.js';

// Track a schema version
await trackSchemaVersion(db, 'calendar', '0001_nebulous_medusa', 'abc123...');

// Get current version for a domain
const version = await getCurrentSchemaVersion(db, 'calendar');
// Returns: { domain: 'calendar', version: '0001_nebulous_medusa', appliedAt: Date, checksum: 'abc123...' }

// Get all tracked versions
const versions = await getAllSchemaVersions(db);
// Returns: Array of SchemaVersion

// Calculate checksum from schema data
const checksum = await calculateSchemaChecksum(schemaSnapshot);
// Returns: SHA-256 hex string
```

### Registry Table

The `schema_registry` table is automatically created:

```sql
CREATE TABLE schema_registry (
  domain TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  applied_at TIMESTAMP NOT NULL,
  checksum TEXT NOT NULL
);
```

## Contract Testing

### Purpose

Contract testing validates that the current database schema matches the expected schema, detecting breaking changes before they reach production.

### Breaking Changes Detected

- **Removed tables** - Tables that exist in expected schema but not in current schema
- **Removed columns** - Columns that exist in expected schema but not in current schema
- **Column type changes** - Type mismatches between expected and current columns
- **Nullable to non-nullable** - Columns changed from nullable to NOT NULL
- **Removed foreign keys** - Foreign keys that exist in expected schema but not in current schema

### Warnings (Non-Breaking)

- **Added tables** - New tables not in expected schema
- **Removed indexes** - Indexes removed (may affect performance but not correctness)

### API

```typescript
import { testSchemaContract, SchemaContract } from '@suite/db/schema-registry/contract-tester.js';

const expectedSchema: SchemaContract = {
  tables: {
    users: {
      name: 'users',
      columns: {
        id: { name: 'id', type: 'text', nullable: false, primaryKey: true },
        email: { name: 'email', type: 'text', nullable: true, primaryKey: false },
      },
      indexes: {
        users_email_idx: {
          name: 'users_email_idx',
          columns: ['email'],
          unique: true,
        },
      },
      foreignKeys: {},
    },
  },
};

const result = await testSchemaContract(db, 'public', expectedSchema);
// Returns: { valid: boolean, violations: ContractViolation[] }

if (!result.valid) {
  const breaking = result.violations.filter(v => v.type === 'breaking');
  console.error('Breaking changes detected:', breaking);
}
```

### Integration in CI

Contract tests run automatically in CI after migrations:

```yaml
- name: Run schema contract tests
  run: pnpm --filter @suite/db test:run -- schema-registry.test.ts
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/suite
```

## Schema Diff Tool

### Purpose

The schema diff tool compares two schema versions and outputs a human-readable summary of changes.

### Usage

```bash
# Compare two migration versions
tsx packages/db/scripts/schema-diff.ts 0000 0001 calendar

# Output example:
# Added Tables:
#   + calendar_events
#
# Changed Tables:
#   ~ users
#     + email
#     ~ name: type changed from text to varchar(255)
```

### API

```typescript
import { diffSchemas, formatDiff } from '@suite/db/scripts/schema-diff.js';

const diff = diffSchemas('0000', '0001', 'calendar');
console.log(formatDiff(diff));
```

## Best Practices

### 1. Always Track Versions

Version tracking is automatic after migrations. Ensure migrations run through the standard migration script:

```bash
pnpm db:migrate  # Uses APP_DOMAIN environment variable
```

### 2. Define Expected Schemas

For contract testing, define expected schemas as TypeScript objects. These can be generated from Drizzle snapshots:

```typescript
// Generate from snapshot
import snapshot from '../drizzle/calendar/meta/0000_snapshot.json';
const expectedSchema = convertDrizzleSnapshot(snapshot);
```

### 3. Test Before Deploying

Run contract tests in development before deploying:

```bash
DATABASE_URL=postgresql://... pnpm --filter @suite/db test:run -- schema-registry.test.ts
```

### 4. Review Schema Diffs

Before applying migrations, review the diff to understand changes:

```bash
tsx packages/db/scripts/schema-diff.ts 0000 0001 calendar
```

### 5. Handle Breaking Changes

If contract tests detect breaking changes:

1. Review the violations
2. If the change is intentional, update the expected schema
3. If unintentional, modify the migration to use expand-contract pattern
4. Re-run contract tests

## Troubleshooting

### Version Tracking Fails

If version tracking fails after migration:

```
⚠️  Failed to track schema version for domain: calendar
```

This is a warning and won't fail the migration. Common causes:

- Migration journal not found (first migration)
- Snapshot file missing
- Database connection issues

Check the migration logs and ensure Drizzle metadata is present.

### Contract Tests Fail

If contract tests fail in CI:

1. Check if the failure is a breaking change or warning
2. Review the violation details
3. Determine if the change is intentional
4. Update expected schema or fix migration accordingly

### Schema Diff Shows No Changes

If the diff shows no changes but you expect changes:

- Verify the version numbers are correct
- Check that the snapshot files exist in `drizzle/<domain>/meta/`
- Ensure the domain parameter matches the migration folder

## Architecture

### Domain Isolation

Each domain (calendar, tasks, drive, shared) has its own:

- Migration folder: `drizzle/<domain>/`
- Migration table: `__drizzle_migrations_<domain>`
- Schema registry entry: `schema_registry.domain = '<domain>'`

### Expand-Contract Pattern

The schema registry works with the expand-contract migration pattern documented in `packages/db/docs/migration-patterns.md`. Contract tests help ensure that the contract phase is safe to apply.

### Integration with Drizzle

The schema registry reads Drizzle's snapshot JSON files to:

- Extract schema structure for contract testing
- Calculate checksums for version tracking
- Generate diffs between versions

## Future Enhancements

Potential improvements to the schema registry:

- **Automatic expected schema generation** from Drizzle snapshots
- **Schema drift detection** between environments (dev/staging/prod)
- **Rollback validation** to ensure rollbacks are safe
- **Migration dependency tracking** to prevent out-of-order migrations
- **Schema documentation generation** from registry data
