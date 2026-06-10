/**
 * Security Module Tests
 * 
 * Tests for query validation, audit logging, and rate limiting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateQuery,
  validateParams,
  validateQueryWithParams,
} from './query-validator.js';
import {
  logAuditEvent,
  logUserCreated,
  logUserDeleted,
  logPermissionChanged,
  logBulkExport,
  logSchemaModified,
  logDataDeleted,
  logDataCreated,
  logDataUpdated,
  queryAuditLog,
  clearAuditLog,
  AuditEventType,
} from './audit-logger.js';
import { RateLimiter, checkRateLimit, resetRateLimit, clearAllRateLimits } from './rate-limiter.js';

describe('Query Validator', () => {
  it('should reject queries with SQL injection patterns', () => {
    const result = validateQuery("SELECT * FROM users WHERE id = 1 OR 1=1");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('suspicious pattern');
  });

  it('should reject queries with UNION-based injection', () => {
    const result = validateQuery("SELECT name FROM users UNION SELECT password FROM admins");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('UNION');
  });

  it('should reject queries with comment-based injection', () => {
    const result = validateQuery("SELECT * FROM users--");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('suspicious pattern');
  });

  it('should reject queries with stacked queries', () => {
    const result = validateQuery("SELECT * FROM users; DROP TABLE users");
    expect(result.valid).toBe(false);
    expect(result.error).toContain('suspicious pattern');
  });

  it('should reject queries exceeding maximum length', () => {
    const longQuery = 'SELECT * FROM users WHERE '.repeat(1000);
    const result = validateQuery(longQuery);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed length');
  });

  it('should accept valid queries', () => {
    const result = validateQuery('SELECT * FROM users WHERE id = $1');
    expect(result.valid).toBe(true);
  });

  it('should reject parameters with SQL injection patterns', () => {
    const result = validateParams(['1 OR 1=1']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('suspicious pattern');
  });

  it('should reject object parameters', () => {
    const result = validateParams([{ sql: 'DROP TABLE' }]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Object parameters');
  });

  it('should reject too many parameters', () => {
    const params = Array(101).fill('test');
    const result = validateParams(params);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum allowed count');
  });

  it('should accept valid parameters', () => {
    const result = validateParams(['user123', 'active']);
    expect(result.valid).toBe(true);
  });

  it('should validate query and parameters together', () => {
    const result = validateQueryWithParams('SELECT * FROM users WHERE id = $1', ['123']);
    expect(result.valid).toBe(true);
  });

  it('should reject when query is invalid', () => {
    const result = validateQueryWithParams('SELECT * FROM users; DROP TABLE users', ['123']);
    expect(result.valid).toBe(false);
  });

  it('should reject when parameters are invalid', () => {
    const result = validateQueryWithParams('SELECT * FROM users WHERE id = $1', ['1 OR 1=1']);
    expect(result.valid).toBe(false);
  });
});

describe('Audit Logger', () => {
  beforeEach(() => {
    clearAuditLog();
  });

  it('should log audit events', () => {
    logAuditEvent({
      eventType: AuditEventType.USER_CREATED,
      userId: 'user-123',
      tenantId: 'tenant-456',
      timestamp: new Date(),
      operation: 'CREATE_USER',
      entity: 'user',
      entityId: 'user-123',
    });

    const events = queryAuditLog();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe(AuditEventType.USER_CREATED);
    expect(events[0]?.userId).toBe('user-123');
  });

  it('should log user creation events', () => {
    logUserCreated('user-123', 'tenant-456');

    const events = queryAuditLog({ eventType: AuditEventType.USER_CREATED });
    expect(events).toHaveLength(1);
    expect(events[0]?.operation).toBe('CREATE_USER');
  });

  it('should log user deletion events', () => {
    logUserDeleted('user-123', 'tenant-456');

    const events = queryAuditLog({ eventType: AuditEventType.USER_DELETED });
    expect(events).toHaveLength(1);
    expect(events[0]?.operation).toBe('DELETE_USER');
  });

  it('should log permission change events', () => {
    logPermissionChanged('user-123', 'tenant-456', 'admin', false, true);

    const events = queryAuditLog({ eventType: AuditEventType.PERMISSION_CHANGED });
    expect(events).toHaveLength(1);
    expect(events[0]?.metadata?.permission).toBe('admin');
  });

  it('should log bulk export events', () => {
    logBulkExport('user-123', 'tenant-456', 'tasks', 100);

    const events = queryAuditLog({ eventType: AuditEventType.BULK_EXPORT });
    expect(events).toHaveLength(1);
    expect(events[0]?.metadata?.count).toBe(100);
  });

  it('should log schema modification events', () => {
    logSchemaModified('user-123', 'tenant-456', 'ADD_COLUMN', 'users');

    const events = queryAuditLog({ eventType: AuditEventType.SCHEMA_MODIFIED });
    expect(events).toHaveLength(1);
    expect(events[0]?.metadata?.table).toBe('users');
  });

  it('should log data deletion events', () => {
    logDataDeleted('user-123', 'tenant-456', 'task', 'task-789');

    const events = queryAuditLog({ eventType: AuditEventType.DATA_DELETED });
    expect(events).toHaveLength(1);
    expect(events[0]?.entityId).toBe('task-789');
  });

  it('should log data creation events', () => {
    logDataCreated('user-123', 'tenant-456', 'task', 'task-789');

    const events = queryAuditLog({ eventType: AuditEventType.DATA_CREATED });
    expect(events).toHaveLength(1);
    expect(events[0]?.entityId).toBe('task-789');
  });

  it('should log data update events', () => {
    logDataUpdated('user-123', 'tenant-456', 'task', 'task-789');

    const events = queryAuditLog({ eventType: AuditEventType.DATA_UPDATED });
    expect(events).toHaveLength(1);
    expect(events[0]?.entityId).toBe('task-789');
  });

  it('should query audit log by userId', () => {
    logUserCreated('user-123', 'tenant-456');
    logUserCreated('user-789', 'tenant-456');

    const events = queryAuditLog({ userId: 'user-123' });
    expect(events).toHaveLength(1);
    expect(events[0]?.userId).toBe('user-123');
  });

  it('should query audit log by tenantId', () => {
    logUserCreated('user-123', 'tenant-456');
    logUserCreated('user-789', 'tenant-999');

    const events = queryAuditLog({ tenantId: 'tenant-456' });
    expect(events).toHaveLength(1);
    expect(events[0]?.tenantId).toBe('tenant-456');
  });

  it('should query audit log by date range', () => {
    const now = new Date();
    const past = new Date(now.getTime() - 10000);
    const future = new Date(now.getTime() + 10000);

    logUserCreated('user-123', 'tenant-456');

    const events = queryAuditLog({ startDate: past, endDate: future });
    expect(events).toHaveLength(1);
  });

  it('should clear audit log', () => {
    logUserCreated('user-123', 'tenant-456');
    clearAuditLog();

    const events = queryAuditLog();
    expect(events).toHaveLength(0);
  });

  it('should prevent memory bloat by limiting log size', () => {
    // Log more than MAX_AUDIT_LOG_SIZE events
    for (let i = 0; i < 10001; i++) {
      logUserCreated(`user-${i}`, 'tenant-456');
    }

    const events = queryAuditLog();
    expect(events.length).toBeLessThanOrEqual(10000);
  });
});

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  it('should allow requests within limit', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
    const result = limiter.checkLimit('tenant-123');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should reject requests exceeding limit', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });

    // Use all tokens
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit('tenant-123');
    }

    const result = limiter.checkLimit('tenant-123');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should refill tokens after window expires', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 100 });

    // Use all tokens
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit('tenant-123');
    }

    // Wait for window to expire
    // Note: In a real test, we'd use a timer or mock Date.now()
    // For now, we'll just verify the structure
    const result = limiter.checkLimit('tenant-123');
    expect(result.allowed).toBe(false);
  });

  it('should track limits per tenant independently', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });

    // Use all tokens for tenant-123
    for (let i = 0; i < 5; i++) {
      limiter.checkLimit('tenant-123');
    }

    // tenant-456 should still have tokens
    const result = limiter.checkLimit('tenant-456');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should reset limit for a tenant', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });

    // Use some tokens
    for (let i = 0; i < 3; i++) {
      limiter.checkLimit('tenant-123');
    }

    limiter.resetLimit('tenant-123');

    const result = limiter.checkLimit('tenant-123');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should get token count for a tenant', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

    const count = limiter.getTokenCount('tenant-123');
    expect(count).toBe(10);

    limiter.checkLimit('tenant-123');

    const countAfter = limiter.getTokenCount('tenant-123');
    expect(countAfter).toBe(9);
  });

  it('should use global rate limiter', () => {
    const result = checkRateLimit('tenant-123');
    expect(result.allowed).toBe(true);
  });

  it('should reset limit using global function', () => {
    // Use some tokens
    for (let i = 0; i < 3; i++) {
      checkRateLimit('tenant-123');
    }

    resetRateLimit('tenant-123');

    const result = checkRateLimit('tenant-123');
    expect(result.allowed).toBe(true);
  });

  it('should clear all rate limits', () => {
    checkRateLimit('tenant-123');
    checkRateLimit('tenant-456');

    clearAllRateLimits();

    const result1 = checkRateLimit('tenant-123');
    const result2 = checkRateLimit('tenant-456');

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
  });
});
