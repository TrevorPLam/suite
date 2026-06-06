## 4. Repository Structure (v6) — Domain‑First Packages

> See [99-research-pipeline.md](99-research-pipeline.md) for v5 → v6 strategic shifts.

### 4.1 Directory Tree

```
suite/
├── apps/
│   ├── shell/          # optional unified nav
│   ├── calendar/
│   │   ├── web/        # Vite SPA
│   │   ├── api/        # Hono Worker
│   │   ├── specs/      # .spec.md files
│   │   └── AGENTS.md
│   ├── drive/
│   ├── vault/
│   └── ...
├── packages/
│   ├── shared-kernel/  # universal types
│   ├── crypto/         # E2EE primitives
│   ├── db/             # Drizzle client + schemas + migrations
│   ├── auth/           # Better Auth instances
│   ├── ui-kit/         # shadcn + Tailwind
│   ├── api-clients/    # Orval-generated hooks
│   ├── env-config/
│   ├── eslint-config/
│   ├── tsconfig/
│   ├── mobile/
│   ├── domain-calendar/  # bounded context: feature folders
│   ├── domain-drive/
│   ├── domain-vault/
│   └── domain-mail/
├── tooling/            # generators + scripts
├── nx.json
├── pnpm-workspace.yaml
└── ...
```

**Domain packages** (`domain-*`) contain vertical slices: one file per feature (validation + logic + DB). **Shared packages** (`crypto`, `db`, `auth`, `ui-kit`) are stateless and reusable. `shared-kernel` has zero dependencies.

### 4.2 Why Domain‑First

Domain-first makes ownership and boundaries visible at a glance. Nx tags (`scope:calendar`, `type:domain`) + ESLint enforce them in CI.

### 4.4 Nx, pnpm, and TypeScript

**`nx.json`** — `namedInputs.production` excludes specs from production caches. `@nx/js/typescript` auto‑syncs project references from `package.json` dependencies.

**`pnpm-workspace.yaml`** — `catalogMode: strict` prevents version drift. `minimumReleaseAge: 1440` blocks fresh publishes. Full catalog example: [01-architecture-02-technology-stack.md](01-architecture-02-technology-stack.md).

**`tsconfig.base.json`** — Uses project references (not `paths`). Packages must declare dependencies in `package.json`; TypeScript enforces this. Nx affected rebuilds only actual dependents.

### 4.5 Module Boundaries

Tags: `scope:<domain>` + `type:<app|domain|shared|kernel|infrastructure>`.

Key rules in `.eslintrc.json`:
- Domain `scope:X` may only depend on `scope:X` or `scope:shared`
- `type:domain` cannot depend on `type:domain` (cross‑domain = HTTP only)
- `type:kernel` (`shared-kernel`) has zero dependencies

### 4.6 AGENTS.md

Hierarchical: root → `packages/domain-*` → `apps/*`. Nearest file takes precedence.

> Full rules, commands, and templates: [00-glossary-and-principles.md](00-glossary-and-principles.md) and `../../AGENTS.md`.

### 4.7 Generators

`pnpm nx g @myorg/custom:domain <name>` scaffolds `packages/domain-<name>/` with `src/`, `tsconfig.json`, `package.json`, `project.json` (tags), and `AGENTS.md`.

### 4.8 Migration

```bash
nx import ../old-repo apps/<app> --dry-run
nx import ../old-repo apps/<app>
```

Preserves git history via `git filter-repo`. After import: update import paths, merge CI, adjust config. Use `git mv` to preserve blame.

### 4.9 Summary

| Property | Benefit |
|----------|---------|
| Explicit boundaries | Agent knows which packages it may modify |
| Hierarchical AGENTS.md | Domain‑specific rules without root bloat |
| Vertical slices | One file per feature |
| Specs directory | Requirements before code |
| Project references | Accidental imports blocked by TS |
| `catalogMode: strict` | No version drift |

---

**[End of Section 4 — Next: Section 5: Shared Packages — Deep Dive]**