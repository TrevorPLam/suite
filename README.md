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

## Development

### API Proxy Configuration

All web apps use Vite's proxy feature to forward API requests to their respective API servers during development. This eliminates CORS issues and simplifies local development.

Each web app's `vite.config.ts` includes a proxy configuration:

- **Calendar web**: Proxies `/api/*` to `http://localhost:3001` (or `VITE_API_URL` if set)
- **Tasks web**: Proxies `/api/*` to `http://localhost:3002` (or `VITE_API_URL` if set)
- **Drive web**: Proxies `/api/*` to `http://localhost:3003` (or `VITE_API_URL` if set)

To override the default API server URL, set the `VITE_API_URL` environment variable:

```bash
# Example: Run calendar web with custom API URL
VITE_API_URL=http://localhost:4000 pnpm --filter @suite/calendar-web dev
```

The proxy is only active in development mode. Production builds should be configured to make direct API calls to the deployed API servers.

## Next step
The next phase is to scaffold the Calendar, Tasks, and Drive app packages with thin web/API entry points and shared foundation packages, starting with the canonical `packages/ui` package.
