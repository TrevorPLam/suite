import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: './src/schema/tasks',
  out: './drizzle/tasks',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['tasks'],
  tablesFilter: ['tasks_*'],
  migrations: {
    table: '__drizzle_migrations_tasks',
    schema: 'drizzle',
  },
} satisfies Config;
