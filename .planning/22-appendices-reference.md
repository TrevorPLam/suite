---
title: "Appendices — Reference Materials"
section: "appendices"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "01-overview-vision.md"
  - "03-architecture-repository-structure.md"
tags:
  - "appendices"
  - "reference"
  - "configuration"
  - "templates"
---

## 23. Appendices — Reference Materials

This section contains reference materials that support the Sovereign Suite's development and operations. It includes the complete `AGENTS.md` file (the source of truth for AI agent instructions), Drizzle Kit configuration for each domain, a sample feature specification (`.spec.md`), GitHub Actions workflow templates, Nx project tags and module boundary rules, Better Auth rate limiting fix, Tailwind CSS v4 shared theme, minimal Capacitor configuration for mobile, PNPM catalog best practices, secret scanning with Gitleaks, mirroring secrets into GitHub Actions with Doppler, Nx Cloud self‑healing CI configuration, quick reference Git workflows, and supplementary notes on third‑party tools. These appendices are living documents—update them as the suite evolves.

---

### 23.1 Complete AGENTS.md File

The `AGENTS.md` file at the root of the repository is the single source of truth for all AI agent instructions. It consolidates rules from every section of this plan into a single document that AI agents can reference during code generation.

**File: `AGENTS.md`**

```markdown
# Sovereign Suite — AI Agent Instructions

## Overview

The Sovereign Suite is a zero‑knowledge productivity suite built as a monorepo with 53 applications. This document encodes the architectural rules, development workflows, and operational constraints that AI agents must follow when generating or modifying code.

## Repository Rules

1. **Domain packages never import other domain packages.** `packages/domain-*` may NOT import from another `packages/domain-*`. Use HTTP calls (Service Bindings) for cross‑domain needs.
2. **Shared code belongs in `packages/`.** If code is used by multiple apps, it belongs in a shared package.
3. **Every feature begins with a spec.** Before writing code, create `apps/<app>/specs/<feature>.spec.md` with: user story, API contract, validation rules, error cases, out‑of‑scope.
4. **API routes are thin.** `apps/*/api` contain only request validation, auth checks, and calls to domain packages. No business logic.
5. **Use the shared auth package.** Never implement custom sign‑in logic. Import from `@suite/auth/server` and `@suite/auth/client`.
6. **Migrations run in CI, never in Workers.** Use `APP_DOMAIN=<domain> pnpm db:migrate`. Never call `migrate()` inside a Worker.
7. **Search uses blind indexing by default.** Implement exact‑match search via HMAC tokens. Defer semantic search until validated.
8. **One Durable Object per "room" (chat, doc, board).** Never put multiple coordination units in one DO.
9. **Every PR must pass `pnx affected --target=typecheck,test,lint`.** No exceptions.
10. **E2EE crypto is non‑negotiable.** All user content must be encrypted with AES‑256‑GCM before storage. Use `@suite/crypto`.
11. **Free tier limits must be monitored.** Each API must implement `UsageMonitor` middleware that blocks requests when limits approach 80%.

## Domain Package Rules

1. **Never import across domain boundaries.** Cross‑domain communication via HTTP/Service Bindings only.
2. **Domain packages own their database schema.** Each domain has its own Drizzle config with `schemaFilter`.
3. **Domain packages export business logic only.** No UI, no API routes, no Worker entry points.
4. **Domain packages are testable in isolation.** Write unit tests that mock HTTP calls to other domains.

## API Development Rules

1. **API routes are thin.** No business logic. Call domain packages and transform results.
2. **Mount Better Auth routes at `/api/auth`.** Use `@suite/auth` for all authentication.
3. **Cross‑domain calls use RPC service bindings.** Never call another domain package directly.
4. **All routes are prefixed with `/api`.** Public endpoints must be under `/api`.
5. **Environment validation must be the first call** in the API entry point.
6. **Always include the tenant middleware** for routes that access tenant‑scoped data.
7. **Return structured errors** with `error` and `message` fields.
8. **Use the shared logger middleware** for all Workers.
9. **Every API change must update the OpenAPI spec** and regenerate API clients.
10. **Never hardcode `trustedOrigins`.** Use the wildcard callback: `(origin) => origin.endsWith('.yourdomain.com')`.

## Database Rules

1. **Never run `drizzle-kit push` in production.** Use `generate` + CI‑executed `migrate`.
2. **Every migration is additive.** New columns must be nullable; renames require the expand/contract pattern over 2+ deploys.
3. **SchemaFilter and tablesFilter are mandatory** in every Drizzle config. Never generate migrations without them.
4. **Migrations run in CI, never in Workers.** The Worker has no filesystem; `migrate()` will crash.
5. **Advisory locks are required for each domain.** Use a unique lock ID per domain in `migrate.ts`.
6. **Test migrations against a copy of production data** before deploying to production.
7. **Never merge a PR that adds a migration without a corresponding `db:generate` run** and a reviewed SQL file.

## Real‑Time Rules

1. **One DO per coordination unit (chat room, document, board).** Never put multiple units in one DO.
2. **Always use the Hibernation API.** Use `ctx.acceptWebSocket(server)`, not `ws.accept()`.
3. **Never store client‑side state on the DO class instance.** State must be persisted to `this.ctx.storage` (embedded SQLite) to survive hibernation.
4. **Set alarms for cleanup.** Every DO that can become idle must schedule an alarm to delete stale state.
5. **E2EE is mandatory.** Encrypt messages before sending; DO should see only ciphertext.
6. **Implement retries with exponential backoff** for transient DO failures. Never retry immediately.
7. **Log the DO ID with every error.** This aids debugging across distributed failures.
8. **Use RPC service bindings for control operations** (e.g., `getConnectionCount`), not HTTP subrequests.
9. **Test WebSocket connections with proper cleanup.** Always close connections in `finally` blocks in tests.
10. **Respect free tier limits.** Monitor WebSocket connection requests and duration usage.

## Offline‑First Rules

1. **Every write is optimistic.** Write to local DB immediately; queue sync to server. Never block UI on network.
2. **Local DB is source of truth.** Reads always come from local encrypted storage; treat server as sync peer.
3. **Encrypt everything.** All data written to SQLite/IndexedDB must be encrypted with `@suite/crypto`.
4. **Use CRDTs for rich text; LWW for structured data.** Do not mix incorrectly.
5. **Sync via Durable Objects only.** Each user gets a DO for operation log.
6. **Never store operation log indefinitely.** Compact DO SQLite tables every 30 days.
7. **Test with offline scenarios.** Automated tests must run with network disconnected.
8. **Do not overwrite user data on conflict.** Resolve deterministically, using version timestamps.
9. **Sync on reconnect, not periodically.** Queue sync and run immediately when online.
10. **Background sync must respect battery and network state.** Only sync on unmetered Wi‑Fi if large payloads are expected.

## Infrastructure Rules

1. **Never expose database to public internet.** Use Cloudflare Tunnel or Tailscale for access.
2. **Secrets go in Doppler, never in code.** Inject them at runtime via `doppler run`.
3. **Use Hyperdrive for database connections from Workers.** Never connect directly.
4. **R2 is for object storage, not for database backups alone.** WAL‑G pushes to R2; database dumps are ephemeral.
5. **Fallback API is optional until free tier exceeded.** Test it manually, but do not deploy until needed.
6. **Monitor free tier quotas weekly.** Use the GraphQL script in Section 16.
7. **Infrastructure as code is mandatory.** Cloudflare resources defined in Terraform.
8. **Do not manually edit production Workers or Pages.** Always use CI/CD.
9. **Backup WAL archives daily.** Retention policy: 30 days.
10. **Test DR annually.** Restore from backup to a staging environment.

## Push Notification Rules

1. **Never store plaintext tokens in logs.** Tokens are sensitive; log only the first 4 and last 4 characters for debugging.
2. **Always encrypt notification payloads for mobile push.** Use `@suite/crypto` and derive a per‑device key stored in the keychain/keystore.
3. **Use one Agent per user.** Do not share a single Agent across multiple users for notification storage.
4. **Schedule reminders with `this.schedule()`.** Use the Agent's built‑in scheduling system, not a separate cron job.
5. **Handle 404/410 errors by deactivating tokens.** Do not delete tokens immediately; mark them inactive and log the event.
6. **Never send plaintext `alert` or `body` through FCM.** Always use the `data` payload and encrypt the contents.
7. **Use `@workkit/notify` for channel dispatch.** Do not re‑implement routing, fallbacks, or quiet hours.
8. **Test on physical devices for iOS.** Push does not work on the Simulator.
9. **Respect `presentationOptions` on mobile.** Only certain payload types trigger notification delivery in foreground.
10. **Implement idempotency for all notifications.** Use `idempotency_key` to prevent duplicate deliveries caused by retries.

## Disaster Recovery Rules

1. **Never modify the key escrow schema without updating the cold backup procedure.** Changes to `auth.key_escrow` require a corresponding update to the break‑glass recovery document.
2. **Test restores weekly.** The automated restore drill must pass before any migration that alters the physical storage format is deployed.
3. **Never store the recovery secret in the database.** The `recovery_secret` is ephemeral, never persisted.
4. **Retain WAL archives for 30 days minimum.** Any change that would reduce retention must be approved by the security review.
5. **Encrypt all backups at rest.** Use AES‑256 via `repo1-cipher-type=aes-256-cbc` in pgBackRest or WAL‑G's built‑in encryption.
6. **Document the break‑glass key in a secure physical location.** The recovery procedure must be printed and stored offline.
7. **Never disable `archive_mode`.** Continuous archiving is non‑negotiable.
8. **Test the full infrastructure recovery annually.** Rebuild the entire stack from Terraform + Ansible + WAL‑G backup.
9. **Monitor backup success and alert on failure.** Any missed backup window within 24 hours triggers a critical alert.
10. **The `pg_basebackup` incremental backup is complementary, not a replacement for WAL‑G.** Do not disable WAL archiving.

## Monetization Rules

1. **Never hardcode plan limits in UI.** Fetch from `GET /api/billing/limits` endpoint.
2. **Enforce limits at the API layer**, not just in UI. The `requirePlan` middleware must be applied to all premium endpoints.
3. **Rate limit free tier users more aggressively** than premium users. Use `planRateLimit` with different limits.
4. **Never store Stripe webhook secrets in code.** Use Doppler for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
5. **Make webhook handlers idempotent.** Use the Stripe event ID as a deduplication key.
6. **Log every upgrade and downgrade** to the audit log. Store `organization_id`, `old_plan`, `new_plan`, and `stripe_subscription_id`.
7. **Test the circuit breaker.** Write integration tests that simulate exceeding rate limits and verify the 429 response.
8. **Monitor free tier usage weekly.** Use the GraphQL monitoring Worker to alert before limits are hit.
9. **Document the self‑hosting deployment script.** It must be tested in a fresh environment before each release.
10. **Never give away premium features for free.** If a feature is gated, enforce it at the API layer.

## CI/CD Rules

1. **Never run database migrations inside Workers.** Use CI `db:migrate` jobs with `APP_DOMAIN` set.
2. **Do not hardcode environment names.** Use GitHub Environments (`production`, `staging`) to scope secrets.
3. **Cache the pnpm store explicitly.** The `store_dir` must be captured; `cache: 'pnpm'` alone is insufficient.
4. **Secrets go in Doppler, never in GitHub.** The only GitHub secret is `DOPPLER_TOKEN`.
5. **SBOM generation is mandatory before any release.** Run `compliance.yml` and verify the SBOM artifact.
6. **Never deploy without running migrations.** The `needs: [changes, migrations‑*]` block is non‑negotiable.
7. **Self‑hosted runners require hardening.** Run them in isolated containers, not on the bare VPS.
8. **CodeQL must pass on all new code.** Warnings are allowed; critical findings are not.
9. **Use `nx affected` in CI, never `nx run‑many`.** The latter runs everything, defeating the purpose of a monorepo.
10. **Rollback via Wrangler, not database restore.** Rolling back code is faster; database restores are for disaster recovery only.

## Compliance Rules

1. **Never store plaintext personal data.** All user content encrypted with `@suite/crypto`. Metadata (timestamps, IDs) is not personal data unless it identifies an individual.
2. **Every new table with personal data must have an entry in RoPA.** The `compliance:ropa` check will fail the PR otherwise.
3. **DPIA must be updated every 3 months.** If a new app or processing activity is added, the DPIA must be reviewed.
4. **Erasure is cryptographic.** Deleting a user's encryption keys is sufficient; do not attempt to individually delete encrypted blobs unless required by specific retention policies.
5. **Audit logs retained for 30 days only.** Older logs are pseudonymised (user_id replaced with hash) or deleted.
6. **Breach notification timeline is fixed.** 24 hours to ENISA, 72 hours to DPA, without undue delay to data subjects.
7. **SBOM must be generated weekly.** The `compliance.yml` workflow runs on Sundays; if it fails, fix before merging any new code.
8. **VEX status is mandatory for all CVEs.** Every vulnerability in the SBOM must have a VEX statement explaining its status (`not_affected`, `affected`, `fixed`, `under_investigation`).
9. **Privacy policy must be versioned.** Any change to data processing must be reflected in the privacy policy and communicated to users.
10. **DPA is required for enterprise customers.** The standard DPA is the starting point; customisation requires legal review.

## Migration Rules

1. **Never migrate without a backup.** Create a Git branch backup before each migration.
2. **Use `nx import` for all migrations.** Do not manually copy files.
3. **Preserve Git history.** Verify `git log` in the imported directory shows the full history.
4. **Rename tags before import.** Prefix tags with the app name to avoid collisions.
5. **Validate before proceeding.** Run the full post‑migration checklist (build, test, lint, typecheck, smoke test).
6. **Deploy to staging first.** Never deploy a migrated app directly to production.
7. **Migrate shared packages first.** No app migration until shared packages are stable.
8. **Handle dependency conflicts immediately.** Use `workspace:*` for internal dependencies.
9. **Document the migration in the app's README.** Include the migration date and any breaking changes.
10. **Delete the standalone repo only after 1 week of production stability.** Keep it as a rollback option.

## Scaling Rules

1. **Monitor free tier usage weekly.** Use the GraphQL monitoring script to alert at 80% of limits.
2. **Upgrade only when the bottleneck is hit.** Do not pre‑emptively scale; it wastes money.
3. **Use Hibernation API for all Durable Objects.** Idle DOs must not consume duration.
4. **Partition tables before they exceed 10M rows.** Use PostgreSQL 17 declarative partitioning.
5. **Implement lifecycle rules for R2.** Delete temporary files after 24 hours.
6. **Test self‑hosted deployment in a fresh environment.** The Docker Compose bundle must work out‑of‑the‑box.
7. **Shard rooms at 10k concurrent connections.** Do not let a single DO exceed this limit.
8. **Use read replicas for read‑heavy workloads.** Configure Hyperdrive to route reads accordingly.
9. **Document scaling decisions in the ops runbook.** Include the trigger metrics and the upgrade steps.
10. **Never scale horizontally without load testing.** Validate the upgrade path in staging first.
```

---

### 23.2 Drizzle Kit Configuration for Each Domain

Each domain has its own Drizzle Kit configuration file with `schemaFilter` and `tablesFilter` to isolate that domain's tables.

**Calendar (`packages/db/drizzle.calendar.config.ts`):**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/calendar/**/*.ts',
  out: './drizzle/calendar',
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['calendar'],
  tablesFilter: ['calendar_*', 'events', 'attendees', 'bookings'],
  migrations: {
    table: '__drizzle_migrations_calendar',
    schema: 'drizzle',
  },
});
```

**Drive (`packages/db/drizzle.drive.config.ts`):**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/drive/**/*.ts',
  out: './drizzle/drive',
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['drive'],
  tablesFilter: ['drive_*', 'items', 'folders', 'shares'],
  migrations: {
    table: '__drizzle_migrations_drive',
    schema: 'drizzle',
  },
});
```

