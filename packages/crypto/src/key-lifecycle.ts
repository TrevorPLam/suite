/**
 * Key Lifecycle Management
 *
 * This module provides utilities for managing cryptographic key lifecycle,
 * including key versioning, rotation, and crypto-shredding (secure deletion).
 *
 * Design Principles:
 * - Keys must have version identifiers
 * - Keys must have metadata (creation, expiration, status)
 * - Deprecated keys must be marked but not immediately deleted
 * - Crypto-shredding must securely delete keys
 * - Support multiple active keys during rotation
 *
 * References:
 * - NIST SP 800-57: Key Management
 * - Google Tink Keyset Pattern
 * - Cloud Security Alliance: Key Management Lifecycle Best Practices
 */

import { secureZeroize } from './memory.js';
import type { KeyMetadata, KeyStatus, KeyUsage, AlgorithmIdentifier } from './agility.js';
import { logKeyCreated, logKeyUsed, logKeyDeleted, logKeyRotated } from './audit.js';

/**
 * Re-export KeyMetadata and related types from agility module
 * for convenience and to maintain a single source of truth.
 */
export type { KeyMetadata, KeyStatus, KeyUsage };

/**
 * Create key metadata for a new key
 *
 * Generates a unique key ID and initializes metadata with creation timestamp,
 * version, and status. Keys start as active and version 1.
 *
 * @param algorithm - Algorithm identifier (e.g., 'AES-256-GCM-v1')
 * @param usage - Array of key usage types (encrypt, decrypt, sign, verify, derive)
 * @param keySize - Key size in bits
 * @param expiresAt - Optional expiration timestamp (null for non-expiring keys)
 * @param isPostQuantum - Whether this is a post-quantum algorithm key
 * @returns KeyMetadata object with initialized fields
 *
 * @example
 * ```ts
 * const metadata = createKeyMetadata(
 *   'AES-256-GCM-v1',
 *   ['encrypt', 'decrypt'],
 *   256,
 *   new Date('2026-12-31'),
 *   false
 * );
 * ```
 */
export function createKeyMetadata(
  algorithm: AlgorithmIdentifier,
  usage: KeyUsage[],
  keySize: number,
  expiresAt: Date | null = null,
  isPostQuantum: boolean = false
): KeyMetadata {
  const metadata: KeyMetadata = {
    id: crypto.randomUUID(),
    version: 1,
    algorithm,
    status: 'active' as KeyStatus,
    usage,
    createdAt: new Date(),
    expiresAt,
    isPrimary: false, // Will be set when added to keyset
    keySize,
    isPostQuantum,
  };

  // Log key creation event
  logKeyCreated(metadata.id, algorithm, keySize, {
    isPostQuantum,
    expiresAt: expiresAt?.toISOString(),
  });

  return metadata;
}

/**
 * Increment key version for rotation
 *
 * Creates a new version number by incrementing the current version.
 * Versioning is monotonic - versions only increase.
 *
 * @param currentVersion - Current key version
 * @returns Next version number
 *
 * @example
 * ```ts
 * const nextVersion = incrementVersion(1); // Returns 2
 * ```
 */
export function incrementVersion(currentVersion: number): number {
  if (currentVersion < 0) {
    throw new Error('Key version cannot be negative');
  }
  return currentVersion + 1;
}

/**
 * Rotate a key by creating a new version
 *
 * Creates a new key metadata with incremented version while preserving
 * the original key's algorithm and usage. The old key is marked as
 * deprecated but remains available for decryption during transition.
 *
 * @param oldKey - Existing key metadata to rotate
 * @param newKeyMaterial - Optional new key material (if different algorithm)
 * @returns New key metadata with incremented version
 *
 * @example
 * ```ts
 * const oldKey = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
 * const newKey = rotateKey(oldKey);
 * console.log(newKey.version); // 2
 * console.log(oldKey.status); // 'disabled'
 * ```
 */
export function rotateKey(oldKey: KeyMetadata, newKeyMaterial?: KeyMetadata): KeyMetadata {
  // Mark old key as disabled (not deleted, but no longer primary)
  oldKey.status = 'disabled';

  let newKey: KeyMetadata;

  // If new key material provided, use it; otherwise create new version of same key
  if (newKeyMaterial) {
    newKey = {
      ...newKeyMaterial,
      id: crypto.randomUUID(),
      version: incrementVersion(oldKey.version),
      status: 'active',
      createdAt: new Date(),
      isPrimary: true, // New key becomes primary
    };
  } else {
    // Create new version of same key
    newKey = {
      ...oldKey,
      id: crypto.randomUUID(),
      version: incrementVersion(oldKey.version),
      status: 'active',
      createdAt: new Date(),
      isPrimary: true,
    };
  }

  // Log key rotation event
  logKeyRotated(oldKey.id, newKey.id, {
    oldVersion: oldKey.version,
    newVersion: newKey.version,
    algorithm: newKey.algorithm,
  });

  return newKey;
}

/**
 * Get the active key from a list of keys
 *
 * Returns the key with status 'active' and isPrimary: true.
 * If no primary key is found, returns the first active key.
 *
 * @param keys - Array of key metadata
 * @returns Active key metadata or null if no active key exists
 *
 * @example
 * ```ts
 * const keys = [key1, key2, key3];
 * const activeKey = getActiveKey(keys);
 * ```
 */
