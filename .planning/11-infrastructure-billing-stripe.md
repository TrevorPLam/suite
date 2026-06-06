# Billing and Subscription Strategy (Stripe)

**Last updated:** 2026-06-04
**Version:** 1.0

---

## 1. Overview

The Sovereign Suite uses Stripe for subscription billing, payment processing, and tax compliance. This document defines the billing architecture, pricing tiers, webhook handling, and integration patterns.

---

## 2. Pricing Tiers

| Tier | Price | Features | Limits |
|------|-------|----------|--------|
| **Free** | $0/month | Basic apps, 1GB storage, 10 AI requests/day | 1 user, 1GB storage, 10 AI requests/day |
| **Pro** | $8/month/user | All apps, 100GB storage, 100 AI requests/day | Unlimited users, 100GB storage, 100 AI requests/day |
| **Enterprise** | Custom | Self-hosting, SSO, priority support, unlimited AI | Unlimited everything, SLA, dedicated support |

---

## 3. Stripe Configuration

### 3.1 Stripe Account Setup

1. **Create Stripe account** at stripe.com
2. **Enable products and pricing** in Stripe Dashboard
3. **Configure webhook endpoints** for production and staging
4. **Set up Stripe Tax** for automatic tax calculation
5. **Enable Radar** for fraud detection

### 3.2 Environment Variables

```bash
# .env.example
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TAX_ID=tax_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
```

---

## 4. Product and Price Configuration

### 4.1 Stripe Products

Create products in Stripe Dashboard:

**Product: Pro Monthly**
- ID: `prod_pro_monthly`
- Name: Sovereign Suite Pro (Monthly)
- Description: Full access to all apps, 100GB storage, 100 AI requests/day
- Price: $8/month

**Product: Pro Yearly**
- ID: `prod_pro_yearly`
- Name: Sovereign Suite Pro (Yearly)
- Description: Full access to all apps, 100GB storage, 100 AI requests/day (2 months free)
- Price: $96/year

### 4.2 Price Object Creation

```typescript
// packages/billing/src/prices.ts
export const PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY,
  PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY,
} as const;
```

---

## 5. Checkout Integration

### 5.1 Stripe Checkout Session

```typescript
// packages/billing/src/checkout.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(
  userId: string,
  tenantId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url,
    cancel_url,
    customer_email: await getUserEmail(userId),
    client_reference_id: tenantId,
    subscription_data: {
      metadata: {
        userId,
        tenantId,
      },
    },
    tax_id_collection: {
      enabled: true,
    },
  });
  
  return session.url!;
}
```

### 5.2 Checkout API Endpoint

```typescript
// apps/billing/api/src/routes/checkout.ts
import { Hono } from 'hono';
import { createCheckoutSession } from '@suite/billing';

const app = new Hono();

app.post('/checkout', async (c) => {
  const { priceId, billingCycle } = await c.req.json();
  const userId = c.get('userId');
  const tenantId = c.get('tenantId');
  
  const priceId = billingCycle === 'yearly' ? PRICES.PRO_YEARLY : PRICES.PRO_MONTHLY;
  
  const checkoutUrl = await createCheckoutSession(
    userId,
    tenantId,
    priceId,
    `${c.req.url}/success?session_id={CHECKOUT_SESSION_ID}`,
    `${c.req.url}/canceled`
  );
  
  return c.json({ checkoutUrl });
});
```

---

## 6. Webhook Handling

### 6.1 Webhook Signature Verification

```typescript
// packages/billing/src/webhooks.ts
import Stripe from 'stripe';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export function verifyWebhookSignature(
  payload: string,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  );
  
  return event;
}
```

### 6.2 Webhook Event Handlers

```typescript
// packages/billing/src/handlers.ts
export async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const { userId, tenantId } = subscription.metadata;
  
  await updateTenantPlan(tenantId, 'pro');
  await recordSubscriptionEvent(subscription.id, 'created', userId, tenantId);
}

export async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const { userId, tenantId } = subscription.metadata;
  
  if (subscription.status === 'past_due') {
    await sendPaymentFailedEmail(userId);
  } else if (subscription.status === 'canceled') {
    await updateTenantPlan(tenantId, 'free');
  }
  
  await recordSubscriptionEvent(subscription.id, 'updated', userId, tenantId);
}

export async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription as string;
  
  await recordPayment(invoice.id, invoice.amount_paid, subscriptionId);
}

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoice.subscription as string;
  
  await sendPaymentFailedEmail(await getUserIdFromSubscription(subscriptionId));
}
```

### 6.3 Webhook API Endpoint

```typescript
// apps/billing/api/src/routes/webhooks.ts
import { Hono } from 'hono';
import { verifyWebhookSignature } from '@suite/billing';
import {
  handleSubscriptionCreated,
  handleSubscriptionUpdated,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
} from '@suite/billing/handlers';

const app = new Hono();

app.post('/webhooks', async (c) => {
  const payload = await c.req.text();
  const signature = c.req.header('stripe-signature')!;
  
  try {
    const event = verifyWebhookSignature(payload, signature);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSubscriptionCreated(event);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return c.json({ error: 'Invalid signature' }, 400);
  }
});
```

---

## 7. Idempotency and Deduplication

### 7.1 Idempotency Keys

