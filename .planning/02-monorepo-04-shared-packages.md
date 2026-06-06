## 5. Shared Packages — Deep Dive

The `packages/` directory is the engine room of the entire Sovereign Suite. Every line of business logic, every cryptographic guarantee, every user interface component, and every cross-cutting concern lives here. The goal of this section is not to provide a passive catalog of packages, but to give you and your AI agents an **executable blueprint** for each one—complete with API contracts, architectural rules, code examples, and enforcement mechanisms.

A shared package in this architecture is any code that is consumed by more than one application or domain. This includes truly stateless utilities (`crypto`, `ui-kit`), shared infrastructure bindings (`auth`, `db`), the universal type layer (`shared-kernel`), and the bounded contexts themselves (`domain-*`). The key rule—enforced by Nx tags and ESLint—is that `domain-*` packages can import from `shared-kernel` and `db`, but they can **never** import from each other.

---

### 5.1 `packages/crypto` — The Zero-Trust Core

This package contains all cryptographic primitives for the entire suite. It has **zero external dependencies** and uses only the Web Crypto API (`crypto.subtle`), which is available in browsers, Cloudflare Workers, and Node.js 22+. The goal is to make the crypto layer auditable, portable, and impossible to accidentally weaken.

#### 5.1.1 Core Exports and API Surface

```typescript
// packages/crypto/src/index.ts

// Key derivation from user password (PBKDF2-SHA-512, 600,000 iterations)
export async function deriveAccountKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey>;

export function generateSalt(): Uint8Array;

// Domain key derivation (HKDF) from Account Key
export async function deriveDomainKey(
  accountKey: CryptoKey,
  domainInfo: "calendar" | "drive" | "vault" | string
): Promise<CryptoKey>;

// Per-item encryption (AES-256-GCM)
export async function generateItemKey(): Promise<CryptoKey>;
export async function encryptItem(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }>;
export async function decryptItem(
  ciphertext: ArrayBuffer,
  iv:Uint8Array,
  key: CryptoKey
): Promise<ArrayBuffer>;

// Key wrapping (encrypt one key with another)
export async function wrapItemKey(
  itemKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<ArrayBuffer>;
export async function unwrapItemKey(
  wrappedKey: ArrayBuffer,
  wrappingKey: CryptoKey
): Promise<CryptoKey>;

// Key exchange for sharing (ECDH P-384)
export async function generateKeyPair(): Promise<CryptoKeyPair>;
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey>;

// Recovery kit (Bitwarden-style)
export async function generateRecoverySecret(): Uint8Array;
export async function wrapAccountKeyForRecovery(
  accountKey: CryptoKey,
  recoverySecret: Uint8Array
): Promise<ArrayBuffer>;
export async function unwrapAccountKeyFromRecovery(
  wrappedKey: ArrayBuffer,
  recoverySecret: Uint8Array
): Promise<CryptoKey>;
export function recoverySecretToCode(secret: Uint8Array): string;
export function codeToRecoverySecret(code: string): Uint8Array;

// Searchable Encryption (Blind Indexing)
export async function generateBlindIndexToken(
  plaintext: string,
  salt: Uint8Array,
  key: CryptoKey
): Promise<string>;
export function generateBlindIndexSalt(): Uint8Array;
```

#### 5.1.2 Critical Security Constants

| Constant | Value | Rationale |
|----------|-------|-----------|
| `PBKDF2_ITERATIONS` | 600,000 | Modern baseline (NIST SP 800-132) — tested on mid-range Android (<500ms) |
| `PBKDF2_HASH` | SHA-512 | Resistance to length extension attacks |
| `DOMAIN_INFO_PREFIX` | `"SOVEREIGN_V1_"` | Domain separation prevents cross-app key reuse |
| `AES_MODE` | AES-256-GCM | Authenticated encryption (integrity + confidentiality) |
| `RECOVERY_SECRET_LENGTH` | 32 bytes | 256 bits of entropy |
| `BLIND_INDEX_HMAC` | HMAC-SHA-256 | Deterministic, keyed token for exact-match search |

