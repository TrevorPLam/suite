# Contacts App Guide

This document defines the architecture and implementation details for the Contacts application in the Sovereign Suite.

---

## Overview

The Contacts app provides encrypted contact storage with vCard import/export, CardDAV sync, and blind indexing for names and emails.

---

## Domain Model

### Contact

```typescript
interface Contact {
  id: string;
  tenantId: string;
  userId: string;
  name: string; // Plaintext for searchability
  encryptedBlob: Uint8Array; // Encrypted: emails, phones, addresses
  createdAt: Date;
  updatedAt: Date;
}
```

---

## vCard Import/Export

### vCard Format

```typescript
// packages/domain-contacts/src/lib/vcard.ts
export function convertToVCard(contact: Contact): string {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${contact.name}`,
    // Encrypted fields are not included in vCard for security
    'END:VCARD',
  ];
  
  return lines.join('\n');
}

export function parseVCard(vcard: string): Partial<Contact> {
  const lines = vcard.split('\n');
  const contact: Partial<Contact> = {};
  
  for (const line of lines) {
    if (line.startsWith('FN:')) {
      contact.name = line.substring(3);
    }
  }
  
  return contact;
}
```

### Import Endpoint

```typescript
// apps/contacts/api/src/index.ts
app.post('/api/contacts/import', async (c) => {
  const { vcard } = await c.req.json();
  const contact = parseVCard(vcard);
  
  const created = await createContact(contact);
  
  return c.json(created, 201);
});
```

---

## CardDAV Sync

### CardDAV Endpoint

```typescript
// apps/contacts/api/src/carddav.ts
app.propfind('/carddav', async (c) => {
  const tenantId = c.get('tenantId');
  const contacts = await getContacts(tenantId);
  
  const vcard = convertToVCard(contacts);
  
  return c.text(vcard, 207, {
    'Content-Type': 'text/vcard',
    'DAV': '1, 2, 3, addressbook',
  });
});
```

### Sync with External Services

```typescript
export async function syncWithCardDAV(
  cardDAVUrl: string,
  username: string,
  password: string
): Promise<Contact[]> {
  const response = await fetch(cardDAVUrl, {
    headers: {
      Authorization: `Basic ${btoa(username + ':' + password)}`,
    },
  });
  
  const vcard = await response.text();
  return parseVCard(vcard);
}
```

---

## Blind Indexing for Names/Emails

### Index Generation

```typescript
// packages/domain-contacts/src/lib/search.ts
export function generateContactSearchTokens(
  name: string,
  emails: string[]
): string[] {
  const tokens: string[] = [];
  
  // Tokenize name
  const nameTokens = name.toLowerCase().split(' ');
  tokens.push(...nameTokens);
  
  // Tokenize emails
  for (const email of emails) {
    const localPart = email.split('@')[0].toLowerCase();
    tokens.push(localPart);
  }
  
  // Generate blind indexes
  return tokens.map(token => generateBlindIndexToken(token));
}
```

### Storage

```typescript
export async function createContact(contact: Contact): Promise<void> {
  const searchTokens = generateContactSearchTokens(
    contact.name,
    contact.emails
  );
  
  await db.query(
    `INSERT INTO contacts.contacts (id, tenant_id, user_id, name, encrypted_blob)
     VALUES ($1, $2, $3, $4, $5)`,
    [contact.id, contact.tenantId, contact.userId, contact.name, contact.encryptedBlob]
  );
  
  // Store blind indexes
  for (const token of searchTokens) {
    await db.query(
      `INSERT INTO search.blind_indexes (tenant_id, resource_type, resource_id, field_name, hmac_token)
       VALUES ($1, $2, $3, $4, $5)`,
      [contact.tenantId, 'contact', contact.id, 'name', token]
    );
  }
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contacts` | GET | List contacts |
| `/api/contacts` | POST | Create contact |
| `/api/contacts/:id` | GET | Get contact |
| `/api/contacts/:id` | PUT | Update contact |
| `/api/contacts/:id` | DELETE | Delete contact |
| `/api/contacts/import` | POST | Import vCard |
| `/api/contacts/export` | GET | Export vCard |
| `/carddav` | PROPFIND | CardDAV endpoint |

---

## Encryption Strategy

### Plaintext Fields

- `name` (for searchability)

### Encrypted Fields

- `encrypted_blob` contains:
  - Emails
  - Phone numbers
  - Addresses
  - Notes
  - Custom fields

---

*This document must be updated when the Contacts app architecture changes.*