**Vault (`packages/db/drizzle.vault.config.ts`):**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/vault/**/*.ts',
  out: './drizzle/vault',
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['vault'],
  tablesFilter: ['vault_*', 'credentials', 'folders', 'categories'],
  migrations: {
    table: '__drizzle_migrations_vault',
    schema: 'drizzle',
  },
});
```

---

### 23.3 Sample Feature Specification (`.spec.md`)

Every feature in the Sovereign Suite begins with a specification file. This is a template for the spec format.

**File: `apps/calendar/specs/recurring-events.spec.md`**

```markdown
---
title: "Recurring Events"
app: "calendar"
status: "draft"
last_updated: "2026-06-04"
related_files:
  - "packages/domain-calendar/src/lib/events.ts"
  - "apps/calendar/web/src/components/EventForm.tsx"
tags:
  - "calendar"
  - "recurring"
  - "rrule"
---

## User Story

As a calendar user, I want to create events that repeat on a schedule (daily, weekly, monthly, yearly) so that I don't have to manually create each instance.

## API Contract

### POST /api/calendar/events

**Request Body:**

```typescript
{
  title: string;
  start: string; // ISO 8601 datetime
  end: string; // ISO 8601 datetime
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // e.g., every 2 weeks
    until?: string; // ISO 8601 date
    count?: number; // maximum occurrences
  };
}
```

