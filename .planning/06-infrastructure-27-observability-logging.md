# Observability and Logging

This document defines the structured logging schema, safe-to-log field policies, distributed tracing patterns, alert thresholds, and monitoring stack for the Sovereign Suite.

---

## Mandatory Log Fields

Every log entry must include these fields:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `requestId` | `string` | Unique request identifier for tracing | `req_abc123xyz` |
| `userId` | `string` | User ID (if authenticated) | `user_456` |
| `tenantId` | `string` | Tenant ID for multi-tenancy | `tenant_789` |
| `operation` | `string` | Operation being performed | `createEvent` |
| `durationMs` | `number` | Operation duration in milliseconds | `123` |
| `errorCode` | `string` | Error code (if error occurred) | `calendar_event_not_found` |
| `workerName` | `string` | Worker or service name | `calendar-worker` |
| `timestamp` | `string` | ISO 8601 timestamp | `2026-06-01T10:00:00Z` |
| `level` | `string` | Log level | `INFO` |

---

## Safe-to-Log vs Never-Log Fields

### Safe-to-Log (Plaintext)

The following fields are safe to log:

- Request IDs
- User IDs (UUIDs)
- Tenant IDs (UUIDs)
- Operation names
- Duration metrics
- Error codes
- Worker names
- Timestamps
- HTTP status codes
- Request paths (without query parameters)
- Response sizes
- Database query patterns (without values)

### Never-Log (Zero-Knowledge Violation)

The following fields must NEVER be logged:

- **Plaintext user content**: Event descriptions, file contents, email bodies, task notes
- **Encryption keys**: Master keys, domain keys, resource keys, salts
- **Authentication tokens**: Session tokens, OAuth tokens, API keys
- **Passwords**: In any form (even hashed)
- **PII**: Email addresses, phone numbers, addresses (unless hashed)
- **Search queries**: Raw search terms (use blind index tokens instead)
- **Request parameters**: Query string parameters, form data

### Hashed Fields (When Logging is Necessary)

If you must log sensitive identifiers, use SHA-256 hashing:

```typescript
import { createHash } from 'crypto';

function hashPII(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// Log hashed email instead of plaintext
console.log({
  emailHash: hashPII(user.email),
  // Never log: email: user.email
});
```

---

## Log Levels and Decision Rules

| Level | Usage | Example |
|-------|-------|---------|
| `DEBUG` | Detailed diagnostic information (disabled in production) | Database query execution plan |
| `INFO` | Normal operation milestones | User signed in, event created |
| `WARN` | Unexpected but non-critical conditions | Retryable operation failed, high latency |
| `ERROR` | Error conditions that don't stop the service | Failed to send email, database constraint violation |
| `FATAL` | Critical errors that stop the service | Database connection lost, out of memory |

### Decision Rules

```typescript
function getLogLevel(error: any, durationMs: number): string {
  // FATAL: Service-critical errors
  if (error.code === 'ECONNREFUSED' || error.code === 'OUT_OF_MEMORY') {
    return 'FATAL';
  }
  
  // ERROR: All other errors
  if (error) {
    return 'ERROR';
  }
  
  // WARN: High latency (> 500ms p95 threshold)
  if (durationMs > 500) {
    return 'WARN';
  }
  
  // INFO: Normal operations
  return 'INFO';
}
```

---

## Distributed Trace Propagation

### Request ID Flow

The request ID flows through the entire stack:

```
Browser → Worker → Durable Object → PostgreSQL → VPS
```

### Implementation

```typescript
// Generate request ID at entry point
import { randomUUID } from 'crypto';

function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

// Pass request ID via header
const requestId = generateRequestId();
const response = await fetch('https://api.yourdomain.com/events', {
  headers: {
    'X-Request-Id': requestId,
  },
});

// Extract and propagate in Worker
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-Id') || generateRequestId();
  c.set('requestId', requestId);
  
  // Add to all logs
  const originalConsole = console.log;
  console.log = (...args) => {
    originalConsole({ requestId, ...args[0] });
  };
  
  await next();
});

// Pass to Durable Object via RPC
const stub = env.CALENDAR_DO.get(id);
await stub.fetchEvent(eventId, { requestId });

// Pass to PostgreSQL via application_name
await db.query('SET application_name = $1', [requestId]);
```

