/**
 * Type declarations for optional libsodium dependency
 * 
 * This file provides minimal type definitions for libsodium.js
 * to prevent TypeScript errors when the optional dependency is not installed.
 * 
 * Note: Post-quantum cryptography (PQC) functions are included as optional
 * placeholders for future libsodium.js support. Current versions may not
 * implement these functions.
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
    
    // Post-quantum cryptography (PQC) placeholders for future libsodium.js support
    // These functions may not be available in current versions
    crypto_kem_keypair?: (algorithm: string) => { publicKey: Uint8Array; secretKey: Uint8Array };
    crypto_kem_encaps?: (publicKey: Uint8Array, algorithm: string) => { ciphertext: Uint8Array; sharedSecret: Uint8Array };
    crypto_kem_decaps?: (ciphertext: Uint8Array, secretKey: Uint8Array, algorithm: string) => Uint8Array;
  }

  const libsodium: Libsodium;
  export default libsodium;
}