#### 5.1.3 Blind Indexing for Searchable Encryption

The `generateBlindIndexToken` function is your production-ready solution for encrypted search. It works by deriving a deterministic HMAC from a plaintext keyword using a user-specific key and a per-field salt. The server stores only the HMAC token, never the plaintext. At search time, the client recomputes the HMAC and sends it to the server, which matches it against stored tokens. This provides exact‑match, prefix-match, and (with care) fuzzy‑match search capabilities without the server ever seeing the plaintext.

```typescript
// Example: Indexing an email subject
const emailSubject = "Meeting tomorrow at 10am";
const salt = generateBlindIndexSalt();
const token = await generateBlindIndexToken(emailSubject, salt, domainKey);
// Store (token, salt, encryptedEmail) in database

// Example: Searching emails
const searchTerm = "Meeting";
const queryToken = await generateBlindIndexToken(searchTerm, storedSalt, domainKey);
// Database query: WHERE blind_token = queryToken
```

#### 5.1.4 AI Agent Rules (AGENTS.md)

```markdown
## @suite/crypto — Rules for AI Agents

1. **Never add external dependencies.** Web Crypto API only.
2. **Always use async/await.** All crypto operations are asynchronous.
3. **Never log keys, salts, or plaintext.** Use `console.log` only for debugging metadata.
4. **Generate fresh salt for every blind index.** Salts are per token, not per user.
5. **Domain separation is mandatory.** Always use `deriveDomainKey` before domain-specific operations.
6. **Never reuse nonce/IV.** `generateItemKey` uses random IV with every encryption.
7. **Zeroize sensitive buffers.** Use `sensitive.set(new Uint8Array(0))` after use where possible.
```

---

### 5.2 `packages/db` — Database Client & Multi‑Tenancy

This package is the single source of truth for database access across all domains. It provides the Drizzle client, per‑domain schemas, connection management, tenant isolation, and migration tooling.

#### 5.2.1 Core Exports (`packages/db/src/index.ts`)

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as calendarSchema from './schemas/calendar';
import * as driveSchema from './schemas/drive';
import * as authSchema from './schemas/auth';
import * as sharedSchema from './schemas/shared';

export function createDbClient(connectionString: string) {
  const pool = new Pool({ connectionString, max: 20 });
  return drizzle(pool, {
    schema: { ...calendarSchema, ...driveSchema, ...authSchema, ...sharedSchema },
  });
}

export type DrizzleDb = ReturnType<typeof createDbClient>;

// Tenant-scoped client (injects user_id filters)
export function createTenantClient(db: DrizzleDb, tenantId: string) {
  return {
    calendar: {
      events: db.query.events.findMany({
        where: (t, { eq }) => eq(t.userId, tenantId),
      }),
      // ... other query builders
    },
    drive: { /* ... */ },
    vault: { /* ... */ },
  };
}

// Row-Level Security (RLS) helpers
export async function setTenantContext(
  db: DrizzleDb,
  tenantId: string
): Promise<void> {
  await db.execute(sql`SET app.current_tenant_id = ${tenantId}`);
}

