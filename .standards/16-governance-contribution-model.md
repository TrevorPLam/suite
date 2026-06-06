# Governance & Contribution Model

## 1. Roles

| Role | Responsibility |
|------|----------------|
| Maintainer | Approves PRs, shapes architecture, releases. Write access to `main`. |
| Contributor | Submits PRs. Read-only unless given temporary write access via fork. |
| Owner | Sets repository policies, manages secrets, integrates bots. |

## 2. Remote & Distributed Team Best Practices

- **Asynchronous‑first:** Default to written communication (RFCs, ADRs, GitHub issues).
- **Communication norms:** Define expected response times for Slack/Teams (e.g., 4 hours for @here, 24 hours for normal).
- **Security without physical trust:** Assume every developer's machine is untrusted. Enforce MFA, SSO, short‑lived credentials, and signed commits.
- **Onboarding:** Provide a fully containerised development environment (Dev Container, Nix) so new hires can be productive within one hour.

## 3. Decision-Making

- **Lightweight RFC process** for significant changes. Template in `docs/rfc/`.
- Lazy consensus: If no maintainer objects within 72 hours, the proposal is accepted.

## 4. Code of Conduct

Adopt the [Contributor Covenant](https://www.contributor-covenant.org/) and enforce it.
