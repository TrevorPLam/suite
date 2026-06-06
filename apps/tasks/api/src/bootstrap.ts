import { setTaskRepository, setTaskKeyProviderFromEnv, isEncryptionEnabled } from '@suite/domain-tasks';
import { PostgresTaskRepository, createDbClient } from '@suite/db';
import type { TasksEnv } from '@suite/env-config';

export async function wireRepositories(userId: string, tenantId: string, env: TasksEnv & { HYPERDRIVE?: { connectionString: string } }): Promise<void> {
  // Set up encryption key provider from environment
  await setTaskKeyProviderFromEnv();

  // Require encryption in production
  if (env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
    throw new Error(
      'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
      'Generate a key with: openssl rand -base64 32'
    );
  }

  // Use HYPERDRIVE if available (Workers), otherwise DATABASE_URL (Node.js)
  const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
  if (env.HYPERDRIVE) {
    dbEnv.HYPERDRIVE = env.HYPERDRIVE;
  } else if (env.DATABASE_URL) {
    dbEnv.DATABASE_URL = env.DATABASE_URL;
  } else {
    throw new Error('Either HYPERDRIVE or DATABASE_URL must be set');
  }
  const db = createDbClient(dbEnv);
  setTaskRepository(new PostgresTaskRepository(db, userId, tenantId));
}
