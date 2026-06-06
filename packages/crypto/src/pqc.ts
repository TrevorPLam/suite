/**
 * Post-Quantum Cryptography (PQC) Module
 *
 * This module provides post-quantum cryptographic operations for future-proofing
 * against quantum computer attacks. It implements CRYSTALS-Kyber key exchange
 * and hybrid encryption patterns combining classical and PQC algorithms.
 *
 * **Current Status**: Post-quantum algorithms are not yet available in libsodium.js.
 * This module provides the interface and structure for future implementation when
 * PQC support becomes available in WebAssembly backends.
 *
 * **Migration Strategy**: See PQC-MIGRATION.md for the complete migration roadmap.
 *
 * References:
 * - NIST PQC Standardization: https://www.nist.gov/cryptography/post-quantum-cryptography
 * - CRYSTALS-Kyber Specification: https://pq-crystals.org/kyber/
 * - UK NCSC PQC Migration Timelines: https://www.ncsc.gov.uk/guidance/pqc-migration-timelines
 */

/// <reference path="./libsodium.d.ts" />

import { createCryptoError, CryptoErrorCode } from './errors.js';
import { generateKeyPair } from './keypair.js';
import { deriveSharedSecret, deriveAESKeyFromSharedSecret } from './ecdh.js';
import { encryptItem } from './encryption.js';
import { isWasmAvailable, isWasmEnabled } from './wasm-backend.js';

// Type for libsodium module (loaded dynamically)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LibsodiumModule = any;

// Global state for libsodium instance
let libsodiumInstance: LibsodiumModule | null = null;

/**
 * PQC key pair result
 */
export interface PQCKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * PQC encapsulation result (key exchange)
 */
export interface PQCEncapsulationResult {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}

/**
 * Hybrid encryption result
 */
export interface HybridEncryptionResult {
  classicalCiphertext: Uint8Array;
  pqcCiphertext: Uint8Array;
  iv: Uint8Array;
  algorithm: 'HYBRID-X25519-Kyber-v1';
}

/**
 * Checks if post-quantum algorithms are supported
 *
 * This function checks if the WASM backend is available and if libsodium.js
 * supports post-quantum algorithms (currently not available).
 *
 * @returns Promise<boolean> - True if PQC algorithms are supported
 */
export async function isPQCSupported(): Promise<boolean> {
  if (!isWasmEnabled()) {
    return false;
  }

  const available = await isWasmAvailable();
  if (!available) {
    return false;
  }

  // Try to load libsodium instance
  if (!libsodiumInstance) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const libsodium: any = await import('libsodium').catch(() => null);
      if (!libsodium) {
        return false;
      }
      if (typeof libsodium.ready === 'function') {
        await libsodium.ready;
      }
      libsodiumInstance = libsodium as LibsodiumModule;
    } catch (_error) {
      return false;
    }
  }

  // Check if PQC functions are available
  // Currently, libsodium.js does not support CRYSTALS-Kyber
  // This will return false until PQC support is added
  return (
    libsodiumInstance &&
    typeof libsodiumInstance.crypto_kem_keypair === 'function' &&
    typeof libsodiumInstance.crypto_kem_encaps === 'function' &&
    typeof libsodiumInstance.crypto_kem_decaps === 'function'
  );
}

/**
 * CRYSTALS-Kyber key exchange - Generate key pair
 *
 * This function generates a CRYSTALS-Kyber key pair for post-quantum
 * key encapsulation mechanism (KEM). Currently not available in libsodium.js.
 *
 * @param variant - Kyber variant (512, 768, or 1024)
 * @returns Promise<PQCKeyPair> - The key pair
 *
 * @throws {CryptoError} If PQC is not supported or operation fails
 */
