/**
 * Audit logging for authentication events
 * Follows OWASP logging requirements for enterprise audit trails
 */

export type AuthEventType = 
  | 'sign_in'
  | 'sign_up'
  | 'sign_out'
  | 'failed_attempt'
  | 'password_change'
  | 'email_verification'
  | 'mfa_enabled'
  | 'mfa_disabled'
  | 'session_revoked';

export interface AuthEvent {
  type: AuthEventType;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Log an authentication event
 * Uses console.log for structured logging in development
 * In production, this should be integrated with a proper logging service
 */
export function logAuthEvent(event: AuthEvent): void {
  const logEntry = {
    ...event,
    timestamp: event.timestamp.toISOString(),
    service: 'auth',
  };

  // Use console.log for structured logging
  // In production, this should be replaced with a proper logging service
  console.log(JSON.stringify(logEntry));
}

/**
 * Create an audit event from Better Auth context
 */
export function createAuthEvent(
  type: AuthEventType,
  context: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): AuthEvent {
  const event: AuthEvent = {
    type,
    timestamp: new Date(),
  };

  if (context.userId !== undefined) {
    event.userId = context.userId;
  }
  if (context.email !== undefined) {
    event.email = context.email;
  }
  if (context.ip !== undefined) {
    event.ip = context.ip;
  }
  if (context.userAgent !== undefined) {
    event.userAgent = context.userAgent;
  }
  if (context.metadata !== undefined) {
    event.metadata = context.metadata;
  }

  return event;
}