export async function resetTenantContext(db: DrizzleDb): Promise<void> {
  await db.execute(sql`RESET app.current_tenant_id`);
}
```

#### 5.2.2 Drizzle Migrations in Monorepo (Per‑Domain Configs)

The migration system is a hybrid of Strategy 2 (Postgres Schemas) and Strategy 3 (Multi‑Config) from the Drizzle section. Each domain has its own Drizzle Kit configuration file that targets only its own schema and uses a separate migration history table.

`packages/db/drizzle.calendar.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/calendar/**/*.ts',
  out: './drizzle/calendar',
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['calendar'],
  migrations: {
    table: '__drizzle_migrations_calendar',
    schema: 'drizzle',
  },
});
```

The `schemaFilter: ['calendar']` directive is your critical safeguard: Drizzle Kit introspects the live database but **only looks at tables in the `calendar` PostgreSQL schema**. It will never generate a `DROP TABLE drive.items` statement. Each migration is generated and applied separately per domain, using a single `migrate.ts` runner invoked with `APP_DOMAIN=calendar tsx migrate.ts`.

#### 5.2.3 Multi‑Tenancy with Row‑Level Security (RLS)

For shared‑schema multi‑tenancy, you will use PostgreSQL RLS to enforce tenant isolation at the database level. Every tenant‑scoped table has an `organization_id` column, and RLS policies ensure that queries only return rows matching the current session variable.

```sql
-- Enable RLS on tenant-scoped table
ALTER TABLE calendar.events ENABLE ROW LEVEL SECURITY;

-- Create policy that enforces tenant isolation
CREATE POLICY tenant_isolation ON calendar.events
  FOR ALL USING (organization_id = current_setting('app.current_tenant_id')::uuid);
```

In your Hono API, set the tenant context before every request:

```typescript
app.use('*', async (c, next) => {
  const tenantId = c.get('tenantId'); // from auth
  await setTenantContext(db, tenantId);
  await next();
  await resetTenantContext(db);
});
```

#### 5.2.4 AI Agent Rules (AGENTS.md)

```markdown
## @suite/db — Rules for AI Agents

1. **Never bypass tenant client.** Always use `createTenantClient(db, userId)` for domain queries.
2. **Never hardcode schema names.** Use `schemaFilter` in Drizzle configs.
3. **Migrations are per‑domain.** Run `APP_DOMAIN=calendar pnpm db:migrate`, never inside Workers.
4. **RLS is mandatory for shared tables.** Every tenant‑scoped table must have RLS enabled.
5. **Never import from other domain packages.** Enforced by Nx tags.
6. **Use advisory locks for concurrent migrations.** Same lock ID per domain.
```

---

### 5.3 `packages/auth` — Embedded Authentication (No Separate Service)

This package exports a configured Better Auth instance that runs **inside your Hono Worker**, not as a separate service. Every API imports the same `auth` object and mounts its routes. Sessions are stored in the shared PostgreSQL database, and the session cookie is scoped to your parent domain for SSO across apps.

#### 5.3.1 Server‑Side Auth Instance (`packages/auth/src/index.ts`)

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDbClient } from '@suite/db';
import { sso } from '@better-auth/sso';
import { organization } from 'better-auth/plugins/organization';

export const auth = betterAuth({
  baseURL: process.env.AUTH_BASE_URL, // e.g., https://auth.yourdomain.com
  database: drizzleAdapter(createDbClient(process.env.DATABASE_URL!), { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! },
    microsoft: { clientId: process.env.MICROSOFT_CLIENT_ID!, clientSecret: process.env.MICROSOFT_CLIENT_SECRET! },
  },
  trustedOrigins: [(origin) => origin.endsWith('.yourdomain.com')],
  plugins: [
    sso({ /* SSO configuration for enterprise */ }),
    organization({ /* multi‑tenant org management */ }),
  ],
});
```

The `trustedOrigins` wildcard callback is critical for supporting 53 apps without hardcoding each one.

#### 5.3.2 Client‑Side Auth Client (`packages/auth/src/client.ts`)

```typescript
import { createAuthClient } from 'better-auth/client';
import { ssoClient } from 'better-auth/client/plugins';
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
  plugins: [ssoClient(), organizationClient()],
});

export const { signIn, signOut, useSession, getSession } = authClient;
```

#### 5.3.3 External Identity Tables

Better Auth’s default schema includes `user`, `session`, and `account` tables. To support external identities (Google, Microsoft, magic links) while maintaining zero‑knowledge, you add:

