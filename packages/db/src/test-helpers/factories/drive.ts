import type { DriveFile, DriveFolder } from '../../repositories/drive.js';
import { encryptItem } from '@suite/crypto';

/**
 * Factory function for creating drive file test data.
 * Provides sensible defaults with support for field overrides.
 *
 * @param overrides - Optional partial drive file to override defaults
 * @param encryptionKey - Optional CryptoKey for encrypting the name
 * @returns A drive file object suitable for testing
 *
 * @example
 * ```ts
 * const file = createDriveFile({ name: 'document.pdf', size: 2048 });
 * ```
 *
 * @example with encryption
 * ```ts
 * const key = await generateAESKey(false);
 * const file = await createDriveFile({ name: 'Secret Document' }, key);
 * ```
 */
export async function createDriveFile(
  overrides: Partial<Omit<DriveFile, 'id'>> = {},
  encryptionKey?: CryptoKey
): Promise<Omit<DriveFile, 'id'>> {
  const now = new Date().toISOString();

  let name = overrides.name ?? 'test.txt';

  // Encrypt name if encryption key is provided
  if (encryptionKey) {
    const encrypted = await encryptItem(name, encryptionKey);
    name = JSON.stringify(encrypted);
  }

  const result: Omit<DriveFile, 'id'> = {
    name,
    size: overrides.size ?? 1024,
    createdAt: overrides.createdAt ?? now,
    modifiedAt: overrides.modifiedAt ?? now,
  };

  // Only include optional fields if explicitly provided
  if (overrides.folderId !== undefined) {
    result.folderId = overrides.folderId;
  }
  if (overrides.mimeType !== undefined) {
    result.mimeType = overrides.mimeType;
  }
  if (overrides.blindIndex !== undefined) {
    result.blindIndex = overrides.blindIndex;
  }

  return result;
}

/**
 * Factory function for creating drive folder test data.
 * Provides sensible defaults with support for field overrides.
 *
 * @param overrides - Optional partial drive folder to override defaults
 * @param encryptionKey - Optional CryptoKey for encrypting the name
 * @returns A drive folder object suitable for testing
 *
 * @example
 * ```ts
 * const folder = createDriveFolder({ name: 'Documents', parentId: 'parent-123' });
 * ```
 *
 * @example with encryption
 * ```ts
 * const key = await generateAESKey(false);
 * const folder = await createDriveFolder({ name: 'Secret Folder' }, key);
 * ```
 */
export async function createDriveFolder(
  overrides: Partial<Omit<DriveFolder, 'id'>> = {},
  encryptionKey?: CryptoKey
): Promise<Omit<DriveFolder, 'id'>> {
  const now = new Date().toISOString();

  let name = overrides.name ?? 'Test Folder';

  // Encrypt name if encryption key is provided
  if (encryptionKey) {
    const encrypted = await encryptItem(name, encryptionKey);
    name = JSON.stringify(encrypted);
  }

  const result: Omit<DriveFolder, 'id'> = {
    name,
    createdAt: overrides.createdAt ?? now,
  };

  // Only include parentId if explicitly provided
  if (overrides.parentId !== undefined) {
    result.parentId = overrides.parentId;
  }

  return result;
}
