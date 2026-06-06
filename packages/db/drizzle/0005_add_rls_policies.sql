-- Enable Row Level Security on all domain tables
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_files" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "drive_folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Create RLS policies to enforce user_id isolation
-- Policy: Users can only access their own data
CREATE POLICY "calendar_events_user_isolation_policy" ON "calendar_events"
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "drive_files_user_isolation_policy" ON "drive_files"
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "drive_folders_user_isolation_policy" ON "drive_folders"
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid);--> statement-breakpoint
CREATE POLICY "tasks_user_isolation_policy" ON "tasks"
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid);
