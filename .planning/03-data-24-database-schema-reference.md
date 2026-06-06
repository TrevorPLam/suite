# Database Schema Reference

This document is the authoritative reference for all PostgreSQL schemas, tables, columns, and relationships in the Sovereign Suite. Every AI agent working on domain packages must consult this document before creating or modifying tables to ensure consistency across the multi-tenant encrypted system.

---

## Schema Organization

The Sovereign Suite uses PostgreSQL schemas to enforce physical domain boundaries:

| Schema | Purpose | Tables |
|--------|---------|--------|
| `public` | Legacy compatibility (will be migrated to domain schemas) | users, sessions, accounts |
| `calendar` | Calendar events, attendees, bookings | events, attendees, bookings |
| `drive` | File storage metadata | files, folders, shares |
| `vault` | Encrypted credentials and secrets | credentials, recovery_keys |
| `mail` | Email storage and metadata | mailboxes, messages, attachments |
| `auth` | Authentication and authorization (future) | users, sessions, accounts (migrated from public) |
| `app` | Cross-domain shared tables | audit_logs, honeytokens, webhook_deliveries |
| `search` | Search indexes and blind index tokens | blind_indexes, search_tokens |
| `drizzle` | Migration tracking per domain | migrations_calendar, migrations_drive, etc. |

---

## Naming Conventions

### Tables
- **Snake_case**: `calendar_events`, `drive_files`, `app_audit_logs`
- **Domain prefix**: When tables share names across domains, prefix with domain: `calendar_events`, `mail_messages`
- **No pluralization exceptions**: Use standard English plurals (e.g., `users`, not `user`)

### Columns
- **Snake_case**: `created_at`, `user_id`, `encrypted_blob`
- **ID columns**: `<entity>_id` for foreign keys, `id` for primary keys
- **Timestamps**: `created_at`, `updated_at` always `TIMESTAMPTZ`
- **Boolean flags**: `is_<adjective>` or `<verb>_ed` (e.g., `is_active`, `completed`)

### Constraints
- **Primary keys**: `<table>_pkey` (PostgreSQL default)
- **Foreign keys**: `<table>_<column>_fkey` (PostgreSQL default)
- **Unique constraints**: `<table>_<column>_unique` (PostgreSQL default)
- **Check constraints**: `<table>_<column>_check` (PostgreSQL default)

### RLS Policies
- **Pattern**: `<table>_<action>_policy` (e.g., `events_tenant_isolation_policy`)

---

## Current Schema (As of June 2026)

### Public Schema (Legacy)

The `public` schema currently holds authentication tables. These will be migrated to the `auth` schema in a future migration.

#### `users`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `email` | `TEXT` | No | - | User email (unique) |
| `name` | `TEXT` | Yes | - | Display name |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Indexes:**
- `users_email_unique` (UNIQUE on `email`)

**Constraints:**
- `users_email_unique`: UNIQUE(email)

**Encryption:** All columns are plaintext. User PII is encrypted at the application layer before storage in domain-specific tables.

#### `sessions`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | No | - | Foreign key to users.id |
| `token` | `TEXT` | No | - | Session token (unique) |
| `expires_at` | `TIMESTAMPTZ` | No | - | Session expiration |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Session creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Indexes:**
- `sessions_token_unique` (UNIQUE on `token`)
- `sessions_user_id_idx` (on `user_id` for session lookup)

**Constraints:**
- `sessions_token_unique`: UNIQUE(token)
- `sessions_user_id_users_id_fk`: FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE

**Encryption:** `token` is a hashed session identifier. Plaintext tokens are never stored.

#### `accounts`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | No | - | Foreign key to users.id |
| `provider` | `TEXT` | No | - | OAuth provider (e.g., 'google', 'github') |
| `provider_account_id` | `TEXT` | No | - | Provider's user ID |
| `access_token` | `TEXT` | Yes | - | OAuth access token (encrypted) |
| `refresh_token` | `TEXT` | Yes | - | OAuth refresh token (encrypted) |
| `expires_at` | `TIMESTAMPTZ` | Yes | - | Token expiration |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Account link timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Indexes:**
- `accounts_provider_provider_account_id_unique` (UNIQUE on `provider`, `provider_account_id`)

