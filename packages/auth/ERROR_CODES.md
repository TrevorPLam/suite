# Authentication Error Codes

This document describes all authentication error codes used in the Suite application, their meanings, when they occur, and the security rationale for their implementation.

## Overview

The error handling system balances security (preventing user enumeration) with user experience (providing helpful feedback). Generic error messages are used by default to prevent attackers from enumerating valid user accounts. Specific error messages are only returned when CAPTCHA is solved, providing better UX while maintaining security.

## Error Code Categories

### Generic Auth Errors

These errors are always safe to return and do not reveal sensitive information.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Invalid email or password | Password incorrect for this email | User provides incorrect email or password during login |
| `AUTH_UNAUTHORIZED` | 401 | Authentication required | N/A | User attempts to access a protected resource without authentication |
| `AUTH_SESSION_EXPIRED` | 401 | Session expired. Please sign in again | N/A | User's session has expired (TTL reached) |
| `AUTH_SESSION_INVALID` | 401 | Invalid session. Please sign in again | N/A | User's session token is invalid or corrupted |

**Security Rationale:**
- Generic "Invalid email or password" prevents attackers from determining if an email is registered
- Same message for both wrong email and wrong password eliminates timing attack surface
- Session errors are generic to prevent session hijacking attempts

### Account Status Errors

These errors indicate account state issues. Generic messages are used by default.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_ACCOUNT_LOCKED` | 403 | Account temporarily locked. Please try again later | Account locked due to too many failed attempts | Account locked after too many failed login attempts |
| `AUTH_ACCOUNT_DISABLED` | 403 | Account disabled. Please contact support | This account has been disabled by an administrator | Account has been disabled by an administrator |
| `AUTH_ACCOUNT_NOT_VERIFIED` | 403 | Account not verified. Please check your email | Email address not verified. Check your inbox for verification link | User has not verified their email address |

**Security Rationale:**
- Generic messages prevent enumeration of account states
- Specific messages with CAPTCHA help legitimate users who are confused
- Account locking prevents brute-force attacks
- Email verification prevents spam account creation

### Rate Limiting Errors

These errors occur when rate limits are exceeded.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_RATE_LIMITED` | 429 | Too many attempts. Please try again later | N/A | User exceeds rate limit for an endpoint |
| `AUTH_TOO_MANY_ATTEMPTS` | 429 | Too many failed attempts. Please try again later | N/A | User has too many failed authentication attempts |

**Security Rationale:**
- Rate limiting prevents brute-force and enumeration attacks
- Generic message does not reveal the specific limit or time window
- No specific message needed - the action is clear from the generic message

### CAPTCHA Errors

These errors relate to CAPTCHA verification.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_CAPTCHA_FAILED` | 400 | CAPTCHA verification failed | N/A | CAPTCHA verification failed |
| `AUTH_CAPTCHA_REQUIRED` | 400 | CAPTCHA verification required | N/A | CAPTCHA is required but not provided |

**Security Rationale:**
- CAPTCHA prevents automated attacks
- Error messages are specific to CAPTCHA but don't reveal account information
- CAPTCHA failure does not indicate whether credentials were correct

### Validation Errors

These errors occur when input validation fails.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_INVALID_EMAIL` | 400 | Invalid email address | This email address is not registered | Email format is invalid |
| `AUTH_INVALID_PASSWORD` | 400 | Invalid password | N/A | Password does not meet requirements |
| `AUTH_WEAK_PASSWORD` | 400 | Password does not meet security requirements | N/A | Password is too weak during registration or change |
| `AUTH_PASSWORD_MISMATCH` | 400 | Passwords do not match | N/A | Password confirmation does not match |

**Security Rationale:**
- Validation errors are safe to be specific about format requirements
- "This email address is not registered" is only returned with CAPTCHA to prevent enumeration
- Password requirements help users create strong passwords

### Token Errors

These errors relate to authentication tokens.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_INVALID_TOKEN` | 400 | Invalid token | N/A | Token is invalid or malformed |
| `AUTH_TOKEN_EXPIRED` | 400 | Token expired | N/A | Token has expired |

**Security Rationale:**
- Token errors are generic to prevent token guessing attacks
- No specific message needed - the error is clear from the generic message

### Provider Errors

These errors relate to external authentication providers.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_PROVIDER_ERROR` | 500 | Authentication provider error | N/A | External auth provider returns an error |
| `AUTH_PROVIDER_NOT_CONFIGURED` | 500 | Authentication provider not configured | N/A | Auth provider is not configured in the application |

