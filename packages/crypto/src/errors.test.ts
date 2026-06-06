/**
 * Tests for crypto error handling system
 */

import { describe, it, expect } from 'vitest';
import {
  CryptoError,
  CryptoErrorCode,
  ErrorCategory,
  ErrorContext,
  createCryptoError,
  isCryptoError,
  isRetriable,
  wrapError,
} from './errors.js';

describe('CryptoError', () => {
  it('should create a CryptoError with all properties', () => {
    const context: ErrorContext = {
      operation: 'encrypt',
      algorithm: 'AES-GCM',
      keyId: 'test-key-123',
    };
    const error = new CryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Failed to encrypt data',
      ErrorCategory.NON_RETRIABLE,
      context
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CryptoError');
    expect(error.code).toBe(CryptoErrorCode.ENCRYPTION_FAILED);
    expect(error.message).toBe('Failed to encrypt data');
    expect(error.category).toBe(ErrorCategory.NON_RETRIABLE);
    expect(error.context).toEqual(context);
    expect(error.timestamp).toBeTypeOf('number');
  });

  it('should isRetriable return true for retriable errors', () => {
    const error = new CryptoError(
      CryptoErrorCode.OPERATION_FAILED,
      'Operation failed',
      ErrorCategory.RETRIABLE
    );
    expect(error.isRetriable()).toBe(true);
  });

  it('should isRetriable return false for non-retriable errors', () => {
    const error = new CryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Encryption failed',
      ErrorCategory.NON_RETRIABLE
    );
    expect(error.isRetriable()).toBe(false);
  });

  it('should toDetailedString include context', () => {
    const context: ErrorContext = {
      operation: 'encrypt',
      algorithm: 'AES-GCM',
    };
    const error = new CryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Failed to encrypt data',
      ErrorCategory.NON_RETRIABLE,
      context
    );
    const detailed = error.toDetailedString();
    expect(detailed).toContain('[ENCRYPTION_FAILED]');
    expect(detailed).toContain('Failed to encrypt data');
    expect(detailed).toContain('operation');
    expect(detailed).toContain('encrypt');
  });

  it('should toDetailedString work without context', () => {
    const error = new CryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Failed to encrypt data'
    );
    const detailed = error.toDetailedString();
    expect(detailed).toBe('[ENCRYPTION_FAILED] Failed to encrypt data');
  });
});

describe('isCryptoError', () => {
  it('should return true for CryptoError instances', () => {
    const error = new CryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Test error'
    );
    expect(isCryptoError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Test error');
    expect(isCryptoError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isCryptoError(null)).toBe(false);
    expect(isCryptoError(undefined)).toBe(false);
    expect(isCryptoError('string')).toBe(false);
    expect(isCryptoError(123)).toBe(false);
  });
});

describe('isRetriable', () => {
  it('should return true for retriable CryptoError', () => {
    const error = new CryptoError(
      CryptoErrorCode.OPERATION_FAILED,
      'Test error',
      ErrorCategory.RETRIABLE
    );
    expect(isRetriable(error)).toBe(true);
  });

  it('should return false for non-retriable CryptoError', () => {
    const error = new CryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Test error',
      ErrorCategory.NON_RETRIABLE
    );
    expect(isRetriable(error)).toBe(false);
  });

  it('should return false for non-CryptoError', () => {
    const error = new Error('Test error');
    expect(isRetriable(error)).toBe(false);
  });
});

describe('createCryptoError', () => {
  it('should create CryptoError with automatic category mapping', () => {
    const error = createCryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Failed to encrypt',
      { operation: 'encrypt' }
    );
    expect(error).toBeInstanceOf(CryptoError);
    expect(error.code).toBe(CryptoErrorCode.ENCRYPTION_FAILED);
    expect(error.category).toBe(ErrorCategory.NON_RETRIABLE);
    expect(error.context).toEqual({ operation: 'encrypt' });
  });

  it('should map ALGORITHM_NOT_AVAILABLE to RETRIABLE', () => {
    const error = createCryptoError(
      CryptoErrorCode.ALGORITHM_NOT_AVAILABLE,
      'Algorithm not available'
    );
    expect(error.category).toBe(ErrorCategory.RETRIABLE);
  });

  it('should map OPERATION_FAILED to RETRIABLE', () => {
    const error = createCryptoError(
      CryptoErrorCode.OPERATION_FAILED,
      'Operation failed'
    );
    expect(error.category).toBe(ErrorCategory.RETRIABLE);
  });

  it('should map ENCRYPTION_FAILED to NON_RETRIABLE', () => {
    const error = createCryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      'Encryption failed'
    );
    expect(error.category).toBe(ErrorCategory.NON_RETRIABLE);
  });
});

describe('wrapError', () => {
  it('should wrap Error in CryptoError', () => {
    const originalError = new Error('Original error message');
    const wrapped = wrapError(
      originalError,
      CryptoErrorCode.ENCRYPTION_FAILED,
      { operation: 'encrypt' }
    );
    expect(wrapped).toBeInstanceOf(CryptoError);
    expect(wrapped.code).toBe(CryptoErrorCode.ENCRYPTION_FAILED);
    expect(wrapped.message).toBe('Original error message');
    expect(wrapped.context).toEqual({ operation: 'encrypt' });
  });

  it('should wrap string in CryptoError', () => {
    const wrapped = wrapError(
      'String error',
      CryptoErrorCode.ENCRYPTION_FAILED
    );
    expect(wrapped).toBeInstanceOf(CryptoError);
    expect(wrapped.message).toBe('String error');
  });

  it('should wrap unknown in CryptoError', () => {
    const wrapped = wrapError(
      null,
      CryptoErrorCode.ENCRYPTION_FAILED
    );
    expect(wrapped).toBeInstanceOf(CryptoError);
    expect(wrapped.message).toBe('null');
  });
});

describe('Error codes coverage', () => {
  it('should have all error codes defined', () => {
    const expectedCodes = [
      CryptoErrorCode.ENCRYPTION_FAILED,
      CryptoErrorCode.DECRYPTION_FAILED,
      CryptoErrorCode.INVALID_IV,
      CryptoErrorCode.INVALID_CIPHERTEXT,
      CryptoErrorCode.KEY_GENERATION_FAILED,
      CryptoErrorCode.KEY_DERIVATION_FAILED,
      CryptoErrorCode.INVALID_KEY,
      CryptoErrorCode.KEY_EXPORT_FAILED,
      CryptoErrorCode.KEY_IMPORT_FAILED,
      CryptoErrorCode.INVALID_ALGORITHM,
      CryptoErrorCode.UNSUPPORTED_ALGORITHM,
      CryptoErrorCode.ALGORITHM_NOT_AVAILABLE,
      CryptoErrorCode.ECDH_DERIVATION_FAILED,
      CryptoErrorCode.INVALID_PUBLIC_KEY,
      CryptoErrorCode.INVALID_PRIVATE_KEY,
      CryptoErrorCode.SERIALIZATION_FAILED,
      CryptoErrorCode.DESERIALIZATION_FAILED,
      CryptoErrorCode.INVALID_JWK,
      CryptoErrorCode.INVALID_RAW_FORMAT,
      CryptoErrorCode.OPERATION_FAILED,
      CryptoErrorCode.INVALID_INPUT,
      CryptoErrorCode.NOT_SUPPORTED,
    ];

    expectedCodes.forEach((code) => {
      expect(code).toBeDefined();
    });
  });
});
