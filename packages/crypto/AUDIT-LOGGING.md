# Audit Logging

This document describes the audit logging functionality in `@suite/crypto`, which provides optional tracking of cryptographic operations for security monitoring and compliance.

## Overview

Audit logging is optional and disabled by default. When enabled, it tracks:
- Key lifecycle events (creation, usage, deletion, rotation, expiration)
- Security events (failed operations, invalid keys, suspicious activity)

The logging interface is designed for SIEM (Security Information and Event Management) integration while ensuring sensitive data is never logged.

## Installation

Audit logging is included in the main `@suite/crypto` package. No additional dependencies are required.

## Usage

### Basic Setup

```typescript
import {
  setAuditLogger,
  createConsoleAuditLogger,
  logKeyCreated,
  logKeyUsed,
  logKeyDeleted,
  logSecurityEvent,
} from '@suite/crypto';

// Enable console audit logging (for development)
setAuditLogger(createConsoleAuditLogger());

// Disable audit logging (default)
setAuditLogger(null);
```

### Custom Log Handler

For production use, implement a custom log handler that sends events to your SIEM:

```typescript
import {
  setAuditLogger,
  createCustomAuditLogger,
  type AuditEvent,
  type AuditLogger,
} from '@suite/crypto';

// Custom SIEM logger
class SIEMAuditLogger implements AuditLogger {
  async logKeyCreated(event: AuditEvent): Promise<void> {
    // Send to SIEM (e.g., Splunk, Datadog, ELK)
    await sendToSIEM({
      timestamp: event.timestamp,
      event_type: 'key_created',
      key_id: event.keyId,
      key_version: event.metadata?.keyVersion,
      key_algorithm: event.metadata?.keyAlgorithm,
      user_id: event.metadata?.userId,
    });
  }

  async logKeyUsed(event: AuditEvent): Promise<void> {
    await sendToSIEM({
      timestamp: event.timestamp,
      event_type: 'key_used',
      key_id: event.keyId,
      operation: event.operation,
      user_id: event.metadata?.userId,
    });
  }

  async logKeyDeleted(event: AuditEvent): Promise<void> {
    await sendToSIEM({
      timestamp: event.timestamp,
      event_type: 'key_deleted',
      key_id: event.keyId,
      user_id: event.metadata?.userId,
    });
  }

  async logKeyRotated(event: AuditEvent): Promise<void> {
    await sendToSIEM({
      timestamp: event.timestamp,
      event_type: 'key_rotated',
      key_id: event.keyId,
      old_version: event.metadata?.oldVersion,
      new_version: event.metadata?.newVersion,
      user_id: event.metadata?.userId,
    });
  }

  async logKeyExpired(event: AuditEvent): Promise<void> {
    await sendToSIEM({
      timestamp: event.timestamp,
      event_type: 'key_expired',
      key_id: event.keyId,
      expiration_date: event.metadata?.expirationDate,
    });
  }

  async logSecurityEvent(event: AuditEvent): Promise<void> {
    await sendToSIEM({
      timestamp: event.timestamp,
      event_type: 'security_event',
      event_code: event.metadata?.eventCode,
      severity: event.metadata?.severity,
      operation: event.operation,
      user_id: event.metadata?.userId,
      ip_address: event.metadata?.ipAddress,
    });
  }
}

// Enable custom SIEM logger
setAuditLogger(createCustomAuditLogger(new SIEMAuditLogger()));
```

## Event Format

All audit events follow a standard format:

```typescript
interface AuditEvent {
  timestamp: number;           // Unix timestamp in milliseconds
  eventType: AuditEventType;   // Event type (key_created, key_used, etc.)
  keyId?: string;             // Key identifier (if applicable)
  operation?: string;          // Operation performed (encrypt, decrypt, etc.)
  metadata?: AuditEventMetadata; // Additional context
}

type AuditEventType =
  | 'key_created'
  | 'key_used'
  | 'key_deleted'
  | 'key_rotated'
  | 'key_expired'
  | 'security_event';

interface AuditEventMetadata {
  userId?: string;
  keyVersion?: string;
  keyAlgorithm?: string;
  oldVersion?: string;
  newVersion?: string;
  expirationDate?: string;
  eventCode?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
  [key: string]: unknown;
}
```

