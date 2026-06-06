/**
 * Tests for geolocation-based anomaly detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractGeolocationFromCF,
  detectLocationAnomaly,
  logLocationAnomaly,
  type GeolocationData,
} from './geolocation.js';

describe('geolocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('extractGeolocationFromCF', () => {
    it('should extract all geolocation fields from cf object', () => {
      const cf = {
        country: 'US',
        city: 'San Francisco',
        continent: 'NA',
        region: 'California',
        regionCode: 'CA',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles',
      };

      const location = extractGeolocationFromCF(cf);

      expect(location).toEqual(cf);
    });

    it('should handle partial cf object', () => {
      const cf = {
        country: 'US',
        city: 'San Francisco',
      };

      const location = extractGeolocationFromCF(cf);

      expect(location).toEqual({
        country: 'US',
        city: 'San Francisco',
      });
    });

    it('should handle empty cf object', () => {
      const cf = {};

      const location = extractGeolocationFromCF(cf);

      expect(location).toEqual({});
    });

    it('should handle undefined cf object', () => {
      const cf = undefined;

      const location = extractGeolocationFromCF(cf || {});

      expect(location).toEqual({});
    });
  });

  describe('detectLocationAnomaly', () => {
    it('should return false for first session (no known locations)', async () => {
      const mockAuthInstance = {
        api: {
          listSessions: vi.fn().mockResolvedValue([]),
        },
      };

      const location: GeolocationData = { country: 'US' };
      const isAnomalous = await detectLocationAnomaly('user-123', location, mockAuthInstance as any);

      expect(isAnomalous).toBe(false);
      expect(mockAuthInstance.api.listSessions).toHaveBeenCalledWith({
        headers: new Headers(),
      });
    });

    it('should return false when no country data available', async () => {
      const mockAuthInstance = {
        api: {
          listSessions: vi.fn().mockResolvedValue([{ location: { country: 'US' } }]),
        },
      };

      const location: GeolocationData = {};
      const isAnomalous = await detectLocationAnomaly('user-123', location, mockAuthInstance as any);

      expect(isAnomalous).toBe(false);
    });

    it('should return false when location matches known location', async () => {
      const mockAuthInstance = {
        api: {
          listSessions: vi.fn().mockResolvedValue([
            { location: { country: 'US' } },
            { location: { country: 'US' } },
          ]),
        },
      };

      const location: GeolocationData = { country: 'US' };
      const isAnomalous = await detectLocationAnomaly('user-123', location, mockAuthInstance as any);

      expect(isAnomalous).toBe(false);
    });

    it('should return true when location differs from known locations', async () => {
      const mockAuthInstance = {
        api: {
          listSessions: vi.fn().mockResolvedValue([
            { location: { country: 'US' } },
            { location: { country: 'US' } },
          ]),
        },
      };

      const location: GeolocationData = { country: 'GB' };
      const isAnomalous = await detectLocationAnomaly('user-123', location, mockAuthInstance as any);

      expect(isAnomalous).toBe(true);
    });

    it('should return false when sessions have no location data', async () => {
      const mockAuthInstance = {
        api: {
          listSessions: vi.fn().mockResolvedValue([
            { location: {} },
            { location: {} },
          ]),
        },
      };

      const location: GeolocationData = { country: 'US' };
      const isAnomalous = await detectLocationAnomaly('user-123', location, mockAuthInstance as any);

      expect(isAnomalous).toBe(false);
    });

    it('should fail open on error', async () => {
      const mockAuthInstance = {
        api: {
          listSessions: vi.fn().mockRejectedValue(new Error('Database error')),
        },
      };

      const location: GeolocationData = { country: 'US' };
      const isAnomalous = await detectLocationAnomaly('user-123', location, mockAuthInstance as any);

      expect(isAnomalous).toBe(false);
    });

    it('should handle non-array session response', async () => {
      const mockAuthInstance = {
        api: {
          listSessions: vi.fn().mockResolvedValue(null),
        },
      };

      const location: GeolocationData = { country: 'US' };
      const isAnomalous = await detectLocationAnomaly('user-123', location, mockAuthInstance as any);

      expect(isAnomalous).toBe(false);
    });
  });

  describe('logLocationAnomaly', () => {
    it('should log location anomaly with all fields', () => {
      const location: GeolocationData = {
        country: 'GB',
        city: 'London',
        region: 'England',
      };

      logLocationAnomaly('user-123', 'user@example.com', location, '1.2.3.4', 'Mozilla/5.0');

      expect(console.log).toHaveBeenCalledTimes(1);
      const logCall = JSON.parse((console.log as any).mock.calls[0][0]);
      expect(logCall.type).toBe('location_anomaly');
      expect(logCall.userId).toBe('user-123');
      expect(logCall.email).toBe('user@example.com');
      expect(logCall.ip).toBe('1.2.3.4');
      expect(logCall.userAgent).toBe('Mozilla/5.0');
      expect(logCall.service).toBe('auth');
      expect(logCall.metadata).toEqual({
        anomalyType: 'new_location',
        country: 'GB',
        city: 'London',
        region: 'England',
      });
      expect(logCall.timestamp).toBeDefined();
    });

    it('should log location anomaly with minimal fields', () => {
      const location: GeolocationData = { country: 'GB' };

      logLocationAnomaly('user-123', 'user@example.com', location);

      expect(console.log).toHaveBeenCalledTimes(1);
      const logCall = JSON.parse((console.log as any).mock.calls[0][0]);
      expect(logCall.type).toBe('location_anomaly');
      expect(logCall.userId).toBe('user-123');
      expect(logCall.email).toBe('user@example.com');
      expect(logCall.service).toBe('auth');
      expect(logCall.metadata).toEqual({
        anomalyType: 'new_location',
        country: 'GB',
      });
      expect(logCall.timestamp).toBeDefined();
    });

    it('should handle empty location', () => {
      const location: GeolocationData = {};

      logLocationAnomaly('user-123', 'user@example.com', location);

      expect(console.log).toHaveBeenCalledTimes(1);
      const logCall = JSON.parse((console.log as any).mock.calls[0][0]);
      expect(logCall.type).toBe('location_anomaly');
      expect(logCall.userId).toBe('user-123');
      expect(logCall.email).toBe('user@example.com');
      expect(logCall.service).toBe('auth');
      expect(logCall.metadata).toEqual({
        anomalyType: 'new_location',
      });
      expect(logCall.timestamp).toBeDefined();
    });
  });
});
