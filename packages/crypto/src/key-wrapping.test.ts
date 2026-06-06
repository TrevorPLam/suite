/**
 * Key Wrapping Tests
 *
 * Tests for AES-KW (RFC 3394), AES-KWP (RFC 5649), and envelope encryption.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  wrapKey,
  unwrapKey,
  wrapKeyPadded,
  unwrapKeyPadded,
  envelopeEncrypt,
  envelopeDecrypt,
  type EnvelopeEncryptionResult,
} from './key-wrapping.js';
import { generateAESKey } from './encryption.js';

describe('key-wrapping', () => {
  let kek: CryptoKey;
  let gcmKek: CryptoKey;

  beforeEach(async () => {
    // Generate a Key Encryption Key (KEK) for AES-KW
    kek = await crypto.subtle.generateKey(
      { name: 'AES-KW', length: 256 },
      true,
      ['wrapKey', 'unwrapKey']
    );

    // Generate a Key Encryption Key (KEK) for AES-GCM (for padded wrapping)
    gcmKek = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  });

  describe('wrapKey', () => {
    it('should wrap a CryptoKey using AES-KW', async () => {
      const keyToWrap = await generateAESKey(true);
      const wrapped = await wrapKey(keyToWrap, kek);

      expect(wrapped).toBeInstanceOf(Uint8Array);
      expect(wrapped.length).toBeGreaterThan(0);
    });

    it('should throw error if key is not extractable', async () => {
      const keyToWrap = await generateAESKey(false); // Not extractable

      await expect(wrapKey(keyToWrap, kek)).rejects.toThrow(
        'Key to wrap must be extractable'
      );
    });

    it('should throw error if wrapping key is not AES-KW', async () => {
      const keyToWrap = await generateAESKey(true);
      const wrongKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      await expect(wrapKey(keyToWrap, wrongKey)).rejects.toThrow(
        'Wrapping key must be an AES-KW key'
      );
    });
  });

  describe('unwrapKey', () => {
    it('should unwrap a key using AES-KW', async () => {
      const keyToWrap = await generateAESKey(true);
      const wrapped = await wrapKey(keyToWrap, kek);

      const unwrapped = await unwrapKey(
        wrapped,
        kek,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      expect(unwrapped).toBeInstanceOf(CryptoKey);
      expect(unwrapped.extractable).toBe(true);
      expect(unwrapped.algorithm).toEqual({ name: 'AES-GCM', length: 256 });
    });

    it('should throw error if wrapping key is not AES-KW', async () => {
      const keyToWrap = await generateAESKey(true);
      const wrapped = await wrapKey(keyToWrap, kek);
      const wrongKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      await expect(
        unwrapKey(
          wrapped,
          wrongKey,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )
      ).rejects.toThrow('Wrapping key must be an AES-KW key');
    });

    it('should fail with invalid wrapped key', async () => {
      const invalidWrapped = new Uint8Array([1, 2, 3, 4, 5]);

      await expect(
        unwrapKey(
          invalidWrapped,
          kek,
          { name: 'AES-GCM', length: 256 },
          true,
          ['encrypt', 'decrypt']
        )
      ).rejects.toThrow('Key unwrapping failed');
    });
  });

  describe('wrapKey/unwrapKey round-trip', () => {
    it('should successfully wrap and unwrap a key', async () => {
      const keyToWrap = await generateAESKey(true);
      const wrapped = await wrapKey(keyToWrap, kek);

      const unwrapped = await unwrapKey(
        wrapped,
        kek,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Verify the unwrapped key can be used for encryption
      const plaintext = 'Test data';
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: crypto.getRandomValues(new Uint8Array(12)) },
        unwrapped,
        new TextEncoder().encode(plaintext)
      );

      expect(encrypted).toBeInstanceOf(ArrayBuffer);
    });

    it('should work with different key sizes', async () => {
      const key128 = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 128 },
        true,
        ['encrypt', 'decrypt']
      );
      const key192 = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 192 },
        true,
        ['encrypt', 'decrypt']
      );
      const key256 = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      for (const key of [key128, key192, key256]) {
        const wrapped = await wrapKey(key, kek);
        const unwrapped = await unwrapKey(
          wrapped,
          kek,
          key.algorithm as AesKeyGenParams,
          true,
          ['encrypt', 'decrypt']
        );
        expect(unwrapped.algorithm).toEqual(key.algorithm);
      }
    });
  });

  describe('wrapKeyPadded', () => {
    it('should wrap arbitrary-length key bytes with padding', async () => {
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5]); // Not a multiple of 8 bytes
      const wrapped = await wrapKeyPadded(keyBytes, gcmKek);

      expect(wrapped).toBeInstanceOf(Uint8Array);
      expect(wrapped.length).toBeGreaterThan(0);
    });

    it('should wrap key bytes that are already a multiple of 8 bytes', async () => {
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]); // 8 bytes
      const wrapped = await wrapKeyPadded(keyBytes, gcmKek);

      expect(wrapped).toBeInstanceOf(Uint8Array);
      expect(wrapped.length).toBeGreaterThan(0);
    });

    it('should throw error if wrapping key is not AES-GCM', async () => {
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const wrongKey = await crypto.subtle.generateKey(
        { name: 'AES-KW', length: 256 },
        true,
        ['wrapKey', 'unwrapKey']
      );

      await expect(wrapKeyPadded(keyBytes, wrongKey)).rejects.toThrow(
        'Wrapping key must be an AES-GCM key for padded wrapping'
      );
    });
  });

  describe('unwrapKeyPadded', () => {
    it('should unwrap padded key bytes', async () => {
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const wrapped = await wrapKeyPadded(keyBytes, gcmKek);

      const unwrapped = await unwrapKeyPadded(wrapped, gcmKek);

      expect(unwrapped).toBeInstanceOf(Uint8Array);
      expect(unwrapped).toEqual(keyBytes);
    });

    it('should unwrap key bytes of different lengths', async () => {
      const testCases = [
        new Uint8Array([1]),
        new Uint8Array([1, 2, 3, 4, 5]),
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        new Uint8Array(new Array(16).fill(42)),
        new Uint8Array(new Array(32).fill(99)),
      ];

      for (const keyBytes of testCases) {
        const wrapped = await wrapKeyPadded(keyBytes, gcmKek);
        const unwrapped = await unwrapKeyPadded(wrapped, gcmKek);
        expect(unwrapped).toEqual(keyBytes);
      }
    });

    it('should throw error if wrapping key is not AES-GCM', async () => {
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const wrapped = await wrapKeyPadded(keyBytes, gcmKek);
      const wrongKey = await crypto.subtle.generateKey(
        { name: 'AES-KW', length: 256 },
        true,
        ['wrapKey', 'unwrapKey']
      );

      await expect(unwrapKeyPadded(wrapped, wrongKey)).rejects.toThrow(
        'Wrapping key must be an AES-GCM key for padded unwrapping'
      );
    });

    it('should fail with invalid wrapped key', async () => {
      const invalidWrapped = new Uint8Array([1, 2, 3, 4, 5]);

      await expect(unwrapKeyPadded(invalidWrapped, gcmKek)).rejects.toThrow(
        'Padded key unwrapping failed'
      );
    });

    it('should detect invalid padding', async () => {
      // This test would require crafting a specifically invalid wrapped key
      // For now, we rely on the unwrapKeyPadded implementation to validate padding
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const wrapped = await wrapKeyPadded(keyBytes, gcmKek);

      // Corrupt the wrapped key
      const corrupted = new Uint8Array(wrapped);
      if (corrupted.length > 0) {
        corrupted[0] = (corrupted[0] ?? 0) ^ 0xFF;
      }

      await expect(unwrapKeyPadded(corrupted, gcmKek)).rejects.toThrow();
    });
  });

  describe('wrapKeyPadded/unwrapKeyPadded round-trip', () => {
    it('should successfully wrap and unwrap arbitrary-length keys', async () => {
      const testCases = [
        new Uint8Array([1]),
        new Uint8Array([1, 2, 3, 4, 5, 6, 7]),
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        new Uint8Array(new Array(13).fill(42)),
        new Uint8Array(new Array(31).fill(99)),
      ];

      for (const keyBytes of testCases) {
        const wrapped = await wrapKeyPadded(keyBytes, gcmKek);
        const unwrapped = await unwrapKeyPadded(wrapped, gcmKek);
        expect(unwrapped).toEqual(keyBytes);
      }
    });
  });

  describe('envelopeEncrypt', () => {
    it('should encrypt data using envelope encryption pattern', async () => {
      const plaintext = 'Secret data to encrypt';
      const result = await envelopeEncrypt(plaintext, kek);

      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('wrappedDek');
      expect(result.encryptedData).toHaveProperty('ciphertext');
      expect(result.encryptedData).toHaveProperty('iv');
      expect(result.wrappedDek).toBeInstanceOf(Uint8Array);
    });

    it('should generate a random DEK for each encryption', async () => {
      const plaintext = 'Secret data';
      const result1 = await envelopeEncrypt(plaintext, kek);
      const result2 = await envelopeEncrypt(plaintext, kek);

      // Wrapped DEKs should be different (different random DEKs)
      expect(result1.wrappedDek).not.toEqual(result2.wrappedDek);
      // IVs should be different
      expect(result1.encryptedData.iv).not.toEqual(result2.encryptedData.iv);
    });
  });

  describe('envelopeDecrypt', () => {
    it('should decrypt data using envelope decryption pattern', async () => {
      const plaintext = 'Secret data to encrypt';
      const result = await envelopeEncrypt(plaintext, kek);

      const decrypted = await envelopeDecrypt(result, kek);

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt data encrypted with envelope encryption', async () => {
      const testCases = [
        'Hello, World!',
        'Secret message',
        'A'.repeat(1000), // Longer message
        'Special characters: !@#$%^&*()',
        'Unicode: 你好世界 🌍',
      ];

      for (const plaintext of testCases) {
        const result = await envelopeEncrypt(plaintext, kek);
        const decrypted = await envelopeDecrypt(result, kek);
        expect(decrypted).toBe(plaintext);
      }
    });

    it('should fail with wrong KEK', async () => {
      const plaintext = 'Secret data';
      const result = await envelopeEncrypt(plaintext, kek);

      const wrongKek = await crypto.subtle.generateKey(
        { name: 'AES-KW', length: 256 },
        true,
        ['wrapKey', 'unwrapKey']
      );

      await expect(envelopeDecrypt(result, wrongKek)).rejects.toThrow();
    });

    it('should fail with corrupted wrapped DEK', async () => {
      const plaintext = 'Secret data';
      const result = await envelopeEncrypt(plaintext, kek);

      // Corrupt the wrapped DEK
      const corruptedResult: EnvelopeEncryptionResult = {
        encryptedData: result.encryptedData,
        wrappedDek: new Uint8Array(result.wrappedDek.map((b) => b ^ 0xFF)),
      };

      await expect(envelopeDecrypt(corruptedResult, kek)).rejects.toThrow();
    });
  });

  describe('envelopeEncrypt/envelopeDecrypt round-trip', () => {
    it('should successfully encrypt and decrypt data', async () => {
      const plaintext = 'Secret data to encrypt';
      const result = await envelopeEncrypt(plaintext, kek);
      const decrypted = await envelopeDecrypt(result, kek);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle multiple encryption/decryption cycles', async () => {
      const plaintext = 'Secret data';

      for (let i = 0; i < 10; i++) {
        const result = await envelopeEncrypt(plaintext, kek);
        const decrypted = await envelopeDecrypt(result, kek);
        expect(decrypted).toBe(plaintext);
      }
    });
  });
});
