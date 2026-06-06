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

## TOTP Anti-Phishing Advisory

### Security Vulnerability

TOTP (Time-based One-Time Password) is classified by NIST SP 800-63B as a "restricted authenticator" due to its vulnerability to phishing attacks. Unlike Passkeys (FIDO2/WebAuthn), TOTP codes can be phished:

- **Phishing attack**: An attacker creates a fake login page that looks identical to the real service. The user enters their username, password, and TOTP code. The attacker immediately uses these credentials on the real site before the code expires.
- **No origin binding**: TOTP codes are not bound to the requesting origin. A code generated for `example.com` will also work on `evil-phishing-site.com`.
- **NIST classification**: NIST SP 800-63B classifies TOTP as a "restricted authenticator" and recommends that organizations assess and accept risks, offer alternative unrestricted authenticators, provide notice of risks, and develop migration plans.

### Recommended Mitigation

The Sovereign Suite recommends the following mitigation strategy:

1. **Primary recommendation**: Use Passkeys (FIDO2/WebAuthn) wherever possible. Passkeys are phishing-resistant because they are bound to the requesting origin via public key cryptography.

2. **If TOTP must be used**:
   - Display a prominent warning in the UI that TOTP is vulnerable to phishing
   - Encourage users to enable Passkeys as a more secure alternative
   - Implement additional security measures (e.g., device fingerprinting, IP reputation checks)

3. **User education**:
   - Include a security notice when adding a TOTP entry
   - Document the phishing risk in the app's help center
   - Provide guidance on identifying phishing sites

### Implementation Guidance

When users add a TOTP entry, display the following warning:

```
⚠️ Security Notice: TOTP codes can be phished

TOTP (Time-based One-Time Password) is vulnerable to phishing attacks.
An attacker with a fake login page can steal your code and use it immediately.

For stronger security, we recommend using Passkeys (FIDO2/WebAuthn) instead.
Passkeys are phishing-resistant and don't require codes.

[Learn more about phishing risks] [Add anyway]
```

### NIST Compliance Note

Per NIST SP 800-63B, organizations using restricted authenticators like TOTP must:
- Assess and accept the risk
- Offer alternative unrestricted authenticators (Passkeys)
- Provide notice of risks to users
- Develop a migration plan to stronger authenticators

The Sovereign Suite satisfies these requirements by:
- Offering Passkeys as the primary authentication method
- Providing this advisory notice for TOTP users
- Recommending migration to Passkeys in security documentation

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
