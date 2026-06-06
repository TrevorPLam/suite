# Dependency Management

## 1. Lock Files

**For applications:** Always commit lock files (`package-lock.json`, `yarn.lock`, `Cargo.lock`, `uv.lock`) to ensure reproducible builds.
**For libraries:** Do **not** commit lock files if the ecosystem recommends leaving version range selection to the downstream consumer (e.g., Go modules, Python libraries). Consult the standard for your language.

## 2. Version Pinning Strategy

- **Applications:** Pin exact versions in lock file.
- **Libraries:** Declare loose but compatible ranges, test against a matrix of minimal and latest.

## 3. Update Cadence

- **Security patches:** Apply within 24 hours (automated).
- **Minor/patch updates:** Weekly automated PR.
- **Major updates:** Scheduled tech-debt sprint, evaluated for breaking changes.

## 4. Dependency Provenance

Verify integrity and provenance of packages (npm provenance, SLSA framework, `uv` hash checking). Use private mirrors for air-gapped environments if needed.
