import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyWebhookSignature,
  generateWebhookSignature,
  InMemoryWebhookSecretStorage,
  verifyWebhookSignatureWithSecretStorage,
  generateWebhookSecret,
  type WebhookSecretStorage,
} from './webhook-signature.js';

describe('webhook-signature', () => {
  const secret = 'whsec_test_secret_1234567890abcdef';
  const payload = JSON.stringify({ event: 'user.created', data: { id: '123' } });

  describe('verifyWebhookSignature', () => {
    it('should accept valid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, secret, timestamp);
      const result = await verifyWebhookSignature(payload, signature, secret);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=invalid_signature`;
      const result = await verifyWebhookSignature(payload, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature verification failed');
    });

    it('should reject signature with wrong secret', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, secret, timestamp);
      const wrongSecret = 'whsec_wrong_secret';
      const result = await verifyWebhookSignature(payload, signature, wrongSecret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature verification failed');
    });

    it('should reject malformed signature header', async () => {
      const malformedSignature = 'invalid_format';
      const result = await verifyWebhookSignature(payload, malformedSignature, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature header format');
    });

    it('should reject signature header without timestamp', async () => {
      const signature = 'v1=some_signature';
      const result = await verifyWebhookSignature(payload, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature header format');
    });

    it('should reject signature header without signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp}`;
      const result = await verifyWebhookSignature(payload, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature header format');
    });

    it('should reject old timestamp (replay attack prevention)', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const signature = generateWebhookSignature(payload, secret, oldTimestamp);
      const result = await verifyWebhookSignature(payload, signature, secret, { tolerance: 300 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Webhook timestamp too old');
    });

    it('should reject future timestamp', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 100; // 100 seconds in future
      const signature = generateWebhookSignature(payload, secret, futureTimestamp);
      const result = await verifyWebhookSignature(payload, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Webhook timestamp is in the future');
    });

    it('should accept timestamp within tolerance window', async () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 200; // 200 seconds ago
      const signature = generateWebhookSignature(payload, secret, recentTimestamp);
      const result = await verifyWebhookSignature(payload, signature, secret, { tolerance: 300 });

      expect(result.valid).toBe(true);
    });

    it('should allow custom tolerance', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago
      const signature = generateWebhookSignature(payload, secret, oldTimestamp);
      const result = await verifyWebhookSignature(payload, signature, secret, { tolerance: 50 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Webhook timestamp too old');
    });

    it('should skip timestamp validation when configured', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 1000; // 1000 seconds ago
      const signature = generateWebhookSignature(payload, secret, oldTimestamp);
      const result = await verifyWebhookSignature(payload, signature, secret, {
        skipTimestampValidation: true,
      });

      expect(result.valid).toBe(true);
    });

    it('should reject invalid timestamp format', async () => {
      const signature = 't=invalid,v1=some_signature';
      const result = await verifyWebhookSignature(payload, signature, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid timestamp format');
    });

    it('should handle empty payload', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature('', secret, timestamp);
      const result = await verifyWebhookSignature('', signature, secret);

      expect(result.valid).toBe(true);
    });

    it('should handle large payload', async () => {
      const largePayload = JSON.stringify({ data: 'x'.repeat(10000) });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(largePayload, secret, timestamp);
      const result = await verifyWebhookSignature(largePayload, signature, secret);

      expect(result.valid).toBe(true);
    });
  });

  describe('generateWebhookSignature', () => {
    it('should generate valid signature', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, secret, timestamp);

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('should use current timestamp when not provided', () => {
      const before = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, secret);
      const after = Math.floor(Date.now() / 1000);

      const timestampMatch = signature.match(/t=(\d+)/);
      expect(timestampMatch).toBeTruthy();

      if (timestampMatch && timestampMatch[1]) {
        const timestamp = parseInt(timestampMatch[1], 10);
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      }
    });

    it('should generate consistent signatures for same input', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature1 = generateWebhookSignature(payload, secret, timestamp);
      const signature2 = generateWebhookSignature(payload, secret, timestamp);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different payloads', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature1 = generateWebhookSignature(payload, secret, timestamp);
      const signature2 = generateWebhookSignature('different payload', secret, timestamp);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('InMemoryWebhookSecretStorage', () => {
    let storage: WebhookSecretStorage;

    beforeEach(() => {
      storage = new InMemoryWebhookSecretStorage();
    });

    it('should store and retrieve secret', async () => {
      await storage.setSecret('org-123', 'secret-123');
      const retrieved = await storage.getSecret('org-123');

      expect(retrieved).toBe('secret-123');
    });

    it('should return null for non-existent secret', async () => {
      const retrieved = await storage.getSecret('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should delete secret', async () => {
      await storage.setSecret('org-123', 'secret-123');
      await storage.deleteSecret('org-123');
      const retrieved = await storage.getSecret('org-123');

      expect(retrieved).toBeNull();
    });

    it('should handle multiple organizations', async () => {
      await storage.setSecret('org-1', 'secret-1');
      await storage.setSecret('org-2', 'secret-2');
      await storage.setSecret('org-3', 'secret-3');

      expect(await storage.getSecret('org-1')).toBe('secret-1');
      expect(await storage.getSecret('org-2')).toBe('secret-2');
      expect(await storage.getSecret('org-3')).toBe('secret-3');
    });

    it('should overwrite existing secret', async () => {
      await storage.setSecret('org-123', 'secret-123');
      await storage.setSecret('org-123', 'secret-456');
      const retrieved = await storage.getSecret('org-123');

      expect(retrieved).toBe('secret-456');
    });
  });

  describe('verifyWebhookSignatureWithSecretStorage', () => {
    let storage: WebhookSecretStorage;

    beforeEach(() => {
      storage = new InMemoryWebhookSecretStorage();
    });

    it('should verify signature with stored secret', async () => {
      await storage.setSecret('org-123', secret);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, secret, timestamp);

      const result = await verifyWebhookSignatureWithSecretStorage(
        payload,
        signature,
        'org-123',
        storage
      );

      expect(result.valid).toBe(true);
    });

    it('should reject when no secret found for organization', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, secret, timestamp);

      const result = await verifyWebhookSignatureWithSecretStorage(
        payload,
        signature,
        'non-existent',
        storage
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No webhook secret found for organization');
    });

    it('should reject invalid signature with stored secret', async () => {
      await storage.setSecret('org-123', secret);
      const invalidSignature = `t=${Math.floor(Date.now() / 1000)},v1=invalid`;

      const result = await verifyWebhookSignatureWithSecretStorage(
        payload,
        invalidSignature,
        'org-123',
        storage
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Signature verification failed');
    });

    it('should use correct secret for each organization', async () => {
      await storage.setSecret('org-1', 'secret-1');
      await storage.setSecret('org-2', 'secret-2');

      const timestamp = Math.floor(Date.now() / 1000);
      const signature1 = generateWebhookSignature(payload, 'secret-1', timestamp);
      const signature2 = generateWebhookSignature(payload, 'secret-2', timestamp);

      const result1 = await verifyWebhookSignatureWithSecretStorage(
        payload,
        signature1,
        'org-1',
        storage
      );
      const result2 = await verifyWebhookSignatureWithSecretStorage(
        payload,
        signature2,
        'org-2',
        storage
      );

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });

  describe('generateWebhookSecret', () => {
    it('should generate 64-character hex string', () => {
      const secret = generateWebhookSecret();

      expect(secret).toHaveLength(64);
      expect(secret).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different secrets each time', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();

      expect(secret1).not.toBe(secret2);
    });

    it('should generate cryptographically secure secrets', () => {
      const secrets = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        secrets.add(generateWebhookSecret());
      }

      // All 100 secrets should be unique (extremely unlikely to collide)
      expect(secrets.size).toBe(iterations);
    });
  });

  describe('integration tests', () => {
    it('should handle complete webhook flow', async () => {
      // Generate signature
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = generateWebhookSignature(payload, secret, timestamp);

      // Verify signature
      const result = await verifyWebhookSignature(payload, signature, secret);

      expect(result.valid).toBe(true);
    });

    it('should prevent replay attacks with timestamp validation', async () => {
      // Generate signature with old timestamp
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400;
      const signature = generateWebhookSignature(payload, secret, oldTimestamp);

      // Should reject
      const result = await verifyWebhookSignature(payload, signature, secret, { tolerance: 300 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Webhook timestamp too old');
    });

    it('should handle multi-tenant scenario with secret storage', async () => {
      const storage = new InMemoryWebhookSecretStorage();

      // Setup secrets for multiple organizations
      await storage.setSecret('org-1', 'secret-1');
      await storage.setSecret('org-2', 'secret-2');

      // Generate and verify webhook for org-1
      const timestamp = Math.floor(Date.now() / 1000);
      const signature1 = generateWebhookSignature(payload, 'secret-1', timestamp);
      const result1 = await verifyWebhookSignatureWithSecretStorage(
        payload,
        signature1,
        'org-1',
        storage
      );

      // Generate and verify webhook for org-2
      const signature2 = generateWebhookSignature(payload, 'secret-2', timestamp);
      const result2 = await verifyWebhookSignatureWithSecretStorage(
        payload,
        signature2,
        'org-2',
        storage
      );

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);

      // Cross-organization signature should fail
      const resultCross = await verifyWebhookSignatureWithSecretStorage(
        payload,
        signature1,
        'org-2',
        storage
      );

      expect(resultCross.valid).toBe(false);
    });
  });
});
