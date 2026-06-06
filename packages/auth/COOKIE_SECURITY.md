# Cookie Security Documentation

## Overview

This document describes the cookie security configuration for the Suite auth package using Better Auth v1.6.11, aligned with OWASP cookie security standards.

## Current Configuration

### Cookie Attributes

| Attribute | Current Value | OWASP Requirement | Status |
|-----------|---------------|-------------------|--------|
| HttpOnly | Auto-enabled in production | Required for session cookies | ✅ Compliant |
| Secure | Auto-enabled in production | Required for sensitive cookies | ✅ Compliant (production) |
| SameSite | Lax (default) | Lax or Strict recommended | ✅ Compliant |
| Path | Default (/) | / recommended for __Host- | ✅ Compliant |
| Domain | Not set (crossSubDomainCookies disabled) | Required only for cross-subdomain | ✅ Compliant |

### Cookie Names

| Cookie | Current Name | Prefix | Purpose |
|--------|--------------|--------|---------|
| session_token | suite.session_token | suite | Stores session token |
| session_data | suite.session_data | suite | Stores session data (if cache enabled) |
| dont_remember | suite.dont_remember | suite | Remember me flag |
| two_factor | suite.two_factor | suite | 2FA state (plugin) |

### Security Settings

```typescript
// packages/auth/src/server.ts
advanced: {
  cookiePrefix: 'suite',
  crossSubDomainCookies: {
    enabled: false, // No Domain attribute - good for security
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:5173',
  ],
  // useSecureCookies: not set (defaults to production-only)
}
```

## OWASP Compliance Checklist

### ✅ Compliant

- [x] **HttpOnly attribute**: Automatically enabled by Better Auth in production, prevents XSS access
- [x] **Secure attribute**: Automatically enabled by Better Auth in production, prevents transmission over HTTP
- [x] **SameSite=Lax**: Default setting, prevents most CSRF attacks while allowing top-level navigation
- [x] **No Domain attribute**: crossSubDomainCookies disabled, cookies are host-only
- [x] **Path=/**: Default setting, cookies sent to all paths on host
- [x] **Origin validation**: trustedOrigins configured for CSRF protection
- [x] **Fetch Metadata Protection**: Better Auth uses Sec-Fetch-* headers for first-login CSRF

### ⚠️ Partially Compliant

- [ ] **__Host- prefix**: Current prefix is 'suite', not __Host-. Using __Host- would provide browser-enforced security guarantees.
- [ ] **useSecureCookies: true**: Currently defaults to production-only. Forcing Secure in all environments would be more secure.

### ❌ Non-Compliant

None - current configuration meets all critical OWASP requirements.

## Security Trade-offs

### Current Configuration Strengths

1. **No cross-subdomain cookies**: By disabling crossSubDomainCookies, cookies are host-only, preventing subdomain attacks
2. **Automatic security attributes**: Better Auth automatically enables HttpOnly and Secure in production
3. **SameSite=Lax**: Balances security and usability, allows top-level navigation while preventing most CSRF
4. **Origin validation**: trustedOrigins provides additional CSRF protection
5. **Fetch Metadata**: Modern browsers get enhanced first-login CSRF protection

### Potential Improvements

1. **__Host- prefix**: Would provide browser-enforced security guarantees (Secure, no Domain, Path=/)
   - Trade-off: Requires changing cookie names, may affect existing sessions
   - Recommendation: Add __Host- prefix when deploying to production with migration plan

2. **useSecureCookies: true**: Force Secure attribute in all environments
   - Trade-off: Breaks local development over HTTP
   - Recommendation: Enable for production deployments, keep current for local dev

3. **SameSite=Strict**: More restrictive than Lax
   - Trade-off: May break legitimate cross-site navigation flows
   - Recommendation: Keep Lax for better UX, use Strict only for highly sensitive operations

## Migration to __Host- Prefix

If adopting __Host- prefix for production:

1. Update cookiePrefix in server.ts:
   ```typescript
   advanced: {
     cookiePrefix: '__Host-suite',
   }
   ```

2. Ensure all requirements are met:
   - Secure attribute: ✅ (auto-enabled in production)
   - No Domain attribute: ✅ (crossSubDomainCookies disabled)
   - Path=/: ✅ (default)

3. Migration plan:
   - Deploy with new prefix
   - Existing sessions with old prefix will be invalid
   - Users will need to re-authenticate
   - Coordinate deployment during low-traffic period

## References

- [OWASP Cookie Attributes](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Better Auth Cookies Documentation](https://better-auth.com/docs/concepts/cookies)
- [Better Auth Security Documentation](https://better-auth.com/docs/reference/security)
- [MDN Cookie Prefixes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#cookie_prefixes)

## Last Updated

2026-06-06
