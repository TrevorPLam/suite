## 3. Technology Stack — Final Choices

### 3.1 Stack Overview

| Layer | Technology | Version | Why |
|-------|-----------|---------|-----|
| Monorepo | Nx | 22.7+ | Module boundaries, affected commands, AI skills, self‑healing CI |
| Package manager | pnpm | 11+ | Catalogs, `minimumReleaseAge` (24h), disk efficiency |
| Backend | Hono | 4.12.21+ | Workers + Node.js parity, 3–5× faster than Express |
| Database | PostgreSQL | 17 | Self‑hosted, VACUUM improvements, incremental backups |
| ORM | Drizzle ORM | 0.45.x | Type‑safe SQL, per‑domain migrations, JIT mappers |
| Auth | Better Auth | 1.6.11+ | Self‑hosted, $0 at 100k MAU, Hono native, passkeys |
| Encryption | WebCrypto API | Built‑in | No deps, hardware‑accelerated |
| Real‑time | Durable Objects | Workers | Hibernation API, embedded SQLite |
| API clients | Orval | 7.19.0+ | OpenAPI → React Query + Zod + MCP |
| UI | shadcn/ui | v4 | Own the source, Tailwind v4, AI‑friendly |
| Mobile | Capacitor | 8.x | Shared codebase, native APIs |
| Frontend host | Cloudflare Pages | Free | Unlimited bandwidth, 500 builds/mo |
| File storage | Cloudflare R2 | Free | Zero egress, 10 GB, S3‑compatible |
| Secrets | Doppler | Free (5 users) | Per‑environment, GitHub Actions native |
| CI/CD | GitHub Actions | Free (2k min/mo) | Affected runs, OIDC |
| Versioning | Changesets | Latest | Independent package versioning |

### 3.2 Nx 22.7+

Module boundary enforcement via `@nx/enforce-module-boundaries` with `sourceTag`/`depConstraints`. Affected commands run only changed projects. Nx Cloud free tier provides remote caching and self‑healing CI.

### 3.3 pnpm 11+

Catalogs centralise versions in `pnpm-workspace.yaml`. `minimumReleaseAge: 1440` blocks packages <24h old. Pure ESM; requires Node.js 22.

### 3.4 Hono ≥4.12.21

Same code runs on Workers and Node.js. CVE‑2026‑24473 (Serve Static Middleware) and CVE‑2026‑47674 (IPv6 bypass in ip‑restriction) are both fixed in 4.12.21. Pin this minimum.

### 3.5 PostgreSQL 17 (Self‑Hosted)

Docker on Contabo VPS. WAL streaming to R2 for backups. Logical replication preserves slots across upgrades.

### 3.6 Drizzle ORM ≥0.45.x

SQL‑like queries with TypeScript inference. Per‑domain configs with `schemaFilter`/`tablesFilter`. `pgSchema` for domain isolation. Use `drizzle-kit` for migrations.

### 3.7 Better Auth ≥1.6.11

Embedded in each Hono Worker via `@suite/auth`. Plugins: email/password, OAuth, orgs, SSO (SP only), 2FA, passkeys. SAML is SP‑only; suite cannot act as SAML IdP (use Keycloak bridge if needed).

> Full config example: [02-monorepo-04-shared-packages.md](02-monorepo-04-shared-packages.md)

### 3.8 Durable Objects

Hibernation API: DOs sleep when idle while keeping WebSocket connections open; billable duration does not accrue. Embedded SQLite: 1 GB free, 10 GB paid. Implement `SQLITE_FULL` handler to archive old records to R2. Use Hibernation WebSocket API (`ctx.acceptWebSocket(server)`), not the Web Standard API.

### 3.9 Orval ≥7.19.0

OpenAPI → React Query hooks + Zod + MCP servers. CVE‑2026‑22785 and CVE‑2026‑23947 (code injection via OpenAPI fields) fixed in 7.19.0. Hold on 8.x — React Query v5 type incompatibility unresolved.

### 3.10 shadcn/ui v4 + Tailwind CSS 4

Copy‑paste components into `packages/ui-kit`. No dependency lock‑in. Tailwind v4 default as of shadcn@2.3; mixed v3/v4 setups need separate `globals.css` per app. Radix UI or Base UI primitives selectable at init.

### 3.11 Capacitor 8.x

Shared Vite + React codebase for iOS/Android. Capacitor 6 EOL July 2025; 7 enters maintenance June 2026. Target 8.x for new development. Workflow: `pnpm build` → `npx cap sync` → App Store / Play Console.

### 3.12 Cloudflare Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Pages | Unlimited bandwidth, 500 builds/mo |
| Workers | 100k requests/day, 10 ms CPU |
| R2 | 10 GB, 1M Class A, 10M Class B ops, **zero egress** |
| Durable Objects | 1M requests/mo, 400k GB‑s |
| Hyperdrive | 10 configs (~20 conn each) |

### 3.13 CI/CD & Secrets

- **GitHub Actions:** 2,000 min/mo private; unlimited public. Use `paths-filter` + Nx `affected`. Self‑hosted runners on VPS are free.
- **Doppler:** 5 users, 10 projects, 4 environments. Inject via `doppler run --` in CI.
- **Changesets:** Independent versioning. `pnpm changeset` → auto PR for version bumps + changelog.

### 3.14 Rationale Summary

| Decision | Why |
|----------|-----|
| Nx over Turborepo | Boundaries, AI skills, affected, self‑healing CI |
| pnpm 11 over npm | Catalogs, `minimumReleaseAge`, pure ESM |
| Hono 4.12.21 over Express | 3–5× faster, Workers + Node parity, CVE‑fixed |
| PostgreSQL 17 over managed | Sovereignty, incremental backups |
| Drizzle 0.45.x over Prisma | Type‑safe SQL, per‑domain migrations, no query engine |
| Better Auth over Clerk | $0 at 100k MAU, self‑hosted, passkeys |
| DOs over PartyKit | Hibernation, embedded SQLite, no external deps |
| shadcn/ui over libraries | Own source, Tailwind v4, AI‑friendly |
| Pages over Vercel | Unlimited bandwidth free |
| R2 over S3 | Zero egress |
| Doppler over .env | Centralised, audited, CI injection |
| Changesets over manual | Independent versioning, auto changelogs |

---

**[End of Section 3 — Next: Section 4: Repository Structure (v6) — Domain‑First Packages]**