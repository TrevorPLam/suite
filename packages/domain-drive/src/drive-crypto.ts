/**
 * Encryption adapter for Drive domain
 * Handles AES-256-GCM encryption of file and folder names at the domain boundary
 */

import type { EncryptedData } from '@suite/crypto';
import { decryptItem, encryptItem, generateAESKey, generateBlindIndex, generateSalt } from '@suite/crypto';
import type { DriveFile, DriveFolder } from './index.js';

export type EncryptedDriveFile = Omit<DriveFile, 'name'> & {
  encryptedName: EncryptedData;
};

export type EncryptedDriveFolder = Omit<DriveFolder, 'name'> & {
  encryptedName: EncryptedData;
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

// Flag to track if a custom key provider has been set
let customKeyProviderSet = false;

// Index key provider for blind indexing
let currentIndexKey: CryptoKey | null = null;
let _currentIndexKeySalt: string | null = null;

/**
 * Sets the index key for blind indexing operations
 * @param key - HMAC key for blind index generation
 * @param salt - Salt used to derive the key (for reference)
 */
export function setDriveIndexKey(key: CryptoKey, salt: string): void {
  currentIndexKey = key;
  _currentIndexKeySalt = salt;
}

/**
 * Gets the current index key
 * @returns The current index key or null if not set
 */
export function getDriveIndexKey(): CryptoKey | null {
  return currentIndexKey;
}

/**
 * Sets the index key from ENCRYPTION_KEY environment variable
 * Derives a separate HMAC key for blind indexing from the encryption key
 * @throws Error if ENCRYPTION_KEY is set but invalid
 */
export async function setDriveIndexKeyFromEnv(): Promise<void> {
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
    
    setDriveIndexKey(indexKey, saltString);
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
export function setDriveKeyProvider(provider: KeyProvider): void {
  currentKeyProvider = provider;
  customKeyProviderSet = true;
}

/**
 * Gets the current key provider
 */
export function getDriveKeyProvider(): KeyProvider {
  return currentKeyProvider;
}

/**
 * Sets the key provider from ENCRYPTION_KEY environment variable
 * @throws Error if ENCRYPTION_KEY is set but invalid
 */
export async function setDriveKeyProviderFromEnv(): Promise<void> {
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
    customKeyProviderSet = true;
  } catch (error) {
    throw new Error(`Invalid ENCRYPTION_KEY: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if encryption is enabled (custom key provider was set)
 */
export function isEncryptionEnabled(): boolean {
  return customKeyProviderSet;
}

/**
 * Resets the key provider to default (for testing)
 */
export function resetKeyProvider(): void {
  currentKeyProvider = defaultKeyProvider;
  customKeyProviderSet = false;
  resetIndexKey();
}

/**
 * Encrypts a file's name before storage
 * @param file - File with plaintext name
 * @returns File with encrypted name
 */
export async function sealFile(file: DriveFile): Promise<EncryptedDriveFile> {
  const key = await currentKeyProvider();
  const encryptedName = await encryptItem(file.name, key);

  const { name: _name, ...rest } = file;
  return {
    ...rest,
    encryptedName,
  };
}

/**
 * Decrypts a file's name after retrieval
 * @param encryptedFile - File with encrypted name
 * @returns File with plaintext name
 */
export async function unsealFile(encryptedFile: EncryptedDriveFile): Promise<DriveFile> {
  const key = await currentKeyProvider();
  const name = await decryptItem(encryptedFile.encryptedName, key);

  const { encryptedName: _encryptedName, ...rest } = encryptedFile;
  return {
    ...rest,
    name,
  };
}

/**
 * Encrypts a folder's name before storage
 * @param folder - Folder with plaintext name
 * @returns Folder with encrypted name
 */
export async function sealFolder(folder: DriveFolder): Promise<EncryptedDriveFolder> {
  const key = await currentKeyProvider();
  const encryptedName = await encryptItem(folder.name, key);

  const { name: _name, ...rest } = folder;
  return {
    ...rest,
    encryptedName,
  };
}

/**
 * Decrypts a folder's name after retrieval
 * @param encryptedFolder - Folder with encrypted name
 * @returns Folder with plaintext name
 */
export async function unsealFolder(encryptedFolder: EncryptedDriveFolder): Promise<DriveFolder> {
  const key = await currentKeyProvider();
  const name = await decryptItem(encryptedFolder.encryptedName, key);

  const { encryptedName: _encryptedName, ...rest } = encryptedFolder;
  return {
    ...rest,
    name,
  };
}

/**
 * Batch encrypts multiple files
 * @param files - Files with plaintext names
 * @returns Files with encrypted names
 */
export async function sealFiles(files: DriveFile[]): Promise<EncryptedDriveFile[]> {
  return Promise.all(files.map(sealFile));
}

/**
 * Batch decrypts multiple files
 * @param encryptedFiles - Files with encrypted names
 * @returns Files with plaintext names
 */
export async function unsealFiles(encryptedFiles: EncryptedDriveFile[]): Promise<DriveFile[]> {
  return Promise.all(encryptedFiles.map(unsealFile));
}

/**
 * Batch encrypts multiple folders
 * @param folders - Folders with plaintext names
 * @returns Folders with encrypted names
 */
export async function sealFolders(folders: DriveFolder[]): Promise<EncryptedDriveFolder[]> {
  return Promise.all(folders.map(sealFolder));
}

/**
 * Batch decrypts multiple folders
 * @param encryptedFolders - Folders with encrypted names
 * @returns Folders with plaintext names
 */
export async function unsealFolders(encryptedFolders: EncryptedDriveFolder[]): Promise<DriveFolder[]> {
  return Promise.all(encryptedFolders.map(unsealFolder));
}

/**
 * Generates a blind index for a file or folder name
 * @param name - The file or folder name to index
 * @returns Hex-encoded HMAC-SHA256 token, or null if index key is not set
 */
export async function generateDriveBlindIndex(name: string): Promise<string | null> {
  const indexKey = getDriveIndexKey();
  if (!indexKey) {
    return null;
  }
  return await generateBlindIndex(name, indexKey);
}
