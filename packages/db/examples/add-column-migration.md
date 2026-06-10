# Example Migration: Adding a New Column

This example demonstrates the expand-contract pattern for adding a new column to an existing table.

## Scenario

We want to add a `full_name` column to the `users` table to replace the existing `name` column, which we want to split into `first_name` and `last_name`.

## Phase 1: Expand

**File:** `drizzle/0018_add_full_name_expand.sql`

```sql
-- ============================================================================
-- Expand Phase: Add new column alongside existing one
-- ============================================================================
-- PHASE: EXPAND
-- PURPOSE: Add full_name column without removing name column
-- ROLLBACK: DROP COLUMN full_name
-- ============================================================================

-- Add new nullable column
ALTER TABLE "users" ADD COLUMN "full_name" text;

-- ============================================================================
-- CHECKLIST:
-- [x] New column is nullable
-- [x] No existing columns dropped
-- [x] No constraints that would block existing operations
-- [x] Migration tested on staging
-- ============================================================================
```

**Deploy this migration:**
```bash
APP_DOMAIN=localhost pnpm db:migrate
```

## Phase 2: Deploy

Update application code to write to both columns:

```typescript
// Before: Only writing to name
await db.users.update({
  where: { id },
  data: { name: input.name },
});

// After: Write to both name and full_name
await db.users.update({
  where: { id },
  data: {
    name: input.name,           // Old column (for backward compatibility)
    full_name: input.fullName, // New column
  },
});
```

**Deploy application changes to production.**

## Phase 3: Backfill

Migrate existing data from `name` to `full_name`:

```sql
-- Backfill script (run in application or via direct SQL)
UPDATE "users" 
SET "full_name" = "name" 
WHERE "full_name" IS NULL;

-- Verify no nulls remain
SELECT COUNT(*) FROM "users" WHERE "full_name" IS NULL;
-- Should return 0
```

**For large tables, run in batches:**
```sql
-- Batch 1: First 10,000 rows
UPDATE "users" 
SET "full_name" = "name" 
WHERE "full_name" IS NULL 
LIMIT 10000;

-- Repeat until all rows are migrated
```

## Phase 4: Contract

**File:** `drizzle/0019_remove_name_contract.sql`

```sql
-- ============================================================================
-- Contract Phase: Remove old column after migration is complete
-- ============================================================================
-- PHASE: CONTRACT
-- PURPOSE: Remove old name column after all clients migrated
-- ROLLBACK: Re-add name column and restore data (difficult)
-- PREREQUISITES:
-- - All clients reading from full_name
-- - All clients stopped writing to name
-- - No nulls in full_name (backfill complete)
-- ============================================================================

-- Make new column NOT NULL (after backfill verified)
ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;

-- Drop old column
ALTER TABLE "users" DROP COLUMN "name";

-- ============================================================================
-- CHECKLIST:
-- [x] All clients reading from full_name
-- [x] All clients stopped writing to name
-- [x] No nulls in full_name (backfill verified)
-- [x] Removal tested on staging
-- ============================================================================
```

**Deploy this migration:**
```bash
APP_DOMAIN=localhost pnpm db:migrate
```

## Phase 5: Final Application Update

Update application code to only use `full_name`:

```typescript
// Final: Only write to full_name
await db.users.update({
  where: { id },
  data: { full_name: input.fullName },
});
```

**Deploy final application changes to production.**

## Verification

After completing all phases:

1. **Verify data integrity:**
   ```sql
   SELECT COUNT(*) FROM "users" WHERE "full_name" IS NULL;
   -- Should return 0
   ```

2. **Verify application behavior:**
   - Test user creation
   - Test user updates
   - Test user reads

3. **Monitor for errors:**
   - Check logs for any references to `name` column
   - Monitor application performance

## Rollback Plan

If issues occur at any phase:

- **After Expand:** Drop `full_name` column
- **After Deploy:** Stop writing to `full_name`, continue using `name`
- **After Backfill:** Revert application code, drop `full_name` column
- **After Contract:** Restore from backup (difficult, avoid if possible)

## Timeline Example

- **Day 1:** Deploy expand migration (0018)
- **Day 2:** Deploy application code changes (write to both columns)
- **Day 3:** Run backfill script (monitor progress)
- **Day 4:** Verify backfill complete, deploy contract migration (0019)
- **Day 5:** Deploy final application code changes (only full_name)

## Key Takeaways

1. **Never combine expand and contract in one migration** - each phase needs its own migration file
2. **Always make new columns nullable** in expand phase
3. **Verify backfill completeness** before contract phase
4. **Deploy application changes between phases** to ensure gradual transition
5. **Test on staging** before production deployment
