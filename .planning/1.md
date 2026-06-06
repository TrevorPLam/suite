---

# Sovereign Suite — Definitive Monorepo Plan v6

**Hybrid Cloudflare + Self‑Hosted · Hono · Better Auth · PostgreSQL on Your Own Hardware**

*For the solo founder who builds with AI, owns the stack, and competes with Google.*

**Last updated: June 2026**
**Status: Ready for execution**

---

## Table of Contents

1. **Vision & Guiding Principles** ← *this section*
2. High‑Level Architecture
3. Technology Stack — Final Choices
4. Repository Structure (v6) — Domain‑First Packages
5. Shared Packages — Deep Dive
6. Specification‑First AI Workflow
7. Database Design & Multi‑Tenancy
8. Drizzle Migrations in Monorepo
9. API Design with Hono
10. Real‑Time with Durable Objects
11. Frontend & Mobile Strategy
12. Offline‑First Sync Engine
13. Infrastructure — Hybrid Cloudflare + VPS
14. Push Notifications
15. Disaster Recovery & Key Escrow
16. Monetization & Free‑Tier Limits
17. Search Over Encrypted Data
18. CI/CD Pipelines & Secrets Management
19. Compliance & GDPR
20. Development Environment & AI Tools
21. Migration Plan
22. Future: Scaling & Full Self‑Hosting
23. Appendices

---

## 1. Vision & Guiding Principles

### 1.1 The Mission

You are building a **privacy‑respecting, zero‑knowledge productivity suite** to compete with Google Workspace and Microsoft 365. Every application you ship will encrypt user data **before it leaves the browser or mobile device** (End‑to‑End Encryption, E2EE). You will own the entire infrastructure, from the frontend edge to the database that holds user accounts, with no third‑party control over user data.

Your monthly cost at launch will be **$0** beyond the Contabo VPS you already pay for. You will code with AI agents, so the architecture must be simple, consistent, and well‑documented for machines.

This is not a hobby project. This is a **sovereign digital life platform** — one that gives users complete control over their data while delivering the polish, speed, and reliability of mainstream alternatives.

### 1.2 Non‑Negotiable Principles (The “Four Pillars”)

| Pillar | Description | Enforcement |
|--------|-------------|-------------|
| **Zero‑Knowledge** | The server never sees unencrypted content, plaintext passwords, or private keys. | All user data is encrypted client‑side with AES‑256‑GCM. Key material never leaves the user’s device. |
| **Self‑Hosted Core** | User identities and data live on hardware you control (your Contabo VPS). | No third‑party auth services (Clerk, Auth0, Supabase Auth). Better Auth runs on your VPS, with session cookies scoped to your domain. |
| **Edge Performance** | Static assets and lightweight APIs are served globally via Cloudflare’s free tier. | Every app’s frontend is a Vite SPA deployed to Cloudflare Pages. Each API is a Hono app running on Cloudflare Workers. Database connections use Cloudflare Hyperdrive. |
| **AI‑Native** | Every directory has instructions (`AGENTS.md`, `CLAUDE.md`) for AI assistants. The codebase is structured for AI agents to understand and modify safely. | Repository structure (Section 4), spec‑first workflow (Section 6), and module boundaries (Section 4) are designed to minimize AI confusion and prevent “vibe coding” drift. |

**What “Zero‑Knowledge” Means in Practice:**

- **At rest:** All user content (documents, emails, calendar events, chat messages, passwords, files) is stored in your PostgreSQL database or R2 buckets as AES‑256‑GCM ciphertext. The database never sees plaintext. The keys never leave the user’s device.
- **In transit:** TLS 1.3 between client and Cloudflare. Within your infrastructure, all internal calls use HTTPS or Cloudflare Service Bindings.
- **During processing:** The server can decrypt data only when explicitly required for operation (e.g., search indexing, AI processing). Even then, plaintext exists only in memory and is zeroized immediately. For maximum security, consider TIBET Cortex (a Rust framework) to enforce “zero plaintext lifetime” for AI pipelines (see Section 17).

### 1.3 Strategic Shifts from v5 (What’s Changed)

Based on extensive research and realistic solo‑founder constraints, the following strategic decisions have been refined from the original plan:

