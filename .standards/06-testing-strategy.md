# Testing Strategy

## 1. Test Pyramid → Honeycomb (for microservices)

| Layer          | Coverage Target | Speed    | Responsibility       |
|----------------|-----------------|----------|----------------------|
| Unit           | ≥ 80%           | < 10 ms  | Developer            |
| Integration    | Critical paths  | < 500 ms | Developer            |
| Component      | UI components   | < 1 s    | Developer            |
| Contract       | All consumers   | < 1 s    | API provider         |
| End-to-End     | Key user flows  | < 5 min  | QA / dedicated suite |

**For microservices:** favour integration tests (widest layer). For frontend applications: increase component tests (the "middle" of the honeycomb).

## 2. Behavior‑Driven Development (BDD)

- Write scenarios in **Gherkin** (Given/When/Then) before implementation.
- Scenarios must be **executable** (Cucumber, Behat, SpecFlow).
- **Living documentation:** Scenarios serve as acceptance criteria and regression tests.
- **AI can generate Gherkin** from user stories, but must be reviewed by a human.
- **Spec‑first CI gating:** Pipeline must fail if the implementation does not pass all BDD scenarios defined for that feature.

## 3. Test Doubles (Mocks vs. Stubs vs. Fakes)

| Double | What it does | When to use |
|--------|--------------|-------------|
| **Stub** | Provides canned answers, no invocation verification | Test pure query methods |
| **Mock** | Records how it was called (count, arguments) | Verify side‑effects, interactions |
| **Fake** | Lightweight working implementation (e.g., in‑memory database) | Avoid real external service |
| **Spy** | Wraps a real object, records calls | When you need both real behaviour and verification |

**Rule:** Mock only what you own. Never mock external APIs (use contract tests or stubs).

## 4. Performance Testing in CI

- **Baseline tests** at 5‑10% of expected peak load, run on every PR.
- **Thresholds** for p95 latency and error rate; fail CI if exceeded.
- **Heavy load tests** run nightly or on demand, not in PR pipeline.

## 5. Testing Principles

- **Tests are code.** They must be reviewed, maintained, and follow the same quality standards.
- **Deterministic.** No flaky tests. A flaky test must be quarantined and fixed within 24 hours.
- **Fast feedback.** Unit/integration suites run on every push; E2E runs on pull request.
- **Test data isolation.** Never rely on a shared mutable database.

## 6. Coverage Enforcement

- CI pipeline fails if coverage drops below the defined threshold.
- Coverage reports are published as CI artifacts and visible in the PR.
