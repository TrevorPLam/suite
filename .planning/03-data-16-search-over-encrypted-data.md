## 17. Search Over Encrypted Data

> See [99-research-pipeline.md](99-research-pipeline.md) for ZATRON, FHE/Garbled Circuits, and TIBET Cortex deep dives.

---

### 17.1 Trade‑Off Triangle

| Objective | Cost |
|-----------|------|
| **Security** | Higher security → larger indices, slower queries |
| **Performance** | Faster queries → more leakage or larger client compute |
| **Expressiveness** | Richer queries → more complex protocols, more leakage |

**Leakage:** Even when the server cannot read plaintext, it observes patterns (search terms, shared keywords, result counts, update patterns). The state of the art uses **forward and backward privacy** to limit this. The SWiSSSE protocol (Rose‑Squared SDK) provides both.

---

### 17.2 Baseline: Blind Indexing

HMAC‑SHA‑256 of each keyword, stored as a token alongside the encrypted document. Client recomputes HMAC at search time; server matches tokens without seeing plaintext.

**Primitives:** Argon2id (KDF), HMAC‑SHA‑256 (token), per‑field salt, AES‑256‑GCM (payload).

**Strengths:** Production‑ready (CipherSweet, ZeroKey), very fast (single HMAC), simple (Web Crypto API), incrementally indexable.

**Limitations:** Exact‑match only; leakage of query‑token → document matches; storage grows with unique keywords.

```typescript
// packages/crypto/src/blind-index.ts
export async function generateBlindIndexToken(
  plaintext: string,
  salt: Uint8Array,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const saltedData = new Uint8Array(salt.length + data.length);
  saltedData.set(salt);
  saltedData.set(data, salt.length);
  const hash = await crypto.subtle.sign('HMAC', key, saltedData);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}
```

**Phase 1 use:** Email subjects, contact names, file names, calendar titles.

**Never index:** Passwords, encryption keys, UUIDs, booleans, or fields with <3 values.

---

### 17.3 Production SSE Path

#### Rose‑Squared SDK (MIT / Apache 2.0)
SWiSSSE protocol with forward/backward privacy, volume‑hiding, O(1) server lookups. WASM compilation for browser use with IndexedDB state. Built on Web Crypto (Argon2id + HKDF + AES‑256‑GCM). Zero unsafe code.

#### Findex (Cosmian, BUSL‑1.1)
Rust SSE library with pluggable backends (PostgreSQL, S3). Client SDK compiled to WASM (~200 KB). Deploy as Worker or Docker on VPS.

**Decision:** Adopt Rose‑Squared SDK or Findex for enterprise customers requiring formal proofs. Blind indexing is default for Phase 1.

---

### 17.4 CipherStash

Transparent PostgreSQL proxy for field‑level searchable encryption. Requires **no code changes** — intercepts SQL, encrypts columns, rewrites queries.

**Limitation:** Does not work with Hyperdrive (connection string is internal to Workers). Evaluate when self‑hosting fallback API on VPS.

---

### 17.5 Two‑Layer Search Architecture

| Layer | Technology | Query Types | Performance | Security |
|-------|-----------|-------------|-------------|----------|
| **Baseline** | Blind indexing (`@suite/crypto`) | Exact keyword, prefix | Sub‑ms | Token leakage |
| **Production SSE** | Rose‑Squared SDK or Findex | Exact keyword, forward/backward privacy | O(1) | Formal proof, volume‑hiding |
| **Future semantic** | ZATRON (when mature) | Semantic | ~5–10 ms | Claimed zero‑leakage |
| **AI pipeline** | TIBET Cortex | Vector search on encrypted embeddings | ~1.5 ms | JIS claims, zero plaintext lifetime |
| **DB search** | CipherStash (self‑hosted only) | SQL range, equality, full‑text | Proxy overhead | Per‑row keys |

```typescript
// packages/search/src/index.ts
export async function search(query: SearchQuery): Promise<SearchResult[]> {
  if (query.type === 'exact') return blindIndexSearch(query);
  if (query.type === 'semantic') {
    return process.env.ZATRON_AVAILABLE === 'true'
      ? zatronSearch(query)
      : clientSideTIBETSearch(query);
  }
  return clientSideFilter(query);
}
```

---

### 17.6 Index Management

| Document Type | Strategy | Update Policy |
|---------------|----------|---------------|
| Email subject, contact name, file name | Blind index per keyword | On every write |
| Email body, document content | Keyword extract → blind index | Weekly background job |
| Chat messages | Blind index per message | On creation; never update |
| Calendar events | Blind index on title, description, attendees | On write |
| Vault credentials | **Client‑side only** | Not indexed |

Index stored in PostgreSQL `search` schema. Index tables encrypted at rest.

---

### 17.7 Client‑Side Search

Use when:
- Vault passwords (decrypt locally, search in memory)
- Offline documents (cached in IndexedDB)
- Small datasets (<10k docs, <100 MB)

Server returns a `SearchPlan` indicating `search_strategy: "client"` or `"remote"`.

---

### 17.8 AI Agent Rules for Search

1. Never log plaintext tokens (first 4 chars only for debug).
2. Blind indexing is Phase 1 default. Always use per‑field salt.
3. Never index high‑ or low‑entropy fields.
4. Rose‑Squared SDK for enterprise customers requiring formal guarantees.
5. TIBET Cortex is for AI pipeline only — not general‑purpose search.
6. Client‑side search must use IndexedDB + Web Crypto; never plaintext offline.
7. Never build a server‑side index for vault items.
8. Rotate per‑document encryption keys when index is invalidated.
9. Index tables must have separate RLS policies (`app.current_tenant_id`).
10. Alert if any user’s index exceeds 5% of DB size.

---

**[End of Section 17 — Next: Section 18: CI/CD Pipelines & Secrets Management]**