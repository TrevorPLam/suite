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
export { auth, getSession, requireSession } from './server.js';
export { authMiddleware } from './middleware.js';
export { requireAuth } from './protected.js';
export { authClient, signIn, signUp, signOut, useSession } from './client.js';
export type { Session, User as BetterAuthUser } from 'better-auth/types';
