import { describe, it, expect, beforeEach } from 'vitest';
import { validateCalendarEnv, validateTasksEnv, validateDriveEnv } from './index.js';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('should validate calendar environment with valid config', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';

    const env = validateCalendarEnv();
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('should throw error for calendar environment with missing DATABASE_URL', () => {
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should throw error for calendar environment with invalid PORT', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = 'invalid';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should throw error for calendar environment with invalid NODE_ENV', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'invalid';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should validate tasks environment with valid config', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = '3001';
    process.env.NODE_ENV = 'production';

    const env = validateTasksEnv();
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('production');
  });

  it('should validate drive environment with valid config', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = '3002';
    process.env.NODE_ENV = 'test';

    const env = validateDriveEnv();
    expect(env.DATABASE_URL).toBe('postgresql://localhost:5432/test');
    expect(env.PORT).toBe(3002);
    expect(env.NODE_ENV).toBe('test');
  });

  it('should throw error for invalid DATABASE_URL format', () => {
    process.env.DATABASE_URL = 'not-a-url';
    process.env.PORT = '3000';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });

  it('should throw error for PORT out of range', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.PORT = '70000';
    process.env.NODE_ENV = 'development';

    expect(() => validateCalendarEnv()).toThrow();
  });
});
