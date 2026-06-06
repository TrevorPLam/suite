/**
 * ECDH key pair generation using X25519 curve
 * Uses Web Crypto API (subtle.crypto) available in both Node.js and browsers
 */

/**
 * Generates an X25519 key pair for ECDH key exchange
 * @param extractable - Whether the keys can be exported (default: false for security)
 * @returns Key pair containing public and private keys
 */
export async function generateKeyPair(extractable = false): Promise<CryptoKeyPair> {
  const result = await crypto.subtle.generateKey(
    { name: 'X25519' },
    extractable,
    ['deriveKey', 'deriveBits']
  );
  if (!('privateKey' in result)) {
    throw new Error('Expected CryptoKeyPair but got CryptoKey');
  }
  return result;
}
