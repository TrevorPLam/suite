# AGENTS.md — Suite

## Overview
This repository is a greenfield monorepo for a productivity suite. The initial focus is Calendar, Tasks, and Drive.

## Repository Rules
- Domain packages never import other domain packages.
- Shared code belongs in `packages/`.
- Shared UI code belongs in `packages/ui`.
- Every feature should begin with a spec before implementation.
- API layers stay thin and only orchestrate validation, auth, and domain calls.
- Prefer workspace packages over published registry dependencies for local code.

## Commands
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm graph`

## Notes
- Keep the structure simple until the first packages are stable.
- Add app-specific instructions in nested `AGENTS.md` files as the repo grows.
