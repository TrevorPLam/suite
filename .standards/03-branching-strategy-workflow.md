# Branching Strategy & Workflow

## 1. Trunk-Based Development (Mandatory)

- **Main branch:** `main` is the single source of truth. It must always be deployable.
- **Short-lived feature branches:** Branched from `main`, merged back within **1 business day**.
- **No long-running development branches** (e.g., `develop`, `staging-v2`).
- **Feature flags are mandatory** for decoupling deployment from release. Gate unfinished work behind flags.
- **Release stabilization:** When a release requires final testing, a short‑lived `release/vX.Y` branch may be created from `main`. Only critical fixes are cherry‑picked onto it. The branch is merged back into `main` immediately after tagging. A release branch must not exist longer than 3 days.

## 2. Branch Naming Convention

```
<type>/<ticket-id>-<short-description>
```

| Type      | Use case                          |
|-----------|-----------------------------------|
| `feat/`   | New feature                       |
| `fix/`    | Bug fix                           |
| `docs/`   | Documentation only                |
| `chore/`  | Maintenance, dependency updates   |
| `refactor/`| Code change without feature/fix  |
| `test/`   | Adding or fixing tests            |
| `perf/`   | Performance improvement           |

**Examples:** `feat/JIRA-421-oauth2-integration`, `fix/1234-null-pointer-on-login`

## 3. Branch Protection Rules (Enforced on `main`)

- Require a pull request before merging.
- Require status checks to pass (lint, test, build, security scan).
- Require at least **1 approval** from a CODEOWNER.
- Require branches to be up-to-date with `main` (linear history, fast-forward only).
- Prohibit force pushes.
- Delete head branch on merge.
