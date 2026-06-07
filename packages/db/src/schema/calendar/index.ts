import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { users } from '../users.js';

export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
}, (table) => ({
  tenantIdIdx: index('calendar_events_tenant_id_idx').on(table.tenantId),
  tenantUserIdIdx: index('calendar_events_tenant_user_idx').on(table.tenantId, table.userId),
  tenantStartAtIdx: index('calendar_events_tenant_start_at_idx').on(table.tenantId, table.startAt),
}));

export type CalendarEventSchema = typeof calendarEvents.$inferSelect;
export type NewCalendarEventSchema = typeof calendarEvents.$inferInsert;
