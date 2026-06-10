import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setTaskKeyProvider,
  getTaskKeyProvider,
  setTaskKeyProviderFromEnv,
  isEncryptionEnabled,
  sealTask,
  unsealTask,
  sealTasks,
  unsealTasks,
  resetKeyProvider,
  resetInitialized,
} from './tasks-crypto.js';
import { generateAESKey } from '@suite/crypto';
import type { TaskItem } from './tasks.js';

describe('tasks-crypto - encryption activation', () => {
  beforeEach(() => {
    resetKeyProvider();
  });

  afterEach(() => {
    // Reset initialized flag for test isolation
    resetInitialized();
  });
  it('should return false for isEncryptionEnabled by default', () => {
    expect(isEncryptionEnabled()).toBe(false);
  });

  it('should return true for isEncryptionEnabled after setting custom provider', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);
    expect(isEncryptionEnabled()).toBe(true);
  });

  it('should return false for isEncryptionEnabled when ENCRYPTION_KEY is not set', async () => {
    await setTaskKeyProviderFromEnv(undefined);
    expect(isEncryptionEnabled()).toBe(false);
  });

  it('should return true for isEncryptionEnabled when ENCRYPTION_KEY is set', async () => {
    // Generate a valid base64-encoded 256-bit key with extractable flag
    const key = await generateAESKey(true);
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    
    await setTaskKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
  });

  it('should throw error when ENCRYPTION_KEY is invalid', async () => {
    await expect(setTaskKeyProviderFromEnv('invalid-key')).rejects.toThrow('Invalid ENCRYPTION_KEY');
  });

  it('should return the current key provider', () => {
    const provider = getTaskKeyProvider();
    expect(provider).toBeDefined();
    expect(typeof provider).toBe('function');
  });

  it('should actually encrypt when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const task: TaskItem = {
      id: 'test-id',
      title: 'Buy groceries',
      completed: false,
      archived: false,
      dueDate: null,
      priority: 'medium',
      tags: ['shopping', 'urgent'],
    };

    const encrypted = await sealTask(task);

    // Encrypted title should not equal plaintext
    expect(encrypted.encryptedTitle).toBeDefined();
    expect(encrypted.encryptedTitle.ciphertext).not.toBe(task.title);
    expect(encrypted.encryptedTitle.iv).toBeDefined();
    expect(encrypted.encryptedTags).toBeDefined();
  });

  it('should actually decrypt when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const task: TaskItem = {
      id: 'test-id',
      title: 'Buy groceries',
      completed: false,
      archived: false,
      dueDate: null,
      priority: 'medium',
      tags: ['shopping', 'urgent'],
    };

    const encrypted = await sealTask(task);
    const decrypted = await unsealTask(encrypted);

    expect(decrypted.title).toBe(task.title);
    expect(decrypted.id).toBe(task.id);
    expect(decrypted.tags).toEqual(task.tags);
  });

  it('should encrypt task with empty tags', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const task: TaskItem = {
      id: 'test-id',
      title: 'Buy groceries',
      completed: false,
      archived: false,
      dueDate: null,
      priority: 'medium',
      tags: [],
    };

    const encrypted = await sealTask(task);

    expect(encrypted.encryptedTitle).toBeDefined();
    expect(encrypted.encryptedTags).toBeNull();
  });

  it('should decrypt task with empty tags', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const task: TaskItem = {
      id: 'test-id',
      title: 'Buy groceries',
      completed: false,
      archived: false,
      dueDate: null,
      priority: 'medium',
      tags: [],
    };

    const encrypted = await sealTask(task);
    const decrypted = await unsealTask(encrypted);

    expect(decrypted.title).toBe(task.title);
    expect(decrypted.tags).toEqual([]);
  });

  it('should batch encrypt multiple tasks', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const tasks: TaskItem[] = [
      {
        id: 'test-id-1',
        title: 'Buy groceries',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: ['shopping'],
      },
      {
        id: 'test-id-2',
        title: 'Write code',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: ['work'],
      },
    ];

    const encrypted = await sealTasks(tasks);

    expect(encrypted).toHaveLength(2);
    expect(encrypted[0]?.encryptedTitle).toBeDefined();
    expect(encrypted[1]?.encryptedTitle).toBeDefined();
    expect(encrypted[0]?.encryptedTitle.ciphertext).not.toBe(tasks[0]?.title);
    expect(encrypted[1]?.encryptedTitle.ciphertext).not.toBe(tasks[1]?.title);
  });

  it('should batch decrypt multiple tasks', async () => {
    const testKey = await generateAESKey(false);
    setTaskKeyProvider(async () => testKey);

    const tasks: TaskItem[] = [
      {
        id: 'test-id-1',
        title: 'Buy groceries',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: ['shopping'],
      },
      {
        id: 'test-id-2',
        title: 'Write code',
        completed: false,
        archived: false,
        dueDate: null,
        priority: 'medium',
        tags: ['work'],
      },
    ];

    const encrypted = await sealTasks(tasks);
    const decrypted = await unsealTasks(encrypted);

    expect(decrypted).toHaveLength(2);
    expect(decrypted[0]?.title).toBe(tasks[0]?.title);
    expect(decrypted[1]?.title).toBe(tasks[1]?.title);
    expect(decrypted[0]?.tags).toEqual(tasks[0]?.tags);
    expect(decrypted[1]?.tags).toEqual(tasks[1]?.tags);
  });

  it('should handle empty array for batch operations', async () => {
    const encrypted = await sealTasks([]);
    const decrypted = await unsealTasks([]);

    expect(encrypted).toHaveLength(0);
    expect(decrypted).toHaveLength(0);
  });

  it('should not re-import key when called twice with same key', async () => {
    // Generate a valid base64-encoded 256-bit key
    const key = await generateAESKey(true);
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    
    // First call - should import the key
    await setTaskKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
    
    // Second call with same key - should be no-op due to initialized guard
    await setTaskKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
  });
});
