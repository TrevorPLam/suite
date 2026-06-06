import { setDriveFileRepository, setDriveFolderRepository, setDriveKeyProviderFromEnv } from '@suite/domain-drive';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setDriveKeyProviderFromEnv();
  
  // DATABASE_URL is now required - always use Postgres repositories
  setDriveFileRepository(new PostgresDriveFileRepository(userId));
  setDriveFolderRepository(new PostgresDriveFolderRepository(userId));
}
