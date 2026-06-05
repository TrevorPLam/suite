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
