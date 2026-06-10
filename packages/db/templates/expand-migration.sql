-- ============================================================================
-- Expand Phase Migration Template
-- ============================================================================
-- This template is for the EXPAND phase of the expand-contract pattern.
-- Use this when adding new columns, tables, or indexes without removing
-- or modifying existing structures.
--
-- PHASE: EXPAND
-- PURPOSE: Add new structures alongside existing ones
-- ROLLBACK: DROP new columns/tables (safe)
-- ============================================================================

-- Example 1: Add a new nullable column
-- ALTER TABLE "table_name" ADD COLUMN "new_column" data_type;

-- Example 2: Add a new column with default value
-- ALTER TABLE "table_name" ADD COLUMN "new_column" data_type DEFAULT default_value;

-- Example 3: Add a new table
-- CREATE TABLE "new_table" (
--   "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
--   "column1" data_type NOT NULL,
--   "column2" data_type,
--   "created_at" timestamp DEFAULT now() NOT NULL,
--   "updated_at" timestamp DEFAULT now() NOT NULL
-- );

-- Example 4: Add a new index (use CONCURRENTLY for production)
-- CREATE INDEX CONCURRENTLY "idx_table_name_column" ON "table_name"("column");

-- Example 5: Add a foreign key constraint
-- ALTER TABLE "table_name" ADD CONSTRAINT "fk_name" 
-- FOREIGN KEY ("column_id") REFERENCES "other_table"("id") 
-- ON DELETE cascade ON UPDATE no action;

-- ============================================================================
-- CHECKLIST:
-- [ ] New columns are nullable or have default values
-- [ ] No existing columns are dropped or altered
-- [ ] No constraints that would block existing operations
-- [ ] Indexes use CONCURRENTLY if table has data
-- [ ] Migration tested on staging environment
-- [ ] Rollback plan documented (DROP new structures)
-- ============================================================================
