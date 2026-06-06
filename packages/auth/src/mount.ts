import { auth } from './server.js';

export function mountAuth(app: any) {
  app.on(['GET', 'POST'], '/api/auth/*', (c: any) => {
    return auth.handler(c.req.raw);
  });
}
