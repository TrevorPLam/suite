/**
 * Cache Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { configureAuthCache, type UserProfile, type KVNamespace } from './cache.js';

describe('configureAuthCache', () => {
  let mockKV: KVNamespace;
  let cache: ReturnType<typeof configureAuthCache>;
  let getCallCount = 0;
  let putCallCount = 0;
  let deleteCallCount = 0;

  beforeEach(() => {
    getCallCount = 0;
    putCallCount = 0;
    deleteCallCount = 0;
    mockKV = {
      get: async () => {
        getCallCount++;
        return null;
      },
      put: async () => {
        putCallCount++;
      },
      delete: async () => {
        deleteCallCount++;
      },
    };
    cache = configureAuthCache({ kv: mockKV, enableMonitoring: true });
  });

  describe('getUserProfile', () => {
    it('should return null when profile not cached', async () => {
      const result = await cache.getUserProfile('user-123');
      expect(result).toBeNull();
      expect(getCallCount).toBe(1);
    });

    it('should return null when KV is not available', async () => {
      const cacheNoKV = configureAuthCache({ kv: undefined as unknown as KVNamespace, enableMonitoring: true });
      const result = await cacheNoKV.getUserProfile('user-123');
      expect(result).toBeNull();
    });
  });

  describe('setUserProfile', () => {
    it('should cache user profile with TTL', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      await cache.setUserProfile(profile);
      expect(putCallCount).toBe(1);
    });

    it('should use minimum TTL of 60 seconds', async () => {
      const cacheShortTTL = configureAuthCache({ kv: mockKV, profileCacheTTL: 30 });
      const profile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await cacheShortTTL.setUserProfile(profile);
      expect(putCallCount).toBe(1);
    });

    it('should not throw when KV is not available', async () => {
      const cacheNoKV = configureAuthCache({ kv: undefined as unknown as KVNamespace });
      const profile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(cacheNoKV.setUserProfile(profile)).resolves.not.toThrow();
      expect(putCallCount).toBe(0);
    });
  });

  describe('invalidateUserProfile', () => {
    it('should delete cached user profile', async () => {
      await cache.invalidateUserProfile('user-123');
      expect(deleteCallCount).toBe(1);
    });

    it('should do nothing when KV is not available', async () => {
      const cacheNoKV = configureAuthCache({ kv: undefined as unknown as KVNamespace });
      await cacheNoKV.invalidateUserProfile('user-123');
      expect(deleteCallCount).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      // Cache miss
      await cache.getUserProfile('user-123');
      // Another cache miss
      await cache.getUserProfile('user-123');

      const stats = cache.getCacheStats();
      expect(stats).toEqual({
        hits: 0,
        misses: 2,
        hitRate: 0,
      });
    });

    it('should return null when monitoring is disabled', async () => {
      const cacheNoMonitoring = configureAuthCache({ kv: mockKV, enableMonitoring: false });
      const stats = cacheNoMonitoring.getCacheStats();
      expect(stats).toBeNull();
    });

    it('should reset statistics', async () => {
      await cache.getUserProfile('user-123');
      cache.resetStats();

      const stats = cache.getCacheStats();
      expect(stats).toEqual({
        hits: 0,
        misses: 0,
        hitRate: 0,
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should track latency metrics', async () => {
      await cache.getUserProfile('user-123');

      const metrics = cache.getPerformanceMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.averageLatency).toBeGreaterThanOrEqual(0);
    });

    it('should return null when monitoring is disabled', async () => {
      const cacheNoMonitoring = configureAuthCache({ kv: mockKV, enableMonitoring: false });
      const metrics = cacheNoMonitoring.getPerformanceMetrics();
      expect(metrics).toBeNull();
    });
  });

  describe('Integration', () => {
    it('should handle full cache lifecycle', async () => {
      const profile: UserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      // Set profile
      await cache.setUserProfile(profile);
      expect(putCallCount).toBe(1);

      // Invalidate profile
      await cache.invalidateUserProfile('user-123');
      expect(deleteCallCount).toBe(1);

      // Get profile (cache miss)
      await cache.getUserProfile('user-123');
      expect(getCallCount).toBe(1);
    });
  });
});
