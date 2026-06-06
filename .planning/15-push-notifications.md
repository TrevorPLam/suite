---
title: "Push Notifications"
section: "infrastructure"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "04-architecture-technology-stack.md"
  - "12-realtime-durable-objects.md"
tags:
  - "push"
  - "notifications"
  - "agents"
  - "fcm"
---

## 14. Push Notifications

Push notifications are the silent pulse of the Sovereign Suite. They wake a user when a calendar reminder is due, announce a new chat message when the app is closed, and surface a file share when the device is locked. The architecture must deliver these notifications reliably across web browsers, iOS devices, and Android devices—while maintaining the zero‑knowledge guarantee that no plaintext content is ever exposed to the push service, the Cloudflare edge, or any intermediary.

This section provides the complete, production‑ready push notification architecture: a unified dispatch layer that abstracts platform differences, a durable scheduling engine built on Cloudflare Agents, a Web Push pipeline for browsers (complete with VAPID authentication and E2EE), a mobile bridge for native iOS and Android using Firebase Cloud Messaging, and an end‑to‑end encryption strategy that ensures the push service sees only ciphertext. Every notification—whether delivered instantly or scheduled for a specific time—is encrypted, logged, and audited.

---

### 14.1 The Core Push Architecture at a Glance

The push system has three distinct layers, each with its own responsibility:

| Layer | Component | Responsibility |
|-------|-----------|----------------|
| **Application** | Worker / Durable Object | Emits a "send push" event whenever a user action (chat message, file share, event reminder) requires a notification |
| **Orchestration** | Cloudflare Agent (per user) | Stores push subscriptions, schedules reminders, deduplicates requests, handles retries, cleans up dead tokens |
| **Delivery** | Platform‑specific adapter | Sends the final payload through the appropriate push service (Web Push, FCM, APNS) |

The sovereign Agent per user is the architectural centrepiece. It replaces a centralised notification service with a fully isolated, stateful instance that owns the user's subscriptions, scheduled jobs, and delivery status. This approach follows the established pattern used in production systems such as GusLift, where a Durable Object owns push dispatch for each user or coordination unit, and aligns with the Cloudflare Agents guidance that for most applications "use one agent per user (using the user ID as the agent name)".

---

### 14.2 Cloudflare Agents: The Notification Engine

Cloudflare Agents are purpose‑built for this exact workload: durable, stateful coordination that survives hibernation and automatically persists to SQLite. A push‑enabled Agent has three core responsibilities:

1. **Store push subscriptions** durably in its SQLite state.
2. **Schedule reminders** using the Agent's `schedule()` API, which persists tasks to SQLite and survives restarts.
3. **Send notifications** when an alarm fires, using the appropriate transport adapter.

The Agent API provides four scheduling modes, all of which are essential for different notification use cases:

| Mode | Syntax | Use Case |
|------|--------|----------|
| **Delayed** | `this.schedule(60, ...)` | "Remind me in 5 minutes" — short‑lived, ephemeral reminders |
| **Scheduled** | `this.schedule(new Date(...), ...)` | Appointment reminders, deadline notifications |
| **Cron** | `this.schedule("0 8 * * *", ...)` | Daily/weekly reports, periodic clean‑up jobs |
| **Interval** | `this.scheduleEvery(30, ...)` | Heartbeat notifications, sub‑minute polling |

The Agent instance is created per user, identified by the user's ID. This isolation guarantees that one user's notification load never affects another's, and that subscriptions are stored only where they are used.

---

### 14.3 The PushTokens Database Schema

The foundational persistence layer is a simple, cross‑platform table shared by all domains. The schema is inspired by production systems such as GusLift, where a single `PushTokens` table supports token registration, deactivation, and debugging.

```sql
CREATE TABLE app.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user_active ON app.push_tokens (user_id, is_active);
CREATE INDEX idx_push_tokens_token ON app.push_tokens (token);
```

**Key design choices:**

- `token` is unique, not `(user_id, token)`. The same physical device can in principle be reused across user accounts (a shared family device, or a developer account on a personal device). An `ON CONFLICT` `token` upsert ensures the row is reassigned cleanly to the new user instead of duplicating records.
- `is_active` is a boolean rather than deleting rows. When a push service returns `DeviceNotRegistered` (FCM) or `410 Gone` (Web Push), the row is marked inactive. This keeps history useful for debugging "why didn't I get a push?" complaints without leaking junk into the active set.
- `last_seen_at` updates on every successful token registration, providing a freshness signal for troubleshooting.

