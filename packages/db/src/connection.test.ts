/**
 * Tests for dependency injection pattern
 * 
 * Tests verify:
 * - PostgresDatabase implementation
 * - WorkerDatabase implementation
 * - Factory function returns correct implementation
 * - Connection pooling configuration
 * - Graceful shutdown handling
 */

import { describe, it, expect, afterEach } from 'vitest';
import { PostgresDatabase } from './postgres-database.js';
import { WorkerDatabase } from './worker-database.js';
import { createDbClient } from './database-factory.js';
import type { Database, DatabaseEnvironment } from './database.interface.js';

describe('PostgresDatabase', () => {
  let db: PostgresDatabase;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('should create instance with connection string', () => {
    db = new PostgresDatabase('postgres://localhost:5432/test');
    expect(db).toBeInstanceOf(PostgresDatabase);
  });

  it('should accept pool configuration', () => {
    db = new PostgresDatabase('postgres://localhost:5432/test', {
      max: 10,
      idle: 5,
      connectionTimeoutMillis: 5000,
    });
    expect(db).toBeInstanceOf(PostgresDatabase);
  });

  it('should throw error when querying after close', async () => {
    db = new PostgresDatabase('postgres://localhost:5432/test');
    await db.close();
    
    await expect(db.query('SELECT 1')).rejects.toThrow('Database connection is closed');
  });

  it('should throw error when getting Drizzle DB after close', () => {
    db = new PostgresDatabase('postgres://localhost:5432/test');
    db.close();
    
    expect(() => db.getDrizzleDb()).toThrow('Database connection is closed');
  });

  it('should get Drizzle DB instance', () => {
    db = new PostgresDatabase('postgres://localhost:5432/test');
    const drizzleDb = db.getDrizzleDb();
    expect(drizzleDb).toBeDefined();
  });
});

describe('WorkerDatabase', () => {
  let db: WorkerDatabase;

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('should create instance with Hyperdrive binding', () => {
    db = new WorkerDatabase({
      connectionString: 'postgres://localhost:5432/test',
    });
    expect(db).toBeInstanceOf(WorkerDatabase);
  });

  it('should throw error without Hyperdrive binding', () => {
    expect(() => new WorkerDatabase(undefined as any)).toThrow(
      'HYPERDRIVE binding with connectionString is required'
    );
  });

  it('should throw error without connectionString', () => {
    expect(() => new WorkerDatabase({} as any)).toThrow(
      'HYPERDRIVE binding with connectionString is required'
    );
  });

  it('should throw error when querying after close', async () => {
    db = new WorkerDatabase({
      connectionString: 'postgres://localhost:5432/test',
    });
    await db.close();
    
    await expect(db.query('SELECT 1')).rejects.toThrow('Database connection is closed');
  });

  it('should get Drizzle DB instance', () => {
    db = new WorkerDatabase({
      connectionString: 'postgres://localhost:5432/test',
    });
    const drizzleDb = db.getDrizzleDb();
    expect(drizzleDb).toBeDefined();
  });
});

describe('createDbClient factory', () => {
  it('should return WorkerDatabase when HYPERDRIVE is present', () => {
    const env: DatabaseEnvironment = {
      HYPERDRIVE: {
        connectionString: 'postgres://localhost:5432/test',
      },
    };
    
    const db = createDbClient(env);
    expect(db).toBeInstanceOf(WorkerDatabase);
  });

  it('should return PostgresDatabase when DATABASE_URL is present', () => {
    const env: DatabaseEnvironment = {
      DATABASE_URL: 'postgres://localhost:5432/test',
    };
    
    const db = createDbClient(env);
    expect(db).toBeInstanceOf(PostgresDatabase);
  });

  it('should accept pool configuration for PostgresDatabase', () => {
    const env: DatabaseEnvironment = {
      DATABASE_URL: 'postgres://localhost:5432/test',
      pool: {
        max: 10,
        idle: 5,
      },
    };
    
    const db = createDbClient(env);
    expect(db).toBeInstanceOf(PostgresDatabase);
  });

  it('should throw error when no valid environment is provided', () => {
    const env: DatabaseEnvironment = {};
    
    expect(() => createDbClient(env)).toThrow(
      'Invalid database environment configuration'
    );
  });

  it('should prefer HYPERDRIVE over DATABASE_URL', () => {
    const env: DatabaseEnvironment = {
      DATABASE_URL: 'postgres://localhost:5432/test',
      HYPERDRIVE: {
        connectionString: 'postgres://hyperdrive:5432/test',
      },
    };
    
    const db = createDbClient(env);
    expect(db).toBeInstanceOf(WorkerDatabase);
  });
});

describe('Database interface compliance', () => {
  it('should implement Database interface', () => {
    const env: DatabaseEnvironment = {
      DATABASE_URL: 'postgres://localhost:5432/test',
    };
    
    const db: Database = createDbClient(env);
    
    expect(db.query).toBeInstanceOf(Function);
    expect(db.transaction).toBeInstanceOf(Function);
    expect(db.close).toBeInstanceOf(Function);
    expect(db.getDrizzleDb).toBeInstanceOf(Function);
  });
});
