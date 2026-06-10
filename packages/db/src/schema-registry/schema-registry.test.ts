import { describe, it, expect } from 'vitest';
import { trackSchemaVersion, getCurrentSchemaVersion, getAllSchemaVersions, calculateSchemaChecksum } from './version-tracker.js';
import { testSchemaContract, SchemaContract } from './contract-tester.js';

describe('Schema Registry', () => {
  describe('Version Tracker', () => {
    const mockDb = {
      query: async (_sql: string, _params: unknown[]) => {
        // Mock database responses
        return [
          {
            domain: 'test',
            version: '0001',
            applied_at: new Date().toISOString(),
            checksum: 'abc123',
          },
        ];
      },
    };

    it('should track schema version', async () => {
      await expect(
        trackSchemaVersion(mockDb as any, 'test', '0001', 'abc123')
      ).resolves.not.toThrow();
    });

    it('should get current schema version', async () => {
      const version = await getCurrentSchemaVersion(mockDb as any, 'test');
      expect(version).not.toBeNull();
      expect(version?.domain).toBe('test');
      expect(version?.version).toBe('0001');
    });

    it('should return null for non-existent domain', async () => {
      const emptyMockDb = {
        query: async () => [],
      };
      const version = await getCurrentSchemaVersion(emptyMockDb as any, 'nonexistent');
      expect(version).toBeNull();
    });

    it('should get all schema versions', async () => {
      const versions = await getAllSchemaVersions(mockDb as any);
      expect(versions).toHaveLength(1);
      expect(versions[0]?.domain).toBe('test');
    });

    it('should calculate schema checksum', async () => {
      const schemaData = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: { name: 'id', type: 'text', nullable: false, primaryKey: true },
            },
          },
        },
      };
      const checksum = await calculateSchemaChecksum(schemaData);
      expect(checksum).toBeDefined();
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBe(64); // SHA-256 hex length
    });

    it('should produce same checksum for identical schemas', async () => {
      const schema = { tables: { users: { name: 'users' } } };
      const checksum1 = await calculateSchemaChecksum(schema);
      const checksum2 = await calculateSchemaChecksum(schema);
      expect(checksum1).toBe(checksum2);
    });
  });

  describe('Contract Tester', () => {
    const mockDb = {
      query: async (sql: string, _params: unknown[]) => {
        // Mock database responses for schema extraction
        if (sql.includes('information_schema.tables')) {
          return [{ table_name: 'users' }];
        }
        if (sql.includes('information_schema.columns')) {
          return [
            {
              column_name: 'id',
              data_type: 'text',
              is_nullable: 'NO',
              column_default: null,
            },
            {
              column_name: 'email',
              data_type: 'text',
              is_nullable: 'YES',
              column_default: null,
            },
          ];
        }
        if (sql.includes('PRIMARY KEY')) {
          return [{ column_name: 'id' }];
        }
        if (sql.includes('pg_indexes')) {
          return [];
        }
        if (sql.includes('FOREIGN KEY')) {
          return [];
        }
        return [];
      },
    };

    it('should detect no violations for matching schemas', async () => {
      const expectedSchema: SchemaContract = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: { name: 'id', type: 'text', nullable: false, primaryKey: true },
              email: { name: 'email', type: 'text', nullable: true, primaryKey: false },
            },
            indexes: {},
            foreignKeys: {},
          },
        },
      };

      const result = await testSchemaContract(mockDb as any, 'public', expectedSchema);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect removed tables as breaking changes', async () => {
      const expectedSchema: SchemaContract = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: { name: 'id', type: 'text', nullable: false, primaryKey: true },
            },
            indexes: {},
            foreignKeys: {},
          },
          posts: {
            name: 'posts',
            columns: {
              id: { name: 'id', type: 'text', nullable: false, primaryKey: true },
            },
            indexes: {},
            foreignKeys: {},
          },
        },
      };

      const result = await testSchemaContract(mockDb as any, 'public', expectedSchema);
      expect(result.valid).toBe(false);
      const breakingViolations = result.violations.filter((v) => v.type === 'breaking');
      expect(breakingViolations.length).toBeGreaterThan(0);
      expect(breakingViolations.some((v) => v.table === 'posts')).toBe(true);
    });

    it('should detect added tables as warnings', async () => {
      const expectedSchema: SchemaContract = {
        tables: {},
      };

      const result = await testSchemaContract(mockDb as any, 'public', expectedSchema);
      expect(result.valid).toBe(true); // Adding tables is not breaking
      const warningViolations = result.violations.filter((v) => v.type === 'warning');
      expect(warningViolations.length).toBeGreaterThan(0);
    });

    it('should detect removed columns as breaking changes', async () => {
      const expectedSchema: SchemaContract = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: { name: 'id', type: 'text', nullable: false, primaryKey: true },
              email: { name: 'email', type: 'text', nullable: true, primaryKey: false },
              name: { name: 'name', type: 'text', nullable: true, primaryKey: false },
            },
            indexes: {},
            foreignKeys: {},
          },
        },
      };

      const result = await testSchemaContract(mockDb as any, 'public', expectedSchema);
      expect(result.valid).toBe(false);
      const breakingViolations = result.violations.filter((v) => v.type === 'breaking');
      expect(breakingViolations.some((v) => v.message.includes('name'))).toBe(true);
    });

    it('should detect column type changes as breaking changes', async () => {
      const mockDbWithTypeChange = {
        query: async (sql: string, _params: unknown[]) => {
          if (sql.includes('information_schema.columns')) {
            return [
              {
                column_name: 'id',
                data_type: 'integer', // Changed from text
                is_nullable: 'NO',
                column_default: null,
              },
            ];
          }
          return mockDb.query(sql, []);
        },
      };

      const expectedSchema: SchemaContract = {
        tables: {
          users: {
            name: 'users',
            columns: {
              id: { name: 'id', type: 'text', nullable: false, primaryKey: true },
            },
            indexes: {},
            foreignKeys: {},
          },
        },
      };

      const result = await testSchemaContract(mockDbWithTypeChange as any, 'public', expectedSchema);
      expect(result.valid).toBe(false);
      const breakingViolations = result.violations.filter((v) => v.type === 'breaking');
      expect(breakingViolations.some((v) => v.message.includes('type changed'))).toBe(true);
    });

    it('should detect nullable to non-nullable changes as breaking', async () => {
      const mockDbWithNullableChange = {
        query: async (sql: string, _params: unknown[]) => {
          if (sql.includes('information_schema.columns')) {
            return [
              {
                column_name: 'email',
                data_type: 'text',
                is_nullable: 'NO', // Changed from YES
                column_default: null,
              },
            ];
          }
          return mockDb.query(sql, []);
        },
      };

      const expectedSchema: SchemaContract = {
        tables: {
          users: {
            name: 'users',
            columns: {
              email: { name: 'email', type: 'text', nullable: true, primaryKey: false },
            },
            indexes: {},
            foreignKeys: {},
          },
        },
      };

      const result = await testSchemaContract(mockDbWithNullableChange as any, 'public', expectedSchema);
      expect(result.valid).toBe(false);
      const breakingViolations = result.violations.filter((v) => v.type === 'breaking');
      expect(breakingViolations.some((v) => v.message.includes('nullable to non-nullable'))).toBe(true);
    });
  });
});
