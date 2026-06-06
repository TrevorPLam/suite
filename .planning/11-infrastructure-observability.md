# Observability Strategy

**Last updated:** 2026-06-04
**Version:** 1.0

---

## 1. Overview

Observability is critical for operating a distributed system like the Sovereign Suite. This document defines the observability strategy for monitoring logs, metrics, and traces across Cloudflare Workers, Durable Objects, VPS infrastructure, and frontend applications.

---

## 2. Observability Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Structured logging** | OpenTelemetry + JSON logs | Consistent log format across all services |
| **Metrics** | OpenTelemetry + Prometheus | Business and infrastructure metrics |
| **Tracing** | OpenTelemetry + Jaeger | Distributed tracing across services |
| **Log aggregation** | Cloudflare Analytics + VPS Loki | Centralized log storage and search |
| **Dashboards** | Grafana | Real-time visualization |
| **Alerting** | PagerDuty | On-call notification |

---

## 3. Structured Logging Schema

All logs across Workers, Durable Objects, and VPS must follow a consistent schema:

```typescript
interface LogEntry {
  timestamp: string;           // ISO 8601 format
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;             // e.g., 'calendar-api', 'drive-worker'
  environment: 'dev' | 'staging' | 'production';
  correlationId?: string;      // Request-scoped identifier
  userId?: string;            // Pseudonymized user identifier
  tenantId?: string;          // Tenant identifier
  message: string;            // Human-readable message
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: Record<string, unknown>; // Additional structured data
}
```

**Mandatory fields:** `timestamp`, `level`, `service`, `environment`, `message`

**Implementation in Hono:**

```typescript
// packages/observability/src/logger.ts
export function log(context: HonoContext, level: LogLevel, message: string, error?: Error, contextData?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: context.get('service'),
    environment: context.get('environment'),
    correlationId: context.get('correlationId'),
    userId: context.get('userId') ? pseudonymize(context.get('userId')) : undefined,
    tenantId: context.get('tenantId'),
    message,
    error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
    context: contextData,
  };
  
  console.log(JSON.stringify(entry));
}
```

---

## 4. Metrics Taxonomy

### 4.1 Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `requests_total` | Counter | Total API requests per endpoint |
| `request_duration_seconds` | Histogram | Request latency distribution |
| `errors_total` | Counter | Total errors per error type |
| `active_users` | Gauge | Number of active users |
| `storage_bytes` | Gauge | Storage usage per tenant |

### 4.2 Infrastructure Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `worker_cpu_time_ms` | Histogram | Worker CPU time per request |
| `worker_memory_mb` | Gauge | Worker memory usage |
| `do_active_connections` | Gauge | Durable Object active connections |
| `db_query_duration_seconds` | Histogram | Database query latency |
| `cache_hit_rate` | Gauge | KV cache hit rate |

### 4.3 Metrics Implementation

```typescript
// packages/observability/src/metrics.ts
import { Counter, Histogram, Gauge } from '@opentelemetry/api-metrics';

export const metrics = {
  requestsTotal: new Counter('requests_total', {
    description: 'Total API requests',
    attributes: ['endpoint', 'method', 'status'],
  }),
  
  requestDuration: new Histogram('request_duration_seconds', {
    description: 'Request latency',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),
  
  errorsTotal: new Counter('errors_total', {
    description: 'Total errors',
    attributes: ['error_type', 'service'],
  }),
};
```

---

## 5. Distributed Tracing

### 5.1 Correlation ID Propagation

Correlation IDs must be propagated across all service boundaries:

```typescript
// packages/observability/src/tracing.ts
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function injectCorrelationId(headers: Headers, correlationId: string): void {
  headers.set('X-Correlation-ID', correlationId);
}

export function extractCorrelationId(headers: Headers): string | undefined {
  return headers.get('X-Correlation-ID') || undefined;
}
```

### 5.2 Trace Sampling Strategy

- **Production:** Sample 1% of all traces
- **Staging:** Sample 10% of all traces
- **Development:** Sample 100% of traces

```typescript
// packages/observability/src/sampler.ts
export function shouldSampleTrace(environment: string): boolean {
  const sampleRates = {
    production: 0.01,
    staging: 0.10,
    development: 1.00,
  };
  return Math.random() < (sampleRates[environment] || 0.01);
}
```

---

## 6. Alerting Rules

### 6.1 Critical Alerts (Page Immediately)

| Condition | Threshold | Duration |
|-----------|-----------|----------|
| Error rate | > 5% | 5 minutes |
| P95 latency | > 2s | 5 minutes |
| Worker CPU time | > 90% | 5 minutes |
| Database connection failures | > 10% | 2 minutes |

### 6.2 Warning Alerts (Email Within 1 Hour)