```sql
-- External identities table (provider + account_id as stable key)
CREATE TABLE auth.user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.user(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'microsoft', 'magic_link'
  provider_account_id TEXT NOT NULL,
  external_email_hash TEXT, -- salted hash for GDPR compliance
  UNIQUE(provider, provider_account_id)
);
```

#### 5.3.4 AI Agent Rules (AGENTS.md)

```markdown
## @suite/auth — Rules for AI Agents

1. **No custom sign‑in logic.** Import from `@suite/auth` for all auth operations.
2. **Embedded, not separate service.** The auth instance runs inside each Worker.
3. **Trusted origins wildcard.** Use `(origin) => origin.endsWith('.yourdomain.com')`.
4. **External identities store provider_account_id.** Never rely on email as stable identifier.
5. **Never store plaintext emails.** Use salted hash for GDPR compliance.
6. **Session cookie domain is `.yourdomain.com`.** Enables SSO across all apps.
```

---

### 5.4 `packages/ui‑kit` — Shared Design System

This package contains all Shadcn UI components, Tailwind CSS configuration, and theme tokens. It is the single source of visual truth for all 53 applications. Your AI agents can modify components here, and every consuming app will automatically use the updated design.

#### 5.4.1 Package Structure (`packages/ui-kit/`)

```
packages/ui-kit/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn components (button, dialog, card, etc.)
│   │   ├── layout/       # app layout components (sidebar, header, shell)
│   │   └── forms/        # form primitives with react-hook-form
│   ├── styles/
│   │   └── globals.css   # Tailwind v4 imports and CSS variables
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── use-mobile.ts
│   │   └── use-theme.ts
│   └── index.ts          # barrel exports
├── tailwind.config.ts
├── components.json       # shadcn configuration
├── tsup.config.ts        # builds to dist/ (ESM only)
└── package.json
```

#### 5.4.2 Tailwind CSS v4 Integration

Tailwind v4 uses a CSS‑first configuration paradigm. The shared `globals.css` file defines all theme tokens and utilities, and each app imports it directly.

`packages/ui-kit/src/styles/globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  /* Primary brand colors */
  --color-primary: #0F172A;
  --color-primary-foreground: #FFFFFF;

  /* Serif font for headings */
  --font-serif: "Times New Roman", Georgia, serif;
  --font-sans: Inter, system-ui, sans-serif;
}

@custom-variant dark (&:where(.dark, .dark *));
```

Each app consumes the styles with a single line:

```css
/* apps/calendar/web/src/index.css */
@import "@suite/ui-kit/styles/globals.css";
```

#### 5.4.3 Monorepo Import Pattern

For a Next.js app, you would add the following to `next.config.ts`:

```typescript
transpilePackages: ['@suite/ui-kit'],
```

For a Vite app, add to `vite.config.ts`:

```typescript
optimizeDeps: { include: ['@suite/ui-kit'] },
```

#### 5.4.4 Adding New Components

The `nx-factory-cli` tooling provides a command to add new shadcn components to the shared UI package:

```bash
pnpm nx g @myorg/ui-kit:add-component button card dialog
```

#### 5.4.5 AI Agent Rules (AGENTS.md)

```markdown
## @suite/ui-kit — Rules for AI Agents

1. **All components must be server‑component safe.** No direct `localStorage` access.
2. **Use `use client` directive only for interactive components.** Mark them explicitly.
3. **Tailwind classes should be composed via `cn()` helper.** Already exported from `@suite/ui-kit`.
4. **Dark mode is mandatory.** Every component must support `.dark` variant.
5. **Never add runtime JavaScript to globals.css.** It is a pure CSS file.
6. **Components must be accessible.** Use proper ARIA attributes and keyboard navigation.
```

---

### 5.5 `packages/api-clients` — Generated React Query Hooks

This package contains Orval-generated TypeScript API clients, React Query hooks, Zod schemas, and MCP servers for every app in the suite. The OpenAPI specification is the single source of truth; changes to the API automatically regenerate the client code. Orval itself is built as a monorepo with support for 8 client generators, validation via Zod, and mocking via MSW.

