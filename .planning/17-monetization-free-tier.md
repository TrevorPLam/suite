---
title: "Monetization & Free‑Tier Limits"
section: "monetization"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "14-infrastructure-hybrid-cloud.md"
  - "05-core-packages-shared-packages.md"
tags:
  - "monetization"
  - "pricing"
  - "free-tier"
  - "stripe"
---

## 16. Monetization & Free‑Tier Limits

The Sovereign Suite is built to operate at zero marginal cost for as long as possible. Cloudflare's generous free tier, combined with a self‑hosted VPS, allows you to launch a full‑featured productivity suite without a monthly cloud bill. However, free is not a business model; it is a growth engine. The Sovereign Suite must eventually pay for its own infrastructure, fund its development, and justify the time you invest. This section documents the precise limits of the free tier, the mechanisms to stay within them, and the monetization strategy that converts free users into paying customers without compromising the zero‑knowledge promise.

---

### 16.1 Cloudflare Free Tier at a Glance

Cloudflare's free tier is among the most generous in the industry. For the Sovereign Suite, the most relevant services and their limits are:

| Service | Free Limit | Monitoring Threshold | Overage Mitigation |
|---------|------------|---------------------|---------------------|
| **Workers** | 100k requests/day | Alert at 80k; hard limit 100k | Route excess to fallback API; upgrade to Paid plan ($5/mo) |
| **Pages** | 500 builds/month | Alert at 400 builds | Optimize caching; manual approval for high‑volume builds |
| **R2** | 10 GB storage, 1M Class A ops, 10M Class B ops/month | Alert at 8 GB storage; 800k writes | Implement lifecycle rules; upgrade to Paid plan ($0.015/GB) |
| **Durable Objects** | 1M requests/month, 400k GB‑seconds of duration | Alert at 800k requests; 320k GB‑s | Hibernation reduces duration; upgrade to Paid plan |
| **Hyperdrive** | 1 free database | N/A | Scale to paid only when exceeding 100k active connections/day |

**Critical nuance:** The free tier **100k requests/day** is a hard limit. Exceeding it leads to HTTP `1027` error responses (`EXCEEDED_DAILY_LIMIT`) returned to clients, not a graceful degradation. The Workers Paid plan (the "Standard" plan) increases the daily request limit to **10M requests/month** (approximately 333k/day), includes 30M CPU ms, and costs a flat $5/month plus $0.30 per additional million requests.

**Pages builds limit:** The 500 builds/month limit applies across all Pages projects in your Cloudflare account. If the Sovereign Suite has 53 separate Pages projects, each with its own CI‑triggered builds, this limit can be exhausted quickly. Mitigations include:

- **Using `nx affected`** to only deploy the specific Pages project that changed, not all 53.
- **Skipping Pages deploys for documentation or config‑only changes.**
- **Manual approval** for builds exceeding a monthly quota per project.

**Durable Objects free tier:** The 400k GB‑seconds of duration is the aggregate over all DOs. With the Hibernation API (Section 10), idle DOs consume almost no duration. A chat room with 1,000 connected users that exchanges 10 messages per minute consumes duration only when a message is processed—approximately 0.05 CPU seconds per message, or 2,000 seconds per day for 4 messages per second. This stays well within the free tier even with hundreds of active rooms.

---

### 16.2 Cost Tracking and Alerting

The Sovereign Suite implements automated cost tracking to prevent surprise overages. The monitoring system, deployed as a separate Worker, queries Cloudflare's GraphQL API daily and compares usage against thresholds.

**Thresholds and alerting rules:**

- **Yellow alert (80% of limit):** Log to console; no user action.
- **Orange alert (90% of limit):** Send a Slack/email notification to the team.
- **Red alert (95% of limit):** Activate mitigation (cache aggressive, degrade functionality) and page the on‑call engineer.

**GraphQL query for Worker usage:**

```graphql
{
  viewer {
    accounts(filter: {accountTag: "YOUR_ACCOUNT_TAG"}) {
      workersInvocationsDaily(limit: 30) {
        sum { invocations }
        date
      }
    }
  }
}
```

The monitoring Worker stores the daily usage in a Durable Object and exposes a simple `/health/limits` endpoint that returns a JSON summary of current usage against limits.

---

### 16.3 Staying Within Free Tiers: Operational Discipline

The Sovereign Suite remains within free tier limits through deliberate design choices, not accidental restraint.

