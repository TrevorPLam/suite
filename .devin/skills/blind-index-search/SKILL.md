---
name: blind-index-search
description: Guides implementation of exact-match search via HMAC tokens for encrypted data, with patterns for blind indexing and deferred semantic search
---

## Blind Index Search Implementation Guide

This skill guides implementation of blind indexing for searching encrypted data without the server knowing the plaintext content.

## The E2EE Search Paradox

How do you run `SELECT * WHERE text LIKE '%query%'` when the server only sees random, cryptographically secure blobs of text? You can't.

**Historical bad solutions:**
- **Performance Killer**: Download entire encrypted database to client, decrypt in memory, search locally
- **Security Compromise**: Send query to server, decrypt temporarily in RAM to search (violates zero-knowledge)

## The Solution: Blind Indexing

Blind Indexing (Searchable Symmetric Encryption) allows the server to look up records without knowing what those records contain.

Instead of just encrypting the payload, the client:
1. Extracts keywords from the plaintext
2. Creates cryptographic hashes (HMACs) of those keywords using a separate secret `Index_Key`
3. Sends those hashes to the server alongside the encrypted payload

The server can search by hash but cannot reverse the hash to get the plaintext.

## Architecture

```
Client Side:
├── Plaintext: "Meeting with John"
├── Extract keywords: ["meeting", "with", "john"]
├── Generate HMAC for each keyword using Index_Key
├── Encrypt payload with AES-256-GCM
└── Send: { ciphertext, iv, blindIndexes: ["abc123...", "def456..."] }

Server Side:
├── Store: { ciphertext, iv, blindIndexes }
├── Search: SELECT * WHERE blind_indexes @> ARRAY['abc123...']
└── Return encrypted results
```

## Key Derivation

Derive a separate key for indexing (NOT the encryption key):

```typescript
// packages/crypto/src/client.ts
import { subtle } from 'crypto';

export async function deriveIndexKey(masterPassword: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // Derive an HMAC key, NOT an AES key
  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('static_blind_index_salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'HMAC',
      hash: 'SHA-256',
      length: 256,
    },
    false,
    ['sign']
  );
}
```

## Generate Blind Index

```typescript
// packages/crypto/src/client.ts
export async function generateBlindIndex(
  keyword: string,
  hmacKey: CryptoKey
): Promise<string> {
  // Normalize data: lowercase, strip whitespace, remove punctuation
  const normalizedWord = keyword
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '');

  const signatureBuffer = await subtle.sign(
    'HMAC',
    hmacKey,
    new TextEncoder().encode(normalizedWord)
  );

  // Convert to hex string for database storage
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

## Extract Keywords

```typescript
// packages/crypto/src/client.ts
export function extractKeywords(text: string): string[] {
  // Simple word extraction
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2); // Ignore short words

  // Remove duplicates
  return [...new Set(words)];
}
```

## Client-Side Usage

```typescript
// apps/drive/src/components/file-upload.tsx
import { encryptData, deriveIndexKey, generateBlindIndex, extractKeywords } from '@suite/crypto/client';