#### 5.5.1 Orval Configuration Example (`packages/api-clients/orval.config.ts`)

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  calendar: {
    input: { target: '../../apps/calendar/api/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './calendar/src/handlers.ts',
      schemas: './calendar/src/schemas',
      client: 'react-query',
      override: {
        mutator: { path: './custom-fetch.ts', name: 'customFetch' },
        mcp: { server: { path: './custom-server.ts', name: 'customServer' } },
      },
    },
  },
  drive: { /* similar */ },
  // ... for each app
});
```

#### 5.5.2 Generated Output

Running `pnpm nx run api-clients:generate` produces:

- `calendar/src/hooks/useListEvents.ts` → React Query hook with full types
- `calendar/src/schemas/event.zod.ts` → Zod runtime validators
- `calendar/src/handlers/mcp.ts` → MCP server for AI discovery

#### 5.5.3 CVE-2026-22785 Security Note

Versions prior to Orval 7.18.0 contain a vulnerability where the MCP server generation logic is vulnerable to code injection via unsanitized `summary` fields. **You must pin Orval to ≥7.18.0**.

#### 5.5.4 AI Agent Rules (AGENTS.md)

```markdown
## @suite/api-clients — Rules for AI Agents

1. **Never edit generated files manually.** Modify OpenAPI specs and regenerate.
2. **Run generation after every API change.** `pnpm nx run api-clients:generate`.
3. **Commit generated code to the repository.** Makes diffs visible during code review.
4. **Verify Orval version ≥7.18.0.** Earlier versions have CVE-2026-22785.
5. **Use generated hooks in frontend.** Do not write manual `fetch` calls.
```

---

### 5.6 `packages/env-config` — Runtime Environment Validation

This package exports Zod schemas that validate environment variables at startup for every app and Worker. It prevents the “missing env var” crash at runtime by failing fast during deployment.

```typescript
// packages/env-config/src/index.ts
import { z } from 'zod';

export const calendarEnv = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

export const driveEnv = z.object({
  DATABASE_URL: z.string().url(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET_NAME: z.string(),
});

// ... per app schemas

export function validateEnv<T extends z.ZodObject<any>>(schema: T): z.infer<T> {
  return schema.parse(process.env);
}
```

Each API calls `validateEnv(calendarEnv)` at the top of its entry point.

---

### 5.7 `packages/eslint-config` — Shared Linting Rules

This package exports ESLint 9 flat configs that are shared across all apps and packages. It includes TypeScript rules, import sorting, and the critical Nx module boundary enforcement.

```typescript
// packages/eslint-config/src/index.ts
import { defineConfig } from '@fabdeh/eslint-config'; // Uses ESLint v9 flat config

export const baseConfig = defineConfig({
  typescript: true,
  react: true,
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'import/order': ['error', { alphabetize: { order: 'asc' } }],
  },
});

export const boundaryConfig = defineConfig({
  plugins: ['@nx'],
  rules: {
    '@nx/enforce-module-boundaries': [
      'error',
      {
        depConstraints: [
          { sourceTag: 'scope:calendar', onlyDependOnLibsWithTags: ['scope:calendar', 'scope:shared'] },
          { sourceTag: 'type:domain', notDependOnLibsWithTags: ['type:domain'] },
        ],
      },
    ],
  },
});
```

---

### 5.8 `packages/tsconfig` — TypeScript Base Configurations

This package provides three base TypeScript configurations that are extended by every app and package in the monorepo:

- `base.json`: Strict type checking, ES2022 target, `skipLibCheck`, `noUncheckedIndexedAccess`
- `vite.json`: Extends `base`, sets `"module": "ESNext"`, `"moduleResolution": "Bundler"`
- `node.json`: Extends `base`, sets `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`

Each app’s `tsconfig.json` extends the appropriate base and sets its own `include` and `exclude`.

---

### 5.9 `packages/mobile` — Capacitor Plugin Wrappers

This package provides a unified TypeScript interface to Capacitor plugins for biometric authentication, secure storage, and push notifications. It abstracts away platform differences so your React code can call `mobile.biometric.authenticate()` without worrying about iOS vs Android.

#### 5.9.1 Biometric Authentication Wrapper

```typescript
// packages/mobile/src/biometric.ts
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { IsRoot } from '@capgo/capacitor-is-root';

