import { describe, it, expect, beforeEach } from 'vitest';
import { validateCalendarEnv, validateTasksEnv, validateDriveEnv } from './index.js';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('should validate calendar environment with valid config', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';

    const env = validateCalendarEnv();
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.BETTER_AUTH_SECRET).toBe('dev-secret-change-in-production-32chars');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3001');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('should validate calendar environment with explicit env object', () => {
    const customEnv = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      BETTER_AUTH_SECRET: 'dev-secret-change-in-production-32chars',
      BETTER_AUTH_URL: 'http://localhost:3001',
      PORT: '3000',
      NODE_ENV: 'development',
    };

    const env = validateCalendarEnv(customEnv);
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.BETTER_AUTH_SECRET).toBe('dev-secret-change-in-production-32chars');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3001');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('should throw error when DATABASE_URL is not set', () => {
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should throw error for calendar environment with invalid PORT', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = 'invalid';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should throw error for calendar environment with invalid NODE_ENV', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'invalid';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should validate tasks environment with valid config', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3002';
    process.env.PORT = '3001';
    process.env.NODE_ENV = 'production';
    // Generate valid base64 32-byte key
    const testKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xaa)));
    process.env.ENCRYPTION_KEY = testKey;

    const env = validateTasksEnv();
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.BETTER_AUTH_SECRET).toBe('dev-secret-change-in-production-32chars');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3002');
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('production');
  });

  it('should validate tasks environment with explicit env object', () => {
    const testKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xaa)));
    const customEnv = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      BETTER_AUTH_SECRET: 'dev-secret-change-in-production-32chars',
      BETTER_AUTH_URL: 'http://localhost:3002',
      PORT: '3001',
      NODE_ENV: 'production',
      ENCRYPTION_KEY: testKey,
    };

    const env = validateTasksEnv(customEnv);
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.BETTER_AUTH_SECRET).toBe('dev-secret-change-in-production-32chars');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3002');
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('production');
  });

  it('should validate drive environment with valid config', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3003';
    process.env.PORT = '3002';
    process.env.NODE_ENV = 'test';

    const env = validateDriveEnv();
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.BETTER_AUTH_SECRET).toBe('dev-secret-change-in-production-32chars');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3003');
    expect(env.PORT).toBe(3002);
    expect(env.NODE_ENV).toBe('test');
  });

  it('should validate drive environment with explicit env object', () => {
    const customEnv = {
      DATABASE_URL: 'postgresql://localhost:5432/test',
      BETTER_AUTH_SECRET: 'dev-secret-change-in-production-32chars',
      BETTER_AUTH_URL: 'http://localhost:3003',
      PORT: '3002',
      NODE_ENV: 'test',
    };

    const env = validateDriveEnv(customEnv);
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.BETTER_AUTH_SECRET).toBe('dev-secret-change-in-production-32chars');
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3003');
    expect(env.PORT).toBe(3002);
    expect(env.NODE_ENV).toBe('test');
  });

  it('should throw error for invalid DATABASE_URL format', () => {
    process.env.DATABASE_URL = 'not-a-url';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should throw error for PORT out of range', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '70000';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should validate with valid 32-byte base64 ENCRYPTION_KEY', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';
    const testKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xaa)));
    process.env.ENCRYPTION_KEY = testKey;

    const env = validateCalendarEnv();
    expect(env.ENCRYPTION_KEY).toBe(testKey);
  });

  it('should throw error for invalid ENCRYPTION_KEY format (not base64)', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';
    process.env.ENCRYPTION_KEY = 'not-base64-string';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should throw error for invalid ENCRYPTION_KEY length (not 44 chars)', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should allow optional ENCRYPTION_KEY in development', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';

    const env = validateCalendarEnv();
    expect(env.ENCRYPTION_KEY).toBeUndefined();
  });

  it('should require ENCRYPTION_KEY in production', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'production';

    expect(() => validateCalendarEnv()).toThrow('ENCRYPTION_KEY is required in production');
  });

  it('should throw error for hex ENCRYPTION_KEY (old format)', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';
    process.env.ENCRYPTION_KEY = 'a'.repeat(64); // Old hex format

    expect(() => validateCalendarEnv()).toThrow('ENCRYPTION_KEY must be a base64-encoded 32-byte AES-256 key');
  });

  it('should accept valid base64 ENCRYPTION_KEY', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';
    const testKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xaa)));
    process.env.ENCRYPTION_KEY = testKey;

    const env = validateCalendarEnv();
    expect(env.ENCRYPTION_KEY).toBe(testKey);
  });

  it('should validate production with valid ENCRYPTION_KEY', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.BETTER_AUTH_SECRET = 'dev-secret-change-in-production-32chars';
    process.env.BETTER_AUTH_URL = 'http://localhost:3001';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'production';
    const testKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xaa)));
    process.env.ENCRYPTION_KEY = testKey;

    const env = validateCalendarEnv();
    expect(env.ENCRYPTION_KEY).toBe(testKey);
  });
});
