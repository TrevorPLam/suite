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

// Organization client is already configured with organizationClient plugin
// Applications can use authClient.organization.createOrganization, etc.

// 2FA client utilities are available via authClient.twoFactor
// Applications can use:
// - authClient.twoFactor.getTotpUri({ password })
// - authClient.twoFactor.verifyTotp({ code, trustDevice })
// - authClient.twoFactor.generateBackupCodes({ password })
// - authClient.twoFactor.verifyBackupCode({ code, disableSession, trustDevice })
// - authClient.twoFactor.viewBackupCodes({ userId })
