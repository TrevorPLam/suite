---
name: suite-zustand-store
description: Guides the creation of Zustand stores for Suite UI state such as shell state, modal state, selection state, and persisted preferences
---

# Suite Zustand Store

Use this skill when creating UI-only state that should not live in React component state.

## Core Rules

- Store UI state only.
- Do not put fetched server data into Zustand.
- Keep store shape small and explicit.
- Persist only user preferences that should survive reloads.

## Good Uses

- Sidebar open/close state
- Dialog and drawer state
- Selected item IDs
- View mode preferences
- Density and theme preferences

## Implementation Checklist

1. Define a small interface for the state.
2. Add actions for each state transition.
3. Keep persistence narrow and intentional.
4. Avoid cross-feature coupling inside the store.
5. Add tests only if the store has complex behavior.

## Guardrails

- Use the store for app shell state, not domain data.
- Keep resets explicit for test isolation.
- Prefer one store per concern over a single global blob.
