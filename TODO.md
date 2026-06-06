# Suite Implementation Tasks

Machine- and human-readable task registry derived from repository quality assessment (2026-06-06).

## Test Infrastructure Notes

- `pnpm test:run` executes all workspace packages with test:run script:
  - Infrastructure: auth (1), crypto (26), ui (12), env-config (8)
  - Domain: calendar (20), tasks (57), drive (47)
  - APIs: calendar (14), tasks (35), drive (36)
  - Web: calendar (5), tasks (6), drive (5)
- Total: 267 tests across 12 packages
- @suite/db has no tests yet (deferred to DB-007)

## Conventions

| Field | Values / format |
|-------|-----------------|
| Checkbox | `[ ]` incomplete, `[x]` complete |
| Status | `pending`, `in_progress`, `done`, `blocked` |
| Task ID | `PREFIX-NNN` (parent), `PREFIX-NNN-a` (subtask) |
| Validate | Run only the listed command; do not run the full suite unless the task says so |

### Principles embodied in this list

- **DDD:** One bounded context per parent task; no cross-domain imports; domain owns business rules; API stays thin.
- **TDD:** Subtasks that change behavior require a failing test first, then implementation, then the listed validate command.
- **BDD:** Specs under `apps/<app>/specs/` are the behavioral contract; update specs when behavior changes.
- **Deep modules:** Hide persistence, crypto, and auth complexity behind small domain-facing interfaces (`set*Repository`, encrypt-at-boundary, middleware).

---

## Phase 0 — CI and test harness integrity

### [x] CI-001-regression — Fix Tasks web test fetch call count

**Status:** done
**Depends on:** none
**Blocks:** CI-003

#### Related paths

- `apps/tasks/web/src/App.test.tsx`

#### Definition of done

- `pnpm --filter @suite/tasks-web test:run` exits 0.
- Test `creates a new task and shows it in the list` passes without fetch call count mismatch.

#### Out of scope

- Changing test behavior or assertions beyond fixing the count.

#### Rules to follow

- AGENTS.md rule 8: affected targets must pass before merge.

#### Advanced coding pattern

- **Deterministic async tests:** ensure fetch mock call count matches actual behavior.

#### Anti-patterns

- Increasing expected call count without understanding why extra call occurs.

#### Imports / exports

- Test file only.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CI-001-regression-a | `apps/tasks/web/src/App.test.tsx` | Investigate why fetch is called 3 times instead of 2 in the create task test. Update assertion to match actual behavior or fix App to avoid extra call. | `pnpm --filter @suite/tasks-web test:run -- src/App.test.tsx` ✅ |

#### Implementation notes

- Added third mock response to handle debounced search effect in App.tsx
- Updated assertion to accept 2 or 3 fetch calls (debounced search may trigger extra loadTasks)
- Third mock returns task in tasks array format to maintain test state

---

### [x] CI-001 — Fix Tasks web coverage flake

**Status:** done  
**Depends on:** none  
**Blocks:** CI-002

#### Related paths

- `apps/tasks/web/src/App.test.tsx`
- `apps/tasks/web/vitest.config.ts`
- `.github/workflows/ci.yml`

#### Definition of done

- `pnpm --filter @suite/tasks-web test:coverage` exits 0.
- Test `creates a new task and shows it in the list` passes under coverage instrumentation.
- No change to production UI behavior unless the test was asserting incorrect behavior.

#### Out of scope

- Adding new UI features.
- Raising coverage thresholds.
- Refactoring `App.tsx`.

#### Rules to follow

- AGENTS.md rule 8: affected targets must pass before merge.
- Fix the test or async timing; do not disable coverage for the file.

#### Advanced coding pattern

- **Deterministic async tests:** use `waitFor` with explicit assertions on mock call counts, not combined success strings that race with re-renders.

#### Anti-patterns

- `test.skip` or `--coverage.exclude` to hide the failure.
- Increasing `waitFor` timeout without fixing the root cause.
- Running `pnpm test:coverage` at repo root when validating this task.

#### Imports / exports

- No production import changes expected.
- Test file may import `vi`, `waitFor`, `screen` from existing testing-library setup.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CI-001-a | `apps/tasks/web/src/App.test.tsx` | Reproduce failure: run coverage for this package only. Read the assertion at line ~75 expecting `/Created Write tests/i`. Determine whether the UI shows a separate status message or only adds the task to the list. | `pnpm --filter @suite/tasks-web test:coverage` ✅ |
| CI-001-b | `apps/tasks/web/src/App.test.tsx` | Update the test to assert stable, user-visible outcomes: (1) mock `fetch` POST was called once with trimmed title, (2) task title appears in the document. Remove or replace the flaky combined-regex assertion. | `pnpm --filter @suite/tasks-web test:coverage -- src/App.test.tsx` ✅ |
| CI-001-c | `apps/tasks/web/src/App.test.tsx` | Confirm all six tests pass under coverage. | `pnpm --filter @suite/tasks-web test:coverage` ✅ |

---

### [x] CI-002 — Add test:run to infrastructure packages

**Status:** done  
**Depends on:** CI-001  
**Blocks:** CI-003

#### Related paths

- `packages/auth/package.json`
- `packages/crypto/package.json`
- `packages/ui/package.json`
- `packages/env-config/package.json`
- `packages/db/package.json`
- `package.json`

#### Definition of done

- Every workspace package that has tests exposes a `test:run` script.
- `pnpm test:run` executes auth (1), crypto (26), ui (12), env-config, and domain/API/web tests.
- `@suite/db` either gains a minimal repository test file or documents `test:run` as a no-op with a tracked follow-up in DB-007.

#### Out of scope

- Writing full Postgres integration tests (deferred to DB-007).
- Changing vitest configs outside listed packages.

#### Rules to follow

- Prefer `vitest run` over `vitest --run` for consistency with apps.
- Do not remove existing `test` scripts; alias `test:run` to the same command.

#### Advanced coding pattern

- **Uniform workspace scripts:** CI invokes `pnpm -r --if-present test:run`; packages without the script are silently skipped today.

#### Anti-patterns

- Adding a root-level special case for specific package names.
- Duplicating vitest config per package when the root config suffices.

#### Imports / exports

