## 21. Migration Plan

### 21.1 The Migration Philosophy

Building a monorepo from scratch is easy. Migrating existing standalone repositories into a monorepo is not. A polyrepo to monorepo migration is one of the most complex infrastructure changes a team can undertake. The Cash App team spent months migrating ~450 services into a monorepo, and the process fundamentally changed how they build, validate, and evolve backend code.

The Sovereign Suite faces a similar but more constrained challenge: you have ten existing standalone applications (Calendar, Drive, Vault, ProjectManagement, VPN, Mail, PersonalFinance, Photos, SecureChat, SocialApp), each built independently, with its own dependencies, configurations, and—critically—its own git history.

The migration strategy is **incremental**. You will not attempt a “big bang” migration where all 53 apps are moved in one PR. Instead, you will import one application at a time, verifying that each works correctly in the monorepo before moving to the next. This approach minimises risk, preserves git history, and allows you to maintain progress on the standalone repositories while the migration proceeds.

---

### 21.2 Prerequisites: Before Any Migration

Before the first `nx import` command is run, the Sovereign Suite monorepo must exist. The following must be complete:

| Prerequisite | Status | Verification |
|--------------|--------|--------------|
| Nx workspace initialised with `create-nx-workspace` | ✅ | `suite/` directory exists, `nx.json` present |
| pnpm workspaces configured with catalogs | ✅ | `pnpm-workspace.yaml` defines `apps/*` and `packages/*` |
| Shared packages created (`crypto`, `db`, `auth`, `ui-kit`, `shared-kernel`) | 🔄 | Each has `package.json` and exports a public API |
| Database schema in `packages/db` | 🔄 | `src/schema/` contains tables for each domain |
| Root `AGENTS.md` with migration rules | 🔄 | See Section 6.3 |
| Nx skills loaded (`nx configure-ai-agents`) | 🔄 | Enables agentic import |

The AI agent must have the Nx skills loaded before beginning the migration. The command `nx configure-ai-agents` scans your system, detects which agent harnesses you use (Claude Code, Codex, Cursor, etc.), and installs the Nx skills—including the `nx import` skill—for each one.

---

### 21.3 The Tool: `nx import`

Nx provides the `nx import` command specifically for this purpose. It clones the source repository, detects its tech stack, applies the appropriate Nx plugin, and preserves git history while moving files around.

The Nx CLI handles the heavy lifting: cloning, file moves, history preservation through subtree merges, and plugin detection and setup. This deterministic part ensures that the import works correctly for the majority of projects.

Where `nx import` falls short—handling workspace‑specific quirks, missing runtimes, or build failures after import—the AI agent steps in automatically. The agent runs verification steps: building the project graph, running builds, running tests. When something fails, it reacts autonomously, addressing issues like missing runtimes or build failures.

**Critical command flags:**

| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview the import without making changes |
| `--tag-rename` | Rename tags from the source repo to avoid collisions |
| `--help` | Display all available options |

**Basic usage:**

```bash
nx import ../path/to/calendar-repo --dry-run
nx import ../path/to/calendar-repo
```

**Agentic usage (recommended):**

```bash
# Instruct your AI agent (Claude Code, Cursor, etc.)
# "Import the calendar project from ../calendar-repo into apps/calendar.
# Use the nx import skill. Preserve git history and run tests after import."
```

The agent then invokes `nx import` for the source project and follows up with verification steps: building the project graph to confirm projects were detected and dependencies wired up, running builds, and running tests.

---

### 21.4 Phase 1: Shared Packages First

Before migrating any application, the shared packages that all apps depend on must be created. This ensures that when an app is imported, the dependencies it expects already exist.

**Phase 1 checklist:**

1. **Create `packages/shared-kernel`** — universal types (`UserId`, `Timestamp`, `BaseEntity`)
2. **Create `packages/crypto`** — E2EE primitives (blind indexing, PBKDF2, AES‑256‑GCM)
3. **Create `packages/db`** — Drizzle client, tenant scoping, RLS policies
4. **Create `packages/auth`** — Better Auth server and client instances
5. **Create `packages/ui-kit`** — Shadcn components, Tailwind config
6. **Create `packages/api-clients`** — Orval configuration stub
7. **Create `packages/env-config`** — Zod schemas for environment validation
8. **Create `packages/eslint-config`** — Shared linting rules with boundary enforcement
9. **Create `packages/tsconfig`** — Base TypeScript configurations
10. **Create `packages/mobile`** — Capacitor plugin wrappers

**Time estimate:** 1–2 weeks, assuming AI‑assisted generation.

**Validation:** Each package must:
- Build without errors (`pnpm nx run <pkg>:build`)
- Type-check cleanly (`pnpm nx run <pkg>:typecheck`)
- Export a public API via `index.ts`

---

### 21.5 Phase 2: Core Apps Migration (Ordered)