export async function authenticateWithBiometric(
  reason: string = 'Authenticate to access your account'
): Promise<boolean> {
  // Always check for rooted/jailbroken devices first
  const { result: isRooted } = await IsRoot.isRooted();
  if (isRooted) {
    console.warn('Device security compromised — biometric authentication disabled');
    return false;
  }

  try {
    await NativeBiometric.verifyIdentity({ reason });
    return true;
  } catch (error) {
    console.error('Biometric authentication failed', error);
    return false;
  }
}
```

The `@capgo/capacitor-native-biometric` plugin supports all biometric types (Face ID, Touch ID, fingerprint), secure credential storage via iOS Keychain and Android Keystore, and passcode fallback. For production apps, you should also implement the Capacitor Vault plugin for “active lock + session” patterns that persist across multiple reads and writes.

#### 5.9.2 Secure Storage Wrapper

```typescript
// packages/mobile/src/secureStorage.ts
import { SecurePreferences } from '@capawesome/capacitor-secure-preferences';

export async function secureSet(key: string, value: string): Promise<void> {
  await SecurePreferences.set({ key, value });
}

export async function secureGet(key: string): Promise<string | null> {
  const { value } = await SecurePreferences.get({ key });
  return value ?? null;
}
```

#### 5.9.3 AI Agent Rules (AGENTS.md)

```markdown
## @suite/mobile — Rules for AI Agents

1. **Always check device integrity first.** Call `isRooted()` before biometric auth.
2. **Never store plaintext secrets in SecurePreferences.** Only store encrypted tokens.
3. **Gracefully degrade on web.** Use `typeof window !== 'undefined'` checks.
4. **Use Capacitor Vault for active lock sessions.** Not SecurePreferences.
```

---

### 5.10 `packages/shared-kernel` — Universal Types

This package contains the few truly universal types used across all domains and applications. It has **zero dependencies** on any other domain package.

```typescript
// packages/shared-kernel/src/user-id.ts
export type UserId = string & { readonly __brand: unique symbol };

// packages/shared-kernel/src/timestamp.ts
export type Timestamp = Date;

