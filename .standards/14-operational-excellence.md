# Operational Excellence (SLOs, Incident Response & Error Budgets)

## 1. Service Level Objectives (SLOs)

Define SLOs for every user-facing service. Start with one critical SLO (e.g., availability or latency).

| SLI | Example SLO |
|-----|-------------|
| Availability | 99.9% over 30 days |
| Latency (p95) | < 200 ms over 30 days |
| Error rate | < 1% of requests |
| Freshness (data pipelines) | 99.9% of records processed within 5 minutes |

- **Error budget:** The allowed amount of failure (e.g., 0.1% unavailability). When the budget is exhausted, freeze feature releases until reliability is restored.
- **SLOs are reviewed quarterly** with stakeholders and adjusted if they are too loose (never consumed) or too tight (constantly breached).

## 2. Alerting & Monitoring

- **Alert only on user‑impacting symptoms**, not on potential causes (e.g., alert on high latency, not high CPU). Use your SLO thresholds.
- **On‑call rotation** with primary and secondary responders. Follow the sun for global teams.
- **Alerting tools** (PagerDuty, Opsgenie) must be integrated with the observability stack.

## 3. Incident Management Process

1. **Declare an incident** via a dedicated channel (e.g., `#incidents`) with a severity level:
   - **SEV1:** Complete outage or data loss.
   - **SEV2:** Severe degradation (major feature broken).
   - **SEV3:** Minor degradation.
2. **Assign an Incident Commander (IC)** who coordinates the response (not necessarily the fixer).
3. **Mitigate first, investigate later.** Rollback, failover, or disable feature flags to restore service within the SLO window.
4. **Postmortem:** Conduct a **blameless postmortem** for every SEV1/SEV2 within 48 hours. Template in Appendix. Focus on process improvements, not individual blame.

## 4. Error Budget Policy

- **When budget is > 50%:** Normal feature releases proceed.
- **When budget is 20‑50%:** Reduce risky changes; focus on reliability.
- **When budget is < 20% (or exhausted):** Halt all feature work; only reliability and security fixes allowed. Communicate to stakeholders.
