/**
 * Error Handling Module Tests
 */

import { describe, it, expect } from 'vitest';
import {
  handleAuthError,
  createErrorResponse,
  hasSpecificMessage,
  getStatusCode,
  AUTH_ERROR_CODES,
  HTTP_STATUS_CODES,
  type AuthErrorCode,
} from './errors.js';

describe('handleAuthError', () => {
  it('should return generic error message by default', () => {
    const error = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);

    expect(error.code).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    expect(error.message).toBe('Invalid email or password');
    expect(error.statusCode).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    expect(error.isSpecific).toBe(false);
  });

  it('should return specific error message when CAPTCHA is solved', () => {
    const error = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, {
      captchaSolved: true,
    });

    expect(error.code).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    expect(error.message).toBe('Password incorrect for this email');
    expect(error.statusCode).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    expect(error.isSpecific).toBe(true);
  });

  it('should return generic message when CAPTCHA is solved but no specific message exists', () => {
    const error = handleAuthError(AUTH_ERROR_CODES.UNAUTHORIZED, {
      captchaSolved: true,
    });

    expect(error.code).toBe(AUTH_ERROR_CODES.UNAUTHORIZED);
    expect(error.message).toBe('Authentication required');
    expect(error.isSpecific).toBe(false);
  });

  it('should return specific message when useSpecificMessage is true', () => {
    const error = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, {
      useSpecificMessage: true,
    });

    expect(error.message).toBe('Password incorrect for this email');
    expect(error.isSpecific).toBe(true);
  });

  it('should return correct HTTP status code for each error', () => {
    const invalidCredentials = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    expect(invalidCredentials.statusCode).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);

    const accountLocked = handleAuthError(AUTH_ERROR_CODES.ACCOUNT_LOCKED);
    expect(accountLocked.statusCode).toBe(HTTP_STATUS_CODES.FORBIDDEN);

    const rateLimited = handleAuthError(AUTH_ERROR_CODES.RATE_LIMITED);
    expect(rateLimited.statusCode).toBe(HTTP_STATUS_CODES.TOO_MANY_REQUESTS);

    const invalidEmail = handleAuthError(AUTH_ERROR_CODES.INVALID_EMAIL);
    expect(invalidEmail.statusCode).toBe(HTTP_STATUS_CODES.BAD_REQUEST);

    const internalError = handleAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR);
    expect(internalError.statusCode).toBe(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);

    const serviceUnavailable = handleAuthError(AUTH_ERROR_CODES.SERVICE_UNAVAILABLE);
    expect(serviceUnavailable.statusCode).toBe(HTTP_STATUS_CODES.SERVICE_UNAVAILABLE);
  });

  it('should handle all error codes', () => {
    const errorCodes = Object.values(AUTH_ERROR_CODES) as AuthErrorCode[];

    errorCodes.forEach((code) => {
      const error = handleAuthError(code);
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('isSpecific');
      expect(typeof error.message).toBe('string');
      expect(typeof error.statusCode).toBe('number');
      expect(typeof error.isSpecific).toBe('boolean');
    });
  });
});

describe('createErrorResponse', () => {
  it('should create error response for HTTP responses', () => {
    const response = createErrorResponse(AUTH_ERROR_CODES.INVALID_CREDENTIALS);

    expect(response).toEqual({
      error: 'Invalid email or password',
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it('should use specific message when CAPTCHA is solved', () => {
    const response = createErrorResponse(AUTH_ERROR_CODES.INVALID_CREDENTIALS, {
      captchaSolved: true,
    });

    expect(response).toEqual({
      error: 'Password incorrect for this email',
      code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    });
  });
});

describe('hasSpecificMessage', () => {
  it('should return true for errors with specific messages', () => {
    expect(hasSpecificMessage(AUTH_ERROR_CODES.INVALID_CREDENTIALS)).toBe(true);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.ACCOUNT_LOCKED)).toBe(true);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.ACCOUNT_DISABLED)).toBe(true);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED)).toBe(true);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.INVALID_EMAIL)).toBe(true);
  });

  it('should return false for errors without specific messages', () => {
    expect(hasSpecificMessage(AUTH_ERROR_CODES.UNAUTHORIZED)).toBe(false);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.SESSION_EXPIRED)).toBe(false);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.RATE_LIMITED)).toBe(false);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.CAPTCHA_FAILED)).toBe(false);
    expect(hasSpecificMessage(AUTH_ERROR_CODES.INTERNAL_ERROR)).toBe(false);
  });
});

