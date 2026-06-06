---
title: "Migration Plan — Moving Existing Apps to Monorepo"
section: "migration"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "03-architecture-repository-structure.md"
  - "09-development-workflow-development-environment.md"
tags:
  - "migration"
  - "nx"
  - "git-history"
  - "monorepo"
---

## 21. Migration Plan — Moving Existing Apps to Monorepo

The Sovereign Suite's monorepo architecture is designed from the ground up for greenfield development. However, the reality of a solo founder is that you likely have existing standalone applications—perhaps a prototype Calendar app, a Drive demo, or a Mail client—that you want to bring into the monorepo without losing their Git history. This section provides a complete, production‑ready migration strategy: an incremental philosophy, a phased approach starting with shared packages, a per‑app migration procedure using `nx import`, methods for preserving Git history, handling tag collisions, and a post‑migration validation checklist. The goal is to move each existing application into the monorepo with zero data loss, zero history loss, and minimal disruption to ongoing development.

---

### 21.1 The Incremental Migration Philosophy

The Sovereign Suite's migration strategy is **incremental, not big‑bang**. You do not migrate all 53 applications in a single weekend. Instead, you migrate one app at a time, validate it, and only then proceed to the next. This approach has three critical advantages:

1. **Risk containment.** If a migration fails, only one app is affected. The rest of the monorepo continues to function normally.
2. **Continuous delivery.** While Calendar is being migrated, Drive and Vault continue to ship features from their standalone repos. Users see no disruption.
3. **Learning curve.** Each migration teaches you lessons that improve the next one. By the time you reach app #20, the process is a well‑oiled machine.

**The migration order:** Start with the shared packages (`packages/crypto`, `packages/db`, `packages/auth`), then migrate the simplest app (likely Calendar), then progressively more complex apps. This order ensures that the foundational infrastructure is stable before you migrate the applications that depend on it.

---

### 21.2 Prerequisites for Migration

Before migrating any application, ensure the following are in place:

| Prerequisite | Why It Matters |
|--------------|----------------|
| **Nx is installed** in the standalone repo | `nx import` requires Nx to be present in the source repo |
| **Git history is clean** (no uncommitted changes) | `nx import` operates on a clean Git state |
| **Dependencies are up‑to‑date** | Ensure the standalone repo uses the same major versions of React, TypeScript, etc., as the monorepo |
| **Tests pass** in the standalone repo | You want a known-good baseline before migration |
| **CI/CD is documented** | You need to understand the existing deployment pipeline to replicate it in the monorepo |

**Install Nx in the standalone repo:**

```bash
cd /path/to/standalone-calendar
npx nx@latest init
```

This adds `nx.json` and a `package.json` script for running Nx commands. You do not need to restructure the standalone repo; the presence of Nx is sufficient for `nx import` to work.

---

### 21.3 The Phased Migration Approach

The migration proceeds in four phases:

| Phase | Goal | Duration |
|-------|------|----------|
| **Phase 1** | Migrate shared packages (`packages/crypto`, `packages/db`, `packages/auth`) | 1–2 days |
| **Phase 2** | Migrate the first app (Calendar) as a proof‑of‑concept | 2–3 days |
| **Phase 3** | Migrate remaining apps in batches of 2–3 | 1 week per batch |
| **Phase 4** | Delete standalone repos and update DNS/CI | 1 day |

**Phase 1: Shared Packages**

Shared packages are the foundation. Migrate them first because every app depends on them. The process is:

1. **Copy the package directory** from the standalone repo to `packages/crypto` in the monorepo.
2. **Update `package.json`** to remove any app‑specific scripts and add the monorepo‑standard scripts (`build`, `test`, `lint`).
3. **Run `pnpm install`** in the monorepo to resolve dependencies.
4. **Run `pnpm --filter=crypto build`** to verify the package builds successfully.
5. **Commit and push** the shared package to the monorepo.

**Phase 2: First App (Calendar Proof‑of‑Concept)**

Choose the simplest app—typically Calendar—as the first migration. This proves the process works and reveals any edge cases before you migrate more complex apps.

