---

## 19. Compliance & GDPR

Compliance is a competitive advantage for a zero‑knowledge suite. The architecture is **compliance by design**: E2EE, cryptographic erasure, and automated audit workflows are built in, not bolted on.

### 19.1 Regulatory Landscape

| Framework | Key Obligations | Deadline | Status |
|-----------|-----------------|----------|--------|
| **GDPR** | Erasure (Art. 17), protection by design (Art. 25), breach notification (72 h) | Active | Core |
| **CRA** | SBOM, vulnerability reporting (24 h), VEX | Sept 2026 / Dec 2027 | Critical |
| **eIDAS 2.0** | EUDI Wallet acceptance | Dec 2027 | Strategic |
| **SOC 2** | Security, availability, confidentiality controls | On request | Enterprise |
| **HIPAA** | PHI safeguards, BAAs | Future | Health & Fitness app scoped out until legal team exists |
| **CCPA/CPRA** | Right to delete, opt‑out | Active | Zero‑knowledge design already satisfies most |

> See [99-research-pipeline.md](99-research-pipeline.md) for eIDAS 2.0 and SOC 2 deep dives.

---

### 19.2 GDPR: Cryptographic Erasure

**Key insight:** Destroying encryption keys is legally equivalent to deleting data under GDPR Art. 17, provided keys are unrecoverable.

**Erasure process:**
1. Delete `user_encryption_keys` row → all domain keys unrecoverable.
2. Delete `key_escrow` shares → recovery impossible.
3. Pseudonymise metadata (`email` → `deleted_<id>@deleted.local`).

Encrypted blobs remain in DB/R2 but are permanently inaccessible. This satisfies GDPR because the data is no longer "personal data" (cannot be associated with an individual) and the controller lacks the means to access it.

```typescript
// apps/auth/api/src/routes/erasure.ts
app.delete('/api/user/erase', requireAuth, async (c) => {
  const userId = c.get('userId');
  await db.transaction(async (tx) => {
    await tx.delete(userEncryptionKeysTable).where(eq(userEncryptionKeysTable.userId, userId));
    await tx.delete(keyEscrowTable).where(eq(keyEscrowTable.userId, userId));
    await tx.update(usersTable)
      .set({ email: `deleted_${userId}@deleted.local`, name: null, deletedAt: new Date() })
      .where(eq(usersTable.id, userId));
    await tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    await tx.delete(auditLogsTable).where(
      and(eq(auditLogsTable.userId, userId), lt(auditLogsTable.createdAt, subDays(new Date(), 30)))
    );
    await queueR2Deletion(userId);
  });
  return c.json({ message: 'Erasure accepted. Data will be deleted within 24 hours.' });
});
```

**Retention:** Audit logs kept 30 days, then deleted. Logs >30 days: pseudonymise `user_id` to preserve forensic patterns.

### 19.3 Data Protection by Design (Art. 25)

| Requirement | Implementation |
|-------------|---------------|
| Data minimisation | Collect only necessary fields per app |
| Purpose limitation | Documented per table; no repurposing without new legal basis |
| Storage limitation | Automated deletion policies enforce retention |
| Integrity & confidentiality | E2EE (`@suite/crypto`), TLS 1.3, RLS |
| Accountability | Immutable audit trail |

### 19.4 DPIA & RoPA

**DPIA:** Living document updated when adding apps/features that process high‑risk data (health, biometrics, systematic monitoring). Must exist before first EU user signs up.

**RoPA (`compliance.processing_activities`):**

