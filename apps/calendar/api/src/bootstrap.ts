import { setCalendarEventRepository, setCalendarKeyProviderFromEnv, isEncryptionEnabled } from '@suite/domain-calendar';
import { PostgresCalendarEventRepository, createDbClient } from '@suite/db';
import type { CalendarEnv } from '@suite/env-config';

export async function wireRepositories(userId: string, env: CalendarEnv): Promise<void> {
  // Set up encryption key provider from environment
  await setCalendarKeyProviderFromEnv();

  // Require encryption in production
  if (env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
      'Generate a key with: openssl rand -base64 32'
    );
  }

  // DATABASE_URL is now required - always use Postgres repository
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }
  const db = createDbClient({ DATABASE_URL: env.DATABASE_URL });
  // Use default tenant for single-tenant setup (will be updated for multi-tenancy)
  setCalendarEventRepository(new PostgresCalendarEventRepository(db, userId, 'default'));
}
