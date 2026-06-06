/**
 * Cryptographic Agility Architecture Tests
 *
 * Tests for algorithm versioning, keyset pattern, and compatibility checks.
 * These are unit tests for the design interfaces, not full implementation.
 */

import { describe, it, expect } from 'vitest';
import {
  AlgorithmIdentifier,
  KeyMetadata,
  Keyset,
  isValidAlgorithmIdentifier,
  checkCompatibility,
  getAlgorithmMetadata,
  validateKeyset,
  createKeyset,
  addKeyToKeyset,
  rotatePrimaryKey,
  disableKey,
} from './agility.js';

describe('Algorithm Versioning', () => {
  describe('isValidAlgorithmIdentifier', () => {
    it('should validate valid algorithm identifiers', () => {
      const validIds: AlgorithmIdentifier[] = [
        'AES-128-GCM-v1',
        'AES-256-GCM-v1',
        'X25519-ECDH-v1',
        'PBKDF2-SHA256-v1',
        'HKDF-SHA256-v1',
        'CRYSTALS-Kyber-512-v1',
        'CRYSTALS-Kyber-768-v1',
        'CRYSTALS-Dilithium2-v1',
        'CRYSTALS-Dilithium3-v1',
        'HYBRID-X25519-Kyber-v1',
      ];

      for (const id of validIds) {
        expect(isValidAlgorithmIdentifier(id)).toBe(true);
      }
    });

    it('should reject invalid algorithm identifiers', () => {
      const invalidIds = [
        'AES-256-GCM-v2',
        'RSA-2048-v1',
        'INVALID-ALGORITHM',
        'AES-256-GCM',
        '',
      ];

      for (const id of invalidIds) {
        expect(isValidAlgorithmIdentifier(id)).toBe(false);
      }
    });
  });

  describe('getAlgorithmMetadata', () => {
    it('should return metadata for AES-256-GCM-v1', () => {
      const metadata = getAlgorithmMetadata('AES-256-GCM-v1');

      expect(metadata.id).toBe('AES-256-GCM-v1');
      expect(metadata.name).toBe('AES-256-GCM');
      expect(metadata.category).toBe('encryption');
      expect(metadata.securityLevel).toBe(256);
      expect(metadata.isPostQuantum).toBe(false);
      expect(metadata.isHybrid).toBe(false);
      expect(metadata.status).toBe('active');
    });

    it('should return metadata for X25519-ECDH-v1', () => {
      const metadata = getAlgorithmMetadata('X25519-ECDH-v1');

      expect(metadata.id).toBe('X25519-ECDH-v1');
      expect(metadata.name).toBe('X25519 ECDH');
      expect(metadata.category).toBe('key-exchange');
      expect(metadata.securityLevel).toBe(128);
      expect(metadata.isPostQuantum).toBe(false);
      expect(metadata.isHybrid).toBe(false);
      expect(metadata.status).toBe('active');
    });

    it('should return metadata for CRYSTALS-Kyber-768-v1', () => {
      const metadata = getAlgorithmMetadata('CRYSTALS-Kyber-768-v1');

      expect(metadata.id).toBe('CRYSTALS-Kyber-768-v1');
      expect(metadata.name).toBe('CRYSTALS-Kyber-768');
      expect(metadata.category).toBe('key-exchange');
      expect(metadata.securityLevel).toBe(192);
      expect(metadata.isPostQuantum).toBe(true);
      expect(metadata.isHybrid).toBe(false);
      expect(metadata.status).toBe('experimental');
      expect(metadata.nistStandard).toBe('FIPS 203');
    });

    it('should return metadata for HYBRID-X25519-Kyber-v1', () => {
      const metadata = getAlgorithmMetadata('HYBRID-X25519-Kyber-v1');

      expect(metadata.id).toBe('HYBRID-X25519-Kyber-v1');
      expect(metadata.name).toBe('Hybrid X25519 + Kyber');
      expect(metadata.category).toBe('key-exchange');
      expect(metadata.securityLevel).toBe(256);
      expect(metadata.isPostQuantum).toBe(true);
      expect(metadata.isHybrid).toBe(true);
      expect(metadata.status).toBe('experimental');
    });
  });

  describe('checkCompatibility', () => {
    it('should return compatible for same algorithm', () => {
      const result = checkCompatibility('AES-256-GCM-v1', 'AES-256-GCM-v1');

      expect(result.compatible).toBe(true);
      expect(result.action).toBe('proceed');
    });

    it('should return compatible for classical algorithm migration', () => {
      const result = checkCompatibility('AES-128-GCM-v1', 'AES-256-GCM-v1');

      expect(result.compatible).toBe(true);
      expect(result.action).toBe('migrate');
      expect(result.reason).toContain('re-encryption');
    });

    it('should return incompatible for PQC algorithms (not yet supported)', () => {
      const result = checkCompatibility('X25519-ECDH-v1', 'CRYSTALS-Kyber-768-v1');

      expect(result.compatible).toBe(false);
      expect(result.action).toBe('abort');
      expect(result.reason).toContain('Post-quantum algorithms not yet supported');
    });

    it('should return incompatible for hybrid algorithms (not yet implemented)', () => {
      const result = checkCompatibility('X25519-ECDH-v1', 'HYBRID-X25519-Kyber-v1');

      expect(result.compatible).toBe(false);
      expect(result.action).toBe('abort');
      expect(result.reason).toContain('Hybrid algorithms not yet implemented');
    });
  });
});

