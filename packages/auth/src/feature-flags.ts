/**
 * Feature Flags Module
 *
 * Provides feature flag integration for authentication features using Cloudflare Flagship.
 * Supports gradual rollouts, A/B testing, and instant rollback capabilities.
 *
 * This module implements:
 * - Feature flag evaluation with typed accessors
 * - Gradual rollout support (percentage-based, user segments)
 * - Rollback mechanism (instant flag disable)
 * - Monitoring integration (flag usage tracking)
 *
 * Integration with Cloudflare Flagship:
 * - Uses Worker binding for sub-millisecond flag evaluation
 * - No outbound HTTP calls - flags evaluated at the edge
 * - Supports targeting rules and percentage rollouts
 */

/**
 * Feature flag keys for authentication features
 */
export const AUTH_FEATURE_FLAGS = {
  // Email/Password authentication
  EMAIL_PASSWORD_ENABLED: 'auth-email-password-enabled',
  
  // Social providers
  GOOGLE_ENABLED: 'auth-google-enabled',
  GITHUB_ENABLED: 'auth-github-enabled',
  
  // Magic links
  MAGIC_LINK_ENABLED: 'auth-magic-link-enabled',
  
  // OTP (email/SMS)
  OTP_ENABLED: 'auth-otp-enabled',
  OTP_SMS_ENABLED: 'auth-otp-sms-enabled',
  
  // Passkeys
  PASSKEY_ENABLED: 'auth-passkey-enabled',
  
  // Multi-factor authentication
  MFA_ENABLED: 'auth-mfa-enabled',
  MFA_REQUIRED: 'auth-mfa-required',
  
  // Session management
  SESSION_COOKIE_CACHE_ENABLED: 'auth-session-cookie-cache-enabled',
  
  // Rate limiting
  RATE_LIMITING_ENABLED: 'auth-rate-limiting-enabled',
  
  // Account recovery
  ACCOUNT_RECOVERY_ENABLED: 'auth-account-recovery-enabled',
  
  // New features (canary releases)
  NEW_LOGIN_FLOW: 'auth-new-login-flow',
  NEW_PASSWORD_POLICY: 'auth-new-password-policy',
} as const;

export type AuthFeatureFlagKey = typeof AUTH_FEATURE_FLAGS[keyof typeof AUTH_FEATURE_FLAGS];

/**
 * Flag evaluation context
 * Provides user and request context for targeting rules
 */
export interface FlagContext {
  userId?: string;
  email?: string;
  plan?: string;
  region?: string;
  userAgent?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Flag evaluation details
 * Provides detailed information about flag evaluation
 */
export interface FlagEvaluationDetails<T> {
  value: T;
  variant?: string;
  reason: string;
  flagKey: string;
}

/**
 * Flagship binding interface
 * This matches Cloudflare Flagship's Worker binding API
 */
export interface FlagshipBinding {
  getBooleanValue(
    flagKey: string,
    defaultValue: boolean,
    context?: FlagContext
  ): Promise<boolean>;
  
  getStringValue(
    flagKey: string,
    defaultValue: string,
    context?: FlagContext
  ): Promise<string>;
  
  getNumberValue(
    flagKey: string,
    defaultValue: number,
    context?: FlagContext
  ): Promise<number>;
  
  getObjectValue<T>(
    flagKey: string,
    defaultValue: T,
    context?: FlagContext
  ): Promise<T>;
  
  getBooleanDetails(
    flagKey: string,
    defaultValue: boolean,
    context?: FlagContext
  ): Promise<FlagEvaluationDetails<boolean>>;
  
  getStringDetails(
    flagKey: string,
    defaultValue: string,
    context?: FlagContext
  ): Promise<FlagEvaluationDetails<string>>;
  
  getNumberDetails(
    flagKey: string,
    defaultValue: number,
    context?: FlagContext
  ): Promise<FlagEvaluationDetails<number>>;
  
  getObjectDetails<T>(
    flagKey: string,
    defaultValue: T,
    context?: FlagContext
  ): Promise<FlagEvaluationDetails<T>>;
}

/**
 * Feature flags configuration
 */
export interface FeatureFlagsConfig {
  flagship?: FlagshipBinding;
  enableMonitoring?: boolean;
}

/**
 * Flag usage statistics for monitoring
 */
interface FlagUsageStats {
  flagKey: string;
  enabled: boolean;
  variant: string | undefined;
  timestamp: number;
  userId: string | undefined;
}

/**
 * In-memory flag usage tracker (for monitoring)
 * In production, this would be sent to an analytics service
 */
class FlagUsageTracker {
  private stats: FlagUsageStats[] = [];
  private maxStats = 1000;

  recordUsage(stats: FlagUsageStats): void {
    this.stats.push(stats);
    if (this.stats.length > this.maxStats) {
      this.stats.shift();
    }
  }

  getStats(): FlagUsageStats[] {
    return [...this.stats];
  }

  getStatsByFlag(flagKey: string): FlagUsageStats[] {
    return this.stats.filter((s) => s.flagKey === flagKey);
  }

