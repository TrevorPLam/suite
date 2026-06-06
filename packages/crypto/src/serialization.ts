/**
 * Key serialization/deserialization utilities
 * Uses Web Crypto API (subtle.crypto) available in both Node.js and browsers
 */

/**
 * Serializes a CryptoKey to JWK format
 * @param key - CryptoKey to serialize
 * @returns JWK representation of the key
 */
export async function serializeKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

/**
 * Deserializes a JWK to a CryptoKey
 * @param jwk - JWK representation of the key
 * @param algorithm - Key algorithm (e.g., 'AES-GCM', 'X25519')
 * @param extractable - Whether the key should be extractable (default: false)
 * @param keyUsages - Array of key usages (e.g., ['encrypt', 'decrypt'])
 * @returns CryptoKey
 */
export async function deserializeKey(
  jwk: JsonWebKey,
  algorithm: string,
  extractable = false,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> {
  let algorithmParams: AlgorithmIdentifier;

  if (algorithm === 'AES-GCM') {
    algorithmParams = { name: 'AES-GCM', length: 256 } as AlgorithmIdentifier;
  } else if (algorithm === 'X25519') {
    algorithmParams = { name: 'X25519' };
  } else {
    throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  return crypto.subtle.importKey(
    'jwk',
    jwk,
    algorithmParams,
    extractable,
    keyUsages
  );
}

/**
 * Serializes a CryptoKey to raw format (for X25519 public keys)
 * @param key - CryptoKey to serialize
 * @returns Raw bytes of the key
 */
export async function serializeKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

/**
 * Deserializes raw bytes to a CryptoKey (for X25519 public keys)
 * @param rawBytes - Raw bytes of the key
 * @param algorithm - Key algorithm (e.g., 'X25519')
 * @param extractable - Whether the key should be extractable (default: false)
 * @param keyUsages - Array of key usages
 * @returns CryptoKey
 */
export async function deserializeKeyRaw(
  rawBytes: ArrayBuffer,
  algorithm: string,
  extractable = false,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> {
  let algorithmParams: AlgorithmIdentifier;

  if (algorithm === 'X25519') {
    algorithmParams = { name: 'X25519' };
  } else {
    throw new Error(`Unsupported algorithm for raw format: ${algorithm}`);
  }

  return crypto.subtle.importKey(
    'raw',
    rawBytes,
    algorithmParams,
    extractable,
    keyUsages
  );
}
