import { Context, Next } from 'hono';
import { getSession } from './server.js';

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.get('auth');
  if (!auth) {
    // Fallback to legacy singleton if not set (for backward compatibility)
    const { auth: legacyAuth } = await import('./server.js');
    const session = await getSession(legacyAuth, c.req.raw.headers);
    
    if (session) {
      c.set('user', session.user);
      c.set('session', session.session);
      c.set('userId', session.user.id);
      // Set organization context if available
      c.set('organizationId', session.session.activeOrganizationId || null);
    } else {
      c.set('user', null);
      c.set('session', null);
      c.set('userId', null);
      c.set('organizationId', null);
    }
  } else {
    const session = await getSession(auth, c.req.raw.headers);
    
    if (session) {
      c.set('user', session.user);
      c.set('session', session.session);
      c.set('userId', session.user.id);
      // Set organization context if available
      c.set('organizationId', session.session.activeOrganizationId || null);
    } else {
      c.set('user', null);
      c.set('session', null);
      c.set('userId', null);
      c.set('organizationId', null);
    }
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
