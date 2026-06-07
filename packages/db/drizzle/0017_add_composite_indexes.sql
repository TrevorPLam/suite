-- Add composite indexes for RLS efficiency and query performance
-- PostgreSQL composite indexes optimize multi-column WHERE clauses
-- RLS policies require tenant_id as first column for efficient filtering
-- Following AGENTS.md Rule 9: multi-tenancy with tenant_id columns

-- Composite indexes for calendar schema
-- (tenant_id, user_id) for user-scoped queries with RLS
-- (tenant_id, start_at) for time-series queries within tenant
CREATE INDEX IF NOT EXISTS calendar_events_tenant_user_idx ON calendar.calendar_events USING btree ("tenant_id", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS calendar_events_tenant_start_at_idx ON calendar.calendar_events USING btree ("tenant_id", "start_at");--> statement-breakpoint

-- Composite indexes for drive schema
-- (tenant_id, user_id) for user-scoped file/folder queries with RLS
-- (tenant_id, blind_index) for encrypted search within tenant
CREATE INDEX IF NOT EXISTS drive_files_tenant_user_idx ON drive.drive_files USING btree ("tenant_id", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS drive_files_tenant_blind_index_idx ON drive.drive_files USING btree ("tenant_id", "blind_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS drive_folders_tenant_user_idx ON drive.drive_folders USING btree ("tenant_id", "user_id");--> statement-breakpoint

-- Composite indexes for tasks schema
-- (tenant_id, user_id) for user-scoped task queries with RLS
-- (tenant_id, blind_index) for encrypted search within tenant
CREATE INDEX IF NOT EXISTS tasks_tenant_user_idx ON tasks.tasks USING btree ("tenant_id", "user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tasks_tenant_blind_index_idx ON tasks.tasks USING btree ("tenant_id", "blind_index");--> statement-breakpoint

-- Index for users schema
-- (tenant_id) for user lookup by tenant
CREATE INDEX IF NOT EXISTS users_tenant_id_idx ON auth.users USING btree ("tenant_id");
