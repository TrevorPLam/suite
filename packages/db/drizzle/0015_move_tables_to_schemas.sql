-- Move domain tables to their respective PostgreSQL schemas
-- This implements DDD bounded contexts with schema separation per domain
-- Following AGENTS.md Rule 1: no cross-domain imports

-- Move calendar_events to calendar schema
ALTER TABLE calendar_events SET SCHEMA calendar;--> statement-breakpoint

-- Move drive tables to drive schema
ALTER TABLE drive_files SET SCHEMA drive;--> statement-breakpoint
ALTER TABLE drive_folders SET SCHEMA drive;--> statement-breakpoint

-- Move tasks to tasks schema
ALTER TABLE tasks SET SCHEMA tasks;--> statement-breakpoint

-- Move auth tables to auth schema
ALTER TABLE users SET SCHEMA auth;--> statement-breakpoint
ALTER TABLE sessions SET SCHEMA auth;--> statement-breakpoint
ALTER TABLE accounts SET SCHEMA auth;--> statement-breakpoint
ALTER TABLE two_factor_verification SET SCHEMA auth;--> statement-breakpoint
ALTER TABLE backup_codes SET SCHEMA auth;
