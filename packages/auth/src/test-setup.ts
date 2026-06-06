import { vi } from 'vitest';

// Mock better-auth/react to prevent actual network calls
vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    useSession: vi.fn(),
  })),
}));
