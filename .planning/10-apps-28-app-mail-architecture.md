# Mail App Architecture

This document defines the architecture for the Mail application in the Sovereign Suite, covering MX records, SMTP server deployment, inbound/outbound email pipelines, DKIM/DMARC/SPF configuration, and CalDAV/CardDAV interoperability.

---

## Overview

The Mail app provides encrypted email storage and sending capabilities while maintaining zero-knowledge guarantees. Unlike other apps in the suite, Mail requires a self-hosted SMTP server on the VPS because Cloudflare Workers cannot maintain persistent TCP connections required for SMTP.

---

## Why Email Cannot Run on Cloudflare Workers

Cloudflare Workers have the following limitations that prevent SMTP implementation:

1. **No persistent TCP connections**: SMTP requires long-lived TCP connections for message transmission
2. **No raw socket access**: Workers cannot open raw sockets to port 25, 465, or 587
3. **Execution time limits**: Workers have a maximum CPU time of 30ms (free tier) or 50ms (paid), insufficient for SMTP handshakes
4. **No outbound port 25 access**: Cloudflare blocks outbound connections to port 25 to prevent spam

**Solution**: Deploy a dedicated SMTP server on the VPS using Docker, with the Hono Worker handling encryption and storage.

---

## MX Record and DNS Configuration

### DNS Records Required

| Record Type | Name | Value | TTL | Purpose |
|-------------|------|-------|-----|---------|
| MX | `@` | `mail.yourdomain.com` | 3600 | Mail server for domain |
| A | `mail` | `<VPS IP address>` | 3600 | Mail server IP |
| TXT | `@` | `v=spf1 mx -all` | 3600 | SPF policy |
| TXT | `default._domainkey` | `v=DKIM1; k=rsa; p=<public_key>` | 3600 | DKIM public key |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` | 3600 | DMARC policy |

### MX Record Priority

```dns
yourdomain.com.  3600  IN  MX  10  mail.yourdomain.com.
```

The priority `10` is the lowest (highest priority). Use multiple MX records with different priorities for failover if needed.

---

## Self-Hosted SMTP Server: Stalwart Mail Server

### Why Stalwart

Stalwart Mail Server is a modern Rust-based mail server that supports:

- JMAP (JSON Meta Application Protocol) for modern email access
- SMTP/IMAP for legacy compatibility
- Built-in spam filtering (Rspamd integration)
- Sieve scripting for email filtering
- Docker deployment for easy management

### Docker Deployment on VPS

```yaml
# docker-compose.yml
version: '3.8'

services:
  stalwart-mail:
    image: stalwartlabs/mail-server:latest
    container_name: stalwart-mail
    ports:
      - "25:25"    # SMTP
      - "465:465"  # SMTPS
      - "587:587"  # Submission
      - "993:993"  # IMAPS
      - "8080:8080" # JMAP API
    volumes:
      - ./stalwart-data:/data
      - ./stalwart-config:/etc/stalwart
    environment:
      - STALWART_DOMAIN=yourdomain.com
      - STALWART_ADMIN=admin@yourdomain.com
      - STALWART_ADMIN_PASSWORD=${STALWART_ADMIN_PASSWORD}
    restart: unless-stopped

  postgres:
    image: postgres:17
    container_name: stalwart-postgres
    volumes:
      - ./postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=stalwart
      - POSTGRES_USER=stalwart
      - POSTGRES_PASSWORD=${STALWART_POSTGRES_PASSWORD}
    restart: unless-stopped
```

### Stalwart Configuration

```toml
# /etc/stalwart/stalwart.toml
[server]
hostname = "mail.yourdomain.com"
domain = "yourdomain.com"

[smtp]
enable = true
port = 25
submission.port = 587
smtps.port = 465

[imap]
enable = true
port = 993

[jmap]
enable = true
port = 8080

[storage]
type = "postgresql"
url = "postgres://stalwart:${STALWART_POSTGRES_PASSWORD}@postgres:5432/stalwart"

