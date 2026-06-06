---
title: "Development Environment & AI Tools"
section: "development-workflow"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "03-architecture-repository-structure.md"
  - "08-development-workflow-spec-first.md"
tags:
  - "development"
  - "environment"
  - "ai"
  - "nx"
  - "vscode"
---

## 20. Development Environment & AI Tools

The development environment for the Sovereign Suite is designed for one thing: **making AI agents and humans equally effective**. Every tool, every configuration, and every command exists to eliminate friction, reduce context switching, and ensure that both you and your AI assistants can work at full capacity. This section documents the complete setup: the IDE configuration that makes monorepo navigation effortless, the local development commands that mirror the CI pipeline, the debugging tools that inspect running Workers, and the AI agent infrastructure—AGENTS.md, MCP servers, custom skills, and autonomous workflows—that transforms your coding assistant from a simple autocomplete tool into a true engineering partner.

---

### 20.1 The Development Environment at a Glance

The Sovereign Suite supports three primary workflows:

| Workflow | Tools | Purpose |
|----------|-------|---------|
| **Local coding** | VS Code + Nx Console + TypeScript ESLint | Authoring, refactoring, local builds |
| **Local execution** | `pnpm nx dev` + `wrangler dev` + `docker-compose up` | Run APIs, frontends, and PostgreSQL locally |
| **Agent-assisted** | Claude Code + AGENTS.md + Nx skills + MCP | Autonomous planning, execution, and CI monitoring |

The guiding principle is **parity**: the same commands you run locally (`pnpm nx affected:test`, `pnpm nx run calendar-api:build`) are exactly what CI runs. No platform divergence. No "it works on my machine" surprises.

---

### 20.2 Editor Setup: VS Code for Monorepo Development

VS Code is the recommended editor for the Sovereign Suite. The monorepo ships with a `.vscode` folder containing the standard settings for a modern monorepo environment.

**File: `.vscode/settings.json`**

```json
{
  // TypeScript configuration
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.preferences.quoteStyle": "single",
  "typescript.suggest.paths": true,
  "typescript.updateImportsOnFileMove.enabled": "always",

  // ESLint monorepo support — critical!
  "eslint.workingDirectories": [{ "mode": "auto" }],
  "eslint.format.enable": true,
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],

  // Prettier integration
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },

  // Search and navigation
  "search.exclude": { "**/node_modules": true, "**/dist": true, "**/.nx": true },
  "files.exclude": { "**/.nx": true },
  "files.watcherExclude": { "**/.nx/workspace-data": true },

  // Editor behavior
  "editor.rulers": [100],
  "editor.wordWrap": "wordWrapColumn",
  "editor.wordWrapColumn": 100,
  "files.trimFinalNewlines": true
}
```

**The `eslint.workingDirectories` setting with `{ "mode": "auto" }` is the single most important line for monorepo ESLint support.** It enables ESLint to automatically detect working directories, properly resolving configs per package. Without this, ESLint looks for a single config file at the root, and packages with local overrides will not be linted correctly.

**Recommended extensions** are listed in `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "nrwl.angular-console",
    "ms-azuretools.vscode-docker",
    "bradlc.vscode-tailwindcss",
    "vitest.explorer"
  ]
}
```

When you open the monorepo for the first time, VS Code prompts you to install all recommended extensions at once.

---

### 20.3 Local Development Commands

The root `package.json` provides a set of curated scripts that map directly to CI pipelines:

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install all dependencies (uses pnpm workspace catalogs) |
| `pnpm dev` | Start all apps in parallel (API + frontend) |
| `pnpm nx dev calendar` | Start the Calendar app (API + frontend) |
| `pnpm nx test affected` | Run tests only on changed projects |
| `pnpm nx typecheck affected` | Type‑check only changed projects |
| `pnpm nx build affected` | Build only changed projects |
| `pnpm nx graph` | Visualise the project dependency graph |
| `pnpm nx run calendar-api:deploy` | Deploy Calendar API to Workers |
| `pnpm nx run calendar-web:deploy` | Deploy Calendar frontend to Pages |

**File: `package.json` scripts section**

