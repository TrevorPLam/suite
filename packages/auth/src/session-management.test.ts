/**
 * Tests for session management functionality
 * Tests session listing, revocation, and audit logging
 */

// @ts-nocheck - Vitest mocks don't align with Better Auth's strict API types
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listSessions, revokeSession, revokeAllSessions, revokeOtherSessions } from './session-management.js';
import { logAuthEvent } from './audit-log.js';

// Mock the audit logging
vi.mock('./audit-log.js', () => ({
  logAuthEvent: vi.fn(),
  createAuthEvent: vi.fn((type: string, context: Record<string, unknown>) => ({ type, ...context, timestamp: new Date() })),
}));

describe('Session Management', () => {
  const mockAuthInstance = {
    api: {
      listSessions: vi.fn(),
      getSession: vi.fn(),
      revokeSession: vi.fn(),
      revokeSessions: vi.fn(),
      revokeOtherSessions: vi.fn(),
    },
  } as any;

  const mockHeaders = new Headers();
  mockHeaders.set('cookie', 'session-token=test-token');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listSessions', () => {
    it('should list sessions and log audit event', async () => {
      const mockSessions = [
        { token: 'token1', userId: 'user1', expiresAt: new Date() },
        { token: 'token2', userId: 'user1', expiresAt: new Date() },
      ];
      mockAuthInstance.api.listSessions.mockResolvedValue(mockSessions);
      mockAuthInstance.api.getSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      });

      const result = await listSessions(mockAuthInstance, mockHeaders);

      expect(mockAuthInstance.api.listSessions).toHaveBeenCalledWith({ headers: mockHeaders });
      expect(mockAuthInstance.api.getSession).toHaveBeenCalledWith({ headers: mockHeaders });
      expect(logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session_listed',
          userId: 'user1',
          email: 'test@example.com',
          metadata: { sessionCount: 2 },
        })
      );
      expect(result).toEqual(mockSessions);
    });

    it('should handle errors when listing sessions', async () => {
      mockAuthInstance.api.listSessions.mockRejectedValue(new Error('Database error'));

      await expect(listSessions(mockAuthInstance, mockHeaders)).rejects.toThrow('Database error');
    });

    it('should not log audit event if user not found', async () => {
      mockAuthInstance.api.listSessions.mockResolvedValue([]);
      mockAuthInstance.api.getSession.mockResolvedValue(null);

      await listSessions(mockAuthInstance, mockHeaders);

      expect(logAuthEvent).not.toHaveBeenCalled();
    });
  });

  describe('revokeSession', () => {
    it('should revoke session and log audit event', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      mockAuthInstance.api.revokeSession.mockResolvedValue(undefined);

      await revokeSession(mockAuthInstance, mockHeaders, 'session-token-123');

      expect(mockAuthInstance.api.getSession).toHaveBeenCalledWith({ headers: mockHeaders });
      expect(mockAuthInstance.api.revokeSession).toHaveBeenCalledWith({
        headers: mockHeaders,
        body: { token: 'session-token-123' },
      });
      expect(logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session_revoked',
          userId: 'user1',
          email: 'test@example.com',
          metadata: { revokedToken: 'session-...' },
        })
      );
    });

    it('should handle errors when revoking session', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      mockAuthInstance.api.revokeSession.mockRejectedValue(new Error('Revocation failed'));

      await expect(revokeSession(mockAuthInstance, mockHeaders, 'session-token-123')).rejects.toThrow('Revocation failed');
    });

    it('should not log audit event if user not found', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue(null);
      mockAuthInstance.api.revokeSession.mockResolvedValue(undefined);

      await revokeSession(mockAuthInstance, mockHeaders, 'session-token-123');

      expect(logAuthEvent).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all sessions and log audit event', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      mockAuthInstance.api.revokeSessions.mockResolvedValue(undefined);

      await revokeAllSessions(mockAuthInstance, mockHeaders);

      expect(mockAuthInstance.api.getSession).toHaveBeenCalledWith({ headers: mockHeaders });
      expect(mockAuthInstance.api.revokeSessions).toHaveBeenCalledWith({ headers: mockHeaders });
      expect(logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'all_sessions_revoked',
          userId: 'user1',
          email: 'test@example.com',
        })
      );
    });

    it('should handle errors when revoking all sessions', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      mockAuthInstance.api.revokeSessions.mockRejectedValue(new Error('Revocation failed'));

      await expect(revokeAllSessions(mockAuthInstance, mockHeaders)).rejects.toThrow('Revocation failed');
    });

    it('should not log audit event if user not found', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue(null);
      mockAuthInstance.api.revokeSessions.mockResolvedValue(undefined);

      await revokeAllSessions(mockAuthInstance, mockHeaders);

      expect(logAuthEvent).not.toHaveBeenCalled();
    });
  });

  describe('revokeOtherSessions', () => {
    it('should revoke other sessions and log audit event', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      mockAuthInstance.api.revokeOtherSessions.mockResolvedValue(undefined);

      await revokeOtherSessions(mockAuthInstance, mockHeaders);

      expect(mockAuthInstance.api.getSession).toHaveBeenCalledWith({ headers: mockHeaders });
      expect(mockAuthInstance.api.revokeOtherSessions).toHaveBeenCalledWith({ headers: mockHeaders });
      expect(logAuthEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'other_sessions_revoked',
          userId: 'user1',
          email: 'test@example.com',
        })
      );
    });

    it('should handle errors when revoking other sessions', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      mockAuthInstance.api.revokeOtherSessions.mockRejectedValue(new Error('Revocation failed'));

      await expect(revokeOtherSessions(mockAuthInstance, mockHeaders)).rejects.toThrow('Revocation failed');
    });

    it('should not log audit event if user not found', async () => {
      mockAuthInstance.api.getSession.mockResolvedValue(null);
      mockAuthInstance.api.revokeOtherSessions.mockResolvedValue(undefined);

      await revokeOtherSessions(mockAuthInstance, mockHeaders);

      expect(logAuthEvent).not.toHaveBeenCalled();
    });
  });
});
