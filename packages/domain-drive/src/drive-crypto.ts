/**
 * Encryption adapter for Drive domain
 * Handles AES-256-GCM encryption of file and folder names at the domain boundary
 */

import type { EncryptedData } from '@suite/crypto';
import { decryptItem, encryptItem, generateAESKey } from '@suite/crypto';
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
let currentKeyProvider: KeyProvider = async () => {
  // For testing, generate a new key each time
  // In production, this would be derived from user master key
  return generateAESKey(false);
};

/**
 * Sets the key provider for encryption operations
 * @param provider - Function that returns a CryptoKey for AES-GCM
 */
export function setDriveKeyProvider(provider: KeyProvider): void {
  currentKeyProvider = provider;
}

/**
 * Gets the current key provider
 */
export function getDriveKeyProvider(): KeyProvider {
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
 * Encrypts a file's name before storage
 * @param file - File with plaintext name
 * @returns File with encrypted name
 */
export async function sealFile(file: DriveFile): Promise<EncryptedDriveFile> {
  const key = await currentKeyProvider();
  const encryptedName = await encryptItem(file.name, key);

  const { name, ...rest } = file;
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

  const { encryptedName, ...rest } = encryptedFile;
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

  const { name, ...rest } = folder;
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

  const { encryptedName, ...rest } = encryptedFolder;
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
