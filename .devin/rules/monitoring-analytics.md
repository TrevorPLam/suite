---
trigger: model_decision
description: Monitoring, analytics, and error tracking strategy for the YDM project (currently no monitoring exists)
---

# Monitoring & Analytics Rules

## Current State Assessment

**CRITICAL**: The repository has **no monitoring, analytics, or error tracking** implemented. This is a major gap for production readiness.

## Required Monitoring Stack

### **Error Tracking**

- **Primary**: Sentry for runtime error tracking
- **Backend**: Pino error logging with structured data
- **Frontend**: React Error Boundaries with Sentry integration
- **API**: HTTP error monitoring and alerting

### **Performance Monitoring**

- **Frontend**: Web Vitals (LCP, INP, CLS) monitoring
- **Backend**: API response time tracking
- **Database**: Query performance monitoring
- **Build**: Bundle size and build time tracking

### **User Analytics**

- **Privacy-focused**: Simple page view tracking
- **Business Metrics**: Lead conversion tracking
- **Performance**: User interaction metrics
- **No third-party cookies**: Privacy-first approach

## Error Tracking Implementation

### **Frontend Error Tracking**

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';

export function initSentry() {
  Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter out sensitive information
      if (event.exception) {
        // Remove PII from error events
        return event;
      }
    },
  });
}

// Error Boundary Component
// src/components/ErrorBoundary.tsx
import { ErrorBoundary } from '@sentry/react';

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>We've been notified about this issue.</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### **Backend Error Tracking**

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/node';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

// Express middleware
// src/middleware/sentry.ts
import { requestHandler, errorHandler } from '@sentry/node';

export const sentryRequestHandler = requestHandler();
export const sentryErrorHandler = errorHandler();
```

### **Structured Logging**

```typescript
// Enhanced Pino configuration
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    log: (object) => {
      // Remove sensitive data
      const { authorization, cookie, ...rest } = object as any;
      return rest;
    },
  },
  // Add error tracking integration
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

## Performance Monitoring

### **Web Vitals Tracking**

```typescript
// src/lib/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function initWebVitals() {
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
}

// Send to analytics service
function sendToAnalytics(metric: any) {
  // Send to privacy-focused analytics
  fetch('/api/analytics/vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
}
```

### **API Performance Monitoring**

```typescript
// src/middleware/performance.ts
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('API Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
    });

    // Alert on slow requests
    if (duration > 5000) {
      logger.warn('Slow API Request', {
        method: req.method,
        url: req.url,
        duration,
      });
    }
  });

  next();
}
```

## Analytics Implementation

### **Privacy-First Analytics**

```typescript
// src/lib/analytics.ts
interface AnalyticsEvent {
  type: 'page_view' | 'user_action' | 'conversion';
  path?: string;
  action?: string;
  timestamp: number;
  sessionId: string;
}

export class PrivacyAnalytics {
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  trackPageView(path: string) {
    this.sendEvent({
      type: 'page_view',
      path,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });
  }

  trackConversion(action: string) {
    this.sendEvent({
      type: 'conversion',
      action,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });
  }

  private sendEvent(event: AnalyticsEvent) {
    // Send to self-hosted analytics endpoint
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {
      // Fail silently - no blocking user experience
    });
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
```

### **Business Metrics Tracking**

```typescript
// Lead conversion tracking
export function trackLeadSubmission(industry: string, source: string) {
  analytics.trackConversion('lead_submitted');

  // Send business metrics
  fetch('/api/analytics/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      industry,
      source,
      timestamp: Date.now(),
    }),
  });
}

// Page engagement tracking
export function trackEngagement(action: string, context: string) {
  analytics.trackUserAction(action, context);
}
```

## Database Performance Monitoring

### **Query Performance Tracking**

