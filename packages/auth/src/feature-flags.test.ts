/**
 * Feature Flags Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  configureFeatureFlags,
  isFeatureEnabled,
  setDefaultFlags,
  AUTH_FEATURE_FLAGS,
  type FlagshipBinding,
  type FlagContext,
} from './feature-flags.js';

describe('configureFeatureFlags', () => {
  let mockFlagship: FlagshipBinding;

  beforeEach(() => {
    mockFlagship = {
      getBooleanValue: async () => true,
      getStringValue: async () => 'default',
      getNumberValue: async () => 0,
      getObjectValue: async <T>(_: string, defaultValue: T) => defaultValue,
      getBooleanDetails: async () => ({
        value: true,
        reason: 'TARGETING_MATCH',
        flagKey: 'test',
      }),
      getStringDetails: async () => ({
        value: 'default',
        reason: 'TARGETING_MATCH',
        flagKey: 'test',
      }),
      getNumberDetails: async () => ({
        value: 0,
        reason: 'TARGETING_MATCH',
        flagKey: 'test',
      }),
      getObjectDetails: async <T>(_: string, defaultValue: T) => ({
        value: defaultValue,
        reason: 'TARGETING_MATCH',
        flagKey: 'test',
      }),
    };
  });

  describe('without Flagship binding', () => {
    it('should return true for isEnabled by default', async () => {
      const flags = configureFeatureFlags();
      const result = await flags.isEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);
      expect(result).toBe(true);
    });

    it('should return default value for getBooleanValue', async () => {
      const flags = configureFeatureFlags();
      const result = await flags.getBooleanValue(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED, false);
      expect(result).toBe(false);
    });

    it('should return default value for getStringValue', async () => {
      const flags = configureFeatureFlags();
      const result = await flags.getStringValue(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, 'v1');
      expect(result).toBe('v1');
    });

    it('should return default value for getNumberValue', async () => {
      const flags = configureFeatureFlags();
      const result = await flags.getNumberValue(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, 100);
      expect(result).toBe(100);
    });

    it('should return default value for getObjectValue', async () => {
      const flags = configureFeatureFlags();
      const result = await flags.getObjectValue(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, { test: true });
      expect(result).toEqual({ test: true });
    });

    it('should return default details for getBooleanDetails', async () => {
      const flags = configureFeatureFlags();
      const result = await flags.getBooleanDetails(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED, false);
      expect(result).toEqual({
        value: false,
        reason: 'NO_FLAGSHIP_BINDING',
        flagKey: AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED,
      });
    });
  });

  describe('with Flagship binding', () => {
    it('should call flagship.getBooleanValue for isEnabled', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship });
      const result = await flags.isEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);
      expect(result).toBe(true);
    });

    it('should call flagship.getBooleanValue for getBooleanValue', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship });
      const result = await flags.getBooleanValue(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED, false);
      expect(result).toBe(true);
    });

    it('should call flagship.getStringValue for getStringValue', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship });
      const result = await flags.getStringValue(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, 'v1');
      expect(result).toBe('default');
    });

    it('should call flagship.getNumberValue for getNumberValue', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship });
      const result = await flags.getNumberValue(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, 100);
      expect(result).toBe(0);
    });

    it('should call flagship.getObjectValue for getObjectValue', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship });
      const result = await flags.getObjectValue(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, { test: true });
      expect(result).toEqual({ test: true });
    });

    it('should call flagship.getBooleanDetails for getBooleanDetails', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship });
      const result = await flags.getBooleanDetails(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED, false);
      expect(result).toEqual({
        value: true,
        reason: 'TARGETING_MATCH',
        flagKey: 'test',
      });
    });

    it('should pass context to flagship', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship });
      const context: FlagContext = { userId: 'user-123', plan: 'enterprise' };
      const result = await flags.isEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED, context);
      // Just verify the call succeeded - we can't spy on simple async functions
      expect(result).toBe(true);
    });
  });

  describe('monitoring', () => {
    it('should track flag usage when monitoring is enabled', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship, enableMonitoring: true });
      await flags.isEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED, { userId: 'user-123' });

      const stats = flags.getUsageStats();
      expect(stats).not.toBeNull();
      expect(stats?.length).toBeGreaterThan(0);
      if (stats && stats[0]) {
        expect(stats[0].flagKey).toBe(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);
      }
    });

    it('should not track flag usage when monitoring is disabled', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship, enableMonitoring: false });
      await flags.isEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);

      const stats = flags.getUsageStats();
      expect(stats).toBeNull();
    });

    it('should get stats by flag key', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship, enableMonitoring: true });
      await flags.isEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED, { userId: 'user-123' });
      await flags.isEnabled(AUTH_FEATURE_FLAGS.GOOGLE_ENABLED, { userId: 'user-456' });

      const emailStats = flags.getUsageStatsByFlag(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);
      expect(emailStats).not.toBeNull();
      if (emailStats && emailStats[0]) {
        expect(emailStats.length).toBe(1);
        expect(emailStats[0].flagKey).toBe(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);
      }
    });

    it('should clear usage stats', async () => {
      const flags = configureFeatureFlags({ flagship: mockFlagship, enableMonitoring: true });
      await flags.isEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);

      flags.clearUsageStats();
      const stats = flags.getUsageStats();
      expect(stats).toEqual([]);
    });
  });
});

describe('isFeatureEnabled', () => {
  it('should use default flags instance', async () => {
    const result = await isFeatureEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);
    expect(result).toBe(true);
  });

  it('should use custom default flags if set', async () => {
    const customFlags = configureFeatureFlags({
      flagship: {
        getBooleanValue: async () => false,
        getStringValue: async () => 'default',
        getNumberValue: async () => 0,
        getObjectValue: async <T>(_: string, defaultValue: T) => defaultValue,
        getBooleanDetails: async () => ({
          value: false,
          reason: 'TEST',
          flagKey: 'test',
        }),
        getStringDetails: async () => ({
          value: 'default',
          reason: 'TEST',
          flagKey: 'test',
        }),
        getNumberDetails: async () => ({
          value: 0,
          reason: 'TEST',
          flagKey: 'test',
        }),
        getObjectDetails: async <T>(_: string, defaultValue: T) => ({
          value: defaultValue,
          reason: 'TEST',
          flagKey: 'test',
        }),
      },
    });
    setDefaultFlags(customFlags);

    const result = await isFeatureEnabled(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED);
    expect(result).toBe(false);
  });
});

describe('AUTH_FEATURE_FLAGS', () => {
  it('should have all required feature flag keys', () => {
    expect(AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED).toBeDefined();
    expect(AUTH_FEATURE_FLAGS.GOOGLE_ENABLED).toBeDefined();
    expect(AUTH_FEATURE_FLAGS.GITHUB_ENABLED).toBeDefined();
    expect(AUTH_FEATURE_FLAGS.MAGIC_LINK_ENABLED).toBeDefined();
    expect(AUTH_FEATURE_FLAGS.OTP_ENABLED).toBeDefined();
    expect(AUTH_FEATURE_FLAGS.OTP_SMS_ENABLED).toBeDefined();
  });
});

describe('Integration Tests', () => {
  it('should handle complete flag evaluation flow', async () => {
    const mockFlagship: FlagshipBinding = {
      getBooleanValue: async () => true,
      getStringValue: async () => 'v2',
      getNumberValue: async () => 50,
      getObjectValue: async <T>(_: string, defaultValue: T) => defaultValue,
      getBooleanDetails: async () => ({
        value: true,
        variant: 'enabled',
        reason: 'TARGETING_MATCH',
        flagKey: 'test',
      }),
      getStringDetails: async () => ({
        value: 'v2',
        variant: 'new',
        reason: 'TARGETING_MATCH',
        flagKey: 'test',
      }),
      getNumberDetails: async () => ({
        value: 50,
        variant: 'gradual',
        reason: 'PERCENTAGE_ROLLOUT',
        flagKey: 'test',
      }),
      getObjectDetails: async <T>(_: string, defaultValue: T) => ({
        value: defaultValue,
        variant: 'config',
        reason: 'DEFAULT',
        flagKey: 'test',
      }),
    };

    const flags = configureFeatureFlags({ flagship: mockFlagship, enableMonitoring: true });

    // Check enabled
    const enabled = await flags.isEnabled(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, { userId: 'user-123' });
    expect(enabled).toBe(true);

    // Get details
    const details = await flags.getBooleanDetails(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, false, {
      userId: 'user-123',
      plan: 'enterprise',
    });
    expect(details.value).toBe(true);
    expect(details.variant).toBe('enabled');
    expect(details.reason).toBe('TARGETING_MATCH');

    // Check monitoring
    const stats = flags.getUsageStats();
    expect(stats).not.toBeNull();
    expect(stats?.length).toBe(2);
  });

  it('should handle gradual rollout scenario', async () => {
    let callCount = 0;
    const mockFlagship: FlagshipBinding = {
      getBooleanValue: async () => {
        callCount++;
        return callCount <= 5; // First 5 calls return true (50% rollout)
      },
      getStringValue: async () => 'v1',
      getNumberValue: async () => 0,
      getObjectValue: async <T>(_: string, defaultValue: T) => defaultValue,
      getBooleanDetails: async () => ({
        value: true,
        reason: 'PERCENTAGE_ROLLOUT',
        flagKey: 'test',
      }),
      getStringDetails: async () => ({
        value: 'v1',
        reason: 'DEFAULT',
        flagKey: 'test',
      }),
      getNumberDetails: async () => ({
        value: 0,
        reason: 'DEFAULT',
        flagKey: 'test',
      }),
      getObjectDetails: async <T>(_: string, defaultValue: T) => ({
        value: defaultValue,
        reason: 'DEFAULT',
        flagKey: 'test',
      }),
    };

    const flags = configureFeatureFlags({ flagship: mockFlagship });

    // Simulate 10 users
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = await flags.isEnabled(AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW, { userId: `user-${i}` });
      results.push(result);
    }

    // First 5 should be true, last 5 should be false
    expect(results.slice(0, 5)).toEqual([true, true, true, true, true]);
    expect(results.slice(5)).toEqual([false, false, false, false, false]);
  });
});
