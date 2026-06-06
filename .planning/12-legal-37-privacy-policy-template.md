# Privacy Policy Template

**Last Updated**: [Date]

**Effective Date**: [Date]

---

## 1. Introduction

[Your Company Name] ("we", "us", or "our") operates the Sovereign Suite, a zero-knowledge productivity platform. This Privacy Policy explains how we handle your information in compliance with GDPR Article 13/14, CCPA, ePrivacy Directive, and other applicable privacy laws.

**Our Zero-Knowledge Guarantee**: We use end-to-end encryption (AES-256-GCM) to protect your data. This means we cannot access your plaintext content—only you hold the decryption keys.

---

## 2. Information We Collect

### 2.1 Information You Provide

- **Account Information**: Email address, name (optional)
- **Encrypted Content**: Calendar events, files, tasks, emails, credentials (encrypted client-side)
- **Preferences**: Theme, language, timezone settings

### 2.2 Information Collected Automatically

- **Log Data**: IP addresses (hashed), user agents (hashed), request IDs, timestamps
- **Usage Data**: Feature usage patterns, error logs
- **Device Information**: Browser type, operating system

### 2.3 Information from Third Parties

- **OAuth Providers**: Email address, name (when you sign in with Google, GitHub, etc.)

---

## 3. How We Use Your Information

### 3.1 Primary Purposes

- **Provide Services**: Store and sync your encrypted data
- **Authentication**: Manage your account and sessions
- **Security**: Detect and prevent unauthorized access
- **Compliance**: Maintain audit logs for regulatory requirements

### 3.2 Legal Basis for Processing (GDPR)

| Processing Activity | Legal Basis |
|---------------------|-------------|
| Storing encrypted data | Contract performance (service agreement) |
| Authentication | Legitimate interests (security) |
| Audit logging | Legal obligation (SOC 2, GDPR) |
| Analytics | Legitimate interests (service improvement) |

---

## 4. Data Storage and Encryption

### 4.1 Encryption

- **At Rest**: AES-256-GCM encryption for all user content
- **In Transit**: TLS 1.3 for all data transfers
- **Key Management**: Keys derived from your password using PBKDF2 (600,000 iterations)

### 4.2 What We Can and Cannot Access

**We CAN access**:
- Encrypted ciphertext (unreadable without your keys)
- Plaintext metadata (event titles, file names, timestamps)
- Hashed identifiers (IP addresses, user agents)
- Audit logs (action types, timestamps)

**We CANNOT access**:
- Plaintext content of your events, files, emails, tasks, credentials
- Your encryption keys
- Your password (we store only a bcrypt hash)

---

## 5. Data Retention

### 5.1 User Data

- **Active Accounts**: Retained for the duration of your account
- **Deleted Accounts**: Data deleted within 30 days of deletion request
- **Encrypted Data**: Retained until you delete it or delete your account

### 5.2 Audit Logs

- **Retention Period**: 7 years (GDPR requirement)
- **Pseudonymization**: User IDs replaced with HMAC hashes after 30 days
- **Purpose**: Compliance, security auditing, incident response

### 5.3 System Logs

- **Retention Period**: 30 days
- **Purpose**: Debugging, performance monitoring

---

## 6. Data Sharing and Disclosure

### 6.1 We Do NOT Sell Your Data

We never sell your personal data to third parties.

### 6.2 Third-Party Service Providers

We use the following service providers:

| Provider | Purpose | Data Shared | Location |
|----------|---------|-------------|----------|
| Cloudflare | CDN, Workers, R2 | Encrypted data, logs | Global |
| PostgreSQL | Database hosting | Encrypted data | EU/US |
| Doppler | Secret management | Configuration keys | US |

### 6.3 Legal Requirements

We may disclose your information if required by law:

- **Court orders**: We will notify you unless prohibited by law
- **Regulatory requests**: GDPR data subject access requests
- **Security incidents**: As required by breach notification laws

---

## 7. Your Rights

### 7.1 GDPR Rights

- **Right to Access**: Request a copy of your data
- **Right to Rectification**: Correct inaccurate data
- **Right to Erasure**: Request deletion of your data ("right to be forgotten")
- **Right to Portability**: Receive your data in a machine-readable format
- **Right to Object**: Object to processing based on legitimate interests
- **Right to Restrict**: Limit processing of your data

### 7.2 CCPA Rights

- **Right to Know**: Categories of data collected
- **Right to Delete**: Request deletion of your data
- **Right to Opt-Out**: Opt-out of data sale (we do not sell data)

### 7.3 Exercising Your Rights

To exercise your rights, contact us at:

- **Email**: privacy@yourdomain.com
- **Address**: [Your Company Address]

---

## 8. Data Deletion and Key Loss

### 8.1 Data Deletion

When you delete your account:

- **Encrypted data**: Deleted within 30 days
- **Audit logs**: Pseudonymized after 30 days, retained for 7 years
- **Metadata**: Deleted within 30 days

### 8.2 Key Loss

**Important**: If you lose your master password and have no recovery method, your data is permanently inaccessible. We cannot assist in recovering your data because we do not have access to your encryption keys.

### 8.3 Key Escrow

For enterprise customers, we offer optional key escrow:

- **Storage**: Encrypted shards stored in separate locations
- **Access**: Requires multi-party authorization
- **Cost**: Additional fee for enterprise plans

---

## 9. International Data Transfers

### 9.1 Data Storage Locations

- **Primary**: European Union (GDPR compliant)
- **Backup**: United States (with standard contractual clauses)

### 9.2 Cross-Border Transfers

We use standard contractual clauses (SCCs) approved by the European Commission for data transfers to non-EEA countries.

---

## 10. Children's Privacy

Our services are not intended for children under 16. We do not knowingly collect personal information from children under 16. If we become aware that we have collected such information, we will delete it immediately.

---

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of significant changes by:

- Email notification
- In-app notification
- Posting on our website

---

## 12. Contact Information

### Data Protection Officer

- **Email**: dpo@yourdomain.com
- **Address**: [Your Company Address]

### General Inquiries

- **Email**: privacy@yourdomain.com
- **Address**: [Your Company Address]

### Supervisory Authority

If you believe we have violated your privacy rights, you may contact:

- **GDPR**: Your local data protection authority
- **CCPA**: California Attorney General

---

## 13. Cookie Policy

We use the following cookies:

| Cookie Type | Purpose | Duration |
|-------------|---------|----------|
| Essential | Authentication, security | Session |
| Preferences | Theme, language, timezone | 1 year |
| Analytics | Usage patterns (anonymized) | 2 years |

You can manage cookies in your browser settings.

---

## 14. California Consumer Privacy Act (CCPA)

If you are a California resident, you have the right to:

- Know what personal information we collect
- Delete your personal information
- Opt-out of the sale of your personal information (we do not sell data)
- Non-discrimination for exercising your rights

To exercise these rights, contact us at privacy@yourdomain.com.

---

## 15. GDPR Representative

For users in the European Economic Area (EEA), our GDPR representative is:

- **Name**: [Representative Name]
- **Email**: [Representative Email]
- **Address**: [Representative Address]

---

*This Privacy Policy is part of the Sovereign Suite documentation. Update the [bracketed] fields with your company-specific information before publishing.*
