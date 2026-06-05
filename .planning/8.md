## 8. Drizzle Migrations in Monorepo

Database migrations are the single most dangerous operation in your stack. A failed migration at 3 AM will take down all 53 applications simultaneously. A misconfigured migration that drops a table owned by another domain will destroy production data across the entire suite. This section documents the exact workflow—from schema change to applied migration—that makes this safe, auditable, and recoverable.

The solution is a hybrid approach: **per‑domain migration configurations** using `schemaFilter` and `tablesFilter`, combined with a **CI‑executed runner** that uses advisory locks for concurrency safety and absolute path resolution to avoid monorepo breakage.

---

### 8.1 The Core Problem: Drizzle’s 1:1 Migration Model

Drizzle Kit is architected around a strict one‑to‑one relationship between a config file, a schema source, a migration output directory, and the `__drizzle_migrations` tracking table. The `migrate` function offered by Drizzle is intended to be run at application startup via `drizzle-kit generate` followed by `migrate()`. This pattern **cannot work** in the Sovereign Suite for three reasons:

1. **Multiple bounded contexts, one database.** The Sovereign Suite has 53 applications, each with its own bounded context, but they all share a single PostgreSQL instance. Running `migrate()` for Calendar would not know about Drive’s tables and could erroneously drop them. The Drizzle team acknowledges that “if different schemas have tables with the same name, `drizzle-kit` will not function as expected”—a non‑starter for the Sovereign Suite.

2. **Workers have no filesystem.** The `migrate` function in Drizzle attempts to read migration files from disk using Node.js `fs` and `path` modules, which do not exist in the Cloudflare Workers execution environment. Therefore, `migrate()` cannot be executed from within a Worker.

3. **Concurrent migration execution.** Drizzle’s `migrate` function offers no internal protection against simultaneous invocations. If two CI jobs for different domains run migrations concurrently, they can corrupt the migration state and even re‑apply migrations multiple times.

The only viable path is to **move migrations out of the Worker entirely** and into the CI/CD pipeline, where each domain’s changes are applied **before** the corresponding Worker is deployed.

---

### 8.2 Per‑Domain Drizzle Configurations

The Sovereign Suite uses PostgreSQL schemas to enforce physical domain boundaries (e.g., `calendar.events`, `drive.items`, `vault.credentials`). Each domain has its own Drizzle Kit configuration file that uses `schemaFilter` to interact only with that PostgreSQL schema and `tablesFilter` to scope table inspection.

**Step 1 — Create per‑domain config files in `packages/db/`.**

For the Calendar domain: `packages/db/drizzle.calendar.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/calendar/**/*.ts',    // Only Calendar tables
  out: './drizzle/calendar',                  // Migrations land here
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ['calendar'],                 // 🔥 Limit to calendar PG schema
  tablesFilter: ['calendar_*', 'events', 'attendees', 'bookings'],
  migrations: {
    table: '__drizzle_migrations_calendar',   // Separate tracking table
    schema: 'drizzle',
  },
});
```

The `schemaFilter: ['calendar']` is your first line of defense: when you run `drizzle-kit generate`, Drizzle Kit introspects only tables inside the `calendar` PostgreSQL schema, ignoring tables belonging to other domains entirely. The `tablesFilter` acts as an additional safeguard, restricting the operation to a specific set of tables (e.g., `calendar_*`).

**Step 2 — Mirror the configuration for each bounded context.**

Copy the pattern for Drive (`drizzle.drive.config.ts`), Vault (`drizzle.vault.config.ts`), and each subsequent domain, adjusting `schema`, `tablesFilter`, and `migrations.table` accordingly.

**Step 3 — Define scripts in each domain’s `package.json`.**

```json
// packages/domain-calendar/package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate --config=../../packages/db/drizzle.calendar.config.ts",
    "db:migrate": "APP_DOMAIN=calendar tsx ../../packages/db/scripts/migrate.ts"
  }
}
```

Every domain’s developer runs the same `db:generate` command, but the config file they use points **only** to that domain’s schema.

---

### 8.3 The Production Migration Runner

Because `migrate` cannot run inside a Worker, the Sovereign Suite implements a standalone Node.js runner that executes migrations **in CI before deployment**. The runner lives in `packages/db/scripts/migrate.ts`.

