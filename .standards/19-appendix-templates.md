# Appendix: Templates

## A. Pull Request Template (`.github/PULL_REQUEST_TEMPLATE.md`)

```markdown
## Description
<!-- Briefly describe what this PR does and why. -->

## Related Issue
Closes #<issue_number>

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Chore/refactor
- [ ] AI‑generated (significant portion)

## AI Declaration (if applicable)
- Model used: [e.g., Claude 4.5]
- Prompt hash: [optional]
- Reviewed by human for license compatibility: [Yes/No]

## Checklist
- [ ] I have read the [CONTRIBUTING](CONTRIBUTING.md) guide.
- [ ] My code follows the style guidelines of this project.
- [ ] I have performed a self-review.
- [ ] I have added tests that prove my fix/feature works.
- [ ] New and existing tests pass locally.
- [ ] I have updated documentation accordingly.
- [ ] Any dependent changes have been merged and published.
- [ ] I have added a changelog entry (if applicable).
- [ ] I have considered accessibility (if UI change).
- [ ] I have verified backward compatibility and database migration safety.

## Screenshots / Logs (if applicable)
```

## B. Architecture Decision Record (`docs/adr/template.md`)

```markdown
# [Title]

- **Status:** [proposed | accepted | deprecated | superseded]
- **Deciders:** [list of people]
- **Date:** [YYYY-MM-DD]

## Context and Problem Statement
[Describe the forces at play, including technical, business, and social.]

## Decision Drivers
- [driver 1]
- [driver 2]

## Considered Options
1. Option A
2. Option B

## Decision Outcome
Chosen option: **[Option X]**, because [justification].

### Positive Consequences
- ...

### Negative Consequences
- ...
```

## C. Threat Modeling Template (`docs/security/threat-model.md`)

```markdown
# Threat Model: [System/Component Name]

**Version:** 1.0
**Last Updated:** YYYY-MM-DD
**Owner:** [Team Name]

## Data Flow Diagram
[Link to diagram or description]

## STRIDE Analysis

| Component | Threat | Mitigation | Priority (High/Med/Low) |
|-----------|--------|------------|--------------------------|
| ...       | ...    | ...        | ...                      |

## Mitigation Backlog
- [ ] [Issue link] - High
- [ ] [Issue link] - Medium

## Review Cadence
Next review: [YYYY-MM-DD] (after major feature change or annually)
```

## D. BDD Scenario Template (`tests/features/example.feature`)

```gherkin
Feature: [Feature Name]
  As a [role]
  I want [goal]
  So that [benefit]

  Scenario: [Scenario name]
    Given [initial context]
    When [action]
    Then [expected outcome]
```

## E. Incident Postmortem Template (`docs/postmortems/template.md`)

```markdown
# Postmortem: [Incident Title]

- **Date:** YYYY-MM-DD
- **Severity:** SEV1 / SEV2
- **Duration:** [start] to [end] UTC
- **Authors:** [Names]
- **Status:** Draft / Final

## Summary
[One‑line description of what happened and customer impact.]

## Timeline (UTC)
| Time | Event |
|------|-------|
| ...  | ...   |

## Root Cause
[What caused the incident?]

## Contributing Factors
- [Anything that made it worse or harder to detect.]

## Resolution
[What actions were taken to mitigate?]

## Detection
- How was the incident discovered? (monitoring alert, user report, etc.)
- Could it have been detected earlier?

## Action Items
- [ ] [Preventative measure] – owner, due date
- [ ] [Monitoring improvement] – owner, due date
```
