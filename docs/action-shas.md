# GitHub Actions SHA Pinning Reference

This file tracks the commit SHAs for all pinned GitHub Actions used in the Sovereign Suite CI/CD pipelines. All third-party actions must be pinned to a full 40-character commit SHA, not a version tag, to prevent supply chain attacks.

## Why SHA Pinning?

Version tags are mutable — an attacker who compromises the action maintainer's account can push a malicious commit to an existing tag. SHA pinning eliminates this attack vector entirely. According to GitHub's official security documentation:

> "Pinning an action to a full-length commit SHA is currently the only way to use an action as an immutable release. Pinning to a particular SHA helps mitigate the risk of a bad actor adding a backdoor to the action's repository, as they would need to generate a SHA-1 collision for a valid Git object payload."

## Current Pinned Actions

| Action | Version Tag | Commit SHA | Last Updated |
|--------|-------------|------------|--------------|
| actions/checkout | v6.0.3 | 9f698171ed81b15d1823a05fc7211befd50c8ae0 | 2026-06-06 |
| pnpm/action-setup | v6.0.8 | d15e628ca66d93ee5f352c71671a7bc6a97af5c9 | 2026-06-06 |
| actions/setup-node | v6.4.0 | 48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e | 2026-06-06 |
| actions/cache | v4 | 0057852bfaa89a56745cba8c7296529d2fc39830 | 2026-06-06 |
| actions/upload-artifact | v4 | ea165f8d65b6e75b540449e92b4886f43607fa02 | 2026-06-06 |
| nrwl/nx-set-shas | v4 | 3e9ad7370203c1e93d109be57f3b72eb0eb511b1 | 2026-06-06 |
| dorny/paths-filter | v3 | 6852f92c20ea7fd3b0c25de3b5112db3a98da050 | 2026-06-06 |
| anchore/sbom-action | v0 | e22c389904149dbc22b58101806040fa8d37a610 | 2026-06-06 |
| anchore/scan-action | v4 | 04b73ec0bba3de85519c4ec634bffedead788f96 | 2026-06-06 |
| trufflesecurity/trufflehog | v3.95.5 | d411fff7b8879a62509f3fa98c07f247ac089a51 | 2026-06-06 |
| github/codeql-action | v3 | b0c4fd77f6c559021d78430ec4d0d169ae74a4eb | 2026-06-06 |
| dopplerhq/secrets-fetch-action | v1.3.1 | 451892f16195f9ac360e1a5bcbf0b5fd0e957534 | 2026-06-06 |
| zizmorcore/zizmor-action | v0.5.6 | 5f14fd08f7cf1cb1609c1e344975f152c7ee938d | 2026-06-06 |

## Update Process

When Dependabot or a security update suggests updating an action:

1. Verify the update is from the official repository (not a fork)
2. Check the release notes for breaking changes
3. Update the SHA in this file first
4. Update the SHA in all workflow files (`.github/workflows/*.yml`)
5. Test the updated workflow in a PR
6. Merge and update the "Last Updated" date

## Verification

To verify a SHA corresponds to a specific version tag:

```bash
git ls-remote https://github.com/<owner>/<repo>.git refs/tags/<version>
```

Example:
```bash
git ls-remote https://github.com/actions/checkout.git refs/tags/v6.0.3
# Output: 9f698171ed81b15d1823a05fc7211befd50c8ae0 refs/tags/v6.0.3
```

## Enforcement

GitHub repository settings should be configured to require SHA pinning for all actions:

1. Go to Settings → Actions → General
2. Under "Actions permissions", select "Allow all actions and reusable workflows"
3. Enable "Require SHA pinning for actions"
4. This prevents workflows with mutable tags from being committed

## References

- [GitHub Secure Use Reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub Actions Policy: SHA Pinning](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/)
- [Hardening GitHub Actions: Lessons from Recent Attacks](https://www.wiz.io/blog/github-actions-security-guide)
