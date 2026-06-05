# TODO.md — Suite MVP Delivery

This document defines the remaining work to turn Calendar, Tasks, and Drive into solid MVPs without overbuilding. The goal is to keep the first release feature-rich enough to test, learn from, and reuse as a baseline for future apps.

## MVP bar

- **Calendar**
  - Create, edit, delete, and browse events.
  - Day and week views.
  - Simple conflict checks and filtering/search by title.
  - Minimal reminders or notifications only if they do not expand scope.

- **Tasks**
  - Create, complete, edit, archive, and delete tasks.
  - Active/completed views and lightweight filters.
  - Due date and priority metadata if it stays simple.

- **Drive**
  - Upload, list, rename, delete, and download file records.
  - Simple metadata and browsing.
  - No folder trees, sharing, OCR, or chunked uploads in MVP.

## Working rules

- **SDD**
  - Every new behavior starts in `apps/<app>/specs/`.
  - Code follows the spec, not the other way around.

- **DDD**
  - Business rules live in `packages/domain-*`.
  - API routes orchestrate only validation, auth, and domain calls.
  - UI code should not own business rules.

- **TDD**
  - Add domain and API tests before broadening the implementation.
  - Prefer targeted tests for a single use case over broad suite runs.

- **BDD**
  - Every parent task must include user-visible scenarios in Given/When/Then form.
  - Acceptance criteria should be written so a human can verify them manually.

- **Deep modules**
  - Keep behavior split by bounded context and layer.
  - Suggested module layout:
    - `apps/<app>/specs/` for behavior specs
    - `apps/<app>/api/src/routes/` for route adapters
    - `apps/<app>/web/src/features/` for UI slices
    - `packages/domain-*/src/lib/` for pure domain logic
    - `packages/db/src/` and `packages/auth/src/` for infrastructure adapters

- **General rules**
  - Keep parent tasks small.
  - Do not import across domain boundaries.
  - Keep public exports narrow and explicit.
  - Keep route handlers thin.
  - Prefer `workspace:*` for local package dependencies.

## Task list

### [x] CORE-01 [status: completed] Standardize shared scripts and baseline infrastructure for targeted validation

- **Related file paths**
  - `package.json`
  - `pnpm-workspace.yaml`
  - `nx.json`
  - `tsconfig.base.json`
  - `packages/*/package.json`
  - `packages/*/project.json`
  - `packages/db/src/*`
  - `packages/auth/src/*`
  - `packages/env-config/src/*`

- **Definition of done**
  - Shared and domain packages expose consistent scripts for local validation.
  - The workspace graph remains clean and predictable.
  - Minimal data-access and identity boundaries exist for the app MVPs to depend on.
  - Targeted validation commands can run without guesswork.

- **BDD scenarios**
  - Given a single package change, when I run a targeted validation command, then only that package and its direct dependency chain need to be checked.
  - Given a shared package update, when I inspect the workspace graph, then the affected apps are visible and traceable.

- **Out of scope**
  - Full auth product flows.
  - Zero-knowledge encryption implementation.
  - Billing, usage metering, or advanced observability.

- **Rules to follow**
  - Keep package entrypoints at `src/index.ts`.
  - Keep adapters separate from domain logic.
  - Preserve strict TypeScript settings and exact optional property behavior.

- **Advanced coding pattern**
  - Use adapter/port boundaries for persistence and identity.
  - Use a single public entrypoint per package.
  - Keep workspace config declarative and minimal.

- **Anti-patterns**
  - Root-level business logic.
  - Mega-utils shared across unrelated apps.
  - Cross-domain imports between `packages/domain-*`.
  - Route handlers that directly own persistence logic.

- **Imports/exports**
  - Import local packages via `workspace:*`.
  - Export only the public API from each package `src/index.ts`.
  - Avoid deep imports from package internals outside the owning module.

- **Depends on**
  - Current workspace scaffold.
  - Existing `pnpm install` and typecheck stability.

- **Blocks**
  - CAL-01
  - CAL-02
  - TASK-01
  - TASK-02
  - DRIVE-01
  - DRIVE-02
  - QA-01

- **Validation commands**
  - `pnpm typecheck`
  - `pnpm graph`
  - `pnpm --filter @suite/calendar-api typecheck`
  - `pnpm --filter @suite/tasks-api typecheck`
  - `pnpm --filter @suite/drive-api typecheck`

