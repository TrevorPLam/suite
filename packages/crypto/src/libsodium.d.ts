/**
 * Type declarations for optional libsodium dependency
 * 
 * This file provides minimal type definitions for libsodium.js
 * to prevent TypeScript errors when the optional dependency is not installed.
 */

declare module 'libsodium' {
  export interface Libsodium {
    ready?: Promise<void>;
    crypto_pwhash_argon2id: (
      outputLength: number,
      password: string,
      salt: Uint8Array,
      opsLimit: number,
      memLimit: number,
      algorithm: number
    ) => Uint8Array;
    crypto_pwhash_argon2id_ALG_ARGON2ID13: number;
    crypto_pwhash_OPSLIMIT_INTERACTIVE: number;
    crypto_pwhash_MEMLIMIT_INTERACTIVE: number;
  }

  const libsodium: Libsodium;
  export default libsodium;
}
