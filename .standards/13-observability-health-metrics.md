# Observability & Health Metrics

## 1. Core Delivery Metrics (DORA)

| Metric | Target (Elite) |
|--------|----------------|
| Deployment frequency | Multiple times per day |
| Lead time for changes | < 1 hour |
| Change failure rate | < 15% |
| Mean time to recovery (MTTR) | < 1 hour |

## 2. Developer Experience (DevEx & SPACE)

- **SPACE framework:** Satisfaction, Performance, Activity, Communication, Efficiency.
- **DevEx three dimensions:**
  - **Flow state** – uninterrupted coding time
  - **Feedback loops** – time from commit to PR feedback
  - **Cognitive load** – survey (quarterly)
- **Action:** Review DevEx metrics monthly; if cognitive load is high, reduce WIP or simplify architecture.

## 3. Green Software / Carbon Awareness

- **Carbon intensity** of CI runs: schedule heavy jobs when grid carbon intensity is low (use Carbon Aware SDK).
- **Energy efficiency** of the application: measure CPU cycles per request.
- **Set a carbon budget** per service and alert if exceeded.

## 4. Chaos Engineering & Resilience Metrics

- **Chaos experiment success rate.**
- **Time to recover** from injected failures.
- **Run chaos experiments weekly** in staging; escalate any failure that takes > 5 minutes to auto‑recover.

## 5. Repository Health Metrics

| Metric | Source | Action |
|--------|--------|--------|
| Build pass rate | CI dashboard | Investigate if < 90% |
| Time to merge PR | GitHub/GitLab analytics | Target < 1 day |
| Code coverage trend | SonarQube, Codecov | Never let it drop |
| Dependency freshness | Renovate dashboard | Zero high‑severity alerts |
| Open security advisories | GitHub Security tab | Zero unaddressed > 7 days |
| Accessibility violations | Pa11y CI | Zero violations on critical paths |
| Technical debt ratio | SonarQube | Keep < 5% |
| SLO compliance | Observability dashboard | ≥ 99.9% for critical SLOs |
