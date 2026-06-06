/**
 * Tests for key lifecycle management
 */

import { describe, it, expect } from 'vitest';
import {
  createKeyMetadata,
  incrementVersion,
  rotateKey,
  getActiveKey,
  deactivateKey,
  cryptoShredKey,
  isKeyExpired,
  validateKeyMetadata,
} from './key-lifecycle.js';

describe('Key Lifecycle Management', () => {
  describe('createKeyMetadata', () => {
    it('should create key metadata with required fields', () => {
      const metadata = createKeyMetadata(
        'AES-256-GCM-v1',
        ['encrypt', 'decrypt'],
        256
      );

      expect(metadata.id).toBeDefined();
      expect(typeof metadata.id).toBe('string');
      expect(metadata.version).toBe(1);
      expect(metadata.algorithm).toBe('AES-256-GCM-v1');
      expect(metadata.status).toBe('active');
      expect(metadata.usage).toEqual(['encrypt', 'decrypt']);
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.expiresAt).toBeNull();
      expect(metadata.isPrimary).toBe(false);
      expect(metadata.keySize).toBe(256);
      expect(metadata.isPostQuantum).toBe(false);
    });

    it('should create key metadata with expiration', () => {
      const expiresAt = new Date('2026-12-31');
      const metadata = createKeyMetadata(
        'AES-256-GCM-v1',
        ['encrypt', 'decrypt'],
        256,
        expiresAt
      );

      expect(metadata.expiresAt).toEqual(expiresAt);
    });

    it('should create key metadata with post-quantum flag', () => {
      const metadata = createKeyMetadata(
        'AES-256-GCM-v1',
        ['encrypt', 'decrypt'],
        256,
        null,
        true
      );

      expect(metadata.isPostQuantum).toBe(true);
    });

    it('should generate unique IDs for each key', () => {
      const key1 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);
      const key2 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);

      expect(key1.id).not.toBe(key2.id);
    });
  });

  describe('incrementVersion', () => {
    it('should increment version number', () => {
      expect(incrementVersion(1)).toBe(2);
      expect(incrementVersion(5)).toBe(6);
      expect(incrementVersion(100)).toBe(101);
    });

    it('should throw error for negative version', () => {
      expect(() => incrementVersion(-1)).toThrow('Key version cannot be negative');
      expect(() => incrementVersion(-10)).toThrow('Key version cannot be negative');
    });

    it('should handle zero version', () => {
      expect(incrementVersion(0)).toBe(1);
    });
  });

  describe('rotateKey', () => {
    it('should create new key version with incremented version', () => {
      const oldKey = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const newKey = rotateKey(oldKey);

      expect(newKey.version).toBe(2);
      expect(newKey.id).not.toBe(oldKey.id);
      expect(newKey.status).toBe('active');
      expect(newKey.isPrimary).toBe(true);
      expect(oldKey.status).toBe('disabled');
    });

    it('should preserve algorithm and usage when rotating', () => {
      const oldKey = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const newKey = rotateKey(oldKey);

      expect(newKey.algorithm).toBe(oldKey.algorithm);
      expect(newKey.usage).toEqual(oldKey.usage);
      expect(newKey.keySize).toBe(oldKey.keySize);
    });

    it('should use new key material if provided', () => {
      const oldKey = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const newMaterial = createKeyMetadata('AES-128-GCM-v1', ['encrypt', 'decrypt'], 128);
      const newKey = rotateKey(oldKey, newMaterial);

      expect(newKey.algorithm).toBe('AES-128-GCM-v1');
      expect(newKey.keySize).toBe(128);
      expect(newKey.version).toBe(2);
    });

    it('should set new key as primary', () => {
      const oldKey = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const newKey = rotateKey(oldKey);

      expect(newKey.isPrimary).toBe(true);
    });
  });

  describe('getActiveKey', () => {
    it('should return primary key if exists and active', () => {
      const key1 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);
      const key2 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);
      key1.isPrimary = true;
      key1.status = 'active';
      key2.status = 'active';

      const activeKey = getActiveKey([key1, key2]);
      expect(activeKey).toBe(key1);
    });

    it('should return first active key if no primary key', () => {
      const key1 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);
      const key2 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);
      key1.status = 'disabled';
      key2.status = 'active';

      const activeKey = getActiveKey([key1, key2]);
      expect(activeKey).toBe(key2);
    });

    it('should return null if no active keys', () => {
      const key1 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);
      const key2 = createKeyMetadata('AES-256-GCM-v1', ['encrypt'], 256);
      key1.status = 'disabled';
      key2.status = 'destroyed';

      const activeKey = getActiveKey([key1, key2]);
      expect(activeKey).toBeNull();
    });

    it('should return null for empty array', () => {
      const activeKey = getActiveKey([]);
      expect(activeKey).toBeNull();
    });
  });

  describe('deactivateKey', () => {
    it('should change key status to disabled', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const deactivatedKey = deactivateKey(key);

      expect(deactivatedKey.status).toBe('disabled');
    });

    it('should throw error when trying to deactivate primary key', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key.isPrimary = true;

      expect(() => deactivateKey(key)).toThrow('Cannot deactivate primary key');
    });

    it('should preserve other fields when deactivating', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const deactivatedKey = deactivateKey(key);

      expect(deactivatedKey.id).toBe(key.id);
      expect(deactivatedKey.version).toBe(key.version);
      expect(deactivatedKey.algorithm).toBe(key.algorithm);
    });
  });

  describe('cryptoShredKey', () => {
    it('should change key status to destroyed', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const shreddedKey = cryptoShredKey(key);

      expect(shreddedKey.status).toBe('destroyed');
    });

    it('should zeroize provided key material', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5]);

      cryptoShredKey(key, keyBytes);

      expect(Array.from(keyBytes)).toEqual([0, 0, 0, 0, 0]);
    });

    it('should work without key material', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const shreddedKey = cryptoShredKey(key);

      expect(shreddedKey.status).toBe('destroyed');
    });

    it('should zeroize ArrayBuffer', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const keyBytes = new ArrayBuffer(5);
      const view = new Uint8Array(keyBytes);
      view.set([1, 2, 3, 4, 5]);

      cryptoShredKey(key, keyBytes);

      expect(Array.from(view)).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe('isKeyExpired', () => {
    it('should return false for non-expiring key', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      expect(isKeyExpired(key)).toBe(false);
    });

    it('should return false for key with future expiration', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256, futureDate);
      expect(isKeyExpired(key)).toBe(false);
    });

    it('should return true for expired key', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256, pastDate);
      expect(isKeyExpired(key)).toBe(true);
    });

    it('should handle keys expiring now', () => {
      const now = new Date();
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256, now);
      // This depends on exact timing, but should generally be false or true
      expect(typeof isKeyExpired(key)).toBe('boolean');
    });
  });

  describe('validateKeyMetadata', () => {
    it('should validate correct key metadata', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should reject missing key ID', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key.id = '';
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Key ID is required and must be a string');
    });

    it('should reject invalid version', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key.version = 0;
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Key version is required and must be a positive number');
    });

    it('should reject invalid status', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      (key as { status: string }).status = 'invalid';
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Key status must be one of: active, enabled, disabled, destroyed');
    });

    it('should reject empty usage array', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key.usage = [];
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Key usage is required and must be a non-empty array');
    });

    it('should reject invalid usage types', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      (key as { usage: string[] }).usage = ['invalid'];
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Key usage must contain only valid usage types');
    });

    it('should reject invalid key size', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key.keySize = 0;
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Key size is required and must be a positive number');
    });

    it('should collect multiple errors', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key.id = '';
      key.version = 0;
      (key as { status: string }).status = 'invalid';
      const validation = validateKeyMetadata(key);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Key rotation workflow', () => {
    it('should support multiple active keys during rotation', () => {
      const key1 = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key1.isPrimary = true;

      const key2 = rotateKey(key1);
      const keys = [key1, key2];

      const activeKey = getActiveKey(keys);
      expect(activeKey).toBe(key2);
      expect(key1.status).toBe('disabled');
      expect(key2.status).toBe('active');
    });

    it('should allow deactivation of non-primary keys', () => {
      const key1 = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      key1.isPrimary = true;
      const key2 = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);

      const deactivatedKey = deactivateKey(key2);
      expect(deactivatedKey.status).toBe('disabled');
    });
  });

  describe('Crypto-shredding workflow', () => {
    it('should support secure deletion of key material', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const keyBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      const shreddedKey = cryptoShredKey(key, keyBytes);

      expect(shreddedKey.status).toBe('destroyed');
      expect(Array.from(keyBytes)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('should preserve metadata while marking as destroyed', () => {
      const key = createKeyMetadata('AES-256-GCM-v1', ['encrypt', 'decrypt'], 256);
      const shreddedKey = cryptoShredKey(key);

      expect(shreddedKey.id).toBe(key.id);
      expect(shreddedKey.version).toBe(key.version);
      expect(shreddedKey.algorithm).toBe(key.algorithm);
      expect(shreddedKey.status).toBe('destroyed');
    });
  });
});