The migration order is not arbitrary. It prioritises apps with the fewest external dependencies, validating the monorepo structure incrementally.

| Order | App | Source Path | Destination Path | Dependencies | Why Early |
|-------|-----|-------------|------------------|--------------|-----------|
| **1** | Calendar | `../calendar-repo` | `apps/calendar/` | Shared packages only | Simplest: no auth, no encryption. Validates basic structure. |
| **2** | Drive | `../drive-repo` | `apps/drive/` | Shared packages + Clerk → Better Auth migration | Adds storage and auth migration. Tests cross‑app RPC. |
| **3** | Vault | `../vault-repo` | `apps/vault/` | Shared packages + E2EE integration | Adds encryption. Validates `packages/crypto`. |
| **4** | ProjectManagement | `../project-repo` | `apps/taskflow/` | Shared packages only | Tests tenant scoping. |
| **5** | VPN | `../vpn-repo` | `apps/vpn/` | Shared packages only | Isolated from core data, validates real‑time patterns. |
| **6–10** | Remaining apps | — | — | Shared packages + domain packages | Apply same pattern as core apps. |

**Why Calendar first:** Calendar has no authentication (currently global data), no encryption, and minimal external dependencies. It is the simplest test of the monorepo structure. Migrating it first validates that `apps/calendar/api` can call `packages/domain-calendar`, that `apps/calendar/web` can import from `packages/ui-kit`, and that the build pipeline works.

**Why Drive second:** Drive adds authentication (Clerk → Better Auth), R2 file storage, and cross‑app RPC (Calendar calling Drive for file metadata). It tests the most complex parts of the stack before Vault adds E2EE.

---

### 21.6 Per‑App Migration Procedure

For each app being migrated, follow this exact procedure:

#### Step 1: Prepare the Source Repository

```bash
cd ../calendar-repo

# Ensure all changes are committed
git status

# Create a migration branch
git checkout -b monorepo-migration

# Run any pending migrations (to ensure schema is up-to-date)
pnpm db:migrate
```

**Critical:** The source repository must be in a clean state. Uncommitted changes will be lost during the import.

#### Step 2: Dry‑Run the Import

```bash
cd ../suite-monorepo

# Preview what will happen
nx import ../calendar-repo --dry-run
```

The dry run shows:
- Which files will be moved
- Where they will be placed
- Any plugin installation recommendations

Review the output to confirm the destination directory (`apps/calendar`) and any plugin suggestions.

#### Step 3: Execute the Import (Agentic Mode)

```bash
# Instruct your AI agent
# "Import the calendar project from ../calendar-repo into apps/calendar.
# Use the nx import skill. Preserve git history.
# After import, run builds and tests to verify."

# Alternatively, run directly (but agentic mode handles post‑import verification)
nx import ../calendar-repo --tag-rename=calendar
```

The `--tag-rename` flag prevents tag collisions if the source repository has git tags that might conflict with the monorepo.

**What `nx import` does internally:**

1. Clones the source repository into a temporary directory
2. Filters git history to only include relevant files
3. Merges the filtered history into the monorepo on a temporary branch
4. Detects and suggests installing missing Nx plugins
5. Cleans up temporary files and remotes

**Post‑import, you are typically 90–95% of the way there**. The remaining work includes updating import paths, merging CI pipelines, and adjusting configurations.

#### Step 4: Update Import Paths

The imported code uses relative imports that need to be updated to use the monorepo’s shared packages.

**Common path updates:**

| Original Import | Updated Import |
|-----------------|----------------|
| `import { db } from '../lib/db'` | `import { createDbClient } from '@suite/db'` |
| `import { auth } from '../lib/auth'` | `import { auth } from '@suite/auth/server'` |
| `import { Button } from '../components/ui/button'` | `import { Button } from '@suite/ui-kit'` |

**Use the AI agent to automate this:**

```bash
# Instruct your AI agent
# "Update all import paths in apps/calendar to use @suite/ packages where appropriate.
# The shared packages are in packages/ directory."
```

#### Step 5: Add Domain Package

Create `packages/domain-calendar` and move business logic from the API into it.

**Structure:**

```typescript
// packages/domain-calendar/src/events/create-event.ts
import { z } from 'zod';
import { createTenantClient } from '@suite/db';

export const CreateEventSchema = z.object({
  title: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export async function createEvent(db: DrizzleDb, userId: string, input: unknown) {
  const validated = CreateEventSchema.parse(input);
  const tenant = createTenantClient(db, userId);
  return tenant.calendar.events.create({ data: validated });
}
```

**Export from domain package:**

```typescript
// packages/domain-calendar/src/index.ts
export * from './events/create-event';
export * from './events/get-events';
// ...
```

**Update API to be thin:**

