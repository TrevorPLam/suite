/**
 * Crypto error handling system
 * Provides structured error codes, taxonomy, and context for cryptographic operations
 */

/**
 * Error codes for cryptographic operations
 * Each error code identifies a specific type of failure
 */
export enum CryptoErrorCode {
  // Encryption/Decryption errors
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  INVALID_IV = 'INVALID_IV',
  INVALID_CIPHERTEXT = 'INVALID_CIPHERTEXT',

  // Key generation errors
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
  KEY_DERIVATION_FAILED = 'KEY_DERIVATION_FAILED',
  INVALID_KEY = 'INVALID_KEY',
  KEY_EXPORT_FAILED = 'KEY_EXPORT_FAILED',
  KEY_IMPORT_FAILED = 'KEY_IMPORT_FAILED',

  // Algorithm errors
  INVALID_ALGORITHM = 'INVALID_ALGORITHM',
  UNSUPPORTED_ALGORITHM = 'UNSUPPORTED_ALGORITHM',
  ALGORITHM_NOT_AVAILABLE = 'ALGORITHM_NOT_AVAILABLE',

  // ECDH errors
  ECDH_DERIVATION_FAILED = 'ECDH_DERIVATION_FAILED',
  INVALID_PUBLIC_KEY = 'INVALID_PUBLIC_KEY',
  INVALID_PRIVATE_KEY = 'INVALID_PRIVATE_KEY',

  // Serialization errors
  SERIALIZATION_FAILED = 'SERIALIZATION_FAILED',
  DESERIALIZATION_FAILED = 'DESERIALIZATION_FAILED',
  INVALID_JWK = 'INVALID_JWK',
  INVALID_RAW_FORMAT = 'INVALID_RAW_FORMAT',

  // General errors
  OPERATION_FAILED = 'OPERATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
}

/**
 * Error categories for classification
 * RETRIABLE: Errors that may succeed on retry (transient failures)
 * NON_RETRIABLE: Errors that will not succeed on retry (permanent failures)
 */
export enum ErrorCategory {
  RETRIABLE = 'RETRIABLE',
  NON_RETRIABLE = 'NON_RETRIABLE',
}

/**
 * Error context information
 * Provides additional details about the error for debugging
 */
export interface ErrorContext {
  operation?: string; // The operation being performed (e.g., 'encrypt', 'decrypt')
  algorithm?: string; // The algorithm being used (e.g., 'AES-GCM', 'X25519')
  keyId?: string; // Identifier for the key (if applicable)
  [key: string]: string | number | boolean | undefined; // Additional context fields
}

/**
 * CryptoError class
 * Extends Error with structured error information
 */
export class CryptoError extends Error {
  public readonly code: CryptoErrorCode;
  public readonly category: ErrorCategory;
  public readonly context: ErrorContext;
  public readonly timestamp: number;

  constructor(
    code: CryptoErrorCode,
    message: string,
    category: ErrorCategory = ErrorCategory.NON_RETRIABLE,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'CryptoError';
    this.code = code;
    this.category = category;
    this.context = context;
    this.timestamp = Date.now();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CryptoError);
    }
  }

  /**
   * Checks if the error is retriable
   */
  isRetriable(): boolean {
    return this.category === ErrorCategory.RETRIABLE;
  }

  /**
   * Returns a formatted error message with context
   */
  toDetailedString(): string {
    const contextStr = Object.entries(this.context)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(', ');
    const contextPrefix = contextStr ? ` [${contextStr}]` : '';
    return `[${this.code}] ${this.message}${contextPrefix}`;
  }
}

/**
 * Helper function to check if an error is a CryptoError
 */
export function isCryptoError(error: unknown): error is CryptoError {
  return error instanceof CryptoError;
}

/**
 * Helper function to check if an error is retriable
 */
export function isRetriable(error: unknown): boolean {
  return isCryptoError(error) && error.isRetriable();
}

/**
 * Maps error codes to categories
 */
const ERROR_CODE_CATEGORIES: Record<CryptoErrorCode, ErrorCategory> = {
  // Most crypto errors are non-retriable as they indicate permanent issues
  [CryptoErrorCode.ENCRYPTION_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.DECRYPTION_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_IV]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_CIPHERTEXT]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.KEY_GENERATION_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.KEY_DERIVATION_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_KEY]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.KEY_EXPORT_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.KEY_IMPORT_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_ALGORITHM]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.UNSUPPORTED_ALGORITHM]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.ALGORITHM_NOT_AVAILABLE]: ErrorCategory.RETRIABLE, // May be temporary
  [CryptoErrorCode.ECDH_DERIVATION_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_PUBLIC_KEY]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_PRIVATE_KEY]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.SERIALIZATION_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.DESERIALIZATION_FAILED]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_JWK]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.INVALID_RAW_FORMAT]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.OPERATION_FAILED]: ErrorCategory.RETRIABLE, // May be transient
  [CryptoErrorCode.INVALID_INPUT]: ErrorCategory.NON_RETRIABLE,
  [CryptoErrorCode.NOT_SUPPORTED]: ErrorCategory.NON_RETRIABLE,
};

/**
 * Creates a CryptoError with automatic category mapping
 */
export function createCryptoError(
  code: CryptoErrorCode,
  message: string,
  context: ErrorContext = {}
): CryptoError {
  const category = ERROR_CODE_CATEGORIES[code];
  return new CryptoError(code, message, category, context);
}

/**
 * Wraps a generic error in a CryptoError
 */
export function wrapError(
  error: unknown,
  code: CryptoErrorCode,
  context: ErrorContext = {}
): CryptoError {
  const message = error instanceof Error ? error.message : String(error);
  return createCryptoError(code, message, context);
}
