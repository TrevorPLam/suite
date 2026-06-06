import { vi } from 'vitest';

// Set required environment variables for tests
process.env.BETTER_AUTH_SECRET = 'test-secret-for-unit-tests-32chars';

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
