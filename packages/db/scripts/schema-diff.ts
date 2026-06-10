import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Schema diff tool for comparing schema versions
 * 
 * This script compares schema snapshots between two versions
 * and outputs added/removed/changed tables and columns.
 */

interface SchemaDiff {
  addedTables: string[];
  removedTables: string[];
  changedTables: TableDiff[];
}

interface TableDiff {
  tableName: string;
  addedColumns: string[];
  removedColumns: string[];
  changedColumns: ColumnChange[];
}

interface ColumnChange {
  columnName: string;
  changeType: 'type' | 'nullable' | 'default';
  from: string;
  to: string;
}

interface SchemaSnapshot {
  tables: Record<string, TableSchema>;
}

interface TableSchema {
  name: string;
  columns: Record<string, ColumnSchema>;
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string | null;
}

/**
 * Diff two schema versions
 * 
 * @param fromVersion - Source version (e.g., '0000')
 * @param toVersion - Target version (e.g., '0001')
 * @param domain - Domain name (e.g., 'calendar', 'tasks', 'drive', 'shared')
 */
export function diffSchemas(
  fromVersion: string,
  toVersion: string,
  domain: string = 'shared'
): SchemaDiff {
  const fromSchema = loadSchemaSnapshot(fromVersion, domain);
  const toSchema = loadSchemaSnapshot(toVersion, domain);

  const result: SchemaDiff = {
    addedTables: [],
    removedTables: [],
    changedTables: [],
  };

  // Find added tables
  for (const tableName of Object.keys(toSchema.tables)) {
    if (!fromSchema.tables[tableName]) {
      result.addedTables.push(tableName);
    }
  }

  // Find removed tables
  for (const tableName of Object.keys(fromSchema.tables)) {
    if (!toSchema.tables[tableName]) {
      result.removedTables.push(tableName);
    }
  }

  // Find changed tables
  for (const tableName of Object.keys(fromSchema.tables)) {
    if (!toSchema.tables[tableName]) {
      continue; // Already reported as removed
    }

    const tableDiff = diffTables(
      fromSchema.tables[tableName],
      toSchema.tables[tableName]
    );

    if (
      tableDiff.addedColumns.length > 0 ||
      tableDiff.removedColumns.length > 0 ||
      tableDiff.changedColumns.length > 0
    ) {
      result.changedTables.push(tableDiff);
    }
  }

  return result;
}

/**
 * Load schema snapshot from Drizzle metadata
 * 
 * @param version - Migration version
 * @param domain - Domain name
 * @returns Schema snapshot
 */
function loadSchemaSnapshot(version: string, domain: string): SchemaSnapshot {
  const drizzlePath = join(__dirname, '..', 'drizzle');
  const domainPath = domain === 'shared' ? drizzlePath : join(drizzlePath, domain);
  const snapshotPath = join(domainPath, 'meta', `${version}_snapshot.json`);

  if (!existsSync(snapshotPath)) {
    throw new Error(`Snapshot not found: ${snapshotPath}`);
  }

  const content = readFileSync(snapshotPath, 'utf-8');
  const snapshot = JSON.parse(content);

  // Convert Drizzle snapshot format to our schema format
  return convertDrizzleSnapshot(snapshot);
}

/**
 * Convert Drizzle snapshot to our schema format
 * 
 * @param drizzleSnapshot - Drizzle snapshot JSON
 * @returns Our schema format
 */
function convertDrizzleSnapshot(drizzleSnapshot: unknown): SchemaSnapshot {
  const snapshot = drizzleSnapshot as { tables?: Record<string, unknown> };
  const tables: Record<string, TableSchema> = {};

  if (!snapshot.tables) {
    return { tables };
  }

  for (const [tableName, tableData] of Object.entries(snapshot.tables)) {
    const table = tableData as { columns?: Record<string, unknown> };
    const columns: Record<string, ColumnSchema> = {};

    if (table.columns) {
      for (const [columnName, columnData] of Object.entries(table.columns)) {
        const column = columnData as {
          name: string;
          type: string;
          notNull: boolean;
          defaultValue?: string | null;
        };
        columns[columnName] = {
          name: column.name,
          type: column.type,
          nullable: !column.notNull,
          defaultValue: column.defaultValue,
        };
      }
    }

    tables[tableName] = {
      name: tableName,
      columns,
    };
  }

  return { tables };
}

