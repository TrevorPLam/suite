---
title: "Specification‑First AI Workflow"
section: "development-workflow"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "03-architecture-repository-structure.md"
  - "09-development-workflow-development-environment.md"
tags:
  - "workflow"
  - "spec-first"
  - "ai"
  - "tdd"
---

## 6. Specification‑First AI Workflow

### 6.1 The Problem: Why "Vibe Coding" Fails at Scale

"Vibe coding"—the term coined by Andrej Karpathy in February 2025—describes a programming style where the developer expresses intent in natural language and lets the model generate the code with minimal oversight. For solo prototypes, this produces rapid results. For a 53‑application zero‑knowledge suite, it produces **technical debt that compounds exponentially**.

In 2026, the risks of unstructured AI code generation are well understood. A systematic evaluation of 12 frontier LLMs found that models produce syntactically valid outputs at near‑ceiling rates yet collapse on discriminative generation, with fault hypothesis generation—not output validation—as the dominant bottleneck. Google reports that AI writes 75% of new code, yet critics warn of a growing "vibe slop" crisis: low‑quality, bug‑ridden code accumulating as unmanageable long‑term technical debt. Amazon has experienced service disruptions directly attributed to uncontrolled AI‑generated code deployment.

The ACM TechBrief on AI "vibe coding" highlights systemic risks: security vulnerabilities inherited from training data, inconsistent or missing testing, and systems that become impossible for humans to review or maintain. LLMs pattern‑match on familiar systems and treat current implementation as requirements, leading to hallucinated APIs and architectural violations.

The core problem is **context blindness**. AI coding agents lack awareness of project‑specific requirements—your team's preferred error‑handling patterns, internal utility wrappers, or testing conventions. Without explicit guardrails, AI‑generated code drifts from intent at a measurable rate: approximately 34% of unchecked generation tasks deviate meaningfully from specification by the third iteration. Implementation standards that human teams enforce implicitly via code reviews and experience must be made explicit for AI.

### 6.2 Specification‑Driven Development (SDD): The Paradigm Shift

Specification‑Driven Development (SDD) inverts the traditional workflow by treating specifications as the source of truth and code as a generated or verified secondary artifact. In 2026, professional teams are moving to SDD: instead of writing code first, engineers spend time crafting "Executable Specs"—structured, behavior‑oriented blueprints in natural language.

The SDD workflow follows a disciplined lifecycle: specification → plan → tasks → implement, with traceable artifacts committed in‑repo. Clear specifications force up‑front decisions, uncover assumptions, and ensure alignment with original intent.

Critical to the architecture of the Sovereign Suite is the relationship between SDD and **Test‑Driven Development (TDD)**. Teams report successfully implementing even complex projects using a hybrid of SDD and TDD, where specifications guide what to build and tests validate that what was built matches the spec. AI coding agents operate most effectively when they have concrete pass/fail feedback loops.

### 6.3 AGENTS.md: The Single Source of Agent Instructions

AGENTS.md is a plain Markdown file at the repository root that tells AI coding agents how to navigate, build, test, and ship code in your project. It is the open standard for agent instructions, stewarded by the Agentic AI Foundation under the Linux Foundation.

Think of AGENTS.md as **README.md for AI**: a README explains the project to humans; AGENTS.md provides the operational context—build commands, coding standards, test requirements, security policies—that AI needs to work correctly. It is the primary instruction surface; coding agents (Claude Code, Codex, Copilot, etc.) read it when they begin working on the codebase.

AGENTS.md is deliberately simple: plain Markdown with no required schema. It works hierarchically—the agent reads the file nearest to the file being edited, allowing each directory to have its own rules. The goal is to capture the smallest set of durable instructions that materially improves future agent sessions.

The Sovereign Suite uses this hierarchical pattern: root AGENTS.md defines project‑wide rules; each `packages/domain-*` has its own AGENTS.md for domain‑specific instructions; each `apps/` has AGENTS.md for application‑specific rules. This creates a layered instruction system where rules are additive and context‑appropriate.

#### 6.3.1 Root AGENTS.md Template

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

## Critical Rules (Do Not Violate)
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
- `pnpm nx run <project>:typecheck` → typecheck a project
- `pnpm nx graph` → visualize project dependencies
- `pnpm nx run api-clients:generate` → regenerate API clients from OpenAPI
- `pnpm spec:check` → validate all spec files against templates

## Adding a New Feature
1. Create `apps/<app>/specs/<feature>.spec.md` using the template.
2. Run `pnpm spec:check` to validate the spec file.
3. Run `pnpm nx run <app>:tdd` to generate test stubs from the spec.
4. Implement using the spec as your reference.
5. Run tests: `pnpm nx test <app>`.
```

#### 6.3.2 Domain AGENTS.md (Example: `packages/domain-calendar/AGENTS.md`)

```markdown
# Domain Calendar — Additional Rules

