import type { Config } from 'drizzle-kit';

export default {
  dialect: 'postgresql',
  schema: './src/schema/drive',
  out: './drizzle/drive',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ['drive'],
  tablesFilter: ['drive_*', 'files', 'folders'],
  migrations: {
    table: '__drizzle_migrations_drive',
    schema: 'drizzle',
  },
} satisfies Config;
