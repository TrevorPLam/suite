/**
 * Retry logic with exponential backoff for transient errors
 * 
 * Implements exponential backoff with jitter to prevent retry storms.
 * Only retries transient errors; permanent errors fail fast.
 */

import { isTransientError, getDatabaseErrorCode } from './error-codes.js';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Initial backoff delay in milliseconds
   * @default 100
   */
  initialDelayMs?: number;

  /**
   * Maximum backoff delay in milliseconds
   * @default 8000
   */
  maxDelayMs?: number;

  /**
   * Whether to add jitter to backoff delay
   * @default true
   */
  jitter?: boolean;

  /**
   * Custom function to determine if an error should be retried
   * @default isTransientError
   */
  shouldRetry?: (error: Error | unknown) => boolean;

  /**
   * Callback called before each retry attempt
   */
  onRetry?: (attempt: number, error: Error | unknown, delay: number) => void;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 8000,
  jitter: true,
  shouldRetry: isTransientError,
  onRetry: () => {},
};

/**
 * Calculate exponential backoff delay with optional jitter
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param initialDelayMs - Initial delay in milliseconds
 * @param maxDelayMs - Maximum delay in milliseconds
 * @param jitter - Whether to add jitter
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  jitter: boolean
): number {
  // Exponential backoff: delay = initialDelay * 2^attempt
  const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  
  // Add jitter to prevent retry storms (±25%)
  if (jitter) {
    const jitterAmount = cappedDelay * 0.25;
    const randomJitter = (Math.random() * 2 - 1) * jitterAmount;
    return Math.max(0, Math.round(cappedDelay + randomJitter));
  }
  
  return cappedDelay;
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws Error if all retry attempts fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error should be retried
      if (!opts.shouldRetry(error)) {
        // Permanent error - fail fast
        const errorCode = getDatabaseErrorCode(error);
        throw new Error(
          `Database operation failed with permanent error (${errorCode}): ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // If this was the last attempt, throw the error
      if (attempt === opts.maxAttempts - 1) {
        throw new Error(
          `Database operation failed after ${opts.maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Calculate backoff delay
      const delay = calculateBackoffDelay(attempt, opts.initialDelayMs, opts.maxDelayMs, opts.jitter);
      
      // Call retry callback
      opts.onRetry(attempt + 1, error, delay);

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retry wrapper for a function
 * 
 * @param fn - Function to wrap
 * @param options - Retry configuration options
 * @returns Wrapped function with retry logic
 */
export function withRetry<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return retryWithBackoff(() => fn(...args), options) as ReturnType<T>;
  }) as T;
}
