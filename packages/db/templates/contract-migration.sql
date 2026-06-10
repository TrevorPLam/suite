-- ============================================================================
-- Contract Phase Migration Template
-- ============================================================================
-- This template is for the CONTRACT phase of the expand-contract pattern.
-- Use this ONLY after:
-- 1. All clients are reading from the new structure
-- 2. All clients have stopped writing to the old structure
-- 3. No remaining dependencies on the old structure
--
-- PHASE: CONTRACT
-- PURPOSE: Remove old structures after migration is complete
-- ROLLBACK: Re-add old structures (difficult, requires data restoration)
-- ============================================================================

-- Example 1: Drop an old column
-- ALTER TABLE "table_name" DROP COLUMN "old_column";

-- Example 2: Drop an old table
-- DROP TABLE "old_table";

-- Example 3: Drop an old index
-- DROP INDEX "idx_old_index";

-- Example 4: Drop a foreign key constraint
-- ALTER TABLE "table_name" DROP CONSTRAINT "fk_old_constraint";

-- Example 5: Make a column NOT NULL (after backfill verified)
-- ALTER TABLE "table_name" ALTER COLUMN "column" SET NOT NULL;

-- Example 6: Rename a column (after old column is dropped)
-- ALTER TABLE "table_name" RENAME COLUMN "new_column" TO "final_column";

-- ============================================================================
-- CHECKLIST:
-- [ ] All clients are reading from new structure
-- [ ] All clients have stopped writing to old structure
-- [ ] No remaining dependencies on old structure
-- [ ] Data migration verified (no nulls, correct values)
-- [ ] Removal tested on staging environment
-- [ ] Rollback plan documented (though unlikely to need)
-- ============================================================================
