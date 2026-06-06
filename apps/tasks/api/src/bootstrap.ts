import { setTaskRepository } from '@suite/domain-tasks';
import { PostgresTaskRepository } from '@suite/db';

export function wireRepositories(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use Postgres repository when DATABASE_URL is configured
    setTaskRepository(new PostgresTaskRepository());
  }
  // Otherwise, domain uses default in-memory repository (local dev without Postgres)
}
