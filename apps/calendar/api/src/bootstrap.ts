import { setCalendarEventRepository, setCalendarKeyProviderFromEnv } from '@suite/domain-calendar';
import { PostgresCalendarEventRepository } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setCalendarKeyProviderFromEnv();
  
  // DATABASE_URL is now required - always use Postgres repository
  setCalendarEventRepository(new PostgresCalendarEventRepository(userId));
}