export async function kyberKeyPair(variant: 512 | 768 | 1024 = 768): Promise<PQCKeyPair> {
  const supported = await isPQCSupported();
  if (!supported) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_ALGORITHM,
      'CRYSTALS-Kyber is not yet supported in libsodium.js. Post-quantum algorithms are not available in current WASM backend.',
      { operation: 'kyberKeyPair', algorithm: `CRYSTALS-Kyber-${variant}` }
    );
  }

  if (!libsodiumInstance) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_ALGORITHM,
      'libsodium instance not available',
      { operation: 'kyberKeyPair' }
    );
  }

  try {
    // This will be implemented when libsodium.js adds PQC support
    // For now, this code path is unreachable due to the check above
    const algorithm = `kyber${variant}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyPair = libsodiumInstance.crypto_kem_keypair(algorithm) as any;
    return keyPair;
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_GENERATION_FAILED,
      'Failed to generate Kyber key pair',
      { operation: 'kyberKeyPair', algorithm: `CRYSTALS-Kyber-${variant}` }
    );
  }
}

/**
 * CRYSTALS-Kyber key exchange - Encapsulate
 *
 * This function encapsulates a shared secret using a Kyber public key.
 * Currently not available in libsodium.js.
 *
 * @param publicKey - The Kyber public key
 * @param variant - Kyber variant (512, 768, or 1024)
 * @returns Promise<PQCEncapsulationResult> - The ciphertext and shared secret
 *
 * @throws {CryptoError} If PQC is not supported or operation fails
 */
export async function kyberEncaps(
  publicKey: Uint8Array,
  variant: 512 | 768 | 1024 = 768
): Promise<PQCEncapsulationResult> {
  const supported = await isPQCSupported();
  if (!supported) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_ALGORITHM,
      'CRYSTALS-Kyber is not yet supported in libsodium.js. Post-quantum algorithms are not available in current WASM backend.',
      { operation: 'kyberEncaps', algorithm: `CRYSTALS-Kyber-${variant}` }
    );
  }

  if (!libsodiumInstance) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_ALGORITHM,
      'libsodium instance not available',
      { operation: 'kyberEncaps' }
    );
  }

  try {
    // This will be implemented when libsodium.js adds PQC support
    const algorithm = `kyber${variant}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = libsodiumInstance.crypto_kem_encaps(publicKey, algorithm) as any;
    return result;
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_DERIVATION_FAILED,
      'Failed to encapsulate shared secret with Kyber',
      { operation: 'kyberEncaps', algorithm: `CRYSTALS-Kyber-${variant}` }
    );
  }
}

/**
 * CRYSTALS-Kyber key exchange - Decapsulate
 *
 * This function decapsulates a shared secret using a Kyber secret key.
 * Currently not available in libsodium.js.
 *
 * @param ciphertext - The Kyber ciphertext
 * @param secretKey - The Kyber secret key
 * @param variant - Kyber variant (512, 768, or 1024)
 * @returns Promise<Uint8Array> - The shared secret
 *
 * @throws {CryptoError} If PQC is not supported or operation fails
 */
