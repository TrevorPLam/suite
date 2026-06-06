# Incident Response

This document defines the incident response playbook for the Sovereign Suite, covering severity classification, first-15-minutes S1 checklist, kill switch procedure, honeytoken implementation, post-incident review template, and communication templates.

---

## Severity Classification

### S1 (Critical)

**Definition**: Data exfiltration, key compromise, authentication bypass, or complete service outage affecting all users.

**Examples**:
- Database credentials leaked
- Master encryption keys exposed
- Authentication bypass vulnerability exploited
- All Workers offline due to Cloudflare outage
- Ransomware on VPS

**Response Time**: Immediate (page on-call within 5 minutes)

### S2 (High)

**Definition**: Service unavailability for a subset of users, data corruption, or significant performance degradation.

**Examples**:
- Single app (Calendar) offline
- Database connection pool exhausted
- High error rate (> 5%) for a specific tenant
- Data corruption in a specific table
- Durable Object alarm failures

**Response Time**: Within 15 minutes

### S3 (Medium)

**Definition**: Performance degradation, failed backups, billing errors, or minor service issues.

**Examples**:
- High latency (> 500ms p95) for all users
- Backup job failed
- Billing calculation error
- Rate limiting blocking legitimate users
- Minor bug affecting UI

**Response Time**: Within 1 hour

---

## First-15-Minutes S1 Checklist

### 1. Containment (0-5 minutes)

- [ ] **Invalidate all sessions**: Truncate Better Auth session table
  ```sql
  TRUNCATE auth.sessions;
  ```
- [ ] **Rotate secrets**: Rotate `BETTER_AUTH_SECRET` and `DATABASE_URL` password via Doppler
- [ ] **Disable affected Workers**: Pause Workers via Cloudflare dashboard
- [ ] **Block malicious IPs**: Add IP blocks to Cloudflare firewall

### 2. Assessment (5-10 minutes)

- [ ] **Identify scope**: Determine which users, tenants, or data are affected
- [ ] **Check logs**: Review Cloudflare Workers logs, VPS logs, PostgreSQL logs
- [ ] **Verify integrity**: Check for data corruption or unauthorized modifications
- [ ] **Assess impact**: Estimate number of affected users and data exposure

### 3. Notification (10-15 minutes)

- [ ] **Notify affected users**: Send email notification within 24 hours (CRA requirement)
- [ ] **File with supervisory authority**: File breach notification within 72 hours (GDPR Article 33)
- [ ] **Notify internal team**: Alert engineering, legal, and PR teams
- [ ] **Prepare public statement**: Draft press statement if required

---

## Kill Switch Procedure

### Cloudflare Zone Pause

The fastest way to take the entire suite offline is to pause the Cloudflare Zone:

1. **Log in to Cloudflare Dashboard**
2. **Navigate to the Zone** (yourdomain.com)
3. **Click "Pause Cloudflare"** in the right sidebar
4. **Confirm pause**

**Effect**: All traffic to yourdomain.com is blocked within 60 seconds. All data is preserved.

### Worker-Specific Disable

If only specific Workers are affected:

1. **Navigate to Workers & Pages**
2. **Select the affected Worker**
3. **Click "Settings" → "Triggers"**
4. **Disable routes** or **delete triggers**

### VPS Shutdown

If the VPS is compromised:

```bash
# SSH into VPS
ssh admin@vps.yourdomain.com

# Stop all services
sudo systemctl stop stalwart-mail
sudo systemctl stop postgresql
sudo docker-compose down

# Optionally shutdown VPS
sudo shutdown -h now
```

---

## Honeytoken Implementation

### Honeytokens Table Schema

```sql
CREATE TABLE app.honeytokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID, -- NULL for global honeytokens
  token_type TEXT NOT NULL,
  token_value TEXT NOT NULL,
  alert_triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_honeytokens_value ON app.honeytokens(token_value);
```

### Honeytoken Types

| Type | Placement | Alert Trigger |
|------|-----------|---------------|
| `api_key` | Environment variables, code comments | Used in API request |
| `email` | Mail mailboxes, contact lists | Email sent to address |
| `database_url` | Config files, logs | Database connection attempt |
| `ssh_key` | VPS auth logs | SSH login attempt |

### Generate Honeytokens

```typescript
// packages/security/src/honeytokens.ts
import { randomUUID } from 'crypto';

export function generateHoneytoken(type: string): string {
  const prefix = {
    api_key: 'sk_live_',
    email: 'honeytoken_',
    database_url: 'postgresql://user:',
    ssh_key: 'ssh-rsa ',
  }[type];

  return prefix + randomUUID();
}
```

### Seed Honeytokens

```sql
-- Global API key honeytoken
INSERT INTO app.honeytokens (tenant_id, token_type, token_value)
VALUES (NULL, 'api_key', 'sk_live_honeytoken_abc123');

-- Mail honeytoken
INSERT INTO app.honeytokens (tenant_id, token_type, token_value)
VALUES (NULL, 'email', 'honeytoken_breach@yourdomain.com');
```