**Implementation requirements:**
- Uses absolute path resolution to locate migration files, regardless of the monorepo’s current working directory.
- Uses PostgreSQL advisory locking to prevent concurrent migration runs from different domains or CI runners.
- Uses per‑domain migration tables (`__drizzle_migrations_calendar`) to maintain separate migration histories.
- Fails fast if `APP_DOMAIN` is not set.

**Complete runner implementation:**

```typescript
// packages/db/scripts/migrate.ts
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDbClient } from '../src/client.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const domain = process.env.APP_DOMAIN;
if (!domain) {
  throw new Error('APP_DOMAIN environment variable is required');
}

// Map domain to unique advisory lock ID
const lockIds: Record<string, number> = {
  calendar: 1001,
  drive: 1002,
  vault: 1003,
  mail: 1004,
  // ... add as new domains are added
};

const lockId = lockIds[domain];
if (!lockId) {
  throw new Error(`Unknown domain: ${domain}`);
}

const db = createDbClient(process.env.DATABASE_URL!);
const migrationsFolder = path.join(__dirname, '..', 'drizzle', domain);

// Acquire advisory lock (blocks if another migration is in progress)
await db.execute(sql.raw(`SELECT pg_advisory_lock(${lockId})`));

try {
  await migrate(db, {
    migrationsFolder: migrationsFolder,
    migrationsTable: `__drizzle_migrations_${domain}`,
  });
  console.log(`✅ Migrations applied for domain: ${domain}`);
} catch (error) {
  console.error(`❌ Migration failed for domain: ${domain}`, error);
  throw error;
} finally {
  // Always release the lock, even on error
  await db.execute(sql.raw(`SELECT pg_advisory_unlock(${lockId})`));
}
```

**Why advisory locks?** Drizzle’s `migrate` function is not protected against simultaneous execution. Without a lock, two CI jobs could run migrations concurrently and corrupt the migration state. The PostgreSQL advisory lock system guarantees that only one migration process holds the lock at any given time, serializing all migration attempts for that domain.

---

### 8.4 CI/CD Integration (The Critical Path)

Migrations are executed **in CI, before the Worker is deployed**, not at runtime inside the Worker. This ensures that the new schema is fully applied before any new code that depends on it becomes live.

**Step 1 — Add a migration job to the `deploy.yml` workflow.**

```yaml
jobs:
  migrations:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - name: Apply Calendar migrations
        if: steps.filter.outputs.calendar == 'true'
        run: pnpm --filter=domain-calendar db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          APP_DOMAIN: calendar
      - name: Apply Drive migrations
        if: steps.filter.outputs.drive == 'true'
        run: pnpm --filter=domain-drive db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          APP_DOMAIN: drive
      # ... repeat for each domain

  deploy-calendar:
    needs: migrations
    runs-on: ubuntu-latest
    # ... deployment steps
```

**Why this ordering matters:** The `needs: migrations` block ensures that the deployment only proceeds after migrations have successfully completed. If a migration fails, the deployment does not proceed, preventing an inconsistent state where the new code expects a schema that does not yet exist.

---

### 8.5 Zero‑Downtime Migration Principles (The Golden Rules)

Every migration in the Sovereign Suite follows the **expand/contract pattern** to avoid downtime. The golden rule, enforced by code review and CI, is: **every schema change that requires a table lock must be additive first and destructive later**.

| Phase | Action | Migration File | Downtime Risk |
|-------|--------|----------------|---------------|
| **Deploy 1** | Add new column (nullable) | `add_column.sql` (adds column, no NOT NULL) | None |
| **Between** | Backfill data; flip app code to use new column | **No migration** | None |
| **Deploy 3** | Add NOT NULL constraint; drop old column | `finalize.sql` (alter column, drop column) | Minimum |

**Example scenario — renaming a column:**

```sql
-- Phase 1: Add new column (nullable)
ALTER TABLE calendar.events ADD COLUMN start_timestamp TIMESTAMPTZ;

-- Application backfills data in batches (no migration)
UPDATE calendar.events SET start_timestamp = start_at WHERE start_timestamp IS NULL;

-- Phase 2 (next deploy): Flip app code to use start_timestamp; remove writes to start_at

-- Phase 3 (final deploy): Drop old column
ALTER TABLE calendar.events DROP COLUMN start_at;
```

