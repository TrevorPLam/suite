# Testing Commands — Suite Monorepo

This document defines the canonical test commands for local development and CI validation.

## Local Development Commands

### Workspace-Wide Commands

```bash
# Run all tests in watch mode (development)
pnpm test

# Run all tests once (CI-friendly)
pnpm test:run

# Run all tests with coverage
pnpm test:coverage

# Run only affected tests (based on git changes)
pnpm test:affected

# Run affected tests with coverage
pnpm test:affected:coverage

# Type check the entire workspace
pnpm typecheck

# Lint the entire workspace
pnpm lint
```

### Per-Package Commands

```bash
# Domain packages
pnpm --filter @suite/domain-calendar test
pnpm --filter @suite/domain-calendar test:run
pnpm --filter @suite/domain-calendar test:coverage

pnpm --filter @suite/domain-tasks test
pnpm --filter @suite/domain-tasks test:run
pnpm --filter @suite/domain-tasks test:coverage

pnpm --filter @suite/domain-drive test
pnpm --filter @suite/domain-drive test:run
pnpm --filter @suite/domain-drive test:coverage

# API packages
pnpm --filter @suite/calendar-api test
pnpm --filter @suite/calendar-api test:run
pnpm --filter @suite/calendar-api test:coverage

pnpm --filter @suite/tasks-api test
pnpm --filter @suite/tasks-api test:run
pnpm --filter @suite/tasks-api test:coverage

pnpm --filter @suite/drive-api test
pnpm --filter @suite/drive-api test:run
pnpm --filter @suite/drive-api test:coverage

# Web packages
pnpm --filter @suite/calendar-web test
pnpm --filter @suite/calendar-web test:run
pnpm --filter @suite/calendar-web test:coverage

pnpm --filter @suite/tasks-web test
pnpm --filter @suite/tasks-web test:run
pnpm --filter @suite/tasks-web test:coverage

pnpm --filter @suite/drive-web test
pnpm --filter @suite/drive-web test:run
pnpm --filter @suite/drive-web test:coverage
```

### Nx Commands

```bash
# Run tests for affected projects
nx affected -t test

# Run typecheck for affected projects
nx affected -t typecheck

# Run lint for affected projects
nx affected -t lint

# Visualize the project graph (affected projects only)
nx graph --affected

# Visualize the full project graph
nx graph
```

## CI Commands

### PR Validation (Fast)

```bash
# Run affected tests only
pnpm ci:test

# Equivalent to:
nx affected -t test
nx affected -t typecheck
```

### Main Branch Validation (Full)

```bash
# Run full validation suite
pnpm ci:validate

# Equivalent to:
pnpm test:run
pnpm typecheck
```

### Coverage Reporting

```bash
# Run coverage for all packages
pnpm ci:coverage

# Equivalent to:
pnpm test:coverage
```

## Coverage Thresholds

Coverage is enforced at the following thresholds:

- **Domain packages** (90%): `packages/domain-calendar`, `packages/domain-tasks`, `packages/domain-drive`
  - Business logic requires high coverage to ensure invariants are protected

- **API packages** (80%): `apps/*/api`
  - Contract validation and error handling need strong coverage

- **Web packages** (70%): `apps/*/web`
  - Component tests are integration-level; lower threshold reflects this

- **Shared packages** (70%): `packages/ui`, `packages/auth`, `packages/db`
  - Infrastructure code with varying complexity

If coverage falls below the threshold, the build will fail.

## Test Environments

- **Node environment**: Domain packages and API packages
  - Root `vitest.config.ts` covers `packages/**/*.test.ts` and `apps/*/api/**/*.test.ts`

- **Browser environment (happy-dom)**: Web packages and UI package
  - Per-package `vitest.config.ts` in `apps/*/web` and `packages/ui`

## Troubleshooting

### Tests pass locally but fail in CI

1. Check Node.js version (CI uses LTS)
2. Ensure dependencies are installed: `pnpm install --frozen-lockfile`
3. Verify `pnpm test:run` (not `pnpm test` which uses watch mode)

### Coverage threshold failures

1. Run `pnpm test:coverage` locally to see detailed report
2. Check HTML coverage report in `coverage/index.html`
3. Identify uncovered files and add tests for critical paths
4. If threshold is too strict for MVP, adjust in `vitest.config.ts`

### Affected tests not running

1. Ensure you're on a git branch with commits
2. Check that changes are committed: `git status`
3. Verify Nx project graph is up to date: `nx graph --affected`

### Web tests fail with DOM errors

1. Verify `happy-dom` is installed: `pnpm list happy-dom`
2. Check `vitest.config.ts` has `environment: 'happy-dom'`
3. Ensure `test-setup.ts` imports jest-dom matchers

## Script Naming Convention

All packages should follow this script naming:

- `test` - Run tests in watch mode (development)
- `test:run` - Run tests once (CI-friendly)
- `test:coverage` - Run tests with coverage (enforces thresholds)
- `typecheck` - TypeScript type checking
- `lint` - Linting (if configured)
