---
trigger: glob
globs: apps/*/src/**/*.ts, packages/domain-*/**/*.ts
---

# End-to-End Encryption (E2EE)

All user content must be encrypted with AES-256-GCM before storage. This is non-negotiable for zero-knowledge architecture.

## Encryption Requirements

### What Must Be Encrypted

- User documents, files, and content
- Calendar events and metadata
- Task descriptions and details
- Chat messages and conversation history
- Contact information
- Passwords and secrets
- Any personally identifiable information (PII)

### Encryption Standard

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key derivation**: Use Web Crypto API's PBKDF2 or Argon2 for key derivation
- **Key storage**: Keys never leave the user's device
- **Key rotation**: Implement per-session or per-document key rotation

## Implementation Pattern

Use the `@suite/crypto` package for all encryption operations:

```typescript
import { encrypt, decrypt } from '@suite/crypto';

// Encrypt before storage
const encrypted = await encrypt(plaintext, userKey);
await db.insert(encryptedData).values({ ciphertext: encrypted });

// Decrypt after retrieval
const ciphertext = await db.select().from(encryptedData);
const plaintext = await decrypt(ciphertext, userKey);
```

## Key Management Principles

Based on 2026 E2EE best practices:

1. **Client-side encryption only**: Keys never sent to server
2. **Ephemeral key pairs**: Use per-session keys for forward secrecy
3. **Post-quantum readiness**: Consider SPQR (Signal's post-quantum ratchet) for future-proofing
4. **Metadata minimization**: Encrypt or minimize metadata that could reveal patterns
5. **Secure key storage**: Use platform secure storage (Keychain, Credential Manager)

## Zero-Knowledge Guarantee

The server must never see:
- Plaintext user content
- User encryption keys
- Plaintext passwords (use bcrypt/argon2 with proper salt)
- Private keys for cryptographic operations

## Common Mistakes to Avoid

- ❌ Encrypting on the server (violates zero-knowledge)
- ❌ Storing keys in the database
- ❌ Using weak encryption (AES-128, ECB mode)
- ❌ Reusing IVs (initialization vectors)
- ❌ Hardcoding encryption keys
- ❌ Sending keys in API responses
- ❌ Logging sensitive data

## Post-Quantum Considerations

While AES-256-GCM is currently secure, 2026 best practices recommend:

- Plan for post-quantum migration path
- Consider hybrid key exchange (classical + post-quantum)
- Implement key rotation strategy
- Monitor NIST post-quantum cryptography standards

## Enforcement

- Code reviews check for direct plaintext storage
- Static analysis flags missing encryption calls
- Tests verify data is encrypted before database writes
- Security audits review key management practices
