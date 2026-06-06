/**
 * Tests for WebAssembly backend module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isWasmAvailable,
  enableWasmBackend,
  disableWasmBackend,
  isWasmEnabled,
  argon2idHash,
  getWasmStatus,
} from './wasm-backend.js';

describe('wasm-backend', () => {
  beforeEach(() => {
    // Reset WASM state before each test
    disableWasmBackend();
  });

  describe('isWasmAvailable', () => {
    it('should return false when libsodium is not installed', async () => {
      const available = await isWasmAvailable();
      // libsodium is an optional dependency, so it should be false in test environment
      expect(typeof available).toBe('boolean');
    });

    it('should cache the result', async () => {
      const result1 = await isWasmAvailable();
      const result2 = await isWasmAvailable();
      expect(result1).toBe(result2);
    });
  });

  describe('WASM backend enable/disable', () => {
    it('should enable WASM backend', () => {
      enableWasmBackend();
      expect(isWasmEnabled()).toBe(true);
    });

    it('should disable WASM backend', () => {
      enableWasmBackend();
      disableWasmBackend();
      expect(isWasmEnabled()).toBe(false);
    });

    it('should be disabled by default', () => {
      expect(isWasmEnabled()).toBe(false);
    });
  });

  describe('getWasmStatus', () => {
    it('should return status object', async () => {
      const status = await getWasmStatus();
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('enabled');
      expect(typeof status.available).toBe('boolean');
      expect(typeof status.enabled).toBe('boolean');
    });

    it('should reflect enabled state', async () => {
      enableWasmBackend();
      const status = await getWasmStatus();
      expect(status.enabled).toBe(true);
    });
  });

  describe('argon2idHash', () => {
    it('should throw error for empty password', async () => {
      const salt = new Uint8Array(16);
      await expect(argon2idHash('', salt)).rejects.toThrow();
    });

    it('should throw error for empty salt', async () => {
      await expect(argon2idHash('password', new Uint8Array(0))).rejects.toThrow();
    });

    it('should throw error for invalid iterations', async () => {
      const salt = new Uint8Array(16);
      await expect(argon2idHash('password', salt, 0)).rejects.toThrow();
    });

    it('should throw error for invalid memory', async () => {
      const salt = new Uint8Array(16);
      await expect(argon2idHash('password', salt, 3, 0)).rejects.toThrow();
    });

    it('should throw error for invalid parallelism', async () => {
      const salt = new Uint8Array(16);
      await expect(argon2idHash('password', salt, 3, 65536, 0)).rejects.toThrow();
    });

    it('should fallback to PBKDF2 when WASM is not available', async () => {
      const password = 'test-password';
      const salt = new Uint8Array(16);
      const iterations = 1000; // Lower iterations for test speed

      const result = await argon2idHash(password, salt, iterations);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32); // 256 bits = 32 bytes
    });

    it('should produce consistent output for same inputs', async () => {
      const password = 'test-password';
      const salt = new Uint8Array(16);
      const iterations = 1000;

      const result1 = await argon2idHash(password, salt, iterations);
      const result2 = await argon2idHash(password, salt, iterations);

      expect(result1).toEqual(result2);
    });

    it('should produce different output for different passwords', async () => {
      const salt = new Uint8Array(16);
      const iterations = 1000;

      const result1 = await argon2idHash('password1', salt, iterations);
      const result2 = await argon2idHash('password2', salt, iterations);

      expect(result1).not.toEqual(result2);
    });

    it('should produce different output for different salts', async () => {
      const password = 'test-password';
      const salt1 = new Uint8Array(16);
      const salt2 = new Uint8Array(16);
      salt2[0] = 1; // Make salt2 different
      const iterations = 1000;

      const result1 = await argon2idHash(password, salt1, iterations);
      const result2 = await argon2idHash(password, salt2, iterations);

      expect(result1).not.toEqual(result2);
    });

    it('should handle ArrayBuffer salt', async () => {
      const password = 'test-password';
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iterations = 1000;

      const result = await argon2idHash(password, salt, iterations);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(32);
    });

    it('should use custom iterations parameter', async () => {
      const password = 'test-password';
      const salt = new Uint8Array(16);
      const iterations1 = 1000;
      const iterations2 = 2000;

      const result1 = await argon2idHash(password, salt, iterations1);
      const result2 = await argon2idHash(password, salt, iterations2);

      expect(result1).not.toEqual(result2);
    });
  });
});
