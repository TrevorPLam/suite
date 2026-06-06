import { setTaskRepository, setTaskKeyProviderFromEnv } from '@suite/domain-tasks';
import { PostgresTaskRepository } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setTaskKeyProviderFromEnv();
  
  // DATABASE_URL is now required - always use Postgres repository
  setTaskRepository(new PostgresTaskRepository(userId));
}
