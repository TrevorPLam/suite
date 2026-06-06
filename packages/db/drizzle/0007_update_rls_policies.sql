-- Drop existing user_id-based RLS policies
DROP POLICY IF EXISTS "calendar_events_user_isolation_policy" ON "calendar_events";--> statement-breakpoint
DROP POLICY IF EXISTS "drive_files_user_isolation_policy" ON "drive_files";--> statement-breakpoint
DROP POLICY IF EXISTS "drive_folders_user_isolation_policy" ON "drive_folders";--> statement-breakpoint
DROP POLICY IF EXISTS "tasks_user_isolation_policy" ON "tasks";--> statement-breakpoint
-- Create new tenant_id-based RLS policies
-- Policy: Users can only access data from their tenant
CREATE POLICY "calendar_events_tenant_isolation_policy" ON "calendar_events"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "drive_files_tenant_isolation_policy" ON "drive_files"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "drive_folders_tenant_isolation_policy" ON "drive_folders"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tasks_tenant_isolation_policy" ON "tasks"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);--> statement-breakpoint
-- Force RLS for table owners (critical for security)
ALTER TABLE "calendar_events" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_files" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_folders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;