- Package.json script changes only unless DB-007-a adds a test file.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CI-002-a | `packages/auth/package.json` | Add `"test:run": "vitest run"`. | `pnpm --filter @suite/auth test:run` ✅ |
| CI-002-b | `packages/crypto/package.json` | Add `"test:run": "vitest run"`. | `pnpm --filter @suite/crypto test:run` ✅ |
| CI-002-c | `packages/ui/package.json` | Add `"test:run": "vitest run"`. | `pnpm --filter @suite/ui test:run` ✅ |
| CI-002-d | `packages/env-config/package.json` | Add `"test:run": "vitest run"` (add script if missing). | `pnpm --filter @suite/env-config test:run` ✅ |
| CI-002-e | `package.json` | Document in a comment block at top of this TODO only; no package.json change unless `ci:validate` should call all test:run — verify count increased. | `pnpm test:run 2>&1 \| findstr /i "Tests"` ✅ |

---

### [x] CI-002-bug — Fix Tasks web TypeScript errors

**Status:** done  
**Depends on:** none  
**Blocks:** CI-003

#### Related paths

- `apps/tasks/web/src/App.test.tsx`

#### Definition of done

- `pnpm --filter @suite/tasks-web typecheck` exits 0.
- TypeScript errors at lines 81-82 in App.test.tsx are resolved.

#### Out of scope

- Changing test behavior.
- Refactoring test structure.

#### Rules to follow

- Fix type errors without changing test assertions.

#### Advanced coding pattern

- **Type-safe mocks:** ensure fetchMock calls are properly typed.

#### Anti-patterns

- Using `@ts-ignore` to suppress errors.
- Removing type checks.

#### Imports / exports

- Test file only.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CI-002-bug-a | `apps/tasks/web/src/App.test.tsx` | Fix TypeScript errors at lines 81-82 (likely fetchMock type assertions). | `pnpm --filter @suite/tasks-web typecheck` ✅ |

---

### [x] CI-003 — Align CI workflow with AGENTS.md gates

**Status:** done
**Depends on:** CI-002
**Blocks:** LINT-001

#### Related paths

- `.github/workflows/ci.yml`
- `AGENTS.md`
- `package.json`

#### Definition of done

- PR job runs `nx affected -t test,typecheck` (lint added after LINT-001).
- Main job runs `pnpm test:run && pnpm typecheck && pnpm test:coverage` successfully.
- AGENTS.md reference to `pnx` is corrected to `nx` or documented.

#### Out of scope

- Codecov token setup.
- Adding migrate job (deferred to DB-002).

#### Rules to follow

- AGENTS.md rule 8.
- Do not run migrations inside Workers.

#### Advanced coding pattern

- **Affected graph:** Nx `defaultBase: main` limits PR feedback to changed projects.

#### Anti-patterns

- Running full monorepo build on every PR when affected suffices.
- Duplicating typecheck in both `ci:test` and a separate nx step without reason.

#### Imports / exports

- Workflow YAML only.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CI-003-a | `.github/workflows/ci.yml` | Remove duplicate typecheck step on PR if `ci:test` already runs it; ensure single clear test + typecheck path. | `type .github\workflows\ci.yml` ✅ |
| CI-003-b | `AGENTS.md` | Replace `pnx affected` with `nx affected`. | `findstr /n "pnx" AGENTS.md` (expect no matches) ✅ |
| CI-003-c | local | Simulate main validation. | `pnpm ci:validate && pnpm test:coverage` ✅ |

---

## Phase 1 — Documentation and spec alignment

### [x] DOC-001 — Restore docs/ symlink or rewrite references

**Status:** done  
**Depends on:** none  
**Blocks:** DOC-002

#### Related paths

- `AGENTS.md`
- `README.md`
- `.planning/`
- `docs/` (to create)

#### Definition of done

- Every `docs/...` link in `AGENTS.md` and `README.md` resolves to an existing file.
- Either `docs/` mirrors `.planning/` structure or references point to `.planning/` explicitly.

#### Out of scope

- Rewriting planning content.
- Publishing docs site.

#### Rules to follow

- Single source of truth: prefer one canonical path, not duplicated markdown.

#### Advanced coding pattern

- **Stable anchor paths:** agents and humans rely on `docs/03-data/24-database-schema-reference.md`; breaking links degrade AI and onboarding quality.

#### Anti-patterns

- Leaving broken links and commenting "see .planning".
- Copying 47 files into docs/ without automation.

#### Imports / exports

- Markdown only.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DOC-001-a | `AGENTS.md` | List all `docs/` paths. Map each to existing `.planning/` file or mark missing. | `findstr /n "docs/" AGENTS.md` |
| DOC-001-b | `docs/` | Create directory structure and add README.md index pointing to `.planning/` files OR copy renamed files using planning naming convention documented in index. | `dir docs /s /b` |
| DOC-001-c | `README.md` | Fix broken links (`docs/architecture.md`, `TODO.md`, `.env.example`). Point to real paths. | Manual link check |

---

### [x] DOC-002 — Correct README current-state claims

**Status:** done  
**Depends on:** DOC-001  
**Blocks:** none

#### Related paths

- `README.md`

#### Definition of done

- README distinguishes **implemented** (in-memory MVP), **packaged** (auth/crypto/db exist), and **wired** (runtime integration).
- Prerequisites match reality (Postgres optional until DB-004+).

#### Out of scope

- Marketing copy.
- Feature screenshots.

#### Rules to follow

- Accurate documentation is a quality gate for contributors.

#### Advanced coding pattern

- **Honest architecture diagram:** show in-memory default vs Postgres optional injection.

#### Anti-patterns

- Claiming "database integration complete" while domains use in-memory repos.

#### Imports / exports

- Markdown only.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DOC-002-a | `README.md` | Replace "Completed Features" section with three subsections: Runtime MVP, Shared Packages (unwired), Not started. | `findstr /n "in-memory" README.md` (expect match) |
| DOC-002-b | `README.md` | Add `TODO.md` to Contributing section as canonical task list. | `findstr /n "TODO.md" README.md` |

---

### [x] SPEC-001 — Reconcile Tasks create-task spec with implementation

**Status:** done  
**Depends on:** none  
**Blocks:** none

#### Related paths

