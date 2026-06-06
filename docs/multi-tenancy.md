# Multi-Tenancy with Better Auth Organization Plugin

This document explains how to use the Better Auth organization plugin for multi-tenant functionality in the Suite applications.

## Overview

The organization plugin provides:
- Organization creation and management
- Member management with role-based access control (RBAC)
- Organization switching via session context
- Invitation system for adding members
- Data isolation per organization

## Server Configuration

The organization plugin is configured in `packages/auth/src/server.ts`:

```typescript
import { organization } from 'better-auth/plugins';

export function createAuth({ db, env, waitUntil, trustedOrigins }: CreateAuthOptions) {
  const auth = betterAuth({
    // ... other config
    plugins: [
      organization(),
    ],
  });
  return auth;
}
```

## Client Configuration

The organization client plugin is configured in `packages/auth/src/client.ts`:

```typescript
import { organizationClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL,
  plugins: [
    organizationClient(),
  ],
});
```

## Database Schema

The organization plugin creates the following tables:

### organizations
- `id`: Primary key
- `name`: Organization name
- `slug`: Unique URL-friendly identifier
- `logo`: Optional logo URL
- `createdAt`: Creation timestamp
- `metadata`: Optional JSON metadata

### members
- `id`: Primary key
- `organizationId`: Foreign key to organizations
- `userId`: Foreign key to users
- `role`: Member role (member, admin, owner)
- `createdAt`: Creation timestamp

### invitations
- `id`: Primary key
- `organizationId`: Foreign key to organizations
- `email`: Invitee email
- `role`: Role to assign upon acceptance
- `status`: Invitation status (pending, accepted, rejected)
- `expiresAt`: Expiration timestamp
- `createdAt`: Creation timestamp
- `inviterId`: Foreign key to users (who sent the invitation)

### sessions (updated)
- `activeOrganizationId`: Currently active organization for the session

## Usage Examples

### Creating an Organization

```typescript
import { authClient } from '@suite/auth';

const result = await authClient.organization.createOrganization({
  name: 'My Company',
  slug: 'my-company',
  logo: 'https://example.com/logo.png',
});
```

### Setting Active Organization

```typescript
await authClient.organization.setActiveOrganization({
  organizationId: 'org_123',
});
```

### Getting Active Organization

```typescript
const { data: activeOrg } = await authClient.organization.getActiveOrganization();
console.log(activeOrg); // { id, name, slug, members: [...], ... }
```

### Inviting a Member

```typescript
await authClient.organization.inviteMember({
  organizationId: 'org_123',
  email: 'user@example.com',
  role: 'member',
});
```

### Managing Member Roles

```typescript
// Update member role
await authClient.organization.updateMemberRole({
  memberId: 'member_123',
  role: 'admin',
});

// Remove member
await authClient.organization.removeMember({
  memberId: 'member_123',
});
```

### Leaving an Organization

```typescript
await authClient.organization.leaveOrganization({
  organizationId: 'org_123',
});
```

### Deleting an Organization

```typescript
await authClient.organization.deleteOrganization({
  organizationId: 'org_123',
});
```

## Role-Based Access Control

The organization plugin supports three roles:

- **owner**: Full control, can delete organization
- **admin**: Can manage members and invitations
- **member**: Standard access, read/write to organization resources

## Data Isolation

Domain packages should enforce organization-level data isolation by:

1. Checking the active organization from the session
2. Filtering queries by `organizationId` or `member.organizationId`
3. Ensuring users can only access data from their active organization

Example in a domain repository:

```typescript
async function getCalendarEvents(userId: string, organizationId: string) {
  return db.select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        eq(calendarEvents.organizationId, organizationId)
      )
    );
}
```

## Migration

To apply the organization schema changes:

```bash
# Generate migration
pnpm --filter @suite/db db:generate

# Run migration (requires DATABASE_URL)
APP_DOMAIN=shared pnpm db:migrate
```

## Testing

Manual testing steps:

1. Start the API server with DATABASE_URL configured
2. Sign in as a user
3. Create an organization via the API
4. Verify organization appears in the database
5. Set the active organization
6. Invite a member
7. Test member role management
8. Test organization switching

## Notes

- The organization plugin manages the active organization via `session.activeOrganizationId`
- No additional environment variables are required
- Organization switching is session-scoped, not user-scoped
- The plugin automatically handles member creation when a user creates an organization
