/**
 * Query Validator for SQL Injection Prevention
 * 
 * Validates SQL queries before execution to prevent injection attacks.
 * Checks for suspicious patterns, query length limits, and other security concerns.
 */

/**
 * SQL injection patterns to detect
 * These are common SQL injection attack vectors
 */
const SQL_INJECTION_PATTERNS = [
  // Comment-based injection
  /--.*$/gm,
  /\/\*.*\*\//gm,
  // Union-based injection
  /\bUNION\s+(ALL\s+)?SELECT\b/gi,
  // Boolean-based injection
  /\bOR\s+1\s*=\s*1\b/gi,
  /\bAND\s+1\s*=\s*1\b/gi,
  // Time-based injection
  /\bWAITFOR\s+DELAY\b/gi,
  /\bSLEEP\s*\(/gi,
  // Stacked queries
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE)\b/gi,
  // Hex-encoded strings (common in evasion)
  /0x[0-9a-fA-F]+/g,
  // Conditional statements in data
  /\bIF\s*\(/gi,
  // EXEC/EXECUTE commands
  /\bEXEC\s*\(/gi,
  /\bEXECUTE\s*\(/gi,
];

/**
 * Maximum allowed query length (characters)
 * Prevents excessively long queries that could indicate attacks
 */
const MAX_QUERY_LENGTH = 10000;

/**
 * Maximum allowed parameter count
 * Prevents parameter flooding attacks
 */
const MAX_PARAM_COUNT = 100;

/**
 * Query validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a SQL query for security concerns
 * 
 * @param query - The SQL query to validate
 * @returns ValidationResult indicating if the query is safe
 */
export function validateQuery(query: string): ValidationResult {
  // Check query length
  if (query.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query length exceeds maximum allowed length of ${MAX_QUERY_LENGTH} characters`,
    };
  }

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(query)) {
      return {
        valid: false,
        error: `Query contains suspicious pattern matching: ${pattern.source}`,
      };
    }
  }

  // Check for multiple statements (stacked queries)
  const statementCount = query.split(';').filter(s => s.trim().length > 0).length;
  if (statementCount > 1) {
    return {
      valid: false,
      error: 'Multiple SQL statements detected (stacked queries not allowed)',
    };
  }

  return { valid: true };
}

/**
 * Validate query parameters
 * 
 * @param params - Array of query parameters
 * @returns ValidationResult indicating if parameters are safe
 */
export function validateParams(params?: unknown[]): ValidationResult {
  if (!params) {
    return { valid: true };
  }

  if (params.length > MAX_PARAM_COUNT) {
    return {
      valid: false,
      error: `Parameter count exceeds maximum allowed count of ${MAX_PARAM_COUNT}`,
    };
  }

  // Check for suspicious parameter types
  for (const param of params) {
    if (param === null || param === undefined) {
      continue;
    }

    // Reject objects that might contain SQL
    if (typeof param === 'object' && !Array.isArray(param)) {
      return {
        valid: false,
        error: 'Object parameters are not allowed (potential injection vector)',
      };
    }

    // Check string parameters for injection patterns
    if (typeof param === 'string') {
      for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(param)) {
          return {
            valid: false,
            error: `Parameter contains suspicious pattern matching: ${pattern.source}`,
          };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Validate both query and parameters together
 * 
 * @param query - The SQL query to validate
 * @param params - Optional query parameters
 * @returns ValidationResult indicating if the query and parameters are safe
 */
export function validateQueryWithParams(query: string, params?: unknown[]): ValidationResult {
  const queryResult = validateQuery(query);
  if (!queryResult.valid) {
    return queryResult;
  }

  const paramsResult = validateParams(params);
  if (!paramsResult.valid) {
    return paramsResult;
  }

  return { valid: true };
}