export function getActiveKey(keys: KeyMetadata[]): KeyMetadata | null {
  // First try to find primary key
  const primaryKey = keys.find((k) => k.isPrimary && k.status === 'active');
  if (primaryKey) {
    // Log key usage event
    logKeyUsed(primaryKey.id, 'getActiveKey', primaryKey.algorithm, {
      version: primaryKey.version,
      isPrimary: primaryKey.isPrimary,
    });
    return primaryKey;
  }

  // Fallback to first active key
  const activeKey = keys.find((k) => k.status === 'active');
  if (activeKey) {
    // Log key usage event
    logKeyUsed(activeKey.id, 'getActiveKey', activeKey.algorithm, {
      version: activeKey.version,
      isPrimary: activeKey.isPrimary,
    });
  }
  return activeKey || null;
}

/**
 * Deactivate a key by changing its status
 *
 * Marks a key as 'disabled' so it can no longer be used for new operations.
 * The key remains available for decryption of existing data.
 *
 * @param key - Key metadata to deactivate
 * @returns Updated key metadata with status 'disabled'
 *
 * @example
 * ```ts
 * const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
 * const deactivatedKey = deactivateKey(key);
 * console.log(deactivatedKey.status); // 'disabled'
 * ```
 */
export function deactivateKey(key: KeyMetadata): KeyMetadata {
  if (key.isPrimary) {
    throw new Error('Cannot deactivate primary key. Rotate primary key first.');
  }

  return {
    ...key,
    status: 'disabled',
  };
}

/**
 * Crypto-shred a key by securely deleting its material
 *
 * For raw byte arrays (Uint8Array, ArrayBuffer), uses secureZeroize to
 * overwrite memory with zeros. For CryptoKey objects, marks as non-extractable
 * if possible (limited by Web Crypto API). Updates key metadata status to
 * 'destroyed'.
 *
 * IMPORTANT: This is a best-effort protection in JavaScript environments.
 * See memory.ts for detailed limitations.
 *
 * @param key - Key metadata to shred
 * @param keyMaterial - Optional raw key material (Uint8Array or ArrayBuffer)
 * @returns Updated key metadata with status 'destroyed'
 *
 * @example
 * ```ts
 * const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
 * const keyBytes = new Uint8Array(32); // Key material
 * // ... use key ...
 * const shreddedKey = cryptoShredKey(key, keyBytes);
 * console.log(shreddedKey.status); // 'destroyed'
 * ```
 */
export function cryptoShredKey(
  key: KeyMetadata,
  keyMaterial?: Uint8Array | ArrayBuffer
): KeyMetadata {
  // Zeroize raw key material if provided
  if (keyMaterial) {
    secureZeroize(keyMaterial);
  }

  // Mark key as destroyed in metadata
  const shreddedKey = {
    ...key,
    status: 'destroyed' as KeyStatus,
  };

  // Log key deletion event
  logKeyDeleted(key.id, {
    algorithm: key.algorithm,
    version: key.version,
    hadKeyMaterial: !!keyMaterial,
  });

  return shreddedKey;
}

/**
 * Check if a key is expired
 *
 * @param key - Key metadata to check
 * @returns True if key is expired, false otherwise
 *
 * @example
 * ```ts
 * const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256, new Date('2025-01-01'));
 * const isExpired = isKeyExpired(key);
 * ```
 */
export function isKeyExpired(key: KeyMetadata): boolean {
  if (!key.expiresAt) {
    return false; // Non-expiring key
  }
  return new Date() > key.expiresAt;
}

/**
 * Validate key metadata structure
 *
 * Ensures all required fields are present and valid.
 *
 * @param key - Key metadata to validate
 * @returns Object with valid flag and array of error messages
 *
 * @example
 * ```ts
 * const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
 * const validation = validateKeyMetadata(key);
 * console.log(validation.valid); // true
 * ```
 */
export function validateKeyMetadata(key: KeyMetadata): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!key.id || typeof key.id !== 'string') {
    errors.push('Key ID is required and must be a string');
  }

  if (typeof key.version !== 'number' || key.version < 1) {
    errors.push('Key version is required and must be a positive number');
  }

  if (!key.algorithm || typeof key.algorithm !== 'string') {
    errors.push('Algorithm is required and must be a string');
  }

  if (!['active', 'enabled', 'disabled', 'destroyed'].includes(key.status)) {
    errors.push('Key status must be one of: active, enabled, disabled, destroyed');
  }

  if (!Array.isArray(key.usage) || key.usage.length === 0) {
    errors.push('Key usage is required and must be a non-empty array');
  }

  const validUsages: KeyUsage[] = ['encrypt', 'decrypt', 'sign', 'verify', 'derive'];
  if (key.usage.some((u) => !validUsages.includes(u))) {
    errors.push('Key usage must contain only valid usage types');
  }

  if (!(key.createdAt instanceof Date)) {
    errors.push('Key createdAt must be a Date object');
  }

  if (key.expiresAt !== null && !(key.expiresAt instanceof Date)) {
    errors.push('Key expiresAt must be a Date object or null');
  }

  if (typeof key.isPrimary !== 'boolean') {
    errors.push('Key isPrimary must be a boolean');
  }

  if (typeof key.keySize !== 'number' || key.keySize <= 0) {
    errors.push('Key size is required and must be a positive number');
  }

  if (typeof key.isPostQuantum !== 'boolean') {
    errors.push('Key isPostQuantum must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
