import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const driveFiles = pgTable('drive_files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  folderId: text('folder_id'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  modifiedAt: timestamp('modified_at').notNull().defaultNow(),
});

export const driveFolders = pgTable('drive_folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type DriveFileSchema = typeof driveFiles.$inferSelect;
export type NewDriveFileSchema = typeof driveFiles.$inferInsert;
export type DriveFolderSchema = typeof driveFolders.$inferSelect;
export type NewDriveFolderSchema = typeof driveFolders.$inferInsert;