| Original Plan (v5) | Revised Plan (v6) | Rationale |
|---|---|---|
| Separate `modules/` directory for bounded contexts | **`packages/domain-*`** alongside `packages/` libraries | Eliminates decision paralysis (“does this go in modules or packages?”). Bounded contexts are just another type of shared package, distinguished by tags and linting rules. |
| Full Clean Architecture with `commands/`, `handlers/`, `repositories/` directories | **Pragmatic vertical slices** — one file per use case, containing validation, logic, and DB access | Prevents file explosion (thousands of files for 53 apps). AI agents handle single files better than deep folder hierarchies.|
| Domain events + message broker for cross‑app communication | **Direct HTTP calls** via Cloudflare Service Bindings (synchronous, zero cost) | Simpler to debug, no eventual consistency complexity, sufficient for v1. Defer events until needed. |
| PartyKit for real‑time abstractions | **Raw Durable Objects + Hibernation API** | PartyKit’s Vite HMR bug creates friction; raw DOs give you full control and avoid a dependency. |
| Drizzle migrations handled by each API at startup | **CI‑run migrations per domain** before Worker deployment | Workers cannot run `migrate()` (no filesystem). CI‑based migrations are cleaner and safer. |
| Clerk as potential auth provider | **Better Auth as only option** (self‑hosted) | At 100K MAU, Clerk costs ~$2,025/month; Better Auth costs your Postgres instance (~$25‑50/month). For a privacy‑first product, this difference is existential. |

### 1.4 The 53‑App Roadmap (Phased, Not All at Once)

You have an ambitious list of 53 applications. Building them all before launch is impossible. The architecture is designed to scale, but your execution must be ruthless.

**Tier 1: The Core Three (Launch v1)**

| App | Purpose | Dependency |
|-----|---------|------------|
| **Mail** | Zero‑access email with on‑device AI triage | Shared auth, E2EE crypto, offline sync |
| **Drive** | Encrypted file storage with real‑time sync | Shared auth, E2EE crypto, offline sync |
| **Calendar** | E2EE calendar with booking links | Shared auth, E2EE crypto |

These three form the “productivity spine.” Once they are stable, you can add the others in waves:

**Tier 2: Communication & Collaboration (v2)**
- Instant Messenger
- Contacts
- Tasks & Project Management

**Tier 3: Security & Identity (v3)**
- Password & Secrets Manager
- VPN
- Authenticator (2FA)

**Tier 4: Business & Productivity (v4+)**
- Documents, Spreadsheets, Presentations
- Forms & Surveys
- CRM, Accounting, Helpdesk

**Tier 5: Media & Entertainment (v5+)**
- Photos, Music, Video Sharing, Podcasts

This phased approach ensures you ship value early, gather feedback, and avoid the “engineering bankruptcy” of building everything at once.

### 1.5 AI Agent Guiding Rules (For `AGENTS.md`)

Every AI assistant working on this repository must follow these rules. They are extracted from the architectural decisions below and enforced by Nx, ESLint, and CI.

```markdown
## AI Agent Rules — Sovereign Suite (Do Not Violate)

1. **Never import across domain boundaries.** `packages/domain-*` may NOT import from another `packages/domain-*`. Use HTTP calls (Service Bindings) for cross‑domain needs.

2. **Every feature begins with a spec.** Before writing code, create `apps/<app>/specs/<feature>.spec.md` with: user story, API contract, validation rules, error cases, out‑of‑scope.

3. **API routes are thin.** `apps/*/api` contain only request validation, auth checks, and calls to domain packages. No business logic.

4. **Use the shared auth package.** Never implement custom sign‑in logic. Import from `@suite/auth/server` and `@suite/auth/client`.

5. **Migrations run in CI, never in Workers.** Use `APP_DOMAIN=<domain> pnpm db:migrate`. Never call `migrate()` inside a Worker.

6. **Search uses blind indexing by default.** Implement exact‑match search via HMAC tokens (Section 17). Defer semantic search until validated.

7. **One Durable Object per “room” (chat, doc, board).** Never put multiple coordination units in one DO.

8. **Every PR must pass `pnx affected --target=typecheck,test,lint`.** No exceptions.

9. **E2EE crypto is non‑negotiable.** All user content must be encrypted with AES‑256‑GCM before storage. Use `@suite/crypto`.

10. **Free tier limits must be monitored.** Each API must implement `UsageMonitor` middleware that blocks requests when limits approach 80%.
```

### 1.6 What This Plan Delivers

By following this document, you will build:

- A **single‑command development environment** (`pnpm install && pnpm dev`) that spins up all services locally
- A **CI/CD pipeline** that deploys only changed apps to Cloudflare (Nx `affected` commands)
- **Zero‑knowledge guarantees** for every user’s data, with no third‑party auth or storage providers
- **AI‑friendly structure** that minimizes hallucinations and ensures consistent code generation
- **Production‑ready operations** including backups, disaster recovery, usage monitoring, and GDPR compliance

The architecture is over‑engineered for a prototype and under‑engineered for Google — and that is exactly correct for a solo founder. It will scale as your suite grows.

### 1.7 Acknowledgments

This plan synthesizes research from 25+ sources, including Nx/Turborepo benchmarks, security post‑mortems (August 2025 Nx supply chain attack), Drizzle ORM best practices, Cloudflare Durable Objects limits, multi‑tenant Postgres patterns, and real‑world case studies (Cash App, FloQast, Meta, DoorDash). Every technology choice has been verified against 2026 documentation.

The result is not “perfect” — there is no perfect architecture. It is **pragmatic, executable, and survivable** for a solo founder building with AI.

*End of Document*