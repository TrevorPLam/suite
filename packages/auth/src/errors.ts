/**
 * Authentication Error Handling Module
 *
 * Provides centralized error handling for authentication operations.
 * Balances security (preventing user enumeration) with UX (helpful error messages).
 *
 * Security Principles:
 * - Generic error messages prevent user enumeration
 * - Specific errors only allowed when CAPTCHA is solved
 * - Consistent response times prevent timing attacks
 * - Proper HTTP status codes for error classification
 *
 * This module implements:
 * - Generic error messages for auth failures
 * - Specific errors with CAPTCHA verification
 * - Proper HTTP status code mapping
 * - Error code constants for consistent error handling
 */

/**
 * Authentication error codes
 * Use these constants for consistent error handling across the application
 */
export const AUTH_ERROR_CODES = {
  // Generic auth errors (always safe to return)
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  SESSION_INVALID: 'AUTH_SESSION_INVALID',
  
  // Account status errors (generic message, specific code)
  ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  ACCOUNT_NOT_VERIFIED: 'AUTH_ACCOUNT_NOT_VERIFIED',
  
  // Rate limiting errors
  RATE_LIMITED: 'AUTH_RATE_LIMITED',
  TOO_MANY_ATTEMPTS: 'AUTH_TOO_MANY_ATTEMPTS',
  
  // CAPTCHA errors
  CAPTCHA_FAILED: 'AUTH_CAPTCHA_FAILED',
  CAPTCHA_REQUIRED: 'AUTH_CAPTCHA_REQUIRED',
  
  // Validation errors
  INVALID_EMAIL: 'AUTH_INVALID_EMAIL',
  INVALID_PASSWORD: 'AUTH_INVALID_PASSWORD',
  WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  PASSWORD_MISMATCH: 'AUTH_PASSWORD_MISMATCH',
  
  // Token errors
  INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  
  // Provider errors
  PROVIDER_ERROR: 'AUTH_PROVIDER_ERROR',
  PROVIDER_NOT_CONFIGURED: 'AUTH_PROVIDER_NOT_CONFIGURED',
  
  // Internal errors
  INTERNAL_ERROR: 'AUTH_INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'AUTH_SERVICE_UNAVAILABLE',
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];

/**
 * HTTP status codes for different error types
 */
export const HTTP_STATUS_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Generic error messages (safe to return without CAPTCHA)
 * These prevent user enumeration while providing basic feedback
 */
const GENERIC_MESSAGES = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [AUTH_ERROR_CODES.UNAUTHORIZED]: 'Authentication required',
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: 'Session expired. Please sign in again',
  [AUTH_ERROR_CODES.SESSION_INVALID]: 'Invalid session. Please sign in again',
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 'Account temporarily locked. Please try again later',
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: 'Account disabled. Please contact support',
  [AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED]: 'Account not verified. Please check your email',
  [AUTH_ERROR_CODES.RATE_LIMITED]: 'Too many attempts. Please try again later',
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many failed attempts. Please try again later',
  [AUTH_ERROR_CODES.CAPTCHA_FAILED]: 'CAPTCHA verification failed',
  [AUTH_ERROR_CODES.CAPTCHA_REQUIRED]: 'CAPTCHA verification required',
  [AUTH_ERROR_CODES.INVALID_EMAIL]: 'Invalid email address',
  [AUTH_ERROR_CODES.INVALID_PASSWORD]: 'Invalid password',
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: 'Password does not meet security requirements',
  [AUTH_ERROR_CODES.PASSWORD_MISMATCH]: 'Passwords do not match',
  [AUTH_ERROR_CODES.INVALID_TOKEN]: 'Invalid token',
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 'Token expired',
  [AUTH_ERROR_CODES.PROVIDER_ERROR]: 'Authentication provider error',
  [AUTH_ERROR_CODES.PROVIDER_NOT_CONFIGURED]: 'Authentication provider not configured',
  [AUTH_ERROR_CODES.INTERNAL_ERROR]: 'An error occurred. Please try again',
  [AUTH_ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
} as const;

/**
 * Specific error messages (only return when CAPTCHA is solved)
 * These provide more detail but could enable user enumeration
 */
const SPECIFIC_MESSAGES = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Password incorrect for this email',
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 'Account locked due to too many failed attempts',
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: 'This account has been disabled by an administrator',
  [AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED]: 'Email address not verified. Check your inbox for verification link',
  [AUTH_ERROR_CODES.INVALID_EMAIL]: 'This email address is not registered',
} as const;