---

### 14.4 Web Push (Browser)

Web Push is the delivery mechanism for browsers, supported by Chrome, Firefox, Edge, Safari, and all major browsers. It is built on three core standards:
- **Push API**: allows a service worker to receive messages from a push service.
- **Notification API**: displays native system notifications.
- **Web Push Protocol** (RFC 8291): defines how the application server encrypts and sends messages to the push service.

The Sovereign Suite's Web Push implementation follows the proven pattern documented in the Cloudflare Agents guide.

#### 14.4.1 VAPID (Voluntary Application Server Identification)

Before any Web Push can be sent, the Sovereign Suite must generate a VAPID key pair. VAPID provides a way for your backend to prove its identity to the push service, preventing unauthorised parties from sending notifications on your behalf.

```bash
npx web-push generate-vapid-keys
```

The public key is embedded in the frontend; the private key is stored as a Worker secret and never exposed to clients. The public key is also registered in the Cloudflare Agent and exposed via an RPC method for the frontend to fetch.

#### 14.4.2 Agent Implementation for Web Push

The Agent stores each subscription as a JSON object containing `endpoint`, `keys.p256dh`, and `keys.auth`——the exact object returned by the Push API. The `sendReminder` method handles three critical tasks:

- **Delivering the push notification** via the `web-push` library.
- **Cleaning up dead subscriptions** when the push service returns `404` or `410` (subscription no longer valid).
- **Broadcasting to any connected WebSocket clients** so the UI can update in real time.

The Agent schedules an alarm using `this.schedule(delaySeconds, "sendReminder", payload)`. When the alarm fires, the Agent wakes (even if the user closed the tab hours ago), calls `sendReminder`, and can re‑hibernate immediately afterwards.

#### 14.4.3 Client‑Side Setup (Service Worker)

A service worker must be registered at the root of the domain (e.g., `https://app.yourdomain.com/sw.js`). The service worker listens for `push` events to display notifications and `notificationclick` events to focus or open the appropriate tab.

The frontend requests notification permission, fetches the public VAPID key from the Agent, subscribes to push, and sends the subscription object to the Agent for storage. All of this occurs inside a browser that the user has explicitly approved.

---

### 14.5 Mobile Push (iOS and Android)

Mobile push is significantly more complex than web push because it requires integration with platform‑specific services: Apple Push Notification service (APNS) for iOS and Firebase Cloud Messaging (FCM) for Android.

#### 14.5.1 The Unified Firebase Approach

In 2026, the community‑maintained plugin `@capacitor-firebase/messaging` is the robust solution for Capacitor push notifications. It handles the native token swizzling required on iOS and returns a unified FCM token for both platforms. This abstracts away the platform differences: the Sovereign Suite's backend treats both iOS and Android identically, sending all mobile push notifications through FCM.

**Capacitor‑side setup** follows a production‑proven pattern:

1. The Capacitor app requests permission using the Push Notification API.
2. The device token is retrieved via the `@capacitor-firebase/messaging` plugin.
3. The token is sent to the Sovereign Suite backend (`POST /api/push/token`) along with the platform and (optionally) a device name.
4. The backend stores the token in the `push_tokens` table, keyed by `user_id`.

#### 14.5.2 iOS Prerequisites

Apple places strict requirements on push notifications:

- An **active Apple Developer Program membership** ($99/year). Push Notifications cannot be implemented with a free Apple ID.
- A Mac with Xcode to configure the iOS capabilities properly.
- A physical iPhone for testing: push cannot be tested on the iOS Simulator because the Simulator cannot receive real APNS tokens.
- The "Push Notifications" capability must be enabled in Xcode, and the provisioning profile regenerated to include this entitlement.
- The `GoogleService-Info.plist` file must be correctly added to the Xcode project and its target membership checked.

#### 14.5.3 Android Setup

Android push is simpler and free to develop (the $25 one‑time fee applies only when publishing to the Google Play Store). The project must include the Firebase BOM, the Google Services plugin, and the runtime permission `android.permission.POST_NOTIFICATIONS` in the manifest. The `google-services.json` file is placed in the Android app directory.

