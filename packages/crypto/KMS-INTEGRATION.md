# KMS Integration

This document describes the Key Management Service (KMS) integration in `@suite/crypto`, which provides envelope encryption with cloud KMS providers (AWS KMS, Azure Key Vault, GCP KMS).

## Overview

The KMS integration follows the envelope encryption pattern:
- Generate a random Data Encryption Key (DEK) locally
- Encrypt data with the DEK using AES-256-GCM
- Encrypt the DEK with the KMS
- Store both the encrypted data and encrypted DEK

This pattern separates bulk data encryption from key management, allowing the KMS to manage the Key Encryption Key (KEK) while the DEK is ephemeral.

## Supported Providers

### AWS KMS
- **SDK**: `@aws-sdk/client-kms` (v3)
- **Key Types**: Customer-managed CMKs
- **Operations**: Encrypt, Decrypt, GenerateDataKey

### Azure Key Vault
- **SDK**: `@azure/identity`, `@azure/keyvault-keys`
- **Key Types**: RSA keys (RSA-OAEP-256)
- **Operations**: Encrypt, Decrypt

### Google Cloud KMS
- **SDK**: `@google-cloud/kms`
- **Key Types**: Symmetric keys
- **Operations**: Encrypt, Decrypt

## Installation

KMS SDKs are optional dependencies. Install only the SDKs for the providers you need:

```bash
# AWS KMS
pnpm add @aws-sdk/client-kms

# Azure Key Vault
pnpm add @azure/identity @azure/keyvault-keys

# Google Cloud KMS
pnpm add @google-cloud/kms

# All providers
pnpm add @aws-sdk/client-kms @azure/identity @azure/keyvault-keys @google-cloud/kms
```

## Usage

### AWS KMS

```typescript
import { createKMSClient, envelopeEncryptWithKMS, envelopeDecryptWithKMS } from '@suite/crypto';

// Create AWS KMS client
const kmsClient = createKMSClient({
  provider: 'aws',
  aws: {
    region: 'us-east-1',
    keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
    // Optional: explicit credentials (uses default credential chain if not provided)
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  },
});

// Encrypt data
const plaintext = new TextEncoder().encode('Secret data');
const { encryptedData, encryptedDek } = await envelopeEncryptWithKMS(plaintext, kmsClient);

// Decrypt data
const decrypted = await envelopeDecryptWithKMS({ encryptedData, encryptedDek }, kmsClient);
console.log(new TextDecoder().decode(decrypted)); // 'Secret data'
```

### Azure Key Vault

```typescript
import { createKMSClient, envelopeEncryptWithKMS, envelopeDecryptWithKMS } from '@suite/crypto';

// Create Azure Key Vault client
const kmsClient = createKMSClient({
  provider: 'azure',
  azure: {
    vaultUrl: 'https://myvault.vault.azure.net',
    keyName: 'myKey',
    // Optional: specific key version (uses latest if not specified)
    keyVersion: '7123456789123456789',
  },
});

// Uses DefaultAzureCredential for authentication
// Supports: environment variables, managed identity, service principal, etc.

// Encrypt and decrypt (same as AWS)
const plaintext = new TextEncoder().encode('Secret data');
const { encryptedData, encryptedDek } = await envelopeEncryptWithKMS(plaintext, kmsClient);
const decrypted = await envelopeDecryptWithKMS({ encryptedData, encryptedDek }, kmsClient);
```

### Google Cloud KMS

```typescript
import { createKMSClient, envelopeEncryptWithKMS, envelopeDecryptWithKMS } from '@suite/crypto';

// Create GCP KMS client
const kmsClient = createKMSClient({
  provider: 'gcp',
  gcp: {
    projectId: 'my-project',
    location: 'us-east1',
    keyRing: 'my-keyring',
    keyName: 'my-key',
  },
});

// Uses Application Default Credentials for authentication
// Supports: service account key, workload identity, etc.

// Encrypt and decrypt (same as AWS)
const plaintext = new TextEncoder().encode('Secret data');
const { encryptedData, encryptedDek } = await envelopeEncryptWithKMS(plaintext, kmsClient);
const decrypted = await envelopeDecryptWithKMS({ encryptedData, encryptedDek }, kmsClient);
```

## Credential Management

### AWS KMS

AWS SDK v3 uses the default credential chain:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM role (when running on EC2)
4. Other credential providers

**Best Practices**:
- Use IAM roles for EC2/Lambda
- Use environment variables for local development
- Never hardcode credentials in code
- Use least-privilege IAM policies

### Azure Key Vault

