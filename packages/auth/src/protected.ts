import { Context, Next } from 'hono';
import { requireSession } from './server.js';

export async function requireAuth(c: Context, next: Next) {
  try {
    const auth = c.get('auth');
    if (!auth) {
      // Fallback to legacy singleton if not set (for backward compatibility)
      const { auth: legacyAuth } = await import('./server.js');
      const session = await requireSession(legacyAuth, c.req.raw.headers);
      c.set('userId', session.user.id);
    } else {
      const session = await requireSession(auth, c.req.raw.headers);
      c.set('userId', session.user.id);
    }
    await next();
  } catch (_error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}
