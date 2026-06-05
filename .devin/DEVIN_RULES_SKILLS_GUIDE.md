````markdown
# Windsurf Customization Guide

## Complete Reference for Rules, Skills, Workflows, AGENTS.md, Memories & Hooks

_Official documentation compiled from [docs.windsurf.com](https://docs.windsurf.com)_

## YDM Project-Specific Configuration

This guide is customized for the **YDM monorepo** - a TypeScript project using pnpm workspaces with API-first development architecture.

### **Available Rules & Skills**

#### **Critical Rules Added**

- **testing-strategy.md**: Complete testing framework setup (Vitest, Playwright, Jest)
- **monitoring-analytics.md**: Error tracking, performance monitoring, and analytics implementation
- **environment-configuration.md**: Environment variables and secret management strategy

#### **Essential Skills Available**

- **implement-database-schema**: Complete database schema implementation from empty state
- **implement-authentication**: JWT-based authentication system with frontend integration
- **implement-monitoring**: Sentry error tracking, Web Vitals, and privacy-first analytics
- **ydm-api-development**: API-first development workflow with code generation
- **ydm-mockup-development**: Component preview system development

### **Current Implementation Status (2026)**

- **Frontend**: Complete marketing website with static data (React 19 + Tailwind CSS v4)
- **Backend**: Minimal Express API with only health check endpoint
- **Database**: Fully configured Drizzle ORM but no schemas implemented
- **Code Generation**: OpenAPI spec minimal but Orval configured for dual generation
- **Authentication**: No authentication system implemented
- **API Integration**: Frontend uses static data, TanStack Query configured but unused
- **Testing**: No test infrastructure implemented (critical gap)
- **Monitoring**: No error tracking, analytics, or monitoring implemented (critical gap)
- **Environment Config**: Minimal environment configuration with basic validation only

### **Priority Implementation Areas**

1. **Database Schema** (currently empty)
2. **Authentication System** (no auth exists)
3. **Testing Infrastructure** (no tests implemented)
4. **Monitoring & Analytics** (no monitoring exists)
5. **API Endpoints** (only health check)
6. **Frontend API Integration** (replace static data)
7. **Environment Configuration** (minimal setup)

### **Project Architecture**

- **Monorepo**: pnpm workspaces with centralized catalog
- **API-First**: OpenAPI spec → Orval → React Query hooks + Zod schemas
- **Type Safety**: End-to-end from database to frontend
- **Platform**: Platform-agnostic deployment with Node.js 24
- **Security**: 1440min release age, platform exclusions

---

## Table of Contents

- [Overview](#overview)
- [Rules](#rules)
  - [Purpose](#purpose)
  - [Storage Locations](#storage-locations)
  - [Rule Discovery & Deduplication](#rule-discovery--deduplication)
  - [Activation Modes](#activation-modes)
  - [File Format & Examples](#file-format--examples)
  - [Creating & Managing Rules](#creating--managing-rules)
- [AGENTS.md](#agentsmd)
  - [How It Works](#how-it-works)
  - [Discovery & Scoping](#discovery--scoping)
  - [Comparison with Rules](#comparison-with-rules)
- [Skills](#skills)
  - [Purpose & Progressive Disclosure](#purpose--progressive-disclosure)
  - [Storage Locations](#storage-locations-1)
  - [Cross‑Agent Compatibility](#cross-agent-compatibility)
  - [Skill Structure](#skill-structure)
  - [SKILL.md File Format](#skillmd-file-format)
  - [Creating & Invoking Skills](#creating--invoking-skills)
- [Workflows](#workflows)
  - [Purpose & Behavior](#purpose--behavior)
  - [Storage & Discovery](#storage--discovery)
  - [Creating Workflows](#creating-workflows)
  - [Invocation & Composition](#invocation--composition)
  - [System‑Level Workflows & Precedence](#system-level-workflows--precedence)
- [Memories](#memories)
  - [What Memories Are](#what-memories-are)
  - [Storage & Management](#storage--management)
  - [When to Use Memories vs. Rules](#when-to-use-memories-vs-rules)
- [Cascade Hooks (Enterprise / Power Users)](#cascade-hooks-enterprise--power-users)
- [Comparison Table](#comparison-table)
- [Best Practices](#best-practices)
  - [General Principles](#general-principles)
  - [Rules](#rules-best-practices)
  - [Skills](#skills-best-practices)
  - [Workflows](#workflows-best-practices)
- [Enterprise Configuration](#enterprise-configuration)
  - [System‑Level Paths](#system-level-paths)
  - [System Rules Merging Behavior](#system-rules-merging-behavior)
  - [Deployment & Management](#deployment--management)
  - [Precedence Summary](#precedence-summary)
- [Troubleshooting & Verification](#troubleshooting--verification)
- [Quick Start Tutorial](#quick-start-tutorial)
- [Quick Reference](#quick-reference)
- [Related Documentation](#related-documentation)

---

## Overview

Windsurf provides **six** powerful mechanisms for customizing Cascade’s behavior, each suited to different needs:

1. **Rules** – Persistent behavioral guidelines (how to behave) that apply across conversations.
2. **AGENTS.md** – Directory‑scoped, frontmatter‑free rules for effortless project contextualization.
3. **Skills** – Multi‑step procedures bundled with supporting files, invoked automatically or manually.
4. **Workflows** – Repeatable prompt templates triggered by slash commands; Cascade never runs them automatically.
5. **Memories** – Automatically generated context that Cascade retains from your interactions.
6. **Cascade Hooks** – Arbitrary shell commands executed at key points in Cascade’s workflow (_enterprise / power users_).

This guide covers all of them in depth, with clear instructions, examples, and best practices to help you get the most out of Windsurf.

---

## Rules

### Purpose

Rules are persistent, reusable behavioral guidelines. They tell Cascade **how to behave**—coding style, project conventions, security constraints—rather than giving step‑by‑step task instructions.

### Storage Locations

| Scope                   | Location                                       | Notes                                                                                     |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Global**              | `~/.codeium/windsurf/memories/global_rules.md` | Single file, applied across all workspaces. Always on. Max **6,000** characters.          |
| **Workspace**           | `.windsurf/rules/*.md`                         | One file per rule, each with its own activation mode. Max **12,000** characters per file. |
| **AGENTS.md**           | Any directory in your workspace                | Processed by the same Rules engine (see [AGENTS.md](#agentsmd)).                          |
| **System (Enterprise)** | OS‑specific (see below)                        | Deployed by IT; read‑only for end users.                                                  |

#### Workspace Rule Discovery

Windsurf automatically discovers rules from:

- `.windsurf/rules/` in the current workspace directory
- `.windsurf/rules/` in any sub‑directory of the workspace
- `.windsurf/rules/` in parent directories up to the git root (for git repositories)

When multiple workspaces are open, rules are deduplicated and the version with the **shortest relative path** is used.

#### System‑Level Rules (Enterprise)

- **macOS**: `/Library/Application Support/Windsurf/rules/*.md`
- **Linux/WSL**: `/etc/windsurf/rules/*.md`
- **Windows**: `C:\ProgramData\Windsurf\rules\*.md`

System rules are **merged** with workspace and global rules—they add context rather than overriding user‑defined rules.

### Rule Discovery & Deduplication

If the same rule name (e.g., `style.md`) exists in multiple discovered locations, Cascade uses the one from the **shortest relative path** to your workspace. All other duplicates are ignored.

> _Example_: If both `src/.windsurf/rules/style.md` and `src/components/.windsurf/rules/style.md` exist, only the one under `src/` is applied.

### Activation Modes

Each workspace rule declares an activation mode in its frontmatter via the `trigger` field. This controls **when** the rule’s content is included in the system prompt and therefore how much of the context window it consumes.

| Mode               | `trigger:` value | How it reaches Cascade                                                                                                                   | Context cost                               |
| ------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Always On**      | `always_on`      | Full rule content is included in the system prompt on **every** message.                                                                 | Every message                              |
| **Model Decision** | `model_decision` | Only the `description` is shown in the system prompt. Cascade reads the full rule file only when it decides the description is relevant. | Description always; full content on demand |
| **Glob**           | `glob`           | Rule is applied whenever Cascade reads or edits a file matching the `globs` pattern (e.g. `*.js`, `src/**/*.ts`).                        | Only when matching files are touched       |
| **Manual**         | `manual`         | Rule is **not** in the system prompt. You activate it by typing `@rule‑name` in the Cascade input box.                                   | Only when @mentioned                       |

> **Note:** The global rules file (`global_rules.md`) and root‑level `AGENTS.md` files do **not** use frontmatter — they are always on.

### File Format & Examples

Every workspace rule is a Markdown file with optional YAML frontmatter. The content after the frontmatter is the rule’s body.

**Glob Rule Example**

```markdown
---
trigger: glob
globs: **/*.test.ts
---

All test files must use `describe`/`it` blocks and mock external API calls.
```
````

**Model‑Decision Rule Example**

```markdown
---
trigger: model_decision
description: Guidelines for formatting API error messages
---

When the API returns an error, display a user‑friendly message instead of the raw error object.
```

**Structured Rule Example (using XML tags)**

```markdown
# Coding Guidelines

<coding_guidelines>

- Use Python for all backend scripts.
- Prefer early returns.
- Always add docstrings for new functions and classes.
  </coding_guidelines>

<security>
- Never hardcode API keys.
- Validate all user inputs.
- Use parameterised queries for database operations.
</security>
```

### Creating & Managing Rules

1. Open the Cascade panel, click the **Customizations** icon (three dots).
2. Navigate to the **Rules** section.
3. Click **+ Workspace** (or **+ Global**) to create a new rule.
4. Alternatively, manually create a `.md` file in `.windsurf/rules/` with the required frontmatter.

Edit any rule by selecting it in the UI and modifying the content.

---

## AGENTS.md

### How It Works

An `AGENTS.md` file (case‑insensitive: also `agents.md`) provides **directory‑scoped instructions** with **zero configuration**. It is processed by the same Rules engine, but:

- **No frontmatter required.**
- **Root‑level** `AGENTS.md` files are automatically **always on**.
- **Subdirectory** `AGENTS.md` files are automatically treated as a **glob** pattern that matches all files inside that directory (i.e., `directory/**`).

This makes `AGENTS.md` the simplest way to attach conventions to a particular folder—for example, telling Cascade that all code inside `api/` must use a specific error‑handling pattern.

### Discovery & Scoping

Windsurf scans for `AGENTS.md` files:

- In the workspace root and all subdirectories.
- Up to the git root.
- In open workspace folders (multiple folders are supported with deduplication by shortest path).

Because subdirectory `AGENTS.md` files do **not** automatically inherit parent instructions, you should place a dedicated `AGENTS.md` in each directory where special behavior is required.

### Comparison with Rules

| Aspect          | `AGENTS.md`                                 | Workspace Rules (`.windsurf/rules/`)                       |
| --------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Frontmatter     | None, always auto‑configured                | Required `trigger:` field                                  |
| Activation      | Root = always on, sub = directory glob      | Explicit: always_on, glob, model_decision, manual          |
| Use case        | Quick per‑directory conventions             | Fine‑grained control, conditional logic, manual invocation |
| Character limit | No explicit limit (same as workspace rules) | 12,000 characters per file                                 |

Choose `AGENTS.md` when you want a **simple, location‑based rule** without having to think about triggers. Use a workspace rule when you need precise control over _when_ and _how_ the rule is applied.

---

## Skills

### Purpose & Progressive Disclosure

Skills bundle **instructions, templates, checklists, and supporting files** into a folder. Cascade can invoke a skill automatically when a task matches its description, or you can trigger it manually with `@skill‑name`.

**Progressive Disclosure**: Only the skill’s `name` and `description` are visible in the system prompt by default. The full `SKILL.md` content and any supporting files are loaded **only when Cascade decides to invoke the skill** (or when you `@mention` it). This keeps the context window lean even if you have dozens of skills.

### Storage Locations

| Scope                   | Location                                   | Availability                                   |
| ----------------------- | ------------------------------------------ | ---------------------------------------------- |
| **Workspace**           | `.windsurf/skills/<skill‑name>/`           | Current workspace; committed with your repo.   |
| **Global**              | `~/.codeium/windsurf/skills/<skill‑name>/` | All workspaces on your machine; not committed. |
| **System (Enterprise)** | OS‑specific (see below)                    | All workspaces, deployed by IT; read‑only.     |

#### System‑Level Skills (Enterprise)

- **macOS**: `/Library/Application Support/Windsurf/skills/<skill‑name>/`
- **Linux/WSL**: `/etc/windsurf/skills/<skill‑name>/`
- **Windows**: `C:\ProgramData\Windsurf\skills\<skill‑name>\`

### Cross‑Agent Compatibility

For interoperability, Windsurf automatically discovers skills in these additional locations (if enabled):

- `.agents/skills/` and `~/.agents/skills/`
- `.claude/skills/` and `~/.claude/skills/` (requires “Claude Code config reading” to be enabled in settings)

This allows you to share skill definitions between Windsurf and other agents.

### Skill Structure

```
.windsurf/skills/<skill-name>/
├── SKILL.md (required)
├── deployment-checklist.md (optional)
├── rollback-procedure.md (optional)
└── config-template.yaml (optional)
```

All files are available when the skill is invoked.

### SKILL.md File Format

**Required Frontmatter Fields:**

- **`name`**: Unique identifier (lowercase letters, numbers, hyphens only)
- **`description`**: A concise explanation of what the skill does and when it should be used. This is critical for automatic invocation.

**Example:**

```markdown
---
name: deploy-to-staging
description: Guide for deploying the application to the staging environment, including safety checks and rollback procedures.
---

## Pre-deployment Checklist

1. All tests pass on the current branch.
2. No uncommitted changes.
3. Environment variables are set for staging.

## Deployment Steps

1. Run `./deploy.sh staging`
2. Verify the health endpoint.
3. Check logs for errors.

If anything fails, follow the instructions in [rollback-procedure.md](rollback-procedure.md).
```

### Creating & Invoking Skills

**Via UI (recommended)**

1. Cascade panel → three dots → **Customizations** → **Skills**.
2. Click **+ Workspace** or **+ Global**.
3. Provide a name and write the SKILL.md content.

**Manual Creation**

- Create the directory structure and `SKILL.md` with the required frontmatter.

**Invocation**

- **Automatic**: Cascade checks the `description` against your request and invokes the skill if it matches.
- **Manual**: Type `@deploy-to-staging` in the input box to force invocation, even if Cascade wouldn’t automatically pick it up.

---

## Workflows

### Purpose & Behavior

Workflows are **manual‑only** prompt templates for repeatable tasks. They consist of a series of steps that Cascade follows sequentially. Cascade will **never** invoke a workflow automatically—you must trigger it with a slash command.

### Storage & Discovery

| Scope                   | Location                                      | Notes                                          |
| ----------------------- | --------------------------------------------- | ---------------------------------------------- |
| **Workspace**           | `.windsurf/workflows/*.md`                    | Any directory under workspace, up to git root. |
| **Global**              | `~/.codeium/windsurf/global_workflows/*.md`   | Available in all workspaces.                   |
| **System (Enterprise)** | OS‑specific (e.g. `/etc/windsurf/workflows/`) | Deployed by IT, read‑only for end users.       |
| **Built‑in**            | Managed by Windsurf                           | Shipped with the editor (e.g. `/plan`).        |

Workflow files are limited to **12,000 characters** each.

Discovery follows the same pattern as rules: workspace folders, sub‑directories, and git‑root traversal, with deduplication using the shortest relative path.

### Creating Workflows

1. Open Cascade → Customizations → Workflows.
2. Click **+ Workflow** (workspace) or **+ Global**.
3. Write a title, a short description, and a series of steps—each step being an instruction for Cascade.

**Example: Pre‑commit Workflow**

```markdown
# Pre‑commit Checklist

1. Run `npm run lint` and fix any errors.
2. Run `npm run test` and ensure all tests pass.
3. Run `npm run build` to verify a clean build.
4. Report the results and abort if any step fails.
```

Save it as `.windsurf/workflows/pre-commit.md`. Then invoke it with `/pre-commit`.

**Generate a Workflow with Cascade**
You can ask Cascade to create a workflow for you: _“Create a workflow for starting the dev server and running database migrations.”_ Cascade will generate a properly formatted `.md` file.

### Invocation & Composition

- Type `/[workflow-name]` in the Cascade input box.
- A workflow can call other workflows: include a step like “Call `/lint`” and then “Call `/test`”.
- Workflows are processed strictly **sequentially**.

### System‑Level Workflows & Precedence

Enterprise system‑level workflows are loaded from:

- **macOS**: `/Library/Application Support/Windsurf/workflows/*.md`
- **Linux/WSL**: `/etc/windsurf/workflows/*.md`
- **Windows**: `C:\ProgramData\Windsurf\workflows\*.md`

**Precedence Order** (highest to lowest):

1. **System** – Organisation‑wide workflows deployed by IT.
2. **Workspace** – Project‑specific `.windsurf/workflows/`.
3. **Global** – User‑defined `~/.codeium/windsurf/global_workflows/`.
4. **Built‑in** – Default workflows provided by Windsurf.

If a system workflow has the same name as a workspace or global workflow, the system version takes priority. In the UI, system workflows are marked with a “System” label and cannot be deleted by end users.

---

## Memories

### What Memories Are

Memories are **automatically generated** snippets of context that Cascade accumulates during your conversations. They help Cascade remember personal preferences, project habits, and recurring patterns without you having to explicitly write rules.

- Stored locally in `~/.codeium/windsurf/memories/`.
- **Workspace‑scoped** (each workspace has its own memory bank).
- Do **not** consume Cascade credits.
- Are **not** committed to version control.

### Storage & Management

You can view and manage memories from the Cascade panel → Customizations → Memories. From there you can:

- See what Cascade has remembered.
- Delete individual memories you no longer need.
- Clear all memories for the workspace.

### When to Use Memories vs. Rules

| Use **Memories** for                                         | Use **Rules** for                                        |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| Personal preferences (e.g. “always use 2‑space indentation”) | Team‑wide, shareable conventions                         |
| Information that changes frequently                          | Persistent constraints that should survive memory resets |
| Temporary, workspace‑specific facts                          | Instructions you want committed to the repo              |

**Important:** Because memories are ephemeral and not shared, if you need durable, team‑wide knowledge, **write a Rule or an AGENTS.md** instead.

---

## Cascade Hooks (Enterprise / Power Users)

Cascade Hooks allow you to execute custom shell commands at specific points in Cascade’s workflow—for example, before reading a file, after writing, or before running a terminal command. Hooks are ideal for:

- Logging and auditing
- Security enforcement
- Custom validation
- Enterprise governance policies

Hooks are configured via JSON files (`.windsurf/hooks.json` in your workspace, or a system‑level equivalent) and can be defined at the workspace, user, or system level. Consult the official [Cascade Hooks documentation](https://docs.windsurf.com/windsurf/cascade/hooks) for full details and configuration examples.

> **Note:** Hooks are an advanced feature. Use them when Rules, Skills, and Workflows cannot achieve the required degree of control.

---

## Comparison Table

| Feature       | Purpose                                    | Structure                       | Activation                                     | Context Cost                         | Best For                                         |
| ------------- | ------------------------------------------ | ------------------------------- | ---------------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| **Rules**     | Behavioral guidelines (how to behave)      | Single `.md` with frontmatter   | always_on / glob / model_decision / manual     | Varies by mode                       | Coding style, project conventions, constraints   |
| **AGENTS.md** | Directory‑scoped rules, zero config        | Plain `.md` (no frontmatter)    | Automatic: root=always, sub=directory glob     | Always (root) or on file touch (sub) | Quick per‑folder conventions without setup       |
| **Skills**    | Multi‑step procedure with supporting files | Folder with `SKILL.md` + assets | Automatic (progressive disclosure) or @mention | Low until invoked (progressive)      | Deployments, code reviews, complex testing       |
| **Workflows** | Repeatable prompt template                 | Single `.md` file               | Manual only via `/slash` command               | When manually triggered              | One‑shot runbooks you want to control explicitly |
| **Memories**  | Auto‑generated personal context            | Stored automatically            | Automatic, relevant retrieval                  | Low (managed by system)              | Temporary personal preferences, informal facts   |
| **Hooks**     | Shell commands at Cascade workflow points  | JSON configuration              | Automatic (triggered by Cascade events)        | Depends on command output            | Auditing, security enforcement, governance       |

---

## Best Practices

### General Principles

- **Keep it simple.** Short, specific instructions are more effective than lengthy, ambiguous prose.
- **Use structured formatting.** Bullet points, numbered lists, and XML tags help Cascade parse instructions accurately.
- **Be concrete.** Avoid generic advice (“write good code”)—the model already knows that. Instead, specify exact behaviors.
- **Test and iterate.** Start with minimal rules/skills and refine based on real usage.

### Rules Best Practices

- **Stay under 12,000 characters** per file.
- **Leverage activation modes** correctly: use `glob` for file‑type conventions, `model_decision` for situational rules, `manual` for rarely needed constraints.
- **Never duplicate** what’s already in the model’s training data.
- **Group related rules** using XML tags for clarity.

### Skills Best Practices

- **Write sharp descriptions.** The `description` is the sole trigger for automatic invocation—be specific about _what_ the skill does and _when_ it should be used.
- **Include all necessary resources** (checklists, templates, scripts) inside the skill folder.
- **Use descriptive names** (e.g., `deploy-to-production` not `deploy1`).
- **Keep `SKILL.md` focused.** While there’s no hard character limit, aim for under 2,000–3,000 words. Push detailed appendices into supporting files.
- **Test manually first** with `@skill-name` before relying on automatic invocation.

### Workflows Best Practices

- **Break tasks into clear, sequential steps.**
- **Make steps actionable** (e.g., “Run `npm test` and report failures”).
- **Compose workflows** by calling other workflows from within steps.
- **Maintain under 12,000 characters** per file.

---

## Enterprise Configuration

### System‑Level Paths

| Mechanism | macOS                                              | Linux/WSL                  | Windows                              |
| --------- | -------------------------------------------------- | -------------------------- | ------------------------------------ |
| Rules     | `/Library/Application Support/Windsurf/rules/`     | `/etc/windsurf/rules/`     | `C:\ProgramData\Windsurf\rules\`     |
| Skills    | `/Library/Application Support/Windsurf/skills/`    | `/etc/windsurf/skills/`    | `C:\ProgramData\Windsurf\skills\`    |
| Workflows | `/Library/Application Support/Windsurf/workflows/` | `/etc/windsurf/workflows/` | `C:\ProgramData\Windsurf\workflows\` |
| Hooks     | `/Library/Application Support/Windsurf/hooks.json` | `/etc/windsurf/hooks.json` | `C:\ProgramData\Windsurf\hooks.json` |

### System Rules Merging Behavior

Unlike workflows where system‑level entries have the highest precedence and _override_ lower‑priority definitions, **system rules are merged** with workspace and global rules. They provide additional baseline context without preventing users or teams from adding their own project‑specific rules. This allows organisations to enforce minimum standards while preserving flexibility.

### Deployment & Management

IT teams can deploy system‑level customizations using:

- Mobile Device Management (MDM)
- Configuration management tools (Ansible, Chef, Puppet)
- Standard deployment scripts

After deployment, users may need to restart Windsurf for changes to take effect. Version‑control your configuration files and follow your organisation’s security policies.

### Precedence Summary

- **Rules**: System rules are merged (additive), not overridden.
- **Skills**: No precedence conflict—all discovered skills are available; naming collisions may cause unpredictable behavior, so use unique names.
- **Workflows**: System > Workspace > Global > Built‑in.
- **Hooks**: Defined in a separate JSON; see Hooks documentation for precedence rules.

---

## Troubleshooting & Verification

| Problem / Question                               | How to Verify / Fix                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Is my rule being applied?**                    | Ask Cascade: _“What rules are currently active?”_ or check the Customizations panel.                                            |
| **Why won’t my skill auto‑invoke?**              | Ensure the `description` clearly matches the task. Test manually with `@skill-name`.                                            |
| **Glob rule not working?**                       | Check the `globs` pattern—verify it matches files using `ls` or `find`. Remember patterns are relative to the workspace.        |
| **Workflow not found?**                          | Confirm the file is in a `.windsurf/workflows/` directory and that the name matches the slash command exactly (case‑sensitive). |
| **Rule content truncated?**                      | Check character count. Workspace rules cannot exceed 12,000 chars; the global rules file is capped at 6,000.                    |
| **System workflow overriding mine?**             | Look for a “System” label in the Workflows panel. If an IT‑deployed workflow uses the same name, it takes precedence.           |
| **Frontmatter syntax error?**                    | Check for typos in `trigger:` values (only `always_on`, `model_decision`, `glob`, `manual` are valid).                          |
| **Skills from `.claude/skills/` not appearing?** | Enable “Claude Code config reading” in Windsurf settings (if available).                                                        |

---

## Quick Start Tutorial

Create a simple rule, skill, and workflow to see all three mechanisms in action.

1. **Create a Rule** – Open `.windsurf/rules/javascript-style.md` and add:

   ```markdown
   ---
   trigger: glob
   globs: **/*.js
   ---

   - Use camelCase for all variable names.
   - Prefer `const`; never use `var`.
   - End files with a newline.
   ```

2. **Create a Skill** – Create the folder `.windsurf/skills/format-code/` with a `SKILL.md`:

   ```markdown
   ---
   name: format-code
   description: Run Prettier on the currently open file and report any changes.
   ---

   1. Identify the file currently being edited.
   2. Run `npx prettier --write <file>`.
   3. Report what was formatted.
   ```

3. **Create a Workflow** – Save the following as `.windsurf/workflows/pre-push.md`:

   ```markdown
   # Pre‑push Checks

   1. Run `npm run lint`.
   2. Run `npm test`.
   3. Run `npm run build`.
   4. If all pass, print "Ready to push." Otherwise, print the errors.
   ```

   Invoke it with `/pre-push`.

Now you have an active glob rule for JavaScript files, a skill you can trigger via `@format-code`, and a manual workflow for your pre‑push routine.

---

## Quick Reference

### File Locations

| Feature   | Workspace                                       | Global                                         | System (macOS)                                                 | System (Linux)                         | System (Windows)                                 |
| --------- | ----------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| Rules     | `.windsurf/rules/*.md`                          | `~/.codeium/windsurf/memories/global_rules.md` | `/Library/Application Support/Windsurf/rules/*.md`             | `/etc/windsurf/rules/*.md`             | `C:\ProgramData\Windsurf\rules\*.md`             |
| AGENTS.md | Any directory, e.g. `docs/AGENTS.md`            | N/A                                            | N/A                                                            | N/A                                    | N/A                                              |
| Skills    | `.windsurf/skills/<name>/SKILL.md`              | `~/.codeium/windsurf/skills/<name>/SKILL.md`   | `/Library/Application Support/Windsurf/skills/<name>/SKILL.md` | `/etc/windsurf/skills/<name>/SKILL.md` | `C:\ProgramData\Windsurf\skills\<name>\SKILL.md` |
| Workflows | `.windsurf/workflows/*.md`                      | `~/.codeium/windsurf/global_workflows/*.md`    | `/Library/Application Support/Windsurf/workflows/*.md`         | `/etc/windsurf/workflows/*.md`         | `C:\ProgramData\Windsurf\workflows\*.md`         |
| Memories  | `~/.codeium/windsurf/memories/` (per‑workspace) | N/A                                            | N/A                                                            | N/A                                    | N/A                                              |
| Hooks     | `.windsurf/hooks.json`                          | `~/.codeium/windsurf/hooks.json`               | `/Library/Application Support/Windsurf/hooks.json`             | `/etc/windsurf/hooks.json`             | `C:\ProgramData\Windsurf\hooks.json`             |

### Character Limits

- Rules: **12,000** characters per file (global: **6,000**)
- Workflows: **12,000** characters per file
- Skills: No explicit limit on `SKILL.md` (recommended: < 2,000–3,000 words)

### Invocation

- Rules: Automatic (based on activation mode) or `@rule‑name` for manual rules.
- Skills: Automatic (progressive disclosure) or `@skill‑name`.
- Workflows: Manual only via `/workflow-name`.
- Memories: Automatic (system‑managed).
- Hooks: Automatic (triggered by Cascade events).

### Activation Modes (Rules)

| Mode           | Keyword          |
| -------------- | ---------------- |
| Always On      | `always_on`      |
| Model Decision | `model_decision` |
| Glob           | `glob`           |
| Manual         | `manual`         |

---

## Related Documentation

- [Windsurf Rules & Skills Official Docs](https://docs.windsurf.com/windsurf/cascade)
- [Workflows Documentation](https://docs.windsurf.com/windsurf/cascade/workflows)
- [AGENTS.md Documentation](https://docs.windsurf.com/windsurf/cascade/agents-md)
- [Memories & Rules](https://docs.windsurf.com/windsurf/cascade/memories)
- [Cascade Hooks](https://docs.windsurf.com/windsurf/cascade/hooks)
- [Agent Skills Specification (agentskills.io)](https://agentskills.io/home)

```

```
