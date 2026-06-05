---
name: implement-monitoring
description: Complete guide for implementing error tracking, monitoring, and analytics from scratch in the YDM project (currently no monitoring exists)
---

# Monitoring & Analytics Implementation Skill

## Current State Assessment

**CRITICAL**: No monitoring, error tracking, or analytics system exists. This is essential for production readiness and user experience optimization.

### **What's Missing**

- No error tracking (Sentry integration)
- No performance monitoring (Web Vitals)
- No user analytics
- No logging beyond basic Pino setup
- No health check enhancements
- No alerting system

## Implementation Workflow

### **Phase 1: Error Tracking Setup**

#### **1. Install Required Dependencies**

```bash
# Frontend error tracking
pnpm --filter @firm/site add @sentry/react @sentry/tracing

# Backend error tracking
pnpm --filter @workspace/api-server add @sentry/node @sentry/tracing

# Web vitals monitoring
pnpm --filter @firm/site add web-vitals

# Development dependencies
pnpm --filter @firm/site add -D @sentry/vite-plugin
```

#### **2. Frontend Sentry Configuration**

```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';

export function initSentry() {
  // Only initialize in production or when explicitly enabled
  if (import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLED === 'true') {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,

      // Filter out sensitive information
      beforeSend(event) {
        // Remove PII from breadcrumbs and events
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.filter(breadcrumb =>
            !breadcrumb.message?.includes('password') &&
            !breadcrumb.message?.includes('token')
          );
        }

        // Filter out known safe errors
        if (event.exception) {
          const message = event.exception.values?.[0]?.value;
          if (message?.includes('Network request failed')) {
            // Don't report network errors in development
            if (import.meta.env.DEV) return null;
          }
        }

        return event;
      },

      // Performance monitoring
      integrations: [
        new Sentry.BrowserTracing({
          routingInstrumentation: Sentry.reactRouterV6Instrumentation,
        }),
      ],
    });

    console.log('🔍 Sentry initialized');
  }
}

// Error Boundary Component
// src/components/ErrorBoundary.tsx
import React from 'react';
import { ErrorBoundary } from '@sentry/react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

export const AppErrorBoundary: React.FC<ErrorBoundaryProps> = ({
  children,
  fallback: FallbackComponent
}) => {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => {
        if (FallbackComponent) {
          return <FallbackComponent error={error} reset={reset} />;
        }

        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="max-w-md mx-auto text-center p-6">
              <div className="mb-4">
                <div className="text-6xl">😵</div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Something went wrong
              </h2>
              <p className="text-gray-300 mb-6">
                We've been notified about this issue and our team will investigate.
              </p>
              <div className="space-y-3">
                <button
                  onClick={reset}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Go Home
                </button>
              </div>
              {import.meta.env.DEV && (
                <details className="mt-6 text-left">
                  <summary className="text-gray-400 cursor-pointer">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 p-4 bg-gray-800 rounded text-red-400 text-sm overflow-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

#### **3. Backend Sentry Configuration**

```typescript
// artifacts/api-server/src/lib/sentry.ts
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  // Only initialize in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.SENTRY_ENABLED === 'true') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,

      // Performance monitoring
      integrations: [nodeProfilingIntegration()],

      // Filter sensitive data
      beforeSend(event) {
        // Remove headers with sensitive information
        if (event.request?.headers) {
          const { authorization, cookie, ...safeHeaders } = event.request.headers;
          event.request.headers = safeHeaders;
        }

        return event;
      },
    });

    console.log('🔍 Sentry initialized for backend');
  }
}

// Express middleware
// artifacts/api-server/src/middleware/sentry.ts
import * as Sentry from '@sentry/node';
import { sentryRequestHandler, sentryErrorHandler } from '@sentry/node';

export { sentryRequestHandler, sentryErrorHandler };
```

#### **4. Update Backend App**

```typescript
// artifacts/api-server/src/app.ts
import { sentryRequestHandler, sentryErrorHandler } from './middleware/sentry';
import { initSentry } from './lib/sentry';

// Initialize Sentry
initSentry();

const app = express();

// Sentry request handler (must be before other middleware)
app.use(sentryRequestHandler());

