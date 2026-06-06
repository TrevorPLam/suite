import { pgTable, text, integer, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const driveFiles = pgTable('drive_files', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  size: integer('size').notNull(),
  folderId: text('folder_id'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  modifiedAt: timestamp('modified_at').notNull().defaultNow(),
  blindIndex: text('blind_index'),
}, (table) => ({
  blindIndexIdx: index('drive_blind_index_idx').on(table.blindIndex),
}));

export const driveFolders = pgTable('drive_folders', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  parentId: text('parent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type DriveFileSchema = typeof driveFiles.$inferSelect;
export type NewDriveFileSchema = typeof driveFiles.$inferInsert;
export type DriveFolderSchema = typeof driveFolders.$inferSelect;
export type NewDriveFolderSchema = typeof driveFolders.$inferInsert;