**Security Rationale:**
- Provider errors are generic to avoid leaking provider-specific information
- Configuration errors should not be exposed to end users

### Internal Errors

These errors indicate internal system issues.

| Error Code | HTTP Status | Generic Message | Specific Message (with CAPTCHA) | When It Occurs |
|------------|-------------|-----------------|--------------------------------|----------------|
| `AUTH_INTERNAL_ERROR` | 500 | An error occurred. Please try again | N/A | Unexpected internal error |
| `AUTH_SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | N/A | Auth service is down or overloaded |

**Security Rationale:**
- Internal errors are always generic to avoid leaking implementation details
- No specific message needed - users should retry or contact support

## Security Principles

### User Enumeration Prevention

User enumeration attacks allow attackers to determine which email addresses or usernames are registered in the system. This is prevented by:

1. **Generic Error Messages**: Using the same message for "user not found" and "wrong password"
2. **Consistent Response Times**: Ensuring the same processing time regardless of whether the user exists
3. **CAPTCHA-Gated Specific Messages**: Only providing specific error details when CAPTCHA is solved

### Timing Attack Prevention

Timing attacks can reveal information by measuring response time differences. This is prevented by:

1. **No Quick Exit**: Always performing the same operations regardless of early failure conditions
2. **Constant-Time Operations**: Using constant-time comparisons for sensitive data
3. **Artificial Delays**: Adding small delays to normalize response times (if needed)

### CAPTCHA Integration

CAPTCHA is used to balance security with UX:

1. **Default Generic Messages**: By default, return generic error messages
2. **CAPTCHA Solved**: When CAPTCHA is solved, return specific error messages for better UX
3. **Rate Limiting**: CAPTCHA is required after a certain number of failed attempts

## Usage Examples

### Basic Error Handling

```typescript
import { handleAuthError, AUTH_ERROR_CODES } from '@suite/auth/errors';

// Generic error (prevents enumeration)
const error = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
// Returns: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password', statusCode: 401, isSpecific: false }
```

### Error Handling with CAPTCHA

```typescript
// Specific error (with CAPTCHA solved)
const error = handleAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS, { captchaSolved: true });
// Returns: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Password incorrect for this email', statusCode: 401, isSpecific: true }
```

### Creating HTTP Response

```typescript
import { createErrorResponse, AUTH_ERROR_CODES } from '@suite/auth/errors';

const response = createErrorResponse(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
// Returns: { error: 'Invalid email or password', code: 'AUTH_INVALID_CREDENTIALS' }
```

### Checking for Specific Messages

```typescript
import { hasSpecificMessage, AUTH_ERROR_CODES } from '@suite/auth/errors';

if (hasSpecificMessage(AUTH_ERROR_CODES.INVALID_CREDENTIALS)) {
  // This error code has a specific message variant
}
```

## HTTP Status Code Reference

| Status Code | Meaning | Use Case |
|-------------|---------|----------|
| 400 | Bad Request | Invalid input, validation errors, CAPTCHA errors |
| 401 | Unauthorized | Authentication required, invalid credentials, session issues |
| 403 | Forbidden | Account locked, disabled, or not verified |
| 404 | Not Found | Resource not found (rarely used in auth) |
| 429 | Too Many Requests | Rate limiting exceeded |
| 500 | Internal Server Error | Unexpected errors, provider errors |
| 503 | Service Unavailable | Service down or overloaded |

## Best Practices

1. **Always use error codes**: Use the `AUTH_ERROR_CODES` constants instead of string literals
2. **Default to generic messages**: Only use specific messages when CAPTCHA is solved
3. **Log detailed errors internally**: Log the actual error details server-side for debugging
4. **Don't leak implementation details**: Keep error messages focused on user action, not system internals
5. **Use appropriate HTTP status codes**: Match the status code to the error type
6. **Test for enumeration vulnerabilities**: Regularly test that error messages don't enable enumeration

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Testing for Account Enumeration](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account)
- [CWE-204: Observable Response Discrepancy](https://cwe.mitre.org/data/definitions/204.html)