#### 14.5.4 Backend Send via FCM

Once a mobile token is stored, the backend sends push notifications using the Firebase Admin SDK. The SDK accepts a message object containing:

- **Token**: the device's FCM token.
- **Data payload**: encrypted notification content (key‑value pairs), which will be visible to the iOS/Android system and should contain only non‑sensitive metadata or encrypted blobs.
- **APNS-specific options**: for iOS, the payload can include `sound`, `badge`, and `content‑available` flags for background processing.

**Critical: Token lifecycle management.** FCM tokens can be revoked or rotated at any time. The backend must handle `DeviceNotRegistered` errors by marking the token as inactive in `push_tokens`. The GusLift pattern of upserting on conflict and deactivating rather than deleting is recommended. Immediate deletion loses forensic value and makes it harder to correlate "push not received" complaints with device logs.

---

### 14.6 End‑to‑End Encryption (E2EE) for Notifications

The zero‑knowledge guarantee applies to push notifications just as it does to stored data. The Sovereign Suite **must not** send plaintext notification payloads through third‑party push services. The architecture ensures that:

1. **The push service sees only ciphertext.** Every notification payload is encrypted before it leaves the Cloudflare Agent.
2. **The device decrypts the payload locally** using a key derived from the user's domain key and stored in the mobile keychain (iOS) or Android Keystore.

#### 14.6.1 Web Push E2EE (Built‑In)

The Web Push protocol includes mandatory payload encryption. The browser generates a P‑256 elliptic curve key pair during subscription; the `p256dh` (Diffie‑Hellman public key) and `auth` (authentication secret) are sent to the backend. The `web-push` library automatically uses these keys to encrypt the payload using ECDH (elliptic curve Diffie‑Hellman) and AES‑GCM before sending it to the push service. The push service cannot decrypt the payload; only the browser can.

#### 14.6.2 Mobile Push E2EE (Application Layer)

FCM and APNS do not natively encrypt notification payloads beyond TLS in transit. The Sovereign Suite implements **application‑layer encryption**:

- Each notification payload is a JSON object containing a single field, `encryptedData`, which holds the AES‑256‑GCM ciphertext.
- The encryption key is derived from the user's domain key and a device‑specific salt, stored in the iOS Keychain or Android Keystore.
- The mobile app receives the push, extracts `encryptedData`, decrypts it locally using the stored key, and then displays the plaintext notification.

**Example encrypted payload structure:**

```json
{
  "encryptedData": "base64-encoded-ciphertext",
  "iv": "base64-encoded-iv",
  "salt": "base64-encoded-salt"
}
```

The device uses the salt to re‑derive the key from the user's domain key (which is already stored in the secure enclave). The notification system never handles plaintext; the push service sees only an opaque encrypted blob.

---

### 14.7 Unified Dispatch with @workkit/notify

Rather than implementing separate adapters for web, email, and WhatsApp, the Sovereign Suite uses `@workkit/notify`, a unified notification dispatch library for Cloudflare Workers. It provides a single API for sending notifications across any channel, pluggable transport adapters, and cross‑cutting concerns such as recipient resolution, quiet hours, idempotency, fallback chains, and delivery records.

**Define a notification type:**

```typescript
import { define } from '@workkit/notify';
import { z } from 'zod';

const calendarReminder = define({
  id: 'calendar-reminder',
  schema: z.object({
    eventTitle: z.string(),
    eventStartTime: z.string(),
    eventId: z.string(),
  }),
  channels: {
    webPush: { template: 'calendar_reminder_v1' },
    mobile: { template: 'calendar_reminder_v1' },
    inApp: {
      title: (p) => p.eventTitle,
      body: (p) => `Starts at ${p.eventStartTime}`,
      deepLink: (p) => `/calendar/event/${p.eventId}`,
    },
  },
  fallback: ['webPush', 'mobile', 'inApp'],
  priority: 'high',
});
```

**Send a notification:**

```typescript
await calendarReminder.send(
  { eventTitle: 'Team Standup', eventStartTime: '2026-06-04T10:00:00Z', eventId: 'evt_123' },
  { userId: 'user_123' }
);
```

The library automatically resolves the user's preferred channels, respects quiet hours, ensures idempotency (no duplicate deliveries for the same idempotency key), and logs every delivery. It also includes compliance utilities such as `forgetUser(userId)`, which deletes all of a user's notification data from the system.