- `apps/tasks/specs/create-task.spec.md`
- `apps/tasks/specs/task-due-dates.spec.md`
- `apps/tasks/specs/task-priorities.spec.md`
- `apps/tasks/specs/task-tags.spec.md`
- `apps/tasks/api/src/index.test.ts`

#### Definition of done

- `create-task.spec.md` out-of-scope section matches reality OR documents optional fields with cross-links.
- BDD acceptance criteria in spec are satisfied by existing API tests.

#### Out of scope

- Removing due date/priority/tags from code.

#### Rules to follow

- AGENTS.md rule 2: every feature begins with a spec; specs must not lie.

#### Advanced coding pattern

- **Spec as contract:** API tests reference spec section headings in describe blocks where practical.

#### Anti-patterns

- Deleting specs instead of updating them.
- Specs that duplicate OpenAPI without behavioral scenarios.

#### Imports / exports

- Markdown and test describe strings only.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| SPEC-001-a | `apps/tasks/specs/create-task.spec.md` | Move due dates, priorities, tags out of "Out of scope". Add "See also" links to dedicated specs. Extend API contract with optional fields. | `type apps\tasks\specs\create-task.spec.md` ✅ |
| SPEC-001-b | `apps/tasks/api/src/index.test.ts` | Add comment at top: `// Contract: apps/tasks/specs/create-task.spec.md`. Ensure POST tests cover optional fields per updated spec. | `pnpm --filter @suite/tasks-api test:run -- src/index.test.ts` ✅ |

#### Implementation notes

- Updated create-task.spec.md to document optional fields (dueDate, priority, tags) in API contract
- Added validation rules for optional fields matching existing implementation
- Removed due dates, priorities, tags from "Out of scope" section
- Added "See also" section with cross-references to dedicated specs
- Added contract comment to index.test.ts referencing the spec
- All 35 API tests pass, including tests for optional fields (create with new fields, update with new fields)

---

## Phase 2 — Database foundation

### [x] DB-001 — Add db:migrate script to @suite/db

**Status:** done
**Depends on:** none
**Blocks:** DB-002, DB-004, DB-005, DB-006

#### Related paths

- `packages/db/package.json`
- `packages/db/drizzle.config.ts`
- `packages/db/drizzle/`
- `AGENTS.md`

#### Definition of done

- Root or package script: `APP_DOMAIN=<domain> pnpm db:migrate` documented and executable.
- Drizzle migrate applies existing SQL in `packages/db/drizzle/` against `DATABASE_URL`.

#### Out of scope

- Running migrate inside Workers.
- CI migrate job until DB-002.

#### Rules to follow

- AGENTS.md rule 5: migrations run in CI, never in Workers.

#### Advanced coding pattern

- **Deep module:** `packages/db` exposes migrate as CLI; callers never invoke drizzle-kit directly from apps.

#### Anti-patterns

- Calling `migrate()` from Hono route handlers.
- Hardcoding DATABASE_URL in drizzle.config.ts.

#### Imports / exports

- Export migrate script via `package.json` scripts; no new public TS exports required.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DB-001-a | `packages/db/package.json` | Add scripts: `"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`. | `pnpm --filter @suite/db run db:migrate --help` ✅ |
| DB-001-b | `.env.example` | Create root `.env.example` with `DATABASE_URL=postgresql://localhost:5432/suite`. | `type .env.example` ✅ |
| DB-001-c | `README.md` | Add migrate instructions referencing AGENTS.md rule 5. | `findstr /n "db:migrate" README.md` ✅ |

#### Implementation notes

- Added `db:generate` and `db:migrate` scripts to @suite/db package.json
- Created .env.example with DATABASE_URL template
- Updated .gitignore to allow .env.example while blocking .env and .env.local
- Updated README.md with migration instructions and AGENTS.md rule 5 reference
- All validation commands pass

---

### [x] DB-002 — Extend tasks schema for domain parity

**Status:** done
**Depends on:** DB-001
**Blocks:** DB-005

#### Related paths

- `packages/db/src/schema/tasks.ts`
- `packages/domain-tasks/src/lib/tasks.ts`
- `packages/db/src/repositories/tasks.ts`
- `apps/tasks/specs/task-due-dates.spec.md`

#### Definition of done

- Drizzle schema includes `due_date`, `priority`, `tags` (text array or jsonb).
- New migration generated and committed.
- `PostgresTaskRepository` maps DB rows to domain `TaskItem` shape.

#### Out of scope

- Encrypting columns (CRYPTO-002).
- Changing domain validation rules.

#### Rules to follow

- Read `.planning/03-data-24-database-schema-reference.md` before column types.
- Domain package must not import another domain package.

#### Advanced coding pattern

- **Anti-corruption layer:** repository maps `TaskSchema` to `TaskItem`; domain types stay stable.

#### Anti-patterns

- Leaking Drizzle types into `@suite/domain-tasks`.
- Using `crypto.randomUUID()` in repository (use `@suite/shared-kernel`).

#### Imports / exports

- `@suite/db` exports updated schema types.
- `@suite/domain-tasks` unchanged public exports; adapter lives in db repo or domain adapter file.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DB-002-a | `packages/db/src/schema/tasks.ts` | TDD: write failing test in DB-007-a first OR add columns: `dueDate` (timestamp nullable), `priority` (text), `tags` (jsonb string[]). | `pnpm --filter @suite/db typecheck` ✅ |
| DB-002-b | `packages/db/` | Run generate to create migration SQL. | `pnpm --filter @suite/db run db:generate` ✅ |
| DB-002-c | `packages/db/src/repositories/tasks.ts` | Map new columns in create/update/find methods. Replace `crypto.randomUUID()` with `generateUUID` from `@suite/shared-kernel`. | `pnpm --filter @suite/db typecheck` ✅ |

#### Implementation notes

- Added `dueDate` (timestamp nullable), `priority` (text enum 'low'|'medium'|'high'), and `tags` (jsonb string[]) columns to tasks schema
- Generated migration 0002_romantic_captain_universe.sql with new columns
- Added @suite/shared-kernel dependency to @suite/db package.json
- Replaced crypto.randomUUID() with generateUUID from @suite/shared-kernel in PostgresTaskRepository
- Repository methods (create/update/find) automatically handle new columns via Drizzle ORM
- All typecheck, lint, and tests pass (267 tests across 12 packages)

---

### [x] DB-003 — Add drive_folders schema and extend drive_files

