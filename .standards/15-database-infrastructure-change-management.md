# Database & Infrastructure Change Management

## 1. Database Schema Migrations

- **Treat migrations as code.** Version them in the repository alongside the application (e.g., `db/migrations/` with Flyway, Alembic, or golang-migrate).
- **Expand/Contract pattern:** For zero‑downtime deployments:
  1. **Expand:** Add new columns/tables without removing old ones. The application writes to both.
  2. **Migrate** data gradually in the background.
  3. **Contract:** Remove old columns/tables in a follow‑up PR after confirming no reader dependency.
- **Never rename a column** without an intermediate step (add new column, dual‑write, backfill, drop old column).
- **Backward compatibility tests:** Run integration tests against the current and previous schema version to ensure no breaking changes.

## 2. Infrastructure as Code (IaC)

- All infrastructure must be defined in code (Terraform, Pulumi, CloudFormation) and stored in the same repository or a sibling `infra` repository.
- IaC changes follow the same PR process, review, and testing pipeline.
- **Drift detection** runs daily; any drift must be corrected or documented.

## 3. Deployment Strategies

- Default to **rolling updates** or **blue‑green deployments** to avoid downtime.
- **Canary releases** for high‑risk changes: route a small percentage of traffic to the new version, monitor SLOs, and automatically rollback if error budget is threatened.
- Feature flags manage rollout toggles, not infrastructure.
