import { Context, Next } from 'hono';
import { getSession } from './server.js';

export async function authMiddleware(c: Context, next: Next) {
  const session = await getSession(c.req.raw.headers);
  
  if (session) {
    c.set('user', session.user);
    c.set('session', session.session);
    c.set('userId', session.user.id);
  } else {
    c.set('user', null);
    c.set('session', null);
    c.set('userId', null);
  }
  
  await next();
}
