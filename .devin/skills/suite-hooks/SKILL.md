---
name: suite-hooks
description: Guides the creation of custom React hooks for Suite apps using TanStack Query, local server-state conventions, and domain-specific data access patterns
---

# Suite Hooks

Use this skill when creating hooks for fetching or mutating app data in the Suite web apps.

## Core Rules

- Use TanStack Query for server state.
- Keep fetching and mutation logic out of components.
- Build hooks around a single feature or domain concern.
- Prefer stable query keys and explicit invalidation.

## Data Access Guidance

- Wrap API access in a dedicated hook or small client helper.
- Do not mix UI state and server state in the same hook.
- Keep hook return values small and predictable.
- Surface loading, error, and refetch state clearly.

## Implementation Checklist

1. Define the query key family.
2. Choose the fetch or mutation boundary.
3. Add invalidation or optimistic updates if needed.
4. Keep hook inputs typed and minimal.
5. Add tests for important cache or mutation behavior.

## Good Targets

- Event lists
- Task lists
- Drive file listings
- Filters
- Selection state tied to server data