describe('Keyset Pattern', () => {
  describe('createKeyset', () => {
    it('should create a keyset with initial key', () => {
      const initialKey: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset = createKeyset('AEAD', initialKey);

      expect(keyset.purpose).toBe('AEAD');
      expect(keyset.primaryKeyId).toBe(initialKey.id);
      expect(keyset.keys).toHaveLength(1);
      expect(keyset.keys[0]).toEqual(initialKey);
      expect(keyset.version).toBe(1);
    });

    it('should generate unique keyset ID', () => {
      const initialKey: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset1 = createKeyset('AEAD', initialKey);
      const keyset2 = createKeyset('AEAD', initialKey);

      expect(keyset1.id).not.toBe(keyset2.id);
    });
  });

  describe('validateKeyset', () => {
    it('should validate a correct keyset', () => {
      const initialKey: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset = createKeyset('AEAD', initialKey);
      const validation = validateKeyset(keyset);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing primary key', () => {
      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: 'non-existent-id',
        keys: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const validation = validateKeyset(keyset);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Primary key non-existent-id not found in keyset');
    });

    it('should detect multiple primary keys', () => {
      const key1: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const key2: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: key1.id,
        keys: [key1, key2],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const validation = validateKeyset(keyset);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Keyset cannot have more than one primary key');
    });

    it('should detect duplicate key IDs', () => {
      const keyId = crypto.randomUUID();
      const key1: KeyMetadata = {
        id: keyId,
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const key2: KeyMetadata = {
        id: keyId,
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: false,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: keyId,
        keys: [key1, key2],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const validation = validateKeyset(keyset);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Keyset contains duplicate key IDs');
    });
  });

  describe('addKeyToKeyset', () => {
    it('should add a new key to keyset', () => {
      const initialKey: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset = createKeyset('AEAD', initialKey);

      const newKey: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'enabled',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const updatedKeyset = addKeyToKeyset(keyset, newKey);

      expect(updatedKeyset.keys).toHaveLength(2);
      expect(updatedKeyset.keys[1]?.id).toBe(newKey.id);
      expect(updatedKeyset.keys[1]?.isPrimary).toBe(false); // Should not be primary
      expect(updatedKeyset.version).toBe(2);
    });

    it('should increment keyset version when adding key', () => {
      const initialKey: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset = createKeyset('AEAD', initialKey);

      const newKey: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'enabled',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const updatedKeyset = addKeyToKeyset(keyset, newKey);

      expect(updatedKeyset.version).toBe(keyset.version + 1);
    });
  });

  describe('rotatePrimaryKey', () => {
    it('should rotate primary key in keyset', () => {
      const key1: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const key2: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'enabled',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: false,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: key1.id,
        keys: [key1, key2],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updatedKeyset = rotatePrimaryKey(keyset, key2.id);

      expect(updatedKeyset.primaryKeyId).toBe(key2.id);
      expect(updatedKeyset.keys[0]?.isPrimary).toBe(false);
      expect(updatedKeyset.keys[1]?.isPrimary).toBe(true);
      expect(updatedKeyset.version).toBe(2);
    });

    it('should increment keyset version when rotating primary key', () => {
      const key1: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const key2: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'enabled',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: false,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: key1.id,
        keys: [key1, key2],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updatedKeyset = rotatePrimaryKey(keyset, key2.id);

      expect(updatedKeyset.version).toBe(keyset.version + 1);
    });
  });

  describe('disableKey', () => {
    it('should disable a key in keyset', () => {
      const key1: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const key2: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'enabled',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: false,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: key1.id,
        keys: [key1, key2],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updatedKeyset = disableKey(keyset, key2.id);

      expect(updatedKeyset.keys[1]?.status).toBe('disabled');
      expect(updatedKeyset.version).toBe(2);
    });

    it('should throw error when trying to disable primary key', () => {
      const key1: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: key1.id,
        keys: [key1],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(() => disableKey(keyset, key1.id)).toThrow(
        'Cannot disable primary key. Rotate primary key first.'
      );
    });

    it('should increment keyset version when disabling key', () => {
      const key1: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 1,
        algorithm: 'AES-256-GCM-v1',
        status: 'active',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: true,
        keySize: 256,
        isPostQuantum: false,
      };

      const key2: KeyMetadata = {
        id: crypto.randomUUID(),
        version: 2,
        algorithm: 'AES-256-GCM-v1',
        status: 'enabled',
        usage: ['encrypt', 'decrypt'],
        createdAt: new Date(),
        expiresAt: null,
        isPrimary: false,
        keySize: 256,
        isPostQuantum: false,
      };

      const keyset: Keyset = {
        id: crypto.randomUUID(),
        purpose: 'AEAD',
        primaryKeyId: key1.id,
        keys: [key1, key2],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updatedKeyset = disableKey(keyset, key2.id);

      expect(updatedKeyset.version).toBe(keyset.version + 1);
    });
  });
});

describe('Keyset Rotation Workflow', () => {
  it('should support key rotation workflow', () => {
    // Create initial keyset with classical algorithm
    const key1: KeyMetadata = {
      id: crypto.randomUUID(),
      version: 1,
      algorithm: 'AES-256-GCM-v1',
      status: 'active',
      usage: ['encrypt', 'decrypt'],
      createdAt: new Date(),
      expiresAt: null,
      isPrimary: true,
      keySize: 256,
      isPostQuantum: false,
    };

    let keyset = createKeyset('AEAD', key1);

    // Add new key (simulating key rotation)
    const key2: KeyMetadata = {
      id: crypto.randomUUID(),
      version: 2,
      algorithm: 'AES-256-GCM-v1',
      status: 'enabled',
      usage: ['encrypt', 'decrypt'],
      createdAt: new Date(),
      expiresAt: null,
      isPrimary: false,
      keySize: 256,
      isPostQuantum: false,
    };

    keyset = addKeyToKeyset(keyset, key2);

    // Rotate primary key
    keyset = rotatePrimaryKey(keyset, key2.id);

    // Disable old key
    keyset = disableKey(keyset, key1.id);

    // Verify final state
    expect(keyset.primaryKeyId).toBe(key2.id);
    expect(keyset.keys[0]?.status).toBe('disabled');
    expect(keyset.keys[1]?.status).toBe('enabled');
    expect(keyset.keys[1]?.isPrimary).toBe(true);
    expect(keyset.version).toBe(4); // 1 (create) + 1 (add) + 1 (rotate) + 1 (disable)
  });

  it('should support algorithm migration workflow', () => {
    // Create initial keyset with AES-128-GCM
    const key1: KeyMetadata = {
      id: crypto.randomUUID(),
      version: 1,
      algorithm: 'AES-128-GCM-v1',
      status: 'active',
      usage: ['encrypt', 'decrypt'],
      createdAt: new Date(),
      expiresAt: null,
      isPrimary: true,
      keySize: 128,
      isPostQuantum: false,
    };

    let keyset = createKeyset('AEAD', key1);

    // Add new key with AES-256-GCM (algorithm upgrade)
    const key2: KeyMetadata = {
      id: crypto.randomUUID(),
      version: 2,
      algorithm: 'AES-256-GCM-v1',
      status: 'enabled',
      usage: ['encrypt', 'decrypt'],
      createdAt: new Date(),
      expiresAt: null,
      isPrimary: false,
      keySize: 256,
      isPostQuantum: false,
    };

    keyset = addKeyToKeyset(keyset, key2);

    // Verify compatibility
    const compatibility = checkCompatibility('AES-128-GCM-v1', 'AES-256-GCM-v1');
    expect(compatibility.compatible).toBe(true);
    expect(compatibility.action).toBe('migrate');

    // Rotate primary key to new algorithm
    keyset = rotatePrimaryKey(keyset, key2.id);

    // Verify keyset has both algorithms (for decryption of old data)
    expect(keyset.keys).toHaveLength(2);
    expect(keyset.keys[0]?.algorithm).toBe('AES-128-GCM-v1');
    expect(keyset.keys[1]?.algorithm).toBe('AES-256-GCM-v1');
    expect(keyset.primaryKeyId).toBe(key2.id);
  });
});
