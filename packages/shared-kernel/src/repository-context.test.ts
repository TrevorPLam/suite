import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRepositoryContext, RepositoryContext } from './repository-context.js';
import type { Context, Next } from 'hono';

describe('requireRepositoryContext', () => {
  let mockContext: Context;
  let mockNext: Next;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('should return 401 when userId is null', async () => {
    // Create a mock context with null userId
    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'userId') return null;
        return undefined;
      }),
      json: vi.fn((body: unknown, status: number) => {
        return {
          status,
          body,
        } as Response;
      }),
    } as unknown as Context;

    const middleware = requireRepositoryContext();
    await middleware(mockContext, mockNext);

    expect(mockContext.get).toHaveBeenCalledWith('userId');
    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: expect.any(String),
        },
      },
      401
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when userId is undefined', async () => {
    // Create a mock context with undefined userId
    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'userId') return undefined;
        return undefined;
      }),
      json: vi.fn((body: unknown, status: number) => {
        return {
          status,
          body,
        } as Response;
      }),
    } as unknown as Context;

    const middleware = requireRepositoryContext();
    await middleware(mockContext, mockNext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: expect.any(String),
        },
      },
      401
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 500 when userId is set but repositoryContext is invalid', async () => {
    // Create a mock context with userId but invalid repositoryContext
    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'userId') return 'user-123';
        if (key === 'repositoryContext') return null;
        return undefined;
      }),
      json: vi.fn((body: unknown, status: number) => {
        return {
          status,
          body,
        } as Response;
      }),
    } as unknown as Context;

    const middleware = requireRepositoryContext();
    await middleware(mockContext, mockNext);

    expect(mockContext.json).toHaveBeenCalledWith(
      {
        error: {
          code: 'GLOBAL_INVALID_REQUEST',
          message: 'Repository context must be an object',
          timestamp: expect.any(String),
        },
      },
      500
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next when userId is set and repositoryContext is valid', async () => {
    // Create a mock context with valid userId and repositoryContext
    const validContext: RepositoryContext = {
      userId: 'user-123',
      tenantId: 'tenant-456',
      requestId: 'req-789',
    };

    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'userId') return 'user-123';
        if (key === 'repositoryContext') return validContext;
        return undefined;
      }),
      json: vi.fn(),
    } as unknown as Context;

    const middleware = requireRepositoryContext();
    await middleware(mockContext, mockNext);

    expect(mockContext.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });
});
