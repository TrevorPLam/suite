/**
 * AES-256-GCM encryption/decryption utilities
 * Uses Web Crypto API (subtle.crypto) available in both Node.js and browsers
 *
 * Note: This module does not use secureZeroize because:
 * - Web Crypto API CryptoKey objects are browser-managed and cannot be zeroized by JavaScript
 * - All byte arrays are intermediate values passed directly to crypto.subtle operations
 * - No temporary key material is stored in raw byte arrays that requires cleanup
 */

import { createCryptoError, CryptoErrorCode } from './errors.js';

export interface EncryptedData {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
}

/**
 * Encrypts data using AES-256-GCM with a unique IV per operation
 * @param data - String data to encrypt
 * @param key - CryptoKey for AES-GCM encryption
 * @returns Encrypted data with ciphertext and IV
 */
export async function encryptItem(
  data: string,
  key: CryptoKey
): Promise<EncryptedData> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV (recommended for AES-GCM)
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );
    return { ciphertext: encrypted, iv };
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Failed to encrypt data',
      { operation: 'encrypt', algorithm: 'AES-GCM' }
    );
  }
}

/**
 * Decrypts data using AES-256-GCM
 * @param encryptedData - Encrypted data with ciphertext and IV
 * @param key - CryptoKey for AES-GCM decryption
 * @returns Decrypted string
 */
export async function decryptItem(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encryptedData.iv.buffer.slice(
        encryptedData.iv.byteOffset,
        encryptedData.iv.byteOffset + encryptedData.iv.byteLength
      ) as BufferSource },
      key,
      encryptedData.ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.DECRYPTION_FAILED,
      'Failed to decrypt data',
      { operation: 'decrypt', algorithm: 'AES-GCM' }
    );
  }
}

/**
 * Generates a new AES-256-GCM key
 * @param extractable - Whether the key can be exported (default: false for security)
 * @returns CryptoKey for AES-GCM operations
 */
export async function generateAESKey(extractable = false): Promise<CryptoKey> {
  try {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    );
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_GENERATION_FAILED,
      'Failed to generate AES-GCM key',
      { operation: 'generateKey', algorithm: 'AES-GCM' }
    );
  }
}
