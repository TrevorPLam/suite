# Vault App Guide

This document defines the architecture and implementation details for the Vault application in the Sovereign Suite.

---

## Overview

The Vault app provides encrypted credential storage with master key derivation, TOTP seed storage, and breach detection integration.

---

## Domain Model

### Credential

```typescript
interface Credential {
  id: string;
  tenantId: string;
  userId: string;
  name: string; // Plaintext for searchability
  encryptedBlob: Uint8Array; // Encrypted: username, password, TOTP seed
  createdAt: Date;
  updatedAt: Date;
}
```

### RecoveryKey

```typescript
interface RecoveryKey {
  id: string;
  userId: string;
  encryptedShard: Uint8Array; // Encrypted key shard
  shardIndex: number; // For Shamir's Secret Sharing
  createdAt: Date;
}
```

---

## Master Key Derivation

### PBKDF2 Key Derivation

```typescript
// packages/domain-vault/src/lib/keys.ts
import { pbkdf2 } from '@suite/crypto';

export async function deriveMasterKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  return await pbkdf2(password, salt, {
    iterations: 600000,
    hash: 'SHA-256',
    keyLength: 256,
  });
}
```

### Key Verification

```typescript
export async function verifyMasterKey(
  masterKey: CryptoKey,
  storedHash: string
): Promise<boolean> {
  const computedHash = await hashKey(masterKey);
  return computedHash === storedHash;
}
```

---

## TOTP Seed Storage

### TOTP Implementation

```typescript
// packages/domain-vault/src/lib/totp.ts
import { generateTOTP, verifyTOTP } from '@otpjs/totp';

export function generateTOTPCode(secret: string): string {
  return generateTOTP(secret);
}

export function verifyTOTPCode(token: string, secret: string): boolean {
  return verifyTOTP(token, secret);
}
```

### Encrypted Storage

TOTP seeds are encrypted with the master key before storage:

```typescript
export async function storeTOTPSeed(
  credentialId: string,
  seed: string,
  masterKey: CryptoKey
): Promise<void> {
  const encryptedSeed = await encrypt(seed, masterKey);
  
  await db.query(
    `UPDATE vault.credentials
     SET encrypted_blob = $1
     WHERE id = $2`,
    [encryptedSeed, credentialId]
  );
}
```

---

## Breach Detection Integration

### Integration with Have I Been Pwned

```typescript
// packages/domain-vault/src/lib/breach-detection.ts
export async function checkBreach(email: string): Promise<boolean> {
  const response = await fetch(
    `https://haveibeenpwned.com/api/v3/breachedaccount/${email}`,
    {
      headers: {
        'User-Agent': 'Sovereign Suite',
        'hibp-api-key': process.env.HIBP_API_KEY,
      },
    }
  );
  
  if (response.status === 404) {
    return false; // No breaches found
  }
  
  if (response.status === 200) {
    return true; // Breaches found
  }
  
  throw new Error('Failed to check breach status');
}
```

### Alert on Breach

```typescript
export async function alertOnBreach(
  userId: string,
  email: string
): Promise<void> {
  const breached = await checkBreach(email);
  
  if (breached) {
    await sendNotification(userId, {
      type: 'security_alert',
      message: 'Your email has been found in a data breach',
    });
  }
}
```

---

## Export Format

### Encrypted Export

```typescript
export async function exportVault(
  userId: string,
  masterKey: CryptoKey
): Promise<Blob> {
  const credentials = await getCredentials(userId);
  
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    credentials: credentials.map(c => ({
      id: c.id,
      name: c.name,
      encryptedBlob: c.encryptedBlob, // Still encrypted
    })),
  };
  
  const encryptedExport = await encrypt(JSON.stringify(exportData), masterKey);
  
  return new Blob([encryptedExport], { type: 'application/octet-stream' });
}
```

### Import

```typescript
export async function importVault(
  encryptedExport: Blob,
  masterKey: CryptoKey
): Promise<void> {
  const decrypted = await decrypt(await encryptedExport.arrayBuffer(), masterKey);
  const data = JSON.parse(decrypted);
  
  for (const credential of data.credentials) {
    await db.query(
      `INSERT INTO vault.credentials (id, user_id, name, encrypted_blob)
       VALUES ($1, $2, $3, $4)`,
      [credential.id, userId, credential.name, credential.encryptedBlob]
    );
  }
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/credentials` | GET | List credentials |
| `/api/credentials` | POST | Create credential |
| `/api/credentials/:id` | GET | Get credential |
| `/api/credentials/:id` | PUT | Update credential |
| `/api/credentials/:id` | DELETE | Delete credential |
| `/api/credentials/:id/totp` | GET | Generate TOTP code |
| `/api/vault/export` | GET | Export vault |
| `/api/vault/import` | POST | Import vault |
| `/api/vault/breach-check` | POST | Check for breaches |

---

## Encryption Strategy

### Plaintext Fields

- `name` (for searchability)

### Encrypted Fields

- `encrypted_blob` contains:
  - Username
  - Password
  - TOTP seed
  - Notes
  - Custom fields

---

*This document must be updated when the Vault app architecture changes.*
