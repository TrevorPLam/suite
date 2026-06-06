## 5. Shared Packages

Key rule: `domain-*` packages may import `shared-kernel` and `db`, but **never** each other.

### 5.1 `packages/crypto`

Zero external dependencies. Uses Web Crypto API only.

| Constant | Value |
|----------|-------|
| `PBKDF2_ITERATIONS` | 600,000 |
| `PBKDF2_HASH` | SHA-512 |
| `DOMAIN_INFO_PREFIX` | `"SOVEREIGN_V1_"` |
| `AES_MODE` | AES-256-GCM |
| `RECOVERY_SECRET_LENGTH` | 32 bytes |
| `BLIND_INDEX_HMAC` | HMAC-SHA-256 |

**Core exports:** `deriveAccountKey` (PBKDF2), `deriveDomainKey` (HKDF), `encryptItem`/`decryptItem` (AES-256-GCM), `wrapItemKey`/`unwrapItemKey`, `generateKeyPair`/`deriveSharedSecret` (ECDH P-384), recovery kit helpers, `generateBlindIndexToken`, `constantTimeEqual`.

**Blind indexing:** Deterministic HMAC of plaintext → server stores token only. Client recomputes HMAC for search queries.

> PQC note: See [99-research-pipeline.md](99-research-pipeline.md).

> AI rules: [00-glossary-and-principles.md](00-glossary-and-principles.md)

---

### 5.2 `packages/db`

Single source of truth for database access. Exports: `createDbClient` (Drizzle + pg Pool), `createTenantClient` (user-scoped queries), `setTenantContext`/`resetTenantContext` (RLS session vars).

**Migrations:** Per-domain Drizzle configs with `schemaFilter` (e.g., `['calendar']`) and separate migration tables (`__drizzle_migrations_calendar`). Run via `APP_DOMAIN=<domain> pnpm db:migrate`. **Never run `drizzle-kit push` in CI or production.**

**RLS:** Every tenant-scoped table has `organization_id` + policy `tenant_isolation`. Set context in Hono middleware:

```typescript
app.use('*', async (c, next) => {
  await setTenantContext(db, c.get('tenantId'));
  await next();
  await resetTenantContext(db);
});
```

> AI rules: [00-glossary-and-principles.md](00-glossary-and-principles.md)

### 5.3 `packages/auth`

Embedded Better Auth inside each Hono Worker. Exports: `auth` (server) from `src/index.ts`, `authClient` (client) from `src/client.ts`.

- `trustedOrigins: [(origin) => origin.endsWith('.yourdomain.com')]` for SSO across 53 apps
- Plugins: email/password, OAuth (Google, Microsoft), orgs, SSO (SP only), 2FA, passkeys
- SAML is SP-only; cannot act as IdP
- Session cookie domain: `.yourdomain.com`
- **Workers isolate reuse risk:** Never store request-scoped state in module-level variables. Use Hono `c.get()`/`c.set()`.

### 5.4 `packages/ui-kit`

Shadcn components + Tailwind v4 theme. `globals.css` defines tokens; each app imports it. Build via `tsup` (ESM only). Add components via `pnpm nx g @myorg/ui-kit:add-component <name>`.

### 5.5 `packages/api-clients`

Orval generates React Query hooks, Zod schemas, and MCP servers from OpenAPI specs. Run `pnpm nx run api-clients:generate` after API changes. Pin Orval ≥7.19.0 (CVE-2026-22785, CVE-2026-23947). Do not upgrade to 8.x until issue #2749 resolved.

### 5.6 `packages/env-config`

Zod schemas per app for runtime env validation. Each API calls `validateEnv(schema)` at startup.

### 5.7 `packages/eslint-config`

ESLint 9 flat configs: `baseConfig` (TS + React + import sorting) + `boundaryConfig` (`@nx/enforce-module-boundaries`).

### 5.8 `packages/tsconfig`

Three bases: `base.json` (strict, ES2022), `vite.json` (ESNext/Bundler), `node.json` (NodeNext).

### 5.9 `packages/mobile`

Capacitor plugin wrappers. Biometric auth (`@capgo/capacitor-native-biometric`) with root/jailbreak check. Secure storage (`@capawesome/capacitor-secure-preferences`). Use Capacitor Vault for active lock sessions.

### 5.10 `packages/shared-kernel`

Universal types: `UserId` (branded string), `Timestamp`, `BaseEntity`. Zero dependencies.

### 5.11 `packages/domain-*`

Bounded contexts. Vertical slices: one file per feature (validation + logic + DB). Never import another `domain-*` package.

### 5.12 Summary

| Package | Responsibility | Key Tech |
|---------|---------------|----------|
| `crypto` | E2EE, key derivation, blind indexing | Web Crypto API |
| `db` | Drizzle client, RLS, migrations | Drizzle ORM + PostgreSQL |
| `auth` | Auth, sessions, SSO | Better Auth |
| `ui-kit` | Components, theme | shadcn/ui + Tailwind v4 |
| `api-clients` | Generated hooks, Zod, MCP | Orval |
| `env-config` | Env validation | Zod |
| `eslint-config` | Linting, boundaries | ESLint v9 |
| `tsconfig` | TS bases | TypeScript 5.8+ |
| `mobile` | Biometric, secure storage | Capacitor 8+ |
| `shared-kernel` | Universal types | TypeScript |
| `domain-*` | Business logic | TypeScript + Drizzle |

---

**[End of Section 5 — Next: Section 6: Specification‑First AI Workflow]**