import { Context, Next } from 'hono';
import { getSession } from './server.js';
import { validateIPBinding, extractClientIP, type IPBindingStrictness } from './ip-binding.js';

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.get('auth');
  if (!auth) {
    throw new Error('Auth instance not found in context. Ensure auth middleware is configured.');
  }

  const session = await getSession(auth, c.req.raw.headers);

  if (session) {
    // Get IP binding strictness from environment
    const ipBindingStrictness: IPBindingStrictness = (c.env?.IP_BINDING_STRICTNESS as IPBindingStrictness) || 'subnet';

    // Validate IP binding if enabled
    if (ipBindingStrictness !== 'disabled') {
      const sessionIP = session.session.ipAddress as string | undefined;
      const requestIP = extractClientIP(c.req.raw.headers);

      const bindingResult = validateIPBinding(sessionIP, requestIP, ipBindingStrictness);

      if (!bindingResult.valid) {
        // IP binding validation failed - clear session to force re-authentication
        c.set('user', null);
        c.set('session', null);
        c.set('userId', null);
        c.set('organizationId', null);
        return c.json(
          {
            error: {
              code: 'IP_BINDING_FAILED',
              message: bindingResult.reason || 'Session IP validation failed',
              timestamp: new Date().toISOString(),
            },
          },
          401,
        );
      }
    }

    c.set('user', session.user);
    c.set('session', session.session);
    c.set('userId', session.user.id);
    // Set organization context if available
    // @ts-ignore - activeOrganizationId is added by organization plugin
    c.set('organizationId', session.session.activeOrganizationId || null);
  } else {
    c.set('user', null);
    c.set('session', null);
    c.set('userId', null);
    c.set('organizationId', null);
  }

  await next();
}

/**
 * Middleware to require user to be a member of an organization
 * This ensures organization context is available for multi-tenant operations
 */
export async function requireOrganization(c: Context, next: Next) {
  const organizationId = c.get('organizationId');
  
  if (!organizationId) {
    return c.json(
      {
        error: {
          code: 'ORGANIZATION_REQUIRED',
          message: 'Organization membership required for this operation',
          timestamp: new Date().toISOString(),
        },
      },
      403,
    );
  }
  
  await next();
}
