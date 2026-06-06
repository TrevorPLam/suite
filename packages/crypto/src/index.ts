// Encryption utilities
export { encryptItem, decryptItem, generateAESKey } from './encryption.js';
export type { EncryptedData } from './encryption.js';

// Key pair generation
export { generateKeyPair } from './keypair.js';

// ECDH shared secret derivation
export { deriveSharedSecret, deriveAESKeyFromSharedSecret } from './ecdh.js';

// Key derivation from passwords
export { deriveKeyFromPassword, generateSalt } from './keyderivation.js';

// Key serialization/deserialization
export { serializeKey, deserializeKey, serializeKeyRaw, deserializeKeyRaw } from './serialization.js';

// Blind indexing for encrypted search
export { generateBlindIndex, deriveIndexKey } from './blind-index.js';

// Constant-time comparison for timing attack prevention
export { constantTimeEqual, constantTimeEqualSync } from './constant-time.js';

// Memory zeroization for secure key cleanup
export { secureZeroize } from './memory.js';

// Key wrapping (AES-KW, AES-KWP, envelope encryption)
export {
  wrapKey,
  unwrapKey,
  wrapKeyPadded,
  unwrapKeyPadded,
  envelopeEncrypt,
  envelopeDecrypt,
} from './key-wrapping.js';
export type { EnvelopeEncryptionResult } from './key-wrapping.js';

// Key lifecycle management
export {
  createKeyMetadata,
  incrementVersion,
  rotateKey,
  getActiveKey,
  deactivateKey,
  cryptoShredKey,
  isKeyExpired,
  validateKeyMetadata,
} from './key-lifecycle.js';
export type { KeyMetadata, KeyStatus, KeyUsage } from './key-lifecycle.js';
