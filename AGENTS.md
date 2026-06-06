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

## AI Agent Rules — Sovereign Suite (Do Not Violate)

1. **Never import across domain boundaries.** `packages/domain-*` may NOT import from another `packages/domain-*`. Use HTTP calls (Service Bindings) for cross‑domain needs.

2. **Every feature begins with a spec.** Before writing code, create `apps/<app>/specs/<feature>.spec.md` with: user story, API contract, validation rules, error cases, out‑of‑scope.

3. **API routes are thin.** `apps/*/api` contain only request validation, auth checks, and calls to domain packages. No business logic.

4. **Use the shared auth package.** Never implement custom sign‑in logic. Import from `@suite/auth/server` and `@suite/auth/client`.

5. **Migrations run in CI, never in Workers.** Use `APP_DOMAIN=<domain> pnpm db:migrate`. Never call `migrate()` inside a Worker.

6. **Search uses blind indexing by default.** Implement exact‑match search via HMAC tokens. Defer semantic search until validated.

7. **One Durable Object per "room" (chat, doc, board).** Never put multiple coordination units in one DO.

8. **Every PR must pass `nx affected -t typecheck,test,lint`.** No exceptions.

9. **E2EE crypto is non‑negotiable.** All user content must be encrypted with AES‑256‑GCM before storage. Use `@suite/crypto`.

10. **Free tier limits must be monitored.** Each API must implement `UsageMonitor` middleware that blocks requests when limits approach 80%.

## Commands
- `pnpm install`
- `pnpm dev`
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm graph`

## Further Reading (Updated Paths)
- Domain-specific rules: `packages/domain-<name>/AGENTS.md`
- Full plan: `docs/00-vision/00-vision-and-principles.md`
- Schema reference: `docs/03-data/24-database-schema-reference.md` (mandatory read for all domain work)
- Error codes: `docs/04-backend/26-error-handling-taxonomy.md`
- Testing guide: `docs/02-monorepo/25-testing-strategy.md`
- Compliance records: `docs/07-business/18-compliance-gdpr-cra.md`
- Incident response: `docs/07-business/33-incident-response.md`
- Developer setup: `docs/08-execution/36-developer-onboarding.md`
- App guides: `docs/10-apps/`

## Notes
- Keep the structure simple until the first packages are stable.
- Add app-specific instructions in nested `AGENTS.md` files as the repo grows.