**Response (201 Created):**

```typescript
{
  id: string;
  title: string;
  start: string;
  end: string;
  recurrence: RecurrenceRule;
  instances: Array<{
    id: string;
    start: string;
    end: string;
  }>;
}
```

### GET /api/calendar/events/:id/instances

**Query Parameters:**
- `from`: ISO 8601 date (inclusive)
- `to`: ISO 8601 date (exclusive)

**Response (200 OK):**

```typescript
{
  instances: Array<{
    id: string;
    start: string;
    end: string;
  }>;
}
```

## Validation Rules

- `start` must be before `end`
- `recurrence.frequency` is required if `recurrence` is present
- `recurrence.interval` must be >= 1
- `recurrence.until` and `recurrence.count` are mutually exclusive
- Maximum 365 instances per recurring event (to prevent abuse)

## Error Cases

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `invalid_recurrence` | 400 | Recurrence rule is invalid (e.g., interval < 1) |
| `too_many_instances` | 400 | Recurrence would generate > 365 instances |
| `event_not_found` | 404 | Event ID does not exist |

## Out of Scope

- Editing individual instances of a recurring event (future enhancement)
- Exception dates (skipping specific instances)
- Complex recurrence patterns (e.g., "first Monday of every month")
```

---

### 23.4 GitHub Actions Workflow Templates

**CI Workflow (`.github/workflows/ci.yml`):**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      - name: Get pnpm store directory
        id: pnpm-store
        run: echo "store_dir=$(pnpm store path --silent)" >> $GITHUB_OUTPUT
      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-store.outputs.store_dir }}
          key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            pnpm-store-${{ runner.os }}-
      - run: pnpm install --frozen-lockfile
      - uses: nrwl/nx-set-shas@v4
      - run: pnpm nx affected --target=lint,typecheck,test,build
```

