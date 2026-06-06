/**
 * Tests for device fingerprinting functionality
 * Covers fingerprint generation, anomaly detection, and audit logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateDeviceFingerprint,
  detectAnomalousDevice,
  logDeviceAnomaly,
} from './device-fingerprinting.js';
import { logAuthEvent } from './audit-log.js';
import { createAuth } from './server.js';

// Mock audit logging
vi.mock('./audit-log.js', () => ({
  logAuthEvent: vi.fn(),
  createAuthEvent: vi.fn((type, context) => ({ type, ...context, timestamp: new Date() })),
}));

describe('generateDeviceFingerprint', () => {
  it('should generate consistent fingerprint for same inputs', async () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const ip = '192.168.1.1';
    
    const fingerprint1 = await generateDeviceFingerprint(userAgent, ip);
    const fingerprint2 = await generateDeviceFingerprint(userAgent, ip);
    
    expect(fingerprint1).toBe(fingerprint2);
    expect(fingerprint1).toHaveLength(64); // SHA-256 hex string
  });

  it('should generate different fingerprints for different user agents', async () => {
    const ip = '192.168.1.1';
    const userAgent1 = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const userAgent2 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    
    const fingerprint1 = await generateDeviceFingerprint(userAgent1, ip);
    const fingerprint2 = await generateDeviceFingerprint(userAgent2, ip);
    
    expect(fingerprint1).not.toBe(fingerprint2);
  });

  it('should generate different fingerprints for different IPs', async () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    
    const fingerprint1 = await generateDeviceFingerprint(userAgent, ip1);
    const fingerprint2 = await generateDeviceFingerprint(userAgent, ip2);
    
    expect(fingerprint1).not.toBe(fingerprint2);
  });

  it('should generate different fingerprints for different combinations', async () => {
    const fingerprint1 = await generateDeviceFingerprint('ua1', 'ip1');
    const fingerprint2 = await generateDeviceFingerprint('ua1', 'ip2');
    const fingerprint3 = await generateDeviceFingerprint('ua2', 'ip1');
    const fingerprint4 = await generateDeviceFingerprint('ua2', 'ip2');
    
    expect(fingerprint1).not.toBe(fingerprint2);
    expect(fingerprint1).not.toBe(fingerprint3);
    expect(fingerprint1).not.toBe(fingerprint4);
    expect(fingerprint2).not.toBe(fingerprint3);
    expect(fingerprint2).not.toBe(fingerprint4);
    expect(fingerprint3).not.toBe(fingerprint4);
  });
});

describe('detectAnomalousDevice', () => {
  let mockAuth: ReturnType<typeof createAuth>;

  beforeEach(() => {
    // Create a mock auth instance
    mockAuth = {
      api: {
        listSessions: vi.fn(),
      },
    } as unknown as ReturnType<typeof createAuth>;
  });

  it('should return false for first session (no known devices)', async () => {
    vi.mocked(mockAuth.api.listSessions).mockResolvedValue([]);
    
    const isAnomalous = await detectAnomalousDevice('user-123', 'fingerprint-abc', mockAuth);
    
    expect(isAnomalous).toBe(false);
  });

  it('should return false when no fingerprints in sessions', async () => {
    vi.mocked(mockAuth.api.listSessions).mockResolvedValue([
      { id: 'session-1', userId: 'user-123' } as any,
      { id: 'session-2', userId: 'user-123' } as any,
    ]);
    
    const isAnomalous = await detectAnomalousDevice('user-123', 'fingerprint-abc', mockAuth);
    
    expect(isAnomalous).toBe(false);
  });

  it('should return false when fingerprint matches known device', async () => {
    vi.mocked(mockAuth.api.listSessions).mockResolvedValue([
      { id: 'session-1', userId: 'user-123', deviceFingerprint: 'fingerprint-abc' } as any,
      { id: 'session-2', userId: 'user-123', deviceFingerprint: 'fingerprint-xyz' } as any,
    ]);
    
    const isAnomalous = await detectAnomalousDevice('user-123', 'fingerprint-abc', mockAuth);
    
    expect(isAnomalous).toBe(false);
  });

  it('should return true when fingerprint does not match any known device', async () => {
    vi.mocked(mockAuth.api.listSessions).mockResolvedValue([
      { id: 'session-1', userId: 'user-123', deviceFingerprint: 'fingerprint-xyz' } as any,
      { id: 'session-2', userId: 'user-123', deviceFingerprint: 'fingerprint-abc' } as any,
    ]);
    
    const isAnomalous = await detectAnomalousDevice('user-123', 'fingerprint-new', mockAuth);
    
    expect(isAnomalous).toBe(true);
  });

  it('should fail open on detection errors', async () => {
    vi.mocked(mockAuth.api.listSessions).mockRejectedValue(new Error('Database error'));
    
    const isAnomalous = await detectAnomalousDevice('user-123', 'fingerprint-abc', mockAuth);
    
    expect(isAnomalous).toBe(false);
  });

  it('should handle non-array session responses', async () => {
    vi.mocked(mockAuth.api.listSessions).mockResolvedValue(null as any);
    
    const isAnomalous = await detectAnomalousDevice('user-123', 'fingerprint-abc', mockAuth);
    
    expect(isAnomalous).toBe(false);
  });
});

describe('logDeviceAnomaly', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log device anomaly with all parameters', () => {
    logDeviceAnomaly(
      'user-123',
      'user@example.com',
      'fingerprint-abc123def456',
      '192.168.1.1',
      'Mozilla/5.0'
    );

    expect(logAuthEvent).toHaveBeenCalledTimes(1);
    const loggedEvent = vi.mocked(logAuthEvent).mock.calls[0]![0];
    expect(loggedEvent.type).toBe('device_anomaly');
    expect(loggedEvent.userId).toBe('user-123');
    expect(loggedEvent.email).toBe('user@example.com');
    expect(loggedEvent.ip).toBe('192.168.1.1');
    expect(loggedEvent.userAgent).toBe('Mozilla/5.0');
    expect(loggedEvent.metadata?.deviceFingerprint).toMatch(/^fingerprint-abc[0-9a-f]+\.\.\.$/);
    expect(loggedEvent.metadata?.anomalyType).toBe('new_device');
  });

  it('should log device anomaly without IP', () => {
    logDeviceAnomaly(
      'user-123',
      'user@example.com',
      'fingerprint-abc123def456',
      undefined,
      'Mozilla/5.0'
    );

    expect(logAuthEvent).toHaveBeenCalledTimes(1);
    const loggedEvent = vi.mocked(logAuthEvent).mock.calls[0]![0];
    expect(loggedEvent.ip).toBeUndefined();
    expect(loggedEvent.userAgent).toBe('Mozilla/5.0');
  });

  it('should log device anomaly without user agent', () => {
    logDeviceAnomaly(
      'user-123',
      'user@example.com',
      'fingerprint-abc123def456',
      '192.168.1.1',
      undefined
    );

    expect(logAuthEvent).toHaveBeenCalledTimes(1);
    const loggedEvent = vi.mocked(logAuthEvent).mock.calls[0]![0];
    expect(loggedEvent.ip).toBe('192.168.1.1');
    expect(loggedEvent.userAgent).toBeUndefined();
  });

  it('should log device anomaly without IP and user agent', () => {
    logDeviceAnomaly(
      'user-123',
      'user@example.com',
      'fingerprint-abc123def456'
    );

    expect(logAuthEvent).toHaveBeenCalledTimes(1);
    const loggedEvent = vi.mocked(logAuthEvent).mock.calls[0]![0];
    expect(loggedEvent.ip).toBeUndefined();
    expect(loggedEvent.userAgent).toBeUndefined();
  });

  it('should log partial fingerprint for security', () => {
    logDeviceAnomaly(
      'user-123',
      'user@example.com',
      'fingerprint-abc123def456789'
    );

    expect(logAuthEvent).toHaveBeenCalledTimes(1);
    const loggedEvent = vi.mocked(logAuthEvent).mock.calls[0]![0];
    expect(loggedEvent.metadata?.deviceFingerprint).toHaveLength(19); // 16 chars + '...'
    expect(loggedEvent.metadata?.deviceFingerprint).toMatch(/\.\.$/);
  });
});