- Use `createEvent()`, `updateEvent()`, `deleteEvent()` from `src/events/`
- Never import from `domain-drive` (enforced by ESLint)
- All calendar events must be encrypted with `calendar` domain key (see `@suite/crypto`)
- Tests for this domain live alongside feature files (e.g., `create-event.test.ts`)
- Available features: events, bookings, availability
```

### 6.4 The Spec File Format

Each feature begins with a machine‑readable and human‑readable specification file in `apps/<app>/specs/<feature>.spec.md`. The OpenSpec SDD framework provides a lightweight specification layer that ensures human developers and AI agents align on what to build before code is generated.

#### 6.4.1 Required Sections

```markdown
---
spec_version: 1
feature: create-invoice
app: accounting
status: draft
author: AI
created: 2026-06-03
---

## User Story
**As a** business owner
**I want to** create an invoice from a proposal
**So that** I can bill clients efficiently

## Acceptance Criteria
- [ ] AC‑01: User can upload a proposal document
- [ ] AC‑02: System extracts invoice fields (amount, due date, payee)
- [ ] AC‑03: User can edit extracted fields before finalizing
- [ ] AC‑04: System creates draft invoice and sends to client for approval

## API Contract
- **Endpoint:** `POST /api/invoices`
- **Auth:** Required (session cookie)
- **Request Body:**
  ```json
  {
    "proposal_id": "uuid",
    "overrides": {
      "amount": "number (optional)",
      "due_date": "ISO date (optional)"
    }
  }
  ```
- **Response:**
  ```json
  {
    "invoice_id": "uuid",
    "status": "draft"
  }
  ```

## Validation Rules
| Field | Rule | Error Code |
|-------|------|-------------|
| proposal_id | Must exist and belong to current user | `invalid_proposal` |
| amount | If provided, must be >0 | `invalid_amount` |
| due_date | If provided, must be in future | `invalid_due_date` |

## Error Cases
| Scenario | HTTP Status | Error Message |
|----------|-------------|---------------|
| Missing auth | 401 | `missing_session` |
| Proposal not found | 404 | `proposal_not_found` |
| Proposal already invoiced | 409 | `proposal_already_invoiced` |

## Database Changes
- Insert into `accounting.invoices` table
- Reference `accounting.proposals` table

## Out of Scope (for this feature)
- Sending the invoice via email (handled by separate feature)
- Payment processing
- Invoice templates

## Security Considerations
- E2EE: Invoice amounts encrypted before storage
- Audit log: All invoice creations logged
- Tenant isolation: Invoices scoped to organization_id

