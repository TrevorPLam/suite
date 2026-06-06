---
title: "High-Level Architecture"
section: "architecture"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "01-overview-vision.md"
  - "03-architecture-repository-structure.md"
  - "04-architecture-technology-stack.md"
tags:
  - "architecture"
  - "cloudflare"
  - "hybrid"
---

## 2. High‑Level Architecture

### 2.1 The Core Design Philosophy

The Sovereign Suite is not a monolith—it is a **federated hybrid architecture**. Each of the 53 applications is independently deployable, shares a common authentication and encryption layer, and communicates with other apps through well-defined interfaces. The architecture is designed to give you the operational simplicity of a monolith with the deployment flexibility of microservices, while maintaining zero‑knowledge guarantees at every layer.

The architecture is organized into three distinct planes:

| Plane | Purpose | Components |
|-------|---------|------------|
| **Edge Plane** | User‑facing, globally distributed, stateless | Cloudflare Pages (frontend), Cloudflare Workers (APIs), Cloudflare R2 (file storage), Durable Objects (real‑time state) |
| **Control Plane** | Authentication, user identity, session management | Better Auth (runs embedded in each API), PostgreSQL (shared user database) |
| **Data Plane** | Persistent encrypted user data | PostgreSQL (structured data per app), R2 (file blobs), local SQLite (offline sync) |

This separation ensures that even if your API is compromised, the attacker cannot access decrypted user data without also compromising the user's device and encryption keys.

### 2.2 High‑Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER DEVICE                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Sovereign Suite Shell                                 │   │
│  │   Browser (Vite SPA · 53 independent apps) or Mobile (Capacitor · WebView)   │   │
│  └─────────────────────────────────┬───────────────────────────────────────────┘   │
│                                    │ HTTPS (TLS 1.3)                                │
│                                    ▼                                                │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                           CLOUDFLARE EDGE (Global Network)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │   Pages (UI)    │  │ Workers (API)   │  │  R2 (Files)     │  │ Durable Objs   │ │
│  │  53 independent │  │  Hono routers   │  │  Zero egress    │  │  WebSockets    │ │
│  │  SPA deployments │  │  per app        │  │  Encrypted      │  │  Real‑time     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬───────┘  └───────┬────────┘ │
│           │                    │                     │                  │          │
│           │                    ▼                     │                  │          │
│           │         ┌─────────────────────┐          │                  │          │
│           │         │   Hyperdrive         │          │                  │          │
│           │         │  Connection Pool     │          │                  │          │
│           │         │  + Query Cache       │          │                  │          │
│           │         └──────────┬──────────┘          │                  │          │
│           │                    │                     │                  │          │
│           │                    ▼                     │                  │          │
│           └────────────────────┼─────────────────────┼──────────────────┘          │
│                                │                     │                             │
├────────────────────────────────┼─────────────────────┼─────────────────────────────┤
│                                │                     │                             │
│                     YOUR CONTABO VPS (Self‑Hosted)    │                             │
│  ┌─────────────────────────────┼─────────────────────┼─────────────────────────┐   │
│  │                     ┌───────▼───────┐              │                         │   │
│  │                     │  PostgreSQL   │◄─────────────┼─────────────────────────┘   │
│  │                     │  (Docker)     │              │                             │
│  │                     │  ┌─────────┐  │              │                             │
│  │                     │  │ calendar│  │              │                             │
│  │                     │  │  .events│  │              │                             │
│  │                     │  │ drive   │  │              │                             │
│  │                     │  │  .items │  │              │                             │
│  │                     │  │ vault   │  │              │                             │
│  │                     │  │  .creds │  │              │                             │
│  │                     │  └─────────┘  │              │                             │
│  │                     └───────────────┘              │                             │
│  │                                                     │                             │
│  │  ┌─────────────────────────────────────────────┐   │                             │
│  │  │     Fallback Node.js API (Optional)         │   │                             │
│  │  │   Same Hono code, runs when Workers exceed  │   │                             │
│  │  │   free tier or for self‑hosted deployments  │   │                             │
│  │  └─────────────────────────────────────────────┘   │                             │
│  └─────────────────────────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Request Flow (End‑to‑End)

#### 2.3.1 Authenticated API Request (e.g., "List Calendar Events")

```
User → Browser → Cloudflare → Worker → Hyperdrive → PostgreSQL → Worker → Browser → User
```