**Constraints:**
- `accounts_user_id_users_id_fk`: FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE

**Encryption:** `access_token` and `refresh_token` are encrypted using AES-256-GCM before storage.

---

### Calendar Schema

#### `calendar.events`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID for multi-tenancy |
| `user_id` | `UUID` | No | - | Event owner |
| `title` | `TEXT` | Yes | - | Event title (plaintext metadata) |
| `start_at` | `TIMESTAMPTZ` | No | - | Event start time |
| `end_at` | `TIMESTAMPTZ` | No | - | Event end time |
| `encrypted_blob` | `BYTEA` | Yes | - | Encrypted event details (description, location, attendees) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Indexes:**
- `events_tenant_time_idx` (tenant_id, created_at)
- `events_user_time_idx` (user_id, start_at)

**Constraints:**
- `events_tenant_isolation_policy`: RLS policy using `tenant_id = current_setting('app.current_tenant_id')::UUID`

**Encryption:** `encrypted_blob` contains AES-256-GCM encrypted event details. `title`, `start_at`, `end_at` are plaintext for searchability and calendar rendering.

---

### Drive Schema

#### `drive.files`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID for multi-tenancy |
| `user_id` | `UUID` | No | - | File owner |
| `parent_id` | `UUID` | Yes | - | Parent folder ID (NULL for root) |
| `name` | `TEXT` | No | - | File name (plaintext metadata) |
| `size` | `BIGINT` | No | 0 | File size in bytes |
| `mime_type` | `TEXT` | Yes | - | MIME type |
| `r2_key` | `TEXT` | No | - | R2 object key |
| `encrypted_blob` | `BYTEA` | Yes | - | Encrypted file metadata (thumbnail, tags) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Indexes:**
- `files_tenant_idx` (tenant_id)
- `files_parent_idx` (parent_id)
- `files_user_idx` (user_id)

**Constraints:**
- `files_tenant_isolation_policy`: RLS policy using `tenant_id = current_setting('app.current_tenant_id')::UUID`
- `files_parent_fk`: FOREIGN KEY(parent_id) REFERENCES drive.files(id) ON DELETE CASCADE

**Encryption:** `encrypted_blob` contains AES-256-GCM encrypted file metadata. File content is encrypted client-side before upload to R2.

---

### Tasks Schema

#### `tasks.tasks`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID for multi-tenancy |
| `user_id` | `UUID` | No | - | Task owner |
| `project_id` | `UUID` | Yes | - | Project ID (for hierarchical tasks) |
| `title` | `TEXT` | No | - | Task title (plaintext metadata) |
| `completed` | `BOOLEAN` | No | `false` | Completion status |
| `archived` | `BOOLEAN` | No | `false` | Archive status |
| `encrypted_blob` | `BYTEA` | Yes | - | Encrypted task details (description, subtasks) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Indexes:**
- `tasks_tenant_idx` (tenant_id)
- `tasks_user_idx` (user_id)
- `tasks_project_idx` (project_id)

**Constraints:**
- `tasks_tenant_isolation_policy`: RLS policy using `tenant_id = current_setting('app.current_tenant_id')::UUID`

**Encryption:** `encrypted_blob` contains AES-256-GCM encrypted task details.

---

### App Schema (Cross-Domain)

#### `app.audit_logs`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `user_id` | `UUID` | Yes | - | User ID (NULL for system actions) |
| `action` | `TEXT` | No | - | Action type (login, data_read, data_write, etc.) |
| `resource_type` | `TEXT` | No | - | Resource type (event, file, task, etc.) |
| `resource_id` | `UUID` | Yes | - | Resource ID |
| `ip_hash` | `TEXT` | Yes | - | Hashed IP address |
| `user_agent_hash` | `TEXT` | Yes | - | Hashed user agent |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Event timestamp |
| `retention_until` | `TIMESTAMPTZ` | No | - | GDPR retention deadline |

