---
trigger: always_on
---

# Suite Monorepo Structure Rules

This repository is a pnpm + Nx monorepo for Calendar, Tasks, and Drive. Follow these conventions whenever you add or modify code.

## Workspace Layout

- `apps/<app>/api` contains the app's Hono API.
- `apps/<app>/web` contains the app's React/Vite frontend.
- `packages/domain-*` contains bounded-context domain logic.
- `packages/ui` contains shared UI primitives.
- `packages/{auth,crypto,db,env-config,shared-kernel}` contain shared infrastructure and utilities.

## Boundary Rules

- Domain packages never import other domain packages.
- Shared UI belongs in `packages/ui`, not in an app unless it is app-specific.
- App code may depend on shared packages, never the other way around.
- Keep route handlers thin and push logic into domain packages.

## Workspace Conventions

- Use pnpm workspace protocol for local dependencies.
- Use Nx targets for affected builds, tests, and typechecks.
- Prefer colocated tests and feature-local helpers over cross-package test utility sprawl.
- Keep file organization simple and predictable for AI-assisted edits.

## Commands

- `pnpm install --frozen-lockfile`
- `pnpm run typecheck`
- `pnpm run build`
- `pnpm run test`
- `nx affected -t test`
