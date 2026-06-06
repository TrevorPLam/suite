import { pgTable, uuid, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const usage = pgTable('usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  requestCount: integer('request_count').notNull().default(0),
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdPeriodStartIdx: uniqueIndex('usage_user_id_period_start_idx').on(table.userId, table.periodStart),
}));

export type UsageSchema = typeof usage.$inferSelect;
export type NewUsageSchema = typeof usage.$inferInsert;
