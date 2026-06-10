import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setDriveKeyProvider,
  getDriveKeyProvider,
  setDriveKeyProviderFromEnv,
  isEncryptionEnabled,
  sealFile,
  unsealFile,
  sealFolder,
  unsealFolder,
  sealFiles,
  unsealFiles,
  sealFolders,
  unsealFolders,
  resetKeyProvider,
  resetInitialized,
} from './drive-crypto.js';
import { generateAESKey } from '@suite/crypto';
import type { DriveFile, DriveFolder } from './index.js';

describe('drive-crypto - encryption activation', () => {
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
    setDriveKeyProvider(async () => testKey);
    expect(isEncryptionEnabled()).toBe(true);
  });

  it('should return false for isEncryptionEnabled when ENCRYPTION_KEY is not set', async () => {
    await setDriveKeyProviderFromEnv(undefined);
    expect(isEncryptionEnabled()).toBe(false);
  });

  it('should return true for isEncryptionEnabled when ENCRYPTION_KEY is set', async () => {
    // Generate a valid base64-encoded 256-bit key with extractable flag
    const key = await generateAESKey(true);
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    
    await setDriveKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
  });

  it('should throw error when ENCRYPTION_KEY is invalid', async () => {
    await expect(setDriveKeyProviderFromEnv('invalid-key')).rejects.toThrow('Invalid ENCRYPTION_KEY');
  });

  it('should return the current key provider', () => {
    const provider = getDriveKeyProvider();
    expect(provider).toBeDefined();
    expect(typeof provider).toBe('function');
  });

  it('should actually encrypt file when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const file: DriveFile = {
      id: 'test-id',
      name: 'document.pdf',
      size: 1024,
      mimeType: 'application/pdf',
      createdAt: '2025-01-15T10:00:00Z',
      modifiedAt: '2025-01-15T10:00:00Z',
    };

    const encrypted = await sealFile(file);

    // Encrypted name should not equal plaintext
    expect(encrypted.encryptedName).toBeDefined();
    expect(encrypted.encryptedName.ciphertext).not.toBe(file.name);
    expect(encrypted.encryptedName.iv).toBeDefined();
  });

  it('should actually decrypt file when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const file: DriveFile = {
      id: 'test-id',
      name: 'document.pdf',
      size: 1024,
      mimeType: 'application/pdf',
      createdAt: '2025-01-15T10:00:00Z',
      modifiedAt: '2025-01-15T10:00:00Z',
    };

    const encrypted = await sealFile(file);
    const decrypted = await unsealFile(encrypted);

    expect(decrypted.name).toBe(file.name);
    expect(decrypted.id).toBe(file.id);
    expect(decrypted.size).toBe(file.size);
  });

  it('should actually encrypt folder when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folder: DriveFolder = {
      id: 'test-id',
      name: 'Documents',
      createdAt: '2025-01-15T10:00:00Z',
    };

    const encrypted = await sealFolder(folder);

    // Encrypted name should not equal plaintext
    expect(encrypted.encryptedName).toBeDefined();
    expect(encrypted.encryptedName.ciphertext).not.toBe(folder.name);
    expect(encrypted.encryptedName.iv).toBeDefined();
  });

  it('should actually decrypt folder when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folder: DriveFolder = {
      id: 'test-id',
      name: 'Documents',
      createdAt: '2025-01-15T10:00:00Z',
    };

    const encrypted = await sealFolder(folder);
    const decrypted = await unsealFolder(encrypted);

    expect(decrypted.name).toBe(folder.name);
    expect(decrypted.id).toBe(folder.id);
  });

  it('should batch encrypt multiple files', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const files: DriveFile[] = [
      {
        id: 'test-id-1',
        name: 'document.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        createdAt: '2025-01-15T10:00:00Z',
        modifiedAt: '2025-01-15T10:00:00Z',
      },
      {
        id: 'test-id-2',
        name: 'image.png',
        size: 2048,
        mimeType: 'image/png',
        createdAt: '2025-01-15T11:00:00Z',
        modifiedAt: '2025-01-15T11:00:00Z',
      },
    ];

    const encrypted = await sealFiles(files);

    expect(encrypted).toHaveLength(2);
    expect(encrypted[0]?.encryptedName).toBeDefined();
    expect(encrypted[1]?.encryptedName).toBeDefined();
    expect(encrypted[0]?.encryptedName.ciphertext).not.toBe(files[0]?.name);
    expect(encrypted[1]?.encryptedName.ciphertext).not.toBe(files[1]?.name);
  });

  it('should batch decrypt multiple files', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const files: DriveFile[] = [
      {
        id: 'test-id-1',
        name: 'document.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        createdAt: '2025-01-15T10:00:00Z',
        modifiedAt: '2025-01-15T10:00:00Z',
      },
      {
        id: 'test-id-2',
        name: 'image.png',
        size: 2048,
        mimeType: 'image/png',
        createdAt: '2025-01-15T11:00:00Z',
        modifiedAt: '2025-01-15T11:00:00Z',
      },
    ];

    const encrypted = await sealFiles(files);
    const decrypted = await unsealFiles(encrypted);

    expect(decrypted).toHaveLength(2);
    expect(decrypted[0]?.name).toBe(files[0]?.name);
    expect(decrypted[1]?.name).toBe(files[1]?.name);
    expect(decrypted[0]?.id).toBe(files[0]?.id);
    expect(decrypted[1]?.id).toBe(files[1]?.id);
  });

  it('should batch encrypt multiple folders', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folders: DriveFolder[] = [
      {
        id: 'test-id-1',
        name: 'Documents',
        createdAt: '2025-01-15T10:00:00Z',
      },
      {
        id: 'test-id-2',
        name: 'Images',
        createdAt: '2025-01-15T11:00:00Z',
      },
    ];

    const encrypted = await sealFolders(folders);

    expect(encrypted).toHaveLength(2);
    expect(encrypted[0]?.encryptedName).toBeDefined();
    expect(encrypted[1]?.encryptedName).toBeDefined();
    expect(encrypted[0]?.encryptedName.ciphertext).not.toBe(folders[0]?.name);
    expect(encrypted[1]?.encryptedName.ciphertext).not.toBe(folders[1]?.name);
  });

  it('should batch decrypt multiple folders', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folders: DriveFolder[] = [
      {
        id: 'test-id-1',
        name: 'Documents',
        createdAt: '2025-01-15T10:00:00Z',
      },
      {
        id: 'test-id-2',
        name: 'Images',
        createdAt: '2025-01-15T11:00:00Z',
      },
    ];

    const encrypted = await sealFolders(folders);
    const decrypted = await unsealFolders(encrypted);

    expect(decrypted).toHaveLength(2);
    expect(decrypted[0]?.name).toBe(folders[0]?.name);
    expect(decrypted[1]?.name).toBe(folders[1]?.name);
    expect(decrypted[0]?.id).toBe(folders[0]?.id);
    expect(decrypted[1]?.id).toBe(folders[1]?.id);
  });

  it('should handle empty array for batch file operations', async () => {
    const encrypted = await sealFiles([]);
    const decrypted = await unsealFiles([]);

    expect(encrypted).toHaveLength(0);
    expect(decrypted).toHaveLength(0);
  });

  it('should handle empty array for batch folder operations', async () => {
    const encrypted = await sealFolders([]);
    const decrypted = await unsealFolders([]);

    expect(encrypted).toHaveLength(0);
    expect(decrypted).toHaveLength(0);
  });

  it('should not re-import key when called twice with same key', async () => {
    // Generate a valid base64-encoded 256-bit key
    const key = await generateAESKey(true);
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    
    // First call - should import the key
    await setDriveKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
    
    // Second call with same key - should be no-op due to initialized guard
    await setDriveKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
  });
});
