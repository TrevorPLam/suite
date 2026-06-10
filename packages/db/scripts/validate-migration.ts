import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface MigrationError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates migration SQL files for common anti-patterns.
 * 
 * Forbidden operations:
 * - DROP COLUMN without contract phase marker
 * - ALTER COLUMN TYPE without expand phase marker
 * - CREATE INDEX without CONCURRENTLY
 * - Missing phase markers in migration files
 */
export function validateMigration(migrationPath: string): MigrationError[] {
  const errors: MigrationError[] = [];
  const content = readFileSync(migrationPath, 'utf-8');
  const lines = content.split('\n');

  // Check for phase markers
  const hasExpandMarker = content.toLowerCase().includes('phase: expand') || 
                          content.toLowerCase().includes('-- expand phase');
  const hasContractMarker = content.toLowerCase().includes('phase: contract') || 
                             content.toLowerCase().includes('-- contract phase');

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    const lineNum = index + 1;

    // Check for DROP COLUMN
    if (trimmedLine.toUpperCase().includes('DROP COLUMN')) {
      if (!hasContractMarker) {
        errors.push({
          file: migrationPath,
          line: lineNum,
          message: 'DROP COLUMN found without contract phase marker. Use expand-contract pattern.',
          severity: 'error',
        });
      }
    }

    // Check for ALTER COLUMN TYPE
    if (trimmedLine.toUpperCase().includes('ALTER COLUMN') && 
        trimmedLine.toUpperCase().includes('TYPE')) {
      if (!hasExpandMarker) {
        errors.push({
          file: migrationPath,
          line: lineNum,
          message: 'ALTER COLUMN TYPE found without expand phase marker. Use expand-contract pattern.',
          severity: 'error',
        });
      }
    }

    // Check for CREATE INDEX without CONCURRENTLY
    if (trimmedLine.toUpperCase().startsWith('CREATE INDEX') && 
        !trimmedLine.toUpperCase().includes('CONCURRENTLY')) {
      errors.push({
        file: migrationPath,
        line: lineNum,
        message: 'CREATE INDEX without CONCURRENTLY. Use CONCURRENTLY to avoid blocking.',
        severity: 'warning',
      });
    }

    // Check for DROP TABLE
    if (trimmedLine.toUpperCase().includes('DROP TABLE')) {
      if (!hasContractMarker) {
        errors.push({
          file: migrationPath,
          line: lineNum,
          message: 'DROP TABLE found without contract phase marker. Use expand-contract pattern.',
          severity: 'error',
        });
      }
    }

    // Check for SET NOT NULL without contract marker
    if (trimmedLine.toUpperCase().includes('SET NOT NULL')) {
      if (!hasContractMarker) {
        errors.push({
          file: migrationPath,
          line: lineNum,
          message: 'SET NOT NULL found without contract phase marker. Ensure backfill is complete.',
          severity: 'error',
        });
      }
    }
  });

  // Warn if no phase markers at all
  if (!hasExpandMarker && !hasContractMarker) {
    errors.push({
      file: migrationPath,
      line: 1,
      message: 'Migration file missing phase marker. Add "-- PHASE: EXPAND" or "-- PHASE: CONTRACT".',
      severity: 'warning',
    });
  }

  return errors;
}

/**
 * Validates all migration files in a directory.
 */
export function validateMigrations(dir: string): MigrationError[] {
  const allErrors: MigrationError[] = [];
  
  try {
    const files = readdirSync(dir);
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    for (const file of sqlFiles) {
      const migrationPath = join(dir, file);
      const errors = validateMigration(migrationPath);
      allErrors.push(...errors);
    }
  } catch (error) {
    console.error(`Error reading migration directory: ${error}`);
  }

  return allErrors;
}

/**
 * Prints validation results to console.
 */
export function printValidationResults(errors: MigrationError[]): void {
  if (errors.length === 0) {
    console.log('✅ All migrations passed validation');
    return;
  }

  const errorsByFile = errors.reduce((acc, error) => {
    if (!acc[error.file]) {
      acc[error.file] = [];
    }
    acc[error.file].push(error);
    return acc;
  }, {} as Record<string, MigrationError[]>);

  console.log(`❌ Found ${errors.length} validation issues:\n`);

  for (const [file, fileErrors] of Object.entries(errorsByFile)) {
    console.log(`${file}:`);
    for (const error of fileErrors) {
      const icon = error.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} Line ${error.line}: ${error.message}`);
    }
    console.log('');
  }

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  
  console.log(`Summary: ${errorCount} errors, ${warningCount} warnings`);
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const migrationDir = args[0] || './drizzle';
  
  const errors = validateMigrations(migrationDir);
  printValidationResults(errors);
  
  const hasErrors = errors.some(e => e.severity === 'error');
  process.exit(hasErrors ? 1 : 0);
}
