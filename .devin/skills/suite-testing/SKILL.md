---
name: suite-testing
description: Guides testing work in the Suite monorepo, including colocated Vitest tests, Node API tests, happy-dom web tests, and domain reset patterns
---

# Suite Testing

Use this skill when adding, fixing, or expanding tests in the Suite monorepo.

## Core Model

- Keep tests colocated with the code they exercise.
- Use Node for domain and API tests.
- Use `happy-dom` for web component tests.
- Prefer explicit reset helpers over hidden shared state.

## What to Test

- Domain behavior and edge cases.
- API request parsing and status mapping.
- Component interaction and accessibility behavior.
- State reset and conflict rules.

## Test Design Rules

- Assert on behavior, not implementation details.
- Cover success, validation, and conflict/error paths.
- Use table-driven cases when rules are repetitive.
- Keep fixtures small and local to the owning package.

## Implementation Checklist

1. Identify the owning package or app.
2. Choose the correct test environment.
3. Add or update reset helpers if state is mutable.
4. Write focused tests that match the current API or domain contract.
5. Run the affected test target and typecheck.

## Good Targets

- `packages/domain-*`
- `apps/*/api`
- `apps/*/web`
- `packages/ui`
