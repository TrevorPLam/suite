import { setDriveFileRepository, setDriveFolderRepository, setDriveKeyProviderFromEnv } from '@suite/domain-drive';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setDriveKeyProviderFromEnv();
  
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use Postgres repositories when DATABASE_URL is configured
    setDriveFileRepository(new PostgresDriveFileRepository(userId));
    setDriveFolderRepository(new PostgresDriveFolderRepository(userId));
  }
  // Otherwise, domain uses default in-memory repositories (local dev without Postgres)
}