```sql
CREATE TABLE compliance.processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  controller_name TEXT NOT NULL DEFAULT 'Sovereign Suite',
  data_subject_categories TEXT[] NOT NULL,
  personal_data_categories TEXT[] NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  retention_period INTERVAL NOT NULL,
  data_sharing TEXT[] NOT NULL,
  safeguards TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

CI checks that every new personal‑data table has a RoPA entry before merge.

### 19.5 DSARs

| Right | Endpoint |
|-------|----------|
| Access | `GET /api/user/data/export` (JSON; blobs remain encrypted) |
| Rectification | `PATCH /api/user/profile` |
| Restriction | `POST /api/user/restrict` |
| Portability | `GET /api/user/data/portable` (JSON/CSV) |

30‑day response timeline; automated tracking and escalation.

### 19.6 Breach Notification

- **Detection:** Honeytokens + anomaly detection on query patterns.
- **24h:** Notify ENISA (CRA channel).
- **72h:** Notify DPA via standardised form.
- **Without undue delay:** Notify affected subjects if high risk.

### 19.7 CRA

| Deadline | Obligation |
|----------|------------|
| Sept 2026 | 24‑hour reporting of exploited vulnerabilities to ENISA |
| Dec 2027 | Full compliance: SBOM, VEX, CE marking, secure‑by‑design |

**Implementation:** Automated incident response workflow (PagerDuty + ENISA API); pre‑populated templates; weekly SBOM generation (`compliance.yml`); VEX statements for all CVEs.

### 19.8 Data Localisation (Cloudflare DLS)

Cloudflare DLS (Enterprise) can restrict EU traffic to EU data centres. For early‑stage EU customers, Cloudflare’s standard GDPR compliance is sufficient. Evaluate DLS when EU user count exceeds 1,000.

### 19.9 Compliance Automation

`.github/workflows/compliance.yml` runs weekly + on push to `main`:
- Generate SBOM (SPDX + CycloneDX)
- Grype scan with `severity-cutoff: high`
- Generate VEX statements
- Validate RoPA completeness
- Check DPIA recency (warn if >3 months)

### 19.10 Privacy Policy & DPA

Privacy policy must be plain‑language, layered, versioned, and include:
- Identity/contact of controller
- Processing purposes and legal bases
- Retention periods
- Data subject rights
- Sub‑processors (Cloudflare, Contabo, Doppler, Stripe)
- Automated decision‑making disclosures

**DPA (Art. 28):** Required for enterprise customers. Covers subject matter, nature/purpose, data types, TOMs, sub‑processors, audit rights, and return/deletion on termination.

### 19.11 AI Agent Rules for Compliance

1. Never store plaintext personal data. Encrypt with `@suite/crypto`.
2. Every new personal‑data table must have a RoPA entry.
3. DPIA reviewed every 3 months or when adding processing activities.
4. Erasure is cryptographic (delete keys, not every blob).
5. Audit logs: 30 days only; older logs pseudonymised.
6. Breach notification: 24h ENISA, 72h DPA.
7. SBOM generated weekly; `compliance.yml` must pass.
8. VEX statements mandatory for all CVEs.
9. Privacy policy versioned; changes communicated to users.
10. DPA required for enterprise customers.

### 19.12 EAA (Accessibility)

WCAG 2.1 AA for all web/mobile apps. Axe‑Core in CI. Manual a11y audits per feature. Screen‑reader testing (VoiceOver, NVDA). Keyboard navigation mandatory. High‑contrast theme.

Microenterprise exemption may apply (<10 employees, <€2M turnover), but pursue conformance regardless.

### 19.13 Summary

| Framework | Key Obligation | Implementation | Evidence |
|-----------|---------------|----------------|----------|
| GDPR | Erasure (Art. 17) | Cryptographic key deletion | Key deletion logs |
| GDPR | Protection by design (Art. 25) | E2EE, RLS, minimisation | DPIA, RoPA |
| GDPR | Breach notification (Art. 33) | Automated 72‑h workflow | Breach logs, ENISA receipts |
| CRA | Vulnerability reporting (Art. 14) | 24‑h ENISA, VEX | SBOMs, VEX, incident reports |
| CRA | SBOM (Art. 13) | Weekly generation | `compliance.yml` artifacts |
| eIDAS 2.0 | EUDI Wallet | OIDC integration | Wallet logs |
| SOC 2 | Controls | Documented in 19.5 | Type I report (future) |
| HIPAA | PHI | Out of scope v1 | Exclusion statement |

---

**[End of Section 19 — Next: Section 20: Development Environment & AI Tools]**