| Step | Component | Action |
|------|-----------|--------|
| 1 | **Browser** | User loads `https://calendar.yourdomain.com`. SPA loads from Cloudflare Pages. |
| 2 | **Pages** | Serves static assets (HTML, JS, CSS). |
| 3 | **User Action** | User clicks "View Events". Frontend calls `GET /api/events` with session cookie. |
| 4 | **Cloudflare Edge** | Routes request to Calendar Worker. |
| 5 | **Worker** | Extracts session cookie; calls Better Auth's `getSession()` which queries PostgreSQL (via Hyperdrive) to validate the session. |
| 6 | **Worker** | After validation, calls `domain-calendar` package to fetch events from PostgreSQL (scoped to `user_id`). |
| 7 | **Hyperdrive** | Pools connections, accelerates queries, returns results to Worker. |
| 8 | **Worker** | Returns JSON response to browser. |
| 9 | **Browser** | Renders events. |
| 10 | **User** | Sees calendar. |

**Zero‑knowledge note:** At no point does the server decrypt calendar event data. Events are stored as AES‑256‑GCM ciphertext. The client decrypts them after receiving the response. Better Auth only validates the session; it never sees the user's master password or encryption keys.

#### 2.3.2 Cross‑Domain API Request (e.g., Calendar needs Drive file metadata)

```
Calendar Worker → Service Binding → Drive Worker → Calendar Worker
```

| Step | Component | Action |
|------|-----------|--------|
| 1 | **Calendar Worker** | Receives request for an event with an attached Drive file ID. |
| 2 | **Calendar Worker** | Calls Drive Worker via **Service Binding** (not a public HTTP request). |
| 3 | **Drive Worker** | Validates that the requesting Worker is trusted (via Service Binding—no additional auth needed for internal calls). |
| 4 | **Drive Worker** | Fetches file metadata (still encrypted) from its domain tables. |
| 5 | **Drive Worker** | Returns metadata to Calendar Worker. |
| 6 | **Calendar Worker** | Combines event data + file metadata, returns to browser. |

**Why Service Bindings instead of HTTP requests?**

