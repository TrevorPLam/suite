import { Hono } from 'hono';
import { auth } from './server.js';

export function mountAuth(app: Hono) {
  app.on(['GET', 'POST'], '/api/auth/*', (c) => {
    return auth.handler(c.req.raw);
  });
}
