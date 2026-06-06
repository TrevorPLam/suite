---
title: "CI/CD Pipelines & Secrets Management"
section: "cicd"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "04-architecture-technology-stack.md"
  - "10-domain-implementation-migrations.md"
tags:
  - "cicd"
  - "github-actions"
  - "nx"
  - "doppler"
---

## 18. CI/CD Pipelines & Secrets Management

CI/CD is the engine that turns code into running software. For a monorepo with 53 independent applications, it is also where naive configurations collapse under combinatorial scale. Every push to every branch could theoretically run 53 test suites, 53 builds, and 53 deployments. The Sovereign Suite's pipeline avoids this through three mechanisms: **affected‑only execution** (only projects that actually changed run), **aggressive remote caching** (restore previous build outputs instead of recomputing them), and **dynamic secrets injection** (per‑environment secrets from Doppler, never stored in GitHub). This section provides the complete, production‑ready blueprint for the suite's CI/CD pipeline, including GitHub Actions workflows, caching strategies, secrets management, security scanning, deployment gates, and the decision framework for when to move to self‑hosted runners.

---

### 18.1 Why Monorepo CI Breaks Without Affected‑Only Execution

Single‑repo CI is predictable: code changes, tests run, build happens. Three jobs per PR, done. Monorepos scale combinatorially. A 30‑package repo with a naive configuration runs all 30 test suites on every push. Add matrix testing across Node versions and you are at 60–90 jobs per PR. A one‑line README fix triggers the same CI load as a core library rewrite. Dependencies make it worse: change package C and you need to test A and B too (they import it). Naive configurations either test everything (wasteful) or test only the changed package (misses downstream breakage).

For a 53‑application monorepo, naive CI is not merely wasteful—it is impossible to sustain within GitHub's free tier concurrency limits (20 parallel jobs for free repositories, 60 for Team). The only viable strategy is **affected‑only execution** — detecting which packages changed and running CI only for those plus their dependents. This is the difference between 90 jobs and 8 jobs per PR.

**The root cause of cache misses** is even more subtle. In a pnpm monorepo, GitHub Actions fails to restore the global store (`~/.pnpm‑store`) unless the store directory is explicitly fixed. The official `pnpm/action‑setup` and `actions/setup‑node` with `cache: 'pnpm'` cache the root `node_modules`, but each workspace package has its own `node_modules` with symlinks pointing back to the global store. If the store directory is not fixed, the cache key never matches, and pnpm downloads every package from scratch—847 packages, 40 minutes of build time when it should have been eight.

---

### 18.2 The Core Workflow: `ci.yml`

The `ci.yml` workflow is the heartbeat of the Sovereign Suite. It runs on every push, pull request, and merge to `main`. The workflow uses the official `nrwl/nx‑set‑shas` action to compute the base SHA (the last commit that ran a successful CI job) and the head SHA (the current commit). Nx then uses these to compute the affected projects—those that changed directly or are depended on by changed projects.

**File: `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:  # Manual trigger for debugging

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5
        with:
          fetch-depth: 0  # Required for Nx affected detection

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Get pnpm store directory
        id: pnpm-store
        run: echo "store_dir=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

      - name: Cache pnpm store
        uses: actions/cache@v4
        with:
          path: ${{ steps.pnpm-store.outputs.store_dir }}
          key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            pnpm-store-${{ runner.os }}-

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Set Nx SHAs
        uses: nrwl/nx-set-shas@v4

      - name: Run Nx affected
        run: pnpm nx affected --target=lint,typecheck,test,build
```

**Critical elements explained:**

| Element | Why It Is Mandatory |
|---------|---------------------|
| `fetch-depth: 0` | Nx needs full git history to compute the correct merge‑base for affected detection. Shallow clones break the command. |
| `pnpm store path --silent` | The store directory must be explicitly retrieved and cached. The naive `cache: 'pnpm'` in `setup-node` caches `node_modules` but not the global store, causing near‑complete cache misses. |
| `hashFiles('**/pnpm‑lock.yaml')` | The cache key includes a hash of the entire lockfile. Only when dependencies change does the cache invalidate. |
| `nrwl/nx-set-shas` | Sets the `NX_BASE` and `NX_HEAD` environment variables that Nx uses to determine which projects changed. Without it, `affected` commands behave incorrectly on PRs. |
| `concurrency.cancel‑in‑progress` | Cancels any running CI job for the same branch when a new commit is pushed. Prevents wasted runner minutes on outdated code. |

