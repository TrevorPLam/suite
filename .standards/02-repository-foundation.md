# Repository Foundation

## 1. Repository Decision: Monorepo vs Polyrepo

Use the following decision matrix instead of a blanket recommendation. Evaluate based on team size, coupling, and tooling maturity.

| Question | If YES (lean toward Monorepo) | If NO (lean toward Polyrepo) |
|----------|-------------------------------|------------------------------|
| Do more than 3 services frequently change together? | Monorepo | Polyrepo |
| Can you invest in remote caching/build graphs (Nx, Turborepo, Bazel)? | Monorepo | Polyrepo |
| Do teams need strict access boundaries (compliance)? | Polyrepo | Monorepo |
| Is there a single team owning the entire stack? | Monorepo | Polyrepo |
| Are you already using a polyrepo with a strong package registry? | Polyrepo (keep) | – |

**Hybrid option:** For large organisations, consider a **synthetic monorepo** where multiple repos are composed at build time via a manifest repository. Start with the simplest topology that works.

## 2. Mandatory Repository Files

Every repository must contain the following files in its root:

| File | Purpose |
|------|---------|
| `README.md` | Project description, quick-start, badges (CI, coverage, license) |
| `LICENSE` | Unambiguous open-source or proprietary license |
| `CONTRIBUTING.md` | How to set up the environment, run tests, submit changes |
| `CODEOWNERS` | Automatic review assignments |
| `.gitignore` | Language/framework specific ignores |
| `.gitattributes` | Line-ending normalisation, linguist overrides |
| `SECURITY.md` | Vulnerability reporting process |
| `CHANGELOG.md` | Human-readable history of notable changes (auto-generated) |
| `AI-GENERATED.md` | Declaration of AI-generated code (if applicable) |

## 3. Directory Structure (Polyglot Example)

```
.
├── .github/
│   ├── workflows/        # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── .cursor/              # AI agent rules (project‑specific instructions)
├── docs/
│   ├── adr/              # Architecture Decision Records
│   ├── api/              # OpenAPI / GraphQL schemas
│   ├── rfc/              # Lightweight RFC process
│   └── postmortems/      # Incident postmortems
├── src/                  # Application source
├── tests/                # Unit, integration, contract, BDD scenarios
├── scripts/              # Utility scripts (migrations, seeders)
├── configs/              # Non-sensitive configuration templates
├── db/                   # Migration files (e.g., Flyway, Alembic)
├── .husky/               # Git hooks (or .lefthook)
├── .vscode/              # Shared editor settings (optional)
├── Dockerfile
├── docker-compose.yml
├── Makefile / Taskfile   # Common commands
├── README.md
└── CHANGELOG.md
```

**Rule:** No file should sit directly in the root unless it has a global, clearly defined purpose.

## 4. Twelve‑Factor App Principles

For cloud‑native services, follow the [Twelve‑Factor App](https://12factor.net/) methodology:
- **Declarative formats** for setup automation.
- **Stateless processes** – share nothing; store state in backing services.
- **Externalised configuration** – never in code.
- **Backing services** treated as attached resources, swappable without code changes.

Every violation (e.g., config in code, local session storage) must be justified and documented in an ADR.
