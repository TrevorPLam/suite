import { pgTable, text, integer } from 'drizzle-orm/pg-core';

export const driveFiles = pgTable('drive_files', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  size: integer('size').notNull(),
});

export type DriveFileSchema = typeof driveFiles.$inferSelect;
export type NewDriveFileSchema = typeof driveFiles.$inferInsert;
