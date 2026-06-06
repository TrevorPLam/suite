---
title: "Repository Structure (v6) — Domain‑First Packages"
section: "architecture"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "01-overview-vision.md"
  - "02-architecture-high-level-architecture.md"
  - "04-architecture-technology-stack.md"
tags:
  - "repository"
  - "monorepo"
  - "nx"
  - "domain-driven"
---

## 4. Repository Structure (v6) — Domain‑First Packages

The repository structure is the single most important visual artifact for you and your AI agents. It must answer three questions instantly: (1) **Where does new code go?** (2) **What belongs together?** (3) **What must never touch each other?** The flat `apps/ + packages/` layout from v5 answered none of these well. A **domain‑first `packages/` structure** solves all three by making ownership and boundaries visible at a glance.

Rather than scattering utilities across a flat `libs/` folder where **who owns what, which app a library actually supports, and whether something is genuinely shared or just a one‑off** remain ambiguous, every piece of code lives inside a top‑level package named after its business domain.

---

### 4.1 The Complete Directory Tree

```
suite/                                 # monorepo root
├── AGENTS.md                          # cross‑tool AI instructions
├── CLAUDE.md                          # Claude‑specific rules (mirrors AGENTS.md)
├── .cursorrules                       # Cursor IDE instructions (optional)
├── .github/                           # GitHub Actions workflows
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── deploy.yml
│   │   └── compliance.yml
│   └── CODEOWNERS
│
├── apps/                              # deployable user‑facing applications
│   ├── shell/                         # (optional) unified nav + cross‑app launcher
│   │   ├── web/                       # Vite SPA
│   │   ├── specs/                     # feature specifications
│   │   └── AGENTS.md
│   ├── calendar/
│   │   ├── web/                       # Vite + React SPA
│   │   ├── api/                       # Hono Worker (thin router)
│   │   ├── specs/                     # .spec.md files for this app
│   │   └── AGENTS.md
│   ├── drive/                         # same structure as calendar
│   ├── vault/
│   ├── mail/
│   ├── chat/
│   └── ...                            # other apps
│
├── packages/                          # shared libraries + domain contexts
│   │
│   ├── shared-kernel/                 # truly universal types
│   │   ├── src/
│   │   │   ├── user-id.ts
│   │   │   ├── timestamp.ts
│   │   │   ├── base-entity.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── AGENTS.md
│   │
│   ├── crypto/                        # stateless E2EE primitives
│   │   ├── src/
│   │   │   ├── aes.ts
│   │   │   ├── hkdf.ts
│   │   │   ├── pbkdf2.ts
│   │   │   ├── blind-index.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── AGENTS.md
│   │
│   ├── db/                            # Drizzle client + shared schemas
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── tenant.ts
│   │   │   └── schema/
│   │   │       ├── index.ts
│   │   │       ├── users.ts
│   │   │       └── sessions.ts
│   │   ├── drizzle/                   # (generated) migration SQL
│   │   ├── drizzle.*.config.ts
│   │   ├── scripts/
│   │   │   └── migrate.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── AGENTS.md
│   │
│   ├── auth/                          # Better Auth server + client
│   │   ├── src/
│   │   │   ├── index.ts               # server instance
│   │   │   ├── client.ts              # client instance
│   │   │   └── types.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── AGENTS.md
│   │
│   ├── ui/                            # Shadcn components + Tailwind theme
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── styles.css
│   │   │   └── index.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── AGENTS.md
│   │
│   ├── api-clients/                   # Orval‑generated React Query hooks
│   │   ├── calendar/
│   │   ├── drive/
│   │   ├── vault/
│   │   └── ...
│   │
│   ├── env-config/                    # Zod env validation
│   ├── eslint-config/                 # shared ESLint configs
│   ├── tsconfig/                      # base TypeScript configs
│   ├── mobile/                        # Capacitor plugin wrappers
│   │
│   ├── domain-calendar/               # 🔥 BOUNDED CONTEXT: Calendar
│   │   ├── src/
│   │   │   ├── events/                # feature folder
│   │   │   │   ├── create-event.ts    # one file: validation + logic + DB
│   │   │   │   ├── get-events.ts
│   │   │   │   ├── update-event.ts
│   │   │   │   ├── delete-event.ts
│   │   │   │   └── events.test.ts
│   │   │   ├── booking/               # feature folder
│   │   │   ├── availability/          # feature folder
│   │   │   └── index.ts               # public API for this domain
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── AGENTS.md
│   │
│   ├── domain-drive/                  # 🔥 BOUNDED CONTEXT: Drive
│   ├── domain-vault/                  # 🔥 BOUNDED CONTEXT: Vault
│   └── domain-mail/                   # 🔥 BOUNDED CONTEXT: Mail
│
├── tooling/                           # internal build/dev tools
│   ├── scripts/
│   │   ├── check-catalog-usage.js
│   │   ├── spec-lint.ts
│   │   └── generate-domain.ts
│   └── generators/
│       ├── domain/
│       └── feature/
│
├── nx.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── .prettierrc
└── README.md
```

