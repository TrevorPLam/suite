---
trigger: manual
description: PR quality gates using Nx affected commands for typecheck, test, and lint
---

# PR Quality Gates

Every PR must pass `pnx affected --target=typecheck,test,lint` before merging. No exceptions.

## Required CI Checks

All pull requests must pass these quality gates:

```bash
# Run typecheck on affected projects
pnx affected --target=typecheck

# Run tests on affected projects
pnx affected --target=test

# Run lint on affected projects
pnx affected --target=lint
```

## How Nx Affected Works

Nx uses Git history and the project graph to determine which projects are affected by your changes:

1. Uses Git to determine files changed in the PR
2. Uses the project graph to determine which projects those files belong to
3. Determines which projects depend on the modified projects
4. Runs specified tasks only on that subset of projects

## CI Configuration

In CI, configure base and head commits:

```yaml
# GitHub Actions example
- name: Run affected checks
  run: |
    pnx affected --target=typecheck --base=origin/main --head=$PR_BRANCH_NAME
    pnx affected --target=test --base=origin/main --head=$PR_BRANCH_NAME
    pnx affected --target=lint --base=origin/main --head=$PR_BRANCH_NAME
  env:
    NX_BASE: origin/main
    NX_HEAD: ${{ github.ref }}
```

The recommended approach is to set the base SHA to the latest successful commit on the main branch.

## Visualizing Affected Projects

To see which projects are affected:

```bash
pnx graph --affected
```

This opens the Nx graph visualization showing affected projects and their dependencies.

## Ignoring Files from Affected Commands

Nx ignores files matching patterns in:
- `.gitignore` (automatically)
- `.nxignore` (optional, for additional patterns)

Create `.nxignore` to exclude files that shouldn't trigger affected checks:

```
# .nxignore
*.md
CHANGELOG.md
docs/**
```

## Best Practices

Based on 2026 Nx monorepo best practices:

- **Pair with remote caching**: Use Nx Cloud for distributed task execution
- **Set appropriate base**: Always use latest successful main branch commit
- **Ignore documentation changes**: Docs changes shouldn't trigger full rebuilds
- **Monitor affected count**: If too many projects are affected, consider dependency refactoring

## Enforcement

- CI pipeline blocks merge if any affected check fails
- PR checks require all three gates to pass
- No manual overrides or bypasses allowed
- Failed checks must be fixed before re-running

## Benefits

- **Faster CI**: Only tests changed code and dependents
- **Cost savings**: Reduced compute time in CI
- **Better feedback**: Developers see only relevant failures
- **Scalability**: Scales with monorepo size without linear CI time growth
