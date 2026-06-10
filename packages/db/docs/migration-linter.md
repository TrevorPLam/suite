# Migration Linter

## Overview

The migration linter validates SQL migration files against anti-patterns and best practices defined in the expand-contract migration pattern. It runs automatically in CI before migrations are applied to the database.

## Running the Linter

```bash
# Run linter on all migrations
pnpm --filter @suite/db lint:migrations

# Or from the db package directory
pnpm lint:migrations
```

## Linter Rules

### Forbidden Operations (Errors)

These operations are forbidden unless specific exceptions are met:

#### DROP_COLUMN_WITHOUT_CONTRACT

**Pattern:** `DROP COLUMN`

**Description:** DROP COLUMN operations must only occur in contract phase migrations. Use expand-contract pattern: add new column first, migrate data, then drop old column.

**Exception:** Migration file name contains 'contract' or is marked with `-- contract phase` comment.

**Why this rule exists:** Dropping a column without first migrating data causes data loss. The expand-contract pattern ensures data is safely migrated before the old column is removed.

**Example:**
```sql
-- ❌ Bad: Direct column drop
ALTER TABLE "users" DROP COLUMN "name";

-- ✅ Good: Expand-contract pattern
-- Expand phase migration:
ALTER TABLE "users" ADD COLUMN "full_name" text;

-- Deploy phase: Update application to write to both columns

-- Backfill phase:
UPDATE "users" SET "full_name" = "name" WHERE "full_name" IS NULL;

-- Contract phase migration:
ALTER TABLE "users" DROP COLUMN "name";
```

#### ALTER_COLUMN_TYPE_WITHOUT_EXPAND

**Pattern:** `ALTER COLUMN.*TYPE`

**Description:** ALTER COLUMN TYPE operations must use expand-contract pattern. Add new column with new type, migrate data, then drop old column.

**Exception:** Migration file name contains 'contract' or is marked with `-- contract phase` comment.

**Why this rule exists:** Changing column type directly can block the table for the entire duration of the migration, causing downtime. The expand-contract pattern allows zero-downtime migrations.

**Example:**
```sql
-- ❌ Bad: Direct type change (blocks table)
ALTER TABLE "users" ALTER COLUMN "id" TYPE bigint;

-- ✅ Good: Expand-contract pattern
-- Expand phase:
ALTER TABLE "users" ADD COLUMN "id_bigint" bigint;

-- Deploy phase: Update application to write to both columns

-- Backfill phase:
UPDATE "users" SET "id_bigint" = "id"::bigint WHERE "id_bigint" IS NULL;

-- Contract phase:
ALTER TABLE "users" DROP COLUMN "id";
ALTER TABLE "users" RENAME COLUMN "id_bigint" TO "id";
```

#### CREATE_INDEX_WITHOUT_CONCURRENTLY

**Pattern:** `CREATE INDEX(?!.*CONCURRENTLY)`

**Description:** CREATE INDEX must use CONCURRENTLY to avoid blocking writes on production tables. Use CREATE INDEX CONCURRENTLY instead.

**Exception:** Migration is for initial schema creation (e.g., 0000_*.sql) or table is small (<1000 rows).

**Why this rule exists:** Creating an index without CONCURRENTLY locks the table against writes. For large tables, this can cause significant downtime. CONCURRENTLY allows writes to continue during index creation.

**Example:**
```sql
-- ❌ Bad: Blocks writes during index creation
CREATE INDEX "idx_users_email" ON "users"("email");

-- ✅ Good: Non-blocking index creation
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");
```

#### DROP_TABLE_WITHOUT_CONTRACT

**Pattern:** `DROP TABLE`

**Description:** DROP TABLE operations must only occur in contract phase migrations. Use expand-contract pattern: create new table, migrate data, then drop old table.

**Exception:** Migration file name contains 'contract' or is marked with `-- contract phase` comment.

**Why this rule exists:** Dropping a table without migrating data causes data loss. The expand-contract pattern ensures data is safely migrated before the old table is removed.

**Example:**
```sql
-- ❌ Bad: Direct table drop
DROP TABLE "old_users";

-- ✅ Good: Expand-contract pattern
-- Expand phase:
CREATE TABLE "new_users" (...);

-- Deploy phase: Update application to write to both tables

-- Backfill phase:
INSERT INTO "new_users" SELECT * FROM "old_users";

-- Contract phase:
DROP TABLE "old_users";
```

#### DROP_CONSTRAINT_WITHOUT_CONTRACT

**Pattern:** `DROP CONSTRAINT`

**Description:** DROP CONSTRAINT operations must only occur in contract phase migrations. Use expand-contract pattern: add new constraint, validate, then drop old constraint.

**Exception:** Migration file name contains 'contract' or is marked with `-- contract phase` comment.

