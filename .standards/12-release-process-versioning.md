# Release Process & Versioning

## 1. Semantic Versioning (SemVer)

`MAJOR.MINOR.PATCH`

- **MAJOR:** Incompatible API changes.
- **MINOR:** Backward-compatible new functionality.
- **PATCH:** Backward-compatible bug fixes.

Pre-release tags: `1.0.0-alpha.1`, `2.3.1-rc.2`.

## 2. Automated Release (Preferred)

Merge to `main` triggers:

1. Determine next version from conventional commits.
2. Generate changelog.
3. Create git tag.
4. Build & publish artifact.
5. Sign artifacts (Sigstore) and generate SLSA provenance.
6. Create GitHub/GitLab Release with release notes.

Tools: `semantic-release`, `release-please`, `changesets`.

## 3. API Versioning (Alignment with Release)

- REST API version corresponds to SemVer major version: `v1` ↔ 1.x.x.
- When you release a new major version of the service, also deploy the new API endpoint.
- Maintain old version until deprecation sunset date.

## 4. Release Branches

- For critical hotfixes that cannot wait for the next release cycle: branch `hotfix/...` from `main`, create a short‑lived release branch `release/v1.2.1`, cherry‑pick fix, merge back.
- Long-term support (LTS) branches are maintained only with security patches and sponsored by a dedicated team.
