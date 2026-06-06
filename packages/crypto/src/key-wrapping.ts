/**
 * Key Wrapping Module
 *
 * Implements AES-KW (RFC 3394) and AES-KWP (RFC 5649) key wrapping algorithms
 * for secure key transport and envelope encryption patterns.
 *
 * @module key-wrapping
 */

import { encryptItem, decryptItem, generateAESKey, type EncryptedData } from './encryption.js';

/**
 * Wraps a key using AES-KW (RFC 3394)
 *
 * Uses Web Crypto API's native AES-KW implementation. The key to wrap must be
 * a multiple of 64 bits (8 bytes). AES-KW does not require an initialization vector.
 *
 * @param keyToWrap - The CryptoKey to wrap (must be extractable)
 * @param wrappingKey - The Key Encryption Key (KEK) for wrapping
 * @returns Promise<Uint8Array> - The wrapped key as raw bytes
 * @throws Error if key wrapping fails or key is not extractable
 *
 * @example
 * ```ts
 * const kek = await crypto.subtle.generateKey(
 *   { name: 'AES-KW', length: 256 },
 *   true,
 *   ['wrapKey', 'unwrapKey']
 * );
 * const keyToWrap = await generateAESKey();
 * const wrapped = await wrapKey(keyToWrap, kek);
 * ```
 */
