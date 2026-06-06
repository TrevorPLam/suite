import { pgTable, text, boolean } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  archived: boolean('archived').notNull().default(false),
});

export type TaskSchema = typeof tasks.$inferSelect;
export type NewTaskSchema = typeof tasks.$inferInsert;