**Phase 3: Batch Migration**

Migrate 2–3 apps at a time. This balances speed with risk containment. After each batch, run the full monorepo CI to ensure nothing broke.

**Phase 4: Cleanup**

Once all apps are migrated and validated, delete the standalone repos, update DNS to point to the monorepo‑deployed versions, and decommission the old CI/CD pipelines.

---

### 21.4 Per‑App Migration Procedure Using `nx import`

Nx provides a dedicated `import` command that moves a project from one repository to another while preserving Git history. This is the recommended approach for the Sovereign Suite.

**Step 1 — Prepare the source repo:**

```bash
cd /path/to/standalone-calendar
git checkout main
git pull
npx nx@latest init  # Ensure Nx is installed
```

**Step 2 — Run `nx import` from the monorepo:**

```bash
cd /path/to/suite-monorepo
npx nx import --source=/path/to/standalone-calendar --projectName=calendar --importPath=apps/calendar
```

This command:
- Copies the source code to `apps/calendar`
- Preserves Git history via a `.git/info/grafts` file
- Updates the monorepo's `nx.json` to include the new project
- Runs `pnpm install` to resolve dependencies

**Step 3 — Verify the import:**

```bash
pnpm --filter=calendar build
pnpm --filter=calendar test
pnpm --filter=calendar lint
```

**Step 4 — Update the project configuration:**

The imported project may have a standalone `package.json` that needs adjustment:

- Remove standalone‑specific scripts (e.g., `deploy:heroku`)
- Add monorepo‑standard scripts (`build`, `test`, `lint`)
- Update dependencies to use workspace versions (e.g., replace `"@suite/crypto": "^1.0.0"` with `"@suite/crypto": "workspace:*"`)

**Step 5 — Configure CI/CD:**

Add the app to the `deploy.yml` workflow's `dorny/paths-filter` configuration:

```yaml
calendar:
  - 'apps/calendar/**'
  - 'packages/domain-calendar/**'
  - 'packages/shared-kernel/**'
```

**Step 6 — Deploy to staging:**

Deploy the migrated app to a staging environment (e.g., `calendar-staging.yourdomain.com`) and perform manual smoke testing:

- Verify the app loads
- Test authentication flow
- Test core features (create event, edit event, delete event)
- Verify real‑time features if applicable

**Step 7 — Deploy to production:**

After staging validation, deploy to production and monitor for errors.

---

### 21.5 Preserving Git History with `nx import`

Git history is a critical asset. It contains the story of how the code evolved, the rationale for past decisions, and the ability to `git blame` to understand why a line was written. `nx import` preserves history using Git's grafts mechanism.

**How it works:**

1. `nx import` copies the source repo's `.git` directory to a temporary location.
2. It creates a graft file in the monorepo's `.git/info/grafts` that maps the imported project's commits to the monorepo's history.
3. When you run `git log` in the monorepo, the grafted commits appear as if they were always part of the monorepo.

**Verification:**

```bash
cd apps/calendar
git log --oneline
```

You should see the full history from the standalone repo, including commit messages and authorship.

**Caveat:** Grafts are not pushed to remote repositories by default. To make the history visible to other developers, you must either:
- Push the graft file (not recommended, as it can cause conflicts)
- Use `git filter-repo` to permanently rewrite the monorepo's history to include the imported commits (recommended for final migration)

**Using `git filter-repo` for permanent history integration:**

```bash
git filter-repo --to-subdirectory-filter apps/calendar --refs standalone-calendar-main
```

This rewrites the monorepo's Git history to include the standalone repo's commits as if they had always been in `apps/calendar`. This is a one‑way operation; ensure you have a backup before running it.

---

### 21.6 Handling Tag Collisions

If the standalone repo and the monorepo both use Git tags (e.g., `v1.0.0`), `nx import` may create tag collisions. The Sovereign Suite's strategy is to rename tags in the standalone repo before import:

```bash
cd /path/to/standalone-calendar
git tag -l | while read tag; do
  git tag "calendar-$tag" "$tag"
  git tag -d "$tag"
done
```

