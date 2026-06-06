export function mountAuth(app: any) {
  app.on(['GET', 'POST'], '/api/auth/*', (c: any) => {
    const auth = c.get('auth');
    if (!auth) {
      // Fallback to legacy singleton if not set (for backward compatibility)
      const { auth: legacyAuth } = require('./server.js');
      return legacyAuth.handler(c.req.raw);
    }
    return auth.handler(c.req.raw);
  });
}
