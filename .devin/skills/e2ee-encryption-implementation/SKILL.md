---
name: e2ee-encryption-implementation
description: Guides implementation of AES-256-GCM encryption for all user content using @suite/crypto package, including key management, encryption at rest, and proper zero-knowledge patterns
---

## E2EE Encryption Implementation Guide

This skill guides implementation of end-to-end encryption (E2EE) with AES-256-GCM for all user content, ensuring zero-knowledge architecture where the server never has access to encryption keys.

## Zero-Knowledge vs Regular E2EE

**Zero-Knowledge Encryption:**
- Server mathematically cannot access your data—not "promises not to," but physically cannot
- Provider never has access to keys at any point
- Keys are generated and stored client-side only

**Regular E2EE:**
- Encryption in transit, but provider may hold keys
- Keys may be stored server-side (even if encrypted)
- Provider could potentially access data

## Architecture Overview

```
Client (Browser/Mobile)
├── Generate encryption key (Web Crypto API)
├── Encrypt data with AES-256-GCM
├── Send encrypted payload to server
└── Store key locally (IndexedDB / Keychain)

Server (Cloudflare Workers)
├── Receives encrypted ciphertext
├── Stores ciphertext in PostgreSQL/R2
└── Never sees plaintext or keys
```

## Key Generation (Client-Side)

```typescript
// packages/crypto/src/client.ts
import { subtle } from 'crypto';

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}
```

## Encryption (Client-Side)

```typescript
// packages/crypto/src/client.ts
export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const data = enc.encode(plaintext);

  // Generate random IV (never reuse!)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv),
  };
}

export async function decryptData(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const data = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);

  const plaintext = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    data
  );

  const dec = new TextDecoder();
  return dec.decode(plaintext);
}

// Helper functions
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

## Server-Side Storage

The server only stores encrypted data:

```typescript
// apps/drive/api/routes/files.ts
import { Hono } from 'hono';

app.post('/api/files', async (c) => {
  const { filename, ciphertext, iv } = await c.req.json();

  // Store ONLY encrypted data
  await db.insert(files).values({
    id: generateId(),
    filename,
    ciphertext, // Encrypted blob
    iv, // Initialization vector
    userId: c.get('userId'),
    createdAt: new Date(),
  });

  return c.json({ id: fileId });
});
```

## Database Schema

```typescript
// packages/db/src/schema/files.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  ciphertext: text('ciphertext').notNull(), // Encrypted data
  iv: text('iv').notNull(), // IV for decryption
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Key Storage (Client-Side)

### Option 1: IndexedDB (Web)

```typescript
// packages/crypto/src/storage/indexed-db.ts
export async function storeKey(keyId: string, key: CryptoKey): Promise<void> {
  const db = await openDB('suite-keys', 1);
  await db.put('keys', await exportKey(key), keyId);
}

export async function getKey(keyId: string): Promise<CryptoKey | null> {
  const db = await openDB('suite-keys', 1);
  const exported = await db.get('keys', keyId);
  if (!exported) return null;
  return await importKey(exported);
}
```

### Option 2: Secure Storage (Mobile)

```typescript
// Use platform-specific secure storage
// - iOS: Keychain Services
// - Android: Keystore System
// - Desktop: OS keychain
```

## Key Derivation for Multiple Keys

For zero-knowledge, derive separate keys for different purposes:

```typescript
// packages/crypto/src/key-derivation.ts
export async function deriveKeys(masterKey: CryptoKey) {
  // Derive encryption key for data
  const dataKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(16), // Different salt per purpose
      info: new TextEncoder().encode('data-encryption'),
    },
    masterKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Derive key for blind indexing (search)
  const indexKey = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(16),
      info: new TextEncoder().encode('blind-index'),
    },
    masterKey,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );

  return { dataKey, indexKey };
}
```

## Encryption in Domain Layer

```typescript
// packages/domain-drive/src/use-cases/create-file.ts
import { encryptData } from '@suite/crypto/client';

export async function createFile(
  input: CreateFileInput,
  repo: FileRepository,
  encryptionKey: CryptoKey
) {
  // Encrypt content client-side
  const { ciphertext, iv } = await encryptData(input.content, encryptionKey);

  // Store only encrypted data
  const file = new File(
    generateId(),
    input.filename,
    ciphertext,
    iv,
    input.userId
  );

  await repo.save(file);
  return file;
}
```

