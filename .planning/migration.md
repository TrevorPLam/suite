# Sovereign Suite — Final Directory, Migration & Creation Plan

## Overview

This document is the authoritative, final plan for restructuring the Sovereign Suite knowledge base. It synthesizes three sources: the 24 original numbered source files (`1.md`–`24.md`), the internal gap analysis in `24.md`, and the deeper second-pass gap analysis conducted in this conversation. The outcome is a **48-file, 13-directory** documentation system — every source file renamed and placed into a thematic directory, plus 24 net-new files created to fill confirmed gaps with zero existing coverage.

***

## The Final Numbers

| Metric | Count |
|--------|-------|
| Source files (existing) | 24 |
| Net-new files (created) | 24 |
| **Total files** | **48** |
| Total directories | 13 |
| New directories (no existing content) | 3 (`10-apps/`, `11-product/`, `12-legal/`) |

***

## Part 1 — Directory Structure (13 Directories)

All directories are new. None exist in the current flat file layout. Three of them — `10-apps/`, `11-product/`, and `12-legal/` — have zero existing content and are created entirely from gap work.

| # | Directory | Purpose | Total Files |
|---|-----------|---------|-------------|
| 00 | `00-vision/` | Mission, guiding principles, the 53-app vision | 1 |
| 01 | `01-architecture/` | High-level system design and technology stack choices | 2 |
| 02 | `02-monorepo/` | Nx setup, pnpm catalogs, repo structure, shared packages, AI spec workflow, testing | 4 |
| 03 | `03-data/` | PostgreSQL schema, Drizzle migrations, encrypted search, audit log, schema reference | 5 |
| 04 | `04-backend/` | Hono API design, Durable Objects realtime, error taxonomy, webhooks | 4 |
| 05 | `05-frontend/` | React/Capacitor strategy, offline sync, i18n, cross-app state | 4 |
| 06 | `06-infrastructure/` | Hybrid infra, push notifications, DR/key escrow, scaling, observability | 5 |
| 07 | `07-business/` | Monetization, compliance (GDPR/CRA), incident response | 3 |
| 08 | `08-execution/` | CI/CD, dev environment, migration plan, performance budgets, onboarding | 5 |
| 09 | `09-reference/` | Appendices (AGENTS.md, Drizzle configs, GitHub Actions templates), gap analysis | 2 |
| 10 | `10-apps/` | One implementation guide per application (Mail, AI Assistant, Calendar, etc.) | 10 |
| 11 | `11-product/` | Feature flags, A/B testing, analytics, product roadmap tooling | 1 |
| 12 | `12-legal/` | Privacy policy, terms of service, acceptable use, DMCA templates | 2 |

***

## Part 2 — Migration Plan: All 24 Existing Files

Every source file is renamed with a semantic slug and moved into the correct thematic directory. No content is deleted. The renaming makes the knowledge base navigable by AI agents reading the nearest `AGENTS.md`.

> **Three deliberate cross-section moves:**
> - `17.md` (Search over Encrypted Data) moves to `03-data/` — it belongs alongside schema and migration files, not with infrastructure.
> - `22.md` (Future Scaling) moves to `06-infrastructure/` — it is a scaling and ops concern, not an execution workflow.
> - `19.md` (Compliance) moves to `07-business/` — it sits alongside monetization as a business/legal concern.

