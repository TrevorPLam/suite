/**
 * Step-up authentication for sensitive actions
 * Follows OWASP guidelines for requiring fresh authentication before sensitive operations
 */

import type { Session } from 'better-auth/types';

/**
 * Sensitive action types with their maximum allowed authentication age
 * Max age is in seconds
 */
export type SensitiveAction =
  | 'password_change'
  | 'email_change'
  | 'api_key_generation'
  | 'organization_deletion'
  | 'user_deletion'
  | 'mfa_disable';

export const SENSITIVE_ACTION_MAX_AGE: Record<SensitiveAction, number> = {
  // Password change: 5 minutes (300 seconds) - high sensitivity
  password_change: 300,
  // Email change: 5 minutes (300 seconds) - high sensitivity
  email_change: 300,
  // API key generation: 15 minutes (900 seconds) - medium sensitivity
  api_key_generation: 900,
  // Organization deletion: 5 minutes (300 seconds) - high sensitivity
  organization_deletion: 300,
  // User deletion: 5 minutes (300 seconds) - high sensitivity
  user_deletion: 300,
  // MFA disable: 5 minutes (300 seconds) - high sensitivity
  mfa_disable: 300,
};

/**
 * Default max age for sensitive actions if not specified
 * Can be overridden via STEP_UP_MAX_AGE environment variable
 */
const DEFAULT_MAX_AGE_SECONDS = 300; // 5 minutes

/**
 * Error thrown when step-up authentication is required
 */
export class StepUpAuthRequiredError extends Error {
  constructor(action: SensitiveAction, maxAge: number) {
    super(
      `Step-up authentication required for ${action}. Please re-authenticate within the last ${maxAge} seconds.`
    );
    this.name = 'StepUpAuthRequiredError';
  }
}

/**
 * Check if session authentication is fresh enough for a sensitive action
 * @param session - The user's session
 * @param action - The sensitive action being performed
 * @param maxAge - Optional custom max age in seconds (overrides default)
 * @throws {StepUpAuthRequiredError} If authentication is not fresh enough
 */
export function requireFreshAuth(
  session: Session | null,
  action: SensitiveAction,
  maxAge?: number
): void {
  if (!session) {
    throw new Error('Session required for step-up authentication');
  }

  // Use action-specific max age, or custom max age, or default
  const effectiveMaxAge = maxAge ?? SENSITIVE_ACTION_MAX_AGE[action] ?? DEFAULT_MAX_AGE_SECONDS;

  // Better Auth sessions have updatedAt field that tracks when session was last refreshed
  // We use this to determine if authentication is fresh enough
  const sessionUpdatedAt = new Date(session.updatedAt);
  const now = new Date();
  const ageInSeconds = (now.getTime() - sessionUpdatedAt.getTime()) / 1000;

  if (ageInSeconds > effectiveMaxAge) {
    throw new StepUpAuthRequiredError(action, effectiveMaxAge);
  }
}

/**
 * Check if session authentication is fresh enough without throwing
 * @param session - The user's session
 * @param action - The sensitive action being performed
 * @param maxAge - Optional custom max age in seconds (overrides default)
 * @returns true if authentication is fresh enough, false otherwise
 */
export function isAuthFresh(
  session: Session | null,
  action: SensitiveAction,
  maxAge?: number
): boolean {
  try {
    requireFreshAuth(session, action, maxAge);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the remaining time before authentication becomes stale
 * @param session - The user's session
 * @param action - The sensitive action being performed
 * @param maxAge - Optional custom max age in seconds (overrides default)
 * @returns Remaining time in seconds, or 0 if already stale
 */
export function getAuthFreshnessRemaining(
  session: Session | null,
  action: SensitiveAction,
  maxAge?: number
): number {
  if (!session) {
    return 0;
  }

  const effectiveMaxAge = maxAge ?? SENSITIVE_ACTION_MAX_AGE[action] ?? DEFAULT_MAX_AGE_SECONDS;
  const sessionUpdatedAt = new Date(session.updatedAt);
  const now = new Date();
  const ageInSeconds = (now.getTime() - sessionUpdatedAt.getTime()) / 1000;
  const remaining = effectiveMaxAge - ageInSeconds;

  return Math.max(0, remaining);
}