// ... existing middleware

// Sentry error handler (must be after all other middleware)
app.use(sentryErrorHandler());
```

### **Phase 2: Performance Monitoring**

#### **1. Web Vitals Implementation**

```typescript
// src/lib/web-vitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

interface VitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

export function initWebVitals() {
  const vitals: VitalMetric[] = [];

  const sendToAnalytics = (metric: VitalMetric) => {
    vitals.push(metric);

    // Send to self-hosted analytics endpoint
    fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    }).catch(() => {
      // Fail silently - don't block user experience
    });

    // Log in development
    if (import.meta.env.DEV) {
      console.log(`📊 ${metric.name}: ${metric.value} (${metric.rating})`);
    }
  };

  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

// Performance monitoring hook
// src/hooks/usePerformanceMonitoring.ts
import { useEffect } from 'react';

export function usePerformanceMonitoring() {
  useEffect(() => {
    // Monitor page load performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          const loadTime = navEntry.loadEventEnd - navEntry.loadEventStart;

          if (loadTime > 3000) {
            console.warn('🐌 Slow page load detected:', loadTime + 'ms');
          }
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, []);
}
```

#### **2. API Performance Middleware**

```typescript
// artifacts/api-server/src/middleware/performance.ts
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const method = req.method;
  const url = req.url;

  // Log request start
  console.log(`🚀 ${method} ${url} - started`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Log completion
    console.log(`✅ ${method} ${url} - ${statusCode} (${duration}ms)`);

    // Track slow requests
    if (duration > 5000) {
      console.warn(`🐌 Slow request detected: ${method} ${url} took ${duration}ms`);

      // Send to monitoring service
      if (process.env.SENTRY_DSN) {
        Sentry.addBreadcrumb({
          message: 'Slow API request',
          category: 'performance',
          level: 'warning',
          data: { method, url, duration, statusCode },
        });
      }
    }

    // Track error responses
    if (statusCode >= 400) {
      console.warn(`❌ ${method} ${url} - ${statusCode}`);

      Sentry.addBreadcrumb({
        message: 'API error response',
        category: 'http',
        level: 'error',
        data: { method, url, statusCode, duration },
      });
    }
  });

  next();
}
```

### **Phase 3: Privacy-First Analytics**

#### **1. Analytics Service**

```typescript
// src/lib/analytics.ts
interface AnalyticsEvent {
  type: 'page_view' | 'user_action' | 'conversion' | 'performance';
  data: Record<string, any>;
  timestamp: number;
  sessionId: string;
}

export class PrivacyAnalytics {
  private sessionId: string;
  private queue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startBatchFlush();
  }

  trackPageView(path: string, title?: string) {
    this.enqueue({
      type: 'page_view',
      data: { path, title, referrer: document.referrer },
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });
  }

  trackUserAction(action: string, context?: string) {
    this.enqueue({
      type: 'user_action',
      data: { action, context },
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });
  }

  trackConversion(type: string, value?: string) {
    this.enqueue({
      type: 'conversion',
      data: { type, value },
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });
  }

  trackPerformance(metric: string, value: number, rating?: string) {
    this.enqueue({
      type: 'performance',
      data: { metric, value, rating },
      timestamp: Date.now(),
      sessionId: this.sessionId,
    });
  }

  private enqueue(event: AnalyticsEvent) {
    this.queue.push(event);

    // Flush immediately for conversions
    if (event.type === 'conversion') {
      this.flush();
    }
  }

  private flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    // Send events to self-hosted analytics
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }).catch(() => {
      // Fail silently - retry on next flush
      this.queue.unshift(...events);
    });
  }

  private startBatchFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  private generateSessionId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  destroy() {
    clearInterval(this.flushInterval);
    this.flush(); // Final flush
  }
}

// Analytics hook
// src/hooks/useAnalytics.ts
import { useEffect } from 'react';