```typescript
// apps/calendar/api/src/routes/events.ts
import { createEvent } from '@suite/domain-calendar';

app.post('/api/events', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  const event = await createEvent(c.get('db'), userId, body);
  return c.json(event);
});
```

#### Step 6: Add AGENTS.md to Domain Package

```markdown
# packages/domain-calendar/AGENTS.md

## Domain Calendar — Additional Rules
- Use `createEvent()`, `updateEvent()`, `deleteEvent()` from `src/events/`
- Never import from `domain-drive` (enforced by ESLint)
- All calendar events must be encrypted with `calendar` domain key (see `@suite/crypto`)
- Tests for this domain live alongside feature files (e.g., `create-event.test.ts`)
```

#### Step 7: Add Nx Tags and Boundary Rules

**Add tags in `project.json` (or create one if missing):**

```json
// packages/domain-calendar/project.json
{
  "name": "domain-calendar",
  "tags": ["scope:calendar", "type:domain"]
}
```

**Add to `apps/calendar/api/project.json`:**

```json
{
  "name": "calendar-api",
  "tags": ["scope:calendar", "type:app"]
}
```

**Update `.eslintrc.json` boundary rules** (if not already present):

```json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "depConstraints": [
          {
            "sourceTag": "scope:calendar",
            "onlyDependOnLibsWithTags": ["scope:calendar", "scope:shared"]
          },
          {
            "sourceTag": "type:domain",
            "notDependOnLibsWithTags": ["type:domain"]
          }
        ]
      }
    ]
  }
}
```

#### Step 8: Add Spec Files

Create spec files for features that need to be documented:

```bash
mkdir -p apps/calendar/specs
touch apps/calendar/specs/event-crud.spec.md
```

Populate the spec file with the required sections (see Section 6.4).

#### Step 9: Verify Build and Tests

```bash
# Type-check the entire project graph
pnpm nx typecheck affected

# Run linting
pnpm nx lint affected

# Run tests
pnpm nx test affected

# Build affected projects
pnpm nx build affected

# Run e2e tests for the app
pnpm nx e2e affected
```

The AI agent should run these verification steps automatically after import if using agentic mode.

#### Step 10: Deploy to Staging

```bash
# Deploy the API Worker to staging
pnpm nx run calendar-api:deploy --environment=staging

# Deploy the frontend to staging Pages
pnpm nx run calendar-web:deploy --environment=staging
```

Test the staging deployment thoroughly before marking the migration complete.

#### Step 11: Archive the Original Repository

After the app is verified working in the monorepo, archive the original repository:

```bash
# In GitHub, go to repository Settings → Danger Zone → Archive this repository
# Add a README pointing to the monorepo location
```

---

### 21.7 Preserving Git History: The Critical Requirement

Git history must be preserved for `git blame`, debugging, and understanding why changes were made. The `nx import` command preserves history automatically, but if you need to perform a manual merge, follow this procedure.

**Manual merge procedure** (only if `nx import` cannot be used):

```bash
# In the source repository, reorganise files
cd ../calendar-repo
git checkout main
git checkout -b monorepo-migration
mkdir -p apps/calendar
git ls-files | grep -v 'apps/calendar' | xargs -i git mv {} apps/calendar/
git commit -m "Reorganize for monorepo migration"

# In the monorepo, add remote and merge
cd ../suite-monorepo
git remote add calendar-repo ../calendar-repo
git fetch calendar-repo
git merge calendar-repo/monorepo-migration --allow-unrelated-histories
git remote remove calendar-repo
```

**Critical:** Use `git mv` (not `mv`) to move files—this preserves history. Without `--allow-unrelated-histories`, the merge would fail with “refusing to merge unrelated histories”.

---

### 21.8 Tag Collision: The Silent Danger

Tag collisions occur when the source repository and the monorepo have git tags with the same name. A tag like `v1.0.0` in both repositories will cause the merge to fail.

The `nx import` command provides the `--tag-rename` flag to automatically rename tags from the source repository:

```bash
nx import ../calendar-repo --tag-rename=calendar
```

This transforms tags like `v1.0.0` into `calendar_v1.0.0`, avoiding collisions.

**If tags have already collided and the merge failed**, run:

```bash
git tag -l | grep '^v' | xargs git tag -d   # Delete local tags
git fetch --tags                            # Re-fetch from remote
```

---

### 21.9 Post‑Migration Validation Checklist

After each app is migrated and before moving to the next, verify:

- [ ] `pnpm nx typecheck` passes for the app and its dependencies
- [ ] `pnpm nx test` passes for the app
- [ ] `pnpm nx build` produces a deployable artifact
- [ ] API routes respond correctly in staging (test authenticated and unauthenticated requests)
- [ ] Frontend loads and navigates without console errors
- [ ] Database migrations applied cleanly (check `__drizzle_migrations_<domain>` table)
- [ ] Cross‑app RPC calls work (e.g., Calendar calling Drive)
- [ ] E2E tests pass (if available)
- [ ] Git history is preserved (`git log --follow apps/calendar/api/src/...` shows original commits)
- [ ] Original repository archived on GitHub
- [ ] CI pipeline for the app is merged into the monorepo’s `.github/workflows/`

