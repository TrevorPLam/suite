import { setDriveFileRepository, setDriveFolderRepository } from '@suite/domain-drive';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository } from '@suite/db';

export function wireRepositories(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    // Use Postgres repositories when DATABASE_URL is configured
    setDriveFileRepository(new PostgresDriveFileRepository());
    setDriveFolderRepository(new PostgresDriveFolderRepository());
  }
  // Otherwise, domain uses default in-memory repositories (local dev without Postgres)
}
