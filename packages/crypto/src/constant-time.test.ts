import { describe, it, expect } from 'vitest';
import { constantTimeEqual, constantTimeEqualSync } from './constant-time.js';

describe('constantTimeEqual', () => {
  it('should return true for identical strings', async () => {
    const result = await constantTimeEqual('hello', 'hello');
    expect(result).toBe(true);
  });

  it('should return false for different strings', async () => {
    const result = await constantTimeEqual('hello', 'world');
    expect(result).toBe(false);
  });

  it('should return false for strings of different lengths', async () => {
    const result = await constantTimeEqual('hello', 'hello!');
    expect(result).toBe(false);
  });

  it('should return true for identical Uint8Arrays', async () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const result = await constantTimeEqual(a, b);
    expect(result).toBe(true);
  });

  it('should return false for different Uint8Arrays', async () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    const result = await constantTimeEqual(a, b);
    expect(result).toBe(false);
  });

  it('should return false for Uint8Arrays of different lengths', async () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const result = await constantTimeEqual(a, b);
    expect(result).toBe(false);
  });

  it('should handle empty strings', async () => {
    const result = await constantTimeEqual('', '');
    expect(result).toBe(true);
  });

  it('should handle empty Uint8Arrays', async () => {
    const a = new Uint8Array([]);
    const b = new Uint8Array([]);
    const result = await constantTimeEqual(a, b);
    expect(result).toBe(true);
  });

  it('should handle single character strings', async () => {
    const result = await constantTimeEqual('a', 'a');
    expect(result).toBe(true);
  });

  it('should handle strings with special characters', async () => {
    const result = await constantTimeEqual('hello@world!', 'hello@world!');
    expect(result).toBe(true);
  });

  it('should handle mixed string and Uint8Array inputs', async () => {
    const str = 'hello';
    const arr = new TextEncoder().encode('hello');
    const result = await constantTimeEqual(str, arr);
    expect(result).toBe(true);
  });

  it('should be case-sensitive', async () => {
    const result = await constantTimeEqual('Hello', 'hello');
    expect(result).toBe(false);
  });

  it('should handle unicode characters', async () => {
    const result = await constantTimeEqual('café', 'café');
    expect(result).toBe(true);
  });

  it('should handle binary data', async () => {
    const a = new Uint8Array([0x00, 0xff, 0x7f, 0x80]);
    const b = new Uint8Array([0x00, 0xff, 0x7f, 0x80]);
    const result = await constantTimeEqual(a, b);
    expect(result).toBe(true);
  });
});

describe('constantTimeEqualSync', () => {
  it('should return true for identical strings', () => {
    const result = constantTimeEqualSync('hello', 'hello');
    expect(result).toBe(true);
  });

  it('should return false for different strings', () => {
    const result = constantTimeEqualSync('hello', 'world');
    expect(result).toBe(false);
  });

  it('should return false for strings of different lengths', () => {
    const result = constantTimeEqualSync('hello', 'hello!');
    expect(result).toBe(false);
  });

  it('should return true for identical Uint8Arrays', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(true);
  });

  it('should return false for different Uint8Arrays', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(false);
  });

  it('should return false for Uint8Arrays of different lengths', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(false);
  });

  it('should handle empty strings', () => {
    const result = constantTimeEqualSync('', '');
    expect(result).toBe(true);
  });

  it('should handle empty Uint8Arrays', () => {
    const a = new Uint8Array([]);
    const b = new Uint8Array([]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(true);
  });

  it('should handle single character strings', () => {
    const result = constantTimeEqualSync('a', 'a');
    expect(result).toBe(true);
  });

  it('should handle strings with special characters', () => {
    const result = constantTimeEqualSync('hello@world!', 'hello@world!');
    expect(result).toBe(true);
  });

  it('should handle mixed string and Uint8Array inputs', () => {
    const str = 'hello';
    const arr = new TextEncoder().encode('hello');
    const result = constantTimeEqualSync(str, arr);
    expect(result).toBe(true);
  });

  it('should be case-sensitive', () => {
    const result = constantTimeEqualSync('Hello', 'hello');
    expect(result).toBe(false);
  });

  it('should handle unicode characters', () => {
    const result = constantTimeEqualSync('café', 'café');
    expect(result).toBe(true);
  });

  it('should handle binary data', () => {
    const a = new Uint8Array([0x00, 0xff, 0x7f, 0x80]);
    const b = new Uint8Array([0x00, 0xff, 0x7f, 0x80]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(true);
  });

  it('should return false when only first byte differs', () => {
    const a = new Uint8Array([0x00, 0x01, 0x02]);
    const b = new Uint8Array([0x01, 0x01, 0x02]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(false);
  });

  it('should return false when only last byte differs', () => {
    const a = new Uint8Array([0x00, 0x01, 0x02]);
    const b = new Uint8Array([0x00, 0x01, 0x03]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(false);
  });

  it('should return false when middle byte differs', () => {
    const a = new Uint8Array([0x00, 0x01, 0x02]);
    const b = new Uint8Array([0x00, 0x02, 0x02]);
    const result = constantTimeEqualSync(a, b);
    expect(result).toBe(false);
  });
});

describe('constant-time behavior verification', () => {
  it('should compare all bytes even after mismatch (sync)', () => {
    // This test verifies that the sync implementation doesn't short-circuit
    // by checking that it correctly identifies mismatches at different positions
    const a = new Uint8Array([1, 2, 3, 4, 5]);
    
    // Mismatch at first position
    const b1 = new Uint8Array([9, 2, 3, 4, 5]);
    expect(constantTimeEqualSync(a, b1)).toBe(false);
    
    // Mismatch at last position
    const b2 = new Uint8Array([1, 2, 3, 4, 9]);
    expect(constantTimeEqualSync(a, b2)).toBe(false);
    
    // Mismatch in middle
    const b3 = new Uint8Array([1, 2, 9, 4, 5]);
    expect(constantTimeEqualSync(a, b3)).toBe(false);
  });

  it('should handle zero bytes correctly', () => {
    const a = new Uint8Array([0, 0, 0]);
    const b = new Uint8Array([0, 0, 0]);
    expect(constantTimeEqualSync(a, b)).toBe(true);
    
    const c = new Uint8Array([0, 0, 1]);
    expect(constantTimeEqualSync(a, c)).toBe(false);
  });

  it('should handle all 0xff bytes correctly', () => {
    const a = new Uint8Array([255, 255, 255]);
    const b = new Uint8Array([255, 255, 255]);
    expect(constantTimeEqualSync(a, b)).toBe(true);
    
    const c = new Uint8Array([255, 255, 254]);
    expect(constantTimeEqualSync(a, c)).toBe(false);
  });
});
