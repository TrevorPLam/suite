import type { Context } from 'hono';

export interface RepositoryContext {
  userId: string;
  tenantId: string;
  requestId: string;
}

/**
 * Validates that a RepositoryContext is properly formed
 * @throws Error if context is invalid
 */
export function validateRepositoryContext(context: unknown): context is RepositoryContext {
  if (!context || typeof context !== 'object') {
    throw new Error('Repository context must be an object');
  }

  const ctx = context as Partial<RepositoryContext>;

  if (!ctx.userId || typeof ctx.userId !== 'string' || ctx.userId.trim().length === 0) {
    throw new Error('Repository context must have a valid userId');
  }

  if (!ctx.tenantId || typeof ctx.tenantId !== 'string' || ctx.tenantId.trim().length === 0) {
    throw new Error('Repository context must have a valid tenantId');
  }

  if (!ctx.requestId || typeof ctx.requestId !== 'string' || ctx.requestId.trim().length === 0) {
    throw new Error('Repository context must have a valid requestId');
  }

  return true;
}

/**
 * Hono middleware to validate RepositoryContext
 * This should be placed after the middleware that creates the context
 * but before any route handlers that use it
 */
export function requireRepositoryContext() {
  return async (c: Context, next: () => Promise<void>) => {
    // Check if userId is present (set by authMiddleware)
    // If not, the request is unauthenticated - return 401
    const userId = c.get('userId');
    if (!userId) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        },
        401,
      );
    }

    const repositoryContext = c.get('repositoryContext');

    try {
      validateRepositoryContext(repositoryContext);
    } catch (error) {
      return c.json(
        {
          error: {
            code: 'GLOBAL_INVALID_REQUEST',
            message: error instanceof Error ? error.message : 'Invalid repository context',
            timestamp: new Date().toISOString(),
          },
        },
        500,
      );
    }

    await next();
  };
}