```json
{
  "scripts": {
    "dev": "nx run-many --target=dev --parallel=10",
    "dev:calendar": "nx run calendar-web:dev",
    "build": "nx run-many --target=build --parallel=5",
    "test": "nx run-many --target=test --parallel=5",
    "typecheck": "nx run-many --target=typecheck --parallel=10",
    "lint": "nx run-many --target=lint --parallel=10",
    "clean": "nx reset && rm -rf node_modules packages/*/node_modules apps/*/*/node_modules",
    "graph": "nx graph",
    "format": "prettier --write '**/*.{ts,tsx,js,jsx,json,md}'"
  }
}
```

**Running a single app in development mode (`pnpm nx dev calendar`)** launches both the API and the frontend with hot‑module replacement (HMR). For APIs, HMR is powered by `wrangler dev`; for frontends, by Vite.

**Running a Worker locally (`wrangler dev`):**

```bash
pnpm nx run calendar-api:dev
```

This wraps `npx wrangler dev apps/calendar/api/src/index.ts`. The Worker runs in a local emulator (`workerd`) that closely mirrors the production environment. The default URL is `http://127.0.0.1:8787`.

**Running the database locally:**

```bash
docker-compose -f infra/compose/vps.docker-compose.yml up -d
```

This starts PostgreSQL 17 on `localhost:5432`. The `DATABASE_URL` environment variable must point to this instance. The Sovereign Suite uses a `.env.local` file (git‑ignored) for local overrides; `.env.example` documents all required variables.

---

### 20.4 Debugging Workers and APIs

**Local breakpoint debugging** is supported through VS Code's JavaScript Debug Terminals. The approach, validated by Cloudflare documentation, is: open a JS debug terminal (`Cmd + Shift + P` → "JavaScript Debug Terminal"), then run `pnpm nx run calendar-api:dev` from within that terminal. VS Code automatically connects to the running Worker and starts a debugging session, even if you are running multiple Workers simultaneously.

**Adding a custom `launch.json` configuration** for advanced debugging:

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Wrangler",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

To use it: run `npx wrangler dev --inspect`, then select "Attach to Wrangler" from the VS Code Run & Debug panel. Breakpoints placed in `.ts` files will be hit as requests flow through the Worker.

**DevTools for Workers** are also available. While running `wrangler dev`, press the `D` key in the terminal to open Chrome DevTools attached to the Worker. This is useful for profiling performance, inspecting network requests, and debugging WebSocket connections.

---

### 20.5 AGENTS.md: The Single Source of Agent Instructions

AGENTS.md is a plain markdown file at the repository root that tells AI coding agents how to navigate, build, test, and ship code. It is the open standard for agent instructions, stewarded by the Agentic AI Foundation under the Linux Foundation. The Sovereign Suite includes AGENTS.md files at every relevant directory level: root for global rules, and one per `packages/domain-*` for domain‑specific instructions.

**Why AGENTS.md is mandatory:** A study across 10 repositories and 124 merged pull requests found that adding AGENTS.md reduced median runtime by **28.6%** and median token usage by **16.6%** (98.6 seconds → 70.3 seconds wall‑clock time). Without AGENTS.md, agents spend time exploring directory structures, inferring build systems, and guessing test commands. With it, they work directly toward the solution.

**The root `AGENTS.md` (condensed version, part of the 200‑line limit):**