export async function uploadFile(file: File, content: string, masterPassword: string) {
  // 1. Derive keys
  const encryptionKey = await deriveKeyFromPassword(masterPassword);
  const indexKey = await deriveIndexKey(masterPassword);

  // 2. Encrypt content
  const { ciphertext, iv } = await encryptData(content, encryptionKey);

  // 3. Generate blind indexes
  const keywords = extractKeywords(content);
  const blindIndexes = await Promise.all(
    keywords.map((keyword) => generateBlindIndex(keyword, indexKey))
  );

  // 4. Send to server
  await fetch('/api/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      ciphertext,
      iv,
      blindIndexes,
    }),
  });
}
```

## Database Schema

```typescript
// packages/db/src/schema/files.ts
import { pgTable, uuid, text, timestamp, array } from 'drizzle-orm/pg-core';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: text('filename').notNull(),
  ciphertext: text('ciphertext').notNull(),
  iv: text('iv').notNull(),
  blindIndexes: text('blind_indexes').array().notNull(), // Array of HMAC hashes
  userId: uuid('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## Server-Side Search

```typescript
// apps/drive/api/routes/files.ts
import { Hono } from 'hono';
import { generateBlindIndex } from '@suite/crypto/client';

const app = new Hono();

app.get('/files/search', async (c) => {
  const query = c.req.query('q');
  const indexKey = c.get('indexKey'); // Derived from user's session

  // Generate blind index for search query
  const blindIndex = await generateBlindIndex(query, indexKey);

  // Search by blind index
  const files = await db.query.files.findMany({
    where: sql`${files.blindIndexes} @> ARRAY[${blindIndex}]`,
  });

  return c.json(files);
});
```

## Exact Match vs Partial Match

### Exact Match (Current Implementation)

```typescript
// Exact match only
const blindIndex = await generateBlindIndex('meeting', indexKey);
// Finds: "meeting", "Meeting", "MEETING"
// Does NOT find: "meetings", "meeting room"
```

### Partial Match (Advanced)

For partial matches, generate blind indexes for word prefixes:

```typescript
export async function generatePartialBlindIndexes(
  word: string,
  indexKey: CryptoKey
): Promise<string[]> {
  const indexes: string[] = [];

  // Generate indexes for prefixes
  for (let i = 3; i <= word.length; i++) {
    const prefix = word.substring(0, i);
    indexes.push(await generateBlindIndex(prefix, indexKey));
  }

  return indexes;
}

// For "meeting", generates indexes for: "mee", "meet", "meeti", "meetin", "meeting"
// Allows partial matches like "meet" to find "meeting"
```

## Performance Considerations

### Index Size

Blind indexes increase storage requirements:
- Each word = 64-character hex string (SHA-256)
- 1000 words = 64KB of indexes per document

**Mitigation:**
- Limit to top N keywords per document
- Use shorter hash (SHA-1 = 40 chars) if security requirements allow
- Implement keyword ranking (TF-IDF) to keep only important words

### Search Performance

Array containment queries can be slow with large arrays:

```sql
-- Slow with large arrays
SELECT * WHERE blind_indexes @> ARRAY['hash'];

-- Faster with GIN index
CREATE INDEX idx_blind_indexes ON files USING GIN (blind_indexes);
```

## Security Considerations

### Key Separation

**CRITICAL**: Never use the encryption key for blind indexing.

```typescript
// ❌ BAD: Same key for encryption and indexing
const key = await deriveKey(password);
const encrypted = await encrypt(data, key);
const index = await generateBlindIndex(keyword, key);

// ✅ GOOD: Separate keys
const encryptionKey = await deriveEncryptionKey(password);
const indexKey = await deriveIndexKey(password);
const encrypted = await encrypt(data, encryptionKey);
const index = await generateBlindIndex(keyword, indexKey);
```

### Rainbow Table Attacks

Using HMAC with a secret key prevents rainbow table attacks. The server cannot reverse the hash without the key.

### Frequency Analysis

Blind indexes leak information about word frequency. If "abc123..." appears in 1000 documents, attackers know a common word exists.

**Mitigation:**
- Add random salt to each index (prevents exact frequency counting)
- Use Bloom filters for approximate matching

## Deferred Semantic Search

For semantic search (vector embeddings), defer until validated:

```typescript
// Future implementation
export async function generateSemanticIndex(text: string): Promise<number[]> {
  // Use embedding model (e.g., OpenAI embeddings)
  // Store encrypted embeddings
  // Search with cosine similarity
  // DEFER: Requires server-side decryption or homomorphic encryption
}
```

## Testing

```typescript
// packages/crypto/src/__tests__/blind-index.test.ts
import { describe, it, expect } from 'vitest';
import { deriveIndexKey, generateBlindIndex, extractKeywords } from '../client';

describe('Blind Index', () => {
  it('should generate consistent hashes for same input', async () => {
    const key = await deriveIndexKey('password');
    const hash1 = await generateBlindIndex('meeting', key);
    const hash2 = await generateBlindIndex('meeting', key);

    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', async () => {
    const key = await deriveIndexKey('password');
    const hash1 = await generateBlindIndex('meeting', key);
    const hash2 = await generateBlindIndex('calendar', key);

    expect(hash1).not.toBe(hash2);
  });

  it('should normalize input', async () => {
    const key = await deriveIndexKey('password');
    const hash1 = await generateBlindIndex('Meeting', key);
    const hash2 = await generateBlindIndex('meeting', key);

    expect(hash1).toBe(hash2);
  });

  it('should extract keywords from text', () => {
    const keywords = extractKeywords('Meeting with John tomorrow');
    expect(keywords).toContain('meeting');
    expect(keywords).toContain('john');
    expect(keywords).toContain('tomorrow');
  });
});
```

## Anti-Patterns to Avoid

### ❌ Simple Hash Without Key

```typescript
// BAD: Vulnerable to rainbow table attacks
const hash = await crypto.subtle.digest('SHA-256', encoder.encode(keyword));
```

### ❌ Using Encryption Key for Indexing

```typescript
// BAD: Compromises encryption if index key is exposed
const index = await generateBlindIndex(keyword, encryptionKey);
```

### ❌ Server-Side Decryption for Search

```typescript
// BAD: Violates zero-knowledge
const decrypted = await decrypt(ciphertext, key);
const results = decrypted.filter(text => text.includes(query));
```

## Checklist

- [ ] Separate index key derived from master password
- [ ] Blind indexes use HMAC with secret key
- [ ] Keywords normalized before hashing
- [ ] Database schema includes blind_indexes array column
- [ ] GIN index created on blind_indexes column
- [ ] Server searches by blind index, not plaintext
- [ ] Client generates blind indexes before upload
- [ ] Encryption key and index key are separate
- [ ] Tests cover hash consistency and normalization
- [ ] Semantic search deferred until validated

## Related Skills

- **e2ee-encryption-implementation**: Encrypt data before blind indexing
- **domain-package-implementation**: Integrate search in domain layer
- **spec-first-development**: Specify search requirements in feature specs
