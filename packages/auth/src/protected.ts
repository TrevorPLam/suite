import { Context, Next } from 'hono';
import { requireSession } from './server.js';

export async function requireAuth(c: Context, next: Next) {
  try {
    const auth = c.get('auth');
    if (!auth) {
      throw new Error('Auth not set in context. Ensure auth middleware runs before requireAuth.');
    }
    const session = await requireSession(auth, c.req.raw.headers);
    c.set('userId', session.user.id);
    await next();
  } catch (_error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}
