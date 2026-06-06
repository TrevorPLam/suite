import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const calendarEvents = pgTable('calendar_events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
});

export type CalendarEventSchema = typeof calendarEvents.$inferSelect;
export type NewCalendarEventSchema = typeof calendarEvents.$inferInsert;
