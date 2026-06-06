# Mail App Architecture

This document defines the architecture for the Mail application in the Sovereign Suite, covering MX records, SMTP server deployment, inbound/outbound email pipelines, DKIM/DMARC/SPF configuration, and CalDAV/CardDAV interoperability.

---

## ⚠️ Docker Tag Warning

🔴 **Never use the `latest` Docker tag for Stalwart in production.** The upgrade from v0.15 to v0.16 requires a multi-step offline migration. Using `latest` risks an unplanned breaking upgrade. Always pin to an explicit version tag (e.g., `stalwartlabs/stalwart:v0.16.x`).

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
    image: stalwartlabs/stalwart:v0.16
    container_name: stalwart-mail
    ports:
      - "25:25"    # SMTP
      - "465:465"  # SMTPS
      - "587:587"  # Submission
      - "993:993"  # IMAPS
      - "8080:8080" # JMAP API
    volumes:
      - ./stalwart-config:/etc/stalwart
      - stalwart-data:/var/lib/stalwart
    environment:
      - STALWART_PUBLIC_URL=https://mail.yourdomain.com
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

### Stalwart Configuration (v0.16+)

**Breaking Change: Configuration File Structure**

Stalwart v0.16 eliminates the TOML configuration file. A minimal `config.json` now lives on disk and describes **only** the datastore connection (database engine and credentials). Every other setting — domains, accounts, routing rules, DKIM keys, rate limits, spam filters — is stored inside that datastore as a JMAP object.

```json
{
  "store": {
    "type": "rocksdb",
    "path": "/var/lib/stalwart/data"
  }
}
```

For PostgreSQL deployments:

```json
{
  "store": {
    "@type": "PostgreSQL",
    "host": "postgres",
    "port": 5432,
    "database": "stalwart",
    "user": "stalwart",
    "password": "${STALWART_POSTGRES_PASSWORD}"
  }
}
```

**Declarative Configuration with CLI**

For infrastructure-as-code users (Ansible, Terraform, NixOS), the equivalent of editing the old TOML is now `stalwart-cli apply`, which takes a declarative JSON plan file and idempotently reconciles live server state:

```bash
stalwart-cli apply --file server-config.json
```

This follows the same pattern used by CockroachDB, Consul, Elasticsearch, and HashiCorp Vault — infrastructure-as-code tools target the API rather than a configuration file.

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

**Breaking Change: DKIM is now fully automated in v0.16.**

DKIM keys are stored directly in the database alongside all other configuration. The server generates keys, rotates them on a configured schedule, and publishes matching DNS TXT records automatically via the new automated DNS management layer.

- No manual key generation steps are required
- No manual DNS TXT record updates are required for rotation
- In clustered deployments, rotation works natively with no manual coordination between nodes

The only required action is to ensure the server has DNS write access to your zone (configure via the JMAP management API).

**DNS Provider Support**

v0.16 ships with built-in support for:
- AWS Route53
- Google Cloud DNS
- Bunny
- Porkbun
- DNSimple
- Spaceship
- RFC 2136 dynamic updates with SIG(0) for self-hosted authoritative DNS

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

### Breaking Change: Account Names Are Now Full Email Addresses

Account names must now be full email addresses (`alice@example.com`, not `alice`). The server auto-appends the default domain on SMTP/IMAP login for backward compatibility with existing mail clients, but **CalDAV, CardDAV, and WebDAV client URLs must be manually reconfigured**: the `@` must be percent-encoded.

| Before (v0.15) | After (v0.16) |
|----------------|---------------|
| `/dav/cal/alice` | `/dav/cal/alice%40example.com` |
| `/dav/card/alice` | `/dav/card/alice%40example.com` |

**Migration Impact:** Notify users before upgrading so they can update their calendar and contacts accounts in Apple Calendar, Thunderbird, DAVx⁵, and similar clients.

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

### Breaking Change: Management API (v0.16+)

The old `/api/...` REST endpoints no longer exist in v0.16. All management operations happen at the single `/jmap` endpoint using the JMAP protocol. The `stalwart-cli` tool is built on this same JMAP API and is the intended scripting surface for all automation that previously called REST endpoints directly.

**Benefits of JMAP-based management:**
- Dozens of configuration changes can be applied in a single round-trip
- Any JMAP client library works against the management surface
- Single authentication flow covers both mail access and administration
- Configuration is consistent across clustered deployments by definition

### SMTP Authentication

Stalwart SMTP requires authentication for outbound sending. In v0.16+, this is configured via the JMAP management API or WebUI rather than TOML configuration files.

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

Stalwart integrates with Rspamd for spam filtering. In v0.16+, this is configured via the JMAP management API or WebUI rather than TOML configuration files.

**Rspamd integration settings:**
- Enable/disable spam filtering
- Configure Rspamd endpoint URL
- Set spam rejection policy
- Configure spam folder destination
- Adjust scoring thresholds

