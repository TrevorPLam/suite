/**
 * Unit of Work transaction tests
 * 
 * Tests verify that transactions roll back on error and commit on success.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnitOfWork } from './unit-of-work.js';

// Mock Database implementation
class MockDatabase {
  private mockDrizzleDb: any;

  constructor() {
    this.mockDrizzleDb = {
      transaction: async (fn: (tx: any) => Promise<unknown>) => {
        return await fn({});
      },
    };
  }

  async query<T = unknown>(): Promise<T[]> {
    return [];
  }

  async transaction<T>(fn: (ctx: any) => Promise<T>): Promise<T> {
    return this.mockDrizzleDb.transaction(fn) as Promise<T>;
  }

  async close(): Promise<void> {
    // Mock close
  }

  getDrizzleDb(): any {
    return this.mockDrizzleDb;
  }
}

describe('UnitOfWork', () => {
  let database: MockDatabase;
  let unitOfWork: UnitOfWork;

  beforeEach(() => {
    database = new MockDatabase();
    unitOfWork = new UnitOfWork(database as any);
  });

  describe('transaction rollback on error', () => {
    it('should rollback when callback throws an error', async () => {
      // Override the mock to throw error
      const mockDrizzleDb = database.getDrizzleDb();
      mockDrizzleDb.transaction = async (fn: (tx: any) => Promise<unknown>) => {
        try {
          return await fn({});
        } catch (error) {
          // Drizzle automatically rolls back on error
          throw error;
        }
      };

      await expect(
        unitOfWork.transaction(async (_tx) => {
          // Simulate an operation
          throw new Error('Simulated error');
        })
      ).rejects.toThrow('Simulated error');
    });

    it('should not persist partial updates when error occurs', async () => {
      const mockDrizzleDb = database.getDrizzleDb();
      const operations: string[] = [];

      // Mock Drizzle transaction to track operations
      mockDrizzleDb.transaction = async (fn: (tx: any) => Promise<unknown>) => {
        try {
          return await fn({
            execute: (sql: string) => operations.push(sql),
          });
        } catch (error) {
          // Rollback - operations should not persist
          operations.length = 0;
          throw error;
        }
      };

      await expect(
        unitOfWork.transaction(async (_tx) => {
          operations.push('INSERT INTO events ...');
          operations.push('INSERT INTO tasks ...');
          throw new Error('Database constraint violation');
        })
      ).rejects.toThrow('Database constraint violation');

      // Operations should be empty after rollback
      expect(operations).toHaveLength(0);
    });

    it('should rollback multiple repository operations on error', async () => {
      const mockDrizzleDb = database.getDrizzleDb();
      const committedOperations: string[] = [];

      // Mock Drizzle transaction
      mockDrizzleDb.transaction = async (fn: (tx: any) => Promise<unknown>) => {
        try {
          const result = await fn({
            execute: () => {},
          });
          // Only add to committed if no error
          committedOperations.push('COMMIT');
          return result;
        } catch (error) {
          // Rollback - no commit
          throw error;
        }
      };

      await expect(
        unitOfWork.transaction(async (_tx) => {
          // Simulate multiple repository operations
          // First operation succeeds
          // Second operation fails
          throw new Error('Second operation failed');
        })
      ).rejects.toThrow('Second operation failed');

      // Should not have committed
      expect(committedOperations).toHaveLength(0);
    });
  });

  describe('transaction commit on success', () => {
    it('should commit when callback completes without error', async () => {
      const mockDrizzleDb = database.getDrizzleDb();

      // Mock Drizzle transaction to simulate commit
      mockDrizzleDb.transaction = async (fn: (tx: any) => Promise<unknown>) => {
        const result = await fn({});
        // Drizzle automatically commits on success
        return result;
      };

      const result = await unitOfWork.transaction(async (_tx) => {
        return { success: true };
      });

      expect(result).toEqual({ success: true });
    });

    it('should persist multiple repository operations when callback succeeds', async () => {
      const mockDrizzleDb = database.getDrizzleDb();
      const operations: string[] = [];

      // Mock Drizzle transaction
      mockDrizzleDb.transaction = async (fn: (tx: any) => Promise<unknown>) => {
        const result = await fn({
          execute: (sql: string) => operations.push(sql),
        });
        // Commit - operations persist
        return result;
      };

      await unitOfWork.transaction(async (_tx) => {
        operations.push('INSERT INTO events ...');
        operations.push('INSERT INTO tasks ...');
        return { success: true };
      });

      // Operations should persist after commit
      expect(operations).toHaveLength(2);
    });

    it('should pass transaction context to repositories', async () => {
      const mockDrizzleDb = database.getDrizzleDb();
      let passedTx: any = null;

      // Mock Drizzle transaction
      mockDrizzleDb.transaction = async (fn: (tx: any) => Promise<unknown>) => {
        const mockTx = {
          execute: () => {},
        };
        return await fn(mockTx);
      };

      await unitOfWork.transaction(async (tx) => {
        passedTx = tx;
        return { success: true };
      });

      expect(passedTx).not.toBeNull();
      expect(passedTx).toHaveProperty('execute');
    });

    it('should support transaction configuration', async () => {
      const mockDrizzleDb = database.getDrizzleDb();
      let appliedConfig: string | null = null;

      // Mock Drizzle transaction with config
      mockDrizzleDb.transaction = async (fn: (tx: any) => Promise<unknown>) => {
        const mockTx = {
          execute: (sql: string) => {
            appliedConfig = sql;
          },
        };
        return await fn(mockTx);
      };

      await unitOfWork.transaction(
        async (_tx) => {
          return { success: true };
        },
        {
          isolationLevel: 'SERIALIZABLE',
          accessMode: 'READ WRITE',
        }
      );

      expect(appliedConfig).toContain('ISOLATION LEVEL SERIALIZABLE');
      expect(appliedConfig).toContain('READ WRITE');
    });
  });
});
