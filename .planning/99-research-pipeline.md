# Research Pipeline & Future Directions

Technologies and strategies evaluated but **not** used in Phase 1. Referenced from other planning docs; consolidated here to avoid bloat.

---

## 1. Strategic Shifts from v5 → v6

| v5 (Original) | v6 (Revised) | Rationale |
|---|---|---|
| Separate `modules/` for bounded contexts | `packages/domain-*` alongside `packages/` | Eliminates decision paralysis |
| Full Clean Architecture (commands/handlers/repos) | Pragmatic vertical slices (one file per use case) | Prevents file explosion for 53 apps |
| Domain events + message broker | Direct HTTP via Service Bindings | Simpler, zero cost, no eventual consistency |
| PartyKit for real‑time | Raw Durable Objects + Hibernation API | Full control, no dependency |
| Drizzle migrations at Worker startup | CI‑run migrations per domain | Workers have no filesystem |
| Clerk as potential auth | Better Auth only (self‑hosted) | $0 at 100k MAU vs ~$2k/month |

## 2. ZATRON: Semantic Search Under Encryption

Claims: 98% retrieval quality vs plaintext cosine; 8× faster than CKKS FHE; zero correlation (ρ=0.034) on Enron corpus; multilingual >93%.

**Status: Not production‑ready.** No formal audit, no peer‑reviewed paper, no JS/WASM distribution, no integration path with TypeScript/Web Crypto.

**Decision:** Monitor progress. Not a candidate for Phase 1. Blind indexing and SSE are deployable today.

## 3. FHE / Garbled Circuits

| Technique | Advantages | Disadvantages |
|---|---|---|
| FHE (CKKS) | Non‑interactive server compute | 10,000× slower than plaintext; large ciphertexts |
| Garbled Circuits | Faster than FHE; lower memory | Interactive per query; one‑time use per circuit |

**Decision:** Not used. Too slow and research‑focused for production search.

## 4. TIBET Cortex: Zero‑Trust AI Search Pipeline

Rust framework separating search from access via JIS claims. Embeddings are always searchable (JIS level 0); content is cryptographically gated (JIS level N).

**Decision:** Adopt for Private AI Assistant (App #26) in Phase 3, after core productivity apps ship. Not for general‑purpose search (overhead too high for high‑frequency queries).

## 5. Scaling & Full Self‑Hosting Roadmap

### Bottlenecks

| Component | Free Tier Limit | Scaling Strategy |
|---|---|---|
| Workers | 100k/day | Upgrade to Paid ($5/mo + usage); migrate to VPS |
| Durable Objects | ~20k connections/DO | Shard across multiple DOs |
| R2 | 10 GB | Lifecycle policies; multi‑region replication |
| PostgreSQL | Single node | Read replicas → partitioning → Citus |
| Hyperdrive | 1 free config | Upgrade to paid for larger pools |

### Migration Path (Workers → VPS)

Same Hono code runs on Node.js. Changes: `createDbClient(process.env.DATABASE_URL)` instead of Worker env binding; HTTP calls instead of Service Bindings.

Gradual traffic migration: 100%→90%→50%→10%→0% Workers over 4 weeks using Cloudflare Load Balancing.

### DO Sharding

- **Hash‑based:** `md5(roomId) % shardCount` → separate DO per shard.
- **Leader‑follower:** One leader DO for writes; follower DOs for reads and WebSocket connections.

## 6. eIDAS 2.0

Requires EU member states to provide EUDI Wallets by end of 2026. Regulated industries must accept them for SCA by Dec 2027.

| Phase | Timeline | Actions |
|---|---|---|
| 1 | Q3 2026 – Q2 2027 | EUDI Wallet login via OIDC; bind to Better Auth account table |
| 2 | Q3 2027 – Q4 2027 | Wallet QR scanning in Authenticator app; wallet‑based digital signatures |
| 3 | 2028+ | Explore becoming a Qualified Trust Service Provider (QTSP) |

## 7. SOC 2

| Type | Description | Timeline | Cost | When to Pursue |
|---|---|---|---|---|
| Type I | Design of controls at a point in time | 6–10 weeks | $5k–$25k | First enterprise prospect requests it |
| Type II | Operating effectiveness over 6–12 months | 6–12 months after Type I | $20k–$100k+ | Contract >$50k ARR contingent on SOC 2 |

Controls already implemented: E2EE, RLS, DO hibernation, WAF, rate limiting, Grype scanning.

## 8. Post‑Quantum Cryptography (PQC)

NIST finalized ML‑KEM (FIPS 203), ML‑DSA (FIPS 204), SLH‑DSA (FIPS 205) in Aug 2024. Classical algorithms deprecated by 2030, disallowed by 2035 per CNSA 2.0.

Long‑lived encrypted blobs (Drive files, Vault credentials) are harvest‑now‑decrypt‑later targets. Plan PQC migration before 2029. Annotate blob fields with zero‑knowledge lifetime >5 years as `@pqc-migration-candidate`.

## 9. PQC Migration Note

All classical algorithms (ECDH P‑384, AES‑256‑GCM) are deprecated by 2030. Annotate any blob field with a zero‑knowledge lifetime >5 years as `@pqc-migration-candidate` in the schema.