| Source File | New Filename | Directory | Action |
|-------------|-------------|-----------|--------|
| `1.md` | `00-vision-and-principles.md` | `00-vision/` | Rename + Move |
| `2.md` | `01-high-level-architecture.md` | `01-architecture/` | Rename + Move |
| `3.md` | `02-technology-stack.md` | `01-architecture/` | Rename + Move |
| `4.md` | `03-repository-structure.md` | `02-monorepo/` | Rename + Move |
| `5.md` | `04-shared-packages.md` | `02-monorepo/` | Rename + Move |
| `6.md` | `05-specification-ai-workflow.md` | `02-monorepo/` | Rename + Move |
| `7.md` | `06-database-multitenancy.md` | `03-data/` | Rename + Move |
| `8.md` | `07-drizzle-migrations.md` | `03-data/` | Rename + Move |
| `17.md` | `16-search-over-encrypted-data.md` | `03-data/` | Rename + Move ¹ |
| `9.md` | `08-api-design-hono.md` | `04-backend/` | Rename + Move |
| `10.md` | `09-realtime-durable-objects.md` | `04-backend/` | Rename + Move |
| `11.md` | `10-frontend-mobile-strategy.md` | `05-frontend/` | Rename + Move |
| `12.md` | `11-offline-sync-engine.md` | `05-frontend/` | Rename + Move |
| `13.md` | `12-infrastructure-hybrid.md` | `06-infrastructure/` | Rename + Move |
| `14.md` | `13-push-notifications.md` | `06-infrastructure/` | Rename + Move |
| `15.md` | `14-disaster-recovery-key-escrow.md` | `06-infrastructure/` | Rename + Move |
| `22.md` | `21-future-scaling-self-hosting.md` | `06-infrastructure/` | Rename + Move ² |
| `16.md` | `15-monetization-free-tier-limits.md` | `07-business/` | Rename + Move |
| `19.md` | `18-compliance-gdpr-cra.md` | `07-business/` | Rename + Move ³ |
| `18.md` | `17-cicd-secrets-management.md` | `08-execution/` | Rename + Move |
| `20.md` | `19-development-environment-ai.md` | `08-execution/` | Rename + Move |
| `21.md` | `20-migration-plan.md` | `08-execution/` | Rename + Move |
| `23.md` | `22-appendices-reference.md` | `09-reference/` | Rename + Move |
| `24.md` | `23-gap-analysis-research-roadmap.md` | `09-reference/` | Rename + Move |

***

## Part 3 — Creation Plan: 24 Net-New Files

These files have zero actionable coverage anywhere in the existing 24 source files. They are organized by priority tier.

### Tier 1 — Launch Blockers (5 files)

Must exist before the first app ships to production users.

| New Filename | Directory | Why It's a Blocker |
|---|---|---|
| `24-database-schema-reference.md` | `03-data/` | Without an authoritative schema reference, AI agents building any new feature will invent conflicting table definitions, causing silent data corruption in a multi-tenant encrypted system |
| `25-testing-strategy.md` | `02-monorepo/` | Vitest and Playwright are named in one table row each across 24 files — no document covers Worker mocking, PostgreSQL test isolation, Playwright auth with Better Auth sessions, or encrypted test fixtures |
| `26-error-handling-taxonomy.md` | `04-backend/` | The API error shape is defined but no error code taxonomy exists — agents writing new features invent codes with no naming convention, no Drizzle-to-HTTP error mapping, and no client rendering pattern |
| `27-observability-logging.md` | `06-infrastructure/` | OpenTelemetry appears in one 12-line snippet; there is no structured log schema, no safe-to-log field list (critical for zero-knowledge), no alert threshold definitions, and no trace propagation spec across Workers → Durable Objects → VPS |
| `28-app-mail-architecture.md` | `10-apps/` | Mail is a Tier 1 app in the launch roadmap but has zero implementation guidance — MX records, Stalwart SMTP on VPS, inbound encryption pipeline, DKIM/DMARC/SPF, CalDAV/CardDAV interop are all absent |

#### What `24-database-schema-reference.md` must cover

- Complete table listing per PostgreSQL schema (`calendar`, `drive`, `vault`, `mail`, `auth`, `app`, `search`, `drizzle`)
- Column names, types, nullability, default values, and indexes for each table
- Foreign key relationships across schemas
- Which columns store ciphertext vs. plaintext metadata
- Naming conventions for tables, columns, constraints, and RLS policies
- The `app.audit_logs` table (shared across all domains)
- Migration tracking table (`drizzle.migrations_<domain>`)

