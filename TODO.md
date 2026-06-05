# TODO.md — Suite Testing & Quality Worklist

This document tracks the remaining work to make the monorepo’s testing model explicit, reliable, and high quality. The focus is now on test placement, isolation, contract alignment, accessibility-aware verification, and CI guardrails.

## Quality bar

- Domain tests are deterministic and isolated.
- API tests verify contract behavior at the boundary.
- Web tests cover critical user flows, keyboard access, and dialog semantics.
- Test environments are intentional: Node for domain/API, jsdom or browser for UI.
- Shared helpers live in a shared package only when reused across multiple bounded contexts.
- CI uses targeted affected tests first, then full validation gates.

## Working rules

- **SDD**
  - Start with a test plan or spec before adding behavior.
  - Any new test environment must be documented before use.

- **DDD**
  - Domain rules stay in `packages/domain-*`.
  - Test helpers stay local unless they are clearly shared across contexts.

- **TDD**
  - Fix isolation and contract drift before broadening coverage.
  - Prefer one behavior slice per test file.

- **BDD**
  - Every parent task includes Given/When/Then scenarios.
  - Acceptance criteria must be manually verifiable.

- **Deep modules**
  - Suggested locations:
    - `packages/domain-*/src/**/*.test.ts`
    - `apps/*/api/src/**/*.test.ts`
    - `apps/*/web/src/**/*.test.tsx`
    - `packages/testing/` only if shared utilities become necessary

- **General rules**
  - Default to colocated tests.
  - Never rely on hidden `globalThis` state for resets.
  - Keep route handlers thin.
  - Use `workspace:` if a shared testing package is introduced.
  - Treat accessibility as part of quality, not a separate afterthought.

## Task list

### [x] TEST-01 [status: completed] Define the repo testing architecture and ownership model

- **Related file paths**
  - `vitest.config.ts`
  - `packages/*/package.json`
  - `apps/*/package.json`
  - `.devin/rules/testing-strategy.md`

- **Definition of done**
  - The repo has a written decision on where tests live and whether `packages/testing` is needed.
  - Node and browser test environments are separated intentionally.
  - Package test scripts are standardized enough for targeted runs.

- **BDD scenarios**
  - Given a new package, when I add tests, then the location and command are obvious.
  - Given a UI test, when it runs, then it uses the correct DOM environment.

- **Rules to follow**
  - Prefer colocated tests.
  - Introduce `packages/testing` only for real reuse.
  - Keep root config minimal; put package-specific config close to the package.

- **Validation commands**
  - `pnpm test`
  - `pnpm typecheck`
  - `nx affected -t test`

- **Subtasks**
  - [x] TEST-01.1 Inventory current test locations and document the ownership matrix.
  - [x] TEST-01.2 Decide whether reusable helpers belong in `packages/testing` or stay local.
  - [x] TEST-01.3 Split Node and browser Vitest setup if UI tests need a different environment.

### [x] TEST-02 [status: completed] Make in-memory domain state deterministic and testable

- **Related file paths**
  - `packages/domain-calendar/src/**`
  - `packages/domain-tasks/src/**`
  - `packages/domain-drive/src/**`

- **Definition of done**
  - Each domain package exposes explicit reset or factory behavior for tests.
  - No test depends on execution order or hidden singleton state.
  - Domain suites pass alone and together with the same result.

- **BDD scenarios**
  - Given any domain test file, when it runs in isolation, then it produces the same result as when it runs in the full suite.
  - Given a test reset, when state is cleared, then no leaked records remain in the next assertion.

- **Rules to follow**
  - Do not depend on undeclared `globalThis` stores.
  - Prefer explicit repository factories or reset helpers.
  - Keep mutable state inside the owning module boundary.

- **Validation commands**
  - `pnpm --filter @suite/domain-calendar test`
  - `pnpm --filter @suite/domain-tasks test`
  - `pnpm --filter @suite/domain-drive test`

