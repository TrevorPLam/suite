import { setCalendarEventRepository } from '@suite/domain-calendar';
import { PostgresCalendarEventRepository } from '@suite/db';

export function wireRepositories(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use Postgres repository when DATABASE_URL is configured
    setCalendarEventRepository(new PostgresCalendarEventRepository());
  }
  // Otherwise, domain uses default in-memory repository (local dev without Postgres)
}
