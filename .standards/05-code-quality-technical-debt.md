# Code Quality & Technical Debt

## 1. Formatting & Linting

- **Formatter:** Language-appropriate formatter (Prettier, Black, gofmt, rustfmt) configured in CI with a zero-warning policy.
- **Linter:** Static analysis for errors and anti-patterns (ESLint, Pylint, Clippy, ShellCheck).
- **Pre-commit hooks:** Run formatter + linter + basic secret scanner before every commit (`.pre-commit-config.yaml` or `lefthook`).

## 2. Pre-Commit Framework

Use `pre-commit` (multi-language) with hooks:

- Trailing whitespace, end-of-file fixer.
- YAML/JSON validators.
- Language-specific formatters and linters.
- Secrets detection (`detect-secrets`, `gitleaks`).

## 3. Style Guide

Adopt and document an existing style guide:

- Python: PEP 8, enforced by `ruff`
- JavaScript/TypeScript: Airbnb or Standard
- Go: `gofmt` + `golangci-lint`
- Rust: `rustfmt` + `clippy`

## 4. Technical Debt Management

- **Mark debt inline** with `TODO(<issue-id>)` or `FIXME(<issue-id>)`. Never use bare `TODO`.
- **Track debt** in your issue tracker; link every inline annotation to an issue.
- **Prioritise using cost‑of‑delay:** "What is the cost if we do not fix this debt?"
- **Dedicate a debt sprint** every quarter for major upgrades.
- **Automated debt detection:** Use SonarQube or CodeClimate to flag code smells and complexity drift.
