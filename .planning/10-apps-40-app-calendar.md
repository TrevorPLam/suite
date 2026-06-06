# Calendar App Guide

This document defines the architecture and implementation details for the Calendar application in the Sovereign Suite.

---

## Overview

The Calendar app provides encrypted calendar event management with support for recurring events, attendees, and CalDAV interoperability.

---

## Domain Model

### Event

```typescript
interface Event {
  id: string;
  tenantId: string;
  userId: string;
  title: string; // Plaintext for searchability
  startAt: Date;
  endAt: Date;
  encryptedBlob: Uint8Array; // Encrypted: description, location, attendees
  createdAt: Date;
  updatedAt: Date;
}
```

### Attendee

```typescript
interface Attendee {
  id: string;
  eventId: string;
  email: string; // Plaintext for invitations
  status: 'pending' | 'accepted' | 'declined';
}
```

---

## E2EE Key Derivation Path

### Key Hierarchy

1. **User master key**: Derived from password using PBKDF2 (600,000 iterations)
2. **Calendar domain key**: Derived from master key using HKDF
3. **Event-specific key**: Derived from domain key using HKDF (per event)

### Implementation

```typescript
// packages/domain-calendar/src/lib/keys.ts
import { hkdf } from '@suite/crypto';

export async function deriveEventKey(
  masterKey: CryptoKey,
  eventId: string
): Promise<CryptoKey> {
  const domainKey = await hkdf(masterKey, 'calendar-domain');
  const eventKey = await hkdf(domainKey, eventId);
  return eventKey;
}
```

---

## Database Schema

### calendar.events

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `user_id` | `UUID` | No | - | Event owner |
| `title` | `TEXT` | No | - | Event title (plaintext) |
| `start_at` | `TIMESTAMPTZ` | No | - | Start time |
| `end_at` | `TIMESTAMPTZ` | No | - | End time |
| `encrypted_blob` | `BYTEA` | Yes | - | Encrypted details |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

### calendar.attendees

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `event_id` | `UUID` | No | - | Parent event |
| `email` | `TEXT` | No | - | Attendee email |
| `status` | `TEXT` | No | 'pending' | Attendance status |

---

## CalDAV Interoperability

### PROPFIND Endpoint

```typescript
// apps/calendar/api/src/caldav.ts
app.propfind('/caldav', async (c) => {
  const tenantId = c.get('tenantId');
  const events = await getEvents(tenantId);
  
  const ical = convertToICal(events);
  
  return c.text(ical, 207, {
    'Content-Type': 'text/calendar',
    'DAV': '1, 2, 3, calendar-access, calendar-schedule',
  });
});
```

### iCal Conversion

```typescript
// packages/domain-calendar/src/lib/ical.ts
export function convertToICal(events: Event[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sovereign Suite//Calendar//EN',
    ...events.map(event => [
      'BEGIN:VEVENT',
      `DTSTART:${formatICalDate(event.startAt)}`,
      `DTEND:${formatICalDate(event.endAt)}`,
      `SUMMARY:${event.title}`,
      'END:VEVENT',
    ].join('\n')),
    'END:VCALENDAR',
  ];
  
  return lines.join('\n');
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | List events |
| `/api/events` | POST | Create event |
| `/api/events/:id` | GET | Get event |
| `/api/events/:id` | PUT | Update event |
| `/api/events/:id` | DELETE | Delete event |
| `/api/events/:id/attendees` | GET | List attendees |
| `/api/events/:id/attendees` | POST | Add attendee |
| `/caldav` | PROPFIND | CalDAV endpoint |

---

## Encryption Strategy

### Plaintext Fields

- `title` (for searchability and calendar rendering)
- `start_at`, `end_at` (for time-based queries)

### Encrypted Fields

- `encrypted_blob` contains:
  - Description
  - Location
  - Attendee details
  - Custom fields

---

*This document must be updated when the Calendar app architecture changes.*