**Indexes:**
- `audit_logs_tenant_idx` (tenant_id)
- `audit_logs_user_idx` (user_id)
- `audit_logs_action_idx` (action)
- `audit_logs_retention_idx` (retention_until)

**Constraints:**
- **Append-only**: PostgreSQL trigger blocks UPDATE and DELETE operations
- **GDPR pseudonymization**: Automated job replaces `user_id` with HMAC hash after retention window

**Encryption:** `ip_hash` and `user_agent_hash` are SHA-256 hashes. No plaintext PII stored.

#### `app.honeytokens`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID (or NULL for global) |
| `token_type` | `TEXT` | No | - | Token type (api_key, email, etc.) |
| `token_value` | `TEXT` | No | - | Fake token value |
| `alert_triggered` | `BOOLEAN` | No | `false` | Whether alert was triggered |
| `triggered_at` | `TIMESTAMPTZ` | Yes | - | When alert was triggered |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

**Indexes:**
- `honeytokens_tenant_idx` (tenant_id)
- `honeytokens_value_idx` (token_value)

**Purpose:** Fake credentials that trigger alerts when accessed, indicating a breach.

---

### Drizzle Schema (Migration Tracking)

#### `drizzle.migrations_<domain>`

Each domain has its own migration tracking table:

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `SERIAL` | No | - | Auto-incrementing ID |
| `hash` | `TEXT` | No | - | Migration file checksum |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Migration application timestamp |

**Tables:**
- `drizzle.migrations_calendar`
- `drizzle.migrations_drive`
- `drizzle.migrations_tasks`
- `drizzle.migrations_vault`
- `drizzle.migrations_mail`
- `drizzle.migrations_auth`

**Purpose:** Track which migrations have been applied per domain. Each domain's migration runner uses its own table to avoid conflicts.

---

## Planned Schema (Not Yet Implemented)

### Vault Schema

#### `vault.credentials`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `user_id` | `UUID` | No | - | Credential owner |
| `name` | `TEXT` | No | - | Credential name (plaintext) |
| `encrypted_blob` | `BYTEA` | No | - | Encrypted credential (username, password, TOTP seed) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | Last update timestamp |

**Encryption:** All credential data encrypted with user's master key.

