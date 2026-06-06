import { Context, Next } from 'hono';
import { requireSession } from './server.js';

export async function requireAuth(c: Context, next: Next) {
  try {
    const session = await requireSession(c.req.raw.headers);
    c.set('userId', session.user.id);
    await next();
  } catch (_error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}