---

### 14.8 Scheduled Notifications and Reminders

Push notifications are often not sent instantly; they are scheduled for a future time. The Cloudflare Agent's scheduling system is the perfect match for this requirement, as it persists tasks to SQLite, survives Agent restarts, and supports delayed, absolute, and cron schedules.

**Creating a scheduled reminder** in an Agent is a single RPC call:

```typescript
// Create a reminder for 5 minutes from now
await agent.schedule(300, 'sendReminder', {
  eventId: 'evt_123',
  eventTitle: 'Team Standup',
  minutesBefore: 5,
});
```

When the alarm fires, the Agent's `sendReminder` method is called, which then calls the appropriate transport adapter to deliver the notification to all of the user's registered devices.

**Pruning stale subscriptions:** The Agent must handle `404` (Not Found) and `410` (Gone) responses from the push service by deleting or deactivating the corresponding subscription entry. This prevents endless retries for invalid tokens and keeps the Agent's state clean.

---

### 14.9 Production Hardening and Failure Handling

Push notification systems fail silently unless they are hardened against common failure modes:

| Failure Mode | Mitigation |
|--------------|------------|
| **Subscription expired** (Web Push returns 404/410) | Deactivate the token; do not retry. The Agent removes the entry from its state |
| **Token invalid** (FCM returns `DeviceNotRegistered`) | Mark `is_active = false` in `push_tokens`; optionally schedule a re‑registration push from the backend to the app |
| **Push service rate limit** | Implement exponential backoff using `this.schedule()`; do not retry immediately if a 5xx error is returned |
| **Device offline** (push service accepts but does not deliver immediately) | No action required. The push service queues the message and delivers when the device reconnects |
| **Agent evicted before alarm fires** | The schedule persists to SQLite, and the alarm is re‑armed when the Agent restarts. This is handled automatically by the platform |

---

### 14.10 AI Agent Rules for Push Notifications

Add the following to your root `AGENTS.md`:

```markdown
## Push Notifications — Rules for AI Agents

1. **Never store plaintext tokens in logs.** Tokens are sensitive; log only the first 4 and last 4 characters for debugging.
2. **Always encrypt notification payloads for mobile push.** Use `@suite/crypto` and derive a per‑device key stored in the keychain/keystore.
3. **Use one Agent per user.** Do not share a single Agent across multiple users for notification storage.
4. **Schedule reminders with `this.schedule()`.** Use the Agent's built‑in scheduling system, not a separate cron job.
5. **Handle 404/410 errors by deactivating tokens.** Do not delete tokens immediately; mark them inactive and log the event.
6. **Never send plaintext `alert` or `body` through FCM.** Always use the `data` payload and encrypt the contents.
7. **Use `@workkit/notify` for channel dispatch.** Do not re‑implement routing, fallbacks, or quiet hours.
8. **Test on physical devices for iOS.** Push does not work on the Simulator.
9. **Respect `presentationOptions` on mobile.** Only certain payload types trigger notification delivery in foreground.
10. **Implement idempotency for all notifications.** Use `idempotency_key` to prevent duplicate deliveries caused by retries.
```

---

### 14.11 Summary: Why This Push Architecture Wins

| Concern | Solution | Benefit |
|---------|----------|---------|
| **Unified dispatch** | `@workkit/notify` + channel adapters | One API for web, mobile, email; built‑in fallbacks and quiet hours |
| **Per‑user isolation** | One Cloudflare Agent per user | No noisy neighbours; state scales linearly with users |
| **Zero‑knowledge payloads** | E2EE for all notification payloads | Push service sees only ciphertext; device decrypts locally |
| **Reliable scheduling** | Agent alarms persisted to SQLite | Notifications survive Agent eviction and restarts |
| **Failure resilience** | Exponential backoff + token deactivation | No endless retries; clean state |
| **Cost efficiency** | Agents hibernate when idle; only active when sending push | Running cost for idle users is effectively zero |

The push notification architecture of the Sovereign Suite delivers exactly what a zero‑knowledge productivity suite requires: timely, reliable, secure notifications across web and mobile devices, without ever exposing user content to third‑party push services. The user sees the reminder, reads the message, or accepts the invitation—and the Sovereign Suite never breaks its zero‑knowledge promise.
