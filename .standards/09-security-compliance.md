# Security & Compliance

## 1. Secret Management

- **Never commit secrets.** Use a `.env` file (gitignored) for development, a vault (HashiCorp Vault, AWS Secrets Manager) for CI/production.
- Pre-commit secret scanning (`gitleaks`, `trufflehog`).
- Repository scanning for historical secrets.

## 2. Supply Chain Security (Beyond SBOM)

- **SLSA provenance** (Level 3 minimum) for every release.
- **Sigstore signing** (keyless) for container images and attestations.
- **Automated dependency updates** with Dependabot/Renovate; auto-merge for patches after CI passes.
- **Vulnerability scanning:** Trivy, Snyk, or Grype in CI; fail on critical/high.
- **Binary authorization policy** – only signed and attested artifacts can deploy to production.

## 3. Threat Modeling

- Perform threat modeling **during architecture design** (before code).
- Use **STRIDE**.
- **Output:** A threat model document (template in Appendix) and a set of mitigation tasks in the backlog.
- **Revisit** after major feature changes or annually.

## 4. Accessibility (a11y) as an Engineering Standard

- **Shift left:** Automated accessibility checks (`axe-core`, `pa11y`) in CI.
- **Baseline:** WCAG 2.1 Level AA.
- **Keyboard navigation** tests as part of integration suites.
- **Document** accessibility conformance in `README.md` or a dedicated `ACCESSIBILITY.md`.

## 5. Privacy Engineering

- **Privacy by Design:** Data minimisation, purpose limitation, storage limitation.
- **Automated PII scanning** in CI.
- **Data retention policies** enforced at application level.
- **Privacy impact assessment** for any feature that processes personal data.

## 6. Ethical & Legal Debt for AI‑Generated Code

- **Declare AI‑generated code** in `AI-GENERATED.md` or commit metadata.
- **Legal review** for copyright and license compatibility.
- **Provenance tracking:** Record model name, version, and prompt hash for any significant AI‑generated contribution.
- **OWASP Top 10 for LLMs** (2026 edition): guard against prompt injection, training data poisoning, and insecure output handling.

## 7. Secure Coding Standards

- Input validation and output encoding.
- Parameterized queries to prevent SQL injection.
- Principle of least privilege for any service account.
- OWASP Top 10 awareness (including LLM‑specific risks).

## 8. License Compliance

All third‑party dependencies must have licenses compatible with the project's license. Automated check in CI (`fossa`, `license_finder`).
