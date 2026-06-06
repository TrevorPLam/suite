# WebAssembly Backend for @suite/crypto

## Overview

The `@suite/crypto` package uses a hybrid architecture combining the Web Crypto API (primary) with an optional WebAssembly backend (libsodium.js) for advanced cryptographic features not available in browsers.

## Architecture

### Primary: Web Crypto API
- **Default backend** for all cryptographic operations
- Browser-native, no additional dependencies
- Small bundle size
- Supports: AES-GCM, X25519, PBKDF2, HKDF, HMAC-SHA256

### Optional: WebAssembly Backend
- **Optional dependency** via `libsodium` package
- Provides advanced features not in Web Crypto API
- Disabled by default to maintain small bundle size
- Supports: Argon2id password hashing

## When to Use WASM Backend

### Use WASM Backend For:
- **Argon2id password hashing** - Memory-hard algorithm superior to PBKDF2
- Environments where libsodium.js is installed
- Applications requiring NIST-recommended password hashing

### Use Web Crypto API For:
- All other cryptographic operations (encryption, key exchange, etc.)
- Environments without libsodium.js
- Applications prioritizing minimal bundle size

## Bundle Size Implications

### Without WASM Backend (Default)
- **Bundle size**: ~15 KB (minified)
- **Dependencies**: None (uses browser APIs only)
- **Load time**: Instant (no WASM initialization)

### With WASM Backend (Optional)
- **Bundle size**: ~15 KB + ~150 KB (libsodium.js)
- **Dependencies**: `libsodium` (optional)
- **Load time**: Additional ~50-100ms for WASM initialization

**Recommendation**: Keep WASM backend disabled unless you need Argon2id.

## Feature Flags

### Enable WASM Backend
```typescript
import { enableWasmBackend, argon2idHash } from '@suite/crypto';

// Enable WASM backend before using Argon2id
enableWasmBackend();

// Use Argon2id for password hashing
const salt = crypto.getRandomValues(new Uint8Array(16));
const derivedKey = await argon2idHash('password', salt, 3, 65536, 1);
```

### Disable WASM Backend
```typescript
import { disableWasmBackend } from '@suite/crypto';

// Force Web Crypto API only
disableWasmBackend();
```

### Check WASM Availability
```typescript
import { isWasmAvailable, getWasmStatus } from '@suite/crypto';

// Check if libsodium.js is available
const available = await isWasmAvailable();

// Get full status
const status = await getWasmStatus();
console.log(status); // { available: boolean, enabled: boolean }
```

## Fallback Behavior

The `argon2idHash` function automatically falls back to PBKDF2-SHA256 if:
- WASM backend is not enabled
- libsodium.js is not installed
- WebAssembly is not supported
- Argon2id operation fails

This ensures compatibility across all environments.

## Usage Examples

### Password Hashing with Argon2id
```typescript
import { enableWasmBackend, argon2idHash, generateSalt } from '@suite/crypto';

// Enable WASM backend
enableWasmBackend();

// Generate a random salt
const salt = generateSalt(16);

// Hash password with Argon2id (recommended settings)
const hash = await argon2idHash(
  'user-password',
  salt,
  3,      // iterations
  65536,  // memory (64 MB)
  1       // parallelism
);

// hash is a 32-byte Uint8Array
```

### Password Hashing with PBKDF2 (Fallback)
```typescript
import { argon2idHash, generateSalt } from '@suite/crypto';

// No need to enable WASM backend
// Automatically uses PBKDF2 fallback

const salt = generateSalt(16);
const hash = await argon2idHash(
  'user-password',
  salt,
  310000  // PBKDF2 iterations (higher for security)
);

// hash is a 32-byte Uint8Array
```

### Conditional WASM Usage
```typescript
import { isWasmAvailable, enableWasmBackend, argon2idHash } from '@suite/crypto';

async function hashPassword(password: string, salt: Uint8Array) {
  const available = await isWasmAvailable();
  
  if (available) {
    enableWasmBackend();
    // Use Argon2id (superior)
    return await argon2idHash(password, salt, 3, 65536, 1);
  } else {
    // Use PBKDF2 fallback
    return await argon2idHash(password, salt, 310000);
  }
}
```

## Argon2id Benefits

### Compared to PBKDF2
- **Memory-hard**: Resistant to GPU/ASIC attacks
- **NIST-recommended**: Winner of Password Hashing Competition
- **Configurable**: Tunable memory, time, and parallelism
- **Future-proof**: Designed for modern hardware

### Recommended Settings
- **Interactive use**: iterations=3, memory=65536 (64MB), parallelism=1
- **Sensitive data**: iterations=4, memory=131072 (128MB), parallelism=2
- **High security**: iterations=5, memory=262144 (256MB), parallelism=4

## Installation

### Install Optional Dependency
```bash
pnpm install libsodium
```

### Verify Installation
```typescript
import { isWasmAvailable } from '@suite/crypto';

const available = await isWasmAvailable();
console.log('WASM available:', available);
```

## Testing

The WASM backend tests automatically skip if libsodium.js is not installed:

```bash
# Run tests (skips WASM tests if libsodium not installed)
pnpm --filter @suite/crypto test
```

## Security Considerations

### WASM Backend Security
- **No plaintext keys in memory**: libsodium.js uses secure memory
- **Constant-time operations**: Resistant to timing attacks
- **Audited implementation**: libsodium is extensively audited

### Fallback Security
- **PBKDF2 is still secure**: NIST-approved algorithm
- **High iteration count**: 310,000 iterations by default
- **Salt required**: Always use random salt

## Performance

### Argon2id Performance
- **Hash time**: ~50-200ms (depending on settings)
- **Memory usage**: Configurable (default 64MB)
- **Parallelism**: Configurable (default 1 thread)

### PBKDF2 Performance
- **Hash time**: ~100-300ms (310,000 iterations)
- **Memory usage**: Minimal
- **Parallelism**: Single-threaded

## Browser Compatibility

### Web Crypto API Support
- Chrome 37+
- Firefox 34+
- Safari 11+
- Edge 12+

### WebAssembly Support
- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## Troubleshooting

### WASM Backend Not Available
- Verify libsodium.js is installed: `pnpm list libsodium`
- Check WebAssembly support in browser
- Ensure no CSP restrictions on WASM

### Argon2id Falls Back to PBKDF2
- Check if `enableWasmBackend()` was called
- Verify `isWasmAvailable()` returns true
- Check console for error messages

### Bundle Size Too Large
- Ensure WASM backend is disabled by default
- Use dynamic imports for libsodium.js (handled automatically)
- Consider tree-shaking configuration

## Future Enhancements

Potential future WASM backend features:
- Post-quantum algorithms (CRYSTALS-Kyber, CRYSTALS-Dilithium)
- Additional password hashing algorithms (scrypt, bcrypt)
- Advanced key derivation functions

## References

- [libsodium.js GitHub](https://github.com/jedisct1/libsodium.js/)
- [Argon2 Specification](https://tools.ietf.org/html/rfc9106)
- [Password Hashing Competition](https://www.password-hashing.net/)
- [Web Crypto API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
