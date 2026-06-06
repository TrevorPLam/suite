/**
 * ECDH key pair generation using X25519 curve
 * Uses Web Crypto API (subtle.crypto) available in both Node.js and browsers
 */

import { createCryptoError, CryptoErrorCode } from './errors.js';

/**
 * Generates an X25519 key pair for ECDH key exchange
 * @param extractable - Whether the keys can be exported (default: false for security)
 * @returns Key pair containing public and private keys
 */
export async function generateKeyPair(extractable = false): Promise<CryptoKeyPair> {
  try {
    const result = await crypto.subtle.generateKey(
      { name: 'X25519' },
      extractable,
      ['deriveKey', 'deriveBits']
    );
    if (!('privateKey' in result)) {
      throw createCryptoError(
        CryptoErrorCode.KEY_GENERATION_FAILED,
        'Expected CryptoKeyPair but got CryptoKey',
        { operation: 'generateKeyPair', algorithm: 'X25519' }
      );
    }
    return result;
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_GENERATION_FAILED,
      'Failed to generate X25519 key pair',
      { operation: 'generateKeyPair', algorithm: 'X25519' }
    );
  }
}
