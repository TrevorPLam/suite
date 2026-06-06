---
trigger: model_decision
description: Guidelines for implementing blind indexing with HMAC tokens for searchable encrypted data
---

# Blind Indexing for Encrypted Search

Search over encrypted data requires blind indexing using HMAC tokens. This enables exact-match search without the server seeing plaintext.

## The E2EE Search Paradox

When data is end-to-end encrypted, the server only sees ciphertext. You cannot run SQL `SELECT * WHERE text LIKE '%query%'` on encrypted data.

**Terrible solutions to avoid:**
- Download entire database to client and decrypt locally (performance killer)
- Decrypt temporarily on server to search (violates zero-knowledge)

## The Solution: Blind Indexing

Blind indexing allows the server to look up records without knowing their contents:

1. Client extracts keywords from plaintext
2. Client creates HMAC hashes of keywords using a secret Index_Key
3. Client sends both encrypted payload and HMAC hashes to server
4. Server stores both in database
5. To search, client hashes the query and server matches against stored HMACs

## Implementation Pattern

### 1. Derive Index Key (Client-Side)

```typescript
// Derive a secondary key just for indexing
// Do NOT use your AES encryption key for this!
async function deriveIndexKey(masterPassword: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  
  // Derive an HMAC key, not an AES key
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("static_blind_index_salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "HMAC",
      hash: "SHA-256",
      length: 256
    },
    false,
    ["sign"]
  );
}
```

### 2. Generate Blind Index Token

```typescript
async function generateBlindIndex(keyword: string, hmacKey: CryptoKey): Promise<string> {
  // Normalize data: lowercase, strip whitespace, remove punctuation
  const normalizedWord = keyword.toLowerCase().trim().replace(/[^\w\s]/gi, '');
  
  const signatureBuffer = await window.crypto.subtle.sign(
    "HMAC",
    hmacKey,
    new TextEncoder().encode(normalizedWord)
  );
  
  // Convert to hex string for database storage
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 3. Database Schema

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  ciphertext TEXT NOT NULL,  -- AES-256-GCM encrypted content
  blind_index TEXT NOT NULL  -- HMAC hash for search
);

CREATE INDEX idx_blind_index ON documents(blind_index);
```

### 4. Search Query

```typescript
// Client-side: hash the search query
const searchHash = await generateBlindIndex(query, indexKey);

// Server-side: exact match search
const results = await db
  .select()
  .from(documents)
  .where(eq(documents.blindIndex, searchHash));
```

## Security Requirements

- **Never use simple SHA-256**: Server could run rainbow table attacks
- **Use HMAC with secret key**: Key must never leave the client
- **Separate keys**: Index key must be different from encryption key
- **Normalize input**: Lowercase, strip punctuation before hashing
- **Exact match only**: Blind indexing supports exact matches, not partial matches

## Limitations

Blind indexing only supports:
- Exact match queries
- Case-insensitive (with normalization)
- No fuzzy search
- No semantic search

## When to Use

Use blind indexing for:
- Email search (exact email addresses)
- Username lookup
- Document title search
- Tag/keyword search

Defer semantic search until validated and consider post-quantum alternatives for future-proofing.

## Enforcement

- Code reviews check for plaintext search queries on encrypted data
- Static analysis flags missing HMAC generation for searchable fields
- Security audits verify separate encryption and indexing keys
