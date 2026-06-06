-- Step 1: Add user_id columns as nullable (expand phase)
ALTER TABLE "calendar_events" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "drive_folders" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "user_id" uuid;--> statement-breakpoint
-- Step 2: Add foreign key constraints
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_folders" ADD CONSTRAINT "drive_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Step 3: Make columns NOT NULL (contract phase - after backfill)
-- Note: This will fail if there are existing rows without user_id
-- Backfill should be done before this step in production
ALTER TABLE "calendar_events" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "drive_files" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "drive_folders" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "user_id" SET NOT NULL;