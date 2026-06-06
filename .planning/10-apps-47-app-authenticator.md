# Authenticator App Guide

This document defines the architecture and implementation details for the Authenticator application in the Sovereign Suite.

---

## Overview

The Authenticator app provides encrypted TOTP/FIDO2 seed storage with cross-device backup and recovery flow.

---

## Domain Model

### AuthenticatorEntry

```typescript
interface AuthenticatorEntry {
  id: string;
  tenantId: string;
  userId: string;
  name: string; // Plaintext for searchability
  type: 'totp' | 'fido2';
  encryptedBlob: Uint8Array; // Encrypted: secret, counter, etc.
  createdAt: Date;
  updatedAt: Date;
}
```

---

## TOTP/FIDO2 Seed Storage

### TOTP Implementation

```typescript
// packages/domain-authenticator/src/lib/totp.ts
import { generateTOTP, verifyTOTP } from '@otpjs/totp';

export function generateTOTPCode(secret: string): string {
  return generateTOTP(secret);
}

export function verifyTOTPCode(token: string, secret: string): boolean {
  return verifyTOTP(token, secret);
}
```

### FIDO2 Implementation

```typescript
// packages/domain-authenticator/src/lib/fido2.ts
import { register, authenticate } from '@simplewebauthn/browser';

export async function registerFIDO2Credential(
  userId: string,
  username: string
): Promise<RegistrationResponse> {
  const response = await register({
    username,
    userDisplayName: username,
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
    },
  });
  
  return response;
}

export async function authenticateFIDO2Credential(
  credentialId: string
): Promise<AuthenticationResponse> {
  const response = await authenticate({
    credentialId,
  });
  
  return response;
}
```

---

## Encrypted Cross-Device Backup

### Backup Flow

```typescript
export async function backupAuthenticatorData(
  userId: string,
  masterKey: CryptoKey
): Promise<string> {
  const entries = await getAuthenticatorEntries(userId);
  
  const backupData = {
    version: 1,
    userId,
    entries: entries.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      encryptedBlob: e.encryptedBlob,
    })),
  };
  
  const encryptedBackup = await encrypt(JSON.stringify(backupData), masterKey);
  
  // Store in R2
  const backupKey = `authenticator-backup-${userId}-${Date.now()}`;
  await env.R2.put(backupKey, encryptedBackup);
  
  return backupKey;
}
```

### Restore Flow

```typescript
export async function restoreAuthenticatorData(
  backupKey: string,
  masterKey: CryptoKey
): Promise<void> {
  const encryptedBackup = await env.R2.get(backupKey);
  
  if (!encryptedBackup) {
    throw new Error('Backup not found');
  }
  
  const decrypted = await decrypt(encryptedBackup, masterKey);
  const backupData = JSON.parse(decrypted);
  
  for (const entry of backupData.entries) {
    await db.query(
      `INSERT INTO authenticator.entries (id, tenant_id, user_id, name, type, encrypted_blob)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [entry.id, entry.tenantId, entry.userId, entry.name, entry.type, entry.encryptedBlob]
    );
  }
}
```

---

## Recovery Flow

### Recovery Questions

```typescript
interface RecoveryQuestion {
  question: string;
  encryptedAnswer: Uint8Array;
}

export async function setupRecovery(
  userId: string,
  questions: RecoveryQuestion[],
  masterKey: CryptoKey
): Promise<void> {
  for (const q of questions) {
    await db.query(
      `INSERT INTO authenticator.recovery_questions (user_id, question, encrypted_answer)
       VALUES ($1, $2, $3)`,
      [userId, q.question, await encrypt(q.encryptedAnswer, masterKey)]
    );
  }
}
```

### Recovery Verification

```typescript
export async function verifyRecovery(
  userId: string,
  answers: string[],
  masterKey: CryptoKey
): Promise<boolean> {
  const questions = await db.query(
    `SELECT question, encrypted_answer FROM authenticator.recovery_questions WHERE user_id = $1`,
    [userId]
  );
  
  let correct = 0;
  
  for (let i = 0; i < questions.rows.length; i++) {
    const decryptedAnswer = await decrypt(questions.rows[i].encrypted_answer, masterKey);
    if (decryptedAnswer === answers[i]) {
      correct++;
    }
  }
  
  return correct >= questions.rows.length / 2; // Require 50% correct
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/authenticator/entries` | GET | List authenticator entries |
| `/api/authenticator/entries` | POST | Create authenticator entry |
| `/api/authenticator/entries/:id` | GET | Get authenticator entry |
| `/api/authenticator/entries/:id` | DELETE | Delete authenticator entry |
| `/api/authenticator/entries/:id/code` | GET | Generate TOTP code |
| `/api/authenticator/backup` | POST | Create backup |
| `/api/authenticator/restore` | POST | Restore from backup |
| `/api/authenticator/recovery/setup` | POST | Setup recovery |
| `/api/authenticator/recovery/verify` | POST | Verify recovery |

---

## Encryption Strategy

### Plaintext Fields

- `name` (for searchability)
- `type` (for UI rendering)

### Encrypted Fields

- `encrypted_blob` contains:
  - TOTP secret
  - FIDO2 credential ID
  - Counter
  - Custom fields

---

*This document must be updated when the Authenticator app architecture changes.*
