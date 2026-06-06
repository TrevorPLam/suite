export function mountAuth(app: any) {
  app.on(['GET', 'POST'], '/api/auth/*', (c: any) => {
    const auth = c.get('auth');
    if (!auth) {
      throw new Error('Auth instance not found in context. Ensure auth middleware is configured.');
    }
    return auth.handler(c.req.raw);
  });
}
