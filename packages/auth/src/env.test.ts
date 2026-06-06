import { describe, it, expect } from 'vitest';
import { validateAuthEnv } from './env.js';

describe('validateAuthEnv', () => {
  it('should validate valid environment variables', () => {
    const env = {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'https://example.com',
    };

    const result = validateAuthEnv(env);
    expect(result.BETTER_AUTH_SECRET).toBe(env.BETTER_AUTH_SECRET);
    expect(result.BETTER_AUTH_URL).toBe(env.BETTER_AUTH_URL);
  });

  it('should throw error when BETTER_AUTH_SECRET is missing', () => {
    const env = {
      BETTER_AUTH_URL: 'https://example.com',
    };

    expect(() => validateAuthEnv(env)).toThrow('BETTER_AUTH_SECRET');
  });

  it('should throw error when BETTER_AUTH_SECRET is too short', () => {
    const env = {
      BETTER_AUTH_SECRET: 'short',
      BETTER_AUTH_URL: 'https://example.com',
    };

    expect(() => validateAuthEnv(env)).toThrow('BETTER_AUTH_SECRET must be at least 32 characters');
  });

  it('should throw error when BETTER_AUTH_URL is missing', () => {
    const env = {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
    };

    expect(() => validateAuthEnv(env)).toThrow('BETTER_AUTH_URL');
  });

  it('should throw error when BETTER_AUTH_URL is invalid', () => {
    const env = {
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      BETTER_AUTH_URL: 'not-a-url',
    };

    expect(() => validateAuthEnv(env)).toThrow('BETTER_AUTH_URL must be a valid URL');
  });
});
