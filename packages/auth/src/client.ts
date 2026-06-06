import { createAuthClient } from 'better-auth/react';
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { ssoClient } from '@better-auth/sso/client';

const baseURL = (typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL)
  || 'http://localhost:8787';

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
    twoFactorClient(),
    ssoClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
