import { Database } from '../database.interface.js';

/**
 * Schema contract testing for detecting breaking changes
 * 
 * This module validates schema contracts by comparing current schema
 * against expected schema to detect breaking changes before deployment.
 */

export interface SchemaTable {
  name: string;
  columns: Record<string, SchemaColumn>;
  indexes: Record<string, SchemaIndex>;
  foreignKeys: Record<string, SchemaForeignKey>;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string | null;
}

export interface SchemaIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface SchemaForeignKey {
  name: string;
  tableFrom: string;
  tableTo: string;
  columnsFrom: string[];
  columnsTo: string[];
  onDelete: string;
  onUpdate: string;
}

export interface SchemaContract {
  tables: Record<string, SchemaTable>;
}

export interface ContractViolation {
  type: 'breaking' | 'warning';
  table: string;
  message: string;
  detail?: string;
}

export interface ContractTestResult {
  valid: boolean;
  violations: ContractViolation[];
}

/**
 * Test schema contract by comparing current schema with expected schema
 * 
 * @param db - Database instance
 * @param domain - Domain name
 * @param expectedSchema - Expected schema contract
 * @returns Contract test result with violations
 */
export async function testSchemaContract(
  db: Database,
  domain: string,
  expectedSchema: SchemaContract
): Promise<ContractTestResult> {
  const currentSchema = await extractCurrentSchema(db, domain);
  const violations: ContractViolation[] = [];

  // Check for removed tables (breaking)
  for (const tableName of Object.keys(expectedSchema.tables)) {
    if (!currentSchema.tables[tableName]) {
      violations.push({
        type: 'breaking',
        table: tableName,
        message: `Table ${tableName} was removed`,
      });
    }
  }

  // Check for new tables (warning)
  for (const tableName of Object.keys(currentSchema.tables)) {
    if (!expectedSchema.tables[tableName]) {
      violations.push({
        type: 'warning',
        table: tableName,
        message: `Table ${tableName} was added (not in expected schema)`,
      });
    }
  }

  // Check each table for breaking changes
  for (const tableName of Object.keys(expectedSchema.tables)) {
    const expectedTable = expectedSchema.tables[tableName];
    const currentTable = currentSchema.tables[tableName];

    if (!currentTable || !expectedTable) {
      continue; // Already reported as removed
    }

    // Check for removed columns (breaking)
    for (const columnName of Object.keys(expectedTable.columns)) {
      if (!currentTable.columns[columnName]) {
        violations.push({
          type: 'breaking',
          table: tableName,
          message: `Column ${tableName}.${columnName} was removed`,
        });
      }
    }

    // Check for column type changes (breaking)
    for (const columnName of Object.keys(expectedTable.columns)) {
      const expectedColumn = expectedTable.columns[columnName];
      const currentColumn = currentTable.columns[columnName];

      if (currentColumn && expectedColumn && currentColumn.type !== expectedColumn.type) {
        violations.push({
          type: 'breaking',
          table: tableName,
          message: `Column ${tableName}.${columnName} type changed from ${expectedColumn.type} to ${currentColumn.type}`,
        });
      }
    }

    // Check for nullable to non-nullable changes (breaking)
    for (const columnName of Object.keys(expectedTable.columns)) {
      const expectedColumn = expectedTable.columns[columnName];
      const currentColumn = currentTable.columns[columnName];

      if (currentColumn && expectedColumn && expectedColumn.nullable && !currentColumn.nullable) {
        violations.push({
          type: 'breaking',
          table: tableName,
          message: `Column ${tableName}.${columnName} changed from nullable to non-nullable`,
        });
      }
    }

    // Check for removed indexes (warning)
    for (const indexName of Object.keys(expectedTable.indexes)) {
      if (!currentTable.indexes[indexName]) {
        violations.push({
          type: 'warning',
          table: tableName,
          message: `Index ${indexName} on table ${tableName} was removed`,
        });
      }
    }

    // Check for removed foreign keys (breaking)
    for (const fkName of Object.keys(expectedTable.foreignKeys)) {
      if (!currentTable.foreignKeys[fkName]) {
        violations.push({
          type: 'breaking',
          table: tableName,
          message: `Foreign key ${fkName} on table ${tableName} was removed`,
        });
      }
    }
  }

  return {
    valid: violations.filter((v) => v.type === 'breaking').length === 0,
    violations,
  };
}