/**
 * HTTP status code mapping for error codes
 */
const STATUS_CODE_MAP: Record<AuthErrorCode, number> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: HTTP_STATUS_CODES.UNAUTHORIZED,
  [AUTH_ERROR_CODES.UNAUTHORIZED]: HTTP_STATUS_CODES.UNAUTHORIZED,
  [AUTH_ERROR_CODES.SESSION_EXPIRED]: HTTP_STATUS_CODES.UNAUTHORIZED,
  [AUTH_ERROR_CODES.SESSION_INVALID]: HTTP_STATUS_CODES.UNAUTHORIZED,
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: HTTP_STATUS_CODES.FORBIDDEN,
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: HTTP_STATUS_CODES.FORBIDDEN,
  [AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED]: HTTP_STATUS_CODES.FORBIDDEN,
  [AUTH_ERROR_CODES.RATE_LIMITED]: HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
  [AUTH_ERROR_CODES.CAPTCHA_FAILED]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.CAPTCHA_REQUIRED]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.INVALID_EMAIL]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.INVALID_PASSWORD]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.PASSWORD_MISMATCH]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.INVALID_TOKEN]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: HTTP_STATUS_CODES.BAD_REQUEST,
  [AUTH_ERROR_CODES.PROVIDER_ERROR]: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  [AUTH_ERROR_CODES.PROVIDER_NOT_CONFIGURED]: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  [AUTH_ERROR_CODES.INTERNAL_ERROR]: HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
  [AUTH_ERROR_CODES.SERVICE_UNAVAILABLE]: HTTP_STATUS_CODES.SERVICE_UNAVAILABLE,
};

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
  captchaSolved?: boolean; // Whether CAPTCHA has been solved
  useSpecificMessage?: boolean; // Force specific message (only use with CAPTCHA)
}

/**
 * Auth error response
 */
export interface AuthErrorResponse {
  code: AuthErrorCode;
  message: string;
  statusCode: number;
  isSpecific: boolean; // Whether this is a specific error message
}

/**
 * Handle authentication error
 * 
 * @param errorCode - The authentication error code
 * @param options - Error handling options
 * @returns Auth error response with appropriate message and status code
 * 
 * @example
 * ```ts
 * // Generic error (prevents enumeration)
 * const error = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
 * // Returns: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password', statusCode: 401, isSpecific: false }
 * 
 * // Specific error (with CAPTCHA solved)
 * const error = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, { captchaSolved: true });
 * // Returns: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Password incorrect for this email', statusCode: 401, isSpecific: true }
 * ```
 */
export function handleAuthError(
  errorCode: AuthErrorCode,
  options: ErrorHandlingOptions = {}
): AuthErrorResponse {
  const { captchaSolved = false, useSpecificMessage = false } = options;
  
  // Determine if we should use specific message
  // Only use specific message if:
  // 1. CAPTCHA is solved, OR
  // 2. Explicitly requested (for internal use only)
  const allowSpecific = captchaSolved || useSpecificMessage;
  const hasSpecificMessage = errorCode in SPECIFIC_MESSAGES;
  const useSpecific = allowSpecific && hasSpecificMessage;
  
  // Get appropriate message
  const message = useSpecific
    ? SPECIFIC_MESSAGES[errorCode as keyof typeof SPECIFIC_MESSAGES]
    : GENERIC_MESSAGES[errorCode];
  
  // Get HTTP status code
  const statusCode = STATUS_CODE_MAP[errorCode];
  
  return {
    code: errorCode,
    message,
    statusCode,
    isSpecific: useSpecific,
  };
}

/**
 * Create a standardized error response for HTTP responses
 * 
 * @param errorCode - The authentication error code
 * @param options - Error handling options
 * @returns Object suitable for JSON response
 */
export function createErrorResponse(
  errorCode: AuthErrorCode,
  options: ErrorHandlingOptions = {}
): { error: string; code: string } {
  const response = handleAuthError(errorCode, options);
  return {
    error: response.message,
    code: response.code,
  };
}

/**
 * Check if an error code allows specific messages
 * 
 * @param errorCode - The authentication error code
 * @returns Whether this error code has a specific message variant
 */
export function hasSpecificMessage(errorCode: AuthErrorCode): boolean {
  return errorCode in SPECIFIC_MESSAGES;
}

/**
 * Get HTTP status code for an error code
 * 
 * @param errorCode - The authentication error code
 * @returns HTTP status code
 */
export function getStatusCode(errorCode: AuthErrorCode): number {
  return STATUS_CODE_MAP[errorCode];
}