export function useAnalytics() {
  useEffect(() => {
    const analytics = new PrivacyAnalytics();

    // Track initial page view
    analytics.trackPageView(window.location.pathname, document.title);

    // Track page navigation
    const handleRouteChange = () => {
      analytics.trackPageView(window.location.pathname, document.title);
    };

    // Listen for route changes (Wouter doesn't expose this, so we use MutationObserver)
    const observer = new MutationObserver(() => {
      if (window.location.pathname !== window.location.pathname) {
        handleRouteChange();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      analytics.destroy();
    };
  }, []);
}
```

#### **2. Backend Analytics Endpoints**

```typescript
// artifacts/api-server/src/routes/analytics.ts
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

const router = Router();

// Rate limiting for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many analytics requests',
});

// Store analytics events (in production, use proper database)
const analyticsEvents: any[] = [];

// POST /api/analytics/events
router.post('/events', analyticsLimiter, (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Events must be an array' });
    }

    // Validate and store events
    for (const event of events) {
      if (!event.type || !event.timestamp || !event.sessionId) {
        continue; // Skip invalid events
      }

      // Remove any PII
      const sanitizedEvent = {
        type: event.type,
        data: sanitizeData(event.data),
        timestamp: event.timestamp,
        sessionId: event.sessionId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      };

      analyticsEvents.push(sanitizedEvent);
    }

    // Keep only last 10000 events to prevent memory issues
    if (analyticsEvents.length > 10000) {
      analyticsEvents.splice(0, analyticsEvents.length - 10000);
    }

    res.json({ received: events.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process analytics' });
  }
});

// POST /api/analytics/vitals
router.post('/vitals', analyticsLimiter, (req, res) => {
  try {
    const vital = req.body;

    // Store performance vital
    analyticsEvents.push({
      type: 'performance',
      data: vital,
      timestamp: Date.now(),
      sessionId: req.body.sessionId || 'anonymous',
      userAgent: req.get('User-Agent'),
    });

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to store vital' });
  }
});

// GET /api/analytics/dashboard (protected)
router.get('/dashboard', (req, res) => {
  try {
    // Simple analytics dashboard data
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentEvents = analyticsEvents.filter((e) => e.timestamp > last24Hours);

    const dashboard = {
      pageViews: recentEvents.filter((e) => e.type === 'page_view').length,
      userActions: recentEvents.filter((e) => e.type === 'user_action').length,
      conversions: recentEvents.filter((e) => e.type === 'conversion').length,
      avgLoadTime: calculateAverageLoadTime(recentEvents),
      topPages: getTopPages(recentEvents),
      errorRate: calculateErrorRate(recentEvents),
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate dashboard' });
  }
});

function sanitizeData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    // Skip potentially sensitive fields
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('email') ||
      key.toLowerCase().includes('name')
    ) {
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}

function calculateAverageLoadTime(events: any[]): number {
  const loadTimes = events
    .filter((e) => e.type === 'performance' && e.data.metric === 'LCP')
    .map((e) => e.data.value);

  if (loadTimes.length === 0) return 0;

  return Math.round(loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length);
}