## Performance Requirements
- Response time < 200ms for sub‑500 proposal lookups
- P99 < 500ms
```

#### 6.4.2 Spec Validation CI

A `spec:check` script validates every spec file against the template, ensuring required sections exist, frontmatter is parseable, and no sections are missing. This runs in CI as a pre‑merge gate.

### 6.5 The Multi‑Agent Pipeline

Spec Kit Agents research has validated that a **multi‑agent SDD pipeline**—with distinct PM and developer roles—significantly outperforms single‑agent prompting, adding phase‑level, context‑grounding hooks to prevent hallucinated APIs and architectural violations.

The Sovereign Suite adapts this pattern to a solo‑founder workflow:

| Agent Role | Responsibility | Inputs | Outputs | When Run |
|------------|---------------|--------|---------|----------|
| **Spec Agent** | Creates/updates spec files from natural language | User prompt, existing specs | Validated spec file (.spec.md) | At feature kickoff, manually triggered |
| **Test Agent** | Generates test suites from spec acceptance criteria | Spec file, domain context | Test files (.test.ts) | Immediately after spec approval |
| **Judge Agent** | Verifies generated code matches spec | Code changes, spec file | Pass/fail with detailed violations | In CI on every PR |
| **Implement Agent** | Writes code to satisfy spec | Spec file, test files | Implementation code | After test files are generated |

For a solo developer, the Judge Agent is the most critical. It runs in CI and compares generated code against the spec's acceptance criteria, API contract, and validation rules. When a violation is detected, the Judge Agent returns a structured error report that can be fed back to the Implement Agent for correction, closing the loop.

### 6.6 Dynamic Workflows with Adversarial Verification

Claude Code now supports **dynamic workflows**—the ability to spawn separate agents to adversarially verify outputs against rubrics. For the Sovereign Suite, this pattern is operationalized as:

1. **Implement Agent** writes code to satisfy the spec.
2. **Verify Agent** runs adversarially, attempting to break the implementation.
3. **Feedback loop** routes failures back to Implement Agent.
4. **Human approval** required for final merge when both agents converge.

This adversarial pattern dramatically reduces the "drift" observed in unchecked generation. Research validates that without concrete pass/fail feedback loops, AI code generation drifts from intent at a measurable rate of approximately 34% by the third iteration.

### 6.7 Integration with TDD: "Red‑Green‑Refactor" for AI

The SDD workflow integrates naturally with TDD:

1. **Spec Agent** writes the spec (the "requirement").
2. **Test Agent** writes failing tests from the spec's acceptance criteria (the "red" phase).
3. **Implement Agent** writes minimal code to pass tests (the "green" phase).
4. **Human/AI** refactors while keeping tests green (the "refactor" phase).
5. **Judge Agent** verifies the final implementation against the spec.

This hybrid SDD + TDD approach ensures that AI agents have concrete pass/fail feedback loops at every stage—the core antidote to context blindness and implementation drift.

### 6.8 Guardrails: Policy Enforcement for AI

AGENTS.md files are the first layer of guardrails, but they are instructions, not enforceable policy. To truly constrain AI agents, the Sovereign Suite implements three additional guardrails:

**LLM Guardrails** are policy enforcers that operate at runtime, determining what passes, what gets blocked, and how fast the decision lands. For the Sovereign Suite, these evaluate each AI‑generated code change against three criteria:
- **Security**: Does this introduce encryption violations or plaintext logging?
- **Architecture**: Does this violate domain boundaries or import rules?
- **Compliance**: Does this handle user data consistent with GDPR?

**Static Analysis Guardrails** are ESLint rules that run in CI on every PR. Combined with the Judge Agent, these enforce the rules documented in AGENTS.md automatically. The key insight: AGENTS.md is the *source of truth* for human and AI understanding; ESLint rules are the *enforcement mechanism* that fails CI when those rules are violated.

**Test‑First Enforcement** mandates that the Test Agent always generates test files before the Implement Agent writes code. This is enforced by CI: any PR that adds implementation code without corresponding test files fails. This forces the "red" phase before "green," aligning with TDD discipline.

### 6.9 Tooling Implementation

The Sovereign Suite implements the SDD workflow using these tools:

| Tool | Purpose | Integration Point |
|------|---------|-------------------|
| **GitHub Spec Kit** | Constitution‑driven SDD workflow | `specify init --here --ai` |
| **AGENTS.md** | AI instruction file | Root + hierarchical overrides |
| **Nx Custom Generator** | Scaffolds spec + test files | `pnpm nx g @myorg/spec:feature` |
| **spec:check script** | Validates spec structure | CI pre‑merge |
| **Playwright + Vitest** | Runs generated tests | CI on every commit |
| **ESLint with Nx boundaries** | Enforces guardrails | CI on every PR |
| **Judge Agent** | Verifies implementation against spec | CI via GitHub Actions |

### 6.10 AI Agent Instructions for AI Code Generation

To enable AI coding agents to effectively follow the SDD workflow, the Sovereign Suite provides standardized project‑specific instructions that answer the six questions AI agents need:

| Question | Answer in AGENTS.md |
|----------|---------------------|
| Where do I put new code? | Structure defined in Section 4 |
| What are the rules? | The 10 critical rules |
| How do I build/run? | Commands listed in AGENTS.md |
| What tests must pass? | `pnpm nx affected:test` |
| Who owns which code? | CODEOWNERS + tags |
| How do I get context? | Read the nearest AGENTS.md |

The "Guidelines for Writing Machine‑Consumable Specifications" recommends using structured, parseable sections, frontmatter for metadata, and specific field names that AI models recognize. The spec format in Section 6.4 follows these guidelines.

### 6.11 Enforcement in CI

The CI pipeline (`ci.yml`) enforces the SDD workflow:

```yaml
jobs:
  spec-validation:
    runs-on: ubuntu-latest
    steps:
      - name: Check spec files
        run: pnpm spec:check
      - name: Verify tests exist for changed code
        run: |
          CHANGED_FILES=$(git diff --name-only origin/main)
          for file in $CHANGED_FILES; do
            if [[ $file == *.ts && ! -f ${file%.ts}.test.ts ]]; then
              echo "ERROR: $file has no corresponding test file"
              exit 1
            fi
          done

  judge-agent:
    runs-on: ubuntu-latest
    steps:
      - name: Run Judge Agent
        run: pnpm judge:verify
        env:
          OPENAI_API_KEY: ${{ secrets.JUDGE_AGENT_KEY }}
```

### 6.12 Summary: Why This Workflow Wins for AI

| Problem | SDD Solution | Enforcement |
|---------|--------------|-------------|
| Vibe coding drift | Specification is source of truth | Judge Agent in CI |
| Context blindness | Hierarchical AGENTS.md with structured rules | Read by agent before any change |
| Hallucinated APIs | API contract in spec | Validated against OpenAPI |
| Inconsistent architecture | Nx boundary rules in AGENTS.md | ESLint fails CI |
| Missing tests | Test‑first enforced | CI fails without test files |
| Security violations | Guardrails evaluate every change | Blocked by LLM guardrails |

The SDD workflow transforms AI coding from "vibe guessing" to "specification verification." Every AI‑generated change is anchored to a human‑written spec, validated by automated tests, verified by a Judge Agent, and enforced by guardrails and CI policies. This is how a solo founder can scale to 53 applications without drowning in technical debt.

---

**[End of Section 6 — Next: Section 7: Database Design & Multi‑Tenancy]**