Azure SDK uses `DefaultAzureCredential`:
1. Environment variables (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`)
2. Managed identity (when running on Azure resources)
3. Workload identity (for Kubernetes)
4. Visual Studio Code authentication
5. Azure CLI authentication

**Best Practices**:
- Use managed identity for Azure resources
- Use service principal for local development
- Grant key access via Azure Key Vault access policies
- Use least-privilege access (encrypt/decrypt only)

### Google Cloud KMS

Google Cloud SDK uses Application Default Credentials:
1. Service account key file (`GOOGLE_APPLICATION_CREDENTIALS`)
2. Workload identity (for GKE)
3. Metadata server (when running on GCE)
4. gcloud CLI authentication

**Best Practices**:
- Use workload identity for GKE
- Use service account with least privileges for local development
- Grant key access via IAM roles (Cloud KMS CryptoKey Encrypter/Decrypter)
- Rotate service account keys regularly

## Envelope Encryption Pattern

The envelope encryption pattern provides several benefits:

1. **Performance**: Bulk data encryption is done locally with AES-GCM (fast)
2. **Cost**: Only the DEK (32 bytes) is encrypted with the KMS (reduces KMS API calls)
3. **Flexibility**: DEKs can be rotated without re-encrypting all data
4. **Security**: KMS never sees the plaintext data

### How It Works

```
1. Generate random DEK (32 bytes)
2. Encrypt plaintext with DEK using AES-256-GCM
3. Encrypt DEK with KMS
4. Store: encryptedData (IV + ciphertext) + encryptedDek
```

### Data Format

- **encryptedData**: 12-byte IV + ciphertext (AES-GCM)
- **encryptedDek**: 32-byte encrypted DEK (KMS-specific format)

## Testing with Mocks

The KMS integration includes comprehensive tests with mocked SDKs. This allows testing without actual cloud credentials:

```typescript
import { describe, it, expect } from 'vitest';
import { envelopeEncryptWithKMS, envelopeDecryptWithKMS } from '@suite/crypto';

class MockKMSClient {
  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    // Mock encryption
    return plaintext;
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    // Mock decryption
    return ciphertext;
  }

  async generateKey(keyLength: number): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(keyLength));
  }
}

it('should encrypt and decrypt with mock KMS', async () => {
  const mockClient = new MockKMSClient();
  const plaintext = new TextEncoder().encode('Secret data');
  
  const encrypted = await envelopeEncryptWithKMS(plaintext, mockClient);
  const decrypted = await envelopeDecryptWithKMS(encrypted, mockClient);
  
  expect(decrypted).toEqual(plaintext);
});
```

## Error Handling

All KMS operations throw `CryptoError` with detailed context:

```typescript
import { isCryptoError, CryptoErrorCode } from '@suite/crypto';

try {
  const encrypted = await envelopeEncryptWithKMS(plaintext, kmsClient);
} catch (error) {
  if (isCryptoError(error)) {
    console.error(`Error code: ${error.code}`);
    console.error(`Operation: ${error.context.operation}`);
    console.error(`Algorithm: ${error.context.algorithm}`);
    console.error(`Message: ${error.message}`);
  }
}
```

### Common Errors

- `INVALID_ALGORITHM`: SDK not installed or invalid configuration
- `ENCRYPTION_FAILED`: KMS encryption failed (check credentials, key ID, permissions)
- `DECRYPTION_FAILED`: KMS decryption failed (check encrypted data, key ID)
- `KEY_GENERATION_FAILED`: KMS key generation failed

## Security Considerations

1. **Never log sensitive data**: Do not log plaintext, ciphertext, or keys
2. **Use least-privilege access**: Grant only encrypt/decrypt permissions to KMS keys
3. **Rotate KMS keys**: Regularly rotate KMS keys according to your security policy
4. **Monitor KMS usage**: Enable CloudTrail/Audit Logs for KMS operations
5. **Backup encrypted data**: Ensure encrypted data is backed up before key rotation
6. **Test disaster recovery**: Practice restoring data from encrypted backups

## Performance Considerations

- **Latency**: KMS operations add ~50-200ms latency per encrypt/decrypt
- **Cost**: KMS API calls incur costs (check provider pricing)
- **Throughput**: KMS has rate limits (use batching for high throughput)
- **Caching**: Consider caching DEKs for multiple operations (with security trade-offs)

## Limitations

1. **No on-premises KMS**: Only cloud KMS providers are supported
2. **No custom KMS**: Must use official cloud provider SDKs
3. **No key management**: Key creation/rotation must be done via cloud provider consoles
4. **Azure/GCP generateKey**: These providers don't have native "generate data key" operations, so we generate locally and encrypt

## Troubleshooting

### AWS KMS

**Error**: "AWS SDK v3 is not installed"
- **Solution**: Install with `pnpm add @aws-sdk/client-kms`

**Error**: "AccessDeniedException"
- **Solution**: Check IAM permissions, ensure KMS key policy allows encrypt/decrypt

**Error**: "NotFoundException"
- **Solution**: Verify key ID/ARN is correct and key exists in the specified region

### Azure Key Vault

**Error**: "Azure SDK is not installed"
- **Solution**: Install with `pnpm add @azure/identity @azure/keyvault-keys`

**Error**: "Authentication failed"
- **Solution**: Check Azure credentials, ensure DefaultAzureCredential can authenticate

**Error**: "Key not found"
- **Solution**: Verify vault URL, key name, and key version are correct

### Google Cloud KMS

**Error**: "Google Cloud KMS SDK is not installed"
- **Solution**: Install with `pnpm add @google-cloud/kms`

**Error**: "Authentication failed"
- **Solution**: Check GOOGLE_APPLICATION_CREDENTIALS or workload identity setup

**Error**: "Key not found"
- **Solution**: Verify project ID, location, key ring, and key name are correct

## References

- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)
- [Google Cloud KMS Documentation](https://cloud.google.com/kms/docs)
- [Envelope Encryption Pattern](https://docs.aws.amazon.com/kms/latest/developerguide/envelope-encryption.html)
