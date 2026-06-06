import { setCalendarEventRepository, setCalendarKeyProviderFromEnv } from '@suite/domain-calendar';
import { PostgresCalendarEventRepository } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setCalendarKeyProviderFromEnv();
  
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use Postgres repository when DATABASE_URL is configured
    setCalendarEventRepository(new PostgresCalendarEventRepository(userId));
  }
  // Otherwise, domain uses default in-memory repository (local dev without Postgres)
}