**Deploy Workflow (`.github/workflows/deploy.yml`):**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      calendar: ${{ steps.filter.outputs.calendar }}
      drive: ${{ steps.filter.outputs.drive }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            calendar:
              - 'apps/calendar/**'
              - 'packages/domain-calendar/**'
            drive:
              - 'apps/drive/**'
              - 'packages/domain-drive/**'

  migrations-calendar:
    needs: changes
    if: needs.changes.outputs.calendar == 'true'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - name: Run calendar migrations
        run: pnpm --filter=domain-calendar db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          APP_DOMAIN: calendar

  deploy-calendar:
    needs: [changes, migrations-calendar]
    if: needs.changes.outputs.calendar == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - name: Deploy Calendar
        run: pnpm nx run calendar:deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Compliance Workflow (`.github/workflows/compliance.yml`):**

```yaml
name: Compliance

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'
  workflow_dispatch:

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          path: .
          format: spdx-json
          output-file: sbom.spdx.json
      - name: Scan with Grype
        uses: anchore/grype-action@v0
        with:
          sbom: sbom.spdx.json
          fail-build: true
          severity-cutoff: high
```

---

### 23.5 Nx Project Tags and Module Boundary Rules

**File: `nx.json`**

```json
{
  "namedInputs": {
    "default": ["{projectRoot}/**/*"],
    "production": ["!{projectRoot}/**/*.spec.ts", "!{projectRoot}/**/*.test.ts"]
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    "test": {
      "inputs": ["default", "^production"]
    }
  },
  "plugins": [
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    }
  ]
}
```

**Project tags in `package.json`:**

```json
{
  "name": "@suite/domain-calendar",
  "nx": {
    "tags": ["domain:calendar", "type:domain"]
  }
}
```

**ESLint module boundary rule (`.eslintrc.js`):**

```javascript
module.exports = {
  overrides: [
    {
      files: ['packages/domain-*/**/*.ts'],
      rules: {
        '@nx/enforce-module-boundaries': [
          'error',
          {
            allow: [],
            depConstraints: [
              {
                sourceTag: 'type:domain',
                onlyDependOnLibsWithTags: ['type:shared', 'type:infrastructure']
              }
            ]
          }
        ]
      }
    }
  ]
};
```

---

### 23.6 Better Auth Rate Limiting Fix

Better Auth's rate limiting middleware has a known issue where it does not respect the `max` parameter correctly. The Sovereign Suite uses a custom implementation.

**File: `packages/auth/src/rateLimit.ts`**

```typescript
import { createMiddleware } from 'hono/factory';

export const rateLimit = (max: number, windowMs: number) =>
  createMiddleware(async (c, next) => {
    const key = `ratelimit:${c.get('userId') || c.req.header('CF-Connecting-IP')}`;
    const current = await c.env.KV.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= max) {
      return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    await c.env.KV.put(key, String(count + 1), { expirationTtl: windowMs / 1000 });
    await next();
  });
```

---

### 23.7 Tailwind CSS v4 Shared Theme

**File: `packages/ui/tailwind.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --color-primary-dark: #2563eb;
  --color-primary-light: #60a5fa;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #64748b;
  --color-muted-foreground: #94a3b8;
  --color-border: #e2e8f0;
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;
}
```

---

### 23.8 Minimal Capacitor Configuration for Mobile

**File: `apps/mobile/capacitor.config.json`**

```json
{
  "appId": "com.sovereign.suite",
  "appName": "Sovereign Suite",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 0,
      "launchAutoHide": true
    },
    "LocalNotifications": {
      "smallIcon": "ic_stat_icon_config_sample",
      "iconColor": "#3b82f6"
    }
  }
}
```

---

### 23.9 PNPM Catalog Best Practices

**File: `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: ^19.0.0
  typescript: ^5.6.0
  hono: ^4.11.7
  drizzle-orm: ^0.33.0
  better-auth: ^1.1.0
```

**Usage in `package.json`:**

```json
{
  "dependencies": {
    "react": "catalog:react",
    "hono": "catalog:hono"
  }
}
```

---

### 23.10 Secret Scanning with Gitleaks

**File: `.gitleaks.toml`**

```toml
title = "gitleaks config"

[[rules]]
description = "AWS Access Key"
regex = '''(A3T[A-Z0-9]|[AKIA]{0,2}[A-Z0-9]{16,20})'''
tags = ["key", "AWS"]

[[rules]]
description = "Cloudflare API Token"
regex = '''[a-zA-Z0-9]{32}'''
tags = ["key", "Cloudflare"]

[allowlist]
paths = [
  '''pnpm-lock.yaml''',
  '''package-lock.json''',
  '''yarn.lock'''
]
```

**Pre-commit hook (`.husky/pre-commit`):**

```bash
#!/bin/sh
gitleaks detect --source . --config .gitleaks.toml --no-git
```

---

### 23.11 Mirroring Secrets into GitHub Actions with Doppler

**File: `.github/workflows/deploy.yml`**

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Fetch Doppler secrets
        id: secrets
        uses: dopplerhq/secrets-fetch-action@v2
        with:
          doppler-token: ${{ secrets.DOPPLER_TOKEN }}
      - name: Deploy
        run: npx wrangler deploy
        env:
          DATABASE_URL: ${{ steps.secrets.outputs.DATABASE_URL }}
          BETTER_AUTH_SECRET: ${{ steps.secrets.outputs.BETTER_AUTH_SECRET }}
```

---

### 23.12 Nx Cloud Self‑Healing CI Configuration

**File: `nx.json`**

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "typecheck", "test", "lint"],
        "accessToken": "YOUR_NX_CLOUD_TOKEN",
        "parallel": 3,
        "recordStdout": true
      }
    }
  }
}
```

---

### 23.13 Quick Reference Git Workflows

| Workflow | Command |
|----------|---------|
| **Start feature branch** | `git checkout -b feature/calendar-recurring` |
| **Commit changes** | `git add . && git commit -m "feat: add recurring events"` |
| **Push to remote** | `git push -u origin feature/calendar-recurring` |
| **Create PR** | `gh pr create --title "Add recurring events" --body "See spec"` |
| **Merge PR** | `gh pr merge --merge` |
| **Delete branch** | `git branch -d feature/calendar-recurring && git push origin --delete feature/calendar-recurring` |
| **Revert commit** | `git revert <commit-hash>` |
| **Cherry‑pick commit** | `git cherry-pick <commit-hash>` |
| **Stash changes** | `git stash push -m "WIP"` |
| **Pop stash** | `git stash pop` |

---

### 23.14 Supplementary Notes on Third‑Party Tools

| Tool | Purpose | Version | Notes |
|------|---------|---------|-------|
| **Wrangler** | Cloudflare Workers CLI | ^3.78.0 | Use `npx wrangler` for local development |
| **Drizzle Kit** | Database migrations | ^0.24.0 | Always use `schemaFilter` in monorepo |
| **Orval** | API client generation | ^6.28.0 | Generate from OpenAPI specs |
| **Changesets** | Changelog management | ^2.27.0 | Use for versioning shared packages |
| **Vitest** | Unit testing | ^2.1.0 | Configured in `vitest.config.ts` |
| **Playwright** | E2E testing | ^1.48.0 | Configured in `playwright.config.ts` |
| **ESLint** | Linting | ^9.14.0 | Configured with Nx plugin |
| **Prettier** | Code formatting | ^3.3.0 | Configured in `.prettierrc` |
| **TypeScript** | Type checking | ^5.6.0 | Configured in `tsconfig.base.json` |

---

**[End of Appendices — End of Planning Document]**
