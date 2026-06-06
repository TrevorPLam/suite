/**
 * Session management functionality
 * Provides server-side wrappers for Better Auth session API with audit logging
 * Follows SOC2 requirements for session termination logging
 */

import { logAuthEvent, createAuthEvent } from './audit-log.js';
import type { createAuth } from './server.js';

/**
 * List all active sessions for a user
 * Uses Better Auth's built-in listSessions API
 * @param authInstance - Better Auth instance
 * @param headers - Request headers containing session token
 * @returns Promise resolving to list of sessions
 */
export async function listSessions(
  authInstance: ReturnType<typeof createAuth>,
  headers: Headers
): Promise<unknown> {
  try {
    const sessions = await authInstance.api.listSessions({ headers });
    
    // Log session list event for audit trail
    const session = await authInstance.api.getSession({ headers });
    if (session?.user) {
      logAuthEvent(createAuthEvent('session_listed', {
        userId: session.user.id,
        email: session.user.email,
        metadata: {
          sessionCount: Array.isArray(sessions) ? sessions.length : 0,
        },
      }));
    }
    
    return sessions;
  } catch (error) {
    console.error('Failed to list sessions:', error);
    throw error;
  }
}

/**
 * Revoke a specific session by token
 * Uses Better Auth's built-in revokeSession API
 * @param authInstance - Better Auth instance
 * @param headers - Request headers containing session token
 * @param token - Session token to revoke
 * @returns Promise resolving when session is revoked
 */
export async function revokeSession(
  authInstance: ReturnType<typeof createAuth>,
  headers: Headers,
  token: string
): Promise<void> {
  try {
    // Get current session for audit logging before revocation
    const session = await authInstance.api.getSession({ headers });
    
    await authInstance.api.revokeSession({
      headers,
      body: { token },
    });
    
    // Log session revocation event for audit trail
    if (session?.user) {
      logAuthEvent(createAuthEvent('session_revoked', {
        userId: session.user.id,
        email: session.user.email,
        metadata: {
          revokedToken: token.substring(0, 8) + '...', // Log partial token for security
        },
      }));
    }
  } catch (error) {
    console.error('Failed to revoke session:', error);
    throw error;
  }
}

/**
 * Revoke all sessions for a user
 * Uses Better Auth's built-in revokeSessions API
 * @param authInstance - Better Auth instance
 * @param headers - Request headers containing session token
 * @returns Promise resolving when all sessions are revoked
 */
export async function revokeAllSessions(
  authInstance: ReturnType<typeof createAuth>,
  headers: Headers
): Promise<void> {
  try {
    // Get current session for audit logging before revocation
    const session = await authInstance.api.getSession({ headers });
    
    await authInstance.api.revokeSessions({ headers });
    
    // Log session revocation event for audit trail
    if (session?.user) {
      logAuthEvent(createAuthEvent('all_sessions_revoked', {
        userId: session.user.id,
        email: session.user.email,
      }));
    }
  } catch (error) {
    console.error('Failed to revoke all sessions:', error);
    throw error;
  }
}

/**
 * Revoke all other sessions except the current one
 * Uses Better Auth's built-in revokeOtherSessions API
 * @param authInstance - Better Auth instance
 * @param headers - Request headers containing session token
 * @returns Promise resolving when other sessions are revoked
 */
export async function revokeOtherSessions(
  authInstance: ReturnType<typeof createAuth>,
  headers: Headers
): Promise<void> {
  try {
    // Get current session for audit logging before revocation
    const session = await authInstance.api.getSession({ headers });
    
    await authInstance.api.revokeOtherSessions({ headers });
    
    // Log session revocation event for audit trail
    if (session?.user) {
      logAuthEvent(createAuthEvent('other_sessions_revoked', {
        userId: session.user.id,
        email: session.user.email,
      }));
    }
  } catch (error) {
    console.error('Failed to revoke other sessions:', error);
    throw error;
  }
}
