import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuth } from './server.js';
import { validateAuthEnv } from './env.js';

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    // Reset environment variables before each test
    process.env.BETTER_AUTH_SECRET = 'test-secret-for-integration-tests-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
  });

  describe('createAuth', () => {
    it('should create auth instance with valid environment', () => {
      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
      });

      expect(auth).toBeDefined();
      expect(auth.api).toBeDefined();
    });

    it('should create auth instance with database adapter', () => {
      const mockDb = {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      } as unknown as Parameters<typeof createAuth>[0]['db'];

      const auth = createAuth({
        db: mockDb,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
      });

      expect(auth).toBeDefined();
      expect(auth.api).toBeDefined();
    });

    it('should throw error with invalid environment (missing secret)', () => {
      expect(() => {
        createAuth({
          db: null,
          env: {
            BETTER_AUTH_URL: 'http://localhost:3000',
          },
        });
      }).toThrow();
    });

    it('should throw error with invalid environment (short secret)', () => {
      expect(() => {
        createAuth({
          db: null,
          env: {
            BETTER_AUTH_SECRET: 'short',
            BETTER_AUTH_URL: 'http://localhost:3000',
          },
        });
      }).toThrow();
    });

    it('should throw error with invalid environment (invalid URL)', () => {
      expect(() => {
        createAuth({
          db: null,
          env: {
            BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
            BETTER_AUTH_URL: 'not-a-valid-url',
          },
        });
      }).toThrow();
    });

    it('should accept custom trusted origins', () => {
      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
        trustedOrigins: 'https://example.com,https://app.example.com',
      });

      expect(auth).toBeDefined();
    });

    it('should accept Better Auth API key for dash plugin', () => {
      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
        betterAuthApiKey: 'test-api-key',
      });

      expect(auth).toBeDefined();
    });
  });

  describe('validateAuthEnv', () => {
    it('should validate valid environment', () => {
      const result = validateAuthEnv({
        BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
        BETTER_AUTH_URL: 'http://localhost:3000',
      });

      expect(result).toBeDefined();
      expect(result.BETTER_AUTH_SECRET).toBe('test-secret-for-integration-tests-32chars');
      expect(result.BETTER_AUTH_URL).toBe('http://localhost:3000');
    });

    it('should use process.env as fallback', () => {
      process.env.BETTER_AUTH_SECRET = 'test-secret-for-integration-tests-32chars';
      process.env.BETTER_AUTH_URL = 'http://localhost:3000';

      const result = validateAuthEnv(process.env);

      expect(result).toBeDefined();
      expect(result.BETTER_AUTH_SECRET).toBe('test-secret-for-integration-tests-32chars');
      expect(result.BETTER_AUTH_URL).toBe('http://localhost:3000');
    });

    it('should throw on missing secret', () => {
      expect(() => {
        validateAuthEnv({
          BETTER_AUTH_URL: 'http://localhost:3000',
        });
      }).toThrow();
    });

    it('should throw on short secret', () => {
      expect(() => {
        validateAuthEnv({
          BETTER_AUTH_SECRET: 'short',
          BETTER_AUTH_URL: 'http://localhost:3000',
        });
      }).toThrow();
    });

    it('should throw on invalid URL', () => {
      expect(() => {
        validateAuthEnv({
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'not-a-valid-url',
        });
      }).toThrow();
    });
  });

  describe('Session API', () => {
    it('should have getSession method available', () => {
      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
      });

      expect(auth.api.getSession).toBeDefined();
      expect(typeof auth.api.getSession).toBe('function');
    });

    it('should have signOut method available', () => {
      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
      });

      expect(auth.api.signOut).toBeDefined();
      expect(typeof auth.api.signOut).toBe('function');
    });
  });

  describe('KV Integration', () => {
    it('should accept KV namespace for secondary storage', () => {
      const mockKV = {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      };

      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
          AUTH_KV: mockKV as never,
        },
      });

      expect(auth).toBeDefined();
    });

    it('should work without KV namespace', () => {
      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
      });

      expect(auth).toBeDefined();
    });
  });

  describe('waitUntil Integration', () => {
    it('should accept waitUntil for background tasks', () => {
      const mockWaitUntil = vi.fn();

      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
        waitUntil: mockWaitUntil,
      });

      expect(auth).toBeDefined();
    });

    it('should work without waitUntil', () => {
      const auth = createAuth({
        db: null,
        env: {
          BETTER_AUTH_SECRET: 'test-secret-for-integration-tests-32chars',
          BETTER_AUTH_URL: 'http://localhost:3000',
        },
      });

      expect(auth).toBeDefined();
    });
  });
});
