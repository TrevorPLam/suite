# Sovereign Suite — Vision & Principles v6

**Last updated: June 2026**

> See [00-glossary-and-principles.md](00-glossary-and-principles.md) for the Four Pillars, E2EE key hierarchy, AGENTS.md rules, and core commands.

---

## 1. Mission

Build a **privacy‑respecting, zero‑knowledge productivity suite** (53 apps) to compete with Google Workspace and Microsoft 365. Every app encrypts user data **before it leaves the browser/device** (E2EE). Launch cost: **$0** beyond the existing Contabo VPS. Architecture is simple, consistent, and documented for AI agents.

## 2. The Four Pillars

| Pillar | Description |
|--------|-------------|
| **Zero‑Knowledge** | Server never sees unencrypted content or keys. AES‑256‑GCM client‑side. |
| **Self‑Hosted Core** | Identities and data on your VPS. Better Auth, scoped session cookies. |
| **Edge Performance** | Vite SPAs on Cloudflare Pages; Hono APIs on Workers; Hyperdrive to Postgres. |
| **AI‑Native** | Hierarchical `AGENTS.md`, spec‑first workflow, enforced module boundaries. |

## 3. Strategic Shifts from v5

> Full rationale table moved to [99-research-pipeline.md](99-research-pipeline.md#1-strategic-shifts-from-v5--v6).

- `modules/` → `packages/domain-*`
- Clean Architecture folders → vertical slices (one file per use case)
- Message broker → direct HTTP via Service Bindings
- PartyKit → raw Durable Objects + Hibernation API
- Worker‑startup migrations → CI‑run migrations per domain
- Clerk option → Better Auth only (self‑hosted)

## 4. 53‑App Roadmap

| Tier | Apps | When |
|------|------|------|
| **1** | Mail, Drive, Calendar | Launch v1 |
| **2** | Messenger, Contacts, Tasks | v2 |
| **3** | Vault, VPN, Authenticator | v3 |
| **4** | Docs, Sheets, Slides, Forms, CRM, Accounting, Helpdesk | v4+ |
| **5** | Photos, Music, Video, Podcasts | v5+ |

## 5. What This Plan Delivers

- Single‑command dev environment (`pnpm install && pnpm dev`)
- CI/CD deploying only changed apps (Nx `affected`)
- Zero‑knowledge guarantees with no third‑party auth/storage
- AI‑friendly structure minimizing hallucinations
- Production ops: backups, DR, usage monitoring, GDPR compliance

The architecture is over‑engineered for a prototype and under‑engineered for Google — exactly right for a solo founder building with AI.

*End of Document*