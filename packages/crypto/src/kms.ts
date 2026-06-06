/**
 * KMS Integration Module
 *
 * Provides integration with cloud Key Management Services (AWS KMS, Azure Key Vault, GCP KMS)
 * for envelope encryption patterns. This module uses optional dependencies to avoid forcing
 * installation of cloud SDKs when not needed.
 *
 * @module kms
 */

import { createCryptoError, CryptoErrorCode, isCryptoError } from './errors.js';

/**
 * Supported KMS providers
 */
export type KMSProvider = 'aws' | 'azure' | 'gcp';

/**
 * KMS configuration interface
 */
export interface KMSConfig {
  /** The KMS provider (aws, azure, gcp) */
  provider: KMSProvider;
  /** AWS-specific configuration */
  aws?: {
    /** AWS region */
    region: string;
    /** AWS KMS key ID or ARN */
    keyId: string;
    /** AWS credentials (optional if using default credential chain) */
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  };
  /** Azure-specific configuration */
  azure?: {
    /** Azure Key Vault URL */
    vaultUrl: string;
    /** Key name in Azure Key Vault */
    keyName: string;
    /** Key version (optional, uses latest if not specified) */
    keyVersion?: string;
  };
  /** GCP-specific configuration */
  gcp?: {
    /** GCP project ID */
    projectId: string;
    /** GCP location */
    location: string;
    /** GCP key ring name */
    keyRing: string;
    /** GCP key name */
    keyName: string;
  };
}

/**
 * KMS client interface
 *
 * All KMS providers must implement this interface for envelope encryption.
 */
export interface KMSClient {
  /**
   * Encrypts data using the KMS
   *
   * @param plaintext - The plaintext data to encrypt
   * @returns Promise<Uint8Array> - The encrypted ciphertext
   * @throws CryptoError if encryption fails
   */
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;

  /**
   * Decrypts data using the KMS
   *
   * @param ciphertext - The ciphertext to decrypt
   * @returns Promise<Uint8Array> - The decrypted plaintext
   * @throws CryptoError if decryption fails
   */
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;

  /**
   * Generates a new data key using the KMS
   *
   * @param keyLength - The length of the key to generate in bytes
   * @returns Promise<Uint8Array> - The generated plaintext data key
   * @throws CryptoError if key generation fails
   */
  generateKey(keyLength: number): Promise<Uint8Array>;
}

/**
 * AWS KMS client implementation
 *
 * Uses AWS SDK v3 for KMS operations. This is an optional dependency.
 */
class AWSKMSClient implements KMSClient {
  private client: unknown;
  private keyId: string;

