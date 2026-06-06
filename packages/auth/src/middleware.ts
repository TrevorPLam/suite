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
    } else {
      c.set('user', null);
      c.set('session', null);
      c.set('userId', null);
    }
  } else {
    const session = await getSession(auth, c.req.raw.headers);
    
    if (session) {
      c.set('user', session.user);
      c.set('session', session.session);
      c.set('userId', session.user.id);
    } else {
      c.set('user', null);
      c.set('session', null);
      c.set('userId', null);
    }
  }
  
  await next();
}