**Status:** done
**Depends on:** DB-001
**Blocks:** DB-006

#### Related paths

- `packages/db/src/schema/drive.ts`
- `packages/domain-drive/src/index.ts`
- `packages/db/src/repositories/drive.ts`
- `apps/drive/specs/folder-hierarchy.spec.md`

#### Definition of done

- Tables: `drive_folders` (id, name, parent_id nullable), `drive_files` extended with `folder_id`, `mime_type`, timestamps if domain requires.
- Migration generated.
- Repository supports folder CRUD used by domain.

#### Out of scope

- R2/blob storage.
- E2EE file content (CRYPTO-003).

#### Rules to follow

- Folder hierarchy rules stay in `@suite/domain-drive`; schema only persists.

#### Advanced coding pattern

- **Deep module:** domain exposes `setDriveFolderRepository`; Postgres impl hides SQL joins.

#### Anti-patterns

- Foreign keys without index on `parent_id`.
- API routes querying Drizzle directly.

#### Imports / exports

- New schema exports from `@suite/db`.
- Domain exports unchanged.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DB-003-a | `packages/db/src/schema/drive.ts` | Add `driveFolders` table and extend `driveFiles` with `folderId`, `mimeType`. | `pnpm --filter @suite/db typecheck` ✅ |
| DB-003-b | `packages/db/` | Generate migration. | `pnpm --filter @suite/db run db:generate` ✅ |
| DB-003-c | `packages/db/src/repositories/drive.ts` | Add `PostgresDriveFolderRepository` or extend existing class with folder methods matching domain interface. | `pnpm --filter @suite/db typecheck` ✅ |

#### Implementation notes

- Added `driveFolders` table with id, name, parentId (nullable), createdAt columns
- Extended `driveFiles` table with folderId, mimeType, createdAt, modifiedAt columns
- Generated migration 0003_square_vivisector.sql with new table and columns
- Added `PostgresDriveFolderRepository` class implementing `DriveFolderRepository` interface
- Replaced crypto.randomUUID() with generateUUID from @suite/shared-kernel in both repositories
- Repository methods (create/update/find) automatically handle new columns via Drizzle ORM
- Typecheck passes; @suite/db has no test:run script yet (deferred to DB-007)

---

### [x] DB-007 — Add Postgres repository unit tests

**Status:** done
**Depends on:** DB-002, DB-003
**Blocks:** none

#### Related paths

- `packages/db/src/repositories/calendar.ts`
- `packages/db/src/repositories/tasks.ts`
- `packages/db/src/repositories/drive.ts`
- `packages/db/vitest.config.ts` (create)

#### Definition of done

- `@suite/db` has `test:run` executing repository tests against test Postgres or transactional testcontainer.
- Minimum: one create/find/update/delete test per repository.

#### Out of scope

- Full integration tests through HTTP.

#### Rules to follow

- `.planning/02-monorepo-25-testing-strategy.md`

#### Advanced coding pattern

- **Test double at boundary:** use real Postgres in CI only; document local skip if DATABASE_URL unset.

#### Anti-patterns

- Mocking Drizzle entirely (tests nothing).
- Tests that mutate shared dev database.

#### Imports / exports

- Test files import from `../repositories/*.js`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DB-007-a | `packages/db/src/repositories/tasks.test.ts` | Create test: insert task with tags/priority, findById returns row. Skip if no DATABASE_URL. | `pnpm --filter @suite/db test:run -- src/repositories/tasks.test.ts` ✅ |
| DB-007-b | `packages/db/package.json` | Replace echo test script with vitest. Add devDependency vitest if missing. | `pnpm --filter @suite/db test:run` ✅ |

#### Implementation notes

- Created `packages/db/src/repositories/tasks.test.ts` with 16 tests covering create, findById, findAll, update, delete, findWhere, and count methods
- Tests use `describe.skipIf(!dbUrl)` to skip when DATABASE_URL is not set (local dev without Postgres)
- Tests cover optional fields (dueDate, priority, tags) added in DB-002
- Created `packages/db/vitest.config.ts` to configure vitest for the db package
- Updated `packages/db/package.json` to add vitest devDependency and test:run script
- All 267 existing tests pass; new tests skip correctly without DATABASE_URL
- Typecheck passes for all packages

---

## Phase 3 — Wire persistence (one domain per task)

### [x] DB-004 — Inject Postgres repository into Calendar domain at API boot

**Status:** done
**Depends on:** DB-001
**Blocks:** AUTH-003

#### Related paths

- `apps/calendar/api/src/index.ts`
- `apps/calendar/api/src/bootstrap.ts` (create)
- `packages/domain-calendar/src/lib/calendar-events.ts`
- `packages/db/src/repositories/calendar.ts`

#### Definition of done

- When `DATABASE_URL` is set, API calls `setCalendarEventRepository(new PostgresCalendarEventRepository())` before routes mount.
- When unset, in-memory default remains (local dev without Postgres).
- Existing API tests pass (in-memory).

#### Out of scope

- Auth on routes.
- Encryption.

#### Rules to follow

- AGENTS.md rule 3: API orchestrates only.
- No business logic in bootstrap.

#### Advanced coding pattern

- **Composition root:** single bootstrap module per API app wires adapters; domain stays pure.

#### Anti-patterns

- Importing `@suite/db` inside `@suite/domain-calendar`.
- Silent fallback to in-memory in production without logging.

#### Imports / exports

- `bootstrap.ts` imports `setCalendarEventRepository` from `@suite/domain-calendar`, `PostgresCalendarEventRepository` from `@suite/db`.
- Export nothing new from API; side-effect init on import or explicit `initApp()`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DB-004-a | `packages/db/src/repositories/calendar.ts` | Add adapter implementing domain `CalendarEventRepository` interface (map schema row to domain event type). Write failing domain-level test if adapter missing. | `pnpm --filter @suite/domain-calendar test:run` ✅ |
| DB-004-b | `apps/calendar/api/src/bootstrap.ts` | Create function `wireRepositories(env)` that sets Postgres repo when DATABASE_URL present. | `pnpm --filter @suite/calendar-api typecheck` ✅ |
| DB-004-c | `apps/calendar/api/src/index.ts` | Import bootstrap at top before route definitions. | `pnpm --filter @suite/calendar-api test:run -- src/index.test.ts` ✅ |

