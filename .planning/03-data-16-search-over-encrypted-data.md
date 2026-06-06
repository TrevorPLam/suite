## 17. Search Over Encrypted Data

Searching encrypted data is the hardest unsolved problem in end‑to‑end encryption. Encryption randomises data so that identical plaintexts produce different ciphertexts, which is precisely what makes keyword matching impossible on the server side. Every privacy‑preserving search solution must choose a point on the trade‑off triangle between **security**, **performance**, and **query expressiveness** — there is no free lunch. For a suite of 53 applications that must compete with Google Workspace while maintaining a zero‑knowledge guarantee, the Sovereign Suite needs a multi‑layer search strategy: baseline **blind indexing** for exact keyword lookup today, a clear upgrade path to **searchable symmetric encryption (SSE)** as storage scales, and open‑source implementations to meet enterprise customers who demand proof of security. This section documents the production‑ready libraries, the cryptographic primitives, and the layered architecture that makes encrypted search viable without breaking the zero‑knowledge promise.

---

### 17.1 The Fundamental Trade‑Offs of Encrypted Search

Before examining individual technologies, it is essential to understand the landscape that frames every decision. Searchable encryption occupies a design space bounded by three competing objectives:

| Objective | Description | Typical Cost |
|-----------|-------------|--------------|
| **Security** | How much information leaks to the server about queries, documents, and results | Higher security → larger indices, slower queries |
| **Performance** | Query latency, storage overhead, index building time | Faster queries → more leakage or larger client compute |
| **Expressiveness** | What kinds of queries are supported (exact keyword, substring, range, semantic) | Richer queries → more complex protocols, more leakage |

All production systems make trade‑offs in this space. Understanding where each technology sits is essential for choosing the right strategy for each of the 53 applications.

**Leakage** is the critical metric that is often invisible. Even when the server cannot read the plaintext, the server can observe *patterns*: which terms are searched for, which documents share keywords, how many results a query returns, and which documents are added or deleted over time. Academic research in 2026 continues to refine leakage profiles; the state of the art uses **forward and backward privacy** to limit what the server can learn across updates. The SWiSSSE protocol, implemented in the Rose‑Squared SDK, provides both forward security (search tokens generated at time T cannot discover documents added after T) and backward security Type‑II (deleted documents become permanently unreachable via epoch rotation). The Sovereign Suite adopts these modern privacy guarantees from day one.

---

### 17.2 Baseline: Blind Indexing (Production Ready)

Blind indexing is the simplest and most widely deployed approach to encrypted search in production systems today. It works by computing a keyed hash (HMAC) of each keyword in a document and storing that token on the server alongside the encrypted document. At search time, the client recomputes the HMAC of the query term and sends it to the server, which matches tokens without ever seeing the plaintext. This mechanism is described in the ZeroKey and CipherSweet literature and has been validated in production.

**How blind indexing works (conceptual diagram):**

```
Document indexing:
Plaintext keywords → (HMAC + per‑field salt) → Fixed‑length token → stored on server
                                ↑
                        Key never leaves client

Query execution:
Search term "meeting" → (HMAC + same salt) → query token → server matches
```

**Cryptographic primitives:**
- **Key Derivation:** Argon2id for password‑based key derivation (parallelism‑resistant, memory‑hard).
- **HMAC:** HMAC‑SHA‑256 for token generation, using a separate index key that never leaves the device.
- **Salt:** Unique per field (e.g., `email_subject`, `email_body`, `drive_filename`) to prevent cross‑field correlation attacks.
- **Encryption:** AES‑256‑GCM for the document payload (integrity + confidentiality).

**Strengths and limitations:**

| Strength | Limitation |
|----------|-------------|
| Production‑ready, deployed in CipherSweet, ZeroKey, and many other E2EE systems | Exact‑match only — no prefix, substring, fuzzy, or semantic search |
| Very fast — single HMAC per keyword, constant‑time lookup | Leakage: server learns which query tokens match which documents (but not the plaintext) |
| Simple to implement with Web Crypto API | Per‑field salts must be stored and managed per document |
| Incrementally indexable — new keywords added without re‑encrypting | Storage grows with number of unique keywords per document |

**Implementing blind indexing in `packages/crypto`:**

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

