/**
 * Tests for WorkerDatabase implementation
 * 
 * Tests Cloudflare Workers compatibility with Hyperdrive integration.
 * Mocks Hyperdrive binding for testing in Node.js environment.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkerDatabase } from './worker-database.js';
import { createDbClient } from './database-factory.js';
import type { DatabaseEnvironment } from './database.interface.js';

describe('WorkerDatabase', () => {
  let mockHyperdriveBinding: DatabaseEnvironment['HYPERDRIVE'];
  let db: WorkerDatabase;

  beforeEach(() => {
    // Mock Hyperdrive binding
    mockHyperdriveBinding = {
      connectionString: 'postgres://test:test@localhost:5432/test',
    };
    db = new WorkerDatabase(mockHyperdriveBinding);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('constructor', () => {
    it('should create database instance with Hyperdrive binding', () => {
      expect(db).toBeInstanceOf(WorkerDatabase);
    });

    it('should throw error if Hyperdrive binding is missing', () => {
      expect(() => new WorkerDatabase(undefined)).toThrow(
        'HYPERDRIVE binding with connectionString is required for WorkerDatabase'
      );
    });

    it('should throw error if connectionString is missing', () => {
      expect(() => new WorkerDatabase({} as DatabaseEnvironment['HYPERDRIVE'])).toThrow(
        'HYPERDRIVE binding with connectionString is required for WorkerDatabase'
      );
    });
  });

  describe('close', () => {
    it('should close database connection', async () => {
      await db.close();
      await expect(db.query('SELECT 1')).rejects.toThrow('Database connection is closed');
    });

    it('should be idempotent', async () => {
      await db.close();
      await db.close(); // Should not throw
      await expect(db.query('SELECT 1')).rejects.toThrow('Database connection is closed');
    });
  });

  describe('getDrizzleDb', () => {
    it('should return Drizzle DB instance', () => {
      const drizzleDb = db.getDrizzleDb();
      expect(drizzleDb).toBeDefined();
    });

    it('should throw error if database is closed', async () => {
      await db.close();
      expect(() => db.getDrizzleDb()).toThrow('Database connection is closed');
    });
  });
});

describe('DatabaseFactory Workers Detection', () => {
  describe('isWorkersEnvironment', () => {
    it('should return true for valid Workers environment', () => {
      const env: DatabaseEnvironment = {
        HYPERDRIVE: {
          connectionString: 'postgres://test',
        },
      };

      const db = createDbClient(env, undefined, true);
      expect(db).toBeInstanceOf(WorkerDatabase);
    });

    it('should return false for missing HYPERDRIVE', () => {
      const env: DatabaseEnvironment = {};

      expect(() => createDbClient(env)).toThrow();
    });

    it('should return false for missing connectionString', () => {
      const env: DatabaseEnvironment = {
        HYPERDRIVE: { connectionString: '' },
      };

      expect(() => createDbClient(env)).toThrow();
    });
  });

  describe('Environment priority', () => {
    it('should prefer Workers over Node.js when both present', () => {
      const env: DatabaseEnvironment = {
        DATABASE_URL: 'postgres://node',
        HYPERDRIVE: {
          connectionString: 'postgres://workers',
        },
      };

      const db = createDbClient(env, undefined, true);
      expect(db).toBeInstanceOf(WorkerDatabase);
    });

    it('should use Node.js when Workers not present', () => {
      const env: DatabaseEnvironment = {
        DATABASE_URL: 'postgres://node',
      };

      const db = createDbClient(env, undefined, true);
      expect(db.constructor.name).toBe('PostgresDatabase');
    });
  });
});
