# Continuous Integration, Delivery & Platform Engineering

## 1. Pipeline Stages (Standard)

```
[ Trigger: Push / PR ]
      │
      ▼
  Pre-flight (lint, format, secret scan) ── Fail → Stop
      │
      ▼
  Build (compile, generate artifacts)
      │
      ▼
  Test (unit + integration + BDD + contract)
      │
      ▼
  Performance Baseline (light load)
      │
      ▼
  Security Scan (SAST, dependency check, container scan)
      │
      ▼
  Publish Artifact (Docker image, library package, binary)
      │
      ▼
  Deploy to Dev / Staging (optional, automated)
      │
      ▼
  Post-deploy Smokes (health check)
      │
      ▼
  Chaos Experiment (opt‑in, controlled failure injection)
```

## 2. Pipeline as Code

Pipeline definitions live inside the repository (`.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`). They are versioned and reviewed like any other code.

## 3. Platform Engineering / Internal Developer Platform (IDP)

For teams > 20 developers, build an **IDP** that provides:
- **Golden Paths:** Pre‑configured, approved templates (e.g., "new microservice with observability, security, and carbon‑aware scheduling").
- **Self‑service** environments, databases, and CI/CD triggers.
- **Guardrails** that enforce standards without manual gating.

**Start small:** A `platform/` directory with Terraform modules and a README. Graduate to Backstage or Humanitec when needed.

## 4. Artifact Management

- **Immutability:** Artifacts are never overwritten; every build produces a unique version.
- **Registry:** Use a central registry (Docker Hub, ECR, Artifactory, GitHub Packages).
- **Promotion:** The same artifact is promoted through environments (dev → staging → prod). No rebuilding.

## 5. Environment Parity & Chaos Engineering

- **Development, staging, and production** are as similar as possible (containerized, same backing services).
- **Chaos engineering:** Inject controlled failures (network latency, pod kill, dependency outage) in staging to verify resilience. Use Chaos Mesh, Gremlin, or AWS FIS.
- **Start with "Chaos Tuesday"** – one hour per week of automated chaos experiments. Document findings as runbooks.
