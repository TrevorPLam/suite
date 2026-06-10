/**
 * Encryption adapter for Tasks domain
 * Handles AES-256-GCM encryption of task titles and tags at the domain boundary
 */

import type { EncryptedData } from '@suite/crypto';
import { decryptItem, encryptItem, generateAESKey, generateBlindIndex, generateSalt } from '@suite/crypto';
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
let initialized = false;

// Index key provider for blind indexing
let currentIndexKey: CryptoKey | null = null;
let _currentIndexKeySalt: string | null = null;

/**
 * Sets the index key for blind indexing operations
 * @param key - HMAC key for blind index generation
 * @param salt - Salt used to derive the key (for reference)
 */
export function setTaskIndexKey(key: CryptoKey, salt: string): void {
  currentIndexKey = key;
  _currentIndexKeySalt = salt;
}

/**
 * Gets the current index key
 * @returns The current index key or null if not set
 */
export function getTaskIndexKey(): CryptoKey | null {
  return currentIndexKey;
}

/**
 * Sets the index key from ENCRYPTION_KEY environment variable
 * Derives a separate HMAC key for blind indexing from the encryption key
 * @throws Error if ENCRYPTION_KEY is set but invalid
 */
export async function setTaskIndexKeyFromEnv(): Promise<void> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    // No key set, keep null (blind indexing disabled)
    return;
  }
  
  try {
    // Decode base64 key
    const keyData = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
    
    // Assert byte length is exactly 32 bytes for AES-256
    if (keyData.byteLength !== 32) {
      throw new Error('Invalid ENCRYPTION_KEY: must decode to exactly 32 bytes');
    }
    
    // Generate a salt for index key derivation
    const salt = await generateSalt();
    const saltString = new TextDecoder().decode(salt);
    
    // Import the encryption key as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive an HMAC key for blind indexing (separate from encryption key)
    const indexKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(saltString),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'HMAC',
        hash: 'SHA-256',
        length: 256
      },
      false,
      ['sign']
    );
    
    setTaskIndexKey(indexKey, saltString);
  } catch (error) {
    throw new Error(`Failed to derive index key from ENCRYPTION_KEY: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Resets the index key to null (for testing)
 */
export function resetIndexKey(): void {
  currentIndexKey = null;
  _currentIndexKeySalt = null;
}

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
 * @param encryptionKey - Base64-encoded 32-byte encryption key (optional)
 * @throws Error if encryptionKey is set but invalid
 */
export async function setTaskKeyProviderFromEnv(encryptionKey?: string): Promise<void> {
  // Guard against double-initialization
  if (initialized) {
    return;
  }
  
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
    initialized = true;
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
  resetIndexKey();
}

/**
 * Resets the initialized flag (for test teardown only)
 */
export function resetInitialized(): void {
  initialized = false;
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

/**
 * Generates a blind index for a task title
 * @param title - The task title to index
 * @returns Hex-encoded HMAC-SHA256 token, or null if index key is not set
 */
export async function generateTaskBlindIndex(title: string): Promise<string | null> {
  const indexKey = getTaskIndexKey();
  if (!indexKey) {
    return null;
  }
  return await generateBlindIndex(title, indexKey);
}
