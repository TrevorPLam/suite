/**
 * Circuit Breaker Pattern Implementation
 * 
 * Protects against cascading failures by stopping calls to failing services.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through, failures are tracked
 * - OPEN: Circuit is tripped, requests fail immediately without calling service
 * - HALF_OPEN: Testing phase, limited requests allowed to test if service recovered
 * 
 * Note: In Cloudflare Workers, this is in-memory and doesn't persist across requests.
 * Each Worker instance maintains its own state. This provides protection against burst
 * failures within a single instance's lifecycle.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit */
  failureThreshold: number;
  /** Time in milliseconds to stay open before attempting recovery */
  timeoutMs: number;
  /** Number of successful requests in half-open before closing circuit */
  successThreshold: number;
  /** Optional fallback function to call when circuit is open */
  fallback?: () => unknown;
  /** Optional logger for state changes */
  logger?: (message: string, data?: Record<string, unknown>) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastStateChange?: number;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly state: CircuitState) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private lastStateChange?: number;

  constructor(private config: CircuitBreakerConfig) {
    this.log('CircuitBreaker initialized', { config });
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.logger) {
      this.config.logger(message, data);
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    this.log('Circuit state changed', { from: oldState, to: newState });
  }

  private shouldAttemptReset(): boolean {
    if (this.state !== 'OPEN' || !this.lastFailureTime) {
      return false;
    }
    const timeSinceFailure = Date.now() - this.lastFailureTime;
    return timeSinceFailure >= this.config.timeoutMs;
  }

  private resetInternal(): void {
    this.failureCount = 0;
    this.successCount = 0;
    delete this.lastFailureTime;
    this.transitionTo('CLOSED');
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
      this.log('Circuit opened due to failure threshold', {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
      });
    }
  }

  private recordSuccess(): void {
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      if (this.successCount >= this.config.successThreshold) {
        this.resetInternal();
        this.log('Circuit closed after successful recovery', {
          successCount: this.successCount,
          threshold: this.config.successThreshold,
        });
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Execute a function through the circuit breaker
   * @param fn The function to execute
   * @returns The result of the function or fallback value
   * @throws CircuitBreakerError if circuit is open and no fallback provided
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should attempt reset from open to half-open
    if (this.state === 'OPEN' && this.shouldAttemptReset()) {
      this.transitionTo('HALF_OPEN');
      this.successCount = 0;
    }

    // If circuit is open, fail fast or use fallback
    if (this.state === 'OPEN') {
      if (this.config.fallback) {
        this.log('Circuit open, using fallback');
        return this.config.fallback() as T;
      }
      throw new CircuitBreakerError(
        'Circuit breaker is open - service unavailable',
        this.state
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const stats: CircuitBreakerStats = {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
    if (this.lastFailureTime !== undefined) {
      stats.lastFailureTime = this.lastFailureTime;
    }
    if (this.lastStateChange !== undefined) {
      stats.lastStateChange = this.lastStateChange;
    }
    return stats;
  }

  /**
   * Manually reset the circuit breaker to closed state
   */
  reset(): void {
    this.resetInternal();
  }

  /**
   * Manually open the circuit breaker
   */
  open(): void {
    this.transitionTo('OPEN');
    this.lastFailureTime = Date.now();
  }
}

/**
 * Create a circuit breaker with default configuration
 */
export function createCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  const defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeoutMs: 30000, // 30 seconds
    successThreshold: 2,
  };

  return new CircuitBreaker({ ...defaultConfig, ...config });
}
