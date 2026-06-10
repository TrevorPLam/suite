import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface MigrationPhase {
  file: string;
  phase: 'expand' | 'contract' | 'unknown';
  lineNumber: number;
}

interface VerificationError {
  file: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Verifies that migrations follow the expand-contract pattern correctly.
 * 
 * Checks:
 * - Each migration has a clear phase marker
 * - Phases are in correct order (expand before contract)
 * - Contract migrations reference their expand counterpart
 */
export function verifyMigration(migrationPath: string): VerificationError[] {
  const errors: VerificationError[] = [];
  const content = readFileSync(migrationPath, 'utf-8');
  const lines = content.split('\n');

  // Detect phase
  let phase: 'expand' | 'contract' | 'unknown' = 'unknown';

  lines.forEach((line) => {
    const trimmedLine = line.trim().toLowerCase();
    
    if (trimmedLine.includes('phase: expand') || trimmedLine.includes('-- expand phase')) {
      phase = 'expand';
    } else if (trimmedLine.includes('phase: contract') || trimmedLine.includes('-- contract phase')) {
      phase = 'contract';
    }
  });

  // Check for missing phase marker
  if (phase === 'unknown') {
    errors.push({
      file: migrationPath,
      message: 'Migration missing phase marker. Add "-- PHASE: EXPAND" or "-- PHASE: CONTRACT".',
      severity: 'error',
    });
    return errors;
  }

  // Contract phase should reference expand phase
  if (phase === 'contract') {
    const hasReference = content.toLowerCase().includes('expand') || 
                        content.toLowerCase().includes('backfill') ||
                        content.toLowerCase().includes('migrate');
    
    if (!hasReference) {
      errors.push({
        file: migrationPath,
        message: 'Contract phase migration should reference the corresponding expand phase or backfill.',
        severity: 'warning',
      });
    }
  }

  // Expand phase should not contain destructive operations
  if (phase === 'expand') {
    const hasDrop = content.toUpperCase().includes('DROP COLUMN') || 
                    content.toUpperCase().includes('DROP TABLE');
    
    if (hasDrop) {
      errors.push({
        file: migrationPath,
        message: 'Expand phase should not contain DROP operations. Move to contract phase.',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Verifies that migrations are in correct order (expand before contract).
 */
export function verifyMigrationOrder(dir: string): VerificationError[] {
  const errors: VerificationError[] = [];
  const migrations: MigrationPhase[] = [];

  try {
    const files = readdirSync(dir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      const migrationPath = join(dir, file);
      const content = readFileSync(migrationPath, 'utf-8');
      
      let phase: 'expand' | 'contract' | 'unknown' = 'unknown';
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmedLine = line.trim().toLowerCase();
        if (trimmedLine.includes('phase: expand') || trimmedLine.includes('-- expand phase')) {
          phase = 'expand';
          break;
        } else if (trimmedLine.includes('phase: contract') || trimmedLine.includes('-- contract phase')) {
          phase = 'contract';
          break;
        }
      }

      migrations.push({ file, phase, lineNumber: 0 });
    }

    // Check for contract before expand (out of order)
    let seenContract = false;
    for (const migration of migrations) {
      if (migration.phase === 'contract') {
        seenContract = true;
      } else if (migration.phase === 'expand' && seenContract) {
        errors.push({
          file: migration.file,
          message: 'Expand phase migration found after contract phase. Migrations should be ordered expand -> contract.',
          severity: 'error',
        });
      }
    }
  } catch (error) {
    console.error(`Error reading migration directory: ${error}`);
  }

  return errors;
}

/**
 * Verifies all migrations in a directory.
 */
export function verifyMigrations(dir: string): VerificationError[] {
  const allErrors: VerificationError[] = [];
  
  // Verify individual migrations
  try {
    const files = readdirSync(dir);
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    for (const file of sqlFiles) {
      const migrationPath = join(dir, file);
      const errors = verifyMigration(migrationPath);
      allErrors.push(...errors);
    }
  } catch (error) {
    console.error(`Error reading migration directory: ${error}`);
  }

  // Verify migration order
  const orderErrors = verifyMigrationOrder(dir);
  allErrors.push(...orderErrors);

  return allErrors;
}

/**
 * Prints verification results to console.
 */
export function printVerificationResults(errors: VerificationError[]): void {
  if (errors.length === 0) {
    console.log('✅ All migrations passed verification');
    return;
  }

  const errorsByFile = errors.reduce((acc, error) => {
    if (!acc[error.file]) {
      acc[error.file] = [];
    }
    acc[error.file].push(error);
    return acc;
  }, {} as Record<string, VerificationError[]>);

  console.log(`❌ Found ${errors.length} verification issues:\n`);

  for (const [file, fileErrors] of Object.entries(errorsByFile)) {
    console.log(`${file}:`);
    for (const error of fileErrors) {
      const icon = error.severity === 'error' ? '❌' : '⚠️';
      console.log(`  ${icon} ${error.message}`);
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
  
  const errors = verifyMigrations(migrationDir);
  printVerificationResults(errors);
  
  const hasErrors = errors.some(e => e.severity === 'error');
  process.exit(hasErrors ? 1 : 0);
}