### 4.2 Why This Structure Wins (Domain‑First `packages/`)

In a flat `libs/` folder, ambiguity grows as the repository scales. A `data-access-contract` folder name might sound like it belongs to a `contract-web` app, but **Company Web might be the real consumer**—nothing in a flat structure makes that mismatch obvious. The domain‑first layout eliminates that ambiguity by design. Every bounded context lives under its own `packages/domain-*` directory, making clear at a glance what belongs to Calendar, what belongs to Drive, and what is genuinely shared across domains.

**Why `packages/`?** The `packages/` convention communicates: "These are grouped things that belong together under a single workspace." It makes domain boundaries **visible**, reducing cognitive load for both humans and AI agents.

### 4.3 Key Innovations Over v5

| Aspect | v5 (Original) | v6 (Domain‑First) |
|--------|---------------|-------------------|
| **Bounded contexts** | Scattered across `libs/` or ambiguous | Dedicated `packages/domain-*` directories |
| **Technical splitting** | Heavy use of `libs/` with technical tiers | Feature folders inside domains (vertical slices) |
| **Shared kernel** | Not explicitly defined | `packages/shared-kernel` for truly universal types |
| **AI instructions** | Single root `AGENTS.md` | Hierarchical `AGENTS.md` files (root + per package) |
| **Cross‑domain visibility** | Hard to see who imports what | Enforced by Nx tags + ESLint; visible in folder structure |
| **Migration tracking** | Manual | `nx import` for git‑preserving migrations |

### 4.4 Nx Configuration (`nx.json`)

Nx must understand the project graph, enable affected‑only runs, and enforce boundaries via tags.

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "inputs": ["default", "^production"]
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"]
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": ["default", "!{projectRoot}/**/*.spec.ts", "!{projectRoot}/specs/**"],
    "sharedGlobals": ["{workspaceRoot}/.eslintrc.json", "{workspaceRoot}/tsconfig.base.json"]
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "typecheck", "test", "lint"],
        "accessToken": "YOUR_NX_CLOUD_TOKEN"
      }
    }
  },
  "plugins": [
    {
      "plugin": "@nx/eslint/plugin",
      "options": {
        "targetName": "lint"
      }
    },
    {
      "plugin": "@nx/js/typescript",
      "options": {
        "updateTypeReferences": true,
        "syncProjectReferences": true
      }
    }
  ],
  "defaultBase": "main"
}
```

**Key settings:**
- `namedInputs.production` excludes test files and specs from affecting production caches—important because changing a spec does not require rebuilding a package.
- `@nx/js/typescript` plugin automatically synchronizes TypeScript project references based on package dependencies.
- `updateTypeReferences: true` ensures `tsconfig.json` references are always correct without manual maintenance.

### 4.5 pnpm Workspace Configuration (`pnpm-workspace.yaml`)

```yaml
packages:
  - 'apps/*'
  - 'apps/*/*'
  - 'packages/*'
  - 'packages/domain-*'
  - 'tooling/*'