  clear(): void {
    this.stats = [];
  }
}

/**
 * Configure feature flags
 * 
 * @param config - Feature flags configuration
 * @returns Feature flags API
 * 
 * @example
 * ```ts
 * const flags = configureFeatureFlags({ flagship: env.FLAGS });
 * 
 * // Simple boolean check
 * const emailPasswordEnabled = await flags.isEnabled(
 *   AUTH_FEATURE_FLAGS.EMAIL_PASSWORD_ENABLED,
 *   { userId: 'user-123' }
 * );
 * 
 * // With details
 * const details = await flags.getBooleanDetails(
 *   AUTH_FEATURE_FLAGS.NEW_LOGIN_FLOW,
 *   false,
 *   { userId: 'user-123', plan: 'enterprise' }
 * );
 * ```
 */
export function configureFeatureFlags(config: FeatureFlagsConfig = {}) {
  const { flagship, enableMonitoring = false } = config;
  const tracker = enableMonitoring ? new FlagUsageTracker() : null;

  return {
    /**
     * Check if a feature flag is enabled
     * 
     * @param flagKey - The feature flag key
     * @param context - Optional context for targeting rules
     * @returns Whether the flag is enabled
     */
    async isEnabled(
      flagKey: AuthFeatureFlagKey,
      context?: FlagContext
    ): Promise<boolean> {
      if (!flagship) {
        // Default to true if no Flagship binding (development mode)
        return true;
      }

      const defaultValue = true;
      const value = await flagship.getBooleanValue(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: value,
          variant: undefined,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return value;
    },

    /**
     * Get boolean flag value
     */
    async getBooleanValue(
      flagKey: AuthFeatureFlagKey,
      defaultValue: boolean,
      context?: FlagContext
    ): Promise<boolean> {
      if (!flagship) {
        return defaultValue;
      }

      const value = await flagship.getBooleanValue(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: value,
          variant: undefined,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return value;
    },

    /**
     * Get string flag value
     */
    async getStringValue(
      flagKey: AuthFeatureFlagKey,
      defaultValue: string,
      context?: FlagContext
    ): Promise<string> {
      if (!flagship) {
        return defaultValue;
      }

      const value = await flagship.getStringValue(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: true,
          variant: undefined,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return value;
    },

    /**
     * Get number flag value
     */
    async getNumberValue(
      flagKey: AuthFeatureFlagKey,
      defaultValue: number,
      context?: FlagContext
    ): Promise<number> {
      if (!flagship) {
        return defaultValue;
      }

      const value = await flagship.getNumberValue(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: true,
          variant: undefined,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return value;
    },

    /**
     * Get object flag value
     */
    async getObjectValue<T>(
      flagKey: AuthFeatureFlagKey,
      defaultValue: T,
      context?: FlagContext
    ): Promise<T> {
      if (!flagship) {
        return defaultValue;
      }

      const value = await flagship.getObjectValue<T>(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: true,
          variant: undefined,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return value;
    },

    /**
     * Get boolean flag evaluation details
     */
    async getBooleanDetails(
      flagKey: AuthFeatureFlagKey,
      defaultValue: boolean,
      context?: FlagContext
    ): Promise<FlagEvaluationDetails<boolean>> {
      if (!flagship) {
        return {
          value: defaultValue,
          reason: 'NO_FLAGSHIP_BINDING',
          flagKey,
        };
      }

      const details = await flagship.getBooleanDetails(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: details.value,
          variant: details.variant,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return details;
    },

    /**
     * Get string flag evaluation details
     */
    async getStringDetails(
      flagKey: AuthFeatureFlagKey,
      defaultValue: string,
      context?: FlagContext
    ): Promise<FlagEvaluationDetails<string>> {
      if (!flagship) {
        return {
          value: defaultValue,
          reason: 'NO_FLAGSHIP_BINDING',
          flagKey,
        };
      }

      const details = await flagship.getStringDetails(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: true,
          variant: details.variant,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return details;
    },

    /**
     * Get number flag evaluation details
     */
    async getNumberDetails(
      flagKey: AuthFeatureFlagKey,
      defaultValue: number,
      context?: FlagContext
    ): Promise<FlagEvaluationDetails<number>> {
      if (!flagship) {
        return {
          value: defaultValue,
          reason: 'NO_FLAGSHIP_BINDING',
          flagKey,
        };
      }

      const details = await flagship.getNumberDetails(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: true,
          variant: details.variant,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return details;
    },

    /**
     * Get object flag evaluation details
     */
    async getObjectDetails<T>(
      flagKey: AuthFeatureFlagKey,
      defaultValue: T,
      context?: FlagContext
    ): Promise<FlagEvaluationDetails<T>> {
      if (!flagship) {
        return {
          value: defaultValue,
          reason: 'NO_FLAGSHIP_BINDING',
          flagKey,
        };
      }

      const details = await flagship.getObjectDetails<T>(flagKey, defaultValue, context);

      if (tracker) {
        tracker.recordUsage({
          flagKey,
          enabled: true,
          variant: details.variant,
          timestamp: Date.now(),
          userId: context?.userId,
        });
      }

      return details;
    },

    /**
     * Get flag usage statistics
     */
    getUsageStats(): FlagUsageStats[] | null {
      return tracker?.getStats() ?? null;
    },

    /**
     * Get usage statistics for a specific flag
     */
    getUsageStatsByFlag(flagKey: string): FlagUsageStats[] | null {
      return tracker?.getStatsByFlag(flagKey) ?? null;
    },

    /**
     * Clear usage statistics
     */
    clearUsageStats(): void {
      tracker?.clear();
    },
  };
}

/**
 * Convenience function to check if a feature is enabled
 * Uses a singleton instance if available, otherwise returns true (development mode)
 */
let defaultFlags: ReturnType<typeof configureFeatureFlags> | null = null;

export function isFeatureEnabled(
  flagKey: AuthFeatureFlagKey,
  context?: FlagContext
): Promise<boolean> {
  if (!defaultFlags) {
    defaultFlags = configureFeatureFlags();
  }
  return defaultFlags.isEnabled(flagKey, context);
}

/**
 * Set the default feature flags instance
 */
export function setDefaultFlags(flags: ReturnType<typeof configureFeatureFlags>): void {
  defaultFlags = flags;
}