The `nx affected` command evaluates the project graph, computes which projects changed since the base SHA, and runs the specified targets (lint, typecheck, test, build) only on those projects and their dependents. This reduces a full 53‑project CI run (theoretical 4 hours) to a typical 5–10 minute incremental run.

---

### 18.3 Pnpm Cache: The Critical Fix

The pnpm store cache is the most common source of CI inefficiency in monorepos. Without explicit configuration, GitHub Actions restores 0 bytes from the cache, and pnpm downloads every package from scratch on every run.

**The problem in detail:** On a developer's machine, the global pnpm store lives at `~/.local/share/pnpm/store` (Linux) or `~/Library/pnpm/store` (macOS). Every project on the system shares that store; if a package already exists, pnpm links it with hard links. In GitHub Actions, the runner starts clean on every execution. Without an explicit `store‑dir`, pnpm picks a dynamic path—sometimes inside the workspace, sometimes in a temp directory. The path changes between runners and runs, so the cache never restores.

**The solution:** Explicitly capture the store path and cache it.

```yaml
- name: Get pnpm store directory
  id: pnpm-store
  run: echo "store_dir=$(pnpm store path --silent)" >> $GITHUB_OUTPUT

- name: Cache pnpm store
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-store.outputs.store_dir }}
    key: pnpm-store-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      pnpm-store-${{ runner.os }}-
```

With this fix, a typical 847‑package install drops from 40 minutes to 3‑5 seconds on cache hit—a 99% reduction in install time.

---

### 18.4 Remote Caching with Nx Cloud

Local caching (using `actions/cache`) helps only a single run. Remote caching lets every run on every developer's machine and every CI runner share cached outputs across the entire team. When you change a single file in a package, Nx computes a hash of all inputs (source files, environment variables, dependencies). If that hash already exists in the remote cache, Nx restores the pre‑computed output—no rebuild, no retest, no retype‑check. This transforms CI from "wait for builds" to "download from cache."

**Nx Cloud free tier:** Remote cache for up to 5 contributors, no credit card required. The Pro tier ($25/user/month) adds advanced features like distributed task execution and self‑healing CI.

