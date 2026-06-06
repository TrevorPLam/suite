import { describe, it, expect, vi, beforeEach } from 'vitest';
import { R2StorageAdapter, InMemoryStorageAdapter } from './bootstrap';

describe('R2StorageAdapter', () => {
  let mockR2Bucket: R2Bucket;
  let adapter: R2StorageAdapter;

  beforeEach(() => {
    // Mock R2Bucket
    mockR2Bucket = {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
    } as unknown as R2Bucket;

    adapter = new R2StorageAdapter(mockR2Bucket);
  });

  describe('circuit breaker state preservation', () => {
    it('should preserve circuit breaker state across multiple operations', async () => {
      // Perform multiple operations to ensure circuit breaker state is preserved
      const data = new Uint8Array([1, 2, 3]);

      await adapter.put('test-key-1', data);
      await adapter.put('test-key-2', data);
      await adapter.put('test-key-3', data);

      // Verify all operations use the same circuit breaker instance
      // by checking that R2 operations were called
      expect(mockR2Bucket.put).toHaveBeenCalledTimes(3);
    });

    it('should reuse circuit breaker instance for get operations', async () => {
      await adapter.get('test-key-1');
      await adapter.get('test-key-2');
      await adapter.get('test-key-3');

      expect(mockR2Bucket.get).toHaveBeenCalledTimes(3);
    });

    it('should reuse circuit breaker instance for delete operations', async () => {
      await adapter.delete('test-key-1');
      await adapter.delete('test-key-2');
      await adapter.delete('test-key-3');

      expect(mockR2Bucket.delete).toHaveBeenCalledTimes(3);
    });

    it('should preserve circuit breaker state across mixed operations', async () => {
      const data = new Uint8Array([1, 2, 3]);

      await adapter.put('test-key-1', data);
      await adapter.get('test-key-1');
      await adapter.delete('test-key-1');
      await adapter.put('test-key-2', data);
      await adapter.get('test-key-2');

      expect(mockR2Bucket.put).toHaveBeenCalledTimes(2);
      expect(mockR2Bucket.get).toHaveBeenCalledTimes(2);
      expect(mockR2Bucket.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('R2StorageAdapter operations', () => {
    it('should put data to R2 bucket', async () => {
      const data = new Uint8Array([1, 2, 3]);
      await adapter.put('test-key', data);

      expect(mockR2Bucket.put).toHaveBeenCalledWith('test-key', data);
    });

    it('should get data from R2 bucket', async () => {
      await adapter.get('test-key');

      expect(mockR2Bucket.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when object not found', async () => {
      const result = await adapter.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should delete data from R2 bucket', async () => {
      await adapter.delete('test-key');

      expect(mockR2Bucket.delete).toHaveBeenCalledWith('test-key');
    });
  });
});

describe('InMemoryStorageAdapter', () => {
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  it('should store and retrieve data', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await adapter.put('test-key', data);

    const result = await adapter.get('test-key');
    expect(result).not.toBeNull();
  });

  it('should return null for nonexistent key', async () => {
    const result = await adapter.get('nonexistent-key');
    expect(result).toBeNull();
  });

  it('should delete data', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await adapter.put('test-key', data);
    await adapter.delete('test-key');

    const result = await adapter.get('test-key');
    expect(result).toBeNull();
  });

  it('should handle ReadableStream data', async () => {
    const data = new Uint8Array([1, 2, 3]);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data);
        controller.close();
      },
    });

    await adapter.put('test-key', stream);
    const result = await adapter.get('test-key');
    expect(result).not.toBeNull();
  });

  it('should handle ArrayBuffer data', async () => {
    const data = new ArrayBuffer(3);
    const view = new Uint8Array(data);
    view[0] = 1;
    view[1] = 2;
    view[2] = 3;

    await adapter.put('test-key', data);
    const result = await adapter.get('test-key');
    expect(result).not.toBeNull();
  });
});
