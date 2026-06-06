# Code Review Process

## 1. Pull Request Requirements

- Template must be filled out (see Appendix).
- Automated checks must pass.
- At least one approving review from a CODEOWNER.
- All conversations resolved.
- Branch up-to-date with `main` (via rebase or merge commit, depending on policy).

## 2. Review Speed SLA

| Priority | First Response | Merge Target |
|----------|----------------|--------------|
| Critical | < 1 hour        | < 2 hours    |
| High     | < 4 hours       | < 1 day      |
| Medium   | < 1 day         | < 2 days     |
| Low      | < 2 days        | < 5 days     |

## 3. Reviewer Checklist

- [ ] **Logic & correctness:** Does it solve the problem?
- [ ] **Security:** Any injection risks, exposed secrets, dangerous dependencies?
- [ ] **Performance:** N+1 queries, unbounded loops, memory leaks?
- [ ] **Tests:** Adequate coverage? New edge cases handled? BDD scenarios updated?
- [ ] **Observability:** Are logs/metrics added?
- [ ] **Documentation:** API changes documented? ADR if needed?
- [ ] **Backward compatibility:** Breaking changes flagged and communicated?
- [ ] **Database:** Schema changes follow the expand/contract pattern?

## 4. AI‑Assisted Code Review

- **Automated static analysis** (SonarQube, CodeQL) must run on every PR.
- **Architecture rule enforcement** using tools like `archunit` (Java) or `lint` rules for custom patterns.
- **AI reviewers** (e.g., `reviewdog` + LLM) can flag common issues, but final approval must be human.
- **Learning from past PRs:** Use tools that refine rules based on merge decisions.

## 5. Review Culture

- Be kind, assume competence. Critique the code, not the person.
- Provide actionable suggestions, not just "this is wrong".
- Small PRs (< 400 lines) are strongly preferred; large PRs must be justified and may require a synchronous walkthrough.