  constructor(config: KMSConfig) {
    if (!config.aws) {
      throw createCryptoError(
        CryptoErrorCode.INVALID_ALGORITHM,
        'AWS configuration is required for AWS KMS client',
        { operation: 'AWSKMSClient constructor' }
      );
    }

    this.keyId = config.aws.keyId;

    // Dynamically import AWS SDK (optional dependency)
    try {
      // @ts-ignore - Optional dependency
      const { KMSClient } = require('@aws-sdk/client-kms');
      
      const clientConfig: Record<string, unknown> = {
        region: config.aws.region,
      };

      if (config.aws.credentials) {
        clientConfig.credentials = config.aws.credentials;
      }

      this.client = new KMSClient(clientConfig);
    } catch (_error) {
      throw createCryptoError(
        CryptoErrorCode.INVALID_ALGORITHM,
        'AWS SDK v3 is not installed. Install it with: npm install @aws-sdk/client-kms',
        { operation: 'AWSKMSClient constructor' }
      );
    }
  }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    try {
      // @ts-ignore - Optional dependency
      const { EncryptCommand } = require('@aws-sdk/client-kms');
      
      const command = new EncryptCommand({
        KeyId: this.keyId,
        Plaintext: plaintext,
      });

      // @ts-ignore - Client type is unknown due to optional dependency
      const response = await this.client.send(command);
      return new Uint8Array(response.CiphertextBlob);
    } catch (error) {
      throw createCryptoError(
        CryptoErrorCode.ENCRYPTION_FAILED,
        `AWS KMS encryption failed: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'encrypt', algorithm: 'AWS-KMS' }
      );
    }
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    try {
      // @ts-ignore - Optional dependency
      const { DecryptCommand } = require('@aws-sdk/client-kms');
      
      const command = new DecryptCommand({
        CiphertextBlob: ciphertext,
      });

      // @ts-ignore - Client type is unknown due to optional dependency
      const response = await this.client.send(command);
      return new Uint8Array(response.Plaintext);
    } catch (error) {
      throw createCryptoError(
        CryptoErrorCode.DECRYPTION_FAILED,
        `AWS KMS decryption failed: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'decrypt', algorithm: 'AWS-KMS' }
      );
    }
  }

  async generateKey(keyLength: number): Promise<Uint8Array> {
    try {
      // @ts-ignore - Optional dependency
      const { GenerateDataKeyCommand } = require('@aws-sdk/client-kms');
      
      const command = new GenerateDataKeyCommand({
        KeyId: this.keyId,
        KeyLength: keyLength * 8, // AWS expects bits
      });

      // @ts-ignore - Client type is unknown due to optional dependency
      const response = await this.client.send(command);
      return new Uint8Array(response.Plaintext);
    } catch (error) {
      throw createCryptoError(
        CryptoErrorCode.KEY_GENERATION_FAILED,
        `AWS KMS key generation failed: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'generateKey', algorithm: 'AWS-KMS' }
      );
    }
  }
}

/**
 * Azure Key Vault client implementation
 *
 * Uses Azure SDK for Key Vault operations. This is an optional dependency.
 */
class AzureKeyVaultClient implements KMSClient {
  private cryptoClient: unknown;

  constructor(config: KMSConfig) {
    if (!config.azure) {
      throw createCryptoError(
        CryptoErrorCode.INVALID_ALGORITHM,
        'Azure configuration is required for Azure Key Vault client',
        { operation: 'AzureKeyVaultClient constructor' }
      );
    }

    try {
      // @ts-ignore - Optional dependency
      const { DefaultAzureCredential } = require('@azure/identity');
      // @ts-ignore - Optional dependency
      const { KeyClient, CryptographyClient } = require('@azure/keyvault-keys');

      const credential = new DefaultAzureCredential();
      const _keyClient = new KeyClient(config.azure.vaultUrl, credential);

      const keyIdentifier = config.azure.keyVersion
        ? `${config.azure.vaultUrl}/keys/${config.azure.keyName}/${config.azure.keyVersion}`
        : `${config.azure.vaultUrl}/keys/${config.azure.keyName}`;

      // Get the key (async, but we need to handle this synchronously in constructor)
      // For now, we'll store the identifier and create the crypto client on first use
      this.cryptoClient = {
        keyIdentifier,
        credential,
        CryptographyClient,
      };
    } catch (_error) {
      throw createCryptoError(
        CryptoErrorCode.INVALID_ALGORITHM,
        'Azure SDK is not installed. Install it with: npm install @azure/identity @azure/keyvault-keys',
        { operation: 'AzureKeyVaultClient constructor' }
      );
    }
  }

  private async getClient(): Promise<unknown> {
    const client = this.cryptoClient as { keyIdentifier: string; credential: unknown; CryptographyClient: unknown };
    // @ts-ignore - Optional dependency
    const { CryptographyClient } = require('@azure/keyvault-keys');
    return new CryptographyClient(client.keyIdentifier, client.credential);
  }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    try {
      const client = await this.getClient();
      // @ts-ignore - Optional dependency
      const { KnownEncryptionAlgorithms } = require('@azure/keyvault-keys');

      // @ts-ignore - Client type is unknown due to optional dependency
      const result = await client.encrypt({
        algorithm: KnownEncryptionAlgorithms.RSAOaep256,
        plaintext: plaintext,
      });

      return new Uint8Array(result.result);
    } catch (error) {
      throw createCryptoError(
        CryptoErrorCode.ENCRYPTION_FAILED,
        `Azure Key Vault encryption failed: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'encrypt', algorithm: 'Azure-KeyVault' }
      );
    }
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    try {
      const client = await this.getClient();
      // @ts-ignore - Optional dependency
      const { KnownEncryptionAlgorithms } = require('@azure/keyvault-keys');

      // @ts-ignore - Client type is unknown due to optional dependency
      const result = await client.decrypt({
        algorithm: KnownEncryptionAlgorithms.RSAOaep256,
        ciphertext: ciphertext,
      });

      return new Uint8Array(result.result);
    } catch (error) {
      throw createCryptoError(
        CryptoErrorCode.DECRYPTION_FAILED,
        `Azure Key Vault decryption failed: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'decrypt', algorithm: 'Azure-KeyVault' }
      );
    }
  }

  async generateKey(keyLength: number): Promise<Uint8Array> {
    // Azure Key Vault doesn't have a direct "generate data key" operation like AWS KMS
    // We'll generate a random key locally and encrypt it with the KMS
    const key = crypto.getRandomValues(new Uint8Array(keyLength));
    const _encryptedKey = await this.encrypt(key);
    
    // Return the plaintext key (caller should store the encrypted version separately)
    return key;
  }
}

/**
 * GCP KMS client implementation
 *
 * Uses Google Cloud KMS SDK. This is an optional dependency.
 */
class GCPKMSClient implements KMSClient {
  private client: unknown;
  private keyName: string;

  constructor(config: KMSConfig) {
    if (!config.gcp) {
      throw createCryptoError(
        CryptoErrorCode.INVALID_ALGORITHM,
        'GCP configuration is required for GCP KMS client',
        { operation: 'GCPKMSClient constructor' }
      );
    }

    this.keyName = `projects/${config.gcp.projectId}/locations/${config.gcp.location}/keyRings/${config.gcp.keyRing}/cryptoKeys/${config.gcp.keyName}`;

    try {
      // @ts-ignore - Optional dependency
      const { KeyManagementServiceClient } = require('@google-cloud/kms');
      this.client = new KeyManagementServiceClient();
    } catch (_error) {
      throw createCryptoError(
        CryptoErrorCode.INVALID_ALGORITHM,
        'Google Cloud KMS SDK is not installed. Install it with: npm install @google-cloud/kms',
        { operation: 'GCPKMSClient constructor' }
      );
    }
  }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    try {
      // @ts-ignore - Client type is unknown due to optional dependency
      const [response] = await this.client.encrypt({
        name: this.keyName,
        plaintext: plaintext,
      });

      return new Uint8Array(response.ciphertext);
    } catch (error) {
      throw createCryptoError(
        CryptoErrorCode.ENCRYPTION_FAILED,
        `GCP KMS encryption failed: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'encrypt', algorithm: 'GCP-KMS' }
      );
    }
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    try {
      // @ts-ignore - Client type is unknown due to optional dependency
      const [response] = await this.client.decrypt({
        name: this.keyName,
        ciphertext: ciphertext,
      });

      return new Uint8Array(response.plaintext);
    } catch (error) {
      throw createCryptoError(
        CryptoErrorCode.DECRYPTION_FAILED,
        `GCP KMS decryption failed: ${error instanceof Error ? error.message : String(error)}`,
        { operation: 'decrypt', algorithm: 'GCP-KMS' }
      );
    }
  }

  async generateKey(keyLength: number): Promise<Uint8Array> {
    // GCP KMS doesn't have a direct "generate data key" operation like AWS KMS
    // We'll generate a random key locally and encrypt it with the KMS
    const key = crypto.getRandomValues(new Uint8Array(keyLength));
    const _encryptedKey = await this.encrypt(key);
    
    // Return the plaintext key (caller should store the encrypted version separately)
    return key;
  }
}