catalog:
  # Frontend
  react: ^19.0.0
  react-dom: ^19.0.0
  vite: ^7.0.0
  '@vitejs/plugin-react': ^4.3.0
  tailwindcss: ^4.0.0
  typescript: ~5.8.0

  # Backend
  hono: ^4.11.7
  drizzle-orm: ^1.0.0-rc.x
  drizzle-kit: ^0.30.0
  '@neondatabase/serverless': ^0.10.0
  pg: ^8.13.0

  # Auth
  'better-auth': ^1.6.2
  '@better-auth/drizzle': ^1.6.0

  # Testing
  vitest: ^3.0.0
  '@vitest/coverage-v8': ^3.0.0
  playwright: ^1.49.0
  '@playwright/test': ^1.49.0

  # Codegen
  orval: ^7.18.0
  zod: ^3.24.0
  '@tanstack/react-query': ^5.62.0

catalogMode: strict
ignoreWorkspaceRootCheck: false
```

**Why `catalogMode: strict`?** This ensures that every dependency in every `package.json` must come from the catalog or be explicitly listed as a local `workspace:*` dependency. No accidental version drift across 53 apps.

### 4.6 TypeScript Project References (`tsconfig.base.json`)

Nx 20 introduced a **TS preset** that shifts away from global `paths` aliases to native TypeScript project references. This is not just a performance optimization—it enforces that **dependent packages are explicitly declared in package.json** before TypeScript allows imports.

```json
{
  "extends": "@suite/tsconfig/base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "references": [],
  "files": [],
  "include": [],
  "exclude": ["node_modules", "dist", "tmp", "**/specs"]
}
```

**How package‑based resolution works in Nx 20:** Instead of resolving `import { x } from '@suite/domain-calendar'` via `paths` in `tsconfig.base.json`, the `@nx/js/typescript` plugin reads the `dependencies` field in each `package.json`. If `@suite/domain-calendar` is listed, Nx automatically adds a TypeScript project reference to `tsconfig.json` of the dependent package.

This approach has two major advantages:
1. **Boundaries are explicit** — you cannot accidentally import a domain package without declaring it as a dependency.
2. **Nx affected works correctly** — changing `domain-calendar` triggers rebuilds only of packages that actually depend on it.

### 4.7 Module Boundary Enforcement (Nx Tags + ESLint)

Nx enforces boundaries through a tag‑based system. Each project (app or package) gets tags, and ESLint rules define which tags can depend on which.

**Tags carry two dimensions:** **scope** (business domain) and **type** (architectural role). For example, `scope:calendar, type:domain`.

**`packages/domain-calendar/project.json` (Nx 22+):**

```json
{
  "name": "domain-calendar",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "packages/domain-calendar/src",
  "projectType": "library",
  "tags": ["scope:calendar", "type:domain"]
}
```

**`apps/calendar/api/project.json`:**

```json
{
  "name": "calendar-api",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "apps/calendar/api/src",
  "projectType": "application",
  "tags": ["scope:calendar", "type:app"]
}
```

**`.eslintrc.json` boundary rules:**

```json
{
  "plugins": ["@nx"],
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "depConstraints": [
          {
            "sourceTag": "scope:calendar",
            "onlyDependOnLibsWithTags": ["scope:calendar", "scope:shared"]
          },
          {
            "sourceTag": "scope:drive",
            "onlyDependOnLibsWithTags": ["scope:drive", "scope:shared"]
          },
          {
            "sourceTag": "type:domain",
            "onlyDependOnLibsWithTags": ["type:shared", "type:kernel", "type:infrastructure"],
            "notDependOnLibsWithTags": ["type:domain"]
          },
          {
            "sourceTag": "type:app",
            "onlyDependOnLibsWithTags": ["type:domain", "type:shared", "type:kernel"]
          },
          {
            "sourceTag": "type:kernel",
            "onlyDependOnLibsWithTags": []
          }
        ]
      }
    ]
  }
}
```

**What these rules enforce:**
- Calendar domain packages can only depend on other Calendar packages or shared packages (**never on Drive, Vault, etc.**).
- Domain packages cannot depend on other domain packages — cross‑domain imports are caught by CI.
- Kernel (`shared-kernel`) has zero dependencies.
- Apps can depend on any package but not on other apps.

**Why this eliminates spaghetti:** In a monorepo without enforced boundaries, any library can import from any other library, creating **implicit coupling** that accumulates unnoticed until refactoring becomes genuinely dangerous. With these rules, the architecture diagram matches the actual import graph — automatically, continuously, without relying on human vigilance.

### 4.8 Hierarchical AI Agent Instructions (`AGENTS.md`)

AGENTS.md is the open standard for AI coding agent instructions, stewarded by the Agentic AI Foundation under the Linux Foundation. It emerged in mid‑2025 to solve a real problem: developers were maintaining separate instruction files for each tool (`.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`). AGENTS.md is the **cross‑tool standard** — one file, every agent.

**Root `AGENTS.md` (`.cursorrules` and `CLAUDE.md` mirror this or import it):**

```markdown
# AGENTS.md — Sovereign Suite