- **Subtasks**
  - [x] TEST-02.1 Calendar: expose deterministic state reset for event tests.
  - [x] TEST-02.2 Tasks: remove order dependence from list and mutation tests.
  - [x] TEST-02.3 Drive: make uploads, rename, delete, and query tests isolated.

### [x] TEST-03 [status: completed] Align domain and API contracts for validation, status codes, and error semantics

- **Related file paths**
  - `packages/domain-calendar/src/**`
  - `packages/domain-tasks/src/**`
  - `packages/domain-drive/src/**`
  - `apps/calendar/api/src/**`
  - `apps/tasks/api/src/**`
  - `apps/drive/api/src/**`

- **Definition of done**
  - Validation rules match the intended behavior for trimming, required fields, numeric bounds, and conflicts.
  - Error codes and messages are stable enough for assertions and API mapping.
  - Missing or empty identifiers use one documented status policy across the stack.
  - API response payload shapes are consistent and intentional.

- **BDD scenarios**
  - Given an invalid request payload, when the API receives it, then it returns the chosen client error with a stable error shape.
  - Given a non-existent resource id, when the route handles it, then the status code matches the documented contract.
  - Given a conflict, when the domain rejects it, then the API translates the error consistently.

- **Rules to follow**
  - Domain owns invariants; API owns request parsing and error translation.
  - Avoid message-string-only assertions where an error code exists.
  - Keep route handlers thin and avoid duplicating business rules in UI code.

- **Validation commands**
  - `pnpm --filter @suite/calendar-api test`
  - `pnpm --filter @suite/tasks-api test`
  - `pnpm --filter @suite/drive-api test`

- **Subtasks**
  - [x] TEST-03.1 Calendar: settle empty-id and conflict behavior with matching tests.
  - [x] TEST-03.2 Tasks: align not-found, archive, and completion error handling.
  - [x] TEST-03.3 Drive: align name trimming, size validation, and missing-id responses.

### [x] TEST-04 [status: completed] Add browser-level smoke and component tests for the web apps

- **Related file paths**
  - `apps/calendar/web/src/**`
  - `apps/tasks/web/src/**`
  - `apps/drive/web/src/**`

- **Definition of done**
  - Critical create/edit/upload flows have component or smoke coverage.
  - Keyboard-only interaction paths are verified.
  - Dialogs, status messages, and error states are covered.
  - Accessibility expectations are explicit for interactive controls.

- **BDD scenarios**
  - Given a keyboard-only user, when they complete a create flow, then they can reach every action without a mouse.
  - Given a modal dialog, when it opens, then it has a proper title, focus behavior, and escape handling.
  - Given a validation failure, when the form re-renders, then the error is announced or visible.

- **Rules to follow**
  - Use the appropriate DOM/browser environment for React tests.
  - Keep UI tests close to the feature they protect.
  - Include accessibility assertions for labels, dialogs, and live updates.

- **Validation commands**
  - `pnpm --filter @suite/calendar-web typecheck`
  - `pnpm --filter @suite/tasks-web typecheck`
  - `pnpm --filter @suite/drive-web typecheck`
  - `pnpm --filter @suite/calendar-web test`
  - `pnpm --filter @suite/tasks-web test`
  - `pnpm --filter @suite/drive-web test`

- **Subtasks**
  - [x] TEST-04.1 Calendar: cover event form create/edit happy paths and failures.
  - [x] TEST-04.2 Tasks: cover task create and state-change interactions.
  - [x] TEST-04.3 Drive: cover upload, rename, delete dialogs, and a11y checks.

### [ ] TEST-05 [status: pending] Establish affected-test CI, command conventions, and coverage guardrails

- **Related file paths**
  - `package.json`
  - `nx.json`
  - `pnpm-workspace.yaml`
  - any CI workflow or build config files that run validation

- **Definition of done**
  - Package-level test commands are documented and predictable.
  - Affected testing is the default CI entry point for PRs.
  - Coverage expectations exist for the critical domain and API paths.
  - Full workspace validation remains available as a gate, not a daily tax.

