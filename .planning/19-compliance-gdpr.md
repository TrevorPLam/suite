---
title: "Compliance & GDPR"
section: "compliance"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "05-core-packages-shared-packages.md"
  - "16-disaster-recovery-key-escrow.md"
tags:
  - "compliance"
  - "gdpr"
  - "cra"
  - "soc2"
---

## 19. Compliance & GDPR

For a zero‑knowledge productivity suite, compliance is not a checkbox—it is a competitive advantage. The Sovereign Suite competes with Google Workspace and Microsoft 365 not by ignoring regulations, but by exceeding them. This section documents the overlapping regulatory frameworks that apply to the suite, the specific engineering decisions that demonstrate compliance, and the operational workflows that turn legal obligations into automated, auditable processes.

The approach is **compliance by design**: every architectural decision in Sections 1–18 has been made with GDPR, CRA, eIDAS 2.0, and SOC 2 in mind. The result is not a separate compliance layer bolted on after the fact, but a system that is inherently auditable, erasure‑ready, and secure by default.

---

### 19.1 The Regulatory Landscape at a Glance

| Framework | Applicability | Key Obligations | Enforcement Deadline | Relevance to Sovereign Suite |
|-----------|--------------|-----------------|----------------------|------------------------------|
| **GDPR (EU)** | Any processing of EU residents' personal data | Right to erasure (Art. 17), data protection by design (Art. 25), DPIA (Art. 35), breach notification (72 h), data portability | Enforced since 2018 | **Core** — Every user in the EU is a data subject |
| **Cyber Resilience Act (CRA)** (EU) | Products with digital elements placed on the EU market | SBOM generation, vulnerability reporting (24 h for exploited), VEX documentation, secure‑by‑design | Sept 11, 2026 (reporting); Dec 11, 2027 (full) | **Critical** — The Sovereign Suite is a "product with digital elements" sold in the EU |
| **eIDAS 2.0** (EU) | Regulated industries accepting digital identities | Mandatory acceptance of EUDI Wallets for Strong Customer Authentication by Dec 2027 | Dec 2026 (member states issue wallets); Dec 2027 (mandatory acceptance) | **Strategic** — Enables the Sovereign Suite to act as an identity provider (#18) and accept EU‑issued digital identities |
| **SOC 2** (International) | B2B SaaS sold to enterprises | Security, availability, processing integrity, confidentiality, privacy controls | Required for enterprise sales | **Enterprise** — Required for contracts with organisations requiring audited security controls |
| **HIPAA** (US) | Handling protected health information (PHI) | Administrative, physical, and technical safeguards; BAAs; audit logs | Continuous | **Future** — The Health & Fitness app (#44) must be HIPAA‑compliant or scoped out |
| **CCPA/CPRA** (California) | Businesses serving California residents | Right to delete, right to opt‑out of "sale" of personal information, right to correct | Enforced since 2020 | **Supporting** — The suite's zero‑knowledge design already satisfies most CCPA requirements |

---

### 19.2 GDPR: The Zero‑Knowledge Compliance Challenge

GDPR's **right to erasure** (Article 17) and **data protection by design** (Article 25) are the two provisions that most directly test the Sovereign Suite's zero‑knowledge architecture. The EDPB published its 2025 report on the right to erasure, reviewing how the right is applied across the EU, and the 2026 Coordinated Action on the Right to be Forgotten emphasises that compliance is now measured "in terms of the actual organisational and technological capacity to ensure the effective and definitive erasure of data". The regulator is no longer satisfied with formal policies; it demands demonstrated technical capability.

**The key insight for zero‑knowledge systems:** Cryptographic erasure (destroying the encryption key) is legally equivalent to deletion of the underlying data, provided the key is not recoverable and the data is rendered permanently inaccessible. This principle has been recognised in GDPR guidance on encryption and is the legal foundation for the Sovereign Suite's erasure strategy. The SoK (Systematization of Knowledge) on cryptographic erasure confirms that discarding decryption keys satisfies Article 17 obligations when the key is not recoverable. The EDPB's guidance on encryption explicitly references the right to erasure and how it applies when determining encryption use and retention.

#### 19.2.1 Cryptographic Erasure Implementation

The Sovereign Suite implements erasure through a three‑step process:

**Step 1 — Delete the user's encryption keys.** The `user_encryption_keys` table, which stores the wrapped user key (encrypted with the user's master password), is permanently deleted. Without this key, all domain keys derived via HKDF are unrecoverable.

**Step 2 — Destroy key escrow shares.** The `key_escrow` table entries for the user are deleted. Without the recovery secret (held only by the user), the escrow shares cannot reconstruct the account key even if they were recovered from a backup.

**Step 3 — Delete or pseudonymise metadata.** User‑identifiable metadata (email address, name, billing information, IP logs) is either deleted or pseudonymised with a one‑way salt that is destroyed, making re‑identification impossible.

**What remains after erasure:** Encrypted blobs in the database and R2 become inaccessible because the keys are gone. The blobs themselves are not deleted—they are cryptographically shredded. This is compliant with GDPR because the data is no longer "personal data" (it cannot be associated with an identifiable individual) and is practically inaccessible. The EDPB's guidance confirms that data is considered erased when the controller no longer has the means to access it.

**Implementation in Hono (API endpoint):**

```typescript
// apps/auth/api/src/routes/erasure.ts
app.delete('/api/user/erase', requireAuth, async (c) => {
  const userId = c.get('userId');
  const db = c.get('db');

  // 1. Begin transaction
  await db.transaction(async (tx) => {
    // 2. Delete encryption keys
    await tx.delete(userEncryptionKeysTable).where(eq(userEncryptionKeysTable.userId, userId));
    // 3. Delete key escrow shares
    await tx.delete(keyEscrowTable).where(eq(keyEscrowTable.userId, userId));
    // 4. Delete or pseudonymise user record
    await tx.update(usersTable)
      .set({ email: `deleted_${userId}@deleted.local`, name: null, deletedAt: new Date() })
      .where(eq(usersTable.id, userId));
    // 5. Delete sessions and OAuth tokens
    await tx.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    await tx.delete(accountsTable).where(eq(accountsTable.userId, userId));
    // 6. Delete audit logs after retention period (30 days)
    await tx.delete(auditLogsTable).where(
      and(eq(auditLogsTable.userId, userId), lt(auditLogsTable.createdAt, subDays(new Date(), 30)))
    );
    // 7. Queue R2 object deletion (async, best effort)
    await queueR2Deletion(userId);
  });

  return c.json({ message: 'Erasure request accepted. Your data will be deleted within 24 hours.' });
});
```

**Retention of audit logs:** GDPR does not strictly require deletion of audit logs that are necessary for security investigations or legal compliance. The Sovereign Suite retains audit logs for 30 days, after which they are deleted. For logs older than 30 days, the user ID is pseudonymised (replaced with a non‑reversible hash), making re‑identification impossible while preserving forensic value for detecting patterns of abuse.

**Erasure request workflow:** The API endpoint logs the request, initiates the deletion transaction, and returns a `202 Accepted` response. The actual deletion of R2 objects happens asynchronously via a queue worker to avoid blocking the API. The user receives a confirmation email (or in‑app notification) when the process completes.

#### 19.2.2 Data Protection by Design (Article 25)

Article 25 of GDPR mandates "data protection by design and by default" and has direct engineering implications. The Sovereign Suite implements this through:

| Requirement | Engineering Implementation |
|-------------|---------------------------|
| **Data minimisation** | Only collect fields absolutely necessary for each app. No "just in case" data collection. |
| **Purpose limitation** | Each table has a documented processing purpose. Data is not repurposed without new legal basis. |
| **Storage limitation** | Automated deletion policies (see Section 15) enforce retention periods. |
| **Integrity and confidentiality** | E2EE via `packages/crypto`, TLS 1.3, RLS policies (Section 7). |
| **Accountability** | All access to personal data is logged in an immutable audit trail (Section 19.5). |

#### 19.2.3 Data Protection Impact Assessment (DPIA)

The EDPB adopted its first standardised template for conducting DPIAs in March 2026. The Sovereign Suite must complete a DPIA before processing personal data that is likely to result in a high risk to data subjects—specifically, the processing of health data (Health & Fitness app), biometric data (Authenticator app), and any systematic monitoring of individuals (Analytics app).

**The DPIA template structure** (as adopted by the EDPB) places Technical and Organisational Measures (TOMs) in Section 2, requiring controllers to document measures supporting GDPR compliance—including Article 5 principles, data subject rights, and security—before the risk assessment in Section 4. The Sovereign Suite's DPIA must document:

- **The processing operations** (which apps process which personal data)
- **The necessity and proportionality** of each processing activity
- **The risks to data subjects** (including from the zero‑knowledge design itself—e.g., what happens if a user loses their encryption key?)
- **The measures to address risks** (cryptographic erasure, key escrow, data minimisation)
- **The consultation with supervisory authorities** (if the DPIA identifies a high residual risk)

The Sovereign Suite's DPIA is a living document, updated whenever a new app or processing activity is added. The first DPIA must be completed before the suite's first EU user signs up.

#### 19.2.4 Record of Processing Activities (RoPA)

GDPR Article 30 requires controllers to maintain a record of processing activities. The Sovereign Suite maintains this RoPA in a dedicated database table (`compliance.processing_activities`) with the following schema:

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

The RoPA is automatically updated by the CI pipeline whenever a new app or feature that processes personal data is added. The CI checks that every new table that contains personal data has a corresponding entry in the RoPA before the PR can be merged.

#### 19.2.5 Data Subject Access Requests (DSARs)

GDPR grants data subjects the right to access their personal data (Art. 15), rectify inaccurate data (Art. 16), restrict processing (Art. 18), and data portability (Art. 20). The Sovereign Suite implements automated DSAR handling:

| Right | Implementation | API Endpoint |
|-------|----------------|--------------|
| **Access** | Export all personal data as JSON (encrypted blobs remain encrypted; decryption requires user's key) | `GET /api/user/data/export` |
| **Rectification** | Update specific fields (e.g., name, email, profile picture) | `PATCH /api/user/profile` |
| **Restriction** | Mark user account as "restricted" (no further processing except storage) | `POST /api/user/restrict` |
| **Portability** | Export personal data in a machine‑readable format (JSON, CSV) | `GET /api/user/data/portable` |

All DSAR responses are provided within 30 days (GDPR's required timeline). Automated workflows track the 30‑day clock and escalate if a response is due.

#### 19.2.6 Data Breach Notification

GDPR Article 33 requires controllers to notify the supervisory authority of a personal data breach within 72 hours of becoming aware of it. The Sovereign Suite has an automated breach detection and notification system:

- **Detection:** Honeytokens (fake credentials placed in the database) trigger alerts when accessed. Anomaly detection on database query patterns flags potential exfiltration.
- **Assessment:** The security team (or the founder) assesses the breach within 2 hours of detection.
- **Notification:** If a breach is confirmed, the automated workflow:
  1. **Within 24 hours:** Notifies ENISA via the CRA reporting channel (see Section 19.3).
  2. **Within 72 hours:** Notifies the relevant data protection authority (DPA) using the standardised breach notification form.
  3. **Without undue delay:** Notifies affected data subjects if the breach is likely to result in a high risk to their rights and freedoms.

**Template for DPA notification:**

```json
{
  "controller": "Sovereign Suite",
  "contact": "privacy@sovereign.suite",
  "breach_description": "Encrypted user data may have been accessed by unauthorised party.",
  "data_categories": ["email addresses", "encrypted blobs"],
  "data_subjects": "Estimated 1,234 users",
  "consequences": "Without encryption keys, data is not readable.",
  "measures_taken": ["Invalidated all sessions", "Rotated database credentials"],
  "supervisory_authority": "CNIL (France)"
}
```

---

### 19.3 Cyber Resilience Act (CRA): The 2026 Deadline

The EU Cyber Resilience Act (Regulation (EU) 2024/2847) imposes mandatory cybersecurity requirements for "products with digital elements" placed on the EU market. The Sovereign Suite is in scope because it is a software product with digital elements (all 53 applications) sold to EU customers.

**Critical deadlines:**

| Deadline | Obligation |
|----------|------------|
| **11 September 2026** | Manufacturers must report actively exploited vulnerabilities and severe security incidents to ENISA and national CSIRTs **within 24 hours** of becoming aware of them, followed by a detailed vulnerability notification within 72 hours and a final report within 14 days |
| **11 December 2027** | Full compliance applies: secure‑by‑design requirements, conformity assessment, technical documentation (including SBOMs), CE marking, and vulnerability management throughout the product's expected lifetime |

The CRA is "more powerful than earlier frameworks such as GDPR, because it can do more than just impose fines". Non‑compliance can result in market withdrawal, not just financial penalties. The first enforcement window opens in September 2026, with full compliance, including SBOM mandates, required by December 2027.

#### 19.3.1 Vulnerability Reporting Obligations (From 11 September 2026)

Under Article 14 of the CRA, manufacturers must:

1. **Within 24 hours of becoming aware** of an actively exploited vulnerability or severe security incident, notify ENISA and the relevant national CSIRT.
2. **Within 72 hours**, provide a detailed vulnerability notification with:
   - Description of the vulnerability or incident
   - Estimated impact on product security
   - Technical information about the affected product
   - Any mitigating actions taken or planned
3. **Within 14 days**, submit a final report with root cause analysis, corrective actions, and evidence of remediation.

**The Sovereign Suite's CRA readiness:**

| Requirement | Implementation |
|-------------|----------------|
| **24‑hour notification** | Automated incident response workflow (PagerDuty + ENISA API) notifies the authority via a pre‑configured channel |
| **72‑hour detailed report** | Incident response template pre‑populated with product metadata (version, dependencies, known vulnerabilities) |
| **14‑day final report** | Root cause analysis stored in the compliance database; automatically finalised and sent |
| **SBOM generation** | Weekly `compliance.yml` workflow generates SPDX‑formatted SBOM (Section 18.7) |
| **VEX documentation** | Vulnerability Exploitability eXchange (VEX) statements document the status of known vulnerabilities (e.g., "not affected", "affected", "fixed", "under investigation") as required by CRA Article 13 |
| **Secure‑by‑design** | E2EE, RLS, input validation, and all other security controls documented in the product's technical documentation |

#### 19.3.2 SBOM and VEX Workflow

The CRA mandates SBOMs covering "at the very least the top‑level dependencies of the products". The Sovereign Suite exceeds this by generating a full dependency SBOM using Syft and storing it as an SPDX JSON artifact.

**VEX statements** (Vulnerability Exploitability eXchange) are a CRA requirement that supplements SBOMs. They document which vulnerabilities in the SBOM actually affect the product, and what the status is. The Sovereign Suite generates VEX statements automatically using Grype's `vex` output format, mapping CVEs to the "not_affected" status when they are in dependencies that are not used (e.g., a vulnerability in a development tool that is not shipped to production).

**VEX status values:**
- `not_affected` — The vulnerability does not affect this product (with `justification` field explaining why)
- `affected` — The vulnerability affects this product; remediation required
- `fixed` — The vulnerability has been patched in this version
- `under_investigation` — The impact is still being assessed

VEX statements are stored alongside SBOMs in the compliance database and are made available to customers upon request.

#### 19.3.3 CE Marking and Technical Documentation

By December 2027, the Sovereign Suite must obtain a CE marking indicating conformity with the CRA's essential requirements. The technical documentation required for CE marking includes:

- A general description of the product (the Sovereign Suite architecture)
- A list of the essential cybersecurity requirements that apply
- The software bill of materials (SBOM) and VEX documentation
- A description of the security development lifecycle (SDLC) processes
- Information about vulnerability management and support periods
- The user instructions and security warnings

The technical documentation is maintained in a dedicated Git repository (`docs/compliance/cra/`) and is version‑controlled alongside the codebase. Updates are required whenever the product or its dependencies change significantly.

---

### 19.4 eIDAS 2.0: European Digital Identity Wallet

eIDAS 2.0 (Regulation (EU) 2024/1183) requires each EU member state to provide a European Digital Identity (EUDI) Wallet to citizens, residents, and businesses by the end of 2026. By December 2027, banks and other regulated industries must accept the EUDI Wallet for Strong Customer Authentication (SCA). For the Sovereign Suite, this creates an opportunity to act as a relying party—accepting EUDI Wallet authentication for login, KYC, and digital signatures—and also to integrate the EUDI Wallet into the Sovereign Suite's own identity provider (#18).

**The Sovereign Suite's eIDAS 2.0 roadmap:**

| Phase | Timeline | Actions |
|-------|----------|---------|
| **Phase 1** | Q3 2026 – Q2 2027 | Implement support for EUDI Wallet login via OIDC (the wallet will provide an OIDC interface). Add wallet binding to Better Auth's `account` table. |
| **Phase 2** | Q3 2027 – Q4 2027 | Update the Authenticator app (#16) to support EUDI Wallet QR code scanning for SCA. Implement wallet‑based digital signatures for the Documents app (#7). |
| **Phase 3** | 2028+ | Explore becoming a Qualified Trust Service Provider (QTSP) under eIDAS, enabling the Sovereign Suite to issue its own EUDI Wallet. |

**Technical integration:** The EUDI Wallet exposes an OIDC Discovery endpoint (`/.well-known/openid-configuration`). The Sovereign Suite's Better Auth instance is configured with an OIDC client for the wallet:

```typescript
// packages/auth/src/index.ts (extended for eIDAS)
plugins: [
  oidc({
    providerId: "eudi-wallet",
    clientId: process.env.EUDI_WALLET_CLIENT_ID,
    clientSecret: process.env.EUDI_WALLET_CLIENT_SECRET,
    issuer: "https://eudi-wallet.gov.example",
    scope: "openid email profile",
  }),
],
```

---

### 19.5 SOC 2: The Enterprise Sales Gateway

SOC 2 (Service Organization Control 2) is an auditing standard that evaluates a service provider's controls across five Trust Services Criteria: security, availability, processing integrity, confidentiality, and privacy. For B2B SaaS, SOC 2 Type II is often a prerequisite for enterprise contracts.

**SOC 2 types and timeline:**

| Type | Description | Timeline | Cost | When to Pursue |
|------|-------------|----------|------|----------------|
| **Type I** | Evaluates design of controls at a point in time | 6–10 weeks for a prepared startup | $5,000–$25,000 | When the first enterprise prospect requests it |
| **Type II** | Evaluates operating effectiveness of controls over a period (typically 6–12 months) | 6–12 months after Type I | $20,000–$100,000+ | For established SaaS after demonstrating consistent control operation |

The Sovereign Suite will pursue SOC 2 Type I when the first enterprise customer requires it, typically during the Series A fundraising stage (if funded) or when a contract exceeding $50k ARR is contingent on SOC 2. Type II will follow approximately 6–12 months after Type I.

**Controls already implemented that will be audited:**

| Trust Services Criteria | Sovereign Suite Implementation |
|------------------------|-------------------------------|
| **Security** | E2EE, RLS, Durable Objects with hibernation, WAF, rate limiting, vulnerability scanning (Grype) |
| **Availability** | Cloudflare Workers (99.95% SLA), Hyperdrive failover, fallback API on VPS |
| **Processing Integrity** | Drizzle ORM with validation, idempotent API design, audit logging of all mutations |
| **Confidentiality** | E2EE at rest and in transit; R2 with zero egress; data classification per GDPR |
| **Privacy** | GDPR compliance (see Section 19.2), DPIA, RoPA, DSAR workflows |

The SOC 2 audit is conducted by an independent CPA firm. The Sovereign Suite will use compliance automation tools (e.g., Vanta, Drata, Secureframe) to continuously monitor controls and generate audit evidence, reducing the cost and effort of manual collection.

---

### 19.6 HIPAA: Handling Protected Health Information

The Health & Fitness app (#44) will store protected health information (PHI) if it includes medical records, heart rate data, sleep tracking, or similar. HIPAA compliance is significantly more burdensome than GDPR and requires:

- **Business Associate Agreements (BAAs)** with every subcontractor that touches PHI (including Cloudflare, the VPS provider, and any logging or analytics services)
- **Administrative safeguards** (security management process, assigned security responsibility, workforce security)
- **Physical safeguards** (facility access controls, workstation security)
- **Technical safeguards** (access control, audit controls, integrity controls, transmission security)
- **Documentation** (policies, procedures, and logs retained for 6 years)

**The Sovereign Suite's HIPAA strategy:** The Health & Fitness app is **excluded from Phase 1–4** of the roadmap. It will be developed only after the suite has a dedicated legal and compliance team, or it will be scoped as a separate product offering with its own infrastructure (or a third‑party integration). For MVP purposes, the Health & Fitness app stores only non‑identifiable, encrypted activity summaries that do not constitute PHI (e.g., step counts without timestamps, aggregated sleep data without dates).

If a customer requires HIPAA compliance for their health data, the Sovereign Suite offers:
- **A dedicated, isolated deployment** on the customer's own infrastructure (self‑hosted enterprise tier)
- **A BA signed with the customer**, assuming responsibility for sub‑processors
- **Audit logs** retained for 6 years, with tamper‑evident signatures

---

### 19.7 Data Localisation and Cloudflare DLS

For GDPR compliance, storing EU user data within the EU is not strictly required, but it significantly simplifies compliance. Cloudflare's Data Localization Suite (DLS) provides the tools to achieve this.

**Cloudflare DLS components:**

| Component | Function | Sovereign Suite Use |
|-----------|----------|---------------------|
| **Regional Services** | Restricts traffic processing to a specific region (e.g., the EU) | Route EU user requests only to EU data centres |
| **Geo‑Key Manager** | Controls where private encryption keys are stored | Store EU user keys in EU‑based key management system |
| **Metadata Boundary** | Keeps metadata (logs, analytics) within the specified region | EU user logs remain in EU |

**Enabling DLS for EU customers:**

```typescript
// wrangler.jsonc (Regional Services configuration)
{
  "regions": ["EU"],
  "services": [
    {
      "binding": "EUROPE_KEYS",
      "service": "geo-key-manager",
      "environment": "eu"
    }
  ]
}
```

The DLS is available on Cloudflare Enterprise plans. For early‑stage EU customers, the Sovereign Suite will rely on the fact that Cloudflare's services are designed to satisfy the requirements of the GDPR even without DLS, as verified by the EU Cloud Code of Conduct. When the suite has EU customers exceeding 1,000 users, upgrading to an Enterprise plan for DLS may become necessary.

---

### 19.8 Compliance Workflow Automation

The Sovereign Suite automates compliance through a dedicated `compliance.yml` workflow that runs on every push to `main` and on a weekly schedule.

**File: `.github/workflows/compliance.yml` (full version):**

```yaml
name: Compliance

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly full scan
  workflow_dispatch:      # Manual trigger for audits

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate SBOM (SPDX)
        uses: anchore/sbom-action@v0
        with:
          path: .
          format: spdx-json
          output-file: sbom.spdx.json
      - name: Generate SBOM (CycloneDX)
        uses: cyclonedx/gh-node-module-generatebom@v1
        with:
          output: sbom.cdx.json
      - name: Upload SBOMs
        uses: actions/upload-artifact@v4
        with:
          name: sboms
          path: |
            sbom.spdx.json
            sbom.cdx.json
      - name: Scan with Grype
        uses: anchore/grype-action@v0
        with:
          sbom: sbom.spdx.json
          fail-build: true
          severity-cutoff: high
      - name: Generate VEX statements
        run: |
          grype sbom.spdx.json -o vex --vex-status not_affected > vex.json
      - name: Upload VEX
        uses: actions/upload-artifact@v4
        with:
          name: vex
          path: vex.json

  ropa-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - name: Validate RoPA completeness
        run: pnpm compliance:ropa

  dpia-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate DPIA existence
        run: |
          if [ ! -f docs/compliance/dpia.pdf ]; then
            echo "ERROR: DPIA not found. Complete the DPIA before adding new processing activities."
            exit 1
          fi
      - name: Check DPIA update recency
        run: |
          LAST_UPDATE=$(git log -1 --format=%cd --date=unix -- docs/compliance/dpia.pdf)
          THREE_MONTHS_AGO=$(date -d '3 months ago' +%s)
          if [ $LAST_UPDATE -lt $THREE_MONTHS_AGO ]; then
            echo "WARNING: DPIA older than 3 months. Consider reviewing for accuracy."
          fi
```

**RoPA validation script (`compliance:ropa`):** This script queries the database for all tables that contain personal data and compares them against the `compliance.processing_activities` table. It fails the build if any personal data table is missing from the RoPA.

---

### 19.9 Privacy Policy and Transparency

The Sovereign Suite's privacy policy is:

- **Plain‑language, layered.** A short summary for casual reading and a detailed section for the legally minded.
- **Specific about encryption.** Explains what data is encrypted, who holds the keys, and what happens if keys are lost.
- **Clear about erasure.** Describes the cryptographic erasure process and the 30‑day retention period for audit logs.
- **Linked to the DPIA.** The privacy policy references the DPIA and provides a copy upon request.
- **Versioned.** Changes to the privacy policy are tracked in Git and published with a changelog.

**Privacy policy must include (GDPR Articles 13–14):**
- Identity and contact details of the controller (Sovereign Suite)
- Contact details of the Data Protection Officer (DPO)—or a statement that one is not required
- Purposes and legal bases for each processing activity
- Categories of personal data collected
- Recipients of personal data (including sub‑processors)
- Data retention periods (including the 30‑day audit log retention)
- Data subject rights (access, rectification, erasure, restriction, portability, objection)
- Right to withdraw consent (where applicable)
- Right to lodge a complaint with a supervisory authority
- Whether data is transferred outside the EU, and the safeguards applied (Cloudflare DLS)
- Automated decision‑making and profiling (none, except the AI Assistant which is clearly disclosed)

---

### 19.10 Data Processing Agreement (DPA)

For enterprise customers, the Sovereign Suite must provide a Data Processing Agreement (DPA) that complies with GDPR Article 28. The DPA covers:

- **Subject matter and duration** of processing
- **Nature and purpose** of processing
- **Type of personal data** and categories of data subjects
- **Obligations and rights** of the controller
- **Technical and organisational measures** (E2EE, RLS, access controls, audit logs)
- **Sub‑processing** (list of sub‑processors: Cloudflare, Contabo, Doppler, Stripe)
- **Data subject rights** (mechanisms for the controller to respond to DSARs)
- **Audit rights** (customer's right to audit compliance, subject to confidentiality)
- **Return or deletion of data** after termination of the agreement
- **Security breach notification** (sub‑processor must notify the controller within 24 hours)

The DPA is signed by both parties before any processing of personal data begins. The Sovereign Suite's standard DPA is publicly available on the website, and enterprise customers may request customisations.

---

### 19.11 AI Agent Rules for Compliance

Add the following to your root `AGENTS.md` to encode compliance best practices:

```markdown
## Compliance & GDPR — Rules for AI Agents

1. **Never store plaintext personal data.** All user content encrypted with `@suite/crypto`. Metadata (timestamps, IDs) is not personal data unless it identifies an individual.

2. **Every new table with personal data must have an entry in RoPA.** The `compliance:ropa` check will fail the PR otherwise.

3. **DPIA must be updated every 3 months.** If a new app or processing activity is added, the DPIA must be reviewed.

4. **Erasure is cryptographic.** Deleting a user's encryption keys is sufficient; do not attempt to individually delete encrypted blobs unless required by specific retention policies.

5. **Audit logs retained for 30 days only.** Older logs are pseudonymised (user_id replaced with hash) or deleted.

6. **Breach notification timeline is fixed.** 24 hours to ENISA, 72 hours to DPA, without undue delay to data subjects.

7. **SBOM must be generated weekly.** The `compliance.yml` workflow runs on Sundays; if it fails, fix before merging any new code.

8. **VEX status is mandatory for all CVEs.** Every vulnerability in the SBOM must have a VEX statement explaining its status (`not_affected`, `affected`, `fixed`, `under_investigation`).

9. **Privacy policy must be versioned.** Any change to data processing must be reflected in the privacy policy and communicated to users.

10. **DPA is required for enterprise customers.** The standard DPA is the starting point; customisation requires legal review.
```

---

### 19.12 Compliance Dashboard (For Audits)

The Sovereign Suite exposes a compliance dashboard (accessible only to authenticated administrators) that provides real‑time evidence for auditors:

- **SBOM status:** Latest SBOM generation timestamp, number of components, detected CVEs
- **VEX status:** Number of open vulnerabilities, breakdown by status category
- **RoPA completeness:** Percentage of personal data tables covered by RoPA entries
- **DPIA recency:** Date of last DPIA update
- **DSAR backlog:** Number of open DSAR requests, average response time
- **Erasure requests:** Number processed in the last 30 days, average completion time
- **Breach notifications:** History of breach notifications sent to ENISA and DPAs

The dashboard is read‑only and is intended to speed up auditor evidence collection. It does not expose any personal data.

---

### 19.13 Summary: Compliance by Design

| Framework | Key Obligation | Sovereign Suite Implementation | Audit Evidence |
|-----------|----------------|-------------------------------|----------------|
| **GDPR** | Right to erasure (Art. 17) | Cryptographic erasure of keys | `user_encryption_keys` deletion logs |
| **GDPR** | Data protection by design (Art. 25) | E2EE, RLS, data minimisation | DPIA, RoPA, privacy policy |
| **GDPR** | Data breach notification (Art. 33) | Automated 72‑hour notification workflow | Breach logs, ENISA API receipts |
| **CRA** | Vulnerability reporting (Art. 14) | 24‑hour ENISA notification, VEX statements | SBOMs, VEX artifacts, incident reports |
| **CRA** | SBOM mandate (Art. 13) | Weekly SBOM generation (SPDX + CycloneDX) | `compliance.yml` workflow artifacts |
| **eIDAS 2.0** | EUDI Wallet acceptance | OIDC integration; QR code SCA for Authenticator | Wallet acceptance logs |
| **SOC 2** | Security, availability, confidentiality | Controls documented in 19.5 | SOC 2 Type I report (future) |
| **HIPAA** | PHI safeguards | Health & Fitness app out of scope (v1) | Exclusion statement, BAAs (future) |