## Project Overview
Zero‑knowledge productivity suite with 53 planned applications. Built with Hono, Drizzle, PostgreSQL, Better Auth, React.

## Repository Structure
- `apps/<app>/web` → Vite React SPA
- `apps/<app>/api` → Hono API (Cloudflare Worker)
- `apps/<app>/specs` → Feature specifications (.spec.md)
- `packages/domain-<domain>` → Bounded contexts (business logic)
- `packages/` → Stateless shared libraries (crypto, db, auth, ui‑kit)
- `packages/shared-kernel` → Universal types only

## Critical Rules
1. **Domain packages never import other domain packages.** Use HTTP calls (Cloudflare Service Bindings) for cross‑domain needs.
2. **Every feature starts with a spec.** Create `apps/<app>/specs/<feature>.spec.md` before writing code.
3. **API routes are thin.** No business logic in `apps/*/api`. Call domain packages.
4. **Use `@suite/auth` for all auth.** Never implement custom sign‑in.
5. **Migrations run in CI, not in Workers.** Set `APP_DOMAIN=<domain>` and run `pnpm db:migrate`.
6. **E2EE is mandatory.** All user content encrypted with `@suite/crypto` before storage.

## Commands
- `pnpm install` → install dependencies
- `pnpm nx dev <project>` → run project in dev mode
- `pnpm nx affected:test` → test only changed projects
- `pnpm nx run <project>:typecheck` → typecheck a project
- `pnpm nx run <project>:build` → build a project
- `pnpm nx graph` → visualize project dependencies

## Adding a New Domain
1. Run `pnpm nx g @myorg/custom:domain <name>` (see custom generator in Section 4.9)
2. Add tags: `scope:<name>, type:domain` in `project.json`
3. Add to module boundary constraints in `.eslintrc.json`
4. Create `packages/domain-<name>/AGENTS.md` with domain‑specific rules
```

**Hierarchical AGENTS.md:** In monorepos, AGENTS.md files can exist at multiple directory levels. The agent reads the **nearest file to the file being edited** — the closest AGENTS.md takes precedence, so each subproject can ship tailored instructions without over‑complicating the root.

Thus, `packages/domain-calendar/AGENTS.md` might contain:

```markdown
# Domain Calendar — Additional Rules