## Security Best Practices

### 1. Never Reuse IVs

```typescript
// ❌ BAD: Reusing IV breaks encryption
const iv = new Uint8Array(12); // Static IV

// ✅ GOOD: Generate random IV for each encryption
const iv = crypto.getRandomValues(new Uint8Array(12));
```

### 2. Zeroize Sensitive Data

```typescript
// Clear sensitive data from memory after use
function zeroize(buffer: Uint8Array) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = 0;
  }
}
```

### 3. Use HTTPS Everywhere

All API calls must use HTTPS to protect data in transit.

### 4. Key Rotation

Implement key rotation for long-term security:

```typescript
export async function rotateKey(
  oldKey: CryptoKey,
  newKey: CryptoKey,
  encryptedData: string,
  iv: string
): Promise<{ ciphertext: string; iv: string }> {
  // Decrypt with old key
  const plaintext = await decryptData(encryptedData, iv, oldKey);

  // Encrypt with new key
  return await encryptData(plaintext, newKey);
}
```

## Potential Attack Vectors & Mitigations

### Malicious JavaScript

- **Risk**: Compromised JavaScript could exfiltrate keys
- **Mitigation**: Use Subresource Integrity (SRI), CSP headers, audit dependencies

### Browser Vulnerabilities

- **Risk**: Browser exploits could access memory
- **Mitigation**: Keep browsers updated, use secure browsing mode

### Memory Attacks

- **Risk**: Keys in memory could be extracted
- **Mitigation**: Zeroize sensitive data, minimize key lifetime in memory

### Quantum Computing (Future)

- **Risk**: AES-256 may be vulnerable to quantum attacks
- **Mitigation**: Plan migration to post-quantum algorithms when available

## Verification: Trust but Verify

### Check Network Requests

Ensure no plaintext data is sent to server:

```typescript
// Monitor network requests in dev tools
// Verify only encrypted blobs are transmitted
```

### Review Source Code

Audit encryption implementation regularly.

### Test Fragment Behavior

Ensure keys are never exposed in URL fragments.

### Server Audit

Verify server never attempts to decrypt data.

## When to Use Zero-Knowledge

Use zero-knowledge encryption for:
- User documents and files
- Personal notes and journals
- Passwords and secrets
- Private messages
- Financial data

May use server-side encryption for:
- Non-sensitive metadata (timestamps, counts)
- Public content
- Analytics data (anonymized)

## Testing

```typescript
// packages/crypto/src/__tests__/encryption.test.ts
import { describe, it, expect } from 'vitest';
import { generateEncryptionKey, encryptData, decryptData } from '../client';

describe('E2EE Encryption', () => {
  it('should encrypt and decrypt data correctly', async () => {
    const key = await generateEncryptionKey();
    const plaintext = 'Secret message';

    const { ciphertext, iv } = await encryptData(plaintext, key);
    const decrypted = await decryptData(ciphertext, iv, key);

    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertext for same plaintext', async () => {
    const key = await generateEncryptionKey();
    const plaintext = 'Secret message';

    const { ciphertext: c1 } = await encryptData(plaintext, key);
    const { ciphertext: c2 } = await encryptData(plaintext, key);

    expect(c1).not.toBe(c2); // Different IVs
  });

  it('should fail to decrypt with wrong key', async () => {
    const key1 = await generateEncryptionKey();
    const key2 = await generateEncryptionKey();
    const plaintext = 'Secret message';

    const { ciphertext, iv } = await encryptData(plaintext, key1);

    await expect(decryptData(ciphertext, iv, key2)).rejects.toThrow();
  });
});
```

## Checklist

- [ ] All user content encrypted client-side with AES-256-GCM
- [ ] Keys generated and stored client-side only
- [ ] Server never receives plaintext or keys
- [ ] Random IV generated for each encryption
- [ ] Database stores only ciphertext and IV
- [ ] HTTPS used for all API calls
- [ ] Key rotation strategy implemented
- [ ] Sensitive data zeroized after use
- [ ] Encryption tests cover all scenarios
- [ ] Security audit performed

## Related Skills

- **blind-index-search**: Enable search on encrypted data
- **domain-package-implementation**: Integrate encryption in domain layer
- **spec-first-development**: Specify encryption requirements in feature specs
