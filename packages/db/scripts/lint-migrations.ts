import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LinterConfig {
  forbiddenOperations: Array<{
    name: string;
    pattern: string;
    description: string;
    severity: 'error' | 'warning';
    exception: string;
  }>;
  requiredPatterns: Array<{
    name: string;
    pattern: string;
    description: string;
    severity: 'error' | 'warning';
    exception: string;
  }>;
  excludedMigrations: string[];
  migrationDirectory: string;
}

interface LinterResult {
  file: string;
  errors: Array<{
    rule: string;
    message: string;
    line?: number;
  }>;
  warnings: Array<{
    rule: string;
    message: string;
    line?: number;
  }>;
}

function loadConfig(): LinterConfig {
  const configPath = join(__dirname, '..', '.migration-linter.json');
  if (!existsSync(configPath)) {
    throw new Error('Linter configuration file not found: .migration-linter.json');
  }
  const configContent = readFileSync(configPath, 'utf-8');
  return JSON.parse(configContent) as LinterConfig;
}

function isExcluded(filename: string, excludedPatterns: string[]): boolean {
  return excludedPatterns.some(pattern => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(filename);
  });
}

function hasException(filename: string, content: string, exception: string): boolean {
  // Check filename for exception patterns
  if (exception.includes('contract') && filename.toLowerCase().includes('contract')) {
    return true;
  }
  
  // Check content for phase comments
  if (exception.includes('-- contract phase comment') && /-- contract phase/i.test(content)) {
    return true;
  }
  
  if (exception.includes('-- expand phase comment') && /-- expand phase/i.test(content)) {
    return true;
  }
  
  if (exception.includes('initial schema creation') && filename.match(/^0000_|^0001_/)) {
    return true;
  }
  
  return false;
}

function checkForbiddenOperations(
  content: string,
  filename: string,
  operations: LinterConfig['forbiddenOperations']
): LinterResult['errors'] {
  const errors: LinterResult['errors'] = [];
  const lines = content.split('\n');
  
  for (const op of operations) {
    const regex = new RegExp(op.pattern, 'gi');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (regex.test(line)) {
        if (!hasException(filename, content, op.exception)) {
          errors.push({
            rule: op.name,
            message: op.description,
            line: i + 1
          });
        }
      }
    }
  }
  
  return errors;
}

function checkRequiredPatterns(
  content: string,
  filename: string,
  patterns: LinterConfig['requiredPatterns']
): LinterResult['warnings'] {
  const warnings: LinterResult['warnings'] = [];
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.pattern, 'gi');
    
    if (!regex.test(content)) {
      if (!hasException(filename, content, pattern.exception)) {
        warnings.push({
          rule: pattern.name,
          message: pattern.description
        });
      }
    }
  }
  
  return warnings;
}

function lintMigrationFile(
  filepath: string,
  config: LinterConfig
): LinterResult {
  const filename = filepath.split('/').pop() || filepath;
  const content = readFileSync(filepath, 'utf-8');
  
  const result: LinterResult = {
    file: filepath,
    errors: [],
    warnings: []
  };
  
  // Check forbidden operations
  result.errors = checkForbiddenOperations(content, filename, config.forbiddenOperations);
  
  // Check required patterns
  result.warnings = checkRequiredPatterns(content, filename, config.requiredPatterns);
  
  return result;
}

function findMigrationFiles(directory: string): string[] {
  const files: string[] = [];
  
  if (!existsSync(directory)) {
    return files;
  }
  
  const entries = readdirSync(directory, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively search subdirectories (e.g., calendar/, drive/, tasks/)
      files.push(...findMigrationFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      files.push(fullPath);
    }
  }
  
  return files.sort();
}

function lintMigrations(): LinterResult[] {
  const config = loadConfig();
  const migrationDir = join(__dirname, '..', config.migrationDirectory);
  const allFiles = findMigrationFiles(migrationDir);
  
  // Filter out excluded migrations
  const filesToLint = allFiles.filter(file => {
    const filename = file.split('/').pop() || file;
    return !isExcluded(filename, config.excludedMigrations);
  });
  
  const results: LinterResult[] = [];
  
  for (const file of filesToLint) {
    const result = lintMigrationFile(file, config);
    results.push(result);
  }
  
  return results;
}

function printResults(results: LinterResult[]): void {
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const result of results) {
    if (result.errors.length === 0 && result.warnings.length === 0) {
      continue;
    }
    
    console.log(`\n📄 ${result.file}`);
    
    for (const error of result.errors) {
      console.log(`  ❌ [${error.rule}] ${error.message}${error.line ? ` (line ${error.line})` : ''}`);
      totalErrors++;
    }
    
    for (const warning of result.warnings) {
      console.log(`  ⚠️  [${warning.rule}] ${warning.message}`);
      totalWarnings++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  console.log('='.repeat(60));
  
  if (totalErrors > 0) {
    console.log('\n❌ Migration linter failed with errors.');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('\n⚠️  Migration linter passed with warnings.');
    process.exit(0);
  } else {
    console.log('\n✅ Migration linter passed.');
    process.exit(0);
  }
}

// Run linter
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = lintMigrations();
  printResults(results);
}

export { lintMigrations, LinterResult, LinterConfig };
