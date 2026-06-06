/**
 * Authentication Cache Module
 *
 * Provides caching for user profiles and performance monitoring for auth operations.
 * Session caching is handled by Better Auth's secondaryStorage in server.ts.
 *
 * This module implements:
 * - User profile caching in KV with TTL
 * - Cache invalidation on profile updates
 * - Performance monitoring (cache hit/miss rates, query latency)
 */

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface CacheOptions {
  kv?: KVNamespace;
  profileCacheTTL?: number; // seconds
  enableMonitoring?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Default configuration
const DEFAULT_PROFILE_CACHE_TTL = 300; // 5 minutes
const MIN_KV_TTL = 60; // KV requires minimum 60 seconds

/**
 * Cache statistics tracker
 */
class CacheMonitor {
  private hits = 0;
  private misses = 0;
  private latencies: number[] = [];
  private maxLatencySamples = 100;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  recordLatency(durationMs: number): void {
    this.latencies.push(durationMs);
    if (this.latencies.length > this.maxLatencySamples) {
      this.latencies.shift();
    }
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return sum / this.latencies.length;
  }

  getP95Latency(): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.latencies = [];
  }
}

/**
 * Configure authentication cache
 */
export function configureAuthCache(options: CacheOptions = {}) {
  const {
    kv,
    profileCacheTTL = DEFAULT_PROFILE_CACHE_TTL,
    enableMonitoring = true,
  } = options;

  const monitor = enableMonitoring ? new CacheMonitor() : null;
  const effectiveTTL = Math.max(profileCacheTTL, MIN_KV_TTL);

  return {
    /**
     * Get user profile from cache
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
      const startTime = Date.now();

      if (!kv) {
        if (monitor) monitor.recordMiss();
        return null;
      }

      try {
        const key = `user_profile:${userId}`;
        const cached = await kv.get(key);

        if (cached) {
          if (monitor) {
            monitor.recordHit();
            monitor.recordLatency(Date.now() - startTime);
          }
          return JSON.parse(cached) as UserProfile;
        }

        if (monitor) {
          monitor.recordMiss();
          monitor.recordLatency(Date.now() - startTime);
        }
        return null;
      } catch (error) {
        console.error('Failed to get user profile from cache:', error);
        if (monitor) monitor.recordMiss();
        return null;
      }
    },

    /**
     * Set user profile in cache
     */
    async setUserProfile(profile: UserProfile): Promise<void> {
      if (!kv) {
        console.warn('KV not available - user profile will not be cached');
        return;
      }

      try {
        const key = `user_profile:${profile.id}`;
        await kv.put(key, JSON.stringify(profile), {
          expirationTtl: effectiveTTL,
        });
      } catch (error) {
        console.error('Failed to set user profile in cache:', error);
      }
    },

    /**
     * Invalidate user profile cache
     */
    async invalidateUserProfile(userId: string): Promise<void> {
      if (!kv) return;

      try {
        const key = `user_profile:${userId}`;
        await kv.delete(key);
      } catch (error) {
        console.error('Failed to invalidate user profile cache:', error);
      }
    },

    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats | null {
      return monitor ? monitor.getStats() : null;
    },

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): {
      averageLatency: number;
      p95Latency: number;
    } | null {
      if (!monitor) return null;
      return {
        averageLatency: monitor.getAverageLatency(),
        p95Latency: monitor.getP95Latency(),
      };
    },

    /**
     * Reset cache statistics
     */
    resetStats(): void {
      monitor?.reset();
    },
  };
}

export type { CacheOptions, CacheStats, UserProfile };