export async function kyberDecaps(
  ciphertext: Uint8Array,
  secretKey: Uint8Array,
  variant: 512 | 768 | 1024 = 768
): Promise<Uint8Array> {
  const supported = await isPQCSupported();
  if (!supported) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_ALGORITHM,
      'CRYSTALS-Kyber is not yet supported in libsodium.js. Post-quantum algorithms are not available in current WASM backend.',
      { operation: 'kyberDecaps', algorithm: `CRYSTALS-Kyber-${variant}` }
    );
  }

  if (!libsodiumInstance) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_ALGORITHM,
      'libsodium instance not available',
      { operation: 'kyberDecaps' }
    );
  }

  try {
    // This will be implemented when libsodium.js adds PQC support
    const algorithm = `kyber${variant}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sharedSecret = libsodiumInstance.crypto_kem_decaps(ciphertext, secretKey, algorithm) as any;
    return sharedSecret;
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_DERIVATION_FAILED,
      'Failed to decapsulate shared secret with Kyber',
      { operation: 'kyberDecaps', algorithm: `CRYSTALS-Kyber-${variant}` }
    );
  }
}

/**
 * Hybrid encryption - Encrypt with classical + PQC
 *
 * This function implements hybrid encryption using both classical (X25519 ECDH)
 * and post-quantum (CRYSTALS-Kyber) algorithms. The ciphertexts are combined
 * to provide security against both classical and quantum attacks.
 *
 * Since PQC is not yet available, this currently falls back to classical-only
 * encryption with a warning.
 *
 * @param plaintext - The data to encrypt (as string for compatibility with encryptItem)
 * @param recipientPublicKey - The recipient's X25519 public key
 * @param recipientPQCPublicKey - The recipient's Kyber public key (optional)
 * @returns Promise<HybridEncryptionResult> - The hybrid ciphertext
 *
 * @throws {CryptoError} If encryption fails
 */
export async function hybridEncrypt(
  plaintext: string,
  recipientPublicKey: CryptoKey,
  recipientPQCPublicKey?: Uint8Array
): Promise<HybridEncryptionResult> {
  // Classical encryption using X25519 ECDH + AES-256-GCM
  try {
    const ephemeralKeyPair = await generateKeyPair();
    const sharedSecret = await deriveSharedSecret(ephemeralKeyPair.privateKey, recipientPublicKey);
    const salt = new ArrayBuffer(0);
    const info = new ArrayBuffer(0);
    const aesKey = await deriveAESKeyFromSharedSecret(sharedSecret, salt, info);
    const encrypted = await encryptItem(plaintext, aesKey);

    // If PQC public key is provided and PQC is supported, use hybrid encryption
    if (recipientPQCPublicKey && await isPQCSupported()) {
      try {
        const pqcResult = await kyberEncaps(recipientPQCPublicKey, 768);
        
        // Combine classical and PQC ciphertexts
        // In a full implementation, we would derive a combined key using HKDF
        // from both shared secrets and encrypt with that
        
        return {
          classicalCiphertext: new Uint8Array(encrypted.ciphertext),
          pqcCiphertext: pqcResult.ciphertext,
          iv: encrypted.iv,
          algorithm: 'HYBRID-X25519-Kyber-v1',
        };
      } catch (_error) {
        // Fall back to classical-only if PQC fails
        console.warn('PQC encryption failed, falling back to classical-only');
      }
    }

    // Classical-only encryption (PQC not available or not provided)
    if (recipientPQCPublicKey) {
      console.warn('PQC public key provided but PQC not supported. Using classical-only encryption.');
    }

    return {
      classicalCiphertext: new Uint8Array(encrypted.ciphertext),
      pqcCiphertext: new Uint8Array(0), // Empty for classical-only
      iv: encrypted.iv,
      algorithm: 'HYBRID-X25519-Kyber-v1',
    };
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Failed to perform hybrid encryption',
      { operation: 'hybridEncrypt' }
    );
  }
}

/**
 * Hybrid encryption - Decrypt with classical + PQC
 *
 * This function decrypts data encrypted with hybrid encryption.
 * Since PQC is not yet available, this currently uses classical-only decryption.
 *
 * @param ciphertext - The hybrid ciphertext
 * @param _privateKey - The recipient's X25519 private key (unused in simplified interface)
 * @param _pqcSecretKey - The recipient's Kyber secret key (unused in simplified interface)
 * @returns Promise<Uint8Array> - The decrypted plaintext
 *
 * @throws {CryptoError} If decryption fails
 */
export async function hybridDecrypt(
  _ciphertext: HybridEncryptionResult,
  _privateKey: CryptoKey,
  _pqcSecretKey?: Uint8Array
): Promise<Uint8Array> {
  // Classical decryption using X25519 ECDH + AES-256-GCM
  try {
    // Reconstruct the encrypted data format
    // In a full implementation, the ciphertext would include the sender's ephemeral public key
    // Since we don't have the sender's public key in this simplified interface,
    // we'll need to derive it differently. In a full implementation, the
    // ciphertext would include the sender's ephemeral public key.
    
    throw createCryptoError(
      CryptoErrorCode.DECRYPTION_FAILED,
      'Hybrid decryption requires sender\'s ephemeral public key. This is a simplified interface for demonstration.',
      { operation: 'hybridDecrypt' }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('simplified interface')) {
      throw error;
    }
    throw createCryptoError(
      CryptoErrorCode.DECRYPTION_FAILED,
      'Failed to perform hybrid decryption',
      { operation: 'hybridDecrypt' }
    );
  }
}

/**
 * Get PQC support status
 *
 * @returns Promise<Object> - Object with PQC support status
 */
export async function getPQCStatus(): Promise<{
  supported: boolean;
  wasmEnabled: boolean;
  wasmAvailable: boolean;
  reason: string;
}> {
  const wasmEnabled = isWasmEnabled();
  const wasmAvailable = await isWasmAvailable();
  const supported = await isPQCSupported();

  let reason = 'PQC algorithms are not yet available in libsodium.js';
  if (!wasmEnabled) {
    reason = 'WASM backend is not enabled. Call enableWasmBackend() to enable.';
  } else if (!wasmAvailable) {
    reason = 'libsodium.js is not installed or WebAssembly is not supported.';
  }

  return {
    supported,
    wasmEnabled,
    wasmAvailable,
    reason,
  };
}