Service Bindings allow one Worker to call another without going through a public URL. They operate via **Remote Procedure Call (RPC)**, where Worker A exposes methods that Worker B can invoke directly. This approach:
- **Eliminates network latency** (calls stay within Cloudflare's network)
- **Costs zero** (no extra request charges)
- **Provides automatic tracing** so cross‑Worker request flows are visible in the Cloudflare dashboard

**Deferred decision:** If a cross‑domain operation requires asynchronous processing (e.g., "When a user uploads a photo, generate a thumbnail"), we will introduce **Cloudflare Queues** in Phase 3. For v1, all cross‑domain calls are synchronous and direct.

### 2.4 Component Responsibilities (Detailed)

#### 2.4.1 Cloudflare Pages — Frontend Hosting

| Aspect | Detail |
|--------|--------|
| **Role** | Hosts each app's Vite SPA. |
| **Cost** | Free tier: unlimited bandwidth, 500 builds/month. |
| **Deployment** | Each app (`apps/calendar/web`, `apps/drive/web`, etc.) deploys independently. |
| **Domain** | `calendar.yourdomain.com`, `drive.yourdomain.com`, etc. (all under a shared parent domain for SSO). |
| **Shell** | Optional `apps/shell` provides unified navigation. |

**Why not a single SPA for all 53 apps?** Independent SPAs allow each app to have its own build, deploy, and scaling characteristics. The optional shell provides unified navigation without the complexity of Module Federation.

#### 2.4.2 Cloudflare Workers — API Gateway

| Aspect | Detail |
|--------|--------|
| **Role** | Serves each app's Hono API. |
| **Cost** | Free tier: 100k requests/day. Paid plan: $5/mo for 10M requests. |
| **Framework** | Hono — runs on Workers and Node.js identically. |
| **Deployment** | Each API (`apps/calendar/api`, `apps/drive/api`, etc.) deploys independently. |
| **Internal Communication** | Service Bindings for cross‑Worker calls (RPC). |

**Why Hono on Workers?** Hono is 3–5× faster than Express, has first‑class TypeScript support, and can run unchanged on your VPS if you ever leave Cloudflare.

#### 2.4.3 Cloudflare Hyperdrive — Database Acceleration

| Aspect | Detail |
|--------|--------|
| **Role** | Connection pooling + query acceleration for PostgreSQL. |
| **Cost** | Free tier: 1 database. |
| **Function** | Workers connect to Hyperdrive, which maintains a persistent connection pool to your VPS PostgreSQL. It also caches query results at the edge, reducing latency for repeat queries. |
| **Security** | Hyperdrive provides a secure connection string accessible **only from Workers**, never exposed publicly. |

**Why Hyperdrive instead of direct connection?** A Worker establishes a new database connection on every request—impractical at scale. Hyperdrive pools connections, reducing latency and preventing connection exhaustion on your VPS.

#### 2.4.4 Cloudflare R2 — File Storage

| Aspect | Detail |
|--------|--------|
| **Role** | Stores encrypted user files (Drive, Photos, etc.). |
| **Cost** | Free tier: 10 GB storage, 1M Class A operations/month. |
| **Key feature** | Zero egress fees—no charge for data transferred out, regardless of volume. |
| **Security** | Files are encrypted client‑side before upload. R2 stores only ciphertext. |

**Why R2 over S3?** Zero egress fees mean users can download large files without incurring bandwidth costs—essential for a Drive competitor.

#### 2.4.5 Durable Objects — Real‑Time State

| Aspect | Detail |
|--------|--------|
| **Role** | Manages WebSocket connections and ephemeral state for real‑time features (chat, collaborative editing, live notifications). |
| **Cost** | Free tier: 1M requests/month, 400k GB‑seconds. |
| **Pattern** | One Durable Object per "room" (chat room, document, board). |
| **Hibernation** | WebSocket Hibernation API allows DOs to "sleep" when idle while keeping connections open, dramatically reducing duration costs. |
| **Storage** | Each DO has embedded SQLite storage (up to 10 GB per object) for ephemeral state. |

**Why Durable Objects instead of traditional WebSocket servers?** They are serverless, auto‑scale, and cost nothing when idle (thanks to hibernation). For chat, a DO with 1,000 connected users but no messages costs almost nothing.

**Performance expectations:**
- A single DO can handle **500–1,000 requests/second** (simple operations) or **200–500 requests/second** (complex operations)
- WebSocket connections remain open even when the DO is hibernated; the runtime automatically wakes the DO when a message arrives
- With hibernation, duration costs are charged only when the DO is actively processing, not for idle connection time

#### 2.4.6 Contabo VPS — PostgreSQL

| Aspect | Detail |
|--------|--------|
| **Role** | Single source of truth for all user data (encrypted). |
| **Spec** | Existing VPS (4‑8 GB RAM, 2‑4 vCPUs, 150‑200 GB SSD). |
| **PostgreSQL** | Version 17, running in Docker. |
| **Data size** | 10,000 users × 50 MB/user = 500 GB. Scale up disk or move to Citus when needed. |
| **Backups** | Continuous WAL streaming to R2 (Section 15). |

**Why self‑hosted instead of managed (Neon, Supabase, etc.)?** Data sovereignty. Your zero‑knowledge promise means nothing if a third party hosts your database. You own the hardware, you control access, you audit everything. Managed services are convenient but violate your core principle.

#### 2.4.7 Better Auth — Authentication (Embedded)

| Aspect | Detail |
|--------|--------|
| **Role** | User authentication, session management, external identity linking. |
| **Deployment** | **Embedded in each Worker** — not a separate service. Each API imports the same `@suite/auth` package and mounts Better Auth routes. |
| **Database** | Stores users, sessions, accounts, and verifications in the shared PostgreSQL. |
| **Cost** | $0 (self‑hosted). Clerk would cost ~$2,025/month at 100k MAU. |
| **External identities** | OAuth plugins for Google/Microsoft. Email/password for internal accounts. |

**Why embedded instead of a central auth service?** Simplicity. A dedicated auth service would require its own deployment, scaling, and service binding for every app. Embedded auth means each app handles its own auth endpoints while sharing the same database and configuration via the monorepo package. This is the **federated, identically configured auth library** pattern—not a central IdP.

### 2.5 Deployment Topology (Minimal Cost Configuration)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Cloudflare Dashboard                         │
├─────────────────────────────────────────────────────────────────┤
│  Pages Project: calendar-app (production) → calendar.yourdomain.com
│  Pages Project: drive-app    (production) → drive.yourdomain.com
│  Pages Project: vault-app    (production) → vault.yourdomain.com
│                                                                  │
│  Worker: calendar-api (script + service binding to drive-api)    │
│  Worker: drive-api    (script + service binding to calendar-api) │
│  Worker: vault-api    (script)                                   │
│                                                                  │
│  Hyperdrive: postgres-prod (points to VPS:5432)                  │
│                                                                  │
│  Durable Object: chat-room-* (created dynamically)              │
│                                                                  │
│  R2 Bucket: drive-files (10 GB free)                            │
│  R2 Bucket: vault-backups (10 GB free)                          │
└─────────────────────────────────────────────────────────────────┘
                                         │
                                         │ (Cloudflare Tunnel or Direct)
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Contabo VPS (Ubuntu 24.04)                    │
├─────────────────────────────────────────────────────────────────┤
│  Docker: postgres (port 5432)                                    │
│  - Volume: /data/postgres (SSD)                                  │
│  - WAL streaming to R2 (wal-g)                                  │
│                                                                  │
│  (Optional) Docker: fallback-api (same Hono code as Workers)    │
│  - Runs only if Workers exceed free tier or for local dev       │
└─────────────────────────────────────────────────────────────────┘
```

**Why not deploy the API on the VPS by default?** Workers are globally distributed, scale automatically, and cost nothing up to 100k requests/day. Your VPS database remains the single source of truth, but the compute runs at the edge.

### 2.6 Data Flow for E2EE (Zero‑Knowledge Guarantee)

The following diagram shows how data remains encrypted at every layer:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Cloudflare │────▶│   Worker    │────▶│  PostgreSQL │
│ (Decrypted) │     │   (TLS)     │     │ (Encrypted) │     │ (Encrypted) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                     All storage ciphertext only
```

| Layer | Data State | Who Can Decrypt |
|-------|-----------|-----------------|
| **Browser (before network)** | Plaintext | User only |
| **TLS (in transit)** | Encrypted (TLS) | Cloudflare edge only (transiently) |
| **Worker (memory)** | Encrypted blob (AES‑256‑GCM) | User only (needs keys never sent to server) |
| **PostgreSQL (disk)** | Encrypted blob | User only |
| **R2 (disk)** | Encrypted blob | User only |

**Critical assurance:** The server never has access to the user's encryption keys. Keys are derived from the user's password on the device using PBKDF2‑SHA‑512 with a unique salt (600,000 iterations). The derived Account Key never leaves the device. Domain keys (Calendar, Drive, Vault) are derived via HKDF from the Account Key on the device.

### 2.7 Cross‑Domain Communication Strategy (Summary)

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| **Direct API Call (Service Binding)** | Synchronous request‑response between two apps (default) | Worker A calls Worker B via `env.B_SERVICE.fetch()` |
| **Event (Cloudflare Queues)** | Asynchronous workflows where immediate response not needed | Worker A publishes to queue; Worker B consumes |
| **Shared Database** | **Never** for cross‑domain queries. Each domain's tables are isolated by `user_id` + `domain` checks. | N/A |
| **Direct Import** | **Never** between `packages/domain-*`. Enforced by ESLint. | N/A |

**Rule:** All cross‑domain communication must go through an API boundary (HTTP or queue). Direct database access or function imports across domains is forbidden and will fail CI.

### 2.8 Trade‑Offs Made in This Architecture

| Decision | Trade‑Off |
|----------|-----------|
| Workers for compute, VPS only for DB | Higher latency for database queries (mitigated by Hyperdrive). Simpler deployment and scaling. |
| No message broker (Service Bindings only) | Synchronous calls block waiting for response. Sufficient for v1. Add queues later. |
| Embedded auth in each Worker | Every Worker runs Better Auth code. Adds ~1‑2 MB per Worker bundle. Simpler than central auth service. |
| Independent SPAs (no Module Federation) | User must load a new page to switch apps. Build simpler. No runtime dependency management. |
| One PostgreSQL for all apps | Database becomes a single point of failure and scaling bottleneck. Simpler than distributed DB. Add Citus when needed. |
| R2 for file storage | Cloudflare dependency. Zero egress fees make it worth the lock‑in. |

### 2.9 Summary: Why This Architecture Wins for You

| Requirement | How This Architecture Delivers |
|-------------|-------------------------------|
| **Zero‑knowledge** | Keys never leave device; server stores only ciphertext. |
| **Low cost** | Cloudflare free tier + VPS you already pay for = $0 additional. |
| **Solo founder with AI** | Simple, consistent patterns; no "hidden complexity"; `AGENTS.md`‑friendly. |
| **Global performance** | Workers and Pages serve from 300+ locations. Hyperdrive accelerates DB queries. |
| **Scalable to 53 apps** | Independent deploys; shared packages; Nx affected commands; service bindings for cross‑domain calls. |
| **No vendor lock‑in** | The same Hono API can run on your VPS. No Cloudflare‑specific code (except bindings). |

The architecture is not perfect—perfect is the enemy of shipped. It is **pragmatic, survivable, and correct** for a zero‑knowledge productivity suite built by a solo founder. It will evolve as your suite grows.

---

**[End of Section 2 — Next: Section 3: Technology Stack — Final Choices]**
