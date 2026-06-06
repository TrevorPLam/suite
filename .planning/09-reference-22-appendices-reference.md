## 23. Appendices

### Appendix A: `AGENTS.md`

See `../../AGENTS.md` for the canonical agent instruction file.


### Appendix B: Drizzle Kit Per‑Domain Config

See [02-monorepo-03-repository-structure.md](02-monorepo-03-repository-structure.md) and [02-monorepo-04-shared-packages.md](02-monorepo-04-shared-packages.md).

Critical settings per config: `schemaFilter`, `tablesFilter`, `migrations.table` (unique per domain). Never run `drizzle-kit push` in CI — use `drizzle-kit migrate` only.


### Appendix C: Spec Template (`.spec.md`)

See [02-monorepo-05-specification-ai-workflow.md](02-monorepo-05-specification-ai-workflow.md).


### Appendix D: CI/CD Workflows

See `.github/workflows/` in the repo and [08-execution-17-cicd-secrets-management.md](08-execution-17-cicd-secrets-management.md).

Key flows: `ci.yml` (lint/typecheck/test/build), `deploy.yml` (migrations → Worker → Pages per app), `compliance.yml` (weekly SBOM + Grype + RoPA check).


### Appendix E: Nx Tags & Boundaries

See [02-monorepo-03-repository-structure.md](02-monorepo-03-repository-structure.md).

Pattern: `scope:<app>` + `type:app|domain|shared|kernel`. Domain packages must not depend on other domain packages. Kernel (`shared-kernel`) has zero dependencies.


### Appendix F: Better Auth Rate Limiting Fix

**CVE‑2026‑45364** affects Better Auth versions prior to 1.5.0‑beta.11. The rate limiter keys IPv6 addresses individually based on the exact textual IP address from the `x‑forwarded‑for` header, without normalising the address or aggregating by `/64` prefix. An attacker controlling a `/64` allocation can rotate through 2⁶⁴ different source addresses to bypass rate limits. Versions 1.5.0‑beta.11 and later include the fix.

**Mitigation for the Sovereign Suite:**

- Pin `better-auth` to ≥1.6.2 in your `pnpm‑workspace.yaml` catalog.
- Apply rate limiting at Cloudflare’s edge level as a secondary layer. The `rate‑limit` Worker binding can inspect the entire IPv6 prefix by stripping the last 64 bits of the address before applying limits.
- Document in AGENTS.md that any custom rate‑limiting code must normalise IPv6 addresses to the `/64` prefix before keying.


### Appendix G: Tailwind CSS v4 Theme

See `packages/ui-kit/src/styles/globals.css` and [02-monorepo-04-shared-packages.md](02-monorepo-04-shared-packages.md).


### Appendix H: Capacitor Config

See [01-architecture-02-technology-stack.md](01-architecture-02-technology-stack.md) and [05-frontend-10-frontend-mobile-strategy.md](05-frontend-10-frontend-mobile-strategy.md).


### Appendix I: pnpm Catalogs

See [02-monorepo-03-repository-structure.md](02-monorepo-03-repository-structure.md). Use `catalogMode: strict` and scoped catalogs (`catalog:frontend`, `catalog:backend`). Consider `pnpm-catalog-lint` to prevent version drift.


### Appendix J: Secret Scanning

See [08-execution-17-cicd-secrets-management.md](08-execution-17-cicd-secrets-management.md).

Stack: Gitleaks (pre‑commit hook) + TruffleHog (CI) + GitHub secret scanning push protection.


### Appendix K: Secrets Management (Doppler)

See [08-execution-17-cicd-secrets-management.md](08-execution-17-cicd-secrets-management.md).

Doppler is the single source of truth. Fetch at runtime in CI via `dopplerhq/secrets-fetch-action`. Prefer OIDC integration to avoid storing `DOPPLER_TOKEN` in GitHub.


### Appendix L: Nx Cloud Self‑Healing CI

See [02-monorepo-03-repository-structure.md](02-monorepo-03-repository-structure.md).

Enable in Nx Cloud dashboard. Install `ci-monitor` skill via `pnpm nx configure-ai-agents` for autonomous agent workflows.


### Appendix M: Git Workflows

```bash
# New feature (spec first)
git checkout -b feature/<app>-<name>
# create apps/<app>/specs/<name>.spec.md
pnpm spec:check
pnpm nx g @myorg/custom:feature <app> <name>
# implement, test, commit, PR
git push -u origin feature/<app>-<name> && gh pr create --fill

# New domain
pnpm nx g @myorg/custom:domain <name>
# add schema, generate migration, update .eslintrc.json depConstraints
pnpm --filter=domain-<name> db:generate

# Migrate standalone repo
nx import ../<old-repo> --dry-run
nx import ../<old-repo> --tag-rename=<app-name>
pnpm nx run <app>-api:typecheck
pnpm nx affected:typecheck && pnpm nx affected:test

# Emergency rollback
npx wrangler rollback <api> --version=previous
npx wrangler pages rollback <app> --deployment-id=<id>
```

---

### Appendix N: Third‑Party Tool Notes

| Tool | Note |
|---|---|
| **PartyKit** | WebSocket handlers break after Vite HMR (`createLazyConnection` lacks `configurable: true`). Use raw Durable Objects instead. |
| **Drizzle `tablesFilter`** | Only filters tables, not sequences/extensions. Pair with `schemaFilter` for full isolation. |
| **`create-mf-app`** | Scaffolds Module Federation micro‑frontends (React 19, Vite 8). Evaluated but deferred. Option for future enterprise self‑hosting. |
| **Better Auth email verification** | Built‑in flow via API endpoint; `verification` table stores tokens. v1.6.11 fixes auto‑sign‑in edge case when linking accounts. |
| **Claude Code MCP** | Ecosystem matured early 2026. Private‑network MCP servers reachable via outbound‑only gateway. `claude-code-mcp` server adds code tools. |

---

