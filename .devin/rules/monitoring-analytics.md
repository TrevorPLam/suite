---
trigger: glob
globs: apps/*/api/**/*.ts
---

# Monitoring and Analytics

All APIs must implement error tracking with Sentry and Web Vitals monitoring for performance observability.

## Sentry Error Tracking

### Installation

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Error Context

Include relevant context in error reports:

```typescript
try {
  await createEvent(data);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      userId: session.userId,
      action: 'create_event',
    },
    extra: {
      eventData: data,
      timestamp: new Date().toISOString(),
    },
  });
  throw error;
}
```

### Transaction Tracing

Wrap critical operations in transactions:

```typescript
const transaction = Sentry.startTransaction({
  op: 'database',
  name: 'create_event',
});

try {
  await db.insert(events).values(data);
} finally {
  transaction.finish();
}
```

## Web Vitals Monitoring

### Core Web Vitals

Monitor these key metrics:
- **LCP** (Largest Contentful Paint): Loading performance
- **INP** (Interaction to Next Paint): Interactivity
- **CLS** (Cumulative Layout Shift): Visual stability

### Client-Side Setup

```typescript
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Performance Monitoring

Track slow operations with span waterfalls:

```typescript
const span = Sentry.startSpan({
  op: 'function',
  name: 'process_event',
}, () => {
  // Expensive operation
  return processEventData(data);
});
```

## Privacy-First Analytics

### Data Minimization

- Never log sensitive user data (PII, encryption keys, passwords)
- Anonymize user IDs in analytics
- Minimize log retention (7 days default)
- Use identifier obfuscation

### Consent Management

Respect user privacy preferences:

```typescript
if (user.analyticsConsent) {
  Sentry.setUser({ id: anonymizedUserId });
} else {
  Sentry.setUser(null);
}
```

## Structured Logging

### Log Levels

```typescript
import { logger } from '@suite/logging';

logger.info('User signed in', { userId });
logger.warn('Rate limit approaching', { usage, limit });
logger.error('Database connection failed', { error });
```

### Correlation IDs

Include correlation IDs for request tracing:

```typescript
const correlationId = crypto.randomUUID();
logger.setContext({ correlationId });

// All logs in this request include correlationId
logger.info('Processing request', { path, method });
```

## Alerting

### Critical Alerts

Set up alerts for:
- Error rate spike (> 5% increase)
- Web Vitals degradation (LCP > 2.5s, INP > 200ms, CLS > 0.1)
- API latency increase (> 50th percentile + 50%)
- Database connection failures

### Notification Channels

- PagerDuty for critical incidents
- Slack for warnings
- Email for daily summaries

## Enforcement

- Code reviews check for missing Sentry initialization
- Static analysis flags logging of sensitive data
- Monitoring dashboard verifies Web Vitals collection
- Security audits review data retention policies