### Alert on Honeytoken Access

```typescript
// apps/security-worker/src/index.ts
app.use('*', async (c, next) => {
  const apiKey = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (apiKey) {
    const honeytoken = await db.query(
      'SELECT * FROM app.honeytokens WHERE token_value = $1',
      [apiKey]
    );
    
    if (honeytoken.rows.length > 0) {
      // Trigger alert
      await sendPagerDutyAlert({
        severity: 'critical',
        message: 'Honeytoken accessed',
        details: {
          tokenType: honeytoken.rows[0].token_type,
          requestId: c.get('requestId'),
          ip: c.req.header('CF-Connecting-IP'),
        },
      });
      
      // Update honeytoken
      await db.query(
        'UPDATE app.honeytokens SET alert_triggered = true, triggered_at = NOW() WHERE id = $1',
        [honeytoken.rows[0].id]
      );
      
      return c.json({ error: 'Invalid API key' }, 401);
    }
  }
  
  await next();
});
```

---

## Post-Incident Review Template

### Incident Report

```markdown
# Incident Report: [Incident Title]

## Metadata
- **Incident ID**: INC-YYYY-MM-DD-001
- **Date**: [Date]
- **Severity**: S1 / S2 / S3
- **Duration**: [Start time] - [End time]
- **Reporter**: [Name]

## Executive Summary
[Brief summary of the incident, impact, and resolution]

## Timeline
| Time | Event |
|------|-------|
| [Time] | Incident detected |
| [Time] | On-call paged |
| [Time] | Containment actions taken |
| [Time] | Root cause identified |
| [Time] | Mitigation implemented |
| [Time] | Service restored |

## Root Cause Analysis
[Detailed analysis of what caused the incident]

## Impact Assessment
- **Affected users**: [Number]
- **Affected tenants**: [Number]
- **Data exposed**: [Categories and count]
- **Service downtime**: [Duration]

## Resolution Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Follow-Up Actions
- [ ] [Action 1]
- [ ] [Action 2]
- [ ] [Action 3]

## Lessons Learned
[What went well, what could be improved]

## Attachments
- [Logs]
- [Screenshots]
- [Communication logs]
```

---

## Communication Templates

### User Notification Email

```markdown
Subject: Important Security Notice - [Your Company Name]

Dear [User Name],

We are writing to inform you of a security incident that may have affected your account.

**What happened:**
[Brief description of the incident]

**What we are doing:**
[Steps taken to resolve the incident]

**What you should do:**
[Recommended actions for the user]

**For more information:**
[Link to FAQ or support contact]

We apologize for any inconvenience and appreciate your understanding.

Sincerely,
[Your Company Name] Security Team
```

### Supervisory Authority Notification (GDPR Article 33)

```markdown
Subject: Personal Data Breach Notification - [Your Company Name]

To: [Supervisory Authority Name]

**Notification Date:** [Date]
**Breach Date:** [Date]
**Breach Discovery Date:** [Date]

**Description of the Breach:**
[Detailed description]

**Categories of Data Affected:**
- [Data category 1]
- [Data category 2]

**Number of Affected Individuals:**
[Number]

**Likely Consequences:**
[Potential impact on individuals]

**Measures Taken:**
[Measures taken to address the breach]

**Contact Information:**
[Name]
[Email]
[Phone]
```

### Press Statement (if required)

```markdown
FOR IMMEDIATE RELEASE

[Your Company Name] Addresses Security Incident

[CITY, State] — [Date] — [Your Company Name] today announced that it experienced a security incident that may have affected [number] users.

[Description of the incident]

[Steps taken to resolve the incident]

[Contact information for media inquiries]

###
```

---

## Incident Response Team

### Roles and Responsibilities

| Role | Responsibilities | On-Call Rotation |
|------|-------------------|------------------|
| **Incident Commander** | Coordinate response, make decisions | Engineering lead |
| **Security Lead** | Investigate root cause, implement fixes | Security engineer |
| **Database Admin** | Restore from backup, verify integrity | DBA |
| **Legal Counsel** | Review notifications, ensure compliance | Legal team |
| **PR/Communications** | Draft public statements, handle media | PR team |
| **Customer Support** | Handle user inquiries | Support lead |

### On-Call Schedule

- **Primary**: [Name] ([Phone])
- **Secondary**: [Name] ([Phone])
- **Escalation**: [Name] ([Phone])

---

## Incident Response Tools

### PagerDuty Integration

```typescript
// packages/alerting/src/pagerduty.ts
export async function sendPagerDutyAlert(alert: Alert) {
  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routing_key: process.env.PAGERDUTY_ROUTING_KEY,
      event_action: 'trigger',
      payload: {
        summary: alert.message,
        severity: alert.severity,
        source: 'sovereign-suite',
        custom_details: alert.details,
      },
    }),
  });
}
```

### Slack Integration