### OpenTelemetry Integration

```typescript
// packages/api/src/tracing.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('sovereign-suite');

export async function tracedOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(operation, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Alert Threshold Definitions

### Worker Error Rate

| Metric | Threshold | Action |
|--------|-----------|--------|
| Worker error rate | > 1% for 5 minutes | Page on-call |
| Worker error rate | > 5% for 1 minute | Page on-call + disable affected Worker |

### Latency

| Metric | Threshold | Action |
|--------|-----------|--------|
| p95 latency | > 500ms for 5 minutes | Alert (Slack) |
| p95 latency | > 1000ms for 1 minute | Page on-call |
| p99 latency | > 2000ms for 5 minutes | Page on-call |

### Authentication

| Metric | Threshold | Action |
|--------|-----------|--------|
| Failed auth attempts | > 100/min per IP | Block IP |
| Failed auth attempts | > 1000/min globally | Page on-call (possible attack) |

### Database

| Metric | Threshold | Action |
|--------|-----------|--------|
| Connection pool usage | > 80% for 5 minutes | Alert (Slack) |
| Connection pool usage | > 95% for 1 minute | Page on-call |
| Query duration p95 | > 50ms for 5 minutes | Alert (Slack) |
| Query duration p95 | > 100ms for 1 minute | Page on-call |

### Storage

| Metric | Threshold | Action |
|--------|-----------|--------|
| R2 storage | > 80% of quota | Alert (Slack) |
| R2 storage | > 95% of quota | Page on-call |
| Database size | > 80% of quota | Alert (Slack) |
| Database size | > 95% of quota | Page on-call |

---

## Prometheus Metrics from VPS

### Node Exporter Metrics

The VPS runs `node_exporter` to expose system metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['vps.yourdomain.com:9100']
```

### Key Metrics

| Metric | Description |
|--------|-------------|
| `node_cpu_seconds_total` | CPU usage per core |
| `node_memory_MemAvailable_bytes` | Available memory |
| `node_filesystem_avail_bytes` | Available disk space |
| `node_network_receive_bytes_total` | Network inbound traffic |
| `node_network_transmit_bytes_total` | Network outbound traffic |
| `node_boot_time_seconds` | System uptime |

### Grafana Dashboard

Create a Grafana dashboard with panels for:

1. **CPU Usage**: Gauge chart showing % CPU utilization
2. **Memory Usage**: Gauge chart showing % memory utilization
3. **Disk Usage**: Gauge chart showing % disk utilization
4. **Network Traffic**: Time series of inbound/outbound bytes
5. **System Load**: Time series of 1m, 5m, 15m load averages
6. **Uptime**: Single stat showing system uptime

---

## Cloudflare Workers Metrics

### Workers Analytics

Cloudflare provides built-in analytics for Workers:

| Metric | Description |
|--------|-------------|
| `requests` | Total requests to Worker |
| `errors` | Total errors (4xx + 5xx) |
| `latency` | Request latency in milliseconds |
| `cpuTime` | CPU time consumed in milliseconds |
| `statusCodes` | Breakdown by HTTP status code |

### Custom Metrics with Workers Analytics Engine

```typescript
// apps/calendar/api/src/middleware/metrics.ts
export async function recordMetrics(c: Context, durationMs: number) {
  await c.env.ANALYTICS_ENGINE.writeDataPoint({
    blobs: [c.req.method, c.req.path],
    doubles: [durationMs],
    indexes: [c.get('tenantId') || 'anonymous'],
  });
}
```

---

## Log Aggregation

### Cloudflare Logpush

Configure Logpush to send Worker logs to R2 for long-term retention:

```toml
# wrangler.toml
[logpush]
enabled = true
destination = "r2://suite-logs/worker-logs"
format = "json"
```

### VPS Logs

Use `journalctl` for systemd services:

