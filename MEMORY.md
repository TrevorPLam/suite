# MEMORY.md — Suite Repo Handoff

_Last updated: 2026-06-05_

This file is the **session handoff / context injection** for the Suite monorepo. Read this first when resuming work.

## 1) One-sentence summary

You are building a **large productivity suite monorepo** intended to grow into Calendar, Tasks, Drive, and more. The repo is currently a **greenfield pnpm workspace** with an **Nx-oriented root config**, a **domain-first package structure**, and initial starter surfaces for the first three apps.

## 2) Current architectural intent

- **Monorepo model**
  - Single repository for all apps and shared packages.
  - Workspace package manager: **pnpm**.
  - Task orchestration / repo graph focus: **Nx**.

- **Repo design rules**
  - Domain packages never import other domain packages.
  - Shared code lives in `packages/`.
  - Shared UI code lives in `packages/ui`.
  - API layers stay thin: validate, auth, orchestrate, then delegate to domain packages.
  - Features should begin with a spec before implementation.

- **Canonical package names**
  - `packages/ui` is the canonical shared UI package.
  - `packages/ui-kit` was removed as a legacy folder.
  - Current shared packages include `ui`, `crypto`, `db`, `auth`, `env-config`, `shared-kernel`.
  - Domain packages include `domain-calendar`, `domain-tasks`, `domain-drive`.

## 3) Repo state at the moment

### Root files present
- `package.json`
- `pnpm-workspace.yaml`
- `nx.json`
- `tsconfig.base.json`
- `AGENTS.md`
- `README.md`
- `.gitignore`

### Planning docs
- `.planning/` contains the original long-form blueprint.
- These docs are important historical context and should be consulted before major architecture changes.
- They have been updated in places to reflect `packages/ui` instead of `ui-kit`, but they remain the design history source of truth.

### Shared packages present
- `packages/shared-kernel`
- `packages/crypto`
- `packages/db`
- `packages/auth`
- `packages/env-config`
- `packages/ui`
- `packages/domain-calendar`
- `packages/domain-tasks`
- `packages/domain-drive`

### App surfaces present
- `apps/calendar`
- `apps/tasks`
- `apps/drive`

Each app currently has:
- `web/` starter package
- `api/` starter package

## 4) What is already scaffolded

### `packages/ui`
- `package.json` exports:
  - `.` → `./src/index.ts`
  - `./styles/globals.css` → `./src/styles/globals.css`
- Depends on `react` and `@types/react`
- Has starter UI exports:
  - `src/index.ts` exports `Button`
  - `src/components/ui/button.tsx`
  - `src/styles/globals.css`

### Domain packages
- `packages/domain-calendar/src/index.ts`
  - exports `getCalendarOverview()`
  - exports `CalendarEvent` type
- `packages/domain-tasks/src/index.ts`
  - exports `getTasksOverview()`
  - exports `TaskItem` type
- `packages/domain-drive/src/index.ts`
  - exports `getDriveOverview()`
  - exports `DriveFile` type

These are **starter domain APIs**, not real business logic yet.

### `packages/env-config`
- Exports Zod schemas:
  - `calendarEnv`
  - `tasksEnv`
  - `driveEnv`
  - `validateEnv()`
- This package still needs dependency installation before typecheck will succeed in editor/CI.

### App web starters
Each web app now has a real Vite starter layout:
- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `src/App.tsx`
- `src/main.tsx`
- `src/styles.css`
- `src/env.d.ts`

Each app’s UI uses:
- shared `@suite/ui`
- its matching domain package (`@suite/domain-calendar`, etc.)
- React 19 + Vite

### App API starters
Each API app now has a real Hono starter:
- `src/index.ts`
- `tsconfig.json`
- package scripts for `dev`, `deploy`, and `typecheck`

Each API currently exposes:
- `GET /api/health`
- `GET /api/overview`

Current API starter packages:
- `apps/calendar/api`
- `apps/tasks/api`
- `apps/drive/api`

## 5) Important cleanup already completed

- Deleted the legacy `packages/ui-kit` directory.
- Deleted the stale placeholder app files from the first scaffold:
  - `apps/calendar/src/index.ts`
  - `apps/tasks/src/index.ts`
  - `apps/drive/src/index.ts`
  - `apps/calendar/web/src/main.ts`
  - `apps/tasks/web/src/main.ts`
  - `apps/drive/web/src/main.ts`

This means the repo now uses the newer starter files only.

## 6) Known current caveats

- **Dependencies are not installed yet**
  - Many editor/type-check errors are expected until `pnpm install` runs.
  - Do not treat current unresolved imports as real design errors yet.

- **Starter code is intentionally minimal**
  - It is meant to prove structure first, not final feature behavior.

- **Nx wiring is still incomplete**
  - The root config exists, but project-level Nx config / generators may still need to be added later.

- **The planning docs are still useful**
  - The repo strategy in `.planning/` is extensive and should guide future implementation decisions.

## 7) Current product order

The active launch scope is:
- Calendar
- Tasks / project management
- Drive / file storage

This differs slightly from the earliest planning draft, which emphasized Calendar + Drive + Mail first. The current scaffold follows the user’s requested first three apps.

## 8) Suggested next steps

If continuing from here, the most useful next actions are:

1. Run `pnpm install`.
2. Add missing root/tooling packages as needed for the starter code to typecheck cleanly.
3. Add Nx project configs or generators so the repo graph becomes explicit.
4. Add real feature specs under each app’s `specs/` folder.
5. Replace the starter overview endpoints with actual feature contracts.
6. Build out shared packages next in priority order:
   - `db`
   - `auth`
   - `env-config`
   - `api-clients`
   - `eslint-config`
   - `tsconfig`

## 9) Working rules to preserve

- Keep shared UI in `packages/ui`.
- Keep domain logic isolated per domain package.
- Keep API routes thin.
- Keep the monorepo simple until the first packages stabilize.
- Prefer workspace-local imports over published dependencies for repo code.
- Consult `.planning/` before changing architecture.

## 10) Quick mental model

- **Apps** = deployable surfaces.
- **API packages** = thin orchestration layer.
- **Web packages** = UI shells and app entry points.
- **Shared packages** = reusable cross-cutting concerns.
- **Domain packages** = business logic boundaries.

## 11) Session start checklist

When you begin a new session, check:
- What changed in root config?
- Are `packages/ui` and the domain packages still the canonical names?
- Do the app starters still point at the correct package imports?
- Has `pnpm install` been run yet?
- Are there any leftover placeholder files or stale imports?

## 12) Session end checklist

Before ending a session, prefer to leave:
- No accidental placeholder files.
- No stale legacy naming references.
- A clearly documented next step.
- A concise update in this file if the repo structure changes materially.

## 13) Current execution focus

- The active worklist now lives in `TODO.md` at the repo root.
- The document is intentionally structured for SDD, DDD, TDD, BDD, and deep-module execution.
- Current priority order in `TODO.md` is:
  1. `CORE-01`
  2. `CAL-01`
  3. `CAL-02`
  4. `TASK-01`
  5. `TASK-02`
  6. `DRIVE-01`
  7. `DRIVE-02`
  8. `QA-01`
- The MVP target is to keep Calendar, Tasks, and Drive feature-rich enough to test and reuse as a baseline, without adding folders, collaboration, or other scope-heavy platform work too early.
- When resuming, start from the smallest blocked item that unlocks the next dependent slice.
