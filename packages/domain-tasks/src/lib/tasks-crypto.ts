/**
 * Encryption adapter for Tasks domain
 * Handles AES-256-GCM encryption of task titles and tags at the domain boundary
 */

import type { EncryptedData } from '@suite/crypto';
import { decryptItem, encryptItem, generateAESKey } from '@suite/crypto';
import type { TaskItem } from './tasks.js';

export type EncryptedTaskItem = Omit<TaskItem, 'title' | 'tags'> & {
  encryptedTitle: EncryptedData;
  encryptedTags: EncryptedData | null; // null if tags array is empty
};

// Key provider function type - allows injection of encryption key
export type KeyProvider = () => Promise<CryptoKey>;

// Default key provider for testing - generates a fixed test key
const defaultKeyProvider: KeyProvider = async () => {
  // For testing, generate a new key each time
  // In production, this would be derived from user master key
  return generateAESKey(false);
};

let currentKeyProvider: KeyProvider = defaultKeyProvider;

/**
 * Sets the key provider for encryption operations
 * @param provider - Function that returns a CryptoKey for AES-GCM
 */
export function setTaskKeyProvider(provider: KeyProvider): void {
  currentKeyProvider = provider;
}

/**
 * Gets the current key provider
 */
export function getTaskKeyProvider(): KeyProvider {
  return currentKeyProvider;
}

/**
 * Sets the key provider from ENCRYPTION_KEY environment variable
 * @throws Error if ENCRYPTION_KEY is set but invalid
 */
export async function setTaskKeyProviderFromEnv(): Promise<void> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    // No key set, keep default provider (encryption disabled)
    return;
  }
  
  try {
    // Decode base64 key
    const keyData = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
    
    // Assert byte length is exactly 32 bytes for AES-256
    if (keyData.byteLength !== 32) {
      throw new Error('Invalid ENCRYPTION_KEY: must decode to exactly 32 bytes');
    }
    
    // Import as AES-GCM key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Set provider that returns this key
    currentKeyProvider = async () => key;
  } catch (error) {
    throw new Error(`Invalid ENCRYPTION_KEY: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if encryption is enabled (non-default key provider is set)
 */
export function isEncryptionEnabled(): boolean {
  return currentKeyProvider !== defaultKeyProvider;
}

/**
 * Resets the key provider to default (for testing)
 */
export function resetKeyProvider(): void {
  currentKeyProvider = defaultKeyProvider;
}

/**
 * Encrypts a task's title and tags before storage
 * @param task - Task with plaintext title and tags
 * @returns Task with encrypted title and tags
 */
export async function sealTask(task: TaskItem): Promise<EncryptedTaskItem> {
  const key = await currentKeyProvider();
  const encryptedTitle = await encryptItem(task.title, key);
  
  // Encrypt tags as JSON string, or null if empty
  const encryptedTags = task.tags.length > 0
    ? await encryptItem(JSON.stringify(task.tags), key)
    : null;

  const { title: _title, tags: _tags, ...rest } = task;
  return {
    ...rest,
    encryptedTitle,
    encryptedTags,
  };
}

/**
 * Decrypts a task's title and tags after retrieval
 * @param encryptedTask - Task with encrypted title and tags
 * @returns Task with plaintext title and tags
 */
export async function unsealTask(encryptedTask: EncryptedTaskItem): Promise<TaskItem> {
  const key = await currentKeyProvider();
  const title = await decryptItem(encryptedTask.encryptedTitle, key);
  
  // Decrypt tags from JSON string, or empty array if null
  const tags = encryptedTask.encryptedTags
    ? JSON.parse(await decryptItem(encryptedTask.encryptedTags, key))
    : [];

  const { encryptedTitle: _encryptedTitle, encryptedTags: _encryptedTags, ...rest } = encryptedTask;
  return {
    ...rest,
    title,
    tags,
  };
}

/**
 * Batch encrypts multiple tasks
 * @param tasks - Tasks with plaintext titles and tags
 * @returns Tasks with encrypted titles and tags
 */
export async function sealTasks(tasks: TaskItem[]): Promise<EncryptedTaskItem[]> {
  return Promise.all(tasks.map(sealTask));
}

/**
 * Batch decrypts multiple tasks
 * @param encryptedTasks - Tasks with encrypted titles and tags
 * @returns Tasks with plaintext titles and tags
 */
export async function unsealTasks(encryptedTasks: EncryptedTaskItem[]): Promise<TaskItem[]> {
  return Promise.all(encryptedTasks.map(unsealTask));
}
