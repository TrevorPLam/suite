import { setDriveFileRepository, setDriveFolderRepository, setDriveKeyProviderFromEnv, setDriveStorage, isEncryptionEnabled, type StorageAdapter, InMemoryDriveFileRepository, InMemoryDriveFolderRepository } from '@suite/domain-drive';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository, createDbClient } from '@suite/db';
import { createCircuitBreaker, type CircuitBreaker } from '@suite/shared-kernel';
import type { DriveEnv } from '@suite/env-config';

// R2 Storage Adapter for Cloudflare R2
export class R2StorageAdapter implements StorageAdapter {
  private r2Bucket: R2Bucket;
  private circuitBreaker: CircuitBreaker;

  constructor(r2Bucket: R2Bucket) {
    this.r2Bucket = r2Bucket;
    this.circuitBreaker = createCircuitBreaker({
      failureThreshold: 5,
      timeoutMs: 30000,
      successThreshold: 2,
      logger: (message, data) => console.log(`[R2 Circuit Breaker] ${message}`, data),
    });
  }

  async put(key: string, data: ReadableStream | Uint8Array | ArrayBuffer): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      await this.r2Bucket.put(key, data);
    });
  }

  async get(key: string): Promise<ReadableStream | null> {
    return this.circuitBreaker.execute(async () => {
      const object = await this.r2Bucket.get(key);
      if (!object) {
        return null;
      }
      return object.body;
    });
  }

  async delete(key: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      await this.r2Bucket.delete(key);
    });
  }
}

// In-memory storage adapter for development/testing
export class InMemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, Uint8Array>();

  async put(key: string, data: ReadableStream | Uint8Array | ArrayBuffer): Promise<void> {
    let bytes: Uint8Array;
    if (data instanceof ReadableStream) {
      const reader = data.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      bytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else {
      bytes = data;
    }
    this.storage.set(key, bytes);
  }

  async get(key: string): Promise<ReadableStream | null> {
    const bytes = this.storage.get(key);
    if (!bytes) {
      return null;
    }
    return new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

let r2Adapter: R2StorageAdapter | null = null;

export function setR2Adapter(adapter: R2StorageAdapter): void {
  r2Adapter = adapter;
}

export function getR2Adapter(): R2StorageAdapter | null {
  return r2Adapter;
}

export async function wireRepositories(userId: string | null, env: DriveEnv & { HYPERDRIVE?: { connectionString: string } }, r2Bucket?: R2Bucket): Promise<void> {
  try {
    // Set up encryption key provider from environment
    await setDriveKeyProviderFromEnv();

    // Require encryption in production
    if (env.NODE_ENV === 'production' && !isEncryptionEnabled()) {
      throw new Error(
        'ENCRYPTION_KEY must be set in production. Set it via wrangler secret put ENCRYPTION_KEY. ' +
        'Generate a key with: openssl rand -base64 32'
      );
    }

    // Set up storage adapter
    if (r2Bucket) {
      const adapter = new R2StorageAdapter(r2Bucket);
      setDriveStorage(adapter);
      setR2Adapter(adapter);
    } else {
      // Fall back to in-memory storage for development
      setDriveStorage(new InMemoryStorageAdapter());
    }

    // Use Postgres repositories if HYPERDRIVE or DATABASE_URL is set and userId is provided, otherwise use in-memory repositories
    if (userId && (env.HYPERDRIVE || env.DATABASE_URL)) {
      const dbEnv: { HYPERDRIVE?: { connectionString: string }; DATABASE_URL?: string } = {};
      if (env.HYPERDRIVE) {
        dbEnv.HYPERDRIVE = env.HYPERDRIVE;
      } else if (env.DATABASE_URL) {
        dbEnv.DATABASE_URL = env.DATABASE_URL;
      }
      const db = createDbClient(dbEnv);
      // Use default tenant for single-tenant setup (will be updated for multi-tenancy)
      setDriveFileRepository(new PostgresDriveFileRepository(db, userId, 'default'));
      setDriveFolderRepository(new PostgresDriveFolderRepository(db, userId, 'default'));
    } else {
      // Use in-memory repositories for testing or when userId is not available
      setDriveFileRepository(new InMemoryDriveFileRepository());
      setDriveFolderRepository(new InMemoryDriveFolderRepository());
    }
  } catch (error) {
    // If repository wiring fails, fall back to in-memory repositories
    console.error('Failed to wire repositories, falling back to in-memory:', error);
    setDriveFileRepository(new InMemoryDriveFileRepository());
    setDriveFolderRepository(new InMemoryDriveFolderRepository());
  }
}
