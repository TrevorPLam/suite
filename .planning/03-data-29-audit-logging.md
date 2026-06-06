# Audit Logging

This document defines the audit logging system for the Sovereign Suite, covering the auditable events taxonomy, `app.audit_logs` table schema, append-only enforcement, GDPR pseudonymization, and the audit log API.

---

## Overview

Audit logging is required for SOC 2 compliance, GDPR accountability, and enterprise customer requirements. Every significant action in the Sovereign Suite must be logged to the `app.audit_logs` table with immutable, append-only storage.

---

## Auditable Events Taxonomy

### Authentication Events

| Action | Description | Resource Type |
|--------|-------------|---------------|
| `login` | User successfully authenticated | `session` |
| `logout` | User ended session | `session` |
| `failed_login` | Authentication attempt failed | `session` |
| `password_change` | User changed password | `user` |
| `mfa_enabled` | User enabled MFA | `user` |
| `mfa_disabled` | User disabled MFA | `user` |

### Data Read Events

| Action | Description | Resource Type |
|--------|-------------|---------------|
| `data_read` | User accessed encrypted data | `event`, `file`, `task`, `message`, `credential` |
| `data_export` | User exported data | `event`, `file`, `task`, `message` |
| `search` | User performed search | `search` |

### Data Write Events

| Action | Description | Resource Type |
|--------|-------------|---------------|
| `data_create` | User created new data | `event`, `file`, `task`, `message`, `credential` |
| `data_update` | User modified existing data | `event`, `file`, `task`, `message`, `credential` |
| `data_delete` | User deleted data | `event`, `file`, `task`, `message`, `credential` |
| `data_share` | User shared data with others | `file`, `event` |

### Key Management Events

| Action | Description | Resource Type |
|--------|-------------|---------------|
| `key_derivation` | User derived encryption keys | `key` |
| `key_rotation` | User rotated encryption keys | `key` |
| `recovery_key_generated` | User generated recovery key | `recovery_key` |
| `recovery_key_used` | User used recovery key | `recovery_key` |

### Plan/Billing Events

| Action | Description | Resource Type |
|--------|-------------|---------------|
| `plan_change` | User changed subscription plan | `subscription` |
| `payment_processed` | Payment was processed | `payment` |
| `payment_failed` | Payment failed | `payment` |

### Compliance Events

| Action | Description | Resource Type |
|--------|-------------|---------------|
| `dsar_received` | Data subject access request received | `dsar` |
| `dsar_fulfilled` | Data subject access request fulfilled | `dsar` |
| `erasure_requested` | Data erasure requested | `erasure` |
| `erasure_completed` | Data erasure completed | `erasure` |

### Admin Events

| Action | Description | Resource Type |
|--------|-------------|---------------|
| `admin_login` | Admin authenticated | `admin` |
| `admin_user_impersonation` | Admin impersonated user | `user` |
| `admin_tenant_access` | Admin accessed tenant data | `tenant` |
| `admin_config_change` | Admin changed system configuration | `config` |

---

## Audit Logs Table Schema

```sql
CREATE TABLE app.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID, -- NULL for system actions
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata JSONB, -- Additional context (e.g., { "plan": "pro" })
  created_at TIMESTAMPTZ DEFAULT NOW(),
  retention_until TIMESTAMPTZ NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_tenant ON app.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON app.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON app.audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON app.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_retention ON app.audit_logs(retention_until);
CREATE INDEX idx_audit_logs_created ON app.audit_logs(created_at);
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | `UUID` | Primary key |
| `tenant_id` | `UUID` | Tenant ID for multi-tenancy |
| `user_id` | `UUID` | User ID (NULL for system actions) |
| `action` | `TEXT` | Action type (from taxonomy) |
| `resource_type` | `TEXT` | Resource type affected |
| `resource_id` | `UUID` | Resource ID (if applicable) |
| `ip_hash` | `TEXT` | SHA-256 hash of IP address |
| `user_agent_hash` | `TEXT` | SHA-256 hash of user agent |
| `metadata` | `JSONB` | Additional context |
| `created_at` | `TIMESTAMPTZ` | Event timestamp |
| `retention_until` | `TIMESTAMPTZ` | GDPR retention deadline |

---

## Append-Only Enforcement

### PostgreSQL Trigger

```sql
-- Block UPDATE operations
CREATE OR REPLACE FUNCTION app.block_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only: UPDATE is not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_block_update
  BEFORE UPDATE ON app.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION app.block_audit_log_update();

