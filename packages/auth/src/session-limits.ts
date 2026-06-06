/**
 * Session limits functionality
 * Enforces concurrent session limits per user to prevent credential stuffing spread
 * Limits attack surface by revoking oldest sessions when limit is exceeded
 */

import { logAuthEvent, createAuthEvent } from './audit-log.js';
import type { createAuth } from './server.js';

interface SessionLimitResult {
  revokedSessionId?: string;
  sessionCount: number;
  limit: number;
}

interface BetterAuthSession {
  id: string;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  expiresAt: Date;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
  activeOrganizationId?: string;
  activeTeamId?: string;
}

interface BetterAuthSessionResponse {
  session: BetterAuthSession;
  user: {
    id: string;
    email: string;
  };
}

/**
 * Enforce concurrent session limit for a user
 * Counts active sessions and revokes the oldest if limit is exceeded
 * @param authInstance - Better Auth instance
 * @param headers - Request headers containing session token
 * @param maxSessions - Maximum allowed concurrent sessions
 * @returns Promise resolving to session limit result
 */
export async function enforceSessionLimit(
  authInstance: ReturnType<typeof createAuth>,
  headers: Headers,
  maxSessions: number
): Promise<SessionLimitResult> {
  try {
    // Get current session for user context
    const currentSession = await authInstance.api.getSession({ headers }) as BetterAuthSessionResponse | null;
    if (!currentSession?.user) {
      return { sessionCount: 0, limit: maxSessions };
    }

    // List all active sessions for the user
    const sessions = await authInstance.api.listSessions({ headers }) as BetterAuthSession[] | null;
    const sessionCount = Array.isArray(sessions) ? sessions.length : 0;

    // If under limit, no action needed
    if (sessionCount <= maxSessions) {
      return { sessionCount, limit: maxSessions };
    }

    // Find the oldest session (excluding current session)
    // Sessions have createdAt or expiresAt field
    const sessionsArray = Array.isArray(sessions) ? sessions : [];
    const currentToken = currentSession.session?.token;
    const otherSessions = sessionsArray.filter(
      (s: BetterAuthSession) => s.token !== currentToken
    );

    if (otherSessions.length === 0) {
      // Only current session exists, no revocation needed
      return { sessionCount, limit: maxSessions };
    }

    // Sort by creation date (oldest first)
    otherSessions.sort((a: BetterAuthSession, b: BetterAuthSession) => {
      const aDate = a.createdAt?.getTime() || a.expiresAt?.getTime() || 0;
      const bDate = b.createdAt?.getTime() || b.expiresAt?.getTime() || 0;
      return aDate - bDate;
    });

    // Revoke the oldest session
    const oldestSession = otherSessions[0];
    const oldestToken = oldestSession?.token;
    if (oldestToken) {
      await authInstance.api.revokeSession({
        headers,
        body: { token: oldestToken },
      });

      // Log session revocation due to limit for audit trail
      logAuthEvent(createAuthEvent('session_limit_reached', {
        userId: currentSession.user.id,
        email: currentSession.user.email,
        metadata: {
          revokedToken: oldestToken.substring(0, 8) + '...', // Log partial token for security
          sessionCount,
          limit: maxSessions,
        },
      }));

      return {
        revokedSessionId: oldestToken,
        sessionCount: sessionCount - 1, // After revocation
        limit: maxSessions,
      };
    }

    return { sessionCount, limit: maxSessions };
  } catch (error) {
    console.error('Failed to enforce session limit:', error);
    // Fail open - don't block login if session limit enforcement fails
    return { sessionCount: 0, limit: maxSessions };
  }
}