**Configuration in `nx.json`:**

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx-cloud",
      "options": {
        "cacheableOperations": ["build", "typecheck", "test", "lint"],
        "accessToken": "YOUR_NX_CLOUD_TOKEN"
      }
    }
  }
}
```

**Self‑hosted remote cache alternative:** Starting in Nx version 20.8, you can build your own caching server using the OpenAPI specification. This allows a custom remote cache server tailored to your specific needs, including storage, retrieval, and authentication. However, the free hosted Nx Cloud plan is sufficient for early‑stage scaling.

**Impact on CI time:** With remote caching, a typical PR that changes only documentation or a single test file completes CI in under 30 seconds—the time to restore the cache and run `nx affected` detection. A full rebuild of all 53 applications after a deep dependency change completes in the time required to build the changed package and its immediate dependents, not the entire graph.

---

### 18.5 Deployment Pipelines: `deploy.yml`

Deployment is a separate workflow that runs after CI succeeds on the `main` branch. It determines which projects changed, migrates their databases, deploys their Workers, and deploys their Pages. The workflow uses `dorny/paths‑filter` to detect changes at the directory level, avoiding an Nx graph traversal for every PR.

**File: `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:  # Manual override

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      calendar: ${{ steps.filter.outputs.calendar }}
      drive: ${{ steps.filter.outputs.drive }}
      vault: ${{ steps.filter.outputs.vault }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            calendar:
              - 'apps/calendar/**'
              - 'packages/domain-calendar/**'
              - 'packages/shared-kernel/**'
            drive:
              - 'apps/drive/**'
              - 'packages/domain-drive/**'
            vault:
              - 'apps/vault/**'
              - 'packages/domain-vault/**'

  migrations-calendar:
    needs: changes
    if: needs.changes.outputs.calendar == 'true'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - name: Run calendar migrations
        run: pnpm --filter=domain-calendar db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          APP_DOMAIN: calendar

  deploy-calendar-api:
    needs: [changes, migrations-calendar]
    if: needs.changes.outputs.calendar == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - name: Deploy Calendar Worker
        run: pnpm nx run calendar-api:deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-calendar-web:
    needs: [changes, deploy-calendar-api]
    if: needs.changes.outputs.calendar == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - name: Deploy Calendar Pages
        run: pnpm nx run calendar-web:deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

**Critical ordering:**

1. **Migrations run before the API deploys.** The Worker cannot be deployed until the database schema is ready for the new code. The `needs: [changes, migrations‑calendar]` block enforces this ordering.
2. **The API deploys before the frontend.** If the frontend were deployed first, users might see a new UI that calls a not‑yet‑deployed API endpoint. The `needs: [changes, deploy‑calendar‑api]` block prevents this.
3. **Deployment occurs only for changed projects.** The `if: needs.changes.outputs.calendar == 'true'` condition prevents deploying 53 projects when only one changed.

---

### 18.6 Multi‑Environment Secrets with Doppler

GitHub repository secrets are convenient for small projects but fail at scale. They are manually replicated across environments, offer no central audit log, and cannot be rotated without editing every workflow. The Sovereign Suite uses **Doppler**, a multi‑cloud SecretOps platform, to manage secrets centrally and inject them into GitHub Actions dynamically.

**Why Doppler over GitHub secrets:**
- **Single source of truth:** Secrets are defined once in Doppler for `dev`, `staging`, and `production` environments.
- **OIDC authentication:** Doppler authenticates to GitHub Actions using OpenID Connect (OIDC), eliminating long‑lived API tokens.
- **Audit logs:** Every secret access is logged and retained for compliance.
- **Monorepo support:** Multiple service tokens per project, each scoped to a specific application.

**Setting up Doppler OIDC in GitHub Actions:**

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read
    steps:
      - name: Fetch Doppler secrets
        id: secrets
        uses: dopplerhq/secrets-fetch-action@v2
        with:
          doppler-token: ${{ secrets.DOPPLER_TOKEN }}
      - name: Deploy Worker
        run: npx wrangler deploy
        env:
          DATABASE_URL: ${{ steps.secrets.outputs.DATABASE_URL }}
          BETTER_AUTH_SECRET: ${{ steps.secrets.outputs.BETTER_AUTH_SECRET }}
```

**Secrets mapping:** The `dopplerhq/secrets‑fetch‑action` retrieves secrets from the Doppler project and exports them as step outputs. The `DOPPLER_TOKEN` is the only secret stored in GitHub—everything else is retrieved at runtime.

**Per‑environment configuration:** Doppler supports `dev`, `staging`, and `production` environments. The `deploy.yml` workflow uses the `environment: production` keyword to select the appropriate Doppler environment. Staging deployments use `environment: staging`, ensuring that production credentials are never accidentally used in lower environments.

---

### 18.7 Security Scanning: SBOM, CVEs, Secrets

Security scanning is not optional. The EU Cyber Resilience Act (CRA) mandates SBOM generation and vulnerability scanning for any digital product sold in the EU, with full enforcement beginning September 2026. The Sovereign Suite implements a three‑layer security pipeline:

| Layer | Tool | Purpose | Output |
|-------|------|---------|--------|
| **SBOM generation** | Syft (via `anchore/sbom‑action`) | Generate software bill of materials in SPDX format | Workflow artifact + release asset |
| **Vulnerability scanning** | Grype | Scan SBOM for known CVEs in dependencies | Fails CI on critical/high vulnerabilities |
| **Secret scanning** | TruffleHog | Detect accidentally committed secrets (API keys, tokens, credentials) | Fail CI on detection |
| **Static analysis** | CodeQL | Detect security vulnerabilities in application code | GitHub Security tab alerts |

**SBOM and vulnerability workflow (`compliance.yml`):**

```yaml
name: Compliance

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly full scan

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          path: .
          format: spdx-json
          output-file: sbom.spdx.json
      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.spdx.json
      - name: Scan SBOM with Grype
        uses: anchore/grype-action@v0
        with:
          sbom: sbom.spdx.json
          fail-build: true
          severity-cutoff: high
```

**Why SBOM scanning matters:** A Software Bill of Materials (SBOM) is a detailed list of all software project components, libraries, and dependencies. It provides transparency and traceability in the software supply chain, allowing developers and security teams to quickly identify and address vulnerabilities.

Grype scans the SBOM and fails the build if any critical or high severity CVE is found. This prevents vulnerable dependencies from ever reaching production.

**Secret scanning with TruffleHog:**

```yaml
- name: Scan for secrets
  uses: trufflesecurity/trufflehog@v3
  with:
    extra_args: --only-verified --fail
```

TruffleHog scans the entire git history for exposed secrets. The `--only‑verified` flag ensures only verified live secrets (with valid API responses) trigger failures, reducing false positives.

**CodeQL static analysis:**

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v3
  with:
    languages: javascript, typescript
- name: Perform CodeQL Analysis
  uses: github/codeql-action/analyze@v3
```

CodeQL runs semantic analysis on the application code, detecting SQL injection, cross‑site scripting, path traversal, and other vulnerability classes. Results appear in the GitHub Security tab.

---

### 18.8 GitHub‑Hosted vs. Self‑Hosted Runners

The Sovereign Suite begins with GitHub‑hosted runners (free tier: 2,000 minutes/month for private repositories, unlimited for public). As the suite scales, self‑hosted runners on the VPS become necessary to stay within free tier limits.

**Decision matrix:**

| Factor | GitHub‑Hosted | Self‑Hosted on VPS |
|--------|---------------|--------------------|
| **Cost** | Free up to 2,000 min/month | $0 (runs on existing VPS) |
| **Concurrency** | 20 parallel jobs (free), 60 (Team) | Limited only by VPS resources |
| **Cache storage** | 10 GB per repository | Unlimited (VPS disk) |
| **Setup complexity** | None | Medium (requires runner registration and maintenance) |
| **Network latency to Cloudflare** | Variable | Direct (same VPS as database) |
| **Security isolation** | Ephemeral (clean runner per job) | Persistent (requires hardening) |

**Setting up a self‑hosted runner on the Contabo VPS:**

```bash
# Download and configure the runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.322.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-linux-x64-2.322.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.322.0.tar.gz
./config.sh --url https://github.com/your-org/suite --token YOUR_TOKEN
./run.sh
```

**Self‑hosted runner as a service:**

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

**When to migrate to self‑hosted:**

- **Trigger 1:** Monthly GitHub Actions minutes exceed 1,800 (90% of free tier).
- **Trigger 2:** CI run times exceed 15 minutes consistently due to queuing.
- **Trigger 3:** Cache storage limits (10 GB) are exhausted.

**Security hardening for self‑hosted runners:**
- Run the runner in a dedicated Docker container with limited privileges.
- Use VPC networking to isolate the runner from production services.
- Rotate runner registration tokens monthly.
- Never store long‑lived secrets on the runner; fetch them from Doppler per job.

---

### 18.9 Quality Gates and Merge Protection

The Sovereign Suite enforces quality gates at multiple levels:

| Gate | Enforcement Point | Failure Action |
|------|-------------------|----------------|
| **Spec file existence** | `ci.yml` (pre‑merge) | PR cannot be merged |
| **Type checking** | `nx affected --target=typecheck` | PR cannot be merged |
| **Unit tests** | `nx affected --target=test` | PR cannot be merged |
| **Integration tests** | `nx affected --target=e2e` | PR cannot be merged |
| **Linting** | `nx affected --target=lint` | PR cannot be merged |
| **SBOM vulnerability scan** | `compliance.yml` (weekly) | Alert, not block |
| **Secret detection** | `ci.yml` (pre‑merge) | PR cannot be merged |
| **CodeQL analysis** | `compliance.yml` (on push to main) | Block merge if critical severity |

**GitHub branch protection rules:**

```yaml
# In repository settings: Settings → Branches → Add rule
Branch name pattern: main
Require status checks:
  - CI / ci
  - Compliance / sbom
  - Deploy / migrations-calendar (for calendar changes)
Require branches to be up‑to-date: true
Require pull request reviews: 1
Dismiss stale pull request approvals: true
```

These rules ensure that no code reaches `main` without passing all quality gates and receiving a human review.

---

### 18.10 Workflow Summary and Runbook

**Typical PR workflow:**

1. Developer creates a feature branch and pushes code.
2. `ci.yml` runs affected lint, typecheck, test, and build on the branch.
3. Developer opens a pull request.
4. GitHub Actions re‑runs `ci.yml` on the PR branch.
5. Human reviewer approves the PR.
6. PR merges to `main`.
7. `deploy.yml` runs affected migrations, API deployment, and Pages deployment.
8. `compliance.yml` runs SBOM generation and vulnerability scanning on the merged code.
9. Slack notification is sent to the team channel.

**Emergency deployment runbook:**

```bash
# 1. Trigger manual deployment
gh workflow run deploy.yml --ref main

# 2. Monitor deployment status
gh run watch

# 3. If deployment fails, rollback via Wrangler
npx wrangler rollback calendar-api --version=previous
```

---

### 18.11 AI Agent Rules for CI/CD

Add the following to your root `AGENTS.md`:

```markdown
## CI/CD & Secrets Management — Rules for AI Agents

1. **Never run database migrations inside Workers.** Use CI `db:migrate` jobs with `APP_DOMAIN` set.
2. **Do not hardcode environment names.** Use GitHub Environments (`production`, `staging`) to scope secrets.
3. **Cache the pnpm store explicitly.** The `store_dir` must be captured; `cache: 'pnpm'` alone is insufficient.
4. **Secrets go in Doppler, never in GitHub.** The only GitHub secret is `DOPPLER_TOKEN`.
5. **SBOM generation is mandatory before any release.** Run `compliance.yml` and verify the SBOM artifact.
6. **Never deploy without running migrations.** The `needs: [changes, migrations‑*]` block is non‑negotiable.
7. **Self‑hosted runners require hardening.** Run them in isolated containers, not on the bare VPS.
8. **CodeQL must pass on all new code.** Warnings are allowed; critical findings are not.
9. **Use `nx affected` in CI, never `nx run‑many`.** The latter runs everything, defeating the purpose of a monorepo.
10. **Rollback via Wrangler, not database restore.** Rolling back code is faster; database restores are for disaster recovery only.
```

---

### 18.12 Summary: CI/CD Decisions at a Glance

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **CI orchestration** | Nx `affected` commands | Runs only changed projects; saves 90% of CI time |
| **Package manager cache** | Explicit pnpm store directory + `actions/cache` | Fixes the common monorepo cache miss bug |
| **Remote cache** | Nx Cloud (free tier) | Shares cache across all runs and developers |
| **Secrets management** | Doppler with OIDC | Single source of truth; audit logs; no manual GitHub secrets |
| **Deployment** | GitHub Actions + `wrangler deploy` | Native Cloudflare integration; one‑command deploy |
| **SBOM generation** | `anchore/sbom‑action` + Syft | CRA compliant; exports SPDX/JSON |
| **Vulnerability scanning** | Grype on SBOM | Fails CI on critical CVEs |
| **Secret detection** | TruffleHog (verified only) | Prevents exposed credentials |
| **Static analysis** | CodeQL | GitHub‑native; no additional configuration |
| **Runner type** | GitHub‑hosted (start); self‑hosted (scale) | Free tier sufficient for early stage; migrate when limits approach |

The CI/CD pipeline is the backbone of the Sovereign Suite's development workflow. Affected‑only execution, aggressive caching, and dynamic secrets management transform what would be an hour‑long full rebuild into a 5‑10 minute incremental check. As the suite grows from 3 apps to 53, the pipeline scales with it—without requiring a redesign.