- **BDD scenarios**
  - Given a change in one package, when CI runs, then only affected tests run first.
  - Given a release candidate, when full validation runs, then the workspace passes the required checks.
  - Given a new package, when it is added to the workspace, then the validation command convention is obvious.

- **Rules to follow**
  - Use `nx affected -t test` for PR-oriented validation.
  - Keep package scripts aligned with workspace expectations.
  - Do not hide failures behind overly broad root commands.

- **Validation commands**
  - `nx affected -t test`
  - `pnpm test`
  - `pnpm typecheck`
  - `nx graph --affected`

- **Subtasks**
  - [ ] TEST-05.1 Document the canonical local and CI test commands.
  - [ ] TEST-05.2 Add or refine coverage thresholds for critical paths.
  - [ ] TEST-05.3 Ensure CI can run affected tests without requiring full-workspace execution.

### [ ] DOC-01 [status: pending] Update repo guidance and handoff docs to match the real testing model

- **Related file paths**
  - `.devin/rules/testing-strategy.md`
  - `MEMORY.md`
  - `README.md`
  - `TODO.md`

- **Definition of done**
  - Stale statements about having no tests are removed.
  - The repo documents where tests live, how they are reset, and how they are run.
  - New contributors can find the testing model without tribal knowledge.

- **BDD scenarios**
  - Given a new contributor, when they open the docs, then they can locate the correct test file convention and run command.
  - Given a failing test suite, when they read the guidance, then they can identify whether it is a Node, browser, or contract issue.

- **Rules to follow**
  - Keep guidance aligned with the actual workspace shape.
  - Document decisions rather than assumptions.
  - Update handoff notes whenever the test model changes.

- **Validation commands**
  - `pnpm test`
  - `pnpm typecheck`

- **Subtasks**
  - [ ] DOC-01.1 Rewrite the stale testing strategy guidance so it matches the repo reality.
  - [ ] DOC-01.2 Add a concise testing overview to the handoff notes.
  - [ ] DOC-01.3 Record where shared helpers belong if `packages/testing` is introduced.

### [ ] QA-01 [status: pending] Re-run the full targeted validation matrix and lock the baseline

- **Related file paths**
  - `packages/domain-calendar/src/**`
  - `packages/domain-tasks/src/**`
  - `packages/domain-drive/src/**`
  - `apps/*/api/src/**`
  - `apps/*/web/src/**`
  - `vitest.config.ts`

- **Definition of done**
  - The targeted domain, API, and UI test suites pass.
  - The root typecheck passes.
  - No flaky or state-leaking suite remains.
  - The baseline is documented so future work can compare against it.

- **BDD scenarios**
  - Given the current MVP work, when I run the validation matrix, then I get a clean pass or a clearly scoped failure list.
  - Given a future change, when I compare against the baseline, then regressions are obvious.

- **Rules to follow**
  - Validate the smallest meaningful set first.
  - Fix determinism before broadening coverage.
  - Do not accept green typecheck as a substitute for passing tests.

- **Validation commands**
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm --filter @suite/domain-calendar test`
  - `pnpm --filter @suite/domain-tasks test`
  - `pnpm --filter @suite/domain-drive test`
  - `pnpm --filter @suite/calendar-api test`
  - `pnpm --filter @suite/tasks-api test`
  - `pnpm --filter @suite/drive-api test`

- **Subtasks**
  - [ ] QA-01.1 Run the full targeted validation matrix after TEST-02 and TEST-03.
  - [ ] QA-01.2 Capture any remaining mismatches as explicit follow-up tasks.
  - [ ] QA-01.3 Record the final pass/fail baseline in the handoff notes.

## Priority order

1. TEST-01
2. TEST-02
3. TEST-03
4. TEST-04
5. TEST-05
6. DOC-01
7. QA-01

## Editing notes

- Keep tasks small.
- Split any task that introduces a new test environment.
- Update this document whenever the testing model changes.
