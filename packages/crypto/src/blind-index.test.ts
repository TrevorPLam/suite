/**
 * Tests for blind indexing functionality
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateBlindIndex, deriveIndexKey, generateSalt } from './index.js';

describe('Blind Indexing', () => {
  it('should generate blind index for data', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const indexKey = await deriveIndexKey(password, new TextDecoder().decode(salt));
    const blindIndex = await generateBlindIndex('My Task Title', indexKey);

    expect(blindIndex).toBeTypeOf('string');
    expect(blindIndex.length).toBe(64); // SHA-256 hex string
  });

  it('should generate same blind index for same data with same key', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const saltString = new TextDecoder().decode(salt);
    const indexKey = await deriveIndexKey(password, saltString);

    const blindIndex1 = await generateBlindIndex('search term', indexKey);
    const blindIndex2 = await generateBlindIndex('search term', indexKey);

    expect(blindIndex1).toBe(blindIndex2);
  });

  it('should generate different blind index for different data', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const saltString = new TextDecoder().decode(salt);
    const indexKey = await deriveIndexKey(password, saltString);

    const blindIndex1 = await generateBlindIndex('search term 1', indexKey);
    const blindIndex2 = await generateBlindIndex('search term 2', indexKey);

    expect(blindIndex1).not.toBe(blindIndex2);
  });

  it('should normalize data before hashing', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const saltString = new TextDecoder().decode(salt);
    const indexKey = await deriveIndexKey(password, saltString);

    const blindIndex1 = await generateBlindIndex('Search Term', indexKey);
    const blindIndex2 = await generateBlindIndex('search term', indexKey);
    const blindIndex3 = await generateBlindIndex('SEARCH TERM', indexKey);

    expect(blindIndex1).toBe(blindIndex2);
    expect(blindIndex2).toBe(blindIndex3);
  });

  it('should strip punctuation before hashing', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const saltString = new TextDecoder().decode(salt);
    const indexKey = await deriveIndexKey(password, saltString);

    const blindIndex1 = await generateBlindIndex('search term!', indexKey);
    const blindIndex2 = await generateBlindIndex('search term', indexKey);

    expect(blindIndex1).toBe(blindIndex2);
  });

  it('should generate different blind index with different salts', async () => {
    const password = 'user-password';
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const saltString1 = new TextDecoder().decode(salt1);
    const saltString2 = new TextDecoder().decode(salt2);

    const indexKey1 = await deriveIndexKey(password, saltString1);
    const indexKey2 = await deriveIndexKey(password, saltString2);

    const blindIndex1 = await generateBlindIndex('search term', indexKey1);
    const blindIndex2 = await generateBlindIndex('search term', indexKey2);

    expect(blindIndex1).not.toBe(blindIndex2);
  });

  it('should throw error when salt is not provided', async () => {
    const password = 'user-password';

    await expect(deriveIndexKey(password, '')).rejects.toThrow(
      'Salt is required for blind index key derivation'
    );
  });

  it('should throw error when salt is empty string', async () => {
    const password = 'user-password';

    await expect(deriveIndexKey(password, '')).rejects.toThrow(
      'Salt is required for blind index key derivation'
    );
  });

  it('should handle empty string data', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const saltString = new TextDecoder().decode(salt);
    const indexKey = await deriveIndexKey(password, saltString);
    const blindIndex = await generateBlindIndex('', indexKey);

    expect(blindIndex).toBeTypeOf('string');
    expect(blindIndex.length).toBe(64);
  });

  it('should handle special characters in data', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const saltString = new TextDecoder().decode(salt);
    const indexKey = await deriveIndexKey(password, saltString);
    const blindIndex = await generateBlindIndex('Special!@#$%^&*()_+-=[]{}|;:,.<>?/~`', indexKey);

    expect(blindIndex).toBeTypeOf('string');
    expect(blindIndex.length).toBe(64);
  });

  it('should handle unicode characters in data', async () => {
    const password = 'user-password';
    const salt = generateSalt();
    const saltString = new TextDecoder().decode(salt);
    const indexKey = await deriveIndexKey(password, saltString);
    const blindIndex = await generateBlindIndex('Unicode: 你好 🌍 Ñoño café', indexKey);

    expect(blindIndex).toBeTypeOf('string');
    expect(blindIndex.length).toBe(64);
  });
});

describe('Blind Indexing - Property-Based Tests', () => {
  it('property: blind index is deterministic with same parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 16, maxLength: 32 }),
        fc.string({ minLength: 8, maxLength: 100 }),
        async (data: string, salt: string, password: string) => {
          const indexKey = await deriveIndexKey(password, salt);
          const blindIndex1 = await generateBlindIndex(data, indexKey);
          const blindIndex2 = await generateBlindIndex(data, indexKey);

          expect(blindIndex1).toBe(blindIndex2);
        }
      )
    );
  });

  it('property: blind index is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).map(s => s.toLowerCase()),
        fc.string({ minLength: 16, maxLength: 32 }),
        fc.string({ minLength: 8, maxLength: 100 }),
        async (data: string, salt: string, password: string) => {
          const indexKey = await deriveIndexKey(password, salt);
          const blindIndex1 = await generateBlindIndex(data, indexKey);
          const blindIndex2 = await generateBlindIndex(data.toUpperCase(), indexKey);

          expect(blindIndex1).toBe(blindIndex2);
        }
      )
    );
  });

  it('property: different salts produce different blind indices', async () => {
    const password = 'user-password';
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    const saltString1 = new TextDecoder().decode(salt1);
    const saltString2 = new TextDecoder().decode(salt2);

    const indexKey1 = await deriveIndexKey(password, saltString1);
    const indexKey2 = await deriveIndexKey(password, saltString2);

    const blindIndex1 = await generateBlindIndex('search term', indexKey1);
    const blindIndex2 = await generateBlindIndex('search term', indexKey2);

    expect(blindIndex1).not.toBe(blindIndex2);
  });

  it('property: blind index output is always 64 hex characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.string({ minLength: 16, maxLength: 32 }),
        fc.string({ minLength: 8, maxLength: 100 }),
        async (data: string, salt: string, password: string) => {
          const indexKey = await deriveIndexKey(password, salt);
          const blindIndex = await generateBlindIndex(data, indexKey);

          expect(blindIndex).toMatch(/^[a-f0-9]{64}$/);
        }
      )
    );
  });
});
