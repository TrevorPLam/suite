import { setTaskRepository, setTaskKeyProviderFromEnv } from '@suite/domain-tasks';
import { PostgresTaskRepository } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setTaskKeyProviderFromEnv();
  
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use Postgres repository when DATABASE_URL is configured
    setTaskRepository(new PostgresTaskRepository(userId));
  }
  // Otherwise, domain uses default in-memory repository (local dev without Postgres)
}
