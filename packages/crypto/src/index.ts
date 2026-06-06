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
