---
trigger: model_decision
description: Testing strategy and framework setup for the Suite monorepo
---

# Testing Strategy Rules

## Current State Assessment

The repository has an active Vitest-based test suite. Tests are colocated with the code they exercise and should stay close to the owning bounded context.

- **Framework**: Vitest v2.1.8 at the workspace root, with package-level configs where needed.
- **Domain tests**: Node environment.
- **API tests**: Node environment, using in-process requests against Hono apps.
- **Web tests**: `happy-dom` for React component tests in `apps/*/web` and `packages/ui`.

## Test Ownership Matrix

| Package / App | Test Location | Environment | Notes |
|---|---|---|---|
| `packages/domain-calendar` | `src/**/*.test.ts` | Node | In-memory calendar logic and conflict detection |
| `packages/domain-tasks` | `src/**/*.test.ts` | Node | In-memory task logic |
| `packages/domain-drive` | `src/**/*.test.ts` | Node | In-memory drive logic |
| `apps/calendar/api` | `src/**/*.test.ts` | Node | Hono API routes |
| `apps/tasks/api` | `src/**/*.test.ts` | Node | Hono API routes |
| `apps/drive/api` | `src/**/*.test.ts` | Node | Hono API routes |
| `apps/calendar/web` | `src/**/*.test.tsx` | `happy-dom` | React component and interaction tests |
| `apps/tasks/web` | `src/**/*.test.tsx` | `happy-dom` | React component and interaction tests |
| `apps/drive/web` | `src/**/*.test.tsx` | `happy-dom` | React component and interaction tests |
| `packages/ui` | `src/**/*.test.tsx` | `happy-dom` | Shared UI primitives when needed |

## Architecture Decisions

### 1. Test Placement

- **Colocation is the default**. Tests live next to the code they protect.
- Suggested patterns:
  - `packages/domain-*/src/**/*.test.ts`
  - `apps/*/api/src/**/*.test.ts`
  - `apps/*/web/src/**/*.test.tsx`
  - `packages/ui/src/**/*.test.tsx`

### 2. Shared Testing Package

- **No `packages/testing` exists yet**.
- Introduce it **only when** reusable helpers or factories are needed by **two or more** bounded contexts.
- Current helpers (reset, factories, builders) are small enough to stay local to each domain package.

### 3. Environment Split

- **Node environment** (`vitest.config.ts` at repo root):
  - Covers `packages/**/*.test.ts` and `apps/*/api/**/*.test.ts`.
  - Used for domain logic and API route tests.
- **Browser environment** (per-package `vitest.config.ts`):
  - Each web app owns its own `vitest.config.ts` with `environment: 'happy-dom'`.
  - `packages/ui` will get its own config when component tests are added.
- This prevents web tests from accidentally running under Node when invoked from the root.

### 4. Reset and Isolation Rules

- Do not rely on undeclared `globalThis` state for resets.
- Expose explicit `reset*` or factory functions from the owning domain package.
- Reset in-memory repositories in `beforeEach`.
- Keep stable IDs deterministic in tests where possible.

## Validation Commands

```bash
# Run all package tests
pnpm test

# Run a specific package
pnpm --filter @suite/domain-calendar test
pnpm --filter @suite/calendar-api test
pnpm --filter @suite/calendar-web test

# Type check the workspace
pnpm typecheck

# Nx affected tests (for CI)
nx affected -t test
```

## Testing Best Practices

### Domain Tests

- Test both happy paths and error paths.
- Assert on error **codes**, not just message strings.
- Prefer table-driven cases for validation and conflict rules.

### API Tests

- Use the Hono `app.request()` helper for in-process HTTP testing.
- Keep route handlers thin; test request parsing, status mapping, and delegation.
- Verify that domain errors are translated into the correct HTTP status and response shape.

### Web Tests ( upcoming in TEST-04 )

- Use `@testing-library/react` for component tests.
- Verify keyboard-only interactions and dialog semantics.
- Assert accessibility attributes (`role`, `aria-label`, `aria-describedby`, `aria-live`).
- Prefer user-visible assertions over implementation details.

## CI / Affected Testing

- `nx affected -t test` is the default PR entry point.
- Full workspace validation (`pnpm test && pnpm typecheck`) is the release gate.
- Nx `namedInputs` already exclude `**/*.test.ts` and `specs/**` from the `production` input set.
