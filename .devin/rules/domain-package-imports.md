---
trigger: glob
globs: packages/domain-*/**/*.ts
---

# Domain Package Import Boundaries

Domain packages (`packages/domain-*`) represent bounded contexts and must maintain strict isolation to prevent tight coupling.

## Forbidden Imports

- **Never import from another domain package.** `packages/domain-calendar` may NOT import from `packages/domain-tasks`, `packages/domain-drive`, or any other `packages/domain-*`.
- Use HTTP calls (Cloudflare Service Bindings) for cross-domain communication instead of direct imports.

## Allowed Imports

- Import from shared packages in `packages/` (e.g., `@suite/auth`, `@suite/crypto`, `@suite/db`)
- Import from external npm packages
- Import from TypeScript standard library

## Enforcement

This rule is enforced by:
- ESLint rules configured in the monorepo
- TypeScript project references for type safety
- CI pipeline that fails on illegal dependencies

## Rationale

Based on 2026 monorepo best practices, clear module boundaries prevent:
- Tight coupling between domains
- Circular dependencies
- Difficulty in testing domains in isolation
- "God packages" that all others depend on

Each domain should have a stable, minimal public API. The more you expose, the harder it becomes to change later.
