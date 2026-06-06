## 2. High‑Level Architecture

### 2.1 Three Planes

| Plane | Purpose | Components |
|-------|---------|------------|
| **Edge** | User‑facing, globally distributed, stateless | Cloudflare Pages (SPA), Workers (Hono API), R2 (files), Durable Objects (real‑time) |
| **Control** | Auth, identity, sessions | Better Auth (embedded in each Worker), PostgreSQL (shared users) |
| **Data** | Persistent encrypted data | PostgreSQL (per‑app schemas), R2 (blobs), local SQLite (offline sync) |

### 2.2 Topology

```
Browser/Mobile (Vite SPA / Capacitor)
  → HTTPS (TLS 1.3) → Cloudflare Edge
    → Pages (static assets) | Workers (Hono APIs) | R2 (encrypted files) | DOs (WebSockets)
    → Hyperdrive (connection pool + cache)
      → Contabo VPS (PostgreSQL 17 in Docker)
        → Optional fallback Node.js API (same Hono code)
```

### 2.3 Request Flows

**Authenticated API request:**
```
Browser → Cloudflare → Worker → Hyperdrive → PostgreSQL → Worker → Browser
```
Worker validates session via Better Auth, calls domain package, returns ciphertext. Client decrypts.

**Cross‑domain call:**
```
Calendar Worker → Service Binding (RPC) → Drive Worker → Calendar Worker
```
Zero extra cost, stays inside Cloudflare network. Async workflows (Phase 3) use Cloudflare Queues.

### 2.4 Component Details

| Component | Role | Free Tier |
|-----------|------|-----------|
| **Cloudflare Pages** | Hosts each app’s Vite SPA independently | Unlimited bandwidth, 500 builds/mo |
| **Cloudflare Workers** | Hono API per app | 100k requests/day |
| **Hyperdrive** | Connection pool + query cache to VPS Postgres | 1 database config |
| **R2** | Encrypted file storage | 10 GB, zero egress |
| **Durable Objects** | One DO per room (chat, doc, board). Hibernation API for zero idle cost | 1M requests/mo, 400k GB‑s |
| **Contabo VPS** | PostgreSQL 17 (Docker). WAL streaming to R2 | Already paid |
| **Better Auth** | Embedded in each Worker. Same `@suite/auth` package, shared DB | $0 |

> See [01-architecture-02-technology-stack.md](01-architecture-02-technology-stack.md) for technology justifications.
> See [00-glossary-and-principles.md](00-glossary-and-principles.md) for E2EE key hierarchy.

### 2.5 E2EE Data Flow

| Layer | Data State | Decryptor |
|-------|-----------|-----------|
| Browser (pre‑network) | Plaintext | User only |
| TLS (in transit) | TLS‑encrypted | Cloudflare edge (transient) |
| Worker / Postgres / R2 | AES‑256‑GCM ciphertext | User only (keys never sent to server) |

### 2.6 Cross‑Domain Communication

| Pattern | Use | Implementation |
|---------|-----|----------------|
| Service Binding | Sync request‑response (default) | `env.B_SERVICE.fetch()` |
| Cloudflare Queues | Async workflows (Phase 3) | Publish → consume |
| Shared DB query | **Never** | — |
| Direct import (`domain-*` → `domain-*`) | **Never** | Enforced by ESLint |

### 2.7 Trade‑Offs

| Decision | Trade‑Off |
|----------|-----------|
| Workers for compute, VPS for DB | Higher DB latency (mitigated by Hyperdrive). Simpler deploy/scaling. |
| No message broker (v1) | Sync calls block. Sufficient for launch. |
| Embedded auth per Worker | ~1‑2 MB bundle overhead. Simpler than central IdP. |
| Independent SPAs | New page load to switch apps. Avoids Module Federation complexity. |
| One PostgreSQL for all apps | SPOF/bottleneck. Simpler than distributed DB. Citus later if needed. |
| R2 for files | Cloudflare dependency. Zero egress justifies lock‑in. |

### 2.8 Why This Architecture Wins

| Requirement | Delivery |
|-------------|----------|
| Zero‑knowledge | Keys never leave device; server stores only ciphertext. |
| Low cost | Cloudflare free tier + existing VPS = $0 additional. |
| Solo founder + AI | Simple patterns; `AGENTS.md`‑friendly; no hidden complexity. |
| Global performance | 300+ edge locations; Hyperdrive accelerates DB. |
| 53‑app scale | Independent deploys; Nx affected; service bindings. |
| No vendor lock‑in | Same Hono API runs on VPS. Only bindings are Cloudflare‑specific. |

---

**[End of Section 2 — Next: Section 3: Technology Stack — Final Choices]**