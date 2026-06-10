/**
 * Circuit breaker pattern for preventing cascading failures
 * 
 * Implements a state machine with three states:
 * - Closed: Normal operation, requests pass through
 * - Open: Circuit is open, requests fail immediately
 * - Half-Open: Limited requests allowed to test if service has recovered
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration options
 */
export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before opening the circuit
   * @default 5
   */
  failureThreshold?: number;

  /**
   * Number of successful requests in half-open state to close the circuit
   * @default 2
   */
  successThreshold?: number;

  /**
   * Time in milliseconds to wait before transitioning from OPEN to HALF_OPEN
   * @default 60000 (1 minute)
   */
  resetTimeoutMs?: number;

  /**
   * Time window in milliseconds to track failures (sliding window)
   * @default 10000 (10 seconds)
   */
  timeoutMs?: number;

  /**
   * Callback called when circuit state changes
   */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Circuit breaker result
 */
export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  state: CircuitState;
}

/**
 * Circuit breaker class
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly timeoutMs: number;
  private readonly onStateChange: ((from: CircuitState, to: CircuitState) => void) | undefined;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 60000;
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Get the current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get the current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Get the current success count (in half-open state)
   */
  getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Execute a function through the circuit breaker
   * 
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws Error if circuit is open or function fails
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - requests are blocked');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if enough time has passed to attempt a reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.nextAttemptTime) {
      return false;
    }
    return Date.now() >= this.nextAttemptTime;
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state immediately opens the circuit
      this.transitionTo(CircuitState.OPEN);
      this.successCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      // Check if failure threshold is exceeded
      if (this.failureCount >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
        this.nextAttemptTime = Date.now() + this.resetTimeoutMs;
      }
    }
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.onStateChange?.(oldState, newState);
    }
  }

  /**
   * Reset the circuit breaker to CLOSED state
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    // lastFailureTime and nextAttemptTime remain undefined
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ?? null,
      nextAttemptTime: this.nextAttemptTime ?? null,
    };
  }
}

/**
 * Create a circuit breaker wrapper for a function
 * 
 * @param fn - Function to wrap
 * @param options - Circuit breaker configuration options
 * @returns Wrapped function with circuit breaker protection
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: CircuitBreakerOptions = {}
): T {
  const circuitBreaker = new CircuitBreaker(options);

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return circuitBreaker.execute(() => fn(...args)) as ReturnType<T>;
  }) as T;
}