**When to use blind indexing in the Sovereign Suite:**
- **Phase 1 (launch):** Email subject lines, contact names, file names, calendar event titles.
- **Phase 2 (scale):** Email bodies (after extracting keywords), document content (after indexing), chat messages.
- **Never:** Passwords (use dedicated vault with its own search strategy), encryption keys, or any field that must remain completely opaque.

For enterprise customers who require provable forward and backward privacy, the Sovereign Suite will upgrade to the Rose‑Squared SDK or Findex once the suite has paying customers and the need for formal security guarantees is validated.

---

### 17.3 Searchable Symmetric Encryption: The Production Path

Searchable symmetric encryption (SSE) is the academic and industry standard for encrypted keyword search. Unlike blind indexing, SSE schemes are designed with formal security proofs that specify exactly what information leaks to the server. The best‑in‑class SSE libraries in 2026 are battle‑tested, memory‑safe, and deployable in production.

#### 17.3.1 Findex: Symmetric Searchable Encryption from Cosmian

Findex is a Rust library that implements a symmetric searchable encryption scheme enabling encrypted search over encrypted data. It allows you to securely index and search encrypted data without compromising privacy or security. The library is organised as a Rust workspace with two crates: `cosmian_findex` (core algorithms) and `cosmian_sse_memories` (storage back‑ends for different databases). Findex is released under the Business Source License 1.1 (BUSL‑1.1), which means it can be used in production but restricts certain commercial use cases. The Findex Server is a production‑ready implementation that can be deployed as a standalone service. The latest release (v8.0.0) was published in August 2025, and there is ongoing development (last commit February 2026).

**Key design choices:**
- Index is stored on the server; client holds only a small state.
- Search tokens are deterministic from the client’s key, enabling offline search.
- Supports dynamic updates (adding and deleting documents) with forward privacy.
- Storage backend pluggable: works with PostgreSQL, S3, etc.

**Integration approach for the Sovereign Suite:**
Instead of implementing SSE from scratch, the Sovereign Suite can deploy a dedicated Findex Server service (as a Worker or as a Docker container on the VPS). The client SDK (the Rust core compiled to WebAssembly) runs in the browser, handling token generation and search protocol execution. This approach adds minimal overhead (the wasm bundle is ~200 KB compressed) and provides formal security guarantees out of the box.

#### 17.3.2 Rose‑Squared SDK: WebAssembly Encrypted Search

The Rose‑Squared SDK implements the SWiSSSE protocol with forward/backward security and volume‑hiding, and it is compilable to WebAssembly. It is designed for browser‑based encrypted search and includes:

- **Strong security guarantees:** Forward security, backward security Type‑II, volume hiding, tamper detection (AES‑256‑GCM authentication tags), memory safety (secrets implement `ZeroizeOnDrop`), and zero unsafe code.
- **O(1) server complexity** — direct hash‑map lookups, not scans or linked‑list traversals.
- **WASM optimised** for browser use with IndexedDB integration for persistent client‑side state.
- **Pluggable storage** via the `EncryptedStore` trait (IndexedDB, SQLite, Redis, S3).

**Basic usage (from the README):**

```rust
use rose_squared_sdk::{PrivacyVault, VolumeConfig};

let password = "secure_password_here";
let config = VolumeConfig::default(); // N_max = 256
let vault = PrivacyVault::new(password, config)?;

vault.add_document("doc_uuid_1", "My secret document content", &["keyword1", "keyword2"])?;
let results = vault.search(&["keyword1"])?;
```

The SDK is licensed under MIT and Apache 2.0, making it suitable for both open‑source and commercial use. It is built on top of the Web Crypto API primitives (Argon2id + HKDF for key derivation, AES‑256‑GCM for encryption). The entire codebase forbids unsafe code (`#![forbid(unsafe_code)]`).

---

### 17.4 CipherStash: Searchable Encryption for PostgreSQL

CipherStash is a production‑ready, field‑level searchable encryption platform for PostgreSQL. It allows you to index and search encrypted data with SQL, without changing your SQL queries. The platform includes:

- `encrypt-query-language` — A Rust library that implements searchable encryption for PostgreSQL, released under MIT.
- `proxy` — A transparent proxy that encrypts data at rest and decrypts on the fly, with no application changes required.
- Field‑level encryption with a unique data key per record, bulk encryption operations, and decryption‑level identity verification.
- Stack (JavaScript/TypeScript SDK) — data‑level access controls via searchable encryption.

