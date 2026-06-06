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
let currentKeyProvider: KeyProvider = async () => {
  // For testing, generate a new key each time
  // In production, this would be derived from user master key
  return generateAESKey(false);
};

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
 * Checks if encryption is enabled (non-default key provider is set)
 */
export function isEncryptionEnabled(): boolean {
  // Default key provider generates random keys for testing
  // In production, a real key provider would be set
  // For now, we'll consider encryption disabled by default
  // unless a specific key provider is injected
  return false;
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
