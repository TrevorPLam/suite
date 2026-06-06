# Webhooks

This document defines the webhook system for the Sovereign Suite, covering inbound webhook security, outbound webhook delivery, webhook_deliveries table schema, Cloudflare Queue retry worker, HMAC signature for outbound webhooks, and user-configured webhook endpoint management API.

---

## Overview

Webhooks enable the Sovereign Suite to notify external systems about events (e.g., new calendar event, file uploaded, task completed). This document covers both inbound webhooks (from external systems) and outbound webhooks (to external systems).

---

## Inbound Webhook Security

### HMAC-SHA256 Signature Verification

All inbound webhooks must include an HMAC-SHA256 signature in the `X-Suite-Signature` header.

### Verification Implementation

```typescript
// packages/api/src/middleware/webhook-verify.ts
import { createHmac, timingSafeEqual } from 'crypto';

export const webhookVerify = (secret: string) =>
  createMiddleware(async (c, next) => {
    const signature = c.req.header('X-Suite-Signature');
    const body = await c.req.text();
    
    if (!signature) {
      return c.json({
        error: {
          code: 'global_invalid_request',
          message: 'Missing signature header',
        },
      }, 400);
    }
    
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    
    // Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return c.json({
        error: {
          code: 'global_invalid_request',
          message: 'Invalid signature',
        },
      }, 401);
    }
    
    // Re-parse body after reading it
    c.req.json = async () => JSON.parse(body);
    
    await next();
  });
```

### Timestamp Validation

Reject requests older than 5 minutes to prevent replay attacks:

```typescript
// packages/api/src/middleware/webhook-timestamp.ts
export const webhookTimestamp = createMiddleware(async (c, next) => {
  const timestamp = c.req.header('X-Suite-Timestamp');
  
  if (!timestamp) {
    return c.json({
      error: {
        code: 'global_invalid_request',
        message: 'Missing timestamp header',
      },
    }, 400);
  }
  
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(currentTime - requestTime);
  
  if (timeDiff > 300) { // 5 minutes
    return c.json({
      error: {
        code: 'global_invalid_request',
        message: 'Request timestamp too old',
      },
    }, 400);
  }
  
  await next();
});
```

### Replay Attack Prevention

Use a KV store to track nonces:

```typescript
// packages/api/src/middleware/webhook-nonce.ts
export const webhookNonce = createMiddleware(async (c, next) => {
  const nonce = c.req.header('X-Suite-Nonce');
  
  if (!nonce) {
    return c.json({
      error: {
        code: 'global_invalid_request',
        message: 'Missing nonce header',
      },
    }, 400);
  }
  
  // Check if nonce already used
  const existing = await c.env.WEBHOOK_NONCES.get(nonce);
  if (existing) {
    return c.json({
      error: {
        code: 'global_invalid_request',
        message: 'Nonce already used',
      },
    }, 400);
  }
  
  // Store nonce with 5-minute TTL
  await c.env.WEBHOOK_NONCES.put(nonce, '1', { expirationTtl: 300 });
  
  await next();
});
```

### Usage in API Routes

```typescript
// apps/calendar/api/src/index.ts
app.post(
  '/api/webhooks/stripe',
  webhookVerify(process.env.STRIPE_WEBHOOK_SECRET!),
  webhookTimestamp,
  webhookNonce,
  async (c) => {
    const event = await c.req.json();
    
    // Handle Stripe webhook
    if (event.type === 'payment_intent.succeeded') {
      await handlePaymentSucceeded(event.data);
    }
    
    return c.json({ received: true });
  }
);
```

---

## Outbound Webhook Delivery

### webhook_deliveries Table Schema

```sql
CREATE TABLE app.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_endpoint_id UUID NOT NULL,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'delivered', 'failed'
  attempt_count INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_status ON app.webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON app.webhook_deliveries(next_retry_at);
```

### webhook_endpoints Table Schema

```sql
CREATE TABLE app.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL, -- ['event.created', 'file.uploaded']
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_endpoints_tenant ON app.webhook_endpoints(tenant_id);
CREATE INDEX idx_webhook_endpoints_events ON app.webhook_endpoints USING GIN(events);
```

---

## Outbound Webhook Delivery Worker

### Cloudflare Queue Consumer

