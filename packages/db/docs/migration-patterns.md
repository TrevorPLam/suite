# Expand-Contract Migration Pattern

## Overview

The expand-contract pattern is a zero-downtime database migration strategy that allows schema changes without affecting uptime. It works by applying changes through a series of discrete steps designed to introduce the new structure in the background, prepare the data for live usage, and then switch over to the new structure seamlessly.

## Why This Pattern Matters

- **Zero downtime**: Migrations can run without taking the system offline
- **Rollback safety**: Changes can be rolled back at most points in the process
- **Gradual transition**: Clients migrate incrementally to new structures
- **Production safety**: Validated on live data before full cutover

## The 4-Phase Pattern

### Phase 1: Expand

Add new columns, tables, or indexes without removing or modifying existing structures.

**Key principles:**
- New columns must be nullable or have default values
- New tables are created alongside existing ones
- No existing columns are dropped or altered
- No constraints that would break existing code

**Example:**
```sql
-- Expand phase: Add new nullable column
ALTER TABLE "users" ADD COLUMN "full_name" text;
```

### Phase 2: Deploy

Update application code to write to both old and new structures.

**Key principles:**
- Application writes to both old and new columns/tables
- Application continues reading from old structure
- New structure is validated in production
- No breaking changes to existing behavior

**Example:**
```typescript
// Application code writes to both
await db.users.update({
  where: { id },
  data: {
    name: input.name,           // Old column
    full_name: input.fullName,  // New column
  },
});
```

### Phase 3: Backfill

Migrate existing data from old structure to new structure.

**Key principles:**
- Run data migration script in batches
- Verify data integrity after migration
- Handle edge cases and data quality issues
- Can be run incrementally over time

**Example:**
```sql
-- Backfill: Copy data from old to new column
UPDATE "users" 
SET "full_name" = "name" 
WHERE "full_name" IS NULL;
```

### Phase 4: Contract

Remove old structures after all clients have migrated.

**Key principles:**
- Only after all clients are reading from new structure
- Only after all clients have stopped writing to old structure
- Remove old columns, tables, or indexes
- Clean up any temporary migration artifacts

**Example:**
```sql
-- Contract phase: Remove old column
ALTER TABLE "users" DROP COLUMN "name";
```

## Migration Checklist

Before running any migration in production:

### Expand Phase Checklist
- [ ] New columns are nullable or have defaults
- [ ] New tables are created without breaking existing code
- [ ] No existing columns are dropped or altered
- [ ] No constraints that would block existing operations
- [ ] Migration is tested on staging environment
- [ ] Rollback plan is documented

### Deploy Phase Checklist
- [ ] Application code writes to both old and new structures
- [ ] Application code still reads from old structure
- [ ] New structure is validated in production
- [ ] No breaking changes to existing behavior
- [ ] Monitoring is in place to catch errors
- [ ] Rollback plan is tested

### Backfill Phase Checklist
- [ ] Data migration script is tested on staging
- [ ] Data migration runs in batches to avoid long locks
- [ ] Data integrity is verified after migration
- [ ] Edge cases are handled (nulls, invalid data, etc.)
- [ ] Migration progress is monitored
- [ ] Rollback plan is documented

### Contract Phase Checklist
- [ ] All clients are reading from new structure
- [ ] All clients have stopped writing to old structure
- [ ] No remaining dependencies on old structure
- [ ] Removal is tested on staging environment
- [ ] Rollback plan is documented (though unlikely to need)

## Common Patterns

### Adding a New Column

**Expand:**
```sql
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false;
```

**Deploy:** Update application to write to `email_verified`

**Backfill:** (Not needed if default value is sufficient)

**Contract:** (No old column to remove)

### Renaming a Column

**Expand:**
```sql
ALTER TABLE "users" ADD COLUMN "username" text;
```

**Deploy:** Update application to write to both `name` and `username`

**Backfill:**
```sql
UPDATE "users" SET "username" = "name" WHERE "username" IS NULL;
```

