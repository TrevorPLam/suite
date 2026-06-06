/**
 * Identity and authorization adapter port interfaces
 * These are minimal contracts for domain packages to depend on
 * without knowing implementation details
 */

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthContext {
  userId: string | null;
  isAuthenticated: boolean;
}

export interface AuthService {
  getCurrentUser(): Promise<User | null>;
  authenticate(token: string): Promise<AuthContext>;
  authorize(userId: string, resource: string, action: string): Promise<boolean>;
}

export const authPackageName = '@suite/auth';

// Better Auth exports
export { createAuth, getSession, requireSession } from './server.js';
export { authMiddleware, requireOrganization } from './middleware.js';
export { requireAuth } from './protected.js';
export { authClient, signIn, signUp, signOut, useSession } from './client.js';
export { mountAuth } from './mount.js';
export type { Session, User as BetterAuthUser } from 'better-auth/types';

// Environment validation
export { validateAuthEnv } from './env.js';

// Password policy validation
export { validatePasswordStrength } from './password-policy.js';

// Breached credential checking
export { checkBreachedCredentials } from './breached-credentials.js';

// Email service for verification and password reset
export { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetNotificationEmail, sendOTPEmail } from './email-service.js';
export type { SendVerificationEmailOptions, SendPasswordResetEmailOptions, SendPasswordResetNotificationEmailOptions, SendOTPEmailOptions } from './email-service.js';

// SMS service for OTP delivery
export { sendSMS, sendOTPSMS } from './sms-service.js';
export type { SMSOptions, SendOTPSMSOptions } from './sms-service.js';

// Session revocation utilities
export { revokeSession, revokeAllSessions } from './session-revocation.js';

// Session management with audit logging
export { listSessions, revokeSession as revokeSessionWithAudit, revokeAllSessions as revokeAllSessionsWithAudit, revokeOtherSessions } from './session-management.js';

// Device fingerprinting for session security
export { generateDeviceFingerprint, detectAnomalousDevice, logDeviceAnomaly } from './device-fingerprinting.js';

// Geolocation-based anomaly detection for session security
export { extractGeolocationFromCF, detectLocationAnomaly, logLocationAnomaly } from './geolocation.js';
export type { GeolocationData } from './geolocation.js';

// IP-based session binding for enhanced security
export { validateIPBinding, extractClientIP } from './ip-binding.js';
export type { IPBindingStrictness, IPBindingResult } from './ip-binding.js';

// Session limits for concurrent session enforcement
export { enforceSessionLimit } from './session-limits.js';

// Step-up authentication for sensitive actions
export { requireFreshAuth, isAuthFresh, getAuthFreshnessRemaining, type SensitiveAction, StepUpAuthRequiredError } from './step-up-auth.js';

// Advanced rate limiting with token bucket algorithm
export { checkRateLimit, checkEndpointRateLimit, applyRateLimitHeaders, createRateLimitedResponse, calculateExponentialBackoff, getRetryDelayWithJitter, configureBetterAuthRateLimit, DEFAULT_ENDPOINT_CONFIGS } from './rate-limiting.js';
export type { RateLimitConfig, RateLimitResult, PerEndpointConfig, RateLimitOptions } from './rate-limiting.js';

// OTP (One-Time Password) for email and SMS authentication
export { configureOTP } from './otp.js';
export type { OTPOptions, OTPConfig, EmailOTPProvider, SMSOTPProvider, OTPResult, ValidateOTPResult } from './otp.js';

// Organization client is already configured with organizationClient plugin
// Applications can use authClient.organization.createOrganization, etc.

// 2FA client utilities are available via authClient.twoFactor
// Applications can use:
// - authClient.twoFactor.getTotpUri({ password })
// - authClient.twoFactor.verifyTotp({ code, trustDevice })
// - authClient.twoFactor.generateBackupCodes({ password })
// - authClient.twoFactor.verifyBackupCode({ code, disableSession, trustDevice })
// - authClient.twoFactor.viewBackupCodes({ userId })