```typescript
// apps/webhook-worker/src/index.ts
export default {
  async queue(batch: MessageBatch<Env>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { deliveryId } = JSON.parse(message.body);
      
      try {
        await deliverWebhook(env, deliveryId);
        message.ack();
      } catch (error) {
        console.error('Webhook delivery failed:', error);
        message.retry({ delaySeconds: getRetryDelay(message.retryCount) });
      }
    }
  },
};
```

### Delivery Implementation

```typescript
// apps/webhook-worker/src/deliver.ts
import { createHmac } from 'crypto';

export async function deliverWebhook(env: Env, deliveryId: string) {
  const db = createDbClient(env.DATABASE_URL);
  
  const delivery = await db.query(
    'SELECT * FROM app.webhook_deliveries WHERE id = $1',
    [deliveryId]
  );
  
  if (delivery.rows.length === 0) {
    throw new Error('Delivery not found');
  }
  
  const deliveryData = delivery.rows[0];
  const endpoint = await db.query(
    'SELECT * FROM app.webhook_endpoints WHERE id = $1',
    [deliveryData.webhook_endpoint_id]
  );
  
  const endpointData = endpoint.rows[0];
  
  // Generate HMAC signature
  const signature = createHmac('sha256', endpointData.secret)
    .update(JSON.stringify(deliveryData.payload))
    .digest('hex');
  
  // Send webhook
  const response = await fetch(endpointData.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Suite-Signature': `sha256=${signature}`,
      'X-Suite-Event': deliveryData.event,
      'X-Suite-Delivery-Id': deliveryId,
      'X-Suite-Timestamp': Math.floor(Date.now() / 1000).toString(),
    },
    body: JSON.stringify(deliveryData.payload),
  });
  
  if (response.ok) {
    // Update delivery status
    await db.query(
      `UPDATE app.webhook_deliveries
       SET status = 'delivered', delivered_at = NOW()
       WHERE id = $1`,
      [deliveryId]
    );
  } else {
    // Update delivery status and schedule retry
    const attemptCount = deliveryData.attempt_count + 1;
    const retryDelay = getRetryDelay(attemptCount);
    
    await db.query(
      `UPDATE app.webhook_deliveries
       SET status = 'failed',
           attempt_count = $2,
           last_attempt_at = NOW(),
           next_retry_at = NOW() + INTERVAL '${retryDelay} seconds',
           error_message = $3
       WHERE id = $1`,
      [deliveryId, attemptCount, await response.text()]
    );
  }
}

function getRetryDelay(attemptCount: number): number {
  const delays = [1, 5, 30, 60, 300]; // 1s, 5s, 30s, 1m, 5m
  return delays[Math.min(attemptCount, delays.length - 1)];
}
```

### Queueing Webhooks

```typescript
// packages/webhook/src/queue.ts
export async function queueWebhook(
  env: Env,
  endpointId: string,
  event: string,
  payload: any
) {
  const db = createDbClient(env.DATABASE_URL);
  
  const delivery = await db.query(
    `INSERT INTO app.webhook_deliveries (webhook_endpoint_id, event, payload, status, next_retry_at)
     VALUES ($1, $2, $3, 'pending', NOW())
     RETURNING id`,
    [endpointId, event, JSON.stringify(payload)]
  );
  
  // Send to Queue
  await env.WEBHOOK_QUEUE.send({
    body: JSON.stringify({ deliveryId: delivery.rows[0].id }),
  });
}
```

---

## HMAC Signature for Outbound Webhooks

### Signature Format

Follow Stripe's signature format:

```
X-Suite-Signature: sha256=<hmac>
```

### Implementation