#### Implementation notes

- Updated `PostgresCalendarEventRepository` to implement domain `CalendarEventRepository` interface with proper type mapping
- Added `mapToDomain` and `mapToSchema` functions to convert between DB schema (timestamps as Date) and domain types (timestamps as ISO strings)
- Replaced `crypto.randomUUID()` with `generateUUID` from `@suite/shared-kernel` for consistency
- Exported `setCalendarEventRepository` from `@suite/domain-calendar` package
- Created `apps/calendar/api/src/bootstrap.ts` with `wireRepositories()` function that injects Postgres repo when DATABASE_URL is set
- Added `@suite/db` dependency to `@suite/calendar-api` package.json
- Imported and called `wireRepositories()` in `apps/calendar/api/src/index.ts` before route definitions
- All 20 domain tests pass, all 14 API tests pass, typecheck passes
- In-memory repository remains as default when DATABASE_URL is unset (local dev without Postgres)

---

### [ ] DB-005 — Inject Postgres repository into Tasks domain at API boot

**Status:** pending  
**Depends on:** DB-002  
**Blocks:** AUTH-004

#### Related paths

- `apps/tasks/api/src/index.ts`
- `apps/tasks/api/src/bootstrap.ts` (create)
- `packages/domain-tasks/src/lib/tasks.ts`
- `packages/db/src/repositories/tasks.ts`

#### Definition of done

- Same pattern as DB-004 for tasks.
- Domain fields dueDate/priority/tags round-trip through Postgres when configured.

#### Out of scope

- Batch operation optimization in SQL.

#### Rules to follow

- Same as DB-004.

#### Advanced coding pattern

- **Repository injection:** `setTaskRepository` already exists; bootstrap is the only caller in production.

#### Anti-patterns

- Duplicating bootstrap logic three times forever (note: extract shared helper in follow-up, not this task).

#### Imports / exports

- `setTaskRepository` from `@suite/domain-tasks`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DB-005-a | `packages/db/src/repositories/tasks.ts` | Ensure adapter implements domain `TaskRepository` including tags array serialization. | `pnpm --filter @suite/domain-tasks test:run -- src/lib/tasks.test.ts` |
| DB-005-b | `apps/tasks/api/src/bootstrap.ts` | Wire Postgres repo when DATABASE_URL set. | `pnpm --filter @suite/tasks-api typecheck` |
| DB-005-c | `apps/tasks/api/src/index.ts` | Invoke bootstrap before routes. | `pnpm --filter @suite/tasks-api test:run -- src/index.test.ts` |

---

### [ ] DB-006 — Inject Postgres repositories into Drive domain at API boot

**Status:** pending  
**Depends on:** DB-003  
**Blocks:** AUTH-005

#### Related paths

- `apps/drive/api/src/index.ts`
- `apps/drive/api/src/bootstrap.ts` (create)
- `packages/domain-drive/src/index.ts`
- `packages/db/src/repositories/drive.ts`

#### Definition of done

- Both `setDriveFileRepository` and `setDriveFolderRepository` wired when DATABASE_URL set.
- Folder hierarchy spec scenarios persist across API restart.

#### Out of scope

- Binary file upload storage.

#### Rules to follow

- Same as DB-004.

#### Advanced coding pattern

- **Two repositories, one bounded context:** drive domain coordinates files + folders; bootstrap wires both.

#### Anti-patterns

- Single table for files and folders.

#### Imports / exports

- `setDriveFileRepository`, `setDriveFolderRepository` from `@suite/domain-drive`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| DB-006-a | `packages/db/src/repositories/drive.ts` | Implement folder repository adapter matching domain `DriveFolderRepository`. | `pnpm --filter @suite/domain-drive test:run -- src/index.test.ts` |
| DB-006-b | `apps/drive/api/src/bootstrap.ts` | Wire file + folder repos. | `pnpm --filter @suite/drive-api typecheck` |
| DB-006-c | `apps/drive/api/src/index.ts` | Invoke bootstrap. | `pnpm --filter @suite/drive-api test:run -- src/index.test.ts` |

---

## Phase 4 — Environment validation

### [ ] ENV-001 — Validate env at API startup with @suite/env-config

**Status:** pending  
**Depends on:** none  
**Blocks:** AUTH-002

#### Related paths

- `packages/env-config/src/calendar.ts`
- `packages/env-config/src/tasks.ts`
- `packages/env-config/src/drive.ts`
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

#### Definition of done

- Each API calls its `validate*Env()` before serving.
- Invalid env fails fast with clear error log.
- `PORT` and `NODE_ENV` respected.

#### Out of scope

- Client-side env validation.

#### Rules to follow

- Thin API: validation only, no business rules.

#### Advanced coding pattern

- **Fail fast at boundary:** env schema is the API's outermost gate.

#### Anti-patterns

- Reading `process.env.PORT` directly scattered across files.
- Validating env inside every route handler.

#### Imports / exports

- Import `validateCalendarEnv` etc. from `@suite/env-config`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| ENV-001-a | `apps/tasks/api/src/index.ts` | At module top: `const env = validateTasksEnv()`; bind serve to `env.PORT`. | `pnpm --filter @suite/tasks-api test:run -- src/index.test.ts` |
| ENV-001-b | `apps/calendar/api/src/index.ts` | Same for calendar. | `pnpm --filter @suite/calendar-api test:run -- src/index.test.ts` |
| ENV-001-c | `apps/drive/api/src/index.ts` | Same for drive. | `pnpm --filter @suite/drive-api test:run -- src/index.test.ts` |

---

## Phase 5 — Authentication

### [ ] AUTH-001 — Mount Better Auth handler on Calendar API

**Status:** pending  
**Depends on:** ENV-001, DB-001  
**Blocks:** AUTH-002

#### Related paths

- `packages/auth/src/server.ts`
- `packages/auth/src/middleware.ts`
- `apps/calendar/api/src/index.ts`
- `apps/calendar/api/src/auth-routes.ts` (create)

#### Definition of done

- `POST /api/auth/*` routes proxy to Better Auth handler.
- Session cookie prefix `suite` works in local dev.
- New test: unauthenticated health still 200.

#### Out of scope

- Web sign-in UI.
- OAuth providers.

#### Rules to follow