**Never** rename or drop a column in the same deploy as the code that changes the usage pattern. Drizzle’s generated SQL is a starting point for local development, but for production you must review the generated SQL and split it into multiple deploy phases.

**Dangerous patterns that are strictly banned:**
- Running `drizzle-kit push` in production. Drizzle’s `push` command modifies the schema directly without generating auditable SQL and is intended only for local prototyping, not production.
- Dropping a column and referencing it in the same deploy.
- Adding a NOT NULL constraint to a table with existing rows in a single migration.
- Combining schema changes and data migrations in the same SQL file.
- Manually altering production schemas without a migration file.

---

### 8.6 Recovery from Migration Failures

Because migrations run in CI before deployment, a failure is captured before any user impact. The standard recovery procedure is:

1. **Immediately revert the migration PR.**
2. **Restore the database from the last known good backup** (Section 15 covers disaster recovery).
3. **Manually verify the migration script** to identify why it failed (e.g., missing `tablesFilter`).
4. **Prepare a corrected migration** that fixes the issue without destructive changes.
5. **Re‑run the migration job** from a hotfix branch.

If a migration has already been applied to production and the failure is discovered after the fact, the only safe path is to use a **forward migration** to revert the change (e.g., re‑add a dropped column), not a rollback that could lose data.

---

### 8.7 Monitoring and Observability

Every successful and failed migration is logged to:

- **GitHub Actions run logs** — complete migration output with timestamps and error details.
- **PostgreSQL** — each domain’s `__drizzle_migrations_<domain>` table records which migrations were applied, when, and the checksum of the SQL file, providing a complete audit trail.
- **Optional: Cloudflare Logpush** — send migration events to R2 for long‑term retention and compliance auditing.

**Alerting rule:** Configure a GitHub Action that notifies you via Slack or email whenever a migration fails, using the failure reason extracted from the `migrate.ts` error handler.

---

### 8.8 AI Agent Rules for Migrations

Add the following to your root `AGENTS.md` to encode production migration safety into your AI agents:

```markdown
## Database Migration Rules (AI Agents Must Follow)

1. **Never run `drizzle-kit push` in production.** Use `generate` + CI‑executed `migrate`.
2. **Every migration is additive.** New columns must be nullable; renames require the expand/contract pattern over 2+ deploys.
3. **SchemaFilter and tablesFilter are mandatory** in every Drizzle config. Never generate migrations without them.
4. **Migrations run in CI, never in Workers.** The Worker has no filesystem; `migrate()` will crash.
5. **Advisory locks are required for each domain.** Use a unique lock ID per domain in `migrate.ts`.
6. **Test migrations against a copy of production data** before deploying to production.
7. **Never merge a PR that adds a migration without a corresponding `db:generate` run** and a reviewed SQL file.
```

---

### 8.9 Summary Table: Migration Workflow at a Glance

| Step | Command | Location | Responsibility |
|------|---------|----------|----------------|
| **1. Develop schema change** | Edit `packages/domain-*/src/schema/*.ts` | Developer machine | Domain owner |
| **2. Generate migration SQL** | `pnpm --filter=domain-calendar db:generate` | Developer machine | Generates SQL in `packages/db/drizzle/calendar/` |
| **3. Review migration SQL** | Manual inspection | PR review | Domain owner + reviewer |
| **4. Commit migration** | `git add` + `git commit` | PR | Developer |
| **5. Merge PR** | GitHub PR merge | GitHub | Human |
| **6. CI runs migration** | `pnpm --filter=domain-calendar db:migrate` | GitHub Actions | Automated (advisory lock enforced) |
| **7. Deploy Worker** | `wrangler deploy` | GitHub Actions | Automated, only after successful migration |
| **8. Monitor success** | Check GitHub Actions logs + `__drizzle_migrations_*` tables | Observability | Human (alert on failure) |

This workflow guarantees that migrations are generated from declarative schemas, reviewed before they touch production, run safely with advisory locks, and executed before the corresponding API code becomes live. It is the safe, auditable, and recoverable foundation upon which all 53 applications depend.