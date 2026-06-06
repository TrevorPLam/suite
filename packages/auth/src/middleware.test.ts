import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authMiddleware, requireOrganization } from './middleware.js';
import { Context, Next } from 'hono';

describe('Middleware Tests', () => {
  let mockContext: Context;
  let mockNext: Next;

  beforeEach(() => {
    // Create mock context
    mockContext = {
      get: vi.fn(),
      set: vi.fn(),
      req: {
        raw: {
          headers: new Headers(),
        },
      },
      json: vi.fn(),
    } as unknown as Context;

    // Create mock next function
    mockNext = vi.fn();
  });

  describe('authMiddleware', () => {
    it('should throw error when auth not in context', async () => {
      mockContext.get = vi.fn().mockReturnValue(undefined);

      await expect(authMiddleware(mockContext, mockNext)).rejects.toThrow(
        'Auth instance not found in context. Ensure auth middleware is configured.'
      );
    });

    it('should call next when auth is in context', async () => {
      const mockAuth = {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      };
      mockContext.get = vi.fn().mockReturnValue(mockAuth);

      await authMiddleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireOrganization', () => {
    it('should return 403 when organizationId is null', async () => {
      mockContext.get = vi.fn().mockReturnValue(null);
      mockContext.json = vi.fn().mockReturnValue({
        status: 403,
      });

      await requireOrganization(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: {
            code: 'ORGANIZATION_REQUIRED',
            message: 'Organization membership required for this operation',
            timestamp: expect.any(String),
          },
        },
        403
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next when organizationId is present', async () => {
      mockContext.get = vi.fn().mockReturnValue('org-123');

      await requireOrganization(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when organizationId is empty string', async () => {
      mockContext.get = vi.fn().mockReturnValue('');
      mockContext.json = vi.fn().mockReturnValue({
        status: 403,
      });

      await requireOrganization(mockContext, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        {
          error: {
            code: 'ORGANIZATION_REQUIRED',
            message: 'Organization membership required for this operation',
            timestamp: expect.any(String),
          },
        },
        403
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
