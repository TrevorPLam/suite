/**
 * PBKDF2 key derivation from passwords
 * Uses Web Crypto API (subtle.crypto) available in both Node.js and browsers
 */

import { secureZeroize } from './memory.js';
import { createCryptoError, CryptoErrorCode } from './errors.js';

/**
 * Derives a cryptographic key from a password using PBKDF2
 * @param password - Password string
 * @param salt - Salt for key derivation (should be unique per user/application)
 * @param iterations - Number of PBKDF2 iterations (recommended: 310,000+ for 2025+)
 * @param extractable - Whether the derived key can be exported (default: false)
 * @returns Derived AES-GCM key
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: ArrayBuffer,
  iterations = 310000,
  extractable = false
): Promise<CryptoKey> {
  try {
    const passwordBuffer = new TextEncoder().encode(password);

    // Import password as a key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Zeroize password buffer after use to prevent memory disclosure
    secureZeroize(passwordBuffer);

    // Derive an AES-GCM key using PBKDF2 with SHA-256
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    );
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_DERIVATION_FAILED,
      'Failed to derive key from password',
      { operation: 'deriveKey', algorithm: 'PBKDF2' }
    );
  }
}

/**
 * Generates a random salt for key derivation
 * @param length - Length of salt in bytes (default: 16 bytes / 128 bits)
 * @returns Random salt as ArrayBuffer
 */
export function generateSalt(length = 16): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(length)).buffer;
}
