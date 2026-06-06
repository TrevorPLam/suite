import { setTaskRepository, setTaskKeyProviderFromEnv, isEncryptionEnabled } from '@suite/domain-tasks';
import { PostgresTaskRepository, createDbClient } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setTaskKeyProviderFromEnv();
  
  // Require encryption in production
  if (process.env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
      'Generate a key with: openssl rand -base64 32'
    );
  }
  
  // DATABASE_URL is now required - always use Postgres repository
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }
  const db = createDbClient({ DATABASE_URL: process.env.DATABASE_URL });
  // Use default tenant for single-tenant setup (will be updated for multi-tenancy)
  setTaskRepository(new PostgresTaskRepository(db, userId, 'default'));
}
