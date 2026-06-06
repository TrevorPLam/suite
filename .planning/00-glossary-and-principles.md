# Sovereign Suite — Glossary & Principles

Single source of truth for concepts repeated across planning documents.

---

## 1. The Four Pillars

| Pillar | Description |
|--------|-------------|
| **Zero‑Knowledge** | Server never sees unencrypted content, passwords, or keys. All user data encrypted client‑side with AES‑256‑GCM. |
| **Self‑Hosted Core** | User identities and data live on hardware you control (Contabo VPS). Better Auth runs on your domain with scoped session cookies. |
| **Edge Performance** | Static assets and lightweight APIs served globally via Cloudflare free tier. Frontends on Pages, APIs on Workers, DB via Hyperdrive. |
| **AI‑Native** | Hierarchical `AGENTS.md` instructions, spec‑first workflow, and module boundaries designed for AI agents. |

## 2. Zero‑Knowledge in Practice

- **At rest:** All content stored as AES‑256‑GCM ciphertext. Keys never leave the user's device.
- **In transit:** TLS 1.3 between client and Cloudflare. Internal calls use HTTPS or Service Bindings.
- **During processing:** Server decrypts only when explicitly required. Plaintext exists only in memory and is zeroized immediately.

## 3. E2EE Key Hierarchy

```
User password → PBKDF2 (600k iter, SHA‑512) → Master key
Master key → HKDF("SOVEREIGN_V1_<domain>") → Domain key (calendar, drive, vault, ...)
Domain key → HKDF(<itemId>) → Per‑item key
Per‑item key → AES‑256‑GCM → Ciphertext + IV
```

Critical constants: `PBKDF2_ITERATIONS=600000`, `AES_MODE=AES-256-GCM`, `BLIND_INDEX_HMAC=HMAC-SHA-256`, `RECOVERY_SECRET_LENGTH=32` bytes.

## 4. Cross‑Domain Communication

`packages/domain-*` may **never** import from another `packages/domain-*`. Cross‑domain needs use HTTP calls via Cloudflare Service Bindings.

## 5. AGENTS.md Core Rules

1. Domain packages never import other domain packages.
2. Every feature begins with a spec: `apps/<app>/specs/<feature>.spec.md`.
3. API routes are thin: validation, auth, domain calls only.
4. Use `@suite/auth` for all auth. No custom sign‑in logic.
5. Migrations run in CI (`APP_DOMAIN=<domain> pnpm db:migrate`), never in Workers.
6. E2EE is mandatory. Encrypt with `@suite/crypto` before storage.
7. Tag all projects: `scope:<app>`, `type:app|domain|shared`.
8. One Durable Object per coordination unit (room, doc, board).
9. Blind indexing is default for search. Use `generateBlindIndexToken`.
10. RLS is mandatory for all tenant‑scoped tables.

## 6. Commands

```bash
pnpm install              # install dependencies
pnpm dev                  # run all apps in parallel
pnpm nx dev <project>     # run single project
pnpm nx affected:test     # test only changed projects
pnpm nx affected:lint     # lint only changed projects
pnpm nx affected:typecheck
check
pnpm nx graph             # visualize dependencies
```

## 7. Directory Structure

```
apps/<app>/web       → Vite React SPA
apps/<app>/api       → Hono API (Cloudflare Worker)
apps/<app>/specs     → Feature specifications (.spec.md)
packages/domain-*    → Bounded contexts (business logic)
packages/*           → Stateless shared libraries (crypto, db, auth, ui)
```

## 8. Spec Template (Minimal)

```markdown
---
spec_version: 1
feature: <name>
app: <app>
status: draft
---

## User Story
As a <role> I want <goal> so that <benefit>.

## Acceptance Criteria
- [ ] AC‑01: <criteria>

## API Contract
- **Endpoint:** `METHOD /path`
- **Request:** `{ ... }`
- **Response:** `{ ... }`

## Validation Rules
| Field | Rule | Error Code |

## Error Cases
| Scenario | Status | Code |

## Out of Scope
- <item>

## Security Considerations
- E2EE, RLS, audit log as applicable.
```
