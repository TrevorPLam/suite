## 6. Specification‑First AI Workflow

> See [00-glossary-and-principles.md](00-glossary-and-principles.md) for AGENTS.md rules, directory structure, and core commands.

### 6.1 Why SDD

Unstructured AI code generation (“vibe coding”) drifts from intent at ~34% by the third iteration. Specification‑Driven Development (SDD) treats specs as the source of truth and code as a verified artifact. Combined with TDD, it gives AI agents concrete pass/fail feedback loops.

### 6.2 AGENTS.md

Hierarchical instruction files: root → `packages/domain-*` → `apps/*`. The nearest file takes precedence. See `../../AGENTS.md` for the current root file.

### 6.3 Spec File Format

Every feature begins at `apps/<app>/specs/<feature>.spec.md`.

```markdown
---
spec_version: 1
feature: create-invoice
app: accounting
status: draft
---

## User Story
As a <role> I want <goal> so that <benefit>.

## Acceptance Criteria
- [ ] AC‑01: <criteria>

## API Contract
- **Endpoint:** `METHOD /path`
- **Request:** `{ ... }`
- **Response:** `{ ... }`

## Validation Rules
| Field | Rule | Error Code |

## Error Cases
| Scenario | Status | Code |

## Out of Scope
- <item>

## Security Considerations
- E2EE, RLS, audit log as applicable.
```

`pnpm spec:check` validates structure in CI.

### 6.4 Multi‑Agent Pipeline

| Role | Responsibility | Output |
|------|---------------|--------|
| **Spec Agent** | Creates spec from natural language | `.spec.md` |
| **Test Agent** | Generates tests from acceptance criteria | `.test.ts` |
| **Implement Agent** | Writes code to pass tests | Implementation |
| **Judge Agent** | Verifies code matches spec | Pass/fail report |

The Judge Agent is the most critical for a solo developer. It runs in CI and returns structured violation reports when code diverges from the spec.

### 6.5 Guardrails

Three enforcement layers:
1. **AGENTS.md** — instructions (human/AI readable)
2. **Static analysis** — ESLint + Nx boundaries fail CI on violations
3. **Test‑first enforcement** — CI fails PRs that add implementation without corresponding tests

LLM guardrails evaluate each change for security (encryption violations), architecture (cross‑domain imports), and compliance (GDPR handling).

### 6.6 Tooling

| Tool | Purpose |
|------|---------|
| `spec:check` | Validates spec structure |
| Nx custom generators | Scaffolds spec + test + domain stubs |
| Playwright + Vitest | Runs generated tests |
| ESLint + Nx boundaries | Enforces architectural rules |
| Judge Agent | CI verification against specs |

### 6.7 CI Enforcement

```yaml
jobs:
  spec-validation:
    steps:
      - run: pnpm spec:check
      - run: |
          for file in $(git diff --name-only origin/main); do
            [[ $file == *.ts && ! -f ${file%.ts}.test.ts ]] && exit 1
          done
  judge-agent:
    steps:
      - run: pnpm judge:verify
```

### 6.8 Summary

| Problem | SDD Solution |
|---------|--------------|
| Vibe coding drift | Specification is source of truth |
| Context blindness | Hierarchical AGENTS.md |
| Hallucinated APIs | API contract in spec |
| Inconsistent architecture | Nx boundary rules |
| Missing tests | CI fails without test files |
| Security violations | Guardrails evaluate every change |

---

**[End of Section 6 — Next: Section 7: Database Design & Multi‑Tenancy]**