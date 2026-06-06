# Performance Budgets

This document defines the global SLI/SLO definitions, Core Web Vitals targets, encryption overhead benchmarks, database query budgets, and k6 load testing configuration for the Sovereign Suite.

---

## Global SLI/SLO Definitions

### API Endpoints

| Metric | Target | Measurement |
|--------|--------|-------------|
| **p50 latency** | < 50ms | Read endpoints (GET) |
| **p95 latency** | < 200ms | Read endpoints (GET) |
| **p99 latency** | < 500ms | Read endpoints (GET) |
| **p95 latency** | < 500ms | Write endpoints (POST, PUT, PATCH) |
| **p99 latency** | < 1000ms | Write endpoints (POST, PUT, PATCH) |
| **Error rate** | < 0.1% | All endpoints |
| **Availability** | > 99.9% | All endpoints |

### Real-Time WebSocket Message Delivery

| Metric | Target | Measurement |
|--------|--------|-------------|
| **p95 latency** | < 100ms | End-to-end (client → DO → client) |
| **p99 latency** | < 200ms | End-to-end (client → DO → client) |
| **Message loss rate** | < 0.01% | All WebSocket messages |

### Database Queries

| Metric | Target | Measurement |
|--------|--------|-------------|
| **p95 latency** | < 50ms | All queries |
| **p99 latency** | < 100ms | All queries |
| **Connection pool usage** | < 80% | PgBouncer |

---

## Frontend Core Web Vitals

### Minimum Targets

| Metric | Target | Good | Needs Improvement | Poor |
|--------|--------|------|-------------------|------|
| **LCP (Largest Contentful Paint)** | < 2.5s | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **CLS (Cumulative Layout Shift)** | < 0.1 | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **INP (Interaction to Next Paint)** | < 200ms | < 200ms | 200ms - 500ms | > 500ms |
| **FID (First Input Delay)** | < 100ms | < 100ms | 100ms - 300ms | > 300ms |
| **TTFB (Time to First Byte)** | < 600ms | < 600ms | 600ms - 1800ms | > 1800ms |

### Bundle Size Budgets

**📝 Vite 8 Upgrade Note:**

Vite 8.0 introduces Rolldown (Rust-based bundler) for significant build performance improvements. When upgrading to Vite 8:
- Verify that bundle size budgets remain within limits (Rolldown may produce different bundle sizes)
- Test the `size-limit` CI checks with the new bundler
- Update any Vite-specific build optimizations that may not be compatible with Rolldown
- Monitor build times and bundle sizes in CI after the upgrade

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Initial JS bundle** | < 150 KB gzipped | Per app |
| **Initial CSS bundle** | < 50 KB gzipped | Per app |
| **Total initial transfer** | < 250 KB gzipped | Per app |
| **Time to Interactive** | < 3.5s | 3G connection |

---

## Encryption Overhead Benchmarks

### PBKDF2 Key Derivation

| Iterations | Time (Mid-Range Android) | Time (Desktop) | Recommendation |
|------------|-------------------------|----------------|----------------|
| 100,000 | ~80ms | ~20ms | Too weak |
| 600,000 | ~500ms | ~120ms | ✅ Current |
| 1,000,000 | ~800ms | ~200ms | Too slow |

### AES-256-GCM Encryption

| Operation | Time (1 KB) | Time (10 KB) | Time (100 KB) |
|-----------|-------------|--------------|---------------|
| Encrypt | ~1ms | ~2ms | ~10ms |
| Decrypt | ~1ms | ~2ms | ~10ms |

### HMAC-SHA256 Blind Index

| Operation | Time | Notes |
|-----------|------|-------|
| Generate token | ~0.1ms | Per search term |
| Verify token | ~0.1ms | Per search term |

### Migration Path: OPAQUE/WebAuthn

To reduce PBKDF2 overhead, migrate to OPAQUE (austere password-authenticated key exchange) combined with WebAuthn:

- **OPAQUE**: Eliminates PBKDF2 on the server (client-side key derivation)
- **WebAuthn**: Hardware-backed authentication (biometrics, security keys)
- **Benefit**: Reduces login time from ~500ms to ~100ms

---

## Database Query Budgets

### Per-Query Limits

| Query Type | p95 Target | p99 Target | Action on Exceed |
|-------------|------------|------------|------------------|
| **Simple SELECT (by ID)** | < 10ms | < 20ms | Add index if exceeded |
| **SELECT with JOIN** | < 30ms | < 50ms | Optimize join or denormalize |
| **SELECT with aggregation** | < 50ms | < 100ms | Materialize view if exceeded |
| **INSERT** | < 20ms | < 40ms | Check connection pool |
| **UPDATE** | < 30ms | < 60ms | Check indexes |
| **DELETE** | < 30ms | < 60ms | Check foreign keys |