[spam.filter]
enable = true
rspamd.url = "http://rspamd:11333"
```

---

## Inbound Email Receiving Pipeline

### Pipeline Flow

```
SMTP on VPS → Parse → Encrypt Client-Side → Store in PostgreSQL
```

### Step 1: SMTP Reception

Stalwart receives email on port 25, validates SPF/DKIM/DMARC, and stores the raw message.

### Step 2: Webhook to Hono Worker

Stalwart sends a webhook to the Mail Worker for each received email:

```typescript
// apps/mail/api/src/index.ts
app.post('/api/webhooks/inbound', async (c) => {
  const webhook = await c.req.json();
  
  // Verify webhook signature
  const signature = c.req.header('X-Stalwart-Signature');
  if (!verifyWebhookSignature(webhook, signature)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }
  
  // Extract email metadata
  const { messageId, from, to, subject, rawBody } = webhook;
  
  // Store in PostgreSQL (plaintext metadata, encrypted body)
  const message = await import('@suite/domain-mail').then(m => 
    m.storeInboundMessage({
      tenantId: c.get('tenantId'),
      mailboxId: await resolveMailbox(to[0]),
      messageIdHeader: messageId,
      fromAddress: from,
      toAddresses: to,
      subject: subject,
      encryptedBlob: await encryptEmailBody(rawBody, c.get('encryptionKey')),
    })
  );
  
  return c.json({ success: true, messageId: message.id });
});
```

### Step 3: Client-Side Decryption

The Mail web app fetches the message and decrypts the body client-side:

```typescript
// apps/mail/web/src/lib/message-decoder.ts
import { decrypt } from '@suite/crypto';

export async function decryptMessage(encryptedBlob: Uint8Array, key: CryptoKey) {
  const plaintext = await decrypt(encryptedBlob, key);
  return JSON.parse(new TextDecoder().decode(plaintext));
}
```

---

## Outbound Email Sending

### Transactional Provider vs. Self-Hosted Relay

| Approach | Zero-Knowledge | Deliverability | Cost | Complexity |
|----------|----------------|----------------|------|------------|
| Transactional provider (Resend, Postmark) | ❌ Provider sees plaintext | ✅ High | $$ | Low |
| Self-hosted SMTP relay | ✅ Provider sees ciphertext | ⚠️ Medium (needs warmup) | $ | High |

### Recommended Approach: Hybrid

1. **Transactional provider for marketing emails**: Use Resend/Postmark for newsletters, announcements (non-sensitive content)
2. **Self-hosted relay for user emails**: Use Stalwart for user-to-user emails (sensitive content)

### Outbound Pipeline

```
Client → Encrypt → Hono Worker → Stalwart SMTP → Recipient
```

### Implementation

```typescript
// apps/mail/api/src/index.ts
app.post('/api/messages/send', async (c) => {
  const { to, subject, body } = await c.req.json();
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  
  // Encrypt body client-side before sending to API
  // (The API receives already-encrypted body)
  
  // Store sent message in database
  const message = await import('@suite/domain-mail').then(m =>
    m.storeSentMessage({
      tenantId,
      userId,
      toAddress: to,
      subject,
      encryptedBlob: body.encrypted,
    })
  );
  
  // Send via Stalwart SMTP
  await sendViaStalwart({
    from: `${userId}@yourdomain.com`,
    to,
    subject,
    body: body.encrypted, // Send encrypted body
  });
  
  return c.json({ success: true, messageId: message.id });
});
```

### Stalwart SMTP Send

```typescript
// packages/mail/src/smtp-client.ts
import { SMTPClient } from 'smtp-client';