**Integration with the Sovereign Suite:**
CipherStash can be deployed as a sidecar container alongside PostgreSQL on the VPS. The proxy intercepts SQL queries, encrypts sensitive columns, and rewrites queries to use encrypted indexes. This approach requires **no code changes** to existing applications — the Calendar API continues to write `title` and `description` as plaintext, but CipherStash encrypts them before storage and rewrites `WHERE title = 'meeting'` to use the encrypted index. The proxy is transparent to the application and operates within the same process or as a separate microservice.

**Limitations for the Sovereign Suite:** The proxy does not work with Cloudflare Hyperdrive because the connection string is internal to Workers. The Sovereign Suite will evaluate CipherStash when self‑hosting the fallback API (Node.js) on the VPS. For Phase 1, the suite relies on application‑layer blind indexing.

---

### 17.5 ZATRON: Semantic Search Under Encryption (Unverified Claims)

ZATRON (Zero‑Access Transformed Retrieval Over Noise) is a recently published privacy‑preserving semantic search algorithm that uses multi‑channel modular arithmetic to hide embedding structure. The claims are remarkable:

- **98% retrieval quality** compared to plaintext cosine on the MSMARCO and Natural Questions benchmarks.
- **8× faster** than CKKS FHE (39ms per comparison → 5ms on identical hardware).
- **Zero correlation** (ρ = 0.034 on the Enron email corpus) between ZATRON‑protected barcode distances and true semantic similarity — meaning the server cannot recover document relationships even with full database access.
- **Multilingual support** across five languages (Arabic, Spanish, Korean, Chinese, English) with quality >93% across all languages.

The GitHub repository is active, with a live demo hosted on Hugging Face Spaces and a US provisional patent filed in 2026. However, the key question for the Sovereign Suite is not the existence of the algorithm, but its **deployment maturity**. As of June 2026:

- **No formal security audit** has been published. The code is not independently verified against the claims.
- **No peer‑reviewed paper** is available for public scrutiny.
- **No client‑side WebAssembly distribution** exists; the repository provides a Python reference implementation.
- **No integration path** with the Sovereign Suite’s TypeScript/Web Crypto stack has been demonstrated.

**Decision for the Sovereign Suite:** ZATRON is **not yet production‑ready**. It is a promising research direction, and the Sovereign Suite will monitor its progress, but it is not a candidate for Phase 1 deployment. Blind indexing and SSE are mature, audited, and deployable today. The ZATRON work is a bet on the future — not a foundation for the present.

---

### 17.6 TIBET Cortex: Zero‑Trust AI Search Pipeline

TIBET Cortex is a Rust framework for building AI knowledge systems where every document chunk protects itself **cryptographically, at every layer, in every state**. It separates search from access:

- **Embeddings are JIS level 0** — always searchable (vector search works on encrypted embeddings).
- **Content is JIS level N** — cryptographically gated, requiring proper credentials to decrypt.
- **Multi‑dimensional JIS claims** — access controlled by role, department, time, geography, and other dimensions.
- **Airlock** — ensures zero plaintext lifetime with mlock/zeroize, and every access is audited.

**How it fits into the Sovereign Suite’s search architecture:**

