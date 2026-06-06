# Adoption Roadmap & Maturity Model

To prevent boiler‑plate overload, adopt the Diamond Standard incrementally. Use these four maturity levels:

### Level 1 – Bronze (Essential)
- Trunk‑based development, branch protection
- Conventional commits, commit signing
- Linting and formatting in CI
- Unit test coverage enforcement
- Secret scanning on pre‑commit
- Basic CI pipeline (build, test, lint)

**Target:** Any project of any size.

### Level 2 – Silver (Solid)
- Automated dependency updates (Renovate)
- Code review SLAs enforced
- Integration & contract tests
- OpenAPI schema‑first design
- Security scanning in CI (SAST, container)
- SBOM generation
- SLOs defined for critical path
- On‑call rotation for production services

**Target:** Services in production with active users.

### Level 3 – Gold (Advanced)
- BDD scenarios executable in CI
- Feature flags for all non‑trivial work
- Chaos engineering weekly
- SLSA Level 3 provenance & Sigstore signing
- Error budget policy enforced
- Automated accessibility checks in CI
- Threat modeling for all new features
- Database expand/contract pattern enforced

**Target:** High‑reliability services, regulated industries, or scaling teams.

### Level 4 – Diamond (Pinnacle)
- Full platform engineering IDP
- Carbon‑aware scheduling
- AI‑assisted review with human gate
- Binary authorization for production
- DevEx metrics tracked and acted upon
- Privacy impact assessments automated
- AI‑generated code provenance tracked

**Target:** Organisations with >50 engineers and dedicated platform/SRE teams.