/**
 * Diff two table schemas
 * 
 * @param fromTable - Source table
 * @param toTable - Target table
 * @returns Table diff
 */
function diffTables(fromTable: TableSchema, toTable: TableSchema): TableDiff {
  const result: TableDiff = {
    tableName: fromTable.name,
    addedColumns: [],
    removedColumns: [],
    changedColumns: [],
  };

  // Find added columns
  for (const columnName of Object.keys(toTable.columns)) {
    if (!fromTable.columns[columnName]) {
      result.addedColumns.push(columnName);
    }
  }

  // Find removed columns
  for (const columnName of Object.keys(fromTable.columns)) {
    if (!toTable.columns[columnName]) {
      result.removedColumns.push(columnName);
    }
  }

  // Find changed columns
  for (const columnName of Object.keys(fromTable.columns)) {
    if (!toTable.columns[columnName]) {
      continue; // Already reported as removed
    }

    const fromColumn = fromTable.columns[columnName];
    const toColumn = toTable.columns[columnName];

    // Check type changes
    if (fromColumn.type !== toColumn.type) {
      result.changedColumns.push({
        columnName,
        changeType: 'type',
        from: fromColumn.type,
        to: toColumn.type,
      });
    }

    // Check nullable changes
    if (fromColumn.nullable !== toColumn.nullable) {
      result.changedColumns.push({
        columnName,
        changeType: 'nullable',
        from: fromColumn.nullable ? 'nullable' : 'not null',
        to: toColumn.nullable ? 'nullable' : 'not null',
      });
    }

    // Check default value changes
    if (fromColumn.defaultValue !== toColumn.defaultValue) {
      result.changedColumns.push({
        columnName,
        changeType: 'default',
        from: fromColumn.defaultValue ?? 'NULL',
        to: toColumn.defaultValue ?? 'NULL',
      });
    }
  }

  return result;
}

/**
 * Format diff output for display
 * 
 * @param diff - Schema diff
 * @returns Formatted string
 */
export function formatDiff(diff: SchemaDiff): string {
  const lines: string[] = [];

  if (diff.addedTables.length > 0) {
    lines.push('Added Tables:');
    for (const table of diff.addedTables) {
      lines.push(`  + ${table}`);
    }
    lines.push('');
  }

  if (diff.removedTables.length > 0) {
    lines.push('Removed Tables:');
    for (const table of diff.removedTables) {
      lines.push(`  - ${table}`);
    }
    lines.push('');
  }

  if (diff.changedTables.length > 0) {
    lines.push('Changed Tables:');
    for (const tableDiff of diff.changedTables) {
      lines.push(`  ~ ${tableDiff.tableName}`);

      for (const column of tableDiff.addedColumns) {
        lines.push(`    + ${column}`);
      }

      for (const column of tableDiff.removedColumns) {
        lines.push(`    - ${column}`);
      }

      for (const change of tableDiff.changedColumns) {
        lines.push(`    ~ ${change.columnName}: ${change.changeType} changed from ${change.from} to ${change.to}`);
      }

      lines.push('');
    }
  }

  if (lines.length === 0) {
    lines.push('No schema changes detected.');
  }

  return lines.join('\n');
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: tsx scripts/schema-diff.ts <fromVersion> <toVersion> [domain]');
    console.error('Example: tsx scripts/schema-diff.ts 0000 0001 calendar');
    process.exit(1);
  }

  const fromVersion = args[0];
  const toVersion = args[1];
  const domain = args[2] || 'shared';

  try {
    const diff = diffSchemas(fromVersion, toVersion, domain);
    console.log(formatDiff(diff));
  } catch (error) {
    console.error('Error diffing schemas:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