This prefixes all tags with `calendar-`, ensuring they do not collide with monorepo tags. After import, the tags appear as `calendar-v1.0.0` in the monorepo.

---

### 21.7 Post‑Migration Validation Checklist

After each app migration, validate the following before proceeding to the next app:

| Validation | Command / Action | Success Criteria |
|------------|------------------|------------------|
| **Build succeeds** | `pnpm --filter=<app> build` | Exit code 0 |
| **Tests pass** | `pnpm --filter=<app> test` | All tests pass |
| **Lint passes** | `pnpm --filter=<app> lint` | No lint errors |
| **Typecheck passes** | `pnpm --filter=<app> typecheck` | No type errors |
| **Dependencies resolve** | `pnpm install` | No peer dependency conflicts |
| **Git history preserved** | `cd apps/<app> && git log --oneline` | History visible |
| **CI/CD works** | Push to `main`, observe GitHub Actions | CI passes, deploys successfully |
| **Smoke test** | Manual testing of core features | All features work |
| **Real‑time features** | Test WebSocket connections (if applicable) | Connections work |
| **Authentication** | Test sign‑in, sign‑out, session persistence | Auth flow works |

If any validation fails, fix the issue before proceeding. Do not accumulate technical debt during migration.

---

### 21.8 Risk Mitigation and Rollback

Despite careful planning, migrations can fail. The Sovereign Suite's risk mitigation strategy includes:

| Risk | Mitigation |
|------|------------|
| **Migration corrupts monorepo** | Branch protection: only merge migration PRs after full CI validation |
| **Git history lost** | Backup monorepo before each migration (`git branch backup-$(date +%Y%m%d)`) |
| **Deployment fails** | Deploy to staging first; rollback via `wrangler rollback` if production fails |
| **Dependency conflicts** | Use `workspace:*` protocol for internal dependencies; external versions pinned in monorepo root |
| **Tag collisions** | Rename tags in standalone repo before import (see Section 21.6) |

**Rollback procedure:**

If a migration fails after deployment to production:

1. **Revert the migration PR** in the monorepo.
2. **Roll back the Worker/Pages deployment** via Wrangler: `npx wrangler rollback calendar-api --version=previous`
3. **Restore the standalone repo** as the active source of truth.
4. **Investigate the failure** before attempting migration again.

---

### 21.9 Time Estimates

Based on a solo founder working full‑time:

| Phase | Estimated Time |
|-------|----------------|
| **Phase 1: Shared packages** | 1–2 days |
| **Phase 2: First app (Calendar)** | 2–3 days |
| **Phase 3: Batch migration (50 apps)** | 20–25 days (assuming 2–3 apps per day) |
| **Phase 4: Cleanup** | 1 day |
| **Total** | **24–31 days** |

This is a one‑time effort. Once the migration is complete, all future development happens in the monorepo, and the incremental benefits (shared code, unified CI, cross‑app visibility) accrue indefinitely.

---

### 21.10 AI Agent Rules for Migration

Add the following to your root `AGENTS.md`:

```markdown
## Migration Rules (AI Agents Must Follow)

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
```

---

### 21.11 Summary: Migration at a Glance

| Step | Action | Tool |
|------|--------|------|
| **1. Prepare source repo** | Install Nx, clean Git state | `npx nx init` |
| **2. Import to monorepo** | Copy code, preserve history | `npx nx import` |
| **3. Verify build** | Build, test, lint, typecheck | `pnpm --filter=<app>` |
| **4. Update configuration** | Adjust package.json, add to CI/CD | Manual edit |
| **5. Deploy to staging** | Smoke test core features | `wrangler deploy` |
| **6. Deploy to production** | Monitor for errors | GitHub Actions |
| **7. Validate** | Run post‑migration checklist | Manual + automated |
| **8. Cleanup** | Delete standalone repo after 1 week | `git rm` |

The migration plan transforms a fragmented set of standalone repos into a unified, scalable monorepo—without losing history, without disrupting users, and without introducing technical debt. It is the bridge from the prototype phase to the production phase of the Sovereign Suite.
