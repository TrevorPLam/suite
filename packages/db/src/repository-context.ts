/**
 * RepositoryContext - Request-scoped context for repository operations
 *
 * This interface encapsulates request-scoped data that repositories need to perform
 * their operations. By passing context as a parameter to repository methods instead
 * of storing it in the repository instance, we:
 *
 * 1. Enable proper dependency injection (repositories only depend on Database)
 * 2. Support Cloudflare Workers request-scoped state patterns
 * 3. Allow transaction context to be passed alongside user/tenant context
 * 4. Follow DDD context propagation best practices
 * 5. Enable testability by making context explicit
 */

export interface RepositoryContext {
  /** The authenticated user ID for the current request */
  userId: string;
  
  /** The tenant/organization ID for multi-tenancy */
  tenantId: string;
  
  /** Unique request ID for tracing and logging */
  requestId: string;
}

/**
 * Validate that a RepositoryContext has valid values
 * 
 * @throws Error if context is invalid
 */
export function validateRepositoryContext(context: RepositoryContext): void {
  if (!context.userId || typeof context.userId !== 'string') {
    throw new Error('RepositoryContext.userId must be a non-empty string');
  }
  
  if (!context.tenantId || typeof context.tenantId !== 'string') {
    throw new Error('RepositoryContext.tenantId must be a non-empty string');
  }
  
  if (!context.requestId || typeof context.requestId !== 'string') {
    throw new Error('RepositoryContext.requestId must be a non-empty string');
  }
  
  // Optional: Validate UUID format for userId and tenantId
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(context.userId)) {
    throw new Error(`RepositoryContext.userId must be a valid UUID: ${context.userId}`);
  }
  
  if (!uuidRegex.test(context.tenantId)) {
    throw new Error(`RepositoryContext.tenantId must be a valid UUID: ${context.tenantId}`);
  }
}

/**
 * Create a RepositoryContext with validation
 * 
 * @throws Error if context is invalid
 */
export function createRepositoryContext(
  userId: string,
  tenantId: string,
  requestId: string
): RepositoryContext {
  const context: RepositoryContext = {
    userId,
    tenantId,
    requestId,
  };
  
  validateRepositoryContext(context);
  
  return context;
}
