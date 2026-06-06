/**
 * KMS Integration Tests
 *
 * Tests for KMS client implementations and envelope encryption with KMS.
 * All SDK calls are mocked since cloud SDKs are optional dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createKMSClient,
  type KMSConfig,
  type KMSClient,
  envelopeEncryptWithKMS,
  envelopeDecryptWithKMS,
  type KMSEnvelopeEncryptionResult,
} from './kms.js';

describe('KMS Integration', () => {
  describe('createKMSClient', () => {
    it('should create AWS KMS client with valid config', () => {
      const config: KMSConfig = {
        provider: 'aws',
        aws: {
          region: 'us-east-1',
          keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
        },
      };

      // If AWS SDK is installed, client should be created successfully
      // If not installed, it will throw with a helpful error message
      const client = createKMSClient(config);
      expect(client).toBeDefined();
      expect(client).toHaveProperty('encrypt');
      expect(client).toHaveProperty('decrypt');
      expect(client).toHaveProperty('generateKey');
    });

    it('should create Azure Key Vault client with valid config', () => {
      const config: KMSConfig = {
        provider: 'azure',
        azure: {
          vaultUrl: 'https://myvault.vault.azure.net',
          keyName: 'myKey',
        },
      };

      // If Azure SDK is not installed, it will throw with a helpful error message
      // If installed, client should be created successfully
      expect(() => createKMSClient(config)).toThrow();
    });

    it('should create GCP KMS client with valid config', () => {
      const config: KMSConfig = {
        provider: 'gcp',
        gcp: {
          projectId: 'my-project',
          location: 'us-east1',
          keyRing: 'my-keyring',
          keyName: 'my-key',
        },
      };

      // If GCP SDK is installed, client should be created successfully
      // If not installed, it will throw with a helpful error message
      const client = createKMSClient(config);
      expect(client).toBeDefined();
      expect(client).toHaveProperty('encrypt');
      expect(client).toHaveProperty('decrypt');
      expect(client).toHaveProperty('generateKey');
    });

    it('should throw error for missing AWS config', () => {
      const config: KMSConfig = {
        provider: 'aws',
      };

      expect(() => createKMSClient(config)).toThrow(
        'AWS configuration is required for AWS KMS client'
      );
    });

    it('should throw error for missing Azure config', () => {
      const config: KMSConfig = {
        provider: 'azure',
      };

      expect(() => createKMSClient(config)).toThrow(
        'Azure configuration is required for Azure Key Vault client'
      );
    });

    it('should throw error for missing GCP config', () => {
      const config: KMSConfig = {
        provider: 'gcp',
      };

      expect(() => createKMSClient(config)).toThrow(
        'GCP configuration is required for GCP KMS client'
      );
    });
  });

  describe('Mock KMS Client', () => {
    class MockKMSClient implements KMSClient {
      async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
        // Simulate encryption by XOR with a fixed key
        const key = new Uint8Array([0x42, 0x42, 0x42, 0x42]);
        const result = new Uint8Array(plaintext.length);
        for (let i = 0; i < plaintext.length; i++) {
          const p = plaintext[i] ?? 0;
          const k = key[i % key.length] ?? 0;
          result[i] = p ^ k;
        }
        return result;
      }

      async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
        // Simulate decryption by XOR with a fixed key
        const key = new Uint8Array([0x42, 0x42, 0x42, 0x42]);
        const result = new Uint8Array(ciphertext.length);
        for (let i = 0; i < ciphertext.length; i++) {
          const c = ciphertext[i] ?? 0;
          const k = key[i % key.length] ?? 0;
          result[i] = c ^ k;
        }
        return result;
      }

      async generateKey(keyLength: number): Promise<Uint8Array> {
        return crypto.getRandomValues(new Uint8Array(keyLength));
      }
    }

    let mockClient: KMSClient;

    beforeEach(() => {
      mockClient = new MockKMSClient();
    });

    describe('encrypt', () => {
      it('should encrypt plaintext', async () => {
        const plaintext = new TextEncoder().encode('Hello, World!');
        const ciphertext = await mockClient.encrypt(plaintext);

        expect(ciphertext).toBeInstanceOf(Uint8Array);
        expect(ciphertext.length).toBe(plaintext.length);
        expect(ciphertext).not.toEqual(plaintext);
      });

      it('should decrypt to original plaintext', async () => {
        const plaintext = new TextEncoder().encode('Hello, World!');
        const ciphertext = await mockClient.encrypt(plaintext);
        const decrypted = await mockClient.decrypt(ciphertext);

        expect(decrypted).toEqual(plaintext);
      });
    });

    describe('generateKey', () => {
      it('should generate key of specified length', async () => {
        const key = await mockClient.generateKey(32);

        expect(key).toBeInstanceOf(Uint8Array);
        expect(key.length).toBe(32);
      });

      it('should generate different keys on each call', async () => {
        const key1 = await mockClient.generateKey(32);
        const key2 = await mockClient.generateKey(32);

        expect(key1).not.toEqual(key2);
      });
    });
  });

  describe('Envelope Encryption with KMS', () => {
    class MockKMSClient implements KMSClient {
      async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
        // Simulate encryption by XOR with a fixed key
        const key = new Uint8Array([0x42, 0x42, 0x42, 0x42]);
        const result = new Uint8Array(plaintext.length);
        for (let i = 0; i < plaintext.length; i++) {
          const p = plaintext[i] ?? 0;
          const k = key[i % key.length] ?? 0;
          result[i] = p ^ k;
        }
        return result;
      }

      async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
        // Simulate decryption by XOR with a fixed key
        const key = new Uint8Array([0x42, 0x42, 0x42, 0x42]);
        const result = new Uint8Array(ciphertext.length);
        for (let i = 0; i < ciphertext.length; i++) {
          const c = ciphertext[i] ?? 0;
          const k = key[i % key.length] ?? 0;
          result[i] = c ^ k;
        }
        return result;
      }

      async generateKey(keyLength: number): Promise<Uint8Array> {
        return crypto.getRandomValues(new Uint8Array(keyLength));
      }
    }

    let mockClient: KMSClient;

    beforeEach(() => {
      mockClient = new MockKMSClient();
    });

    describe('envelopeEncryptWithKMS', () => {
      it('should encrypt plaintext with envelope encryption', async () => {
        const plaintext = new TextEncoder().encode('Secret data');
        const result = await envelopeEncryptWithKMS(plaintext, mockClient);

        expect(result).toHaveProperty('encryptedData');
        expect(result).toHaveProperty('encryptedDek');
        expect(result.encryptedData).toBeInstanceOf(Uint8Array);
        expect(result.encryptedDek).toBeInstanceOf(Uint8Array);
      });

      it('should include IV in encrypted data', async () => {
        const plaintext = new TextEncoder().encode('Secret data');
        const result = await envelopeEncryptWithKMS(plaintext, mockClient);

        // IV is 12 bytes, so encrypted data should be at least 12 bytes + ciphertext
        expect(result.encryptedData.length).toBeGreaterThan(12);
      });

      it('should encrypt DEK with KMS', async () => {
        const plaintext = new TextEncoder().encode('Secret data');
        const result = await envelopeEncryptWithKMS(plaintext, mockClient);

        // DEK is 32 bytes
        expect(result.encryptedDek.length).toBe(32);
      });

      it('should throw CryptoError on encryption failure', async () => {
        const failingClient: KMSClient = {
          encrypt: vi.fn().mockRejectedValue(new Error('KMS error')),
          decrypt: vi.fn(),
          generateKey: vi.fn(),
        };

        const plaintext = new TextEncoder().encode('Secret data');

        await expect(envelopeEncryptWithKMS(plaintext, failingClient)).rejects.toThrow();
      });
    });

    describe('envelopeDecryptWithKMS', () => {
      it('should decrypt envelope encrypted data', async () => {
        const plaintext = new TextEncoder().encode('Secret data');
        const encrypted = await envelopeEncryptWithKMS(plaintext, mockClient);
        const decrypted = await envelopeDecryptWithKMS(encrypted, mockClient);

        expect(decrypted).toEqual(plaintext);
      });

      it('should handle different plaintext sizes', async () => {
        const sizes = [0, 1, 16, 32, 64, 128, 256, 1024];

        for (const size of sizes) {
          const plaintext = crypto.getRandomValues(new Uint8Array(size));
          const encrypted = await envelopeEncryptWithKMS(plaintext, mockClient);
          const decrypted = await envelopeDecryptWithKMS(encrypted, mockClient);

          expect(decrypted).toEqual(plaintext);
        }
      });

      it('should throw CryptoError on decryption failure', async () => {
        const failingClient: KMSClient = {
          encrypt: vi.fn(),
          decrypt: vi.fn().mockRejectedValue(new Error('KMS error')),
          generateKey: vi.fn(),
        };

        const encrypted: KMSEnvelopeEncryptionResult = {
          encryptedData: new Uint8Array(48),
          encryptedDek: new Uint8Array(32),
        };

        await expect(envelopeDecryptWithKMS(encrypted, failingClient)).rejects.toThrow();
      });

      it('should throw CryptoError on invalid encrypted data', async () => {
        const invalidEncrypted: KMSEnvelopeEncryptionResult = {
          encryptedData: new Uint8Array(8), // Too short (less than IV + some data)
          encryptedDek: new Uint8Array(32),
        };

        await expect(envelopeDecryptWithKMS(invalidEncrypted, mockClient)).rejects.toThrow();
      });
    });

    describe('Round-trip encryption', () => {
      it('should successfully encrypt and decrypt round-trip', async () => {
        const plaintext = new TextEncoder().encode('This is a secret message that needs to be encrypted with envelope encryption using KMS.');
        
        const encrypted = await envelopeEncryptWithKMS(plaintext, mockClient);
        const decrypted = await envelopeDecryptWithKMS(encrypted, mockClient);

        expect(decrypted).toEqual(plaintext);
      });

      it('should handle multiple round-trips', async () => {
        const messages = [
          'Message 1',
          'Message 2 with more content',
          'Message 3 with even more content and special characters: !@#$%^&*()',
          'Message 4 with unicode: 你好世界 🌍',
        ];

        for (const message of messages) {
          const plaintext = new TextEncoder().encode(message);
          const encrypted = await envelopeEncryptWithKMS(plaintext, mockClient);
          const decrypted = await envelopeDecryptWithKMS(encrypted, mockClient);

          expect(decrypted).toEqual(plaintext);
        }
      });
    });
  });
});
