import { type StorageAdapter } from '@suite/domain-drive';
import { createCircuitBreaker, type CircuitBreaker } from '@suite/shared-kernel';

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