- **Subtasks**
  - [x] CORE-01.1 [file: packages/*/package.json] Add consistent `typecheck`, `test`, and `lint` scripts to workspace packages that own source so the next tasks can use targeted package commands instead of whole-repo commands.
    - Validate with: `pnpm typecheck` and `pnpm graph`
  - [x] CORE-01.2 [file: packages/db/src/*, packages/auth/src/*, packages/env-config/src/*] Add the smallest useful persistence, identity, and env contracts needed by the app MVPs; keep them adapter-only and avoid pushing domain rules into these packages.
    - Validate with: `pnpm --filter @suite/calendar-api typecheck`
  - [x] CORE-01.3 [file: nx.json, packages/*/project.json] Keep Nx metadata aligned with workspace package boundaries and update tags/source roots only where they materially improve project graph clarity.
    - Validate with: `pnpm graph`

### [ ] CAL-01 [status: pending] Calendar event creation should persist and support updates

- **Related file paths**
  - `apps/calendar/specs/create-event.spec.md`
  - `packages/domain-calendar/src/index.ts`
  - `packages/domain-calendar/src/lib/*`
  - `apps/calendar/api/src/index.ts`
  - `apps/calendar/api/src/routes/*`
  - `apps/calendar/web/src/App.tsx`
  - `apps/calendar/web/src/features/*`

- **Definition of done**
  - Event creation writes to a real persistence boundary, not a stub.
  - Event updates are supported with validation and stable IDs.
  - The API returns clear failure responses for invalid or conflicting events.
  - The web app can create and edit an event end to end.

- **BDD scenarios**
  - Given a valid title and time range, when I submit the event form, then the API returns a created event with a stable ID.
  - Given a conflicting event range, when I try to save it, then the API rejects the request with a clear validation message.
  - Given an existing event, when I edit and resubmit it, then the updated values persist and re-render.

- **Out of scope**
  - Recurrence rules.
  - Attendees and invites.
  - Booking pages.
  - ICS export.
  - Advanced timezone UI.

- **Rules to follow**
  - Keep validation at the API boundary.
  - Keep domain logic pure and deterministic.
  - Use small vertical slices over a deep folder hierarchy.
  - Preserve the spec-first contract when changing data shapes.

- **Advanced coding pattern**
  - Command-style mutation functions in the domain package.
  - Repository port for event storage.
  - Thin route adapter that transforms request payloads into domain commands.

- **Anti-patterns**
  - Event rules living only in React components.
  - Shared date logic duplicated in multiple files.
  - Hidden coupling between UI state and persistence logic.

- **Imports/exports**
  - Import `@suite/domain-calendar` only from the calendar app surfaces.
  - Export `CalendarEvent`, `CreateCalendarEventInput`, and future mutation/query functions from `packages/domain-calendar/src/index.ts`.
  - Keep route modules exporting only the Hono app by default.

- **Depends on**
  - CORE-01
  - Existing create-event spec

- **Blocks**
  - CAL-02

- **Validation commands**
  - `pnpm --filter @suite/calendar-api typecheck`
  - `pnpm --filter @suite/calendar-web typecheck`
  - `pnpm --filter @suite/calendar-api dev`
  - `pnpm --filter @suite/calendar-web dev`

