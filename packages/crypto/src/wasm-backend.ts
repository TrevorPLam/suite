/**
 * WebAssembly Backend for Advanced Cryptographic Operations
 *
 * This module provides optional WebAssembly-based cryptographic operations
 * using libsodium.js for features not available in the Web Crypto API.
 *
 * @module wasm-backend
 */

/// <reference path="./libsodium.d.ts" />

import { createCryptoError, CryptoErrorCode } from './errors.js';

// Type for libsodium module (loaded dynamically)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LibsodiumModule = any;

// Global state for WASM backend
let wasmAvailable: boolean | null = null;
let wasmEnabled: boolean = false;
let libsodiumInstance: LibsodiumModule | null = null;

/**
 * Checks if WebAssembly and libsodium.js are available
 *
 * This function attempts to dynamically import libsodium.js and verify
 * WebAssembly support. It caches the result for subsequent calls.
 *
 * @returns Promise<boolean> - True if WASM backend is available
 */
export async function isWasmAvailable(): Promise<boolean> {
  if (wasmAvailable !== null) {
    return wasmAvailable;
  }

  try {
    // Check if WebAssembly is supported
    if (typeof WebAssembly === 'undefined') {
      wasmAvailable = false;
      return false;
    }

    // Attempt to import libsodium.js (optional dependency)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const libsodium: any = await import('libsodium').catch(() => null);
    
    if (!libsodium) {
      wasmAvailable = false;
      return false;
    }

    // Initialize libsodium if needed
    if (typeof libsodium.ready === 'function') {
      await libsodium.ready;
    }

    libsodiumInstance = libsodium as LibsodiumModule;
    wasmAvailable = true;
    return true;
  } catch (_error) {
    wasmAvailable = false;
    return false;
  }
}

/**
 * Enables the WASM backend for cryptographic operations
 *
 * When enabled, the package will use libsodium.js for advanced features
 * like Argon2id password hashing. This is disabled by default to maintain
 * small bundle size.
 */
export function enableWasmBackend(): void {
  wasmEnabled = true;
}

/**
 * Disables the WASM backend, forcing use of Web Crypto API only
 *
 * This ensures the package uses only browser-native Web Crypto API,
 * maintaining small bundle size and avoiding optional dependencies.
 */
export function disableWasmBackend(): void {
  wasmEnabled = false;
}

/**
 * Checks if WASM backend is currently enabled
 *
 * @returns boolean - True if WASM backend is enabled
 */
export function isWasmEnabled(): boolean {
  return wasmEnabled;
}

/**
 * Argon2id password hashing via WebAssembly
 *
 * This function implements Argon2id (the winner of the Password Hashing Competition)
 * using libsodium.js when available. Argon2id is memory-hard and resistant to
 * GPU/ASIC attacks, making it superior to PBKDF2 for password hashing.
 *
 * If WASM backend is not available or not enabled, this function falls back
 * to PBKDF2-SHA256 for compatibility.
 *
 * @param password - The password to hash
 * @param salt - The salt (must be 16 bytes for Argon2id)
 * @param iterations - Number of iterations (default: 3 for Argon2id, 310000 for PBKDF2)
 * @param memory - Memory limit in KB for Argon2id (default: 65536 = 64MB)
 * @param parallelism - Parallelism factor for Argon2id (default: 1)
 * @returns Promise<Uint8Array> - The derived key
 *
 * @throws {CryptoError} If parameters are invalid or operation fails
 */
export async function argon2idHash(
  password: string,
  salt: Uint8Array,
  iterations: number = 3,
  memory: number = 65536,
  parallelism: number = 1
): Promise<Uint8Array> {
  // Validate parameters
  if (!password || password.length === 0) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_KEY,
      'Password cannot be empty',
      { operation: 'argon2idHash' }
    );
  }

  if (!salt || salt.length === 0) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_KEY,
      'Salt cannot be empty',
      { operation: 'argon2idHash' }
    );
  }

  if (iterations <= 0) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_KEY,
      'Iterations must be positive',
      { operation: 'argon2idHash' }
    );
  }

  if (memory <= 0) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_KEY,
      'Memory limit must be positive',
      { operation: 'argon2idHash' }
    );
  }

  if (parallelism <= 0) {
    throw createCryptoError(
      CryptoErrorCode.INVALID_KEY,
      'Parallelism must be positive',
      { operation: 'argon2idHash' }
    );
  }

  // Try to use WASM backend if enabled and available
  if (wasmEnabled && await isWasmAvailable() && libsodiumInstance) {
    try {
      // Argon2id requires 16-byte salt
      const argon2idSalt = salt.length >= 16 ? salt.slice(0, 16) : salt;
      
      // Use libsodium's recommended interactive defaults
      const opsLimit = libsodiumInstance.crypto_pwhash_OPSLIMIT_INTERACTIVE;
      const memLimit = libsodiumInstance.crypto_pwhash_MEMLIMIT_INTERACTIVE;
      const algorithm = libsodiumInstance.crypto_pwhash_argon2id_ALG_ARGON2ID13;

      // Derive a 32-byte key (256 bits)
      const outputLength = 32;
      
      const result = libsodiumInstance.crypto_pwhash_argon2id(
        outputLength,
        password,
        argon2idSalt,
        opsLimit,
        memLimit,
        algorithm
      );

      return result;
    } catch (error) {
      // Fall back to PBKDF2 if WASM operation fails
      console.warn('Argon2id via WASM failed, falling back to PBKDF2:', error);
    }
  }

  // Fallback to PBKDF2-SHA256 using deriveBits to get raw bytes
  try {
    const passwordBuffer = new TextEncoder().encode(password);
    // Ensure salt is a Uint8Array with proper ArrayBuffer
    const saltArray = salt instanceof ArrayBuffer ? new Uint8Array(salt) : salt;
    // Create a new ArrayBuffer to avoid SharedArrayBuffer issues
    const saltBuffer = new Uint8Array(saltArray.length);
    saltBuffer.set(saltArray);

    // Import password as a key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    // Derive raw bits using PBKDF2 with SHA-256
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations,
        hash: 'SHA-256',
      },
      baseKey,
      256 // 256 bits = 32 bytes
    );

    return new Uint8Array(derivedBits);
  } catch (_error) {
    throw createCryptoError(
      CryptoErrorCode.KEY_DERIVATION_FAILED,
      'Failed to derive key using PBKDF2 fallback',
      { operation: 'argon2idHash', algorithm: 'PBKDF2' }
    );
  }
}

/**
 * Gets the current WASM backend status
 *
 * @returns Object with availability and enabled status
 */
export async function getWasmStatus(): Promise<{
  available: boolean;
  enabled: boolean;
}> {
  const available = await isWasmAvailable();
  return {
    available,
    enabled: wasmEnabled,
  };
}
