import { setDriveFileRepository, setDriveFolderRepository, setDriveKeyProviderFromEnv, setDriveStorage, type StorageAdapter } from '@suite/domain-drive';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository } from '@suite/db';

// R2 Storage Adapter for Cloudflare R2
class R2StorageAdapter implements StorageAdapter {
  private r2Bucket: R2Bucket;

  constructor(r2Bucket: R2Bucket) {
    this.r2Bucket = r2Bucket;
  }

  async put(key: string, data: ReadableStream | Uint8Array | ArrayBuffer): Promise<void> {
    await this.r2Bucket.put(key, data);
  }

  async get(key: string): Promise<ReadableStream | null> {
    const object = await this.r2Bucket.get(key);
    if (!object) {
      return null;
    }
    return object.body;
  }

  async delete(key: string): Promise<void> {
    await this.r2Bucket.delete(key);
  }
}

// In-memory storage adapter for development/testing
class InMemoryStorageAdapter implements StorageAdapter {
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

export async function wireRepositories(userId: string, r2Bucket?: R2Bucket): Promise<void> {
  // Set up encryption key provider from environment
  await setDriveKeyProviderFromEnv();

  // Set up storage adapter
  if (r2Bucket) {
    const adapter = new R2StorageAdapter(r2Bucket);
    setDriveStorage(adapter);
    setR2Adapter(adapter);
  } else {
    // Fall back to in-memory storage for development
    setDriveStorage(new InMemoryStorageAdapter());
  }

  // DATABASE_URL is now required - always use Postgres repositories
  setDriveFileRepository(new PostgresDriveFileRepository(userId));
  setDriveFolderRepository(new PostgresDriveFolderRepository(userId));
}