## SIEM Integration Examples

### Splunk

```typescript
import { createCustomAuditLogger, type AuditEvent } from '@suite/crypto';

class SplunkAuditLogger {
  private httpClient: HttpClient;
  private hecUrl: string;
  private hecToken: string;

  constructor(hecUrl: string, hecToken: string) {
    this.hecUrl = hecUrl;
    this.hecToken = hecToken;
    this.httpClient = new HttpClient();
  }

  async sendToSplunk(event: AuditEvent): Promise<void> {
    const payload = {
      time: event.timestamp / 1000, // Splunk expects seconds
      host: 'crypto-service',
      source: '@suite/crypto',
      sourcetype: '_json',
      event: {
        event_type: event.eventType,
        key_id: event.keyId,
        operation: event.operation,
        ...event.metadata,
      },
    };

    await this.httpClient.post(this.hecUrl, JSON.stringify(payload), {
      headers: {
        'Authorization': `Splunk ${this.hecToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Implement AuditLogger interface methods...
}

setAuditLogger(createCustomAuditLogger(new SplunkAuditLogger(
  process.env.SPLUNK_HEC_URL,
  process.env.SPLUNK_HEC_TOKEN
)));
```

### Datadog

```typescript
import { createCustomAuditLogger, type AuditEvent } from '@suite/crypto';

class DatadogAuditLogger {
  private apiKey: string;
  private site: string;

  constructor(apiKey: string, site = 'datadoghq.com') {
    this.apiKey = apiKey;
    this.site = site;
  }