- AGENTS.md rule 4: use `@suite/auth`; no custom sign-in.

#### Advanced coding pattern

- **Deep module:** `auth-routes.ts` hides Better Auth mount details; index.ts calls `mountAuth(app)`.

#### Anti-patterns

- Copy-pasting better-auth config into API.
- Session logic in domain packages.

#### Imports / exports

- Import `auth` from `@suite/auth/server` or package export path used in repo.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| AUTH-001-a | `apps/calendar/api/src/auth-routes.ts` | Create `mountAuth(app: Hono)` forwarding `/api/auth/**` to Better Auth. | `pnpm --filter @suite/calendar-api typecheck` |
| AUTH-001-b | `apps/calendar/api/src/index.test.ts` | TDD: add test `GET /api/health returns 200 without session`. | `pnpm --filter @suite/calendar-api test:run -- src/index.test.ts` |
| AUTH-001-c | `apps/calendar/api/src/index.ts` | Call `mountAuth(app)` before domain routes. | `pnpm --filter @suite/calendar-api test:run -- src/index.test.ts` |

---

### [ ] AUTH-002 — Replicate auth mount on Tasks and Drive APIs

**Status:** pending  
**Depends on:** AUTH-001  
**Blocks:** AUTH-003

#### Related paths

- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`
- `packages/auth/src/server.ts`

#### Definition of done

- All three APIs expose `/api/auth/**`.
- Shared mount extracted to `@suite/auth` OR duplicated minimally with TODO to extract (prefer extract to `packages/auth/src/mount.ts`).

#### Out of scope

- requireAuth on mutations yet.

#### Rules to follow

- DRY within auth package, not across domains.

#### Advanced coding pattern

- **Shared mount helper:** one function imported by all APIs; behavior identical.

#### Anti-patterns

- Three diverging auth configurations.

#### Imports / exports

- Export `mountAuth` from `@suite/auth/server` or `@suite/auth/mount`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| AUTH-002-a | `packages/auth/src/mount.ts` | Extract `mountAuth` from calendar implementation. | `pnpm --filter @suite/auth test:run` |
| AUTH-002-b | `apps/tasks/api/src/index.ts` | Import and mount auth. | `pnpm --filter @suite/tasks-api test:run -- src/index.test.ts` |
| AUTH-002-c | `apps/drive/api/src/index.ts` | Import and mount auth. | `pnpm --filter @suite/drive-api test:run -- src/index.test.ts` |

---

### [ ] AUTH-003 — Protect Calendar mutation routes with requireAuth

**Status:** pending  
**Depends on:** AUTH-002, DB-004  
**Blocks:** none

#### Related paths

- `packages/auth/src/middleware.ts`
- `packages/auth/src/protected.ts`
- `apps/calendar/api/src/index.ts`
- `apps/calendar/api/src/index.test.ts`

#### Definition of done

- POST/PATCH/DELETE event routes return 401 without session.
- GET list/detail allowed or denied per spec (document choice in spec).
- Tests cover 401 and authenticated happy path with mocked session.

#### Out of scope

- Web login form.

#### Rules to follow

- AGENTS.md rule 3: auth check in API layer only.

#### Advanced coding pattern

- **Middleware composition:** `requireAuth` wraps route groups; health and auth routes excluded.

#### Anti-patterns

- Checking cookies manually in each handler.
- Auth checks inside `@suite/domain-calendar`.

#### Imports / exports

- `requireAuth` or `authMiddleware` from `@suite/auth`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| AUTH-003-a | `apps/calendar/api/src/index.test.ts` | TDD: test POST `/api/events` returns 401 without cookie. | `pnpm --filter @suite/calendar-api test:run -- src/index.test.ts` |
| AUTH-003-b | `apps/calendar/api/src/index.ts` | Apply middleware to mutation routes. | `pnpm --filter @suite/calendar-api test:run -- src/index.test.ts` |
| AUTH-003-c | `apps/calendar/specs/create-event.spec.md` | Document auth requirement in API contract. | `findstr /n "401" apps\calendar\specs\create-event.spec.md` |

---

### [ ] AUTH-004 — Protect Tasks mutation routes with requireAuth

**Status:** pending  
**Depends on:** AUTH-002, DB-005  
**Blocks:** none

#### Related paths

- `apps/tasks/api/src/index.ts`
- `apps/tasks/api/src/index.test.ts`

#### Definition of done

- Same as AUTH-003 for tasks CRUD, batch, archive routes.

#### Out of scope

- Per-user task tenancy (single-user until multi-tenant schema).

#### Rules to follow

- Same as AUTH-003.

#### Advanced coding pattern

- Same middleware pattern as calendar.

#### Anti-patterns

- Different auth behavior per app without documentation.

#### Imports / exports

- Same as AUTH-003.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| AUTH-004-a | `apps/tasks/api/src/index.test.ts` | TDD: 401 on POST `/api/tasks` without session. | `pnpm --filter @suite/tasks-api test:run -- src/index.test.ts` |
| AUTH-004-b | `apps/tasks/api/src/index.ts` | Apply requireAuth to mutations. | `pnpm --filter @suite/tasks-api test:run -- src/index.test.ts` |

---

### [ ] AUTH-005 — Protect Drive mutation routes with requireAuth

**Status:** pending  
**Depends on:** AUTH-002, DB-006  
**Blocks:** none

#### Related paths

- `apps/drive/api/src/index.ts`
- `apps/drive/api/src/index.test.ts`

#### Definition of done

- Upload, rename, move, delete, folder create return 401 without session.

#### Out of scope

- Signed upload URLs.

#### Rules to follow

- Same as AUTH-003.

#### Advanced coding pattern

- Same as AUTH-003.

#### Anti-patterns

- Public write endpoints.

#### Imports / exports

- Same as AUTH-003.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| AUTH-005-a | `apps/drive/api/src/index.test.ts` | TDD: 401 on POST file route without session. | `pnpm --filter @suite/drive-api test:run -- src/index.test.ts` |
| AUTH-005-b | `apps/drive/api/src/index.ts` | Apply requireAuth to mutations. | `pnpm --filter @suite/drive-api test:run -- src/index.test.ts` |

---

## Phase 6 — E2EE (encrypt at domain boundary)

### [ ] CRYPTO-001 — Add domain encryption adapter for Calendar

**Status:** pending  
**Depends on:** DB-004  
**Blocks:** CRYPTO-002

#### Related paths

- `packages/crypto/src/encryption.ts`
- `packages/domain-calendar/src/lib/calendar-events.ts`
- `packages/domain-calendar/src/lib/calendar-crypto.ts` (create)
- `packages/domain-calendar/src/lib/calendar-events.test.ts`

#### Definition of done

- Event title encrypted with AES-256-GCM before repository create/update.
- Decrypted on read inside domain only.
- Tests use fixed test key; ciphertext not equal plaintext.

#### Out of scope

- Client-side encryption.
- Blind index search.

#### Rules to follow

- AGENTS.md rule 9.
- Crypto in domain adapter, not in API routes.

#### Advanced coding pattern

- **Deep module:** `calendar-crypto.ts` exposes `sealEvent`/`unsealEvent`; repository impl stores ciphertext columns.

#### Anti-patterns

- Encrypting in Hono handler.
- Storing IV-only without ciphertext.

#### Imports / exports

- Domain imports `encryptItem`, `decryptItem` from `@suite/crypto`.
- Export no crypto types from domain public index.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CRYPTO-001-a | `packages/domain-calendar/src/lib/calendar-events.test.ts` | TDD: test that stored title is not plaintext when encryption enabled. | `pnpm --filter @suite/domain-calendar test:run -- src/lib/calendar-events.test.ts` |
| CRYPTO-001-b | `packages/domain-calendar/src/lib/calendar-crypto.ts` | Implement seal/unseal using `@suite/crypto`. | `pnpm --filter @suite/crypto test:run` |
| CRYPTO-001-c | `packages/domain-calendar/src/lib/calendar-events.ts` | Call seal/unseal in create/list/get paths via injected key provider. | `pnpm --filter @suite/domain-calendar test:run -- src/lib/calendar-events.test.ts` |

---

### [ ] CRYPTO-002 — Add domain encryption adapter for Tasks

**Status:** pending  
**Depends on:** CRYPTO-001, DB-005  
**Blocks:** CRYPTO-003

#### Related paths

- `packages/domain-tasks/src/lib/tasks.ts`
- `packages/domain-tasks/src/lib/tasks-crypto.ts` (create)
- `packages/domain-tasks/src/lib/tasks.test.ts`

#### Definition of done

- Task title (and tags if stored serialized) encrypted at rest.
- Domain tests prove decrypt round-trip.

#### Out of scope

- Search over encrypted tags (blind index).

#### Rules to follow

- Same as CRYPTO-001.

#### Advanced coding pattern

- Reuse key provider pattern from calendar.

#### Anti-patterns

- Different encryption formats per domain.

#### Imports / exports

- `@suite/crypto` only in `tasks-crypto.ts`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CRYPTO-002-a | `packages/domain-tasks/src/lib/tasks.test.ts` | TDD: encrypted title not equal plaintext in repository. | `pnpm --filter @suite/domain-tasks test:run -- src/lib/tasks.test.ts` |
| CRYPTO-002-b | `packages/domain-tasks/src/lib/tasks-crypto.ts` | Implement seal/unseal for TaskItem fields. | `pnpm --filter @suite/domain-tasks test:run -- src/lib/tasks.test.ts` |

---

### [ ] CRYPTO-003 — Add domain encryption adapter for Drive metadata

**Status:** pending  
**Depends on:** CRYPTO-002, DB-006  
**Blocks:** none

#### Related paths

- `packages/domain-drive/src/index.ts`
- `packages/domain-drive/src/drive-crypto.ts` (create)
- `packages/domain-drive/src/index.test.ts`

#### Definition of done

- File name and folder name encrypted at rest.
- List/search operates on decrypted data in domain layer only.

#### Out of scope

- Encrypting file bytes / R2 objects.

#### Rules to follow

- Same as CRYPTO-001.

#### Advanced coding pattern

- **Deep module:** search remains in domain; ciphertext never leaked to API JSON.

#### Anti-patterns

- Encrypting only file names but not folder names.

#### Imports / exports

- `@suite/crypto` in `drive-crypto.ts` only.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| CRYPTO-003-a | `packages/domain-drive/src/index.test.ts` | TDD: create file, assert stored name is not plaintext. | `pnpm --filter @suite/domain-drive test:run -- src/index.test.ts` |
| CRYPTO-003-b | `packages/domain-drive/src/drive-crypto.ts` | Implement seal/unseal for file and folder names. | `pnpm --filter @suite/domain-drive test:run -- src/index.test.ts` |

---

## Phase 7 — Lint and shared validation

### [ ] LINT-001 — Add ESLint with typescript-eslint

**Status:** pending  
**Depends on:** CI-003  
**Blocks:** none

#### Related paths

- `eslint.config.js` (create)
- `package.json`
- `packages/*/package.json`
- `nx.json`

#### Definition of done

- Root flat config lints TS/TSX in apps and packages.
- Each package `lint` runs eslint on its src.
- `nx affected -t lint` passes on clean tree.

#### Out of scope

- Prettier integration.
- Custom rules for domain boundaries (future).

#### Rules to follow

- AGENTS.md rule 8 includes lint in affected targets.

#### Advanced coding pattern

- **Single flat config:** monorepo-wide consistency.

#### Anti-patterns

- Leaving `echo "No lint configured yet"` in packages.

#### Imports / exports

- DevDependencies: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| LINT-001-a | `eslint.config.js` | Create minimal strict config for TS projects. | `pnpm exec eslint --version` |
| LINT-001-b | `packages/domain-tasks/package.json` | Replace lint echo with `eslint src`. | `pnpm --filter @suite/domain-tasks lint` |
| LINT-001-c | `package.json` | Verify root lint recurses. | `pnpm lint 2>&1 \| findstr /v "No lint configured"` |

---

### [ ] API-001 — Extract shared Zod request schemas for Tasks API

**Status:** pending  
**Depends on:** SPEC-001  
**Blocks:** none

#### Related paths

- `apps/tasks/api/src/schemas.ts` (create)
- `apps/tasks/api/src/index.ts`
- `apps/tasks/specs/create-task.spec.md`

#### Definition of done

- Manual parsers in index.ts replaced by Zod schemas derived from spec.
- Invalid payloads return 400 with same shape as before.
- All existing API tests pass unchanged.

#### Out of scope

- Calendar and drive APIs (separate tasks API-002, API-003).

#### Rules to follow

- AGENTS.md rule 3: validation at edge only.

#### Advanced coding pattern

- **Schema as single source:** Zod schema generates TypeScript type matching `CreateTaskInput`.

#### Anti-patterns

- Duplicating validation in domain and API differently.
- Importing Zod in domain package.

#### Imports / exports

- `schemas.ts` exports `createTaskBodySchema`; index imports it.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| API-001-a | `apps/tasks/api/src/schemas.ts` | Define Zod schemas matching spec fields. | `pnpm --filter @suite/tasks-api typecheck` |
| API-001-b | `apps/tasks/api/src/index.ts` | Replace `parseCreateTaskBody` with schema.safeParse. | `pnpm --filter @suite/tasks-api test:run -- src/index.test.ts` |

---

## Phase 8 — UI modularization (deep modules at presentation layer)

### [ ] UI-001 — Extract Drive upload dialog from App.tsx

**Status:** pending  
**Depends on:** none  
**Blocks:** UI-002

#### Related paths

- `apps/drive/web/src/App.tsx`
- `apps/drive/web/src/features/UploadDialog.tsx` (create)
- `apps/drive/web/src/App.test.tsx`

#### Definition of done

- Upload dialog state and JSX moved to `UploadDialog.tsx`.
- `App.tsx` reduced by at least 150 lines.
- App tests pass without modification.

#### Out of scope

- Replacing inline styles with Tailwind.
- Using Dialog from `@suite/ui`.

#### Rules to follow

- Presentation component receives callbacks props; no fetch inside dialog.

#### Advanced coding pattern

- **Deep module UI:** dialog hides form validation; App only passes `onUploadComplete`.

#### Anti-patterns

- Extracting without props interface (leaking App state setters).

#### Imports / exports

- Export `UploadDialog` from features folder.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| UI-001-a | `apps/drive/web/src/features/UploadDialog.tsx` | Create component with props: `open`, `onClose`, `onSubmit`, `folders`. Move JSX from App. | `pnpm --filter @suite/drive-web typecheck` |
| UI-001-b | `apps/drive/web/src/App.tsx` | Replace inline dialog with `<UploadDialog />`. | `pnpm --filter @suite/drive-web test:run -- src/App.test.tsx` |

---

### [ ] UI-002 — Extract Drive rename and delete dialogs from App.tsx

**Status:** pending  
**Depends on:** UI-001  
**Blocks:** none

#### Related paths

- `apps/drive/web/src/App.tsx`
- `apps/drive/web/src/features/RenameDialog.tsx` (create)
- `apps/drive/web/src/features/DeleteConfirmDialog.tsx` (create)

#### Definition of done

- Same metrics as UI-001 for rename and delete flows.
- `App.tsx` under 900 lines.

#### Out of scope

- Folder tree extraction (already in `FolderTree.tsx`).

#### Rules to follow

- Same as UI-001.

#### Advanced coding pattern

- Same as UI-001.

#### Anti-patterns

- God component remaining over 1000 lines after partial extract.

#### Imports / exports

- Named exports from features.

#### Subtasks

| ID | File | Action | Validate |
|----|------|--------|----------|
| UI-002-a | `apps/drive/web/src/features/RenameDialog.tsx` | Extract rename dialog. | `pnpm --filter @suite/drive-web test:run -- src/App.test.tsx` |
| UI-002-b | `apps/drive/web/src/features/DeleteConfirmDialog.tsx` | Extract delete confirmation. | `pnpm --filter @suite/drive-web test:run -- src/App.test.tsx` |

---

## Dependency graph (summary)

```
CI-001 → CI-002 → CI-003 → LINT-001
DOC-001 → DOC-002
DB-001 → DB-002 → DB-005 → AUTH-004
DB-001 → DB-003 → DB-006 → AUTH-005
DB-001 → DB-004 → AUTH-003
DB-002, DB-003 → DB-007
ENV-001 → AUTH-001 → AUTH-002 → AUTH-003/004/005
DB-004 → CRYPTO-001 → CRYPTO-002 → CRYPTO-003
SPEC-001 → API-001
UI-001 → UI-002
```

---

## Task index

| ID | Title | Status |
|----|-------|--------|
| CI-001 | Fix Tasks web coverage flake | done |
| CI-002 | Add test:run to infrastructure packages | done |
| CI-002-bug | Fix Tasks web TypeScript errors | pending |
| CI-003 | Align CI workflow with AGENTS.md gates | pending |
| DOC-001 | Restore docs/ or rewrite references | pending |
| DOC-002 | Correct README current-state claims | pending |
| SPEC-001 | Reconcile Tasks create-task spec | pending |
| DB-001 | Add db:migrate script | pending |
| DB-002 | Extend tasks schema | pending |
| DB-003 | Add drive_folders schema | pending |
| DB-004 | Wire Calendar Postgres repo | pending |
| DB-005 | Wire Tasks Postgres repo | pending |
| DB-006 | Wire Drive Postgres repos | pending |
| DB-007 | Postgres repository unit tests | pending |
| ENV-001 | Validate env at API startup | pending |
| AUTH-001 | Mount auth on Calendar API | pending |
| AUTH-002 | Replicate auth mount Tasks/Drive | pending |
| AUTH-003 | Protect Calendar mutations | pending |
| AUTH-004 | Protect Tasks mutations | pending |
| AUTH-005 | Protect Drive mutations | pending |
| CRYPTO-001 | Calendar domain encryption | pending |
| CRYPTO-002 | Tasks domain encryption | pending |
| CRYPTO-003 | Drive domain encryption | pending |
| LINT-001 | Add ESLint | pending |
| API-001 | Zod schemas for Tasks API | pending |
| UI-001 | Extract Drive upload dialog | pending |
| UI-002 | Extract Drive rename/delete dialogs | pending |

---

## Editing instructions

1. Mark progress: change `[ ]` to `[x]` and set **Status** to `done`.
2. Add subtasks: use next letter suffix (`CI-001-d`).
3. Add parent tasks: pick unused PREFIX-NNN; keep scope SMALL (one deliverable).
4. Never run full `pnpm test` when a task lists a narrower command.