```bash
# View logs for a service
journalctl -u suite-api -f

# Export logs to file
journalctl -u suite-api --since "1 hour ago" > api-logs.json
```

---

## Structured Logging Implementation

### Hono Logger Middleware

```typescript
// packages/api/src/middleware/logger.ts
import { logger } from 'hono/logger';

export const structuredLogger = logger((message, ...rest) => {
  const logEntry = {
    level: 'INFO',
    timestamp: new Date().toISOString(),
    message,
    ...rest[0],
  };
  console.log(JSON.stringify(logEntry));
});
```

### Domain Package Logging

```typescript
// packages/domain-calendar/src/lib/create-event.ts
import { logger } from '@suite/logger';

export async function createEvent(input: CreateEventInput) {
  const startTime = Date.now();
  
  logger.info('Creating event', {
    operation: 'createEvent',
    tenantId: input.tenantId,
    userId: input.userId,
  });
  
  try {
    const event = await db.insert(calendarEvents).values(input).returning();
    
    logger.info('Event created successfully', {
      operation: 'createEvent',
      durationMs: Date.now() - startTime,
      eventId: event[0].id,
    });
    
    return { success: true, data: event[0] };
  } catch (error) {
    logger.error('Failed to create event', {
      operation: 'createEvent',
      durationMs: Date.now() - startTime,
      errorCode: error.code,
      errorMessage: error.message,
    });
    
    throw error;
  }
}
```

---

## Log Retention

| Log Type | Retention Period | Storage |
|----------|------------------|---------|
| Worker logs | 30 days | Cloudflare Logpush → R2 |
| VPS application logs | 30 days | Local disk → R2 backup |
| VPS system logs | 7 days | Local disk |
| Audit logs | 7 years (GDPR) | PostgreSQL with pseudonymization |

---

## Monitoring Stack Architecture

```
┌─────────────────┐
│   Browser       │
└────────┬────────┘
         │ X-Request-Id
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Workers         │
└────────┬────────┘
         │ Metrics (Analytics Engine)
         │ Logs (Logpush → R2)
         ▼
┌─────────────────┐
│ Grafana         │
│ (Dashboards)    │
└─────────────────┘
         ▲
         │ Metrics
┌─────────────────┐
│ Prometheus      │
│ (Scrapes)       │
└────────┬────────┘
         │
┌─────────────────┐
│ VPS             │
│ (Node Exporter) │
└─────────────────┘
```

---

## Alerting Channels

| Severity | Channel | Escalation |
|----------|---------|------------|
| P1 (Critical) | PagerDuty → SMS → Phone call | 5 minutes |
| P2 (High) | Slack #on-call → Email | 15 minutes |
| P3 (Medium) | Slack #alerts | 1 hour |
| P4 (Low) | Email digest | Daily |

---

## Runbooks

### Worker Error Rate > 1%

1. Check Cloudflare Workers analytics for error breakdown
2. Identify common error codes
3. Check recent deployments for regressions
4. If deployment-related, rollback to previous version
5. If database-related, check connection pool status
6. If Durable Object-related, check DO alarm failures

### Database Connection Pool > 80%

1. Check for long-running queries using `pg_stat_statements`
2. Kill long-running queries if necessary
3. Check for connection leaks in application code
4. Increase pool size temporarily if needed
5. Investigate root cause (N+1 queries, missing indexes)

### High Latency (> 500ms p95)

1. Check Cloudflare Workers CPU time metrics
2. Check database query performance
3. Check Durable Object storage operations
4. Check external API calls (if any)
5. Profile Worker code for bottlenecks

---

## Observability Checklist

When adding a new feature:

1. **Add structured logging** with mandatory fields
2. **Add operation duration tracking**
3. **Add error logging with error codes**
4. **Add request ID propagation**
5. **Add Prometheus metrics** (if applicable)
6. **Add alert thresholds** (if applicable)
7. **Update Grafana dashboard** (if applicable)
8. **Document runbook** for common failures

---

*This document must be updated when new monitoring patterns are introduced or when alert thresholds change.*