| Condition | Threshold | Duration |
|-----------|-----------|----------|
| Error rate | > 1% | 15 minutes |
| P95 latency | > 1s | 15 minutes |
| Free tier limit usage | > 80% | 1 hour |

### 6.3 Alerting Implementation

```yaml
# grafana/alerts.yml
groups:
  - name: critical
    rules:
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5%"
          
      - alert: HighLatency
        expr: histogram_quantile(0.95, request_duration_seconds) > 2
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "P95 latency above 2s"
```

---

## 7. Cloudflare Workers Observability

### 7.1 Worker Logging

```typescript
// apps/calendar/api/src/index.ts
import { log } from '@suite/observability';

app.use('*', async (c, next) => {
  const correlationId = extractCorrelationId(c.req.header()) || generateCorrelationId();
  c.set('correlationId', correlationId);
  injectCorrelationId(c.header(), correlationId);
  
  const start = Date.now();
  try {
    await next();
    log(c, 'info', 'Request completed', undefined, {
      duration: Date.now() - start,
      status: c.res.status,
    });
  } catch (error) {
    log(c, 'error', 'Request failed', error, {
      duration: Date.now() - start,
    });
    throw error;
  }
});
```

### 7.2 Worker Metrics

Cloudflare Workers Analytics provides built-in metrics. Export additional metrics via OpenTelemetry:

```typescript
// packages/observability/src/worker-metrics.ts
export function recordWorkerMetrics(c: HonoContext, duration: number): void {
  metrics.requestsTotal.add(1, {
    endpoint: c.req.path,
    method: c.req.method,
    status: c.res.status.toString(),
  });
  
  metrics.requestDuration.record(duration / 1000);
}
```

---

## 8. VPS Observability

### 8.1 System Metrics

Install and configure Prometheus Node Exporter on the VPS:

```bash
# Install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.8.0/node_exporter-1.8.0.linux-amd64.tar.gz
tar xvfz node_exporter-1.8.0.linux-amd64.tar.gz
sudo mv node_exporter-1.8.0.linux-amd64/node_exporter /usr/local/bin/
sudo useradd --no-create-home --shell /bin/false node_exporter
sudo chown node_exporter:node_exporter /usr/local/bin/node_exporter

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

### 8.2 Application Metrics

Run Prometheus on the VPS to scrape application metrics:

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node_exporter'
    static_configs:
      - targets: ['localhost:9100']
      
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
      
  - job_name: 'ollama'
    static_configs:
      - targets: ['localhost:11434']
```

---

## 9. Frontend Observability

### 9.1 Web Vitals Monitoring

```typescript
// packages/ui-kit/src/hooks/useWebVitals.ts
import { onCLS, onFID, onLCP, onINP, onTTFB } from 'web-vitals';

export function useWebVitals() {
  useEffect(() => {
    const sendToAnalytics = (metric: any) => {
      // Send to analytics endpoint
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        body: JSON.stringify(metric),
      });
    };
    
    onCLS(sendToAnalytics);
    onFID(sendToAnalytics);
    onLCP(sendToAnalytics);
    onINP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }, []);
}
```

### 9.2 Error Tracking

```typescript
// packages/ui-kit/src/error-tracking.ts
export function initErrorTracking() {
  window.addEventListener('error', (event) => {
    logError({
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    });
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      message: 'Unhandled promise rejection',
      reason: event.reason,
    });
  });
}
```

---

## 10. Grafana Dashboards

### 10.1 Service Health Dashboard

- Request rate per endpoint
- Error rate per service
- P50/P95/P99 latency
- Active Durable Objects
- Database connection pool

### 10.2 Business Metrics Dashboard

- Active users (DAU/MAU)
- Storage usage per tenant
- Free tier limit utilization
- Subscription conversion rate

### 10.3 Infrastructure Dashboard

- VPS CPU/memory/disk usage
- Worker CPU time distribution
- KV cache hit rate
- R2 storage usage

---

## 11. Log Retention Policy

| Log Type | Retention Period | Notes |
|----------|-----------------|-------|
| Application logs | 30 days | Pseudonymized after 7 days |
| Audit logs | 7 years | For compliance |
| Security logs | 1 year | For incident response |
| Metrics | 90 days | High-resolution data |
| Traces | 7 days | Sampled data |

---

## 12. AI Agent Rules for Observability

```markdown
## Observability Rules (AI Agents Must Follow)

1. All new endpoints must include structured logging with correlation ID propagation.
2. All new metrics must be documented in the metrics taxonomy.
3. All error handlers must log errors with stack traces and context.
4. All async operations must include duration metrics.
5. All user-facing features must include Web Vitals monitoring.
6. All critical paths must include distributed tracing.
7. All logs must pseudonymize user IDs before logging.
8. All alerting rules must be tested before deployment.
```

---

*This document must be updated when the observability stack changes.*