```typescript
// packages/billing/src/idempotency.ts
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const eventId = event.id;
  
  // Check if event has already been processed
  const existing = await getProcessedEvent(eventId);
  if (existing) {
    console.log(`Event ${eventId} already processed, skipping`);
    return;
  }
  
  // Process the event
  await processEvent(event);
  
  // Mark event as processed
  await markEventProcessed(eventId);
}
```

### 7.2 Database Schema

```typescript
// packages/db/src/schema/billing.ts
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  status: text('status').notNull(), // active, past_due, canceled, trialing
  priceId: text('price_id').notNull(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

---

## 8. Proration Handling

### 8.1 Mid-Month Upgrades

When a user upgrades mid-month, Stripe automatically prorates the charge. The Sovereign Suite:

1. **Immediately grants Pro features** upon successful payment
2. **Calculates prorated credit** for remaining time on current plan
3. **Applies credit to new subscription**

### 8.2 Downgrade Handling

When a user downgrades:

1. **Features remain active** until the end of the current billing period
2. **Cancel at period end** flag is set in Stripe
3. **User is notified** 7 days before downgrade takes effect

```typescript
// packages/billing/src/downgrade.ts
export async function scheduleDowngrade(subscriptionId: string): Promise<void> {
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const cancelAt = new Date(subscription.current_period_end * 1000);
  
  await sendDowngradeNotification(
    subscription.metadata.userId,
    cancelAt
  );
}
```

---

## 9. Tax Compliance

### 9.1 Stripe Tax Integration

Stripe Tax automatically calculates and collects tax based on:

- Customer location (IP address, billing address)
- Product taxability
- Local tax rates (VAT, GST, sales tax)

### 9.2 Tax Configuration

```typescript
// packages/billing/src/tax.ts
export async function createCheckoutSessionWithTax(
  userId: string,
  tenantId: string,
  priceId: string
): Promise<string> {
  const user = await getUser(userId);
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    customer_creation: 'always',
    customer_details: {
      address: {
        country: user.country,
        state: user.state,
        city: user.city,
        line1: user.addressLine1,
        postal_code: user.postalCode,
      },
    },
    automatic_tax: {
      enabled: true,
    },
    // ... other options
  });
  
  return session.url!;
}
```

---

## 10. Usage-Based Pricing

### 10.1 Metering

For features that exceed plan limits (e.g., additional AI requests):

```typescript
// packages/billing/src/metering.ts
export async function recordUsage(
  subscriptionId: string,
  quantity: number,
  timestamp: number
): Promise<void> {
  await stripe.subscriptionItems.createUsageRecord(
    subscriptionId,
    {
      quantity,
      timestamp,
      action: 'increment',
    }
  );
}
```

### 10.2 Usage Billing

Usage is billed at the end of each billing period:

- **Additional AI requests:** $0.01 per 10 requests beyond free tier
- **Additional storage:** $0.10 per GB beyond plan limit

---

## 11. Enterprise Self-Hosting

### 11.1 Custom Pricing

Enterprise customers receive custom pricing based on:

- Number of users
- Storage requirements
- AI request volume
- Support level (Standard, Premium, Dedicated)

### 11.2 Self-Hosting License

Enterprise self-hosting requires:

1. **Annual contract** with minimum commitment
2. **License key** for software activation
3. **Support SLA** with guaranteed response times
4. **Custom deployment** on customer infrastructure

---

## 12. Database Schema

### 12.1 Billing Tables

```typescript
// packages/db/src/schema/billing.ts (continued)

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  amount: text('amount').notNull(), // Store as string to avoid floating point issues
  currency: text('currency').notNull(),
  status: text('status').notNull(), // succeeded, pending, failed
  invoiceId: text('invoice_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  amountDue: text('amount_due').notNull(),
  amountPaid: text('amount_paid').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  pdfUrl: text('pdf_url'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

---

## 13. Free Tier Limits

### 13.1 Limit Enforcement

```typescript
// packages/billing/src/limits.ts
export async function checkFreeTierLimits(tenantId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const storageUsed = await getStorageUsage(tenantId);
  const aiRequestsToday = await getAIRequestCount(tenantId, today());
  
  if (storageUsed > 1 * 1024 * 1024 * 1024) { // 1GB
    return { allowed: false, reason: 'Storage limit exceeded' };
  }
  
  if (aiRequestsToday > 10) {
    return { allowed: false, reason: 'AI request limit exceeded' };
  }
  
  return { allowed: true };
}
```

### 13.2 Usage Monitoring Middleware

```typescript
// packages/billing/src/middleware.ts
export const billingMiddleware = createMiddleware(async (c, next) => {
  const tenantId = c.get('tenantId');
  const plan = await getTenantPlan(tenantId);
  
  if (plan === 'free') {
    const { allowed, reason } = await checkFreeTierLimits(tenantId);
    if (!allowed) {
      return c.json({ error: reason }, 402); // Payment Required
    }
  }
  
  await next();
});
```

---

## 14. AI Agent Rules for Billing

```markdown
## Billing Rules (AI Agents Must Follow)

1. All new features must consider free tier limits and implement gating.
2. All payment-related code must use idempotency keys to prevent duplicate charges.
3. All webhook handlers must verify Stripe signatures before processing events.
4. All monetary values must be stored as strings (cents) to avoid floating point errors.
5. All subscription changes must be recorded in the database for audit purposes.
6. All tax calculations must use Stripe Tax, never manual calculations.
7. All customer-facing pricing must match Stripe product configuration.
8. All billing errors must be logged with full context for debugging.
```

---

*This document must be updated when the billing strategy changes.*
