# Suite Monorepo

This repository is the starting point for a large productivity suite built as a single monorepo.

## Initial scope
- Calendar
- Tasks / project management
- Drive / file storage

## Planned layout
- `apps/` for deployable app surfaces
- `packages/` for shared code and domain logic
- `packages/domain-*` for bounded contexts
- `packages/ui` for shared UI components and design system code
- `packages/shared-kernel` for universal types only

## Getting started
1. Install dependencies with `pnpm install`.
2. Add feature specs before implementation.
3. Build out the shared packages first, then wire the first app surfaces.

## Next step
The next phase is to scaffold the Calendar, Tasks, and Drive app packages with thin web/API entry points and shared foundation packages, starting with the canonical `packages/ui` package.