describe('getStatusCode', () => {
  it('should return correct status code for each error', () => {
    expect(getStatusCode(AUTH_ERROR_CODES.INVALID_CREDENTIALS)).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    expect(getStatusCode(AUTH_ERROR_CODES.ACCOUNT_LOCKED)).toBe(HTTP_STATUS_CODES.FORBIDDEN);
    expect(getStatusCode(AUTH_ERROR_CODES.RATE_LIMITED)).toBe(HTTP_STATUS_CODES.TOO_MANY_REQUESTS);
    expect(getStatusCode(AUTH_ERROR_CODES.INVALID_EMAIL)).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
    expect(getStatusCode(AUTH_ERROR_CODES.INTERNAL_ERROR)).toBe(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  });
});

describe('Error Code Constants', () => {
  it('should have all required error codes', () => {
    expect(AUTH_ERROR_CODES.INVALID_CREDENTIALS).toBeDefined();
    expect(AUTH_ERROR_CODES.UNAUTHORIZED).toBeDefined();
    expect(AUTH_ERROR_CODES.SESSION_EXPIRED).toBeDefined();
    expect(AUTH_ERROR_CODES.SESSION_INVALID).toBeDefined();
    expect(AUTH_ERROR_CODES.ACCOUNT_LOCKED).toBeDefined();
    expect(AUTH_ERROR_CODES.ACCOUNT_DISABLED).toBeDefined();
    expect(AUTH_ERROR_CODES.ACCOUNT_NOT_VERIFIED).toBeDefined();
    expect(AUTH_ERROR_CODES.RATE_LIMITED).toBeDefined();
    expect(AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS).toBeDefined();
    expect(AUTH_ERROR_CODES.CAPTCHA_FAILED).toBeDefined();
    expect(AUTH_ERROR_CODES.CAPTCHA_REQUIRED).toBeDefined();
    expect(AUTH_ERROR_CODES.INVALID_EMAIL).toBeDefined();
    expect(AUTH_ERROR_CODES.INVALID_PASSWORD).toBeDefined();
    expect(AUTH_ERROR_CODES.WEAK_PASSWORD).toBeDefined();
    expect(AUTH_ERROR_CODES.PASSWORD_MISMATCH).toBeDefined();
    expect(AUTH_ERROR_CODES.INVALID_TOKEN).toBeDefined();
    expect(AUTH_ERROR_CODES.TOKEN_EXPIRED).toBeDefined();
    expect(AUTH_ERROR_CODES.PROVIDER_ERROR).toBeDefined();
    expect(AUTH_ERROR_CODES.PROVIDER_NOT_CONFIGURED).toBeDefined();
    expect(AUTH_ERROR_CODES.INTERNAL_ERROR).toBeDefined();
    expect(AUTH_ERROR_CODES.SERVICE_UNAVAILABLE).toBeDefined();
  });

  it('should have all required HTTP status codes', () => {
    expect(HTTP_STATUS_CODES.BAD_REQUEST).toBe(400);
    expect(HTTP_STATUS_CODES.UNAUTHORIZED).toBe(401);
    expect(HTTP_STATUS_CODES.FORBIDDEN).toBe(403);
    expect(HTTP_STATUS_CODES.NOT_FOUND).toBe(404);
    expect(HTTP_STATUS_CODES.TOO_MANY_REQUESTS).toBe(429);
    expect(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500);
    expect(HTTP_STATUS_CODES.SERVICE_UNAVAILABLE).toBe(503);
  });
});

describe('Security - User Enumeration Prevention', () => {
  it('should return same generic message for different auth failures', () => {
    const invalidCredentials = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    const accountLocked = handleAuthError(AUTH_ERROR_CODES.ACCOUNT_LOCKED);
    const accountDisabled = handleAuthError(AUTH_ERROR_CODES.ACCOUNT_DISABLED);

    // All should return generic messages by default
    expect(invalidCredentials.isSpecific).toBe(false);
    expect(accountLocked.isSpecific).toBe(false);
    expect(accountDisabled.isSpecific).toBe(false);
  });

  it('should only return specific messages when CAPTCHA is solved', () => {
    const withoutCaptcha = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    const withCaptcha = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, {
      captchaSolved: true,
    });

    expect(withoutCaptcha.isSpecific).toBe(false);
    expect(withCaptcha.isSpecific).toBe(true);
    expect(withoutCaptcha.message).not.toBe(withCaptcha.message);
  });
});

describe('Integration Tests', () => {
  it('should handle complete error flow for login failure', () => {
    // First attempt - generic message
    const firstAttempt = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
    expect(firstAttempt.message).toBe('Invalid email or password');
    expect(firstAttempt.isSpecific).toBe(false);

    // After CAPTCHA - specific message
    const afterCaptcha = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, {
      captchaSolved: true,
    });
    expect(afterCaptcha.message).toBe('Password incorrect for this email');
    expect(afterCaptcha.isSpecific).toBe(true);

    // Create HTTP response
    const response = createErrorResponse(AUTH_ERROR_CODES.INVALID_CREDENTIALS, {
      captchaSolved: true,
    });
    expect(response.error).toBe('Password incorrect for this email');
    expect(response.code).toBe(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
  });

  it('should handle account status errors', () => {
    const locked = handleAuthError(AUTH_ERROR_CODES.ACCOUNT_LOCKED);
    expect(locked.statusCode).toBe(HTTP_STATUS_CODES.FORBIDDEN);
    expect(locked.message).toBe('Account temporarily locked. Please try again later');

    const lockedWithCaptcha = handleAuthError(AUTH_ERROR_CODES.ACCOUNT_LOCKED, {
      captchaSolved: true,
    });
    expect(lockedWithCaptcha.message).toBe('Account locked due to too many failed attempts');
  });

  it('should handle rate limiting errors', () => {
    const rateLimited = handleAuthError(AUTH_ERROR_CODES.RATE_LIMITED);
    expect(rateLimited.statusCode).toBe(HTTP_STATUS_CODES.TOO_MANY_REQUESTS);
    expect(rateLimited.message).toBe('Too many attempts. Please try again later');
    expect(rateLimited.isSpecific).toBe(false); // No specific message for rate limiting
  });
});
