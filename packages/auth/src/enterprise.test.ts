/**
 * Enterprise feature tests for auth package
 * Tests audit logging, session revocation, and configurable rate limiting
 */

import { describe, it, expect, vi } from 'vitest';
import { logAuthEvent, createAuthEvent, type AuthEventType } from './audit-log.js';
import { revokeSession, revokeAllSessions } from './session-revocation.js';
import { validateAuthEnv } from './env.js';

describe('Audit Logging', () => {
  it('should log auth event with all fields', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const event = createAuthEvent('sign_in', {
      userId: 'user-123',
      email: 'test@example.com',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });
    
    logAuthEvent(event);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"sign_in"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"userId":"user-123"')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"email":"test@example.com"')
    );
    
    consoleSpy.mockRestore();
  });

  it('should log auth event with minimal fields', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    const event = createAuthEvent('sign_out', {});
    logAuthEvent(event);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"type":"sign_out"')
    );
    
    consoleSpy.mockRestore();
  });

  it('should create auth event with timestamp', () => {
    const before = new Date();
    const event = createAuthEvent('failed_attempt', { email: 'test@example.com' });
    const after = new Date();
    
    expect(event.timestamp).toBeInstanceOf(Date);
    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle all auth event types', () => {
    const eventTypes: AuthEventType[] = [
      'sign_in',
      'sign_up',
      'sign_out',
      'failed_attempt',
      'password_change',
      'email_verification',
      'mfa_enabled',
      'mfa_disabled',
      'session_revoked',
    ];
    
    eventTypes.forEach((type) => {
      const event = createAuthEvent(type, {});
      expect(event.type).toBe(type);
    });
  });
});

describe('Session Revocation', () => {
  it('should log warning when revokeSession is called', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    revokeSession('session-token-123');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('revokeSession utility called')
    );
    
    consoleSpy.mockRestore();
  });

  it('should log warning when revokeAllSessions is called', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    revokeAllSessions('user-123');
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('revokeAllSessions utility called')
    );
    
    consoleSpy.mockRestore();
  });
});

describe('Configurable Rate Limiting', () => {
  it('should validate env with default rate limit values', () => {
    const env = {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3001',
    };
    
    const validated = validateAuthEnv(env);
    
    expect(validated.RATE_LIMIT_WINDOW).toBe(60);
    expect(validated.RATE_LIMIT_MAX).toBe(30);
  });

  it('should validate env with custom rate limit values', () => {
    const env = {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3001',
      RATE_LIMIT_WINDOW: '120',
      RATE_LIMIT_MAX: '50',
    };
    
    const validated = validateAuthEnv(env);
    
    expect(validated.RATE_LIMIT_WINDOW).toBe(120);
    expect(validated.RATE_LIMIT_MAX).toBe(50);
  });

  it('should parse rate limit values as integers', () => {
    const env = {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'http://localhost:3001',
      RATE_LIMIT_WINDOW: '90',
      RATE_LIMIT_MAX: '45',
    };
    
    const validated = validateAuthEnv(env);
    
    expect(typeof validated.RATE_LIMIT_WINDOW).toBe('number');
    expect(typeof validated.RATE_LIMIT_MAX).toBe('number');
  });
});