---

## Migration from Stalwart v0.15 to v0.16

**This is a multi-step offline migration. It is not a simple `docker pull`.**

### Prerequisites

1. **Backup your database** - This is critical. Do not proceed without a verified backup.
2. **Plan a maintenance window** - Mail ports (25, 465, 587, 993) remain **closed** during recovery mode.
3. **For clustered deployments** - Stop every node running v0.15.x before starting migration on any node.

### Migration Steps

**Step 1: Convert existing settings into a configuration snapshot**

This step does not require stopping the server. Run the Python migration script against the live v0.15 server:

```bash
# Download the migration script
wget https://raw.githubusercontent.com/stalwartlabs/stalwart/main/resources/scripts/migrate_v016.py

# Create a Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install requests

# Dump the live v0.15.x settings
python migrate_v016.py dump \
  --url https://mail.yourdomain.com \
  --user admin \
  --password 'your-password' \
  --output settings.json

# Convert the dump to the new format
python migrate_v016.py convert \
  --settings settings.json \
  --principals principals.json \
  --config config.json \
  --output export.json \
  --patch-paths /opt/stalwart=/var/lib/stalwart
```

The `--patch-paths` flag rewrites old `/opt/stalwart` paths to new `/var/lib/stalwart` paths for Docker deployments.

**Step 2: Back up the database**

For embedded databases (RocksDB, SQLite):
```bash
# Stop the server
docker stop stalwart

# Backup the data directory
cp -a /opt/stalwart/data /opt/stalwart/data.backup
```

For PostgreSQL/MySQL backends, use your database's native backup tools (pg_dump, mysqldump).

**Step 3: Perform the migration**

For Docker deployments:

```bash
# Create new volumes
docker volume create stalwart-etc
docker volume create stalwart-data

# Copy old data to new volume (for embedded databases)
docker run --rm \
  -v /opt/stalwart:/old \
  -v stalwart-data:/new \
  alpine sh -c 'cp -a /old/data/. /new/ && chown -R 2000:2000 /new'

# Install config.json in the new config volume
docker run --rm \
  -v /path/to/config.json:/src/config.json:ro \
  -v stalwart-etc:/dst \
  alpine sh -c 'cp /src/config.json /dst/config.json && chown 2000:2000 /dst/config.json'

# Start temporary container in recovery mode
docker run -d --name stalwart-recovery \
  -p 8080:8080 \
  -v stalwart-etc:/etc/stalwart \
  -v stalwart-data:/var/lib/stalwart \
  -e STALWART_RECOVERY_MODE=1 \
  stalwartlabs/stalwart:v0.16

# Apply the configuration snapshot
stalwart-cli apply --file export.json

# Stop the recovery container
docker stop stalwart-recovery
docker rm stalwart-recovery

# Start the real container normally
docker run -d --name stalwart \
  --restart unless-stopped \
  -p 25:25 -p 465:465 -p 587:587 -p 993:993 -p 8080:8080 \
  -v stalwart-etc:/etc/stalwart \
  -v stalwart-data:/var/lib/stalwart \
  stalwartlabs/stalwart:v0.16
```

**Step 4: Post-migration tasks**

1. Log in to the admin panel
2. Recalculate disk quotas
3. Recalculate tenant quotas (for multi-tenant deployments)
4. Create a permanent administrator account
5. Review the rest of the configuration
6. Notify users to update CalDAV/CardDAV/WebDAV client URLs with percent-encoded `@` symbols

### Zero-Downtime Migration (Future)

Stalwart plans to release a zero-downtime migration utility and proxy in the coming weeks that will allow account-by-account migration without a maintenance window. If you cannot accept downtime, wait for these tools before upgrading.

---

## Deployment Checklist

- [ ] Configure MX records
- [ ] Configure SPF, DKIM, DMARC records
- [ ] Deploy Stalwart Mail Server on VPS
- [ ] Configure Stalwart with domain and admin credentials (v0.16+: via WebUI or JMAP)
- [ ] Configure automated DKIM key rotation (v0.16+: via JMAP management API)
- [ ] Configure DNS provider access for automated DNS management (v0.16+)
- [ ] Configure inbound webhook in Stalwart
- [ ] Deploy Mail Worker to Cloudflare
- [ ] Configure service binding between Mail Worker and Stalwart
- [ ] Test inbound email flow
- [ ] Test outbound email flow
- [ ] Configure CalDAV/CardDAV endpoints
- [ ] Test CalDAV/CardDAV with external clients (note: URLs require percent-encoded @ in v0.16+)
- [ ] Configure rate limiting
- [ ] Configure spam filtering (v0.16+: via JMAP management API)
- [ ] Set up monitoring and alerting

---

*This document must be updated when the Mail app architecture changes or when new email features are added.*
