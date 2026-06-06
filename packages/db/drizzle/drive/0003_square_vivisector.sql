CREATE TABLE "drive_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "folder_id" text;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "modified_at" timestamp DEFAULT now() NOT NULL;