export async function wrapKey(
  keyToWrap: CryptoKey,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  if (!keyToWrap.extractable) {
    throw new Error('Key to wrap must be extractable');
  }

  if (wrappingKey.algorithm.name !== 'AES-KW') {
    throw new Error('Wrapping key must be an AES-KW key');
  }

  try {
    const wrappedKey = await crypto.subtle.wrapKey(
      'raw',
      keyToWrap,
      wrappingKey,
      'AES-KW'
    );
    return new Uint8Array(wrappedKey as ArrayBuffer);
  } catch (error) {
    throw new Error(
      `Key wrapping failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Unwraps a key using AES-KW (RFC 3394)
 *
 * Uses Web Crypto API's native AES-KW implementation to unwrap a previously
 * wrapped key. Validates integrity during unwrapping.
 *
 * @param wrappedKey - The wrapped key as raw bytes
 * @param wrappingKey - The Key Encryption Key (KEK) used for wrapping
 * @param algorithm - The algorithm of the unwrapped key (e.g., { name: 'AES-GCM', length: 256 })
 * @param extractable - Whether the unwrapped key should be extractable
 * @param keyUsages - Array of key usages for the unwrapped key
 * @returns Promise<CryptoKey> - The unwrapped CryptoKey
 * @throws Error if key unwrapping fails or integrity check fails
 *
 * @example
 * ```ts
 * const unwrapped = await unwrapKey(
 *   wrapped,
 *   kek,
 *   { name: 'AES-GCM', length: 256 },
 *   true,
 *   ['encrypt', 'decrypt']
 * );
 * ```
 */
export async function unwrapKey(
  wrappedKey: Uint8Array,
  wrappingKey: CryptoKey,
  algorithm: AesKeyGenParams | HmacKeyGenParams,
  extractable: boolean,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> {
  if (wrappingKey.algorithm.name !== 'AES-KW') {
    throw new Error('Wrapping key must be an AES-KW key');
  }

  try {
    const unwrappedKey = await crypto.subtle.unwrapKey(
      'raw',
      wrappedKey.buffer.slice(wrappedKey.byteOffset, wrappedKey.byteOffset + wrappedKey.byteLength) as BufferSource,
      wrappingKey,
      'AES-KW',
      algorithm,
      extractable,
      keyUsages
    );
    return unwrappedKey;
  } catch (error) {
    throw new Error(
      `Key unwrapping failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Wraps a key using AES-KWP with padding (RFC 5649)
 *
 * AES-KWP handles keys of arbitrary length by adding padding. Since Web Crypto API
 * doesn't support AES-KWP natively, this implementation uses AES-GCM as an alternative
 * for wrapping arbitrary-length key bytes with integrity protection.
 *
 * @param keyToWrap - The key bytes to wrap (any length)
 * @param wrappingKey - The Key Encryption Key (KEK) for wrapping (AES-GCM key)
 * @returns Promise<Uint8Array> - The wrapped key with padding
 * @throws Error if key wrapping fails
 *
 * @example
 * ```ts
 * const kek = await crypto.subtle.generateKey(
 *   { name: 'AES-GCM', length: 256 },
 *   true,
 *   ['encrypt', 'decrypt']
 * );
 * const keyBytes = new Uint8Array([1, 2, 3, 4, 5]); // Any length
 * const wrapped = await wrapKeyPadded(keyBytes, kek);
 * ```
 */
export async function wrapKeyPadded(
  keyToWrap: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  if (wrappingKey.algorithm.name !== 'AES-GCM') {
    throw new Error('Wrapping key must be an AES-GCM key for padded wrapping');
  }

  // RFC 5649 padding: add padding to make length a multiple of 8 bytes
  // Padding format: 0x01 followed by 0x00...0x00, then length in big-endian
  const keyLength = keyToWrap.length;
  const paddedLength = Math.ceil((keyLength + 4) / 8) * 8; // +4 for the 0x01 + length bytes
  const _paddingLength = paddedLength - keyLength;

  const padded = new Uint8Array(paddedLength);
  padded.set(keyToWrap, 0);

  // Add padding: 0x01 followed by 0x00...0x00, then 4-byte big-endian length
  padded[keyLength] = 0x01;
  for (let i = keyLength + 1; i < paddedLength - 4; i++) {
    padded[i] = 0x00;
  }

  // Store original length in last 4 bytes (big-endian)
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, keyLength, false); // false = big-endian

  // Use AES-GCM to encrypt the padded data (provides integrity via auth tag)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    wrappingKey,
    padded
  );

  // Return IV + ciphertext (auth tag is included in ciphertext by Web Crypto API)
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

/**
 * Unwraps a key using AES-KWP with padding (RFC 5649)
 *
 * Removes padding according to RFC 5649 and returns the original key bytes.
 * Validates padding integrity during unwrapping.
 *
 * @param wrappedKey - The wrapped key with padding (IV + ciphertext)
 * @param wrappingKey - The Key Encryption Key (KEK) used for wrapping (AES-GCM key)
 * @returns Promise<Uint8Array> - The unwrapped key bytes (original length)
 * @throws Error if key unwrapping fails or padding is invalid
 *
 * @example
 * ```ts
 * const unwrapped = await unwrapKeyPadded(wrapped, kek);
 * console.log(unwrapped); // Original key bytes
 * ```
 */
export async function unwrapKeyPadded(
  wrappedKey: Uint8Array,
  wrappingKey: CryptoKey
): Promise<Uint8Array> {
  if (wrappingKey.algorithm.name !== 'AES-GCM') {
    throw new Error('Wrapping key must be an AES-GCM key for padded unwrapping');
  }

  try {
    // Extract IV (first 12 bytes) and ciphertext
    const iv = wrappedKey.slice(0, 12);
    const ciphertext = wrappedKey.slice(12);

    // Decrypt the padded data using AES-GCM
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      wrappingKey,
      ciphertext
    );

    const paddedBytes = new Uint8Array(decrypted);

    // Extract original length from last 4 bytes (big-endian)
    const view = new DataView(paddedBytes.buffer);
    const originalLength = view.getUint32(paddedBytes.length - 4, false);

    // Validate padding
    if (originalLength < 0 || originalLength > paddedBytes.length - 4) {
      throw new Error('Invalid padding: length out of range');
    }

    // Check padding format: 0x01 followed by 0x00...0x00
    if (paddedBytes[originalLength] !== 0x01) {
      throw new Error('Invalid padding: missing 0x01 marker');
    }

    for (let i = originalLength + 1; i < paddedBytes.length - 4; i++) {
      if (paddedBytes[i] !== 0x00) {
        throw new Error('Invalid padding: non-zero byte in padding area');
      }
    }

    // Return the original key bytes
    return paddedBytes.slice(0, originalLength);
  } catch (error) {
    throw new Error(
      `Padded key unwrapping failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Envelope encryption result
 *
 * Contains the encrypted data and the wrapped Data Encryption Key (DEK).
 */
export interface EnvelopeEncryptionResult {
  /** The encrypted data */
  encryptedData: EncryptedData;
  /** The wrapped DEK */
  wrappedDek: Uint8Array;
}

/**
 * Envelope encryption pattern
 *
 * Generates a random Data Encryption Key (DEK), encrypts the data with the DEK,
 * wraps the DEK with a Key Encryption Key (KEK), and returns both.
 *
 * This pattern separates bulk data encryption from key management, allowing
 * the KEK to be stored in a secure location (e.g., KMS, HSM) while the DEK
 * is ephemeral and per-object.
 *
 * @param plaintext - The data to encrypt (as string)
 * @param kek - The Key Encryption Key (KEK) for wrapping the DEK
 * @returns Promise<EnvelopeEncryptionResult> - The encrypted data and wrapped DEK
 * @throws Error if encryption or key wrapping fails
 *
 * @example
 * ```ts
 * const kek = await crypto.subtle.generateKey(
 *   { name: 'AES-KW', length: 256 },
 *   true,
 *   ['wrapKey', 'unwrapKey']
 * );
 * const plaintext = 'Secret data';
 * const { encryptedData, wrappedDek } = await envelopeEncrypt(plaintext, kek);
 * ```
 */
export async function envelopeEncrypt(
  plaintext: string,
  kek: CryptoKey
): Promise<EnvelopeEncryptionResult> {
  // Generate a random Data Encryption Key (DEK) - must be extractable for wrapping
  const dek = await generateAESKey(true);

  // Encrypt the data with the DEK
  const encryptedData = await encryptItem(plaintext, dek);

  // Wrap the DEK with the KEK
  const wrappedDek = await wrapKey(dek, kek);

  return {
    encryptedData,
    wrappedDek,
  };
}

/**
 * Envelope decryption pattern
 *
 * Unwraps the Data Encryption Key (DEK) using the Key Encryption Key (KEK),
 * then decrypts the data with the DEK.
 *
 * @param result - The envelope encryption result (encrypted data + wrapped DEK)
 * @param kek - The Key Encryption Key (KEK) used for wrapping
 * @returns Promise<string> - The decrypted plaintext
 * @throws Error if decryption or key unwrapping fails
 *
 * @example
 * ```ts
 * const plaintext = await envelopeDecrypt({ encryptedData, wrappedDek }, kek);
 * console.log(plaintext); // 'Secret data'
 * ```
 */
export async function envelopeDecrypt(
  result: EnvelopeEncryptionResult,
  kek: CryptoKey
): Promise<string> {
  // Unwrap the DEK with the KEK
  const dek = await unwrapKey(
    result.wrappedDek,
    kek,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Decrypt the data with the DEK
  return await decryptItem(result.encryptedData, dek);
}
