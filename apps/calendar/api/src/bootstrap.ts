import { setCalendarEventRepository, setCalendarKeyProviderFromEnv, isEncryptionEnabled } from '@suite/domain-calendar';
import { PostgresCalendarEventRepository } from '@suite/db';

export async function wireRepositories(userId: string): Promise<void> {
  // Set up encryption key provider from environment
  await setCalendarKeyProviderFromEnv();
  
  // Require encryption in production
  if (process.env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
      'Generate a key with: openssl rand -base64 32'
    );
  }
  
  // DATABASE_URL is now required - always use Postgres repository
  setCalendarEventRepository(new PostgresCalendarEventRepository(userId));
}