#### What `25-testing-strategy.md` must cover

- Unit testing Hono Workers: mocking `c.env` bindings, simulating `Bindings`, testing domain package functions with `vi.mock` for DB calls
- Integration testing: running tests against a Docker PostgreSQL instance, per-test transaction rollback for isolation
- Worker E2E: using Miniflare or `wrangler dev --test-mode` to test the full Worker stack locally
- Playwright E2E: authenticating with Better Auth sessions in test flows, testing encrypted content (test must hold the key)
- MSW (Mock Service Worker): mocking API calls in frontend tests without a running backend
- Test data factories: generating valid encrypted fixtures without exposing plaintext in the test suite

#### What `26-error-handling-taxonomy.md` must cover

- Complete error code registry (kebab-case, domain-prefixed vs. global convention)
- HTTP status code mapping for each code category
- Drizzle-to-HTTP mapping: unique constraint violation → 409, FK violation → 400, null violation → 400
- Partial failure handling in cross-domain RPC (Calendar → Drive returns 500)
- Idempotency-key design: which POST endpoints are idempotent, the `idempotency_tokens` table schema
- Client-side error rendering: how React Query surfaces errors vs. how the UI should display them

#### What `27-observability-logging.md` must cover

- Mandatory log fields for every log entry: `requestId`, `userId`, `tenantId`, `operation`, `durationMs`, `errorCode`, `workerName`
- Safe-to-log fields vs. never-log fields (never log: plaintext content, encryption keys, salts, raw search queries)
- Log levels and decision rules (DEBUG / INFO / WARN / ERROR / FATAL and when each applies)
- Distributed trace propagation: `X-Request-Id` flow from browser → Worker → Durable Object → PostgreSQL query
- Alert threshold definitions: Worker error rate > 1% for 5min → page; p95 latency > 500ms → alert; failed auth attempts > 100/min → page
- Prometheus metrics from VPS Node Exporter feeding Grafana dashboard spec

#### What `28-app-mail-architecture.md` must cover

- MX record and DNS configuration for `@yourdomain.com` routing to VPS
- Self-hosted SMTP server choice: Stalwart Mail Server (Rust, JMAP/SMTP/IMAP) deployment on VPS via Docker
- Why email cannot run on Cloudflare Workers (no persistent TCP connections)
- Inbound email receiving pipeline: SMTP on VPS → parse → encrypt client-side → store in PostgreSQL
- Outbound email: transactional provider (Resend, Postmark) vs. own SMTP relay — zero-knowledge implications of each
- DKIM, DMARC, SPF DNS records and their relationship to the zero-knowledge design
- CalDAV/CardDAV: whether Calendar and Contacts apps will support standard protocols for Apple Mail, Thunderbird interoperability

***

### Tier 2 — Pre-Scale Required (4 files)

Must exist before scaling past 3 apps or onboarding the first enterprise customer.

| New Filename | Directory | Gap |
|---|---|---|
| `29-audit-logging.md` | `03-data/` | Referenced by GDPR, SOC 2, and API convention docs but never specified — the `app.audit_logs` table schema, append-only enforcement, and GDPR pseudonymization job are all unwritten |
| `30-app-ai-assistant.md` | `10-apps/` | Scaling for App 26 is documented in `22.md` but the implementation — Llama/Ollama deployment, the zero-knowledge RAG pipeline, SSE streaming API, WebGPU fallback decision tree — has no document |
| `31-performance-budgets.md` | `08-execution/` | Spec files have a performance field (`200ms p95`) but no document defines global SLIs/SLOs, Core Web Vitals targets, or k6 load testing configuration against staging Workers |
| `32-internationalization.md` | `05-frontend/` | The suite targets EU users competing with fully-localized Google Workspace — RTL support is a binary architectural decision that becomes extremely expensive to retrofit after launch |

#### What `29-audit-logging.md` must cover