```markdown
# AGENTS.md — Sovereign Suite

## Overview
Zero‑knowledge productivity suite with 53 planned applications. Built with Hono, Drizzle, PostgreSQL, Better Auth, React.

## Repository Structure
- `apps/<app>/web` → Vite React SPA
- `apps/<app>/api` → Hono API (Cloudflare Worker)
- `apps/<app>/specs` → Feature specifications (.spec.md)
- `packages/domain-<domain>` → Bounded contexts (business logic)
- `packages/` → Stateless shared libraries
- `packages/shared-kernel` → Universal types only

## Critical Rules
1. Domain packages never import other domain packages. Use HTTP calls (Cloudflare Service Bindings) for cross‑domain needs.
2. Every feature begins with a spec. Create `apps/<app>/specs/<feature>.spec.md` before writing code.
3. API routes are thin. No business logic in `apps/*/api`. Call domain packages.
4. Use `@suite/auth` for all auth. Never implement custom sign‑in.
5. Migrations run in CI, not in Workers. Set `APP_DOMAIN=<domain>` and run `pnpm db:migrate`.
6. E2EE is mandatory. All user content encrypted with `@suite/crypto` before storage.

## Commands
- `pnpm install` → install dependencies
- `pnpm nx dev <project>` → run project in dev mode
- `pnpm nx affected:test` → test only changed projects
- `pnpm nx graph` → visualise project dependencies
- `pnpm spec:check` → validate all spec files against templates
```

**Domain‑specific AGENTS.md** files live in each package. For example, `packages/domain-calendar/AGENTS.md` might contain:

```markdown
# Domain Calendar — Additional Rules
- Use `createEvent()`, `updateEvent()`, `deleteEvent()` from `src/events/`
- Never import from `domain-drive` (enforced by ESLint)
- All calendar events must be encrypted with `calendar` domain key (see `@suite/crypto`)
- Tests for this domain live alongside feature files (e.g., `create-event.test.ts`)
```

**Directory hierarchy:** AGENTS.md files can exist at multiple directory levels. The agent reads the nearest file to the file being edited, with the closest AGENTS.md taking precedence. This allows each subproject to ship tailored instructions without over‑complicating the root.

---

### 20.6 Claude Code Extensions: MCP, Skills, Agents, Hooks

Claude Code supports four distinct extension mechanisms, each solving a different problem:

| Extension Type | Where It Lives | What It Does | Example |
|----------------|----------------|--------------|---------|
| **MCP Server** | `.mcp.json` or `~/.claude.json` | Connects to external tools and APIs; adds new tools Claude can call | Search GitHub, query Postgres, control a browser |
| **Skill** | `.claude/skills/` or `~/.claude/skills/` | Custom instructions and slash commands; injects domain knowledge into context | "Deploy to production", "Generate spec from PRD" |
| **Custom Agent** | `.claude/agents/` or `~/.claude/agents/` | Specialised AI assistant in its own context window, with custom model/tool restrictions | Code reviewer, API designer, test generator |
| **Hook** | `.claude/settings.json` hooks section | Runs shell commands automatically on lifecycle events | Format code after edits, block dangerous commands before execution |

MCP servers run as separate processes and expose tools over a protocol that Claude Code understands. Claude decides when to call them based on context, the same way it decides when to use its built‑in Bash or Read tools. Skills, on the other hand, are procedural guides that agents follow using their existing tools (terminal, file system, etc.). They are loaded incrementally, only when the agent actually needs them.

**MCP server for Nx Cloud CI:** The Nx MCP server (configured via `nx configure-ai-agents`) opens a communication channel between your local agent and Nx Cloud. Your agent can monitor CI pipeline status in real time, receive failure context, and communicate with Nx's Self‑Healing CI agent.

**Example `.mcp.json` for the Sovereign Suite:**

```json
{
  "mcpServers": {
    "nx-cloud": {
      "command": "npx",
      "args": ["-y", "@nx/mcp-server"],
      "env": { "NX_CLOUD_ACCESS_TOKEN": "${NX_CLOUD_TOKEN}" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "DATABASE_URL": "postgresql://localhost:5432/suite" }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}" }
    }
  }
}
```

**Skills for the Sovereign Suite:** The `nx configure-ai-agents` command installs a set of skills that teach the agent how to work in the monorepo: exploring the workspace using `nx show projects` and `nx graph`, filtering projects by type/tags, tracing dependencies, and bridging local development with CI. Skills are packaged and shareable via [agentskills.io](https://agentskills.io/home).

---

### 20.7 Nx AI Agent Integration

In 2026, Nx is becoming "infrastructure for autonomous AI agents". For the Sovereign Suite, this means embedding AI agents directly into the Nx Platform that understand the entire codebase, optimise builds without human intervention, and make architectural decisions alongside the team.

**Nx's Self‑Healing CI** is one of the most impactful features for agentic workflows. Nx analyses what went wrong, generates a fix, validates it, and applies it if confident. For many organisations, over 50% of generated fixes are useful, saving more time from self‑healing than from caching and distributed execution combined. For the Sovereign Suite, this means an agent can iterate fully autonomously: it implements a feature, pushes to CI, monitors status via the Nx MCP server, applies verified fixes when tests fail, and only notifies the human reviewer when all CI checks are green.

**Agentic migrations** are another Nx 2026 feature. When you have standalone repositories that need to be imported into the monorepo, `nx import --agentic` clones the repo, filters git history, and merges it while preserving commit lineage. The AI agent assists with import path updates and configuration adjustments.

**CI‑monitor skill:** The `monitor-ci` skill enables the local agent to monitor CI pipeline status in real time, receive failure information with full context, communicate with Nx's Self‑Healing CI agent, apply verified fixes automatically, and keep iterating until CI is green. This bridges the gap between local development and CI that normally kills full autonomy.

**Installing Nx AI agent support:**

```bash
pnpm nx configure-ai-agents
```

This single command sets up everything an AI agent needs: an MCP server for talking to CI, a set of skills for working with the monorepo, and a `CLAUDE.md`/`AGENTS.md` with guidelines. It works across major AI coding tools: Claude Code, Cursor, GitHub Copilot, Gemini, Codex, and OpenCode.

---

### 20.8 Autonomous Workflows: The "Ralph Loop"

A "Ralph loop" is an autonomous agent workflow where the agent keeps working on a task until completion, without human intervention. The pattern was popularised by Geoffrey Huntley and has become a common approach for running AI agents on well‑defined tasks. In the Sovereign Suite, a Ralph loop operates as follows:

1. **The local agent reads a user story** from the `specs/` directory and implements the feature.
2. **It runs local quality checks:** type checking, linting, and unit tests.
3. **It creates a PR** and starts monitoring CI via the `monitor-ci` skill.
4. **If CI fails**, the Nx Self‑Healing CI agent kicks in, classifies the failure, and proposes a verified fix.
5. **The local agent sees the fix**, applies it, and pushes again.
6. **The loop repeats** until all CI checks are green.
7. **Only then does the human receive a notification** to review the PR.

During this entire process, the human is not interrupted. The agent stays in flow. The competitive advantage for the Sovereign Suite is that one person with AI assistance can operate at a velocity that would previously have required a full team.

---

### 20.9 Agent‑First Checklist

Before committing code to the Sovereign Suite, every developer (including AI agents) should verify the following:

- [ ] The `AGENTS.md` in the relevant directory is up‑to‑date.
- [ ] The feature has a corresponding `.spec.md` file in `apps/<app>/specs/`.
- [ ] All commands (`pnpm nx affected:test`, `pnpm nx typecheck affected`) pass locally.
- [ ] The agent has access to MCP servers (Nx Cloud, PostgreSQL, GitHub) if applicable.
- [ ] Skills are installed (`pnpm nx configure-ai-agents` at least once per workspace).
- [ ] The `CLAUDE.md` (if using Claude Code) points to the root AGENTS.md via `IMPORT` directive.
- [ ] Debugging configurations (.vscode/launch.json) are present for the projects being worked on.
- [ ] The ESLint working directories setting is enabled in `.vscode/settings.json`.

---

### 20.10 Summary: Development Environment at a Glance

| Component | Configuration | Purpose |
|-----------|---------------|---------|
| **Editor** | VS Code with `.vscode/settings.json` | Auto ESLint resolution, TypeScript project references, standardised formatting |
| **Package management** | `pnpm` workspaces + catalogs | Fast installs, consistent versions across 53 apps |
| **Task orchestration** | `nx.json` + `project.json` | Affected‑only execution, dependency‑aware builds |
| **Local Workers** | `wrangler dev` + HMR | Instant feedback loop for API changes |
| **Local DB** | Docker Compose + PostgreSQL 17 | Full database environment isolated from production |
| **AI instructions** | Hierarchical `AGENTS.md` | 28.6% faster agent runtime, consistent outputs |
| **Agent extensions** | MCP servers + Skills + Custom Agents | Connect to Nx Cloud, PostgreSQL, GitHub; run autonomous workflows |
| **Autonomous CI** | Nx Self‑Healing CI + monitor‑ci skill | Fix failures without human intervention; "Ralph loop" autonomy |

The development environment of the Sovereign Suite is not merely a collection of tools—it is a **unified system** designed to make AI agents as effective as human developers. By standardising on AGENTS.md, leveraging Nx's agentic capabilities, and integrating closely with Claude Code's extension ecosystem, the suite transforms the solo‑founder constraint from a weakness into a superpower. One person, with the right tools and the right AI, can build what would previously have required an entire engineering organisation.

---

**[End of Section 20 — Next: Section 21: Migration Plan]**