**Contract:**
```sql
ALTER TABLE "users" DROP COLUMN "name";
```

### Changing Column Type

**Expand:**
```sql
ALTER TABLE "users" ADD COLUMN "created_at_bigint" bigint;
```

**Deploy:** Update application to write to both columns with converted values

**Backfill:**
```sql
UPDATE "users" 
SET "created_at_bigint" = EXTRACT(EPOCH FROM "created_at") * 1000 
WHERE "created_at_bigint" IS NULL;
```

**Contract:**
```sql
ALTER TABLE "users" DROP COLUMN "created_at";
```

### Adding a NOT NULL Constraint

**Expand:**
```sql
ALTER TABLE "users" ADD COLUMN "email_new" text;
```

**Deploy:** Update application to write to both `email` and `email_new`

**Backfill:**
```sql
UPDATE "users" SET "email_new" = "email" WHERE "email_new" IS NULL;
-- Verify no nulls remain
SELECT COUNT(*) FROM "users" WHERE "email_new" IS NULL;
```

**Contract:**
```sql
ALTER TABLE "users" ALTER COLUMN "email_new" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "email";
ALTER TABLE "users" RENAME COLUMN "email_new" TO "email";
```

## PostgreSQL-Specific Considerations

### CREATE INDEX CONCURRENTLY

Always use `CONCURRENTLY` when creating indexes on production tables to avoid locking:

```sql
-- Good: Non-blocking index creation
CREATE INDEX CONCURRENTLY "idx_users_email" ON "users"("email");

-- Bad: Blocks writes
CREATE INDEX "idx_users_email" ON "users"("email");
```

### Advisory Locks

Use advisory locks to prevent concurrent migrations:

```sql
-- Acquire lock before migration
SELECT pg_advisory_lock(12345);

-- Run migration
-- ...

-- Release lock after migration
SELECT pg_advisory_unlock(12345);
```

### Large Table Migrations

For large tables, consider:
- Running backfills in batches (e.g., 10,000 rows at a time)
- Using `WHERE` clauses to process subsets
- Adding temporary indexes to speed up backfill queries
- Monitoring for long-running transactions

## Anti-Patterns to Avoid

### Single-Phase Migrations

**Don't do this:**
```sql
-- Single migration that breaks existing code
ALTER TABLE "users" DROP COLUMN "name";
ALTER TABLE "users" ADD COLUMN "full_name" text NOT NULL;
```

**Do this instead:**
- Expand: Add `full_name` as nullable
- Deploy: Update application to use `full_name`
- Backfill: Migrate data from `name` to `full_name`
- Contract: Drop `name`, make `full_name` NOT NULL

### Removing Columns Before Backfill

**Don't do this:**
```sql
-- Remove old column before migrating data
ALTER TABLE "users" DROP COLUMN "name";
```

**Do this instead:**
- Ensure all data is migrated to new column
- Verify no nulls remain
- Only then remove old column

### ALTER COLUMN TYPE Without Expand

**Don't do this:**
```sql
-- Blocks table for entire duration
ALTER TABLE "users" ALTER COLUMN "id" TYPE bigint;
```

**Do this instead:**
- Expand: Add new column with new type
- Deploy: Update application to write to both columns
- Backfill: Migrate data with type conversion
- Contract: Drop old column, rename new column

## Integration with CI/CD

Migrations should run in CI before tests:

```yaml
# .github/workflows/ci.yml
- name: Run migrations
  run: APP_DOMAIN=localhost pnpm db:migrate

- name: Run tests
  run: pnpm test
```

Never run migrations inside Workers. Use the `db:migrate` script from the root package.json.

## Further Reading

- [Prisma Expand-Contract Pattern Guide](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern)
- [Zero-Downtime PostgreSQL Migrations](https://dev.to/software_mvp-factory/zero-downtime-postgresql-schema-migrations-expandcontract-vs-blue-green-deployment-339o)
- [Database Migrations Without Downtime](https://www.datasops.com/blog/database-migrations-zero-downtime)