```typescript
// lib/db/src/performance.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from '@workspace/api-server/lib/logger';

export function createPerformanceDb(connection: any) {
  const db = drizzle(connection);

  // Add query logging wrapper
  return new Proxy(db, {
    get(target, prop) {
      const value = target[prop];

      if (typeof value === 'function' && prop.startsWith('select')) {
        return function (...args: any[]) {
          const start = Date.now();
          const result = value.apply(target, args);

          if (result instanceof Promise) {
            return result.finally(() => {
              const duration = Date.now() - start;
              logger.debug('Database Query', {
                operation: prop,
                duration,
                args: args.length,
              });
            });
          }

          return result;
        };
      }

      return value;
    },
  });
}
```

## Health Check Enhancements

### **Comprehensive Health Endpoint**

```typescript
// src/routes/health.ts
router.get('/healthz', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks: {
      database: await checkDatabase(),
      memory: checkMemory(),
      disk: await checkDisk(),
      uptime: process.uptime(),
    },
  };

  const isHealthy = Object.values(health.checks).every((check) => check.status === 'ok');
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json(health);
});

async function checkDatabase() {
  try {
    await db.select().from(usersTable).limit(1);
    return { status: 'ok', latency: Date.now() };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

function checkMemory() {
  const usage = process.memoryUsage();
  const threshold = 500 * 1024 * 1024; // 500MB

  return {
    status: usage.heapUsed < threshold ? 'ok' : 'warning',
    usage: {
      heap: Math.round(usage.heapUsed / 1024 / 1024),
      threshold: Math.round(threshold / 1024 / 1024),
    },
  };
}
```

## Alerting Configuration

### **Error Alerting**

```typescript
// src/lib/alerts.ts
export class AlertManager {
  static sendAlert(level: 'error' | 'warning', message: string, context: any) {
    const alert = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      service: 'ydm-api',
    };

    // Send to monitoring service
    if (level === 'error') {
      this.sendUrgentAlert(alert);
    } else {
      this.sendInfoAlert(alert);
    }
  }

  private static async sendUrgentAlert(alert: any) {
    // Integration with monitoring service
    // Could be Slack, Discord, email, etc.
    logger.error('ALERT', alert);
  }

  private static async sendInfoAlert(alert: any) {
    logger.warn('ALERT', alert);
  }
}
```

## Monitoring Dashboard

### **Metrics Collection**

```typescript
// src/routes/metrics.ts
router.get('/metrics', async (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    requests: {
      total: requestCount,
      errors: errorCount,
      averageLatency: averageLatency,
    },
    database: {
      connections: activeConnections,
      queryTime: averageQueryTime,
    },
  };

  res.json(metrics);
});
```

## Configuration & Environment

### **Environment Variables**

```bash
# Error Tracking
SENTRY_DSN=your_sentry_dsn_here
SENTRY_ENVIRONMENT=production

# Analytics
ANALYTICS_ENABLED=true
ANALYTICS_ENDPOINT=https://your-analytics.com/events

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
```

## Privacy & Compliance

### **GDPR Compliance**

- No personal data collected without consent
- Cookie-less tracking implementation
- Data retention policies
- Right to deletion implementation

### **Data Minimization**

```typescript
// Strip PII from all tracking data
function sanitizeData(data: any): any {
  const { email, name, phone, ...sanitized } = data;
  return sanitized;
}
```

## Implementation Priority

### **Phase 1: Foundation**

1. Set up Sentry for error tracking
2. Implement basic logging
3. Add health check enhancements
4. Set up performance monitoring

### **Phase 2: Analytics**

1. Implement privacy-first analytics
2. Add business metrics tracking
3. Create monitoring dashboard
4. Set up alerting

### **Phase 3: Advanced**

1. Database query monitoring
2. User behavior analytics
3. Custom alerting rules
4. Performance optimization

## Best Practices

### **Error Handling**

- Always log errors with context
- Never expose sensitive data in logs
- Use structured logging format
- Implement graceful degradation

### **Performance**

- Monitor key user journeys
- Set performance budgets
- Alert on degradation
- Track Core Web Vitals

### **Privacy**

- Default to no tracking
- Be transparent about data collection
- Minimize data collection
- Provide opt-out options

This monitoring strategy ensures production readiness while maintaining user privacy and system reliability.