export async function sendViaStalwart(options: SendOptions) {
  const client = new SMTPClient({
    host: 'localhost',
    port: 587,
    secure: false,
  });
  
  await client.connect();
  await client.greet({ hostname: 'mail.yourdomain.com' });
  await client.authPlain({
    user: process.env.STALWART_SMTP_USER,
    password: process.env.STALWART_SMTP_PASSWORD,
  });
  await client.mail(options.from);
  await client.rcpt(options.to);
  await client.data(options.body);
  await client.quit();
}
```

---

## DKIM, DMARC, SPF Configuration

### SPF (Sender Policy Framework)

SPF specifies which mail servers are authorized to send email for your domain.

```dns
TXT record for @:
v=spf1 mx -all
```

- `mx`: Allow servers listed in MX records
- `-all`: Reject all other servers (strict mode)

### DKIM (DomainKeys Identified Mail)

DKIM adds a cryptographic signature to outgoing emails.

#### Generate DKIM Keys

```bash
# Generate RSA key pair
openssl genrsa -out dkim-private.pem 2048
openssl rsa -in dkim-private.pem -pubout -out dkim-public.pem

# Extract public key for DNS
cat dkim-public.pem
```

#### Add DNS Record

```dns
TXT record for default._domainkey:
v=DKIM1; k=rsa; p=<public_key_from_above>
```

#### Configure Stalwart

```toml
# /etc/stalwart/stalwart.toml
[dkim]
enable = true
selector = "default"
domain = "yourdomain.com"
private_key = "/etc/stalwart/dkim-private.pem"
```

### DMARC (Domain-based Message Authentication)

DMARC builds on SPF and DKIM to specify handling of failed authentication.

```dns
TXT record for _dmarc:
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

- `p=quarantine`: Quarantine emails that fail authentication (move to spam)
- `rua`: Send aggregate reports to this email

---

## CalDAV/CardDAV Interoperability

### Decision: Support Standard Protocols

The Calendar and Contacts apps will support CalDAV and CardDAV for interoperability with:

- Apple Mail / Calendar
- Microsoft Outlook
- Mozilla Thunderbird
- Nextcloud

### CalDAV Implementation

```typescript
// apps/calendar/api/src/caldav.ts
import { Hono } from 'hono';

const caldavApp = new Hono();

// PROPFIND (list events)
caldavApp.propfind('/caldav', async (c) => {
  const tenantId = c.get('tenantId');
  const events = await import('@suite/domain-calendar').then(m => 
    m.getEvents(tenantId)
  );
  
  // Convert to iCal format
  const ical = convertToICal(events);
  
  return c.text(ical, 200, {
    'Content-Type': 'text/calendar',
    'DAV': '1, 2, 3, calendar-access, calendar-schedule',
  });
});

// REPORT (calendar query)
caldavApp.report('/caldav', async (c) => {
  // Parse CalDAV REPORT request
  const report = await c.req.text();
  
  // Query events matching criteria
  const events = await queryCalDAVEvents(report);
  
  return c.text(convertToICal(events), 207, {
    'Content-Type': 'text/calendar',
  });
});
```

### CardDAV Implementation

```typescript
// apps/contacts/api/src/carddav.ts
import { Hono } from 'hono';

const carddavApp = new Hono();

// PROPFIND (list contacts)
carddavApp.propfind('/carddav', async (c) => {
  const tenantId = c.get('tenantId');
  const contacts = await import('@suite/domain-contacts').then(m => 
    m.getContacts(tenantId)
  );
  
  // Convert to vCard format
  const vcard = convertToVCard(contacts);
  
  return c.text(vcard, 207, {
    'Content-Type': 'text/vcard',
    'DAV': '1, 2, 3, addressbook',
  });
});
```

### Encryption Considerations

CalDAV/CardDAV clients expect plaintext data. The Sovereign Suite:

1. **Stores encrypted data** in PostgreSQL
2. **Decrypts on-the-fly** when serving CalDAV/CardDAV requests
3. **Requires authentication** for all CalDAV/CardDAV endpoints
4. **Uses TLS** for all CalDAV/CardDAV connections

---

## Mail App Database Schema

### `mail.mailboxes`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `user_id` | `UUID` | No | - | Mailbox owner |
| `email_address` | `TEXT` | No | - | Email address |
| `encrypted_blob` | `BYTEA` | Yes | - | Encrypted mailbox settings |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