| Service | Discipline | Implementation |
|---------|------------|----------------|
| **Workers** | Use `nx affected` deploys; no unnecessary code pushes | GitHub Actions only runs builds for projects changed in the PR |
| **Pages** | Deploy only on `main` branch; use preview deployments sparingly | Separate `CI=true` environment variable to skip Pages build on feature branches |
| **R2** | Enforce object lifecycle rules; encrypt before upload, never store plaintext | Lifecycle policy: delete objects older than 30 days from `/temp` prefix |
| **Durable Objects** | Enable Hibernation API; never keep DO alive without active WebSockets | Set idle time to 60 seconds; DO automatically hibernates when idle |

The most important rule: **never deploy a Worker or Pages project on every commit to every branch.** Feature branches use local `wrangler dev`; only the `main` branch triggers a deployment. This single rule reduces build count by 90% or more.

---

### 16.4 Monetization Strategy: Freemium to Premium

The Sovereign Suite's monetization model is **freemium with a generous free tier and premium add‑ons**. The core productivity features—calendar, drive, mail, chat—remain free for individual users. Premium features are gated behind a subscription.

**Free tier (always free):**

| Feature | Limit |
|---------|-------|
| Calendar | Unlimited events, 3 booking links |
| Drive | 5 GB storage |
| Mail | 2 GB storage, 5 custom aliases |
| Chat | 10 participants per room |
| Vault | 50 passwords |
| VPN | 10 GB/month bandwidth |

**Premium tier ($8/user/month or $96/year):**

- Unlimited storage (Drive, Mail, Photos)
- Unlimited booking links, custom domain email aliases
- Advanced analytics and reporting
- Priority support (email + chat)
- 20 GB/month VPN bandwidth
- Collaborative editing (Documents, Spreadsheets)

**Enterprise tier (custom pricing):**

- SSO (SAML/OIDC) with Better Auth's enterprise plugin
- Compliance reports (SOC 2, GDPR, HIPAA)
- Dedicated VPS deployment (self‑hosted)
- 99.95% SLA with financial credits
- 24/7 phone support

The pricing aligns with the industry baseline: Google Workspace Individual is $9.99/month, Proton Unlimited is $11.99/month. The Sovereign Suite undercuts both while offering more features.

---

### 16.5 Integration with Better Auth

Better Auth's organization plugin is the engine for premium feature gating. Each user belongs to an organization (even individual users have a single‑member organization). The organization's `plan` field determines which features are enabled.

**Table addition for premium plans:**

```sql
ALTER TABLE auth.organizations ADD COLUMN plan TEXT DEFAULT 'free';
ALTER TABLE auth.organizations ADD COLUMN plan_expires_at TIMESTAMPTZ;
ALTER TABLE auth.organizations ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE auth.organizations ADD COLUMN stripe_subscription_id TEXT;
```

**Feature gating in the API:**

```typescript
import { requirePlan } from '@suite/auth/plans';

app.get('/api/drive/upload', requirePlan('premium'), async (c) => {
  // Only premium users can upload files > 5 GB
});
```

The `requirePlan` middleware checks the organization's `plan` field and returns `402 Payment Required` if the user exceeds their plan's limits.

**Stripe integration:**

Better Auth does not include a built‑in payment processor. The Sovereign Suite uses Stripe's Checkout API for subscription management:

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/api/billing/create-checkout', async (c) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: 'price_premium_monthly', quantity: 1 }],
    success_url: 'https://app.yourdomain.com/billing/success',
    cancel_url: 'https://app.yourdomain.com/billing/cancel',
    metadata: { organizationId: c.get('organizationId') },
  });
  return c.json({ url: session.url });
});
```

A Stripe webhook handler updates the `plan` and `plan_expires_at` fields when a subscription is paid, cancelled, or expires.

---

### 16.6 Free Tier Circuit Breaker

To prevent a single abusive user from exhausting the Sovereign Suite's free tier quota, each API implements a **circuit breaker middleware** that tracks per‑user usage and blocks requests that would exceed the plan's limits.

**Implementation in `packages/auth/rateLimit.ts`:**

```typescript
import { createMiddleware } from 'hono/factory';

export const planRateLimit = (limit: number, windowSeconds: number) =>
  createMiddleware(async (c, next) => {
    const userId = c.get('userId');
    const key = `ratelimit:${userId}`;
    const current = await c.env.KV.get(key);

    if (current && parseInt(current) >= limit) {
      return c.json({ error: 'Rate limit exceeded. Upgrade to premium.' }, 429);
    }

    await c.env.KV.incr(key, 1);
    await c.env.KV.expire(key, windowSeconds);
    await next();
  });
