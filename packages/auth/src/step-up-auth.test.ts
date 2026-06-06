/**
 * Tests for step-up authentication module
 */

import { describe, it, expect } from 'vitest';
import {
  requireFreshAuth,
  isAuthFresh,
  getAuthFreshnessRemaining,
  StepUpAuthRequiredError,
  SENSITIVE_ACTION_MAX_AGE,
} from './step-up-auth.js';

describe('requireFreshAuth', () => {
  it('should allow fresh authentication for password change', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    expect(() => requireFreshAuth(session, 'password_change')).not.toThrow();
  });

  it('should reject stale authentication for password change', () => {
    const session = {
      updatedAt: new Date(Date.now() - 400000).toISOString(), // 400 seconds ago (> 300s max)
    } as any;

    expect(() => requireFreshAuth(session, 'password_change')).toThrow(StepUpAuthRequiredError);
  });

  it('should allow fresh authentication for email change', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    expect(() => requireFreshAuth(session, 'email_change')).not.toThrow();
  });

  it('should reject stale authentication for email change', () => {
    const session = {
      updatedAt: new Date(Date.now() - 400000).toISOString(), // 400 seconds ago (> 300s max)
    } as any;

    expect(() => requireFreshAuth(session, 'email_change')).toThrow(StepUpAuthRequiredError);
  });

  it('should allow fresh authentication for API key generation', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    expect(() => requireFreshAuth(session, 'api_key_generation')).not.toThrow();
  });

  it('should reject stale authentication for API key generation', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000000).toISOString(), // 1000 seconds ago (> 900s max)
    } as any;

    expect(() => requireFreshAuth(session, 'api_key_generation')).toThrow(StepUpAuthRequiredError);
  });

  it('should use custom max age when provided', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    // Custom max age of 0.5 seconds should reject
    expect(() => requireFreshAuth(session, 'password_change', 0.5)).toThrow(StepUpAuthRequiredError);
  });

  it('should throw error when session is null', () => {
    expect(() => requireFreshAuth(null, 'password_change')).toThrow('Session required');
  });

  it('should throw error with descriptive message', () => {
    const session = {
      updatedAt: new Date(Date.now() - 400000).toISOString(), // 400 seconds ago
    } as any;

    try {
      requireFreshAuth(session, 'password_change');
      expect.fail('Should have thrown StepUpAuthRequiredError');
    } catch (error) {
      expect(error).toBeInstanceOf(StepUpAuthRequiredError);
      expect((error as Error).message).toContain('password_change');
      expect((error as Error).message).toContain('300');
    }
  });
});

describe('isAuthFresh', () => {
  it('should return true for fresh authentication', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    expect(isAuthFresh(session, 'password_change')).toBe(true);
  });

  it('should return false for stale authentication', () => {
    const session = {
      updatedAt: new Date(Date.now() - 400000).toISOString(), // 400 seconds ago
    } as any;

    expect(isAuthFresh(session, 'password_change')).toBe(false);
  });

  it('should return false when session is null', () => {
    expect(isAuthFresh(null, 'password_change')).toBe(false);
  });

  it('should use custom max age when provided', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    expect(isAuthFresh(session, 'password_change', 0.5)).toBe(false);
  });
});

describe('getAuthFreshnessRemaining', () => {
  it('should return positive remaining time for fresh authentication', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    const remaining = getAuthFreshnessRemaining(session, 'password_change');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(300); // Max age is 300 seconds
  });

  it('should return 0 for stale authentication', () => {
    const session = {
      updatedAt: new Date(Date.now() - 400000).toISOString(), // 400 seconds ago
    } as any;

    expect(getAuthFreshnessRemaining(session, 'password_change')).toBe(0);
  });

  it('should return 0 when session is null', () => {
    expect(getAuthFreshnessRemaining(null, 'password_change')).toBe(0);
  });

  it('should use custom max age when provided', () => {
    const session = {
      updatedAt: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    } as any;

    const remaining = getAuthFreshnessRemaining(session, 'password_change', 10);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThan(10);
  });

  it('should return exact remaining time', () => {
    const session = {
      updatedAt: new Date(Date.now() - 100000).toISOString(), // 100 seconds ago
    } as any;

    const remaining = getAuthFreshnessRemaining(session, 'password_change');
    expect(remaining).toBeCloseTo(200, 0); // 300 - 100 = 200 seconds remaining
  });
});

describe('SENSITIVE_ACTION_MAX_AGE', () => {
  it('should have max age for password_change', () => {
    expect(SENSITIVE_ACTION_MAX_AGE.password_change).toBe(300);
  });

  it('should have max age for email_change', () => {
    expect(SENSITIVE_ACTION_MAX_AGE.email_change).toBe(300);
  });

  it('should have max age for api_key_generation', () => {
    expect(SENSITIVE_ACTION_MAX_AGE.api_key_generation).toBe(900);
  });

  it('should have max age for organization_deletion', () => {
    expect(SENSITIVE_ACTION_MAX_AGE.organization_deletion).toBe(300);
  });

  it('should have max age for user_deletion', () => {
    expect(SENSITIVE_ACTION_MAX_AGE.user_deletion).toBe(300);
  });

  it('should have max age for mfa_disable', () => {
    expect(SENSITIVE_ACTION_MAX_AGE.mfa_disable).toBe(300);
  });
});

describe('StepUpAuthRequiredError', () => {
  it('should create error with correct message', () => {
    const error = new StepUpAuthRequiredError('password_change', 300);
    expect(error.message).toContain('password_change');
    expect(error.message).toContain('300');
    expect(error.name).toBe('StepUpAuthRequiredError');
  });

  it('should be instanceof Error', () => {
    const error = new StepUpAuthRequiredError('password_change', 300);
    expect(error instanceof Error).toBe(true);
  });
});
