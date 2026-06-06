import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from './password-policy.js';

describe('validatePasswordStrength', () => {
  it('should accept valid password with variety', () => {
    const result = validatePasswordStrength('SecurePass123!');
    expect(result.valid).toBe(true);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Short1!');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least 8 characters');
  });

  it('should reject common passwords', () => {
    const result = validatePasswordStrength('password');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too common');
  });

  it('should reject password with insufficient character variety', () => {
    const result = validatePasswordStrength('lowercaseonly');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least 2 of');
  });

  it('should accept password with lowercase and uppercase', () => {
    const result = validatePasswordStrength('Password123');
    expect(result.valid).toBe(true);
  });

  it('should accept password with lowercase and numbers', () => {
    const result = validatePasswordStrength('password123');
    expect(result.valid).toBe(true);
  });

  it('should accept password with lowercase and special characters', () => {
    const result = validatePasswordStrength('password!');
    expect(result.valid).toBe(true);
  });
});