```typescript
// packages/webhook/src/sign.ts
import { createHmac } from 'crypto';

export function signWebhook(payload: any, secret: string): string {
  const hmac = createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${hmac}`;
}
```

### Verification (Recipient Side)

```typescript
// Recipient webhook verification
export function verifyWebhookSignature(
  payload: any,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signWebhook(payload, secret);
  return signature === expectedSignature;
}
```

---

## User-Configured Webhook Endpoint Management API

### POST /api/webhooks

Create a new webhook endpoint:

```typescript
// apps/user-api/src/index.ts
app.post('/api/webhooks', async (c) => {
  const { url, events } = await c.req.json();
  const tenantId = c.get('tenantId');
  const userId = c.get('userId');
  
  // Generate secret
  const secret = randomBytes(32).toString('hex');
  
  const endpoint = await db.query(
    `INSERT INTO app.webhook_endpoints (tenant_id, user_id, url, secret, events)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tenantId, userId, url, secret, events]
  );
  
  return c.json({
    id: endpoint.rows[0].id,
    url: endpoint.rows[0].url,
    secret: endpoint.rows[0].secret, // Only show once
    events: endpoint.rows[0].events,
  }, 201);
});
```

### GET /api/webhooks

List webhook endpoints:

```typescript
app.get('/api/webhooks', async (c) => {
  const tenantId = c.get('tenantId');
  
  const endpoints = await db.query(
    'SELECT id, url, events, active, created_at FROM app.webhook_endpoints WHERE tenant_id = $1',
    [tenantId]
  );
  
  return c.json({ endpoints: endpoints.rows });
});
```

### DELETE /api/webhooks/:id

Delete a webhook endpoint:

```typescript
app.delete('/api/webhooks/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId');
  
  await db.query(
    'DELETE FROM app.webhook_endpoints WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  
  return c.json({ success: true });
});
```

### POST /api/webhooks/:id/rotate-secret

Rotate webhook secret:

```typescript
app.post('/api/webhooks/:id/rotate-secret', async (c) => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId');
  
  const newSecret = randomBytes(32).toString('hex');
  
  await db.query(
    `UPDATE app.webhook_endpoints
     SET secret = $1, updated_at = NOW()
     WHERE id = $2 AND tenant_id = $3`,
    [newSecret, id, tenantId]
  );
  
  return c.json({ secret: newSecret });
});
```

---

## Webhook Events

### Calendar Events

| Event | Description | Payload |
|-------|-------------|---------|
| `calendar.event.created` | New event created | `{ eventId, title, startAt, endAt }` |
| `calendar.event.updated` | Event updated | `{ eventId, title, startAt, endAt }` |
| `calendar.event.deleted` | Event deleted | `{ eventId }` |

### Drive Events

| Event | Description | Payload |
|-------|-------------|---------|
| `drive.file.uploaded` | File uploaded | `{ fileId, name, size, mimeType }` |
| `drive.file.deleted` | File deleted | `{ fileId, name }` |
| `drive.file.shared` | File shared | `{ fileId, shareLink }` |

### Tasks Events

| Event | Description | Payload |
|-------|-------------|---------|
| `tasks.task.created` | Task created | `{ taskId, title, projectId }` |
| `tasks.task.completed` | Task completed | `{ taskId, title }` |
| `tasks.task.deleted` | Task deleted | `{ taskId }` |

---

## Monitoring and Alerting

### Metrics

Track the following metrics:

- Webhook delivery rate (deliveries per minute)
- Webhook success rate (percentage)
- Webhook failure rate (percentage)
- Webhook retry rate (percentage)
- Webhook latency (p50, p95, p99)

### Alerts

| Metric | Threshold | Action |
|--------|-----------|--------|
| Webhook failure rate | > 10% | Alert (Slack) |
| Webhook failure rate | > 25% | Page on-call |
| Webhook retry rate | > 20% | Alert (Slack) |
| Dead-letter queue size | > 1000 | Page on-call |

---

## Dead-Letter Queue

### Configuration

```toml
# wrangler.toml
[[queues.producers]]
binding = "WEBHOOK_QUEUE"
queue = "webhook-deliveries"

[[queues.consumers]]
queue = "webhook-deliveries"
max_batch_size = 10
max_wait_time = 30

[[queues.consumers]]
queue = "webhook-dead-letter"
max_batch_size = 10
max_wait_time = 30
```

### Handling Failed Deliveries

After 5 retry attempts, move to dead-letter queue:

```typescript
if (attemptCount >= 5) {
  await env.WEBHOOK_DEAD_LETTER.send({
    body: JSON.stringify({ deliveryId }),
  });
  
  await db.query(
    `UPDATE app.webhook_deliveries
     SET status = 'dead_lettered'
     WHERE id = $1`,
    [deliveryId]
  );
}
```

---

## Security Considerations

1. **Always use HTTPS** for webhook URLs
2. **Verify signatures** for all inbound webhooks
3. **Validate timestamps** to prevent replay attacks
4. **Use nonces** for additional replay protection
5. **Rotate secrets** regularly
6. **Never log webhook payloads** (may contain sensitive data)
7. **Rate limit webhook endpoints** to prevent abuse

---

*This document must be updated when new webhook events are added or when webhook security patterns change.*
