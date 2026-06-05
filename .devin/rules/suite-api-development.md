---
trigger: glob
globs: apps/*/api/src/**/*.ts
---

# Suite API Development Rules

Use these rules when implementing or editing Hono API code for the Suite apps.

## API Shape

- Keep handlers thin.
- Validate input at the boundary.
- Call domain packages for business logic.
- Translate domain errors into stable HTTP statuses and response payloads.
- Avoid duplicating validation or state rules inside route handlers.

## Stack Expectations

- Use Hono for API routes.
- Keep code ESM-friendly and TypeScript-first.
- Use shared configuration from `packages/env-config` when needed.
- Prefer in-process tests with `app.request()` over network calls.

## Testing Expectations

- Test request parsing, status mapping, and response shape.
- Reset domain state with explicit public reset helpers.
- Verify error codes, not just human-readable messages.
- Keep API tests colocated with the route they exercise.

## Implementation Notes

- Do not add cross-domain imports.
- Do not move domain rules into the API layer.
- Keep auth and environment concerns isolated at the edge of the route.