/**
 * Creates a KMS client based on the provided configuration
 *
 * @param config - The KMS configuration
 * @returns KMSClient - The configured KMS client
 * @throws CryptoError if configuration is invalid or SDK is not installed
 *
 * @example
 * ```ts
 * const kmsClient = createKMSClient({
 *   provider: 'aws',
 *   aws: {
 *     region: 'us-east-1',
 *     keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
 *   }
 * });
 * ```
 */
export function createKMSClient(config: KMSConfig): KMSClient {
  switch (config.provider) {
    case 'aws':
      return new AWSKMSClient(config);
    case 'azure':
      return new AzureKeyVaultClient(config);
    case 'gcp':
      return new GCPKMSClient(config);
    default:
      throw createCryptoError(
        CryptoErrorCode.INVALID_ALGORITHM,
        `Unsupported KMS provider`,
        { operation: 'createKMSClient' }
      );
  }
}

/**
 * Envelope encryption result with KMS
 */
export interface KMSEnvelopeEncryptionResult {
  /** The encrypted data */
  encryptedData: Uint8Array;
  /** The encrypted Data Encryption Key (DEK) */
  encryptedDek: Uint8Array;
}

/**
 * Envelope encryption with KMS
 *
 * Generates a random Data Encryption Key (DEK), encrypts the data with the DEK,
 * then encrypts the DEK with the KMS. This pattern separates bulk data encryption
 * from key management, allowing the KMS to manage the KEK while the DEK is ephemeral.
 *
 * @param plaintext - The plaintext data to encrypt
 * @param kmsClient - The KMS client to use for encrypting the DEK
 * @returns Promise<KMSEnvelopeEncryptionResult> - The encrypted data and encrypted DEK
 * @throws CryptoError if encryption fails
 *
 * @example
 * ```ts
 * const kmsClient = createKMSClient({ provider: 'aws', aws: { region: 'us-east-1', keyId: '...' } });
 * const plaintext = new TextEncoder().encode('Secret data');
 * const { encryptedData, encryptedDek } = await envelopeEncryptWithKMS(plaintext, kmsClient);
 * ```
 */
