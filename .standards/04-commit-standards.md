# Commit Standards

## 1. Conventional Commits (with optional AI marker)

Every commit message **should** follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

**AI‑generated commits** may include an optional marker:

```
feat(api): add oauth2 endpoints
$CC_FEAT AI generated (Claude 4.5) — easier changelog filtering
```

## 2. Atomic Commits

- One logical change per commit.
- A commit must leave the repository in a working state (compile, test passing).
- Avoid "WIP" commits on shared branches; squash if necessary before review.

## 3. Commit Signing

All commits must be signed with a GPG key or SSH key to verify authorship. Enable vigilant mode on GitHub/GitLab.

## 4. Automation

- Install a commit-lint tool (`commitlint`) as a pre-commit hook and in CI.
- Use `commitizen` or similar interactive CLI to guide developers.
