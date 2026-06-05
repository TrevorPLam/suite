---
trigger: model_decision
description: Testing strategy and framework setup for the Suite monorepo
---

# Testing Strategy Rules

## Current State Assessment

The repository has a complete Vitest-based test suite with CI integration and coverage enforcement. Tests are colocated with the code they exercise and stay close to the owning bounded context.

- **Framework**: Vitest v2.1.8 with per-package configurations
- **Domain tests**: Node environment with 90% coverage thresholds
- **API tests**: Node environment with 80% coverage thresholds
- **Web tests**: `happy-dom` for React component tests with 70% coverage thresholds
- **CI**: GitHub Actions workflow with PR checks (affected tests) and main branch validation (full tests + coverage)

## Test Ownership Matrix

| Package / App | Test Location | Environment | Coverage Threshold | Notes |
|---|---|---|---|---|
| `packages/domain-calendar` | `src/**/*.test.ts` | Node | 90% lines/functions, 85% branches | In-memory calendar logic and conflict detection |
| `packages/domain-tasks` | `src/**/*.test.ts` | Node | 90% lines/functions, 85% branches | In-memory task logic |
| `packages/domain-drive` | `src/**/*.test.ts` | Node | 90% lines/functions, 85% branches | In-memory drive logic |
| `apps/calendar/api` | `src/**/*.test.ts` | Node | 80% lines/functions, 75% branches | Hono API routes |
| `apps/tasks/api` | `src/**/*.test.ts` | Node | 80% lines/functions, 75% branches | Hono API routes |
| `apps/drive/api` | `src/**/*.test.ts` | Node | 80% lines/functions, 75% branches | Hono API routes |
| `apps/calendar/web` | `src/**/*.test.tsx` | `happy-dom` | 70% lines/functions, 65% branches | React component and interaction tests |
| `apps/tasks/web` | `src/**/*.test.tsx` | `happy-dom` | 70% lines/functions, 65% branches | React component and interaction tests |
| `apps/drive/web` | `src/**/*.test.tsx` | `happy-dom` | 70% lines/functions, 65% branches | React component and interaction tests |
| `packages/ui` | `src/**/*.test.tsx` | `happy-dom` | 70% lines/functions, 65% branches | Shared UI primitives when needed |

## Architecture Decisions

### 1. Test Placement

- **Colocation is the default**. Tests live next to the code they protect.
- Each package has its own `vitest.config.ts` for independent execution.
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

- **Node environment** (per-package `vitest.config.ts`):
  - Domain packages and API packages use Node environment
  - Each package has its own config for independent execution
- **Browser environment** (per-package `vitest.config.ts`):
  - Each web app owns its own `vitest.config.ts` with `environment: 'happy-dom'`
  - `packages/ui` will get its own config when component tests are added
- This separation ensures tests run in the correct environment regardless of invocation context

### 4. Reset and Isolation Rules

- Do not rely on undeclared `globalThis` state for resets.
- Expose explicit `reset*` or factory functions from the owning domain package.
- Reset in-memory repositories in `beforeEach`.
- Keep stable IDs deterministic in tests where possible.

### 5. Coverage Thresholds

- **Domain packages**: 90% lines/functions, 85% branches (business logic requires high coverage)
- **API packages**: 80% lines/functions, 75% branches (contract validation needs strong coverage)
- **Web packages**: 70% lines/functions, 65% branches (component tests are integration-level)
- Thresholds are enforced via Vitest configuration and will fail the build if not met

## Validation Commands

See `docs/testing-commands.md` for comprehensive command documentation.

```bash
# Workspace-wide commands
pnpm test              # Run all tests (watch mode)
pnpm test:run          # Run all tests once
pnpm test:coverage     # Run all tests with coverage
pnpm test:affected     # Run affected tests via Nx
pnpm typecheck         # Type check the workspace

# Per-package commands
pnpm --filter @suite/domain-calendar test
pnpm --filter @suite/domain-calendar test:coverage

# CI commands
pnpm ci:test           # Run affected tests + typecheck (PR validation)
pnpm ci:validate       # Run full test suite + typecheck (main branch)
pnpm ci:coverage       # Run coverage with thresholds
```

## Testing Best Practices

### Domain Tests

- Test both happy paths and error paths.
- Assert on error **codes**, not just message strings.
- Prefer table-driven cases for validation and conflict rules.
- Use explicit reset functions in `beforeEach` for isolation.

### API Tests

- Use the Hono `app.request()` helper for in-process HTTP testing.
- Keep route handlers thin; test request parsing, status mapping, and delegation.
- Verify that domain errors are translated into the correct HTTP status and response shape.
- Use domain reset functions for test isolation.

### Web Tests

- Use `@testing-library/react` for component tests.
- Verify keyboard-only interactions and dialog semantics.
- Assert accessibility attributes (`role`, `aria-label`, `aria-describedby`, `aria-live`).
- Prefer user-visible assertions over implementation details.
- Test server validation error states and loading states.

## CI / Affected Testing

- **PR checks**: Run `nx affected -t test` and `nx affected -t typecheck` (fast validation)
- **Main branch**: Run full `pnpm test:run`, `pnpm typecheck`, and `pnpm test:coverage` (complete validation)
- GitHub Actions workflow in `.github/workflows/ci.yml` implements this strategy
- Nx `namedInputs` exclude test files and specs from production builds
- Coverage thresholds are enforced on main branch only

## Script Naming Convention

All packages follow this script naming:
- `test` - Run tests in watch mode (development)
- `test:run` - Run tests once (CI-friendly)
- `test:coverage` - Run tests with coverage (enforces thresholds)
- `typecheck` - TypeScript type checking
- `lint` - Linting (if configured)