#### `vault.recovery_keys`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | No | - | User ID |
| `encrypted_shard` | `BYTEA` | No | - | Encrypted key shard |
| `shard_index` | `INTEGER` | No | - | Shard index (for Shamir's Secret Sharing) |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

**Purpose:** Key escrow for disaster recovery. Encrypted shards can be recombined to recover master key.

---

### Mail Schema

#### `mail.mailboxes`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `user_id` | `UUID` | No | - | Mailbox owner |
| `email_address` | `TEXT` | No | - | Email address |
| `encrypted_blob` | `BYTEA` | Yes | - | Encrypted mailbox settings |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

#### `mail.messages`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `mailbox_id` | `UUID` | No | - | Parent mailbox |
| `message_id_header` | `TEXT` | No | - | RFC 5322 Message-ID header |
| `subject` | `TEXT` | Yes | - | Subject (plaintext for search) |
| `from_address` | `TEXT` | No | - | From address |
| `to_addresses` | `TEXT[]` | No | - | To addresses (array) |
| `encrypted_blob` | `BYTEA` | No | - | Encrypted message body and headers |
| `received_at` | `TIMESTAMPTZ` | No | `NOW()` | Receipt timestamp |

**Encryption:** Message body and sensitive headers encrypted. Subject and addresses plaintext for search and display.

---

### Search Schema

#### `search.blind_indexes`

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `tenant_id` | `UUID` | No | - | Tenant ID |
| `resource_type` | `TEXT` | No | - | Resource type (event, file, message) |
| `resource_id` | `UUID` | No | - | Resource ID |
| `field_name` | `TEXT` | No | - | Field being indexed (title, subject, etc.) |
| `hmac_token` | `TEXT` | No | - | HMAC-SHA256 token for search |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | Creation timestamp |

**Purpose:** Enables exact-match search over encrypted data using blind indexing. See `docs/03-data/16-search-over-encrypted-data.md`.

---

## Encryption Strategy

### Columns Storing Ciphertext

The following columns store AES-256-GCM encrypted data:

- `calendar.events.encrypted_blob`
- `drive.files.encrypted_blob`
- `tasks.tasks.encrypted_blob`
- `vault.credentials.encrypted_blob`
- `vault.recovery_keys.encrypted_shard`
- `mail.mailboxes.encrypted_blob`
- `mail.messages.encrypted_blob`

### Columns Storing Plaintext Metadata

The following columns store plaintext for searchability and UI rendering:

- `calendar.events.title`, `start_at`, `end_at`
- `drive.files.name`, `size`, `mime_type`
- `tasks.tasks.title`, `completed`, `archived`
- `vault.credentials.name`
- `mail.messages.subject`, `from_address`, `to_addresses`

### Encryption Key Hierarchy

1. **User master key**: Derived from user password using PBKDF2 (600,000 iterations)
2. **Domain keys**: Per-domain keys derived from master key using HKDF
3. **Resource keys**: Per-resource keys derived from domain key using HKDF

All encryption/decryption happens client-side using `@suite/crypto`. The server never sees plaintext.

---

## Row-Level Security (RLS) Policies

Every tenant-scoped table enforces isolation via RLS:

```sql
-- Standard RLS policy template
CREATE POLICY <table>_tenant_isolation ON <schema>.<table>
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

ALTER TABLE <schema>.<table> FORCE ROW LEVEL SECURITY;
```

**Tables with RLS:**
- `calendar.events`
- `drive.files`
- `tasks.tasks`
- `vault.credentials`
- `mail.mailboxes`
- `mail.messages`
- `search.blind_indexes`

**Tables without RLS:**
- `app.audit_logs` (tenant-scoped but queried by auditors)
- `app.honeytokens` (global and tenant-scoped)
- `drizzle.migrations_*` (system tables)

---

## Foreign Key Relationships

```
users (1) ----< (N) sessions
users (1) ----< (N) accounts
users (1) ----< (N) calendar.events
users (1) ----< (N) drive.files
users (1) ----< (N) tasks.tasks
users (1) ----< (N) vault.credentials
users (1) ----< (N) mail.mailboxes

drive.files (1) ----< (N) drive.files (self-referential for folders)
mail.mailboxes (1) ----< (N) mail.messages
```

---

## Migration Checklist

When adding a new table:

1. **Choose the correct schema** (calendar, drive, vault, mail, auth, app, search)
2. **Add `tenant_id` column** (unless it's a cross-domain table in `app` schema)
3. **Add `user_id` column** if the table is user-scoped
4. **Add `created_at` and `updated_at`** as `TIMESTAMPTZ` with `NOW()` default
5. **Add composite index** on `(tenant_id, created_at)` for RLS performance
6. **Create RLS policy** using `current_setting('app.current_tenant_id')`
7. **Use `FORCE ROW LEVEL SECURITY`** to prevent bypass
8. **Add `encrypted_blob` column** for any sensitive data
9. **Document encryption strategy** in this file
10. **Update this file** with the new table definition

---

## Schema Version

**Current Version:** v0.1 (June 2026)

**Last Migration:** `0001_harsh_king_cobra.sql` (added users, sessions, accounts)

**Next Migration:** Migrate auth tables from `public` to `auth` schema.

---

*This document must be updated whenever a migration is applied. AI agents must read this file before creating new tables.*