```

The circuit breaker is plan‑aware: free users get a lower limit than premium users. The limits are configured per endpoint—uploading a 100 MB file consumes more quota than fetching a calendar event.

---

### 16.7 Upgrading from Free to Paid

The upgrade flow is designed to be frictionless:

1. **User clicks "Upgrade"** in the app's billing settings.
2. **Stripe Checkout** opens in a modal, pre‑filled with the user's email and organization ID.
3. **User enters payment details** and confirms the subscription.
4. **Stripe webhook** `checkout.session.completed` triggers the Sovereign Suite backend.
5. **Backend updates the organization's `plan` field** to `premium`.
6. **User's session cache** is invalidated, and the UI reflects the new plan instantly.
7. **Webhook is idempotent** (uses `stripe_event_id` deduplication) to handle retries safely.

The webhook handler runs in a Worker, updates the database, and invalidates the session cache in the same transaction.

---

### 16.8 Self‑Hosting as a Premium Feature

Enterprise customers may require the Sovereign Suite to run entirely on their own infrastructure. This is the **self‑hosting premium** tier:

- **Dedicated VPS or on‑premises deployment.** The customer provides a VPS; the Sovereign Suite provides a deployment script.
- **No Cloudflare dependency.** The customer can use their own CDN or none at all.
- **Data never leaves the customer's environment.** The zero‑knowledge guarantee is preserved.
- **License fee** (annual, per‑server or per‑seat pricing).

The self‑hosting deployment script is a Docker Compose bundle that includes PostgreSQL, the fallback API, and a local object storage proxy (MinIO). The customer's IT team runs `docker-compose up -d`, and the Sovereign Suite is fully operational.

**Pricing model for self‑hosting:** Flat annual fee of $5,000–$20,000 depending on seat count, plus optional support and maintenance contract. This targets small to mid‑size enterprises that cannot accept any third‑party dependency but are not large enough to build their own solution.

---

### 16.9 Cost Projections for the Sovereign Suite

| Metric | Assumption | Monthly Cost (Free Tier) | Monthly Cost (Paid Plans) |
|--------|------------|--------------------------|---------------------------|
| **Workers requests** | 50,000/day (50% of free tier) | $0 | $0 |
| **Pages builds** | 200/month (40% of free tier) | $0 | $0 |
| **R2 storage** | 8 GB (80% of free tier) | $0 | $0.12 ($0.015/GB × 8) |
| **Durable Objects** | 500,000 requests/month (50% of free tier) | $0 | $0.15 ($0.30 per million) |
| **Total** | — | **$0** | **~$0.27/month** |

The Sovereign Suite can serve **thousands of active users** within the free tier. Only when the user base grows beyond 10,000 active users does the paid Workers plan become necessary. The cost of the paid Workers plan ($5/month) is negligible compared to the revenue from premium subscriptions.

---

### 16.10 AI Agent Rules for Monetization

Add the following to your root `AGENTS.md`:

```markdown
## Monetization & Limits — Rules for AI Agents

1. **Never hardcode plan limits in UI.** Fetch from `GET /api/billing/limits` endpoint.
2. **Enforce limits at the API layer**, not just in UI. The `requirePlan` middleware must be applied to all premium endpoints.
3. **Rate limit free tier users more aggressively** than premium users. Use `planRateLimit` with different limits.
4. **Never store Stripe webhook secrets in code.** Use Doppler for `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
5. **Make webhook handlers idempotent.** Use the Stripe event ID as a deduplication key.
6. **Log every upgrade and downgrade** to the audit log. Store `organization_id`, `old_plan`, `new_plan`, and `stripe_subscription_id`.
7. **Test the circuit breaker.** Write integration tests that simulate exceeding rate limits and verify the 429 response.
8. **Monitor free tier usage weekly.** Use the GraphQL monitoring Worker to alert before limits are hit.
9. **Document the self‑hosting deployment script.** It must be tested in a fresh environment before each release.
10. **Never give away premium features for free.** If a feature is gated, enforce it at the API layer.
```

---

### 16.11 Summary: Monetization at a Glance

| Tier | Price | Features | Target Audience |
|------|-------|----------|-----------------|
| **Free** | $0 | Core productivity (Calendar, Drive, Mail, Chat, Vault, VPN) with generous limits | Individual users, open‑source contributors, non‑profit organisations |
| **Premium** | $8/user/month | Unlimited storage, advanced analytics, collaborative editing, priority support | Power users, small teams, freelancers |
| **Enterprise** | Custom | SSO, compliance reports, dedicated VPS deployment, 24/7 phone support | Organisations requiring data sovereignty and compliance |

The monetization strategy is designed to be **sustainable, not extractive**. The free tier is genuinely useful, not a crippled demo. Premium features are genuinely valuable, not artificial limitations. The Sovereign Suite generates enough revenue to cover its infrastructure costs, fund its development, and pay its contributors—all without compromising the zero‑knowledge promise or selling user data.