/**
 * Extract current schema from database
 * 
 * @param db - Database instance
 * @param domain - Domain name (for schema prefix if applicable)
 * @returns Current schema contract
 */
async function extractCurrentSchema(
  db: Database,
  domain: string
): Promise<SchemaContract> {
  const tables: Record<string, SchemaTable> = {};

  // Get all tables in the domain schema
  const schemaName = domain === 'shared' ? 'public' : domain;
  const tableRows = await db.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
     AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
    [schemaName]
  );

  if (!tableRows || tableRows.length === 0) {
    return { tables };
  }

  for (const row of tableRows as { table_name: string }[]) {
    const tableName = row.table_name;
    tables[tableName] = await extractTableSchema(db, schemaName, tableName);
  }

  return { tables };
}

/**
 * Extract schema for a single table
 * 
 * @param db - Database instance
 * @param schemaName - Schema name
 * @param tableName - Table name
 * @returns Table schema
 */
async function extractTableSchema(
  db: Database,
  schemaName: string,
  tableName: string
): Promise<SchemaTable> {
  // Extract columns
  const columnRows = await db.query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = $1
     AND table_name = $2
     ORDER BY ordinal_position`,
    [schemaName, tableName]
  );

  const columns: Record<string, SchemaColumn> = {};
  if (columnRows) {
    for (const row of columnRows as { column_name: string; data_type: string; is_nullable: string; column_default: string | null }[]) {
      columns[row.column_name] = {
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        primaryKey: false, // Will be set below
        defaultValue: row.column_default || null,
      };
    }
  }

  // Extract primary key
  const pkRows = await db.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = $1
     AND tc.table_name = $2
     AND tc.constraint_type = 'PRIMARY KEY'`,
    [schemaName, tableName]
  );

  if (pkRows && pkRows.length > 0) {
    for (const row of pkRows as { column_name: string }[]) {
      const col = columns[row.column_name];
      if (col) {
        col.primaryKey = true;
      }
    }
  }

  // Extract indexes
  const indexRows = await db.query(
    `SELECT indexname, indexdef
     FROM pg_indexes
     WHERE schemaname = $1
     AND tablename = $2`,
    [schemaName, tableName]
  );

  const indexes: Record<string, SchemaIndex> = {};
  if (indexRows) {
    for (const row of indexRows as { indexname: string; indexdef: string }[]) {
      const isUnique = row.indexdef.includes('CREATE UNIQUE INDEX');
      indexes[row.indexname] = {
        name: row.indexname,
        columns: [], // Simplified - would need parsing of indexdef
        unique: isUnique,
      };
    }
  }

  // Extract foreign keys
  const fkRows = await db.query(
    `SELECT
       tc.constraint_name,
       kcu.column_name,
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name,
       rc.delete_rule,
       rc.update_rule
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
     JOIN information_schema.referential_constraints rc
       ON rc.constraint_name = tc.constraint_name
     WHERE tc.table_schema = $1
     AND tc.table_name = $2
     AND tc.constraint_type = 'FOREIGN KEY'`,
    [schemaName, tableName]
  );

  const foreignKeys: Record<string, SchemaForeignKey> = {};
  if (fkRows) {
    for (const row of fkRows as { constraint_name: string; column_name: string; foreign_table_name: string; foreign_column_name: string; delete_rule: string; update_rule: string }[]) {
      foreignKeys[row.constraint_name] = {
        name: row.constraint_name,
        tableFrom: tableName,
        tableTo: row.foreign_table_name,
        columnsFrom: [row.column_name],
        columnsTo: [row.foreign_column_name],
        onDelete: row.delete_rule,
        onUpdate: row.update_rule,
      };
    }
  }

  return {
    name: tableName,
    columns,
    indexes,
    foreignKeys,
  };
}
