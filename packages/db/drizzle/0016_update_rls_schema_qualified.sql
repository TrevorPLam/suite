-- Update RLS policies to use schema-qualified table names
-- After moving tables to schemas, policies must reference the full schema.table path
-- This ensures RLS continues to work correctly with schema separation

-- Drop existing policies (they reference unqualified table names)
DROP POLICY IF EXISTS "calendar_events_tenant_isolation_policy" ON calendar.calendar_events;--> statement-breakpoint
DROP POLICY IF EXISTS "drive_files_tenant_isolation_policy" ON drive.drive_files;--> statement-breakpoint
DROP POLICY IF EXISTS "drive_folders_tenant_isolation_policy" ON drive.drive_folders;--> statement-breakpoint
DROP POLICY IF EXISTS "tasks_tenant_isolation_policy" ON tasks.tasks;--> statement-breakpoint

-- Recreate policies with schema-qualified table names
CREATE POLICY "calendar_events_tenant_isolation_policy" ON calendar.calendar_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

CREATE POLICY "drive_files_tenant_isolation_policy" ON drive.drive_files
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

CREATE POLICY "drive_folders_tenant_isolation_policy" ON drive.drive_folders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

CREATE POLICY "tasks_tenant_isolation_policy" ON tasks.tasks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint

-- Ensure FORCE ROW LEVEL SECURITY is still active
ALTER TABLE calendar.calendar_events FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE drive.drive_files FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE drive.drive_folders FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE tasks.tasks FORCE ROW LEVEL SECURITY;
