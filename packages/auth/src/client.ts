import { createAuthClient } from 'better-auth/react';

const baseURL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) 
  || process.env.VITE_API_URL 
  || process.env.BETTER_AUTH_URL 
  || 'http://localhost:8787';

export const authClient = createAuthClient({
  baseURL,
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