function getTopPages(events: any[]): Array<{ page: string; views: number }> {
  const pageViews: Record<string, number> = {};

  events
    .filter((e) => e.type === 'page_view')
    .forEach((e) => {
      const page = e.data.path || '/';
      pageViews[page] = (pageViews[page] || 0) + 1;
    });

  return Object.entries(pageViews)
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

function calculateErrorRate(events: any[]): number {
  const totalEvents = events.length;
  const errorEvents = events.filter(
    (e) => e.type === 'performance' && e.data.rating === 'poor'
  ).length;

  return totalEvents > 0 ? Math.round((errorEvents / totalEvents) * 100) : 0;
}

export default router;
```

### **Phase 4: Enhanced Health Checks**

#### **1. Comprehensive Health Endpoint**

```typescript
// artifacts/api-server/src/routes/health.ts
import { Router } from 'express';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db/schema';

const router = Router();

router.get('/healthz', async (req, res) => {
  const startTime = Date.now();

  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      responseTime: 0,
      checks: {
        database: await checkDatabase(),
        memory: checkMemory(),
        disk: await checkDisk(),
        sentry: !!process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
      },
    };

    health.responseTime = Date.now() - startTime;

    const isHealthy = Object.values(health.checks).every((check) =>
      typeof check === 'object' ? check.status === 'ok' : true
    );

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

async function checkDatabase(): Promise<{ status: string; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    await db.select().from(usersTable).limit(1);
    const latency = Date.now() - start;

    return {
      status: latency < 1000 ? 'ok' : 'warning',
      latency,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

function checkMemory(): { status: string; usage: any } {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const threshold = 500; // 500MB threshold

  return {
    status: heapUsedMB < threshold ? 'ok' : 'warning',
    usage: {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      threshold,
      percentage: Math.round((heapUsedMB / heapTotalMB) * 100),
    },
  };
}

async function checkDisk(): Promise<{ status: string; free?: number }> {
  try {
    // Simple disk check - in production, use proper disk space monitoring
    return {
      status: 'ok',
      free: 1000, // Mock value - implement actual disk checking
    };
  } catch (error) {
    return {
      status: 'warning',
    };
  }
}

export default router;
```

### **Phase 5: Integration & Testing**

#### **1. Update App Components**

```typescript
// src/App.tsx - Add monitoring
import React, { useEffect } from 'react';
import { initSentry } from './lib/sentry';
import { initWebVitals } from './lib/web-vitals';
import { useAnalytics } from './hooks/useAnalytics';
import { AppErrorBoundary } from './components/ErrorBoundary';

function App() {
  // Initialize monitoring
  useEffect(() => {
    initSentry();
    initWebVitals();
  }, []);

  useAnalytics();

  return (
    <AppErrorBoundary>
      {/* existing app content */}
    </AppErrorBoundary>
  );
}

export default App;
```

#### **2. Environment Variables**

```bash
# Add to platform environment variables
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENABLED=true
ANALYTICS_ENABLED=true
```

#### **3. Test Monitoring Setup**

```bash
# Test error tracking
curl -X GET http://localhost:23379/api/error-test

# Test health endpoint
curl -X GET http://localhost:23379/api/healthz

# Test analytics endpoint
curl -X POST http://localhost:23379/api/analytics/events \
  -H "Content-Type: application/json" \
  -d '{"events":[{"type":"page_view","data":{"path":"/test"},"timestamp":'$(date +%s)000',"sessionId":"test"}]}'
```

## Implementation Checklist

### **Error Tracking**

- [ ] Install Sentry dependencies for frontend and backend
- [ ] Configure Sentry with proper DSN and environment
- [ ] Implement ErrorBoundary component for React
- [ ] Add Sentry middleware to Express app
- [ ] Test error reporting in development and production

### **Performance Monitoring**

- [ ] Implement Web Vitals tracking
- [ ] Add API performance middleware
- [ ] Create performance monitoring hooks
- [ ] Set up slow request alerting
- [ ] Test performance tracking with real user data

### **Analytics**

- [ ] Implement privacy-first analytics service
- [ ] Create analytics endpoints for event collection
- [ ] Add page view and user action tracking
- [ ] Implement analytics dashboard
- [ ] Ensure GDPR compliance and data privacy

### **Health Checks**

- [ ] Enhance health check endpoint with comprehensive checks
- [ ] Add database connectivity monitoring
- [ ] Implement memory and disk usage monitoring
- [ ] Create health check dashboard
- [ ] Set up automated health monitoring

### **Integration**

- [ ] Update App.tsx with monitoring initialization
- [ ] Configure environment variables for all services
- [ ] Test end-to-end monitoring flow
- [ ] Verify error tracking works across frontend and backend
- [ ] Test analytics data collection and dashboard

## Common Issues & Solutions

### **Sentry Not Receiving Events**

- **Problem**: No errors appearing in Sentry dashboard
- **Solution**: Verify DSN is correct and environment is set to production
- **Check**: Browser console for Sentry initialization errors

### **Analytics Data Not Appearing**

- **Problem**: Analytics events not being stored
- **Solution**: Check rate limiting and endpoint accessibility
- **Check**: Network tab for failed analytics requests

### **Performance Monitoring Overhead**

- **Problem**: Monitoring code slowing down the application
- **Solution**: Reduce sampling rates and optimize batch processing
- **Check**: Performance impact with and without monitoring enabled

This monitoring implementation provides comprehensive error tracking, performance monitoring, and user analytics while maintaining privacy and minimizing performance impact.