- Complete taxonomy of auditable events: login, logout, failed login, data read, data write, data delete, key derivation, plan change, erasure request, admin action, DSAR receipt
- `app.audit_logs` table schema: `id UUID`, `userId UUID`, `tenantId UUID`, `action TEXT`, `resourceType TEXT`, `resourceId UUID`, `ipHash TEXT`, `userAgentHash TEXT`, `createdAt TIMESTAMPTZ`, `retentionUntil TIMESTAMPTZ`
- Append-only enforcement: PostgreSQL trigger that blocks UPDATE and DELETE, plus a dedicated audit DB user with INSERT-only privileges
- GDPR pseudonymization job: the automated background task that replaces `userId` with an irreversible HMAC hash after the retention window (30 days from `19.md`)
- The audit log API: `GET /api/audit-logs` for SOC 2 auditors and enterprise admins, with RLS enforcing tenant scope

#### What `30-app-ai-assistant.md` must cover

- Model selection: Llama 3.2, Mistral 7B, or Phi-4 — tradeoffs for a VPS with 8 GB RAM, no GPU
- Deployment: Ollama on VPS via Docker, llama.cpp as alternative, API surface exposed to Hono Worker via HTTP
- The zero-knowledge RAG pipeline: decryption must happen in the browser (WebCrypto) before content enters LLM context, or in a TEE — the model server must never see plaintext
- Context assembly: how Drive documents, Emails, and Calendar events are retrieved using blind indexes from `16-search-over-encrypted-data.md`, decrypted client-side, and assembled into a prompt
- SSE streaming API: the Hono Worker endpoint that proxies streamed token output from Ollama to the browser
- Decision tree: when to use WebGPU on-device (available, zero cost, zero trust) vs. VPS inference (device too slow) and how to switch transparently
- Rate limiting and plan gating: AI requests per day on free tier vs. premium

#### What `31-performance-budgets.md` must cover

- Global SLI/SLO definitions: `p50 < 50ms`, `p95 < 200ms`, `p99 < 500ms` for read endpoints; `p95 < 500ms` for write endpoints
- Real-time WebSocket message delivery: `p95 < 100ms` end-to-end (client → DO → client)
- Frontend Core Web Vitals minimums: LCP < 2.5s, CLS < 0.1, INP < 200ms; initial JS bundle < 150 KB gzipped per app
- Encryption overhead benchmarks: PBKDF2 at 600,000 iterations on mid-range Android adds ~500ms — document this and the OPAQUE/WebAuthn migration path from `5.md`
- Database query budget: all queries must complete in < 50ms at p95; N+1 query detection with Drizzle
- k6 load testing script against staging Workers: how to run, what thresholds fail the test, how to integrate into CI as a weekly job

#### What `32-internationalization.md` must cover

- Library choice rationale: `lingui` vs. `react-i18next` for 53 apps sharing `packages/ui` — the right answer given monorepo constraints and bundle size requirements
- Translation string location: per-app JSON files vs. shared `packages/ui/locales/` — with the tradeoff analysis
- Lazy-loading strategy: how translations are code-split so the initial bundle does not grow with language count
- RTL support decision: the binary architectural choice, the CSS logical properties approach (`margin-inline-start` not `margin-left`), and the impact on `packages/ui` Tailwind config
- Locale-aware blind indexing: whether search tokens should be Unicode-normalized (NFD/NFC) and lowercased before HMAC — critical for search correctness across German umlauts, French accents, CJK characters
- Timezone model: whether user timezone preference is stored in `auth.users`, transmitted in every API request as a header, or applied only at render time

***

### Tier 3 — Pre-Enterprise Required (4 files)

Must exist before any enterprise sales or external developer integrations.

