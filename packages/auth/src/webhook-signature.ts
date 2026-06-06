import crypto from 'crypto';
import { constantTimeEqual } from '@suite/crypto';

/**
 * Webhook signature verification options
 */
export interface WebhookSignatureOptions {
  /**
   * Tolerance for timestamp validation in seconds (default: 300 = 5 minutes)
   */
  tolerance?: number;
  /**
   * Whether to skip timestamp validation (not recommended for production)
   */
  skipTimestampValidation?: boolean;
}

/**
 * Webhook signature verification result
 */
export interface WebhookSignatureResult {
  valid: boolean;
  error?: string;
}

/**
 * Per-organization webhook secret storage interface
 * Organizations can have their own webhook secrets for multi-tenant scenarios
 */
export interface WebhookSecretStorage {
  /**
   * Get webhook secret for an organization
   */
  getSecret(organizationId: string): Promise<string | null>;
  /**
   * Set webhook secret for an organization
   */
  setSecret(organizationId: string, secret: string): Promise<void>;
  /**
   * Delete webhook secret for an organization
   */
  deleteSecret(organizationId: string): Promise<void>;
}

/**
 * Default tolerance for timestamp validation (5 minutes)
 */
const DEFAULT_TOLERANCE = 300;

/**
 * Parse signature header in format: "t=timestamp,v1=signature"
 * Similar to Stripe's signature format
 */
function parseSignatureHeader(header: string): { timestamp: string; signature: string } | null {
  const items = header.split(',');
  const timestampItem = items.find((item) => item.startsWith('t='));
  const signatureItem = items.find((item) => item.startsWith('v1='));

  if (!timestampItem || !signatureItem) {
    return null;
  }

  const timestamp = timestampItem.split('=')[1];
  const signature = signatureItem.split('=')[1];

  if (!timestamp || !signature) {
    return null;
  }

  return { timestamp, signature };
}

/**
 * Validate timestamp is within acceptable window to prevent replay attacks
 */
function validateTimestamp(timestamp: string, tolerance: number): { valid: boolean; error?: string } {
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - timestampNum;

  if (timeDiff > tolerance) {
    return { valid: false, error: `Webhook timestamp too old (${timeDiff}s > ${tolerance}s tolerance)` };
  }

  // Also reject timestamps in the future (with 5 second clock skew allowance)
  if (timeDiff < -5) {
    return { valid: false, error: 'Webhook timestamp is in the future' };
  }

  return { valid: true };
}

/**
 * Compute HMAC-SHA256 signature for webhook payload
 */
function computeSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature using HMAC-SHA256
 *
 * This function verifies webhook signatures following industry best practices:
 * - Uses HMAC-SHA256 for signature computation
 * - Includes timestamp validation to prevent replay attacks
 * - Uses constant-time comparison to prevent timing attacks
 * - Supports per-organization webhook secrets
 *
 * @param payload - Raw webhook payload (use raw body, not parsed JSON)
 * @param signatureHeader - Signature header in format "t=timestamp,v1=signature"
 * @param secret - Webhook secret (or use secretStorage with organizationId)
 * @param options - Verification options
 * @returns Verification result with valid flag and optional error message
 *
 * @example
 * ```ts
 * const result = await verifyWebhookSignature(
 *   rawBody,
 *   req.headers['x-webhook-signature'],
 *   process.env.WEBHOOK_SECRET,
 *   { tolerance: 300 }
 * );
 *
 * if (!result.valid) {
 *   return new Response('Invalid signature', { status: 401 });
 * }
 * ```
 */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  options: WebhookSignatureOptions = {}
): Promise<WebhookSignatureResult> {
  const { tolerance = DEFAULT_TOLERANCE, skipTimestampValidation = false } = options;

  // Parse signature header
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) {
    return { valid: false, error: 'Invalid signature header format' };
  }

  const { timestamp, signature } = parsed;

  // Validate timestamp to prevent replay attacks
  if (!skipTimestampValidation) {
    const timestampValidation = validateTimestamp(timestamp, tolerance);
    if (!timestampValidation.valid) {
      return timestampValidation;
    }
  }

  // Compute expected signature
  // Include timestamp in signed payload to prevent replay
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = computeSignature(signedPayload, secret);

  // Use constant-time comparison to prevent timing attacks
  // AGENTS.md Rule 11: Never use === to compare secrets, tokens, or HMAC outputs
  const signaturesMatch = await constantTimeEqual(signature, expectedSignature);

  if (!signaturesMatch) {
    return { valid: false, error: 'Signature verification failed' };
  }

  return { valid: true };
}

/**
 * Generate webhook signature for testing purposes
 *
 * @param payload - Raw webhook payload
 * @param secret - Webhook secret
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Signature header in format "t=timestamp,v1=signature"
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const signedPayload = `${ts}.${payload}`;
  const signature = computeSignature(signedPayload, secret);
  return `t=${ts},v1=${signature}`;
}

/**
 * Webhook secret manager for per-organization secret storage
 *
 * This provides a simple in-memory implementation. For production,
 * use a secure storage solution (e.g., Cloudflare Workers Secrets, KMS).
 */
export class InMemoryWebhookSecretStorage implements WebhookSecretStorage {
  private secrets: Map<string, string> = new Map();

  async getSecret(organizationId: string): Promise<string | null> {
    return this.secrets.get(organizationId) ?? null;
  }

  async setSecret(organizationId: string, secret: string): Promise<void> {
    this.secrets.set(organizationId, secret);
  }

  async deleteSecret(organizationId: string): Promise<void> {
    this.secrets.delete(organizationId);
  }
}

/**
 * Verify webhook signature with per-organization secret lookup
 *
 * @param payload - Raw webhook payload
 * @param signatureHeader - Signature header in format "t=timestamp,v1=signature"
 * @param organizationId - Organization ID for secret lookup
 * @param secretStorage - Secret storage implementation
 * @param options - Verification options
 * @returns Verification result
 */
export async function verifyWebhookSignatureWithSecretStorage(
  payload: string,
  signatureHeader: string,
  organizationId: string,
  secretStorage: WebhookSecretStorage,
  options: WebhookSignatureOptions = {}
): Promise<WebhookSignatureResult> {
  const secret = await secretStorage.getSecret(organizationId);

  if (!secret) {
    return { valid: false, error: 'No webhook secret found for organization' };
  }

  return verifyWebhookSignature(payload, signatureHeader, secret, options);
}

/**
 * Generate a cryptographically secure webhook secret
 *
 * @returns A 32-byte (64 hex chars) webhook secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