- **Subtasks**
  - [ ] CAL-01.1 [file: packages/domain-calendar/src/lib/*, packages/domain-calendar/src/index.ts] Add the persistence-facing event mutation and query primitives needed to save and retrieve event records without introducing recurrence or collaboration.
    - Validate with: `pnpm --filter @suite/calendar-api typecheck`
  - [ ] CAL-01.2 [file: apps/calendar/api/src/index.ts, apps/calendar/api/src/routes/*] Add event edit/update request handling so the API can validate payloads and call the domain mutation without route-level business logic.
    - Validate with: `pnpm --filter @suite/calendar-api typecheck`
  - [ ] CAL-01.3 [file: apps/calendar/web/src/App.tsx, apps/calendar/web/src/features/*] Extend the calendar form flow to support editing an existing event and rendering clear server-side validation errors.
    - Validate with: `pnpm --filter @suite/calendar-web typecheck`

### [ ] CAL-02 [status: pending] Calendar browsing should show useful day and week views

- **Related file paths**
  - `apps/calendar/specs/create-event.spec.md`
  - `packages/domain-calendar/src/index.ts`
  - `packages/domain-calendar/src/lib/*`
  - `apps/calendar/api/src/index.ts`
  - `apps/calendar/web/src/App.tsx`
  - `apps/calendar/web/src/features/*`
  - `apps/calendar/web/src/components/*`

- **Definition of done**
  - Calendar events can be listed by date range.
  - Day and week views are available in the web app.
  - Empty, loading, and error states are clearly handled.
  - The user can browse the calendar without leaving the app shell.

- **BDD scenarios**
  - Given events on multiple days, when I switch the calendar view, then only the relevant events are shown.
  - Given no events for a selected range, when I open the view, then I see an empty state instead of a broken layout.

- **Out of scope**
  - Month grid drag-and-drop.
  - Full calendar sharing.
  - Real-time collaborative editing.
  - Recurrence exceptions.

- **Rules to follow**
  - Keep query logic separate from mutation logic.
  - Keep view components dumb and reusable.
  - Keep state changes local to the smallest feature slice.

- **Advanced coding pattern**
  - Query/command split in the domain layer.
  - Derived view models for day/week presentation.
  - Feature folder per screen or interaction slice.

- **Anti-patterns**
  - Rendering raw API payloads directly in the page shell.
  - Building a monolithic calendar component.
  - Mixing filtering logic into the domain mutation path.

- **Imports/exports**
  - Import calendar query helpers from `@suite/domain-calendar` only.
  - Export view helpers or hooks from `apps/calendar/web/src/features/*` instead of deep component trees.
  - Keep public module boundaries explicit.

- **Depends on**
  - CORE-01
  - CAL-01

- **Blocks**
  - None

- **Validation commands**
  - `pnpm --filter @suite/calendar-web typecheck`
  - `pnpm --filter @suite/calendar-web dev`
  - `pnpm --filter @suite/calendar-api typecheck`

- **Subtasks**
  - [ ] CAL-02.1 [file: packages/domain-calendar/src/lib/*, packages/domain-calendar/src/index.ts] Add a list/query API for events that supports date-range filtering and returns data ready for day/week views.
    - Validate with: `pnpm --filter @suite/calendar-api typecheck`
  - [ ] CAL-02.2 [file: apps/calendar/web/src/features/*, apps/calendar/web/src/App.tsx] Replace the single form-centric screen with a browseable day/week view and a small filter bar.
    - Validate with: `pnpm --filter @suite/calendar-web typecheck`
  - [ ] CAL-02.3 [file: apps/calendar/web/src/components/*] Add reusable empty-state, error-state, and event-row components so the view stays easy to extend.
    - Validate with: `pnpm --filter @suite/calendar-web typecheck`

### [ ] TASK-01 [status: pending] Tasks should persist creation and completion state

- **Related file paths**
  - `apps/tasks/specs/create-task.spec.md`
  - `packages/domain-tasks/src/index.ts`
  - `packages/domain-tasks/src/lib/*`
  - `apps/tasks/api/src/index.ts`
  - `apps/tasks/web/src/App.tsx`
  - `apps/tasks/web/src/features/*`

- **Definition of done**
  - Task creation persists to the domain storage boundary.
  - Completion state can be toggled and stored reliably.
  - The API returns a stable task record for the UI.
  - The web app reflects created and completed tasks without a full refresh.

- **BDD scenarios**
  - Given a new task title, when I submit the form, then I get a saved task back.
  - Given a task marked incomplete, when I toggle completion, then the completed state persists.

- **Out of scope**
  - Subtasks.
  - Assignments and mentions.
  - Comments.
  - Dependency graphs.
  - Kanban boards.

- **Rules to follow**
  - Keep task state transitions explicit.
  - Preserve exact optional property semantics.
  - Keep all domain invariants in `packages/domain-tasks`.

- **Advanced coding pattern**
  - State transition functions for completion/archiving.
  - Repository abstraction for task persistence.
  - Thin API adapter for mutation endpoints.

- **Anti-patterns**
  - Boolean flags scattered across UI components.
  - Hidden task rules in event handlers.
  - Cross-domain helper reuse that blurs boundaries.

- **Imports/exports**
  - Import `@suite/domain-tasks` only from the tasks app surfaces.
  - Export `TaskItem`, `CreateTaskInput`, and future mutation/query helpers from the domain package entrypoint.
  - Keep route modules exporting only the Hono app by default.

- **Depends on**
  - CORE-01
  - Existing create-task spec

- **Blocks**
  - TASK-02

- **Validation commands**
  - `pnpm --filter @suite/tasks-api typecheck`
  - `pnpm --filter @suite/tasks-web typecheck`
  - `pnpm --filter @suite/tasks-api dev`
  - `pnpm --filter @suite/tasks-web dev`

- **Subtasks**
  - [ ] TASK-01.1 [file: packages/domain-tasks/src/lib/*, packages/domain-tasks/src/index.ts] Add task persistence and completion mutation primitives that preserve the current create flow while enabling state transitions.
    - Validate with: `pnpm --filter @suite/tasks-api typecheck`
  - [ ] TASK-01.2 [file: apps/tasks/api/src/index.ts, apps/tasks/api/src/routes/*] Add completion update handling so the API can mutate task state without moving business logic into the route layer.
    - Validate with: `pnpm --filter @suite/tasks-api typecheck`
  - [ ] TASK-01.3 [file: apps/tasks/web/src/App.tsx, apps/tasks/web/src/features/*] Extend the task form/surface to reflect saved completion state and show actionable errors when mutations fail.
    - Validate with: `pnpm --filter @suite/tasks-web typecheck`

### [ ] TASK-02 [status: pending] Tasks should support editing, archiving, and practical filters

- **Related file paths**
  - `apps/tasks/specs/create-task.spec.md`
  - `packages/domain-tasks/src/index.ts`
  - `packages/domain-tasks/src/lib/*`
  - `apps/tasks/api/src/index.ts`
  - `apps/tasks/web/src/App.tsx`
  - `apps/tasks/web/src/features/*`
  - `apps/tasks/web/src/components/*`

- **Definition of done**
  - Tasks can be edited, archived, and deleted if needed.
  - The web app can filter by active/completed/archived state.
  - Due date or priority metadata is available only if it stays simple.
  - Empty states and filters feel intentional, not bolted on.

- **BDD scenarios**
  - Given completed tasks, when I switch to the completed filter, then only completed items are visible.
  - Given an archived task, when I open the active filter, then the task is hidden from the default list.

- **Out of scope**
  - Subtasks and nested tasks.
  - Collaboration or assignment.
  - Recurring tasks.
  - Complex workflow automations.

- **Rules to follow**
  - Keep filters derived from task state, not duplicated state.
  - Keep editing a task a small mutation with a clear contract.
  - Reuse shared UI primitives instead of inventing one-off controls.

- **Advanced coding pattern**
  - Query selector functions for filter views.
  - Small view-model adapters for task rows and filter chips.
  - Command/query separation in the domain package.

- **Anti-patterns**
  - Duplicating active/completed logic in multiple React components.
  - Overusing local component state for persistent task data.
  - Mixing archive semantics with delete semantics.

- **Imports/exports**
  - Keep imports from `@suite/domain-tasks` explicit and minimal.
  - Export query helpers like `listTasks` and `filterTasks` from the domain entrypoint when they are added.
  - Export UI feature slices from `apps/tasks/web/src/features/*`.

- **Depends on**
  - CORE-01
  - TASK-01

- **Blocks**
  - None

- **Validation commands**
  - `pnpm --filter @suite/tasks-web typecheck`
  - `pnpm --filter @suite/tasks-web dev`
  - `pnpm --filter @suite/tasks-api typecheck`

- **Subtasks**
  - [ ] TASK-02.1 [file: packages/domain-tasks/src/lib/*, packages/domain-tasks/src/index.ts] Add list/query helpers that can support active/completed/archived filters without introducing board or dependency complexity.
    - Validate with: `pnpm --filter @suite/tasks-api typecheck`
  - [ ] TASK-02.2 [file: apps/tasks/web/src/features/*, apps/tasks/web/src/App.tsx] Add filter chips or tabs and render a task list view that updates without reloading the page.
    - Validate with: `pnpm --filter @suite/tasks-web typecheck`
  - [ ] TASK-02.3 [file: apps/tasks/web/src/components/*] Add reusable task-row and empty-state components so editing and filtering stay modular.
    - Validate with: `pnpm --filter @suite/tasks-web typecheck`

### [ ] DRIVE-01 [status: pending] Drive should persist uploads and expose a browsable file list

- **Related file paths**
  - `apps/drive/specs/upload-file.spec.md`
  - `packages/domain-drive/src/index.ts`
  - `packages/domain-drive/src/lib/*`
  - `apps/drive/api/src/index.ts`
  - `apps/drive/web/src/App.tsx`
  - `apps/drive/web/src/features/*`

- **Definition of done**
  - Uploads create file records in a real storage boundary.
  - The app can list uploaded files.
  - The UI shows file metadata after upload.
  - Validation errors are surfaced clearly for bad file data.

- **BDD scenarios**
  - Given a valid file name and size, when I submit the upload form, then the file appears in the list.
  - Given invalid metadata, when I submit the form, then the API rejects it with a helpful message.

- **Out of scope**
  - Chunked uploads.
  - Folders.
  - Sharing.
  - OCR.
  - Virus scanning.
  - Rich previews.

- **Rules to follow**
  - Keep file metadata validation at the API edge.
  - Keep file storage behind a domain/infrastructure boundary.
  - Prefer simple records over binary processing in the first MVP.

- **Advanced coding pattern**
  - Storage adapter pattern for upload/list operations.
  - Mutation + query split for file metadata.
  - Feature module per browse/upload interaction.

- **Anti-patterns**
  - Upload logic living in React state handlers.
  - File storage rules scattered across route and UI files.
  - Premature chunking or streaming abstractions.

- **Imports/exports**
  - Import `@suite/domain-drive` only from the drive app surfaces.
  - Export `DriveFile`, `UploadDriveFileInput`, and future list/mutation helpers from the domain entrypoint.
  - Keep Hono handlers as default app exports only.

- **Depends on**
  - CORE-01
  - Existing upload-file spec

- **Blocks**
  - DRIVE-02

- **Validation commands**
  - `pnpm --filter @suite/drive-api typecheck`
  - `pnpm --filter @suite/drive-web typecheck`
  - `pnpm --filter @suite/drive-api dev`
  - `pnpm --filter @suite/drive-web dev`

- **Subtasks**
  - [ ] DRIVE-01.1 [file: packages/domain-drive/src/lib/*, packages/domain-drive/src/index.ts] Add file persistence and list helpers so uploaded file records can be saved and queried without introducing folders or sharing.
    - Validate with: `pnpm --filter @suite/drive-api typecheck`
  - [ ] DRIVE-01.2 [file: apps/drive/api/src/index.ts, apps/drive/api/src/routes/*] Add file listing support to the API so the upload response and browse response share the same domain shape.
    - Validate with: `pnpm --filter @suite/drive-api typecheck`
  - [ ] DRIVE-01.3 [file: apps/drive/web/src/App.tsx, apps/drive/web/src/features/*] Extend the upload screen into a browsable file list that shows the uploaded metadata immediately after a successful mutation.
    - Validate with: `pnpm --filter @suite/drive-web typecheck`

### [ ] DRIVE-02 [status: pending] Drive should support rename, delete, and useful file metadata actions

- **Related file paths**
  - `apps/drive/specs/upload-file.spec.md`
  - `packages/domain-drive/src/index.ts`
  - `packages/domain-drive/src/lib/*`
  - `apps/drive/api/src/index.ts`
  - `apps/drive/web/src/App.tsx`
  - `apps/drive/web/src/features/*`
  - `apps/drive/web/src/components/*`

- **Definition of done**
  - Files can be renamed and deleted through the same baseline workflow.
  - The UI exposes file metadata in a readable list or details pane.
  - Simple download or open links are available if they do not require a larger storage redesign.
  - Error states are clear and recoverable.

- **BDD scenarios**
  - Given an uploaded file, when I rename it, then the list updates with the new name.
  - Given a file I no longer need, when I delete it, then it disappears from the file list.

- **Out of scope**
  - Folder hierarchies.
  - Shared links and permissions.
  - Collaborative editing.
  - Preview generation.
  - Media processing pipelines.

- **Rules to follow**
  - Keep rename and delete as separate commands.
  - Keep metadata transformations explicit and testable.
  - Keep file actions inside the drive bounded context.

- **Advanced coding pattern**
  - Small command handlers per file action.
  - View-model adapter for file metadata rows.
  - Repository port for mutable file records.

- **Anti-patterns**
  - Treating file actions as one big mutable blob.
  - Reaching into storage details from the UI.
  - Mixing folder-like behavior into the first MVP.

- **Imports/exports**
  - Keep imports from `@suite/domain-drive` explicit and limited to the drive app.
  - Export file query/mutation helpers from `packages/domain-drive/src/index.ts`.
  - Keep reusable UI widgets in `apps/drive/web/src/components/*`.

- **Depends on**
  - CORE-01
  - DRIVE-01

- **Blocks**
  - None

- **Validation commands**
  - `pnpm --filter @suite/drive-web typecheck`
  - `pnpm --filter @suite/drive-web dev`
  - `pnpm --filter @suite/drive-api typecheck`

- **Subtasks**
  - [ ] DRIVE-02.1 [file: packages/domain-drive/src/lib/*, packages/domain-drive/src/index.ts] Add rename and delete mutations so the file record lifecycle stays narrow and deterministic.
    - Validate with: `pnpm --filter @suite/drive-api typecheck`
  - [ ] DRIVE-02.2 [file: apps/drive/api/src/index.ts, apps/drive/api/src/routes/*] Add rename and delete routes that validate payloads and call the drive domain functions without route-level business logic.
    - Validate with: `pnpm --filter @suite/drive-api typecheck`
  - [ ] DRIVE-02.3 [file: apps/drive/web/src/features/*, apps/drive/web/src/components/*] Add file action controls and a details or metadata panel so users can manage the file list without leaving the screen.
    - Validate with: `pnpm --filter @suite/drive-web typecheck`

### [ ] QA-01 [status: pending] Add targeted tests and acceptance checks for the MVP slices

- **Related file paths**
  - `apps/calendar/specs/*.spec.md`
  - `apps/tasks/specs/*.spec.md`
  - `apps/drive/specs/*.spec.md`
  - `packages/domain-calendar/src/*`
  - `packages/domain-tasks/src/*`
  - `packages/domain-drive/src/*`
  - `apps/*/api/src/*`
  - `apps/*/web/src/*`

- **Definition of done**
  - Each mutation/query slice has at least one targeted domain test.
  - Each API contract has a narrow validation test or smoke check.
  - Each app has a manual acceptance path that can be verified quickly.
  - Test commands remain narrow and package-focused.

- **BDD scenarios**
  - Given a valid request, when I run the corresponding targeted test, then the contract behavior is proven without running the full repository.
  - Given a rejected payload, when the API test runs, then the failure path is explicit and stable.

- **Out of scope**
  - Huge snapshot suites.
  - Overly generic e2e coverage for every edge case.
  - Test-only abstractions that leak into production modules.

- **Rules to follow**
  - Write tests against the smallest stable module boundary.
  - Prefer one test file per behavior slice.
  - Keep fixtures local to the owning bounded context.

- **Advanced coding pattern**
  - Domain tests for pure business rules.
  - Thin API tests for request validation and adapter behavior.
  - Browser smoke tests for the end-to-end happy path.

- **Anti-patterns**
  - Full-suite runs for every tiny change.
  - Giant test helpers shared across all apps.
  - Snapshot-only coverage with no behavioral assertions.

- **Imports/exports**
  - Export only the behavior under test from each module.
  - Keep test helpers local to the module or app they support.
  - Avoid cross-app test dependencies.

- **Depends on**
  - CORE-01
  - CAL-01
  - CAL-02
  - TASK-01
  - TASK-02
  - DRIVE-01
  - DRIVE-02

- **Blocks**
  - None

- **Validation commands**
  - `pnpm --filter @suite/calendar-api typecheck`
  - `pnpm --filter @suite/tasks-api typecheck`
  - `pnpm --filter @suite/drive-api typecheck`
  - `pnpm --filter @suite/calendar-web typecheck`
  - `pnpm --filter @suite/tasks-web typecheck`
  - `pnpm --filter @suite/drive-web typecheck`

- **Subtasks**
  - [ ] QA-01.1 [file: packages/domain-calendar/src/*.test.ts, packages/domain-tasks/src/*.test.ts, packages/domain-drive/src/*.test.ts] Add targeted unit tests for the core domain mutation/query helpers, one behavior slice per file.
    - Validate with: `pnpm --filter @suite/calendar-api typecheck`
  - [ ] QA-01.2 [file: apps/*/api/src/*.test.ts] Add focused API tests for the create/update/list/delete routes so request validation stays narrow and explicit.
    - Validate with: `pnpm --filter @suite/tasks-api typecheck`
  - [ ] QA-01.3 [file: apps/*/web/src/*] Add a short manual acceptance checklist or browser smoke flow for each app so the MVP can be exercised without running the full suite.
    - Validate with: `pnpm --filter @suite/drive-web typecheck`

## Priority order

1. CORE-01
2. CAL-01
3. CAL-02
4. TASK-01
5. TASK-02
6. DRIVE-01
7. DRIVE-02
8. QA-01

## Editing notes

- Keep tasks small.
- Split any task that starts to feel like a project.
- Prefer one bounded context per parent task.
- Add new subtasks instead of inflating a parent task.
- Keep validation commands targeted and package-specific whenever possible.