- Use `createEvent()`, `updateEvent()`, `deleteEvent()` from `src/events/`
- Never import from `domain-drive` (enforced by ESLint)
- All calendar events must be encrypted with `calendar` domain key (see `@suite/crypto`)
- Tests for this domain live alongside feature files (e.g., `create-event.test.ts`)
```

### 4.9 Custom Nx Generators for Domain Scaffolding

To reduce boilerplate and ensure consistency when creating new domains, Nx generators scaffold the entire package structure, configuration files, and AGENTS.md in one command.

**Generator structure (`tooling/generators/domain/index.ts`):**

```typescript
import { Tree, formatFiles, generateFiles, joinPathFragments } from '@nx/devkit';

export default async function (tree: Tree, schema: { name: string }) {
  const domainName = schema.name;
  const domainPath = `packages/domain-${domainName}`;
  const substitutions = {
    tmpl: '',
    domainName,
    domainTag: `scope:${domainName}`,
  };

  generateFiles(tree, joinPathFragments(__dirname, 'files'), domainPath, substitutions);
  await formatFiles(tree);
}
```

**Template directory (`tooling/generators/domain/files/`):**

```
src/
  __domainName__/
    __domainName__-feature/
      __domainName__-feature.ts
      __domainName__-feature.test.ts
  index.ts
tsconfig.json
package.json
AGENTS.md
project.json
```

**Usage:**

```bash
pnpm nx g @myorg/custom:domain vault
```

This automatically creates `packages/domain-vault/` with correct tsconfig, tags, and AGENTS.md.

### 4.10 Migration Strategy: `nx import` with Git History Preservation

Migrating existing standalone repositories into the monorepo must preserve git history. Nx provides `nx import` for exactly this purpose.

```bash
nx import ../old-calendar-repo apps/calendar --dry-run   # preview
nx import ../old-calendar-repo apps/calendar             # execute
```

**What `nx import` does:**
1. Clones the source repository into a temporary directory
2. Filters git history to only the relevant files using `git filter-repo` (e.g., preserves commits for `apps/calendar/**`)
3. Merges the filtered history into the monorepo on a temporary branch
4. Detects and suggests installing Nx plugins based on the incoming project
5. Cleans up temporary files and remotes

**After import (manual finessing):** You are typically **90–95% of the way there**. The remaining work includes updating import paths, merging CI pipelines, and adjusting configuration to match the monorepo structure.

**For manual imports (if `nx import` cannot be used):**

```bash
# In the standalone repo, reorganize files first
cd old-repo
mkdir -p apps/calendar
git mv src apps/calendar/
git commit -m "Prepare for monorepo"

# In the monorepo
git remote add old-repo ../old-repo
git fetch old-repo
git merge old-repo/main --allow-unrelated-histories
```

**Critical:** Use `git mv` when moving files to preserve history. Without this, blame annotations point to the monorepo commit, not the original author.

### 4.11 Summary: What Makes This Structure AI‑Ready

| Property | Why It Matters for AI Agents |
|----------|------------------------------|
| **Explicit boundaries** (`scope:calendar`, `type:domain`) | Agent can tell which package it may modify without scanning the entire repository |
| **Hierarchical AGENTS.md** | Each domain can have its own rules, preventing cross‑domain contamination |
| **One feature = one file (vertical slice)** | Agent edits a single file to implement a complete use case, not fragments spread across folders |
| **Specs directory** | Agent reads the spec first, understands the requirements before coding |
| **Generators** | Agent can scaffold a new domain package with correct configs in one command |
| **Project references (not `paths` aliases)** | TypeScript only sees explicit dependencies, preventing accidental cross‑domain imports |
| **`catalogMode: strict`** | Agent always uses catalog versions, never introduces version drift |
| **`nx import` with history** | Agent can assist in migrating external repos without losing git blame |

This structure has been validated by teams scaling from 10 to 40+ libraries where the core bottleneck became **how quickly someone (or some AI) can answer "Where does this code belong?"** . Domain‑first `packages/` answers that question at a glance. For your Sovereign Suite, this same structure will scale from 1 domain to 53 without requiring a reorganization.

---

**[End of Section 4 — Next: Section 5: Shared Packages — Deep Dive]**