### `mail.messages`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `mailbox_id` | `UUID` | No | - | Parent mailbox |
| `message_id_header` | `TEXT` | No | - | RFC 5322 Message-ID |
| `subject` | `TEXT` | Yes | - | Subject (plaintext for search) |
| `from_address` | `TEXT` | No | - | From address |
| `to_addresses` | `TEXT[]` | No | - | To addresses (array) |
| `encrypted_blob` | `BYTEA` | No | - | Encrypted message body |
| `received_at` | `TIMESTAMPTZ` | No | `NOW()` | Receipt timestamp |

### `mail.attachments`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `message_id` | `UUID` | No | - | Parent message |
| `filename` | `TEXT` | No | - | Attachment filename |
| `mime_type` | `TEXT` | Yes | - | MIME type |
| `size` | `BIGINT` | No | 0 | Size in bytes |
| `r2_key` | `TEXT` | No | - | R2 object key |
| `encrypted_blob` | `BYTEA` | Yes | - | Encrypted attachment metadata |

---

## Mail App API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mailboxes` | GET | List mailboxes |
| `/api/mailboxes` | POST | Create mailbox |
| `/api/messages` | GET | List messages |
| `/api/messages` | POST | Send message |
| `/api/messages/:id` | GET | Get message |
| `/api/messages/:id` | DELETE | Delete message |
| `/api/attachments/:id` | GET | Get attachment |
| `/webhooks/inbound` | POST | Stalwart inbound webhook |
| `/caldav` | PROPFIND/REPORT | CalDAV endpoint |
| `/carddav` | PROPFIND/REPORT | CardDAV endpoint |

---

## Zero-Knowledge Implications

### What the Server Sees

- **Plaintext metadata**: Subject, from/to addresses, timestamps
- **Ciphertext**: Message body, attachments
- **Hashed**: Email addresses (for deduplication)

### What the Server Never Sees

- **Plaintext message body**
- **Plaintext attachments**
- **User decryption keys**

### Transactional Provider Trade-off

When using a transactional provider (Resend, Postmark):

- The provider sees plaintext email content
- This violates zero-knowledge for that email
- Use only for non-sensitive emails (newsletters, announcements)
- Always warn users before sending via transactional provider

---

## Security Considerations

### SMTP Authentication

Stalwart SMTP requires authentication for outbound sending:

```toml
[smtp.auth]
enable = true
mechanisms = ["PLAIN", "LOGIN"]
```

### Rate Limiting

Implement rate limiting on the Mail Worker:

```typescript
// apps/mail/api/src/middleware/rate-limit.ts
export const mailRateLimit = createMiddleware(async (c, next) => {
  const tenantId = c.get('tenantId');
  const key = `mail:send:${tenantId}`;
  
  const count = await c.env.KV.get(key, { type: 'json' }) || 0;
  
  if (count >= 100) {
    return c.json({
      error: {
        code: 'mail_send_rate_exceeded',
        message: 'You have exceeded the daily email limit',
      },
    }, 429);
  }
  
  await c.env.KV.put(key, count + 1, { expirationTtl: 86400 });
  
  await next();
});
```

### Spam Filtering

Stalwart integrates with Rspamd for spam filtering:

```toml
[spam.filter]
enable = true
rspamd.url = "http://rspamd:11333"
reject_spam = false
spam_folder = "Spam"
```

---

## Deployment Checklist

- [ ] Configure MX records
- [ ] Configure SPF, DKIM, DMARC records
- [ ] Deploy Stalwart Mail Server on VPS
- [ ] Configure Stalwart with domain and admin credentials
- [ ] Generate and configure DKIM keys
- [ ] Configure inbound webhook in Stalwart
- [ ] Deploy Mail Worker to Cloudflare
- [ ] Configure service binding between Mail Worker and Stalwart
- [ ] Test inbound email flow
- [ ] Test outbound email flow
- [ ] Configure CalDAV/CardDAV endpoints
- [ ] Test CalDAV/CardDAV with external clients
- [ ] Configure rate limiting
- [ ] Configure spam filtering
- [ ] Set up monitoring and alerting

---

*This document must be updated when the Mail app architecture changes or when new email features are added.*