| New Filename | Directory | Gap |
|---|---|---|
| `33-incident-response.md` | `07-business/` | GDPR breach notification timelines exist in `18-compliance-gdpr-cra.md` but there is no operational playbook — no severity classification, no kill switch procedure, no honeytoken implementation, no post-mortem template |
| `34-cross-app-state.md` | `05-frontend/` | `window.postMessage` and shared `.yourdomain.com` cookies are mentioned in `10-frontend-mobile-strategy.md` but the BroadcastChannel event bus protocol, postMessage message format, origin validation, and cross-app deep-link routing are unspecified |
| `35-webhooks.md` | `04-backend/` | Stripe webhook handling is described for payments only; there is no general inbound HMAC verification pattern, no outbound Cloudflare Queue retry worker design, no `webhook_deliveries` table schema |
| `36-developer-onboarding.md` | `08-execution/` | `docs/on-call` is referenced in the root `AGENTS.md` (in `22-appendices-reference.md`) as if it exists — it doesn't; there is no `setup.sh`, no annotated `.env.example`, no Hello World walkthrough |

#### What `33-incident-response.md` must cover

- Severity classification: S1 (data exfiltration, key compromise, authentication bypass), S2 (service unavailability, data corruption), S3 (performance degradation, failed backups, billing errors)
- First-15-minutes S1 checklist: invalidate all sessions (Better Auth session table truncate), rotate `BETTER_AUTH_SECRET` and `DATABASE_URL` password via Doppler, disable affected Workers via Cloudflare dashboard, notify affected users within 24 hours (CRA), file with supervisory authority within 72 hours (GDPR Article 33)
- Kill switch procedure: Cloudflare Zone → Pause (takes entire suite offline in < 60 seconds while preserving all data)
- Honeytoken implementation: fake API credentials stored in `app.honeytokens` table, fake email addresses seeded in `mail.mailboxes`, Cloudflare Worker alert triggered on first access to any honeytoken
- Post-incident review template: timeline of events, root cause, affected users count, data categories exposed, remediation steps, process changes — formatted to satisfy SOC 2 and CRA reporting obligations
- Communication templates: user notification email, supervisory authority notification, press statement (if required)

#### What `34-cross-app-state.md` must cover

- The complete cross-app state model: what is shareable (auth session, theme preference, unread notification count, active upload progress) and what must remain per-app
- `BroadcastChannel` event bus implementation: the channel name convention (`sovereign-suite-events`), the event schema (`{ type, payload, sourceApp, timestamp }`), and origin validation
- `window.postMessage` protocol for embedded Drive file picker inside Mail: the exact message format, the `targetOrigin` validation pattern, and the security rule (never accept `*` as target origin)
- Cross-app deep linking: how `calendar://event/abc123` URI schemes work in the Capacitor mobile app and how `https://calendar.yourdomain.com/event/abc123` deep links open the correct SPA — critical for notification click handlers
- Shared user preferences architecture: where global preferences (timezone, language, theme) live (the `auth.users` preferences JSONB column), how they are fetched once at shell load and propagated to all 53 apps without a preferences API call per page load

#### What `35-webhooks.md` must cover