```typescript
// packages/alerting/src/slack.ts
export async function sendSlackAlert(alert: Alert) {
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: alert.message,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.severity}*: ${alert.message}`,
          },
        },
      ],
    }),
  });
}
```

### Audit Log Retention

**Cloudflare Audit Logs:**
- Cloudflare retains audit logs for 18 months on all plan types
- UI queries limited to most recent 90 days for performance
- Use API or Logpush to access full 18-month history
- Enterprise customers can use Logpush to store audit logs beyond 18 months

**R2 Export for Long-Term Retention:**
For GDPR and CRA compliance requiring longer retention (7 years for audit logs), configure an automated R2 export job:

```bash
# Weekly cron: export Cloudflare audit logs to R2
curl -H "Authorization: Bearer $CF_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/audit_logs?since=$(date -d '7 days ago' -u +%Y-%m-%dT%H:%M:%SZ)" \
  | aws s3 cp - s3://your-bucket/audit-logs/$(date +%Y/%m/%d).json --endpoint-url $R2_ENDPOINT
```

Set the R2 bucket lifecycle policy to retain audit logs for 7 years (GDPR audit log obligation).

---

## Drills and Training

### Quarterly Drills

- **Tabletop exercise**: Walk through S1 scenario with incident response team
- **Kill switch drill**: Practice pausing Cloudflare Zone
- **Honeytoken drill**: Test honeytoken alerting
- **Communication drill**: Practice drafting notifications

### Annual Training

- **Security awareness training**: All engineers
- **Incident response training**: Incident response team
- **Compliance training**: Legal and PR teams

---

## Compliance Requirements

### SOC 2

- **CC6.1**: Incident response procedures
- **CC6.6**: Monitoring system changes
- **CC7.2**: Incident response testing

### GDPR

- **Article 33**: Notification to supervisory authority (72 hours)
- **Article 34**: Communication to data subjects (without undue delay if high risk)
- **Article 32**: Security of processing

### CRA (Cyber Resilience Act)

- **Actively exploited vulnerabilities**: Report to ENISA within 24 hours of awareness
- **Full vulnerability notification**: Within 72 hours
- **Final report**: Within 14 days after corrective measure is available

---

## CRA Notification Pipeline (Required Before Sep 11, 2026)

The CRA enforcement window opens **September 11, 2026 — 97 days from now.** From that date, failing to report an actively exploited vulnerability to ENISA within 24 hours of awareness is a direct regulatory violation, not just a best-practice miss. The following pipeline must exist before that date:

**Detection → ENISA in under 24 hours:**

1. **Honeytoken or anomaly detection fires** → PagerDuty alert (already exists)
2. **On-call acknowledges** → automated CRA assessment form opens (pre-fill product metadata: name, version, affected component, CVSS estimate)
3. **If severity = Critical/High** → automated ENISA submission via the ENISA Single Reporting Platform (SRP) API
4. **Internal ticket created** in Linear/GitHub Issues with 72-hour detailed report deadline
5. **14-day final report deadline** tracked in the compliance database

**Registration Requirement:**
- Register for ENISA's Single Reporting Platform (SRP) now — the registration process itself takes 5–10 business days
- SRP URL: https://www.enisa.europa.eu/topics/product-security-and-certification/single-reporting-platform-srp
- The platform will be operational by September 11, 2026 with a testing period before then

---

## Breach Classification — Two-Tier Model

Not all breaches carry the same GDPR notification obligation. Misclassifying a metadata breach as a content breach triggers unnecessary user notification; failing to classify a content breach correctly may under-notify.

| Tier | What Was Breached | GDPR Article 33 (DPA) | GDPR Article 34 (Users) | CRA Notification |
|------|------------------|-----------------------|-------------------------|-----------------|
| **A — Content breach** | Ciphertext + keys, or unencrypted personal data | 72 hours | Required if high risk | 24h if exploited vuln |
| **B — Metadata breach** | Request logs, IP hashes, usage patterns only | 72 hours (assess risk) | Likely NOT required (ZK architecture protects content) | 24h if exploited vuln |

**Tier B Documentation:**
For Tier B breaches, document in the incident report why Article 34 notification was not required (content was encrypted and keys are not held server-side). This documentation is the regulatory defense.

---

## Rate Limits Reference

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `/api/auth/recovery` | ≤ 3 requests/hr per IP | Tightest limit in the system — brute-forcing recovery codes is the primary post-passkey attack surface |
| `/api/auth/login` | ≤ 10 requests/min per IP | Standard |
| `/api/auth/reset-password` | ≤ 5 requests/hr per email | Enumeration prevention |

---

## Post-Incident Actions

### Immediate (0-24 hours)

- [ ] Complete incident report
- [ ] Notify all affected parties
- [ ] Implement permanent fixes
- [ ] Update monitoring and alerting

### Short-term (1-7 days)

- [ ] Conduct post-incident review meeting
- [ ] Update runbooks based on lessons learned
- [ ] Implement additional monitoring
- [ ] Provide additional training if needed

### Long-term (1-3 months)

- [ ] Conduct security audit
- [ ] Update security policies
- [ ] Implement additional security controls
- [ ] Share learnings with industry (if appropriate)

---

*This document must be updated after every incident to incorporate lessons learned.*