export async function envelopeEncryptWithKMS(
  plaintext: Uint8Array,
  kmsClient: KMSClient
): Promise<KMSEnvelopeEncryptionResult> {
  try {
    // Generate a random 256-bit (32-byte) Data Encryption Key (DEK)
    const dek = crypto.getRandomValues(new Uint8Array(32));

    // Import the DEK for use with Web Crypto API
    const dekKey = await crypto.subtle.importKey(
      'raw',
      dek.buffer.slice(dek.byteOffset, dek.byteOffset + dek.byteLength) as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Generate a random IV (96 bits for AES-GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data with the DEK
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dekKey,
      plaintext.buffer.slice(plaintext.byteOffset, plaintext.byteOffset + plaintext.byteLength) as BufferSource
    );

    // Encrypt the DEK with the KMS
    const encryptedDek = await kmsClient.encrypt(dek);

    // Return IV + encrypted data + encrypted DEK
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedData), iv.length);

    return {
      encryptedData: result,
      encryptedDek,
    };
  } catch (error) {
    if (isCryptoError(error)) {
      throw error;
    }
    throw createCryptoError(
      CryptoErrorCode.ENCRYPTION_FAILED,
      `Envelope encryption with KMS failed: ${error instanceof Error ? error.message : String(error)}`,
      { operation: 'envelopeEncryptWithKMS' }
    );
  }
}

/**
 * Envelope decryption with KMS
 *
 * Decrypts the DEK using the KMS, then decrypts the data with the DEK.
 *
 * @param result - The envelope encryption result (encrypted data + encrypted DEK)
 * @param kmsClient - The KMS client to use for decrypting the DEK
 * @returns Promise<Uint8Array> - The decrypted plaintext
 * @throws CryptoError if decryption fails
 *
 * @example
 * ```ts
 * const plaintext = await envelopeDecryptWithKMS({ encryptedData, encryptedDek }, kmsClient);
 * console.log(new TextDecoder().decode(plaintext)); // 'Secret data'
 * ```
 */
export async function envelopeDecryptWithKMS(
  result: KMSEnvelopeEncryptionResult,
  kmsClient: KMSClient
): Promise<Uint8Array> {
  try {
    // Decrypt the DEK with the KMS
    const dek = await kmsClient.decrypt(result.encryptedDek);

    // Import the DEK for use with Web Crypto API
    const dekKey = await crypto.subtle.importKey(
      'raw',
      dek.buffer.slice(dek.byteOffset, dek.byteOffset + dek.byteLength) as BufferSource,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    // Extract IV (first 12 bytes) and ciphertext
    const iv = result.encryptedData.slice(0, 12);
    const ciphertext = result.encryptedData.slice(12);

    // Decrypt the data with the DEK
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      dekKey,
      ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength) as BufferSource
    );

    return new Uint8Array(decryptedData);
  } catch (error) {
    if (isCryptoError(error)) {
      throw error;
    }
    throw createCryptoError(
      CryptoErrorCode.DECRYPTION_FAILED,
      `Envelope decryption with KMS failed: ${error instanceof Error ? error.message : String(error)}`,
      { operation: 'envelopeDecryptWithKMS' }
    );
  }
}