- Inbound webhook security: HMAC-SHA256 signature verification in a Hono Worker (timing-safe comparison using `crypto.timingSafeEqual`), timestamp validation (reject requests older than 5 minutes), replay attack prevention using a `webhook_nonces` KV store
- The `webhook_deliveries` table: `id UUID`, `webhookEndpointId UUID`, `event TEXT`, `payload JSONB encrypted`, `status TEXT`, `attemptCount INT`, `lastAttemptAt TIMESTAMPTZ`, `nextRetryAt TIMESTAMPTZ`, `createdAt TIMESTAMPTZ`
- Outbound webhook delivery Worker: a Cloudflare Queue consumer that processes deliveries asynchronously, implements exponential backoff (1s, 5s, 30s), max 3 attempts, dead-letter queue for failed deliveries
- HMAC signature for outbound webhooks: how to sign outbound payloads so recipient servers can verify authenticity (matching Stripe's pattern: `X-Suite-Signature: sha256=<hmac>`)
- User-configured webhook endpoint management API: `POST /api/webhooks`, `GET /api/webhooks`, `DELETE /api/webhooks/:id`, with endpoint secret generation and rotation

#### What `36-developer-onboarding.md` must cover

- `./scripts/setup.sh`: installs `pnpm`, Docker Desktop / Docker Engine, `wrangler`, Doppler CLI; runs `pnpm install`; runs `docker-compose up -d`; runs `pnpm nx dev` — single command from git clone to running dev server
- Annotated `.env.example`: every environment variable documented with its purpose, which are required for local dev vs. staging vs. production, how to generate the cryptographic ones (`openssl rand -base64 32` for `BETTER_AUTH_SECRET`, `wrangler secret put` for production)
- The Hello World feature walkthrough: end-to-end tutorial for adding a new `hello-world` app — spec file → domain package → Hono API route → OpenAPI spec update → Orval client regeneration → React component → Vitest unit test → Playwright E2E test
- Common first-day errors: ESLint not resolving workspace packages (solution: `pnpm nx reset`), Nx daemon not starting (solution: `pnpm nx daemon --start`), pnpm store path mismatch in CI (the explicit `storedir` fix from `17-cicd-secrets-management.md`), wrangler not finding TypeScript types for Workers (solution: `wrangler types` command)
- Environment parity documentation: the 5 key differences between local dev, staging, and production (Hyperdrive vs. direct DB connection, R2 vs. local MinIO, Workers vs. `wrangler dev`, Doppler prod vs. dev environment, Better Auth cookie domain)

***

### Tier 4 — Product & Legal (11 files)

Required for a competitive, globally-available product.

| New Filename | Directory | Gap |
|---|---|---|
| `37-privacy-policy-template.md` | `12-legal/` | GDPR Article 13/14 transparency obligations are documented in `18-compliance-gdpr-cra.md` but no actual policy template exists for a zero-knowledge service |
| `38-terms-of-service-template.md` | `12-legal/` | Key-loss liability, data irretrievability disclaimers, DMCA safe harbor for Drive — none written |
| `39-feature-flags-ab-testing.md` | `11-product/` | Mentioned as a gap in `23-gap-analysis-research-roadmap.md`; zero implementation exists for KV-based flag evaluation or A/B user assignment |
| `40-app-calendar.md` | `10-apps/` | Domain model, E2EE key derivation path, full schema, CalDAV interop — implicit in the plan but never specified |
| `41-app-drive.md` | `10-apps/` | Chunked R2 upload pipeline, file tree schema, sharing permission model unspecified |
| `42-app-vault.md` | `10-apps/` | Master key derivation, TOTP seed storage, breach detection integration, export format unspecified |
| `43-app-chat.md` | `10-apps/` | DO room model, ECDH X25519 session key exchange, message retention policy unspecified |
| `44-app-contacts.md` | `10-apps/` | vCard import/export, CardDAV sync, blind indexing for names/emails unspecified |
| `45-app-tasks.md` | `10-apps/` | Task schema, project hierarchy, Yjs CRDT for collaborative task editing unspecified |
| `46-app-vpn.md` | `10-apps/` | WireGuard on VPS, per-user key provisioning, bandwidth metering for plan gating unspecified |
| `47-app-authenticator.md` | `10-apps/` | TOTP/FIDO2 seed storage, encrypted cross-device backup, recovery flow unspecified |

#### What `37-privacy-policy-template.md` must cover

The policy must accurately describe the cryptographic erasure mechanism (key deletion renders data permanently unreadable even if ciphertext is retained), the key escrow system (what happens when a user loses their master key), and what the operator can and cannot access (no plaintext access to user content — the zero-knowledge guarantee). It must comply with GDPR Article 13/14, CCPA, ePrivacy Directive, and include sections for: data collected, legal basis for processing, data retention, international transfers, user rights (access, rectification, erasure, portability, objection), controller contact details, and DPA contact.

#### What `38-terms-of-service-template.md` must cover

Sections specific to zero-knowledge services: the key management disclaimer (if a user loses their master password and has no recovery method, their data is permanently inaccessible — the operator cannot assist), data irretrievability acknowledgment, acceptable use policy inline or by reference, DMCA safe harbor statement for Drive file storage, limitation of liability for encrypted data loss, governing law and jurisdiction (EU-friendly for GDPR compliance), and the Enterprise self-hosting addendum terms.

#### What `39-feature-flags-ab-testing.md` must cover

- Cloudflare KV-based flag store: flag schema (`{ enabled: boolean, rolloutPercentage: number, allowlist: string[], denylist: string[] }`), the deterministic assignment function (`hmac(userId + flagName) % 100 < rolloutPercentage`), TTL caching strategy (read from KV once per Worker cold start, cache for 60 seconds)
- React `useFlag(flagName)` hook: reads flag state from the API, falls back to `false` when flag not found, never blocks render
- Server-side flag evaluation in Hono: how to gate entire API endpoints behind a flag without per-request KV reads
- A/B test assignment: consistent per-user bucketing using the same HMAC-based deterministic function, metric collection (which events to track per experiment), statistical significance calculation reference
- Flag lifecycle: creation → gradual rollout (1% → 10% → 50% → 100%) → flag cleanup process (ESLint rule that flags stale feature flags older than 90 days in code)

***

## Part 4 — Execution Order

The recommended sequence minimizes the window where AI agents operate without critical reference documents.

1. **Create all 13 directories** at once (`mkdir -p docs/{00-vision,01-architecture,02-monorepo,03-data,04-backend,05-frontend,06-infrastructure,07-business,08-execution,09-reference,10-apps,11-product,12-legal}`)
2. **Rename and move all 24 existing files** — pure filesystem operations, no content changes (`git mv` to preserve history)
3. **Write `24-database-schema-reference.md` first** — every other Tier 1 file and every app guide depends on knowing what tables exist
4. **Write remaining Tier 1 files** — testing strategy, error taxonomy, observability, mail architecture
5. **Update root `AGENTS.md`** — point agents at new paths; replace the dead `docs/on-call` reference with `docs/08-execution/36-developer-onboarding.md`; add `docs/03-data/24-database-schema-reference.md` as a mandatory read for all domain work
6. **Write Tier 2 files** — audit logging, AI assistant, performance budgets, i18n
7. **Write Tier 3 files** — incident response, cross-app state, webhooks, developer onboarding
8. **Write Tier 4 files** — legal templates, feature flags, all 8 app guides

***

## Part 5 — Final File Tree

```
docs/
├── 00-vision/
│   └── 00-vision-and-principles.md                    [from 1.md]
├── 01-architecture/
│   ├── 01-high-level-architecture.md                  [from 2.md]
│   └── 02-technology-stack.md                         [from 3.md]
├── 02-monorepo/
│   ├── 03-repository-structure.md                     [from 4.md]
│   ├── 04-shared-packages.md                          [from 5.md]
│   ├── 05-specification-ai-workflow.md                [from 6.md]
│   └── 25-testing-strategy.md                         [NEW — Tier 1]
├── 03-data/
│   ├── 06-database-multitenancy.md                    [from 7.md]
│   ├── 07-drizzle-migrations.md                       [from 8.md]
│   ├── 16-search-over-encrypted-data.md               [from 17.md]
│   ├── 24-database-schema-reference.md                [NEW — Tier 1]
│   └── 29-audit-logging.md                            [NEW — Tier 2]
├── 04-backend/
│   ├── 08-api-design-hono.md                          [from 9.md]
│   ├── 09-realtime-durable-objects.md                 [from 10.md]
│   ├── 26-error-handling-taxonomy.md                  [NEW — Tier 1]
│   └── 35-webhooks.md                                 [NEW — Tier 3]
├── 05-frontend/
│   ├── 10-frontend-mobile-strategy.md                 [from 11.md]
│   ├── 11-offline-sync-engine.md                      [from 12.md]
│   ├── 32-internationalization.md                     [NEW — Tier 2]
│   └── 34-cross-app-state.md                          [NEW — Tier 3]
├── 06-infrastructure/
│   ├── 12-infrastructure-hybrid.md                    [from 13.md]
│   ├── 13-push-notifications.md                       [from 14.md]
│   ├── 14-disaster-recovery-key-escrow.md             [from 15.md]
│   ├── 21-future-scaling-self-hosting.md              [from 22.md]
│   └── 27-observability-logging.md                    [NEW — Tier 1]
├── 07-business/
│   ├── 15-monetization-free-tier-limits.md            [from 16.md]
│   ├── 18-compliance-gdpr-cra.md                      [from 19.md]
│   └── 33-incident-response.md                        [NEW — Tier 3]
├── 08-execution/
│   ├── 17-cicd-secrets-management.md                  [from 18.md]
│   ├── 19-development-environment-ai.md               [from 20.md]
│   ├── 20-migration-plan.md                           [from 21.md]
│   ├── 31-performance-budgets.md                      [NEW — Tier 2]
│   └── 36-developer-onboarding.md                     [NEW — Tier 3]
├── 09-reference/
│   ├── 22-appendices-reference.md                     [from 23.md]
│   └── 23-gap-analysis-research-roadmap.md            [from 24.md]
├── 10-apps/
│   ├── 28-app-mail-architecture.md                    [NEW — Tier 1]
│   ├── 30-app-ai-assistant.md                         [NEW — Tier 2]
│   ├── 40-app-calendar.md                             [NEW — Tier 4]
│   ├── 41-app-drive.md                                [NEW — Tier 4]
│   ├── 42-app-vault.md                                [NEW — Tier 4]
│   ├── 43-app-chat.md                                 [NEW — Tier 4]
│   ├── 44-app-contacts.md                             [NEW — Tier 4]
│   ├── 45-app-tasks.md                                [NEW — Tier 4]
│   ├── 46-app-vpn.md                                  [NEW — Tier 4]
│   └── 47-app-authenticator.md                        [NEW — Tier 4]
├── 11-product/
│   └── 39-feature-flags-ab-testing.md                 [NEW — Tier 4]
└── 12-legal/
    ├── 37-privacy-policy-template.md                  [NEW — Tier 4]
    └── 38-terms-of-service-template.md                [NEW — Tier 4]
```

***

## Part 6 — AGENTS.md Update Required

After the restructure, the root `AGENTS.md` (living at `docs/09-reference/22-appendices-reference.md` after migration, but also mirrored at the repo root) must be updated to reflect:

```markdown
## Further Reading (Updated Paths)
- Domain-specific rules: `packages/domain-<name>/AGENTS.md`
- Full plan: `docs/00-vision/00-vision-and-principles.md`
- Schema reference: `docs/03-data/24-database-schema-reference.md`  ← NEW: mandatory read for all domain work
- Error codes: `docs/04-backend/26-error-handling-taxonomy.md`       ← NEW
- Testing guide: `docs/02-monorepo/25-testing-strategy.md`           ← NEW
- Compliance records: `docs/07-business/18-compliance-gdpr-cra.md`
- Incident response: `docs/07-business/33-incident-response.md`      ← NEW (replaces dead docs/on-call reference)
- Developer setup: `docs/08-execution/36-developer-onboarding.md`    ← NEW (replaces dead docs/on-call reference)
- App guides: `docs/10-apps/`                                        ← NEW directory
```

The dead `docs/on-call` reference in the current `AGENTS.md` must be removed. It points to a directory that has never existed and will mislead every AI agent that reads it.

***

*Sovereign Suite Documentation Restructure — Final Plan v1.0 — June 2026*