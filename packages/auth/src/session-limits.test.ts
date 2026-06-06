/**
 * Session limits tests
 * Tests for concurrent session limit enforcement
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceSessionLimit } from './session-limits.js';
import { logAuthEvent } from './audit-log.js';

// Mock the audit logging
vi.mock('./audit-log.js', () => ({
  logAuthEvent: vi.fn(),
  createAuthEvent: vi.fn((type, context) => ({ type, ...context, timestamp: new Date() })),
}));

describe('enforceSessionLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return early if no session exists', async () => {
    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue(null),
        listSessions: vi.fn(),
        revokeSession: vi.fn(),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 5);

    expect(result).toEqual({ sessionCount: 0, limit: 5 });
    expect(mockAuth.api.listSessions).not.toHaveBeenCalled();
  });

  it('should return early if session has no user', async () => {
    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue({ user: null }),
        listSessions: vi.fn(),
        revokeSession: vi.fn(),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 5);

    expect(result).toEqual({ sessionCount: 0, limit: 5 });
    expect(mockAuth.api.listSessions).not.toHaveBeenCalled();
  });

  it('should not revoke sessions when under limit', async () => {
    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'current-token' },
        }),
        listSessions: vi.fn().mockResolvedValue([
          { id: 'session-1', token: 'current-token', createdAt: new Date(), expiresAt: new Date() },
        ]),
        revokeSession: vi.fn(),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 5);

    expect(result).toEqual({ sessionCount: 1, limit: 5 });
    expect(mockAuth.api.revokeSession).not.toHaveBeenCalled();
    expect(logAuthEvent).not.toHaveBeenCalled();
  });

  it('should revoke oldest session when limit exceeded', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'current-token' },
        }),
        listSessions: vi.fn().mockResolvedValue([
          { id: 'session-1', token: 'current-token', createdAt: now, expiresAt: new Date() },
          { id: 'session-2', token: 'old-token-1', createdAt: oneHourAgo, expiresAt: new Date() },
          { id: 'session-3', token: 'old-token-2', createdAt: twoHoursAgo, expiresAt: new Date() },
        ]),
        revokeSession: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 2);

    expect(result.sessionCount).toBe(2); // After revocation
    expect(result.limit).toBe(2);
    expect(result.revokedSessionId).toBe('old-token-2'); // Oldest session
    expect(mockAuth.api.revokeSession).toHaveBeenCalledWith({
      headers,
      body: { token: 'old-token-2' },
    });
    expect(logAuthEvent).toHaveBeenCalled();
  });

  it('should not revoke current session even if it is oldest', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'current-token' },
        }),
        listSessions: vi.fn().mockResolvedValue([
          { id: 'session-1', token: 'current-token', createdAt: oneHourAgo, expiresAt: new Date() },
          { id: 'session-2', token: 'other-token', createdAt: now, expiresAt: new Date() },
        ]),
        revokeSession: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 1);

    expect(result.sessionCount).toBe(1);
    expect(result.revokedSessionId).toBe('other-token'); // Not current session
    expect(mockAuth.api.revokeSession).toHaveBeenCalledWith({
      headers,
      body: { token: 'other-token' },
    });
  });

  it('should handle empty sessions array', async () => {
    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'current-token' },
        }),
        listSessions: vi.fn().mockResolvedValue([]),
        revokeSession: vi.fn(),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 5);

    expect(result).toEqual({ sessionCount: 0, limit: 5 });
    expect(mockAuth.api.revokeSession).not.toHaveBeenCalled();
  });

  it('should fail open on errors', async () => {
    const mockAuth = {
      api: {
        getSession: vi.fn().mockRejectedValue(new Error('Database error')),
        listSessions: vi.fn(),
        revokeSession: vi.fn(),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 5);

    expect(result).toEqual({ sessionCount: 0, limit: 5 });
    expect(mockAuth.api.revokeSession).not.toHaveBeenCalled();
  });

  it('should log audit event when session is revoked', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'current-token' },
        }),
        listSessions: vi.fn().mockResolvedValue([
          { id: 'session-1', token: 'current-token', createdAt: now, expiresAt: new Date() },
          { id: 'session-2', token: 'old-token', createdAt: oneHourAgo, expiresAt: new Date() },
        ]),
        revokeSession: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    const headers = new Headers();
    await enforceSessionLimit(mockAuth, headers, 1);

    expect(logAuthEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session_limit_reached',
        userId: 'user-1',
        email: 'test@example.com',
        metadata: expect.objectContaining({
          revokedToken: 'old-toke...', // Partial token
          sessionCount: 2,
          limit: 1,
        }),
      })
    );
  });

  it('should handle sessions without createdAt field', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const mockAuth = {
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: { id: 'user-1', email: 'test@example.com' },
          session: { token: 'current-token' },
        }),
        listSessions: vi.fn().mockResolvedValue([
          { id: 'session-1', token: 'current-token', expiresAt: now },
          { id: 'session-2', token: 'old-token', expiresAt: oneHourAgo },
        ]),
        revokeSession: vi.fn().mockResolvedValue(undefined),
      },
    } as any;

    const headers = new Headers();
    const result = await enforceSessionLimit(mockAuth, headers, 1);

    expect(result.revokedSessionId).toBe('old-token');
  });
});
