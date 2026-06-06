import { describe, it, expect } from 'vitest';
import { validateIPBinding, extractClientIP } from './ip-binding.js';

describe('validateIPBinding', () => {
  describe('disabled mode', () => {
    it('should always return valid when disabled', () => {
      const result = validateIPBinding('192.168.1.1', '10.0.0.1', 'disabled');
      expect(result.valid).toBe(true);
    });

    it('should return valid with no session IP when disabled', () => {
      const result = validateIPBinding(undefined, '10.0.0.1', 'disabled');
      expect(result.valid).toBe(true);
    });

    it('should return valid with no request IP when disabled', () => {
      const result = validateIPBinding('192.168.1.1', undefined, 'disabled');
      expect(result.valid).toBe(true);
    });
  });

  describe('exact mode', () => {
    it('should return valid when IPs match exactly', () => {
      const result = validateIPBinding('192.168.1.1', '192.168.1.1', 'exact');
      expect(result.valid).toBe(true);
    });

    it('should return invalid when IPs differ', () => {
      const result = validateIPBinding('192.168.1.1', '192.168.1.2', 'exact');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('IP address mismatch');
    });

    it('should return valid when session IP is undefined (first request)', () => {
      const result = validateIPBinding(undefined, '192.168.1.1', 'exact');
      expect(result.valid).toBe(true);
    });

    it('should return invalid when request IP is undefined', () => {
      const result = validateIPBinding('192.168.1.1', undefined, 'exact');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Request IP missing');
    });
  });

  describe('subnet mode', () => {
    it('should return valid when IPs are in same /24 subnet', () => {
      const result = validateIPBinding('192.168.1.1', '192.168.1.2', 'subnet');
      expect(result.valid).toBe(true);
    });

    it('should return valid when IPs are identical', () => {
      const result = validateIPBinding('192.168.1.1', '192.168.1.1', 'subnet');
      expect(result.valid).toBe(true);
    });

    it('should return invalid when IPs are in different subnets', () => {
      const result = validateIPBinding('192.168.1.1', '192.168.2.1', 'subnet');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('IP subnet mismatch');
    });

    it('should return invalid when IPs are in different /24 but same /16', () => {
      const result = validateIPBinding('192.168.1.1', '192.168.2.1', 'subnet');
      expect(result.valid).toBe(false);
    });

    it('should return valid when session IP is undefined (first request)', () => {
      const result = validateIPBinding(undefined, '192.168.1.1', 'subnet');
      expect(result.valid).toBe(true);
    });

    it('should return invalid when request IP is undefined', () => {
      const result = validateIPBinding('192.168.1.1', undefined, 'subnet');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Request IP missing');
    });

    it('should fall back to exact match for non-IPv4 addresses', () => {
      const result = validateIPBinding('2001:db8::1', '2001:db8::1', 'subnet');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for different non-IPv4 addresses', () => {
      const result = validateIPBinding('2001:db8::1', '2001:db8::2', 'subnet');
      expect(result.valid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid IPv4 addresses gracefully', () => {
      const result = validateIPBinding('invalid.ip', '192.168.1.1', 'subnet');
      expect(result.valid).toBe(false);
    });

    it('should handle both undefined IPs as valid (no IP available)', () => {
      const result = validateIPBinding(undefined, undefined, 'subnet');
      expect(result.valid).toBe(true);
    });

    it('should handle default strictness (subnet)', () => {
      const result = validateIPBinding('192.168.1.1', '192.168.1.2', undefined);
      expect(result.valid).toBe(true);
    });
  });
});

describe('extractClientIP', () => {
  it('should extract IP from cf-connecting-ip header', () => {
    const headers = new Headers();
    headers.set('cf-connecting-ip', '192.168.1.1');
    const ip = extractClientIP(headers);
    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from x-forwarded-for header', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '192.168.1.1, 10.0.0.1');
    const ip = extractClientIP(headers);
    expect(ip).toBe('192.168.1.1');
  });

  it('should extract IP from x-real-ip header', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '192.168.1.1');
    const ip = extractClientIP(headers);
    expect(ip).toBe('192.168.1.1');
  });

  it('should prioritize cf-connecting-ip over other headers', () => {
    const headers = new Headers();
    headers.set('cf-connecting-ip', '192.168.1.1');
    headers.set('x-forwarded-for', '10.0.0.1');
    headers.set('x-real-ip', '172.16.0.1');
    const ip = extractClientIP(headers);
    expect(ip).toBe('192.168.1.1');
  });

  it('should prioritize x-forwarded-for over x-real-ip', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '192.168.1.1');
    headers.set('x-real-ip', '172.16.0.1');
    const ip = extractClientIP(headers);
    expect(ip).toBe('192.168.1.1');
  });

  it('should return undefined when no IP headers present', () => {
    const headers = new Headers();
    const ip = extractClientIP(headers);
    expect(ip).toBeUndefined();
  });

  it('should handle simple getter interface (Better Auth hook context)', () => {
    const headers = {
      get: (name: string) => {
        if (name === 'cf-connecting-ip') return '192.168.1.1';
        return null;
      },
    };
    const ip = extractClientIP(headers);
    expect(ip).toBe('192.168.1.1');
  });

  it('should handle empty x-forwarded-for', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '');
    const ip = extractClientIP(headers);
    expect(ip).toBeUndefined();
  });

  it('should trim whitespace from x-forwarded-for', () => {
    const headers = new Headers();
    headers.set('x-forwarded-for', '  192.168.1.1  , 10.0.0.1');
    const ip = extractClientIP(headers);
    expect(ip).toBe('192.168.1.1');
  });
});
