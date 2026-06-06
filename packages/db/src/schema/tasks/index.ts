import { pgTable, text, boolean, timestamp, jsonb, uuid, index } from 'drizzle-orm/pg-core';
import { users } from '../users.js';

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  archived: boolean('archived').notNull().default(false),
  dueDate: timestamp('due_date'),
  priority: text('priority').$type<'low' | 'medium' | 'high'>(),
  tags: jsonb('tags').$type<string[]>(),
  blindIndex: text('blind_index'),
}, (table) => ({
  blindIndexIdx: index('blind_index_idx').on(table.blindIndex),
  tenantIdIdx: index('tasks_tenant_id_idx').on(table.tenantId),
}));

export type TaskSchema = typeof tasks.$inferSelect;
export type NewTaskSchema = typeof tasks.$inferInsert;
