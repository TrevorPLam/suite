CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "blind_index" text;--> statement-breakpoint
ALTER TABLE "drive_folders" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "tenant_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "blind_index" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "usage_user_id_period_start_idx" ON "usage" USING btree ("user_id","period_start");--> statement-breakpoint
CREATE INDEX "calendar_events_tenant_id_idx" ON "calendar_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "drive_blind_index_idx" ON "drive_files" USING btree ("blind_index");--> statement-breakpoint
CREATE INDEX "drive_files_tenant_id_idx" ON "drive_files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "drive_folders_tenant_id_idx" ON "drive_folders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "blind_index_idx" ON "tasks" USING btree ("blind_index");--> statement-breakpoint
CREATE INDEX "tasks_tenant_id_idx" ON "tasks" USING btree ("tenant_id");