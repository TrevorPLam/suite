import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: './src/schema/calendar',
  out: './drizzle/calendar',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['calendar'],
  tablesFilter: ['calendar_*', 'events', 'attendees', 'bookings'],
  migrations: {
    table: '__drizzle_migrations_calendar',
    schema: 'drizzle',
  },
} satisfies Config;