---

### 21.10 Decommissioning Standalone Repos

After an app is successfully migrated and validated, the original repository is archived. The archival process:

1. **Create an archival notice** in the repository’s README:

```markdown
# ⚠️ Archived

This repository has been migrated to the [Sovereign Suite Monorepo](https://github.com/yourorg/suite).

All further development happens there.

- **New location:** `apps/calendar/`
- **Domain package:** `packages/domain-calendar/`
- **Last sync:** 2026-06-04
```

2. **Archive on GitHub:**
   - Navigate to Settings → Danger Zone → Archive this repository
   - Confirm archival

3. **Remove from CI triggers** (if any external pipelines were monitoring the repo)

4. **Update internal documentation** to point to the monorepo location

---

### 21.11 Risk Mitigation and Rollback

| Risk | Mitigation |
|------|------------|
| **Migration fails partway** | Run `git reset --hard HEAD~1` to revert the merge commit. The source repository remains untouched. |
| **Import succeeds but builds fail** | The AI agent automatically attempts to fix build failures. If it cannot, run `nx import --dry-run` again to see what changed. |
| **Tags collide** | Use `--tag-rename`. If not used, delete colliding tags and re‑import. |
| **Database state incompatible** | Run `pnpm db:migrate` before importing new code. Roll back migrations if needed (not recommended). |
| **Git history lost** | The only safe rollback is to re‑import the source repository. Do not attempt to manually reconstruct history. |

**Emergency rollback procedure:**

```bash
# In the monorepo
git log --oneline -10                # Find the merge commit before import
git reset --hard <commit-before-import>
git push --force origin main         # Force push (use with caution, notify team)
```

**Rollback of database migrations** (last resort, data‑loss risk):

```bash
# List applied migrations
psql -d suite -c "SELECT * FROM __drizzle_migrations_calendar ORDER BY id DESC LIMIT 5;"

# Roll back to a specific migration (requires manual SQL)
psql -d suite -f rollback.sql
```

A safer alternative: deploy the previous version of the Worker, which works with the new schema (if the migration was additive), then fix forward.

---

### 21.12 Time Estimates

| Phase | Scope | Time | Risk |
|-------|-------|------|------|
| **Phase 1** | Shared packages (10 packages) | 1–2 weeks | Low |
| **Phase 2** | Calendar migration | 3–5 days | Low |
| **Phase 3** | Drive migration (with auth switch) | 3–5 days | Medium |
| **Phase 4** | Vault migration (with E2EE) | 2–3 days | Medium |
| **Phase 5** | Remaining apps (6 apps) | 2–3 days each | Low (pattern established) |

**Total estimated time:** 3–4 weeks of focused effort, assuming AI‑assisted development.

---

### 21.13 AI Agent Rules for Migration

Add the following to your root `AGENTS.md` to ensure migration consistency:

```markdown
## Migration Rules (AI Agents Must Follow)

1. **Always use `nx import` with the `--tag-rename` flag** to avoid tag collisions. Use agentic mode for automatic post‑import verification.

2. **Never move files manually without `nx import` or `git mv`.** Use the proper tooling to preserve git history.

3. **Run `pnpm nx typecheck affected` after every import** to catch import path errors early.

4. **Update imports to use `@suite/*` packages** before marking a migration complete.

5. **Create domain packages (`packages/domain-*`)** for each app, moving business logic out of the thin API layer.

6. **Add tags to each imported project** (`scope:<app>`, `type:app` for API, `type:domain` for domain packages).

7. **Test cross‑app RPC calls** (e.g., Calendar → Drive) after migration.

8. **Archive original repositories** only after the migrated app has passed all verification steps.

9. **Document the migration** in the monorepo’s `MIGRATION.md` (create if missing).

10. **Never delete the original repository** before archiving. Archival preserves history; deletion loses it permanently.
```

---

### 21.14 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **History preservation** | 100% of files retain original commit history | `git log --follow` on key files |
| **Build time (affected)** | < 5 minutes per app | CI run duration |
| **Test pass rate** | 100% | CI test output |
| **Deployment success** | 100% | Worker and Pages deploy logs |
| **Developer productivity** | No manual file copying | All migrations via `nx import` |

The migration is successful when:
- All ten existing apps are running in the monorepo
- Each app has a corresponding domain package
- Cross‑app RPC calls work
- Git history is fully preserved
- The original repositories are archived
- CI runs in < 10 minutes for any single‑app change

---

**[End of Section 21 — Next: Section 22: Future: Scaling & Full Self‑Hosting]**