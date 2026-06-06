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

// Error handling
export {
  CryptoError,
  CryptoErrorCode,
  ErrorCategory,
  ErrorContext,
  createCryptoError,
  isCryptoError,
  isRetriable,
  wrapError,
} from './errors.js';

// WebAssembly backend (optional dependency)
export {
  isWasmAvailable,
  enableWasmBackend,
  disableWasmBackend,
  isWasmEnabled,
  argon2idHash,
  getWasmStatus,
} from './wasm-backend.js';

// KMS integration (optional dependency)
export {
  type KMSConfig,
  type KMSClient,
  type KMSEnvelopeEncryptionResult,
  createKMSClient,
  envelopeEncryptWithKMS,
  envelopeDecryptWithKMS,
} from './kms.js';

// Audit logging (optional, disabled by default)
export {
  type AuditLogger,
  type AuditEvent,
  type AuditEventMetadata,
  AuditEventType,
  createAuditEvent,
  setAuditLogger,
  getAuditLogger,
  logKeyCreated,
  logKeyUsed,
  logKeyDeleted,
  logKeyRotated,
  logKeyExpired,
  logSecurityEvent,
  ConsoleAuditLogger,
  createConsoleAuditLogger,
  CustomAuditLogger,
  createCustomAuditLogger,
} from './audit.js';
