---
trigger: glob
globs: packages/domain-*/src/**/*.ts
---

# Suite Domain Package Rules

Use these rules when editing any `packages/domain-*` bounded context.

## Domain Model Rules

- Keep domain logic independent from other domain packages.
- Prefer pure functions and in-memory repositories where the feature is still being shaped.
- Expose explicit create/list/get/update primitives when the feature needs them.
- Keep IDs stable and deterministic for tests.
- Export reset helpers if tests need to clear in-memory state.

## Boundary Rules

- Do not import from other domain packages.
- Do not depend on web-only utilities or framework-specific code.
- Keep domain models and error types owned by the package itself.
- Keep persistence concerns isolated from route handlers.

## Testing Rules

- Colocate tests with the implementation.
- Reset mutable state in `beforeEach`.
- Assert on behavior and error codes.
- Cover both happy-path and conflict/validation paths.

## Change Discipline

- Keep changes focused on one bounded context at a time.
- Prefer small, incremental additions over wide refactors.
- When a shared abstraction is needed, promote it to `packages/shared-kernel` or another shared package deliberately.