// packages/shared-kernel/src/base-entity.ts
export interface BaseEntity {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### 5.11 `packages/domain-*` — Bounded Contexts (Business Logic)

Each bounded context in the Sovereign Suite is a separate package named `packages/domain-<domain>`. These packages contain **all business logic** for that domain: use cases (features), domain models, and database queries. They must **never import from another `domain-*` package**; cross‑domain communication must go through HTTP calls (Service Bindings) or, in the future, events.

#### 5.11.1 Package Structure

```
packages/domain-calendar/
├── src/
│   ├── events/                    # feature folder
│   │   ├── create-event.ts        # validation + logic + DB in one file
│   │   ├── get-events.ts
│   │   ├── update-event.ts
│   │   ├── delete-event.ts
│   │   └── events.test.ts
│   ├── booking/                   # another feature folder
│   ├── availability/
│   └── index.ts                   # public API
├── tsconfig.json
├── package.json
└── AGENTS.md
```

#### 5.11.2 Feature File Example (`create-event.ts`)

```typescript
import { z } from 'zod';
import { createTenantClient } from '@suite/db';
import type { DrizzleDb } from '@suite/db';

export const CreateEventSchema = z.object({
  title: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().default(false),
});

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export async function createEvent(
  db: DrizzleDb,
  userId: string,
  input: CreateEventInput
): Promise<{ id: string }> {
  const tenant = createTenantClient(db, userId);
  const event = await tenant.calendar.events.create({ data: input });
  return { id: event.id };
}
```

#### 5.11.3 Boundary Enforcement

Nx project tags and ESLint rules ensure that `domain-*` packages never import from each other. Cross‑domain calls go through the API layer using Cloudflare Service Bindings (RPC) or, in the future, Cloudflare Queues.

#### 5.11.4 AI Agent Rules (AGENTS.md)

```markdown
## packages/domain-* — Rules for AI Agents

1. **One file per use case.** Do not split into commands/handlers/repositories folders.
2. **Never import from another domain package.** Enforced by ESLint — CI will fail.
3. **Export public API via index.ts.** Only exported functions are callable from outside.
4. **Test files live alongside feature files.** Use `*.test.ts` naming.
5. **Domain logic only.** Validation, business rules, DB queries. No HTTP, no routing.
```

---

### 5.12 Summary Table: Shared Package Responsibilities

| Package | Responsibility | Key Technology | Zero‑Knowledge Guarantee | Primary Consumer |
|---------|---------------|----------------|--------------------------|------------------|
| `crypto` | E2EE primitives, key derivation, blind indexing | Web Crypto API | Client‑side only; server sees only ciphertext and tokens | All domains |
| `db` | Drizzle client, tenant isolation, RLS, migrations | Drizzle ORM + PostgreSQL | Encrypted at rest; tenant isolation via `user_id` | All domains, all APIs |
| `auth` | Authentication, sessions, SSO, external identities | Better Auth | Passwords hashed; OAuth tokens encrypted; sessions stored | All APIs |
| `ui-kit` | Shared components, Tailwind theme, design tokens | Shadcn/ui + Tailwind v4 | N/A (UI only) | All frontend SPAs |
| `api-clients` | Generated React Query hooks, Zod schemas, MCP servers | Orval 7.18+ | N/A (type‑only) | All frontend SPAs |
| `env-config` | Runtime environment validation | Zod | N/A (config) | All APIs |
| `eslint-config` | Linting rules, boundary enforcement | ESLint v9 flat config | N/A (dev‑time) | All packages and apps |
| `tsconfig` | TypeScript base configurations | TypeScript 5.8+ | N/A (dev‑time) | All packages and apps |
| `mobile` | Capacitor plugin wrappers (biometric, secure storage) | Capacitor 8+ | Biometric uses hardware keystore; storage encrypted | Mobile apps via Capacitor |
| `shared-kernel` | Universal types (`UserId`, `Timestamp`, `BaseEntity`) | TypeScript | N/A (type‑only) | All domains and apps |
| `domain-*` | Bounded context business logic (use cases, models, queries) | TypeScript + Drizzle | Domain‑scoped E2EE; cross‑domain via API only | Apps' API routes |

---

### 5.13 AI Agent Code Generation Example

When an AI agent is asked to “add a cancel booking feature to Calendar,” it will naturally follow this workflow:

1. **Read the root `AGENTS.md`** to understand the architecture.
2. **Navigate to `packages/domain-calendar/src/booking/`** — the correct location for booking logic.
3. **Create `cancel-booking.ts`** containing validation schema, business logic, and DB query in one file.
4. **Write the corresponding test file** `cancel-booking.test.ts` in the same directory.
5. **Export the new function** from `packages/domain-calendar/src/index.ts`.
6. **In `apps/calendar/api/src/routes/bookings.ts`**, import `cancelBooking` and call it in the route handler (thin layer, no business logic).
7. **Run `pnpm nx affected:test`** to verify nothing else broke.

The structure guides the AI agent to the correct location automatically, reducing “vibe coding” errors and ensuring consistency across all 53 applications.

---

**[End of Section 5 — Next: Section 6: Specification‑First AI Workflow]**