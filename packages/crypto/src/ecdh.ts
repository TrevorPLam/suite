/**
 * ECDH shared secret derivation using X25519
 * Uses Web Crypto API (subtle.crypto) available in both Node.js and browsers
 */

import { createCryptoError, CryptoErrorCode } from './errors.js';

/**
 * Derives a shared secret from a private key and a public key using ECDH
 * @param privateKey - Private key from the key pair
 * @param publicKey - Public key from the other party's key pair
 * @returns Shared secret as ArrayBuffer
 */
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<ArrayBuffer> {
  try {
    return await crypto.subtle.deriveBits(
      { name: 'X25519', public: publicKey },
      privateKey,
      256 // 256-bit shared secret
    );
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.ECDH_DERIVATION_FAILED,
      'Failed to derive shared secret',
      { operation: 'deriveSharedSecret', algorithm: 'X25519' }
    );
  }
}

/**
 * Derives an AES key from a shared secret using HKDF
 * @param sharedSecret - Shared secret from ECDH
 * @param salt - Salt for key derivation (can be empty for new derivations)
 * @param info - Context info for key derivation (optional)
 * @param extractable - Whether the derived key can be exported (default: false)
 * @returns Derived AES-GCM key
 */
export async function deriveAESKeyFromSharedSecret(
  sharedSecret: ArrayBuffer,
  salt: ArrayBuffer,
  info: ArrayBuffer = new ArrayBuffer(0),
  extractable = false
): Promise<CryptoKey> {
  try {
    // Import the shared secret as a key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    // Derive an AES-GCM key using HKDF
    return await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info,
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt']
    );
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_DERIVATION_FAILED,
      'Failed to derive AES key from shared secret',
      { operation: 'deriveAESKeyFromSharedSecret', algorithm: 'HKDF' }
    );
  }
}