For the Private AI Assistant (Application #26), TIBET Cortex becomes the secure pipeline for processing user data. The Assistant will:

1. **Ingest encrypted documents** from Drive and Mail.
2. **Decrypt temporarily** inside a trusted execution environment (or in the browser for client‑side mode).
3. **Chunk the content** and generate embeddings using a local LLM.
4. **Package each chunk** into a TIBET Cortex envelope with JIS claims attached (e.g., “role: doctor AND department: cardiology”).
5. **Store the envelope** in the vector database (or in PostgreSQL).
6. **On query**, present JIS claims derived from the current user’s session; TIBET gates which chunks can be decrypted and processed.

The entire pipeline adds ~1.5 ms overhead — less than 0.3% of total processing time — as measured in the documentation. This overhead is acceptable for an Assistant that is already performing LLM inference.

**Integration with `packages/crypto`:** TIBET Cortex is written in Rust, not TypeScript/JavaScript. The Sovereign Suite will:

- Use the TIBET Cortex CLI (`cortex-cli`) for offline processing (chunking, encrypting, embedding generation).
- Call the Cortex API from Workers via HTTP (a future WebAssembly build would be even better).
- For client‑side processing (offline mode on the user’s device), compile TIBET Cortex to WebAssembly and embed it in the Capacitor mobile app.

**Implementation status:** TIBET Cortex is actively maintained, with releases continuing in March and April 2026. The codebase is stable, and the documentation is comprehensive. The Sovereign Suite will adopt TIBET Cortex for the Private AI Assistant in Phase 3, after the core productivity apps are shipping.

---

### 17.7 Garbled Circuits and FHE: Not for the Sovereign Suite

Fully homomorphic encryption (FHE) and garbled circuits (GC) are general‑purpose techniques for computing on encrypted data without decrypting it. The academic literature compares both approaches for privacy‑preserving machine learning, revealing fundamental trade‑offs:

| Technique | Advantages | Disadvantages | Suitability |
|-----------|------------|---------------|-------------|
| **FHE (CKKS)** | Non‑interactive; server computes on ciphertext without client involvement | Extremely high computational overhead (10,000× slower than plaintext); large ciphertexts (hundreds of KB) | Not suitable for latency‑sensitive search |
| **Garbled Circuits** | Faster execution than FHE; lower memory consumption | Interactive (client and server must communicate per query); one‑time use per circuit | Not suitable for dynamic document collections |

The CKKS scheme from the Microsoft SEAL library (FHE) and the TinyGarble2.0 framework (GC) by Intel Labs have been evaluated for two‑layer neural network inference. The results show a clear trade‑off: modular GC offers faster execution and lower memory consumption, while FHE supports non‑interactive inference — but both remain far too slow for real‑time search over documents.

**Decision for the Sovereign Suite:** FHE and GC are not used in the search architecture. They are too slow, too complex, and too research‑focused for a production privacy suite. The combination of blind indexing, SSE, and ZATRON (when mature) already covers the search use cases at acceptable performance.

---

### 17.8 Two‑Layer Search Architecture

The Sovereign Suite implements a **two‑layer search architecture** that combines the strengths of multiple technologies for different query types:

| Layer | Technology | Query Types | Performance | Security Guarantees |
|-------|-----------|-------------|-------------|---------------------|
| **Baseline** | Blind indexing (custom `@suite/crypto`) | Exact keyword, prefix (with truncated tokens) | O(1) per token, sub‑ms latency | Leakage: query‑term → document matches |
| **Production SSE** | Rose‑Squared SDK (WASM) or Findex | Exact keyword, with forward/backward privacy | O(1) server lookups | Formal security proof, volume‑hiding |
| **Future semantic** | ZATRON (when mature) | Semantic (meaning‑based) search | 5–10 ms per query | Zero‑leakage of embedding structure |
| **AI pipeline** | TIBET Cortex | Vector search on encrypted embeddings | ~1.5 ms overhead | Multi‑dimensional JIS claims, zero plaintext lifetime |
| **Database search** | CipherStash (self‑hosted only) | SQL‑over‑encrypted columns (range, equality, full‑text) | Transparent proxy overhead | Field‑level, per‑row keys |

**Default selection per query type:**

```typescript
// packages/search/src/index.ts
export async function search(query: SearchQuery): Promise<SearchResult[]> {
  // 1. Exact keyword search (fastest)
  if (query.type === 'exact') {
    return blindIndexSearch(query);
  }

  // 2. Semantic search (requires more compute but better relevance)
  if (query.type === 'semantic') {
    if (process.env.ZATRON_AVAILABLE === 'true') {
      return zatronSearch(query);
    } else {
      return clientSideTIBETSearch(query); // Offload to client's device
    }
  }

  // 3. Fallback to client‑side filtering if server‑side search fails
  return clientSideFilter(query);
}
```

This layering ensures that the Sovereign Suite always has a working search mechanism, even when newer technologies are not available or are not yet deployed.

---

### 17.9 Index Management and Lifecycle

Encrypted search indices are not free. Each index entry consumes storage and must be updated when documents change. The Sovereign Suite adopts the following index management strategy:

| Document Type | Index Strategy | Update Policy |
|---------------|----------------|----------------|
| **Email subject, contact name, file name** | Blind index per keyword | Update index on every create/update/delete |
| **Email body, document content** | Extract keywords (TF‑IDF or ML) → blind index | Update index weekly (background job); re‑index on content change |
| **Chat messages** | Blind index per message; forward search tokens only | Index on message creation; never update |
| **Calendar events** | Blind index on title, description, attendee names | Index on event creation/update |
| **Vault credentials** | No server‑side search; client‑side filtering only | Not indexed |

The index is stored in the same PostgreSQL database as the encrypted documents, in a separate schema (`search`) with its own tables. The index tables are also encrypted at rest but do not store plaintext.

---

### 17.10 Client‑Side Search vs. Server‑Side Search

Not all search needs to happen on the server. For the following scenarios, client‑side search is the correct choice:

- **Vault passwords:** The entire vault is encrypted and decrypted locally. Search is performed in memory after decryption. No server‑side index is needed.
- **Offline documents:** The service worker caches the user’s recent documents. Search runs on the cached IndexedDB.
- **Small datasets (< 10,000 documents, < 100 MB):** Download all ciphertexts, decrypt locally, filter in memory. This avoids building a server‑side index entirely.

The search method is selected dynamically based on the size of the dataset and the user’s device capabilities. The server returns a `SearchPlan` that indicates whether the query can be answered locally (the server responds with `search_strategy: "client"`) or remotely.

---

### 17.11 AI Agent Rules for Encrypted Search

Add the following to your root `AGENTS.md` to encode encrypted search best practices:

```markdown
## Search Over Encrypted Data — Rules for AI Agents

1. **Never store plaintext tokens in logs.** Index tokens and query tokens are sensitive; log only the first 4 characters for debugging.

2. **Blind indexing is the default for Phase 1.** Use `generateBlindIndexToken` from `@suite/crypto`. Always include a per‑field salt.

3. **Never index high‑entropy or low‑entropy fields.** Do not index randomly generated UUIDs, yes/no booleans, or fields with fewer than 3 possible values.

4. **Use Rose‑Squared SDK for enterprise customers.** When formal security guarantees are required, integrate the WASM module and run server side.

5. **TIBET Cortex is for the AI pipeline only.** Do not integrate TIBET Cortex into general‑purpose search; its overhead is too high for high‑frequency queries.

6. **Client‑side search must be encrypted as well.** Use IndexedDB + Web Crypto to store cached documents. Never store plaintext offline.

7. **Never build a server‑side index for vault items.** Vault entries must be searched client‑side only.

8. **Per‑document encryption keys must rotate when a keyword index is invalidated.** If a document is re‑indexed, generate a new document encryption key.

9. **Index tables must have their own RLS policies.** Separate search schema, enforced by `app.current_tenant_id`.

10. **Monitor index size.** If any user’s index exceeds 5% of total database size, notify and consider switching to Rose‑Squared or client‑side search.
```

---

### 17.12 Summary: Encrypted Search at a Glance

| Technology | Maturity | Security | Performance | Query Types | Integration Effort |
|------------|----------|----------|-------------|-------------|--------------------|
| **Blind indexing (custom)** | Production | Medium (leakage from tokens) | Sub‑ms latency | Exact keyword, prefix | Low (add to `packages/crypto`) |
| **Rose‑Squared SDK** | Production (MIT) | High (formal proof, forward/backward, volume‑hiding) | O(1) server lookups | Exact keyword, conjunctive | Medium (WASM integration) |
| **Findex (Cosmian)** | Production (BUSL‑1.1) | High (forward privacy) | Moderate | Exact keyword | High (deploy Findex Server) |
| **CipherStash** | Production (MIT) | High (field‑level, per‑row keys) | Transparent proxy overhead | SQL range, equality, full‑text | Medium (deploy proxy) |
| **ZATRON** | Research (patent pending) | Claimed zero‑leakage | 8× faster than FHE (~5 ms) | Semantic (meaning‑based) | High (no JS/WASM) |
| **TIBET Cortex** | Stable (Rust) | Multi‑dimensional JIS claims | ~1.5 ms overhead | Vector search over encrypted embeddings | Medium (HTTP API or WASM) |
| **FHE / GC** | Research | Strongest (no leakage) | 10,000× slower | Arbitrary functions | Prohibitive |

**Strategic decision for the Sovereign Suite:** Deploy **blind indexing** for Phase 1. For paying enterprise customers who require formal security guarantees, adopt **Rose‑Squared SDK** (WASM) or **Findex** depending on deployment environment. Keep **ZATRON** and **TIBET Cortex** in the research pipeline for future enhancements. **FHE and GC are not used.**

---

**[End of Section 17 — Next: Section 18: CI/CD Pipelines & Secrets Management]**