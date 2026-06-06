/**
 * Post-Quantum Cryptography (PQC) Tests
 *
 * Tests for PQC algorithm support and hybrid encryption patterns.
 * Since PQC algorithms are not yet available in libsodium.js, these tests
 * verify the interface structure and fallback behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isPQCSupported,
  kyberKeyPair,
  kyberEncaps,
  kyberDecaps,
  hybridEncrypt,
  hybridDecrypt,
  getPQCStatus,
} from './pqc.js';
import { generateKeyPair } from './keypair.js';
import { enableWasmBackend, disableWasmBackend } from './wasm-backend.js';

describe('PQC Module', () => {
  beforeEach(() => {
    // Reset WASM backend state before each test
    disableWasmBackend();
  });

  describe('isPQCSupported', () => {
    it('should return false when WASM backend is disabled', async () => {
      disableWasmBackend();
      const supported = await isPQCSupported();
      expect(supported).toBe(false);
    });

    it('should return false when WASM backend is enabled but libsodium not available', async () => {
      enableWasmBackend();
      const supported = await isPQCSupported();
      // libsodium is an optional dependency, so this should be false
      expect(supported).toBe(false);
    });
  });

  describe('getPQCStatus', () => {
    it('should return status with reason when WASM disabled', async () => {
      disableWasmBackend();
      const status = await getPQCStatus();
      expect(status.supported).toBe(false);
      expect(status.wasmEnabled).toBe(false);
      expect(status.reason).toContain('WASM backend is not enabled');
    });

    it('should return status with reason when WASM enabled but libsodium not available', async () => {
      enableWasmBackend();
      const status = await getPQCStatus();
      expect(status.supported).toBe(false);
      expect(status.wasmEnabled).toBe(true);
      expect(status.reason).toContain('PQC algorithms are not yet available');
    });
  });

  describe('kyberKeyPair', () => {
    it('should throw error when PQC not supported', async () => {
      disableWasmBackend();
      await expect(kyberKeyPair(768)).rejects.toThrow('CRYSTALS-Kyber is not yet supported');
    });

    it('should throw error for variant 512', async () => {
      disableWasmBackend();
      await expect(kyberKeyPair(512)).rejects.toThrow('CRYSTALS-Kyber is not yet supported');
    });

    it('should throw error for variant 1024', async () => {
      disableWasmBackend();
      await expect(kyberKeyPair(1024)).rejects.toThrow('CRYSTALS-Kyber is not yet supported');
    });
  });

  describe('kyberEncaps', () => {
    it('should throw error when PQC not supported', async () => {
      disableWasmBackend();
      const publicKey = new Uint8Array(32);
      await expect(kyberEncaps(publicKey, 768)).rejects.toThrow('CRYSTALS-Kyber is not yet supported');
    });

    it('should throw error for variant 512', async () => {
      disableWasmBackend();
      const publicKey = new Uint8Array(32);
      await expect(kyberEncaps(publicKey, 512)).rejects.toThrow('CRYSTALS-Kyber is not yet supported');
    });
  });

  describe('kyberDecaps', () => {
    it('should throw error when PQC not supported', async () => {
      disableWasmBackend();
      const ciphertext = new Uint8Array(32);
      const secretKey = new Uint8Array(32);
      await expect(kyberDecaps(ciphertext, secretKey, 768)).rejects.toThrow('CRYSTALS-Kyber is not yet supported');
    });

    it('should throw error for variant 1024', async () => {
      disableWasmBackend();
      const ciphertext = new Uint8Array(32);
      const secretKey = new Uint8Array(32);
      await expect(kyberDecaps(ciphertext, secretKey, 1024)).rejects.toThrow('CRYSTALS-Kyber is not yet supported');
    });
  });

  describe('hybridEncrypt', () => {
    it('should perform classical-only encryption when PQC not supported', async () => {
      disableWasmBackend();
      const plaintext = 'Hello, world!';
      const recipientKeyPair = await generateKeyPair();
      
      const result = await hybridEncrypt(plaintext, recipientKeyPair.publicKey);
      
      expect(result.algorithm).toBe('HYBRID-X25519-Kyber-v1');
      expect(result.classicalCiphertext).toBeInstanceOf(Uint8Array);
      expect(result.classicalCiphertext.length).toBeGreaterThan(0);
      expect(result.pqcCiphertext).toBeInstanceOf(Uint8Array);
      expect(result.pqcCiphertext.length).toBe(0); // Empty for classical-only
      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.iv.length).toBe(12); // 96-bit IV
    });

    it('should perform classical-only encryption when PQC public key provided but not supported', async () => {
      disableWasmBackend();
      const plaintext = 'Hello, world!';
      const recipientKeyPair = await generateKeyPair();
      const pqcPublicKey = new Uint8Array(32);
      
      const result = await hybridEncrypt(plaintext, recipientKeyPair.publicKey, pqcPublicKey);
      
      expect(result.algorithm).toBe('HYBRID-X25519-Kyber-v1');
      expect(result.classicalCiphertext).toBeInstanceOf(Uint8Array);
      expect(result.classicalCiphertext.length).toBeGreaterThan(0);
      expect(result.pqcCiphertext).toBeInstanceOf(Uint8Array);
      expect(result.pqcCiphertext.length).toBe(0); // Empty for classical-only
    });

    it('should encrypt different plaintexts to different ciphertexts', async () => {
      disableWasmBackend();
      const recipientKeyPair = await generateKeyPair();
      
      const result1 = await hybridEncrypt('Hello', recipientKeyPair.publicKey);
      const result2 = await hybridEncrypt('World', recipientKeyPair.publicKey);
      
      expect(result1.classicalCiphertext).not.toEqual(result2.classicalCiphertext);
    });

    it('should encrypt same plaintext to different ciphertexts (due to random IV)', async () => {
      disableWasmBackend();
      const plaintext = 'Hello, world!';
      const recipientKeyPair = await generateKeyPair();
      
      const result1 = await hybridEncrypt(plaintext, recipientKeyPair.publicKey);
      const result2 = await hybridEncrypt(plaintext, recipientKeyPair.publicKey);
      
      expect(result1.classicalCiphertext).not.toEqual(result2.classicalCiphertext);
      expect(result1.iv).not.toEqual(result2.iv);
    });
  });

  describe('hybridDecrypt', () => {
    it('should throw error indicating simplified interface', async () => {
      disableWasmBackend();
      const ciphertext = {
        classicalCiphertext: new Uint8Array(32),
        pqcCiphertext: new Uint8Array(0),
        iv: new Uint8Array(12),
        algorithm: 'HYBRID-X25519-Kyber-v1' as const,
      };
      const privateKey = await generateKeyPair();
      
      await expect(hybridDecrypt(ciphertext, privateKey.privateKey)).rejects.toThrow(
        'simplified interface'
      );
    });
  });

  describe('Hybrid encryption round-trip (future implementation)', () => {
    it('should note that full round-trip requires sender ephemeral public key', async () => {
      // This test documents the current limitation
      // A full implementation would include the sender's ephemeral public key
      // in the ciphertext to enable decryption
      disableWasmBackend();
      const plaintext = 'Hello, world!';
      const recipientKeyPair = await generateKeyPair();
      
      const encrypted = await hybridEncrypt(plaintext, recipientKeyPair.publicKey);
      
      // Currently, decryption is not implemented because we need the sender's
      // ephemeral public key, which is not included in the ciphertext
      expect(encrypted.algorithm).toBe('HYBRID-X25519-Kyber-v1');
    });
  });
});
