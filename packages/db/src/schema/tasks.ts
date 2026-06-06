import { pgTable, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  archived: boolean('archived').notNull().default(false),
  dueDate: timestamp('due_date'),
  priority: text('priority').$type<'low' | 'medium' | 'high'>(),
  tags: jsonb('tags').$type<string[]>(),
});

export type TaskSchema = typeof tasks.$inferSelect;
export type NewTaskSchema = typeof tasks.$inferInsert;