-- Block DELETE operations
CREATE OR REPLACE FUNCTION app.block_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only: DELETE is not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_block_delete
  BEFORE DELETE ON app.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION app.block_audit_log_delete();
```

### Dedicated Audit DB User

Create a dedicated database user with INSERT-only privileges:

```sql
-- Create audit user
CREATE USER audit_writer WITH PASSWORD '${AUDIT_WRITER_PASSWORD}';

-- Grant INSERT only on audit_logs
GRANT INSERT ON app.audit_logs TO audit_writer;
GRANT USAGE, SELECT ON SEQUENCE app.audit_logs_id_seq TO audit_writer;

-- Revoke all other privileges
REVOKE UPDATE, DELETE, TRUNCATE ON app.audit_logs FROM audit_writer;
```

### Application Usage

```typescript
// packages/audit/src/write.ts
import { Pool } from 'pg';

const auditPool = new Pool({
  connectionString: process.env.AUDIT_DATABASE_URL,
  user: 'audit_writer',
  password: process.env.AUDIT_WRITER_PASSWORD,
});

export async function writeAuditLog(entry: AuditLogEntry) {
  await auditPool.query(
    `INSERT INTO app.audit_logs (
      tenant_id, user_id, action, resource_type, resource_id,
      ip_hash, user_agent_hash, metadata, retention_until
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.tenantId,
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.ipHash,
      entry.userAgentHash,
      JSON.stringify(entry.metadata),
      entry.retentionUntil,
    ]
  );
}
```

---

## GDPR Pseudonymization Job

### Retention Policy

Per GDPR and the compliance document (`docs/07-business/18-compliance-gdpr-cra.md`), audit logs are retained for 30 days before pseudonymization.

### Pseudonymization Function

```sql
-- Replace user_id with irreversible HMAC hash
CREATE OR REPLACE FUNCTION app.pseudonymize_audit_logs()
RETURNS void AS $$
DECLARE
  cutoff_date TIMESTAMPTZ := NOW() - INTERVAL '30 days';
BEGIN
  UPDATE app.audit_logs
  SET user_id = encode(
    digest(user_id::text || '${PSEUDONYMIZATION_SALT}', 'sha256'),
    'hex'
  )
  WHERE created_at < cutoff_date
    AND user_id IS NOT NULL;
  
  -- Log the pseudonymization job
  INSERT INTO app.audit_logs (
    tenant_id, user_id, action, resource_type, metadata, retention_until
  ) VALUES (
    'system',
    NULL,
    'pseudonymization_job',
    'audit_log',
    '{"rows_affected": row_count}'::jsonb,
    NOW() + INTERVAL '7 years'
  );
END;
$$ LANGUAGE plpgsql;
```

### Scheduled Job

Run the pseudonymization job daily via cron or Cloudflare Workers Cron Triggers:

```typescript
// apps/audit-worker/src/index.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const db = createDbClient(env.DATABASE_URL);
    
    await db.query('SELECT app.pseudonymize_audit_logs()');
    
    console.log('Audit log pseudonymization completed');
  },
};
```

### Wrangler Configuration

```toml
# wrangler.toml
[triggers]
crons = ["0 2 * * *"] # Run daily at 2 AM UTC
```

---

## Audit Log API

### GET /api/audit-logs

Retrieve audit logs for a tenant (SOC 2 auditors and enterprise admins only).

```typescript
// apps/admin/api/src/index.ts
app.get('/api/audit-logs', async (c) => {
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  
  // Check if user is auditor or admin
  const hasAccess = await checkAuditAccess(userId, tenantId);
  if (!hasAccess) {
    return c.json({
      error: {
        code: 'global_forbidden',
        message: 'You do not have permission to view audit logs',
      },
    }, 403);
  }
  
  const { action, resourceType, startDate, endDate, limit = 100, cursor } = c.req.query();
  
  const logs = await db.query(
    `SELECT * FROM app.audit_logs
     WHERE tenant_id = $1
       AND ($2::text IS NULL OR action = $2)
       AND ($3::text IS NULL OR resource_type = $3)
       AND ($4::timestamptz IS NULL OR created_at >= $4)
       AND ($5::timestamptz IS NULL OR created_at <= $5)
     ORDER BY created_at DESC
     LIMIT $6`,
    [tenantId, action, resourceType, startDate, endDate, limit]
  );
  
  return c.json({
    logs: logs.rows,
    cursor: logs.rows.length === limit ? generateCursor(logs.rows[logs.rows.length - 1]) : null,
  });
});
```

### RLS Policy

```sql
-- Only auditors and admins can read audit logs
CREATE POLICY audit_logs_read_policy ON app.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app.audit_roles
      WHERE user_id = current_setting('app.current_user_id')::UUID
        AND role IN ('auditor', 'admin')
    )
  );
```

---

## Audit Log Middleware

### Hono Middleware

```typescript
// packages/api/src/middleware/audit.ts
import { createMiddleware } from 'hono/factory';
import { createHash } from 'crypto';
import { writeAuditLog } from '@suite/audit';

export const auditMiddleware = (action: string, resourceType: string) =>
  createMiddleware(async (c, next) => {
    const startTime = Date.now();
    
    await next();
    
    const durationMs = Date.now() - startTime;
    const status = c.res.status;
    
    // Only log successful operations
    if (status >= 200 && status < 300) {
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For');
      const userAgent = c.req.header('User-Agent');
      
      await writeAuditLog({
        tenantId: c.get('tenantId'),
        userId: c.get('userId'),
        action,
        resourceType,
        resourceId: c.get('resourceId'),
        ipHash: ip ? createHash('sha256').update(ip).digest('hex') : null,
        userAgentHash: userAgent ? createHash('sha256').update(userAgent).digest('hex') : null,
        metadata: {
          path: c.req.path,
          method: c.req.method,
          durationMs,
          status,
        },
        retentionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });
    }
  });
```

### Usage in API Routes

```typescript
// apps/calendar/api/src/index.ts
app.post(
  '/api/events',
  auditMiddleware('data_create', 'event'),
  async (c) => {
    const event = await createEvent(await c.req.json());
    c.set('resourceId', event.id);
    return c.json(event, 201);
  }
);
```

---

## Audit Log Export

### CSV Export for Auditors

```typescript
// apps/admin/api/src/index.ts
app.get('/api/audit-logs/export', async (c) => {
  const tenantId = c.get('tenantId');
  const { startDate, endDate } = c.req.query();
  
  const logs = await db.query(
    `SELECT * FROM app.audit_logs
     WHERE tenant_id = $1
       AND ($2::timestamptz IS NULL OR created_at >= $2)
       AND ($3::timestamptz IS NULL OR created_at <= $3)
     ORDER BY created_at ASC`,
    [tenantId, startDate, endDate]
  );
  
  // Convert to CSV
  const csv = convertToCSV(logs.rows);
  
  return c.text(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
  });
});
```

---

## Monitoring and Alerting

### Metrics

Track the following metrics:

- Audit log write rate (logs per second)
- Audit log storage size
- Pseudonymization job success/failure
- Failed audit log writes

### Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Audit log write failures | > 10/min | Page on-call |
| Pseudonymization job failure | Any failure | Page on-call |
| Audit log storage > 90% | Storage quota | Alert (Slack) |

---

## Compliance Requirements

### SOC 2

- **CC6.1**: Logical and physical access controls
- **CC6.6**: Monitoring system changes
- **CC6.7**: Monitoring system resources

### GDPR

- **Article 30**: Records of processing activities
- **Article 32**: Security of processing
- **Article 33**: Notification of personal data breach

### ISO 27001

- **A.12.4.1**: Event logging
- **A.12.4.2**: Log protection
- **A.12.4.3**: Administrator and operator logs

---

## Best Practices

1. **Log early, log often**: Write audit logs immediately after the action completes
2. **Hash PII**: Never log plaintext email addresses, phone numbers, or IP addresses
3. **Use metadata**: Store additional context in the `metadata` JSONB field
4. **Set retention**: Always set `retention_until` to comply with GDPR
5. **Monitor failures**: Alert on audit log write failures
6. **Regular exports**: Provide regular CSV exports to auditors
7. **Secure access**: Restrict audit log access to auditors and admins only

---

*This document must be updated when new auditable events are added or when compliance requirements change.*