### N+1 Query Detection

Use Drizzle's query logging to detect N+1 queries:

```typescript
// packages/db/src/query-logger.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const db = drizzle(pool, {
  logger: {
    logQuery: (query, params) => {
      console.log('Query:', query);
      console.log('Params:', params);
    },
  },
});
```

### Index Optimization

Add composite indexes for common query patterns:

```sql
-- Tenant-scoped queries
CREATE INDEX idx_events_tenant_user ON calendar.events(tenant_id, user_id);
CREATE INDEX idx_files_tenant_parent ON drive.files(tenant_id, parent_id);

-- Time-series queries
CREATE INDEX idx_events_tenant_time ON calendar.events(tenant_id, created_at);
CREATE INDEX idx_messages_tenant_time ON mail.messages(tenant_id, received_at);
```

---

## k6 Load Testing Configuration

### Test Script

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
  },
};

const BASE_URL = 'https://staging.yourdomain.com';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/api/auth/sign-in`, {
    email: 'test@example.com',
    password: 'testpassword',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const token = loginRes.json('token');

  // Get events
  const eventsRes = http.get(`${BASE_URL}/api/events`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(eventsRes, {
    'events retrieved': (r) => r.status === 200,
    'events latency < 500ms': (r) => r.timings.duration < 500,
  });

  // Create event
  const createRes = http.post(
    `${BASE_URL}/api/events`,
    {
      title: 'Test Event',
      startAt: new Date().toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  check(createRes, {
    'event created': (r) => r.status === 201,
    'create latency < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Running the Test

```bash
# Run against staging
k6 run load-test.js

# Run with custom options
k6 run --out influxdb=http://localhost:8086/k6 load-test.js
```

### CI Integration

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday at 2 AM UTC

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
      - run: go install go.k6.io/k6@latest
      - run: k6 run load-test.js
        env:
          BASE_URL: https://staging.yourdomain.com
```

---

## Performance Monitoring

### Cloudflare Workers Analytics

Monitor the following metrics in the Cloudflare dashboard:

- **Request count**: Total requests per Worker
- **Errors**: 4xx and 5xx error rates
- **Latency**: p50, p95, p99 latency
- **CPU time**: CPU time consumed per request
- **Edge response**: Cache hit rate

### VPS Monitoring

Use Prometheus + Grafana to monitor:

- **CPU usage**: % CPU utilization
- **Memory usage**: % memory utilization
- **Disk I/O**: Read/write operations per second
- **Network I/O**: Inbound/outbound traffic
- **PostgreSQL**: Connection pool, query latency

### Frontend Monitoring

Use tools like:

- **Lighthouse**: Core Web Vitals
- **Web Vitals**: Real-user monitoring
- **Sentry**: Error tracking and performance

---

## Performance Budget Enforcement

### CI Checks

Add performance checks to CI:

```yaml
# .github/workflows/performance.yml
name: Performance Check

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm build
      - run: pnpm dev &
      - run: sleep 10
      - run: npx lighthouse http://localhost:3000 --output=json --output-path=lighthouse.json
      - run: |
          score=$(cat lighthouse.json | jq '.categories.performance.score * 100')
          if [ $score -lt 90 ]; then
            echo "Performance score too low: $score"
            exit 1
          fi
```

### Bundle Size Checks

```javascript
// .size-limit.js
module.exports = [
  {
    path: 'apps/calendar/web/dist/index.js',
    limit: '150 KB',
  },
  {
    path: 'apps/drive/web/dist/index.js',
    limit: '150 KB',
  },
];
```

```bash
# Run in CI
pnpm size-limit
```

---

## Performance Optimization Checklist

When adding a new feature:

- [ ] Measure baseline performance
- [ ] Add performance tests
- [ ] Optimize database queries (add indexes if needed)
- [ ] Optimize bundle size (code splitting if needed)
- [ ] Set performance budgets
- [ ] Add monitoring and alerting
- [ ] Document performance characteristics

---

## Common Performance Issues

### 1. Missing Database Indexes

**Symptom**: Slow queries on large tables

**Solution**: Add composite indexes on `(tenant_id, ...)` columns

### 2. N+1 Queries

**Symptom**: Many database queries for a single operation

**Solution**: Use joins or batch queries

### 3. Large Bundle Sizes

**Symptom**: Slow initial page load

**Solution**: Code splitting, lazy loading, tree shaking

### 4. Excessive Encryption Overhead

**Symptom**: Slow login or data access

**Solution**: Migrate to OPAQUE/WebAuthn, cache derived keys

### 5. Worker CPU Time Exceeded

**Symptom**: 502 errors from Workers

**Solution**: Optimize Worker code, move heavy computation to VPS

---

*This document must be updated when performance targets change or when new performance optimization techniques are introduced.*
