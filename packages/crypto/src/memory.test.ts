/**
 * Tests for memory zeroization utilities
 */

import { describe, it, expect } from 'vitest';
import { secureZeroize } from './memory.js';

describe('secureZeroize', () => {
  it('should zeroize a Uint8Array', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    secureZeroize(data);
    
    // All bytes should be zero
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBe(0);
    }
  });

  it('should zeroize an ArrayBuffer', () => {
    const buffer = new ArrayBuffer(5);
    const view = new Uint8Array(buffer);
    view.set([1, 2, 3, 4, 5]);
    
    secureZeroize(buffer);
    
    // All bytes should be zero
    for (let i = 0; i < view.length; i++) {
      expect(view[i]).toBe(0);
    }
  });

  it('should handle empty arrays', () => {
    const data = new Uint8Array(0);
    expect(() => secureZeroize(data)).not.toThrow();
  });

  it('should handle large arrays', () => {
    const data = new Uint8Array(1000);
    for (let i = 0; i < data.length; i++) {
      data[i] = i % 256;
    }
    
    secureZeroize(data);
    
    // All bytes should be zero
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBe(0);
    }
  });

  it('should throw error for invalid input type', () => {
    expect(() => secureZeroize('string' as unknown as Uint8Array)).toThrow('secureZeroize requires Uint8Array or ArrayBuffer');
    expect(() => secureZeroize(123 as unknown as Uint8Array)).toThrow('secureZeroize requires Uint8Array or ArrayBuffer');
    expect(() => secureZeroize({} as unknown as Uint8Array)).toThrow('secureZeroize requires Uint8Array or ArrayBuffer');
    expect(() => secureZeroize(null as unknown as Uint8Array)).toThrow('secureZeroize requires Uint8Array or ArrayBuffer');
    expect(() => secureZeroize(undefined as unknown as Uint8Array)).toThrow('secureZeroize requires Uint8Array or ArrayBuffer');
  });

  it('should handle arrays with all zeros', () => {
    const data = new Uint8Array([0, 0, 0, 0, 0]);
    expect(() => secureZeroize(data)).not.toThrow();
    
    // Should still be zero
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBe(0);
    }
  });

  it('should handle arrays with all 0xFF', () => {
    const data = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
    secureZeroize(data);
    
    // All bytes should be zero
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBe(0);
    }
  });

  it('should handle mixed byte values', () => {
    const data = new Uint8Array([0x00, 0xFF, 0x55, 0xAA, 0x12, 0x34, 0x56, 0x78]);
    secureZeroize(data);
    
    // All bytes should be zero
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBe(0);
    }
  });
});