**Why this rule exists:** Dropping a constraint without validation can allow invalid data to be inserted. The expand-contract pattern ensures data is validated before the constraint is removed.

**Example:**
```sql
-- ❌ Bad: Direct constraint drop
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";

-- ✅ Good: Expand-contract pattern
-- Expand phase:
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique_new" UNIQUE("email");

-- Deploy phase: Validate new constraint works

-- Contract phase:
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";
ALTER TABLE "users" RENAME CONSTRAINT "users_email_unique_new" TO "users_email_unique";
```

#### ADD_NOT_NULL_WITHOUT_DEFAULT

**Pattern:** `ALTER COLUMN.*SET NOT NULL`

**Description:** Adding NOT NULL constraint without default value can fail on existing data. Use expand-contract pattern: add nullable column, backfill data, then add NOT NULL constraint.

**Exception:** Migration file name contains 'contract' or is marked with `-- contract phase` comment.

**Why this rule exists:** Adding NOT NULL to a column with existing NULL values will fail. The expand-contract pattern ensures all data is backfilled before the constraint is added.

**Example:**
```sql
-- ❌ Bad: Fails if column has NULL values
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;

-- ✅ Good: Expand-contract pattern
-- Expand phase:
ALTER TABLE "users" ADD COLUMN "email_new" text;

-- Deploy phase: Update application to write to both columns

-- Backfill phase:
UPDATE "users" SET "email_new" = "email" WHERE "email_new" IS NULL;
-- Verify no nulls remain
SELECT COUNT(*) FROM "users" WHERE "email_new" IS NULL;

-- Contract phase:
ALTER TABLE "users" ALTER COLUMN "email_new" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "email";
ALTER TABLE "users" RENAME COLUMN "email_new" TO "email";
```

### Required Patterns (Warnings)

These patterns are recommended but not required:

#### PHASE_COMMENT

**Pattern:** `-- (expand|deploy|backfill|contract) phase`

**Description:** Migrations should include phase comments to indicate which phase of expand-contract pattern they represent.

**Exception:** Migration is for initial schema creation or simple additive changes.

**Why this rule exists:** Phase comments make it clear which phase of the expand-contract pattern a migration represents, improving code review and understanding.

**Example:**
```sql
-- expand phase: Add new column
ALTER TABLE "users" ADD COLUMN "full_name" text;
```

#### ROLLBACK_COMMENT

**Pattern:** `-- rollback`

**Description:** Migrations should include rollback instructions in comments.

**Exception:** Migration is for initial schema creation or is reversible by design.

**Why this rule exists:** Rollback instructions make it easy to reverse a migration if something goes wrong.

**Example:**
```sql
-- expand phase: Add new column
ALTER TABLE "users" ADD COLUMN "full_name" text;

-- rollback: ALTER TABLE "users" DROP COLUMN "full_name";
```

## Configuration

The linter is configured in `.migration-linter.json`:

```json
{
  "forbiddenOperations": [...],
  "requiredPatterns": [...],
  "excludedMigrations": [
    "0000_*.sql",
    "0001_*.sql"
  ],
  "migrationDirectory": "drizzle"
}
```

### Excluded Migrations

Initial schema migrations (0000_*.sql, 0001_*.sql) are excluded from linter checks because they create the initial database structure and don't follow the expand-contract pattern.

## CI Integration

The linter runs automatically in CI before migrations:

```yaml
- name: Lint database migrations
  run: pnpm --filter @suite/db lint:migrations

- name: Run database migrations
  run: pnpm db:migrate
```

If the linter fails, CI will fail and migrations will not run.

## Adding New Rules

To add a new linter rule:

1. Add the rule to `.migration-linter.json` under `forbiddenOperations` or `requiredPatterns`
2. Implement the pattern matching logic in `scripts/lint-migrations.ts` if needed
3. Document the rule in this file
4. Test the rule on existing migrations

## Troubleshooting

### Linter passes but migration fails

The linter checks for anti-patterns but cannot catch all issues. Always test migrations on a staging environment before running in production.

### False positives

If a rule is incorrectly flagging a migration:

1. Check if the migration should be excluded (e.g., initial schema)
2. Add a phase comment (e.g., `-- contract phase`) to trigger the exception
3. Update the exception logic in `.migration-linter.json` if needed

### Rule too strict

If a rule is too strict for your use case:

1. Update the exception logic in `.migration-linter.json`
2. Document the exception in this file
3. Consider if the rule should be downgraded from error to warning

## Further Reading

- [Expand-Contract Migration Pattern](./migration-patterns.md)
- [AGENTS.md Migration Rules](../../AGENTS.md)
- [PostgreSQL Index Creation](https://www.postgresql.org/docs/current/sql-createindex.html)