  async sendToDatadog(event: AuditEvent): Promise<void> {
    const payload = {
      ddsource: '@suite/crypto',
      ddtags: `event_type:${event.eventType},operation:${event.operation}`,
      hostname: 'crypto-service',
      service: 'crypto',
      message: JSON.stringify({
        event_type: event.eventType,
        key_id: event.keyId,
        operation: event.operation,
        ...event.metadata,
      }),
    };

    await fetch(`https://http-intake.logs.${this.site}/v1/input/${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Implement AuditLogger interface methods...
}

setAuditLogger(createCustomAuditLogger(new DatadogAuditLogger(
  process.env.DATADOG_API_KEY
)));
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

```typescript
import { createCustomAuditLogger, type AuditEvent } from '@suite/crypto';

class ELKAuditLogger {
  private elasticsearchUrl: string;
  private index: string;

  constructor(elasticsearchUrl: string, index = 'crypto-audit') {
    this.elasticsearchUrl = elasticsearchUrl;
    this.index = index;
  }

  async sendToELK(event: AuditEvent): Promise<void> {
    const document = {
      '@timestamp': new Date(event.timestamp).toISOString(),
      event_type: event.eventType,
      key_id: event.keyId,
      operation: event.operation,
      ...event.metadata,
    };

    await fetch(`${this.elasticsearchUrl}/${this.index}/_doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document),
    });
  }

  // Implement AuditLogger interface methods...
}

setAuditLogger(createCustomAuditLogger(new ELKAuditLogger(
  process.env.ELASTICSEARCH_URL
)));
```

## Privacy Considerations

### Sensitive Data Redaction

The audit logging system automatically redacts sensitive data:

- **Never logged**: Plaintext, ciphertext, keys, passwords, salts
- **Always logged**: Key IDs (not key material), operation names, timestamps
- **Optional metadata**: User IDs, IP addresses (add via metadata if needed)

### Example: Safe vs. Unsafe Logging

```typescript
// ✅ SAFE: Log key ID and operation
logKeyUsed({
  timestamp: Date.now(),
  eventType: 'key_used',
  keyId: 'key-123', // Safe: identifier only
  operation: 'encrypt',
  metadata: { userId: 'user-456' },
});

// ❌ UNSAFE: Never log key material
logKeyUsed({
  timestamp: Date.now(),
  eventType: 'key_used',
  keyId: 'key-123',
  operation: 'encrypt',
  metadata: { 
    keyMaterial: '0x1234...', // NEVER log this!
    plaintext: 'secret data', // NEVER log this!
  },
});
```

### Data Minimization

Follow data minimization principles:
- Log only what's necessary for security monitoring
- Avoid logging personal data unless required for compliance
- Implement log retention policies (e.g., 90 days for audit logs)
- Ensure logs are encrypted at rest and in transit

## Performance Considerations

### Asynchronous Logging

Audit logging is designed to be non-blocking:

```typescript
// All audit log methods are async
await logKeyCreated(event); // Promise-based

// For high-throughput scenarios, consider batching
class BatchAuditLogger implements AuditLogger {
  private queue: AuditEvent[] = [];
  private flushInterval: number = 5000; // 5 seconds

  async logKeyCreated(event: AuditEvent): Promise<void> {
    this.queue.push(event);
    // Flush after interval or when queue is full
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const events = this.queue.splice(0);
    await sendBatchToSIEM(events);
  }
}
```

### Error Handling

Audit logging failures should not impact cryptographic operations:

```typescript
class ResilientAuditLogger implements AuditLogger {
  async logKeyCreated(event: AuditEvent): Promise<void> {
    try {
      await this.sendToSIEM(event);
    } catch (error) {
      // Log to console as fallback
      console.error('Audit logging failed:', error);
      // Do not throw - cryptographic operation should succeed
    }
  }
}
```

## Compliance Considerations

### Regulatory Requirements

Audit logging helps meet compliance requirements for:

- **SOC 2**: Track access to cryptographic keys
- **PCI DSS**: Log all access to cardholder data encryption keys
- **HIPAA**: Audit trail for PHI encryption/decryption
- **GDPR**: Accountability for data processing activities

### Log Retention

Implement log retention policies based on regulatory requirements:

- **SOC 2**: Typically 90 days to 7 years
- **PCI DSS**: Minimum 1 year
- **HIPAA**: Minimum 6 years
- **GDPR**: As long as necessary for purpose

### Log Integrity

Ensure log integrity for compliance:

- Use write-once storage (WORM)
- Implement log signing or hashing
- Use append-only storage (e.g., S3 with object lock)
- Regular log backups to immutable storage

## Security Considerations

### Access Control

Audit logs contain sensitive security information:

- Restrict log access to authorized personnel only
- Implement role-based access control (RBAC)
- Use separate credentials for log ingestion vs. log viewing
- Encrypt logs at rest (e.g., AWS KMS, Azure Key Vault)

### Log Tampering Prevention

Detect and prevent log tampering:

- Use append-only storage
- Implement log hashing/chaining
- Monitor for log deletion or modification
- Use SIEM alerting for suspicious log patterns

### SIEM Security

Secure SIEM integration:

- Use HTTPS/TLS for log transmission
- Authenticate with API keys or mutual TLS
- Rotate API keys regularly
- Use separate credentials per environment

## Troubleshooting

### Audit Logging Not Working

**Issue**: Events not appearing in SIEM

**Solutions**:
1. Verify audit logger is set: `getAuditLogger()`
2. Check network connectivity to SIEM
3. Verify API credentials are valid
4. Check SIEM ingestion logs for errors
5. Enable console logger for debugging

### Performance Impact

**Issue**: Audit logging slowing down cryptographic operations

**Solutions**:
1. Use asynchronous logging
2. Implement batch logging
3. Use a message queue (e.g., SQS, Kafka) for buffering
4. Consider sampling for high-volume operations

### Missing Events

**Issue**: Expected events not logged

**Solutions**:
1. Verify audit logger is set before operations
2. Check for errors in audit logger implementation
3. Verify event metadata is complete
4. Check SIEM filtering rules (may be dropping events)

## Best Practices

1. **Enable in production**: Audit logging should be enabled in production environments
2. **Disable in tests**: Disable audit logging in test environments to avoid noise
3. **Use structured logging**: Use consistent, structured event formats
4. **Monitor log volume**: Set up alerts for unusual log volume spikes
5. **Regular reviews**: Regularly review audit logs for security incidents
6. **Test SIEM integration**: Test SIEM integration in staging before production
7. **Document retention policies**: Document and enforce log retention policies
8. **Secure log storage**: Encrypt logs at rest and in transit

## References

- NIST SP 800-92 (Guide to Computer Security Log Management)
- PCI DSS Requirement 10 (Track and monitor all access to network resources)
- SOC 2 CC6.1 (Logical and physical access controls)
- HIPAA Security Rule §164.308(a)(5)(ii)(B) (Audit controls)
