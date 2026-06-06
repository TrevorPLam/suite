# TODO — Suite Monorepo Implementation Roadmap

This document tracks the implementation roadmap for the Suite monorepo. Tasks are organized by priority and dependency order.

## Legend

- [ ] Not started
- [x] Complete
- [~] In progress

## Task Structure

Each parent task includes:
- Status checkbox
- Unique task ID
- Related file paths
- Definition of done
- Out of scope
- Rules to follow
- Advanced coding pattern
- Anti-patterns
- Imports/exports
- Depends on/blocks

Each subtask includes:
- Unique task ID (parent.child)
- Targeted file path
- Complete action description
- Validation commands

---

## Phase 1: Shared Infrastructure Packages

### [x] DB-01: Implement PostgreSQL integration with Drizzle ORM

**Status**: Complete
**Related Files**: packages/db/src/index.ts, packages/db/package.json, packages/db/drizzle.config.ts

**Definition of Done**:
- Drizzle ORM installed and configured for PostgreSQL
- Schema definitions for calendar_events, tasks, drive_files tables
- Database connection pool configured
- Migration system working (drizzle-kit)
- Repository implementations using Drizzle
- All existing domain tests pass with real database
- Type-safe queries working across all domain packages

**Out of Scope**:
- Multi-tenancy isolation
- Database replication/sharding
- Complex query optimization
- Custom database drivers

**Rules to Follow**:
- Use Drizzle ORM SQL-like API (not relational query builder for now)
- Keep schema definitions in packages/db/src/schema
- Use environment variables for database connection
- Never hardcode connection strings
- Follow domain package boundaries (db package has no domain logic)

**Advanced Coding Pattern**:
```typescript
// Repository pattern with Drizzle
export class PostgresRepository<T> implements Repository<T> {
  constructor(private db: DrizzleDB, private table: Table) {}
  
  async findById(id: string): Promise<T | null> {
    const results = await this.db.select().from(this.table).where(eq(this.table.id, id)).limit(1);
    return results[0] || null;
  }
}
```

**Anti-Patterns**:
- Do NOT use raw SQL strings (use Drizzle query builder)
- Do NOT put domain logic in repository implementations
- Do NOT use ORM features that abstract SQL too heavily
- Do NOT create one giant schema file (split by domain)

**Imports/Exports**:
```typescript
// Exports
export { drizzle } from 'drizzle-orm/postgres-js'
export { pgTable, serial, varchar, timestamp, text, integer, boolean } from 'drizzle-orm/pg-core'
export type { DrizzleDB } from './types'
export * from './schema'
export * from './migrations'
```

**Depends On**: None  
**Blocks**: DB-02, AUTH-01, all domain package database integration

**Subtasks**:

#### DB-01.1: Install Drizzle ORM and PostgreSQL driver
**Target**: packages/db/package.json
**Action**: Add drizzle-orm, postgres, drizzle-kit to dependencies. Add drizzle-kit to devDependencies.
**Validate**: `pnpm --filter @suite/db install`

#### DB-01.2: Create Drizzle configuration
**Target**: packages/db/drizzle.config.ts
**Action**: Create drizzle.config.ts with PostgreSQL dialect, schema path, and database URL from environment.
**Validate**: `pnpm --filter @suite/db drizzle-kit generate`

#### DB-01.3: Define database schema for calendar_events
**Target**: packages/db/src/schema/calendar.ts
**Action**: Create pgTable for calendar_events with id, title, startAt, endAt columns matching domain types.
**Validate**: `pnpm --filter @suite/db typecheck`

#### DB-01.4: Define database schema for tasks
**Target**: packages/db/src/schema/tasks.ts
**Action**: Create pgTable for tasks with id, title, completed, archived columns matching domain types.
**Validate**: `pnpm --filter @suite/db typecheck`

#### DB-01.5: Define database schema for drive_files
**Target**: packages/db/src/schema/drive.ts
**Action**: Create pgTable for drive_files with id, name, size columns matching domain types.
**Validate**: `pnpm --filter @suite/db typecheck`

#### DB-01.6: Create database connection factory
**Target**: packages/db/src/connection.ts
**Action**: Create function to initialize PostgreSQL connection pool using environment variables.
**Validate**: `pnpm --filter @suite/db typecheck`

#### DB-01.7: Implement CalendarEventRepository
**Target**: packages/db/src/repositories/calendar.ts
**Action**: Implement Repository interface for calendar events using Drizzle queries.
**Validate**: `pnpm --filter @suite/db test`

#### DB-01.8: Implement TaskRepository
**Target**: packages/db/src/repositories/tasks.ts
**Action**: Implement Repository interface for tasks using Drizzle queries.
**Validate**: `pnpm --filter @suite/db test`

#### DB-01.9: Implement DriveFileRepository
**Target**: packages/db/src/repositories/drive.ts
**Action**: Implement Repository interface for drive files using Drizzle queries.
**Validate**: `pnpm --filter @suite/db test`

#### DB-01.10: Generate and run initial migration
**Target**: packages/db/drizzle/
**Action**: Run drizzle-kit generate to create migration, then apply to database.
**Validate**: `pnpm --filter @suite/db drizzle-kit migrate`

---

### [x] ENV-01: Implement environment configuration with Zod validation

**Status**: Complete  
**Related Files**: packages/env-config/src/index.ts, packages/env-config/package.json

**Definition of Done**:
- Zod installed as dependency
- Environment schemas for all apps (calendar, tasks, drive)
- validateEnv function that throws on invalid configuration
- Type-safe environment objects exported
- All apps can import and validate their environment
- CI fails if environment variables are missing

**Out of Scope**:
- Environment variable encryption
- Dynamic environment reloading
- Remote configuration management
- Secret management integration

**Rules to Follow**:
- Use Zod for schema validation
- Validate environment at application startup
- Provide clear error messages for missing/invalid variables
- Keep environment schemas in separate files per app
- Never use process.env directly (use validated env object)

**Advanced Coding Pattern**:
```typescript
// Environment validation with Zod
const calendarEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export function validateCalendarEnv() {
  return calendarEnvSchema.parse(process.env);
}
```

**Anti-Patterns**:
- Do NOT use process.env without validation
- Do NOT ignore validation errors
- Do NOT use optional chaining on required env vars
- Do NOT hardcode default values for production secrets

**Imports/Exports**:
```typescript
// Exports
export { z } from 'zod'
export { validateCalendarEnv } from './calendar'
export { validateTasksEnv } from './tasks'
export { validateDriveEnv } from './drive'
export type { CalendarEnv, TasksEnv, DriveEnv } from './types'
```

**Depends On**: None  
**Blocks**: DB-01, AUTH-01, all app API configurations

**Subtasks**:

#### ✅ ENV-01.1: Install Zod dependency
**Target**: packages/env-config/package.json
**Action**: Add zod to dependencies.
**Validate**: `pnpm --filter @suite/env-config install`

#### ✅ ENV-01.2: Create calendar environment schema
**Target**: packages/env-config/src/calendar.ts
**Action**: Define Zod schema for calendar app (DATABASE_URL, PORT, NODE_ENV).
**Validate**: `pnpm --filter @suite/env-config typecheck`

#### ✅ ENV-01.3: Create tasks environment schema
**Target**: packages/env-config/src/tasks.ts
**Action**: Define Zod schema for tasks app (DATABASE_URL, PORT, NODE_ENV).
**Validate**: `pnpm --filter @suite/env-config typecheck`

#### ✅ ENV-01.4: Create drive environment schema
**Target**: packages/env-config/src/drive.ts
**Action**: Define Zod schema for drive app (DATABASE_URL, PORT, NODE_ENV).
**Validate**: `pnpm --filter @suite/env-config typecheck`

#### ✅ ENV-01.5: Implement validateEnv function
**Target**: packages/env-config/src/index.ts
**Action**: Create generic validateEnv function that takes schema and returns typed env object.
**Validate**: `pnpm --filter @suite/env-config typecheck`

#### ✅ ENV-01.6: Add tests for environment validation
**Target**: packages/env-config/src/index.test.ts
**Action**: Test valid and invalid environment configurations, error messages.
**Validate**: `pnpm --filter @suite/env-config test`

**Implementation Notes**:
- Zod was already installed (v3.24.0)
- Added @types/node for process.env TypeScript support
- Created separate schema files for each app (calendar.ts, tasks.ts, drive.ts)
- Each schema includes DATABASE_URL (URL validation), PORT (number validation 1-65535), NODE_ENV (enum)
- Exported validation functions and types from index.ts
- Added vitest configuration for the package
- All 8 tests passing covering valid configs, missing vars, invalid formats, and out-of-range values

---

### [x] CRYPTO-01: Implement E2EE crypto utilities with Web Crypto API

**Status**: Complete
**Related Files**: packages/crypto/src/index.ts, packages/crypto/package.json

**Definition of Done**:
- AES-256-GCM encryption/decryption functions
- ECDH key pair generation for key exchange
- Key derivation from passwords (PBKDF2)
- Secure random IV generation (96-bit)
- Key serialization/deserialization
- All functions work in both browser and Node.js
- Comprehensive test coverage for crypto operations

**Out of Scope**:
- Hardware security module integration
- Key escrow/recovery mechanisms
- Post-quantum cryptography
- Custom cryptographic algorithms

**Rules to Follow**:
- Use Web Crypto API (subtle.crypto) - available in modern Node.js and browsers
- Never reuse IV with the same key
- Use 96-bit IV for AES-GCM (recommended)
- Derive keys using PBKDF2 with sufficient iterations (100,000+)
- Never store plaintext keys in memory longer than necessary
- Zeroize sensitive data after use

**Advanced Coding Pattern**:
```typescript
// AES-256-GCM encryption with unique IV
export async function encryptItem(data: string, key: CryptoKey): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(data)
  );
  return { ciphertext: encrypted, iv };
}
```

**Anti-Patterns**:
- Do NOT implement custom crypto algorithms
- Do NOT reuse IV with the same key
- Do NOT use weak key derivation (low iteration counts)
- Do NOT store keys in localStorage or sessionStorage
- Do NOT use deprecated crypto APIs

**Imports/Exports**:
```typescript
// Exports
export { generateKeyPair } from './keypair'
export { deriveSharedSecret } from './ecdh'
export { encryptItem, decryptItem } from './encryption'
export { deriveKeyFromPassword } from './keyderivation'
export { serializeKey, deserializeKey } from './serialization'
```

**Depends On**: None  
**Blocks**: AUTH-01, future E2EE features

**Subtasks**:

#### ✅ CRYPTO-01.1: Install TypeScript Node types for Web Crypto
**Target**: packages/crypto/package.json
**Action**: Add @types/node to devDependencies for Web Crypto API types.
**Validate**: `pnpm --filter @suite/crypto install`

#### ✅ CRYPTO-01.2: Implement AES-256-GCM encryption
**Target**: packages/crypto/src/encryption.ts
**Action**: Create encryptItem and decryptItem functions using AES-GCM with unique IV per operation.
**Validate**: `pnpm --filter @suite/crypto test`

#### ✅ CRYPTO-01.3: Implement ECDH key pair generation
**Target**: packages/crypto/src/keypair.ts
**Action**: Create generateKeyPair function using X25519 curve for key exchange.
**Validate**: `pnpm --filter @suite/crypto test`

#### ✅ CRYPTO-01.4: Implement ECDH shared secret derivation
**Target**: packages/crypto/src/ecdh.ts
**Action**: Create deriveSharedSecret function using ECDH with X25519.
**Validate**: `pnpm --filter @suite/crypto test`

#### ✅ CRYPTO-01.5: Implement PBKDF2 key derivation
**Target**: packages/crypto/src/keyderivation.ts
**Action**: Create deriveKeyFromPassword function using PBKDF2 with 100,000+ iterations.
**Validate**: `pnpm --filter @suite/crypto test`

#### ✅ CRYPTO-01.6: Implement key serialization/deserialization
**Target**: packages/crypto/src/serialization.ts
**Action**: Create functions to serialize/deserialize CryptoKey objects to/from JWK format.
**Validate**: `pnpm --filter @suite/crypto test`

#### ✅ CRYPTO-01.7: Add comprehensive crypto tests
**Target**: packages/crypto/src/index.test.ts
**Action**: Test all crypto operations with known vectors, edge cases, and error handling.
**Validate**: `pnpm --filter @suite/crypto test`

**Implementation Notes**:
- Added @types/node and vitest to devDependencies
- Implemented AES-256-GCM encryption with 96-bit IV (12 bytes) per operation
- Implemented X25519 ECDH key pair generation for secure key exchange
- Implemented PBKDF2 key derivation with 310,000 iterations (updated 2025+ best practice)
- Implemented JWK and raw format key serialization/deserialization
- Added HKDF for deriving AES keys from ECDH shared secrets
- All 26 tests passing covering encryption, key pairs, ECDH, PBKDF2, serialization, and E2E flows
- Uses Web Crypto API (subtle.crypto) available in both Node.js and browsers
- ES module imports with .js extensions for node16/nodenext compatibility

---

### [ ] AUTH-01: Implement authentication with Better Auth

**Status**: Not started  
**Related Files**: packages/auth/src/index.ts, packages/auth/src/server.ts, packages/auth/package.json

**Definition of Done**:
- Better Auth installed and configured
- Email/password authentication working
- Session management with HTTP-only cookies
- Hono integration middleware
- User context available in API routes
- Protected route middleware
- Auth client for web apps
- All auth tests passing

**Out of Scope**:
- Social login providers (OAuth)
- Multi-factor authentication
- Passwordless authentication
- SAML/OIDC integration
- Advanced session management

**Rules to Follow**:
- Use Better Auth framework
- Mount auth handler at /api/auth/* in Hono
- Use HTTP-only cookies for session storage
- Implement CORS middleware for auth endpoints
- Add user/session context to Hono variables
- Never store passwords in plaintext
- Use bcrypt or argon2 for password hashing

**Advanced Coding Pattern**:
```typescript
// Hono middleware for auth context
app.use('*', async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    c.set('user', null);
    c.set('session', null);
    await next();
    return;
  }
  c.set('user', session.user);
  c.set('session', session.session);
  await next();
});
```

**Anti-Patterns**:
- Do NOT implement custom auth logic (use Better Auth)
- Do NOT store session IDs in localStorage
- Do NOT send passwords in query parameters
- Do NOT use weak password hashing algorithms
- Do NOT implement auth in domain packages

**Imports/Exports**:
```typescript
// Exports
export { auth } from './server'
export { authClient } from './client'
export { requireAuth } from './middleware'
export type { Session, User } from './types'
```

**Depends On**: DB-01, ENV-01  
**Blocks**: All API route protection, web app authentication

**Subtasks**:

#### AUTH-01.1: Install Better Auth and dependencies
**Target**: packages/auth/package.json
**Action**: Add better-auth, @auth/core to dependencies. Add bcrypt for password hashing.
**Validate**: `pnpm --filter @suite/auth install`

#### AUTH-01.2: Create Better Auth server configuration
**Target**: packages/auth/src/server.ts
**Action**: Configure Better Auth with email/password provider, database adapter, and session settings.
**Validate**: `pnpm --filter @suite/auth typecheck`

#### AUTH-01.3: Create user schema in database
**Target**: packages/db/src/schema/users.ts
**Action**: Add users table with id, email, passwordHash columns. Update drizzle config.
**Validate**: `pnpm --filter @suite/db drizzle-kit generate`

#### AUTH-01.4: Implement Hono auth middleware
**Target**: packages/auth/src/middleware.ts
**Action**: Create middleware to add user/session context to Hono variables.
**Validate**: `pnpm --filter @suite/auth test`

#### AUTH-01.5: Create protected route middleware
**Target**: packages/auth/src/protected.ts
**Action**: Create requireAuth middleware that returns 401 if no session.
**Validate**: `pnpm --filter @suite/auth test`

#### AUTH-01.6: Create auth client for web apps
**Target**: packages/auth/src/client.ts
**Action**: Create Better Auth client instance for use in React apps.
**Validate**: `pnpm --filter @suite/auth typecheck`

#### AUTH-01.7: Add auth tests
**Target**: packages/auth/src/index.test.ts
**Action**: Test registration, login, session management, protected routes.
**Validate**: `pnpm --filter @suite/auth test`

---

### [ ] UI-01: Expand shared UI component library

**Status**: Not started  
**Related Files**: packages/ui/src/components/, packages/ui/package.json

**Definition of Done**:
- Input component with validation states
- Dialog component for modals
- Card component for content containers
- Badge component for status indicators
- Select component for dropdowns
- Textarea component for multi-line input
- All components follow shadcn/ui patterns
- Proper TypeScript types and accessibility
- Component tests for each component

**Out of Scope**:
- Complex data tables
- Form validation library integration
- Advanced charts/visualizations
- Animation libraries
- Icon library integration

**Rules to Follow**:
- Follow shadcn/ui component patterns
- Use Radix UI primitives where applicable
- Ensure all components are accessible (ARIA attributes)
- Use forwardRef for component composition
- Support variant prop for styling variations
- Keep components unstyled (use Tailwind classes)

**Advanced Coding Pattern**:
```typescript
// Component with forwardRef and variants
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
```

**Anti-Patterns**:
- Do NOT create complex components that mix concerns
- Do NOT hardcode styles (use Tailwind classes)
- Do NOT ignore accessibility (ARIA labels, keyboard navigation)
- Do NOT create components that require specific parent components
- Do NOT use inline styles

**Imports/Exports**:
```typescript
// Exports
export { Button } from './components/ui/button'
export { Input } from './components/ui/input'
export { Dialog } from './components/ui/dialog'
export { Card } from './components/ui/card'
export { Badge } from './components/ui/badge'
export { Select } from './components/ui/select'
export { Textarea } from './components/ui/textarea'
```

**Depends On**: None  
**Blocks**: UI improvements in all web apps

**Subtasks**:

#### UI-01.1: Install Radix UI dependencies
**Target**: packages/ui/package.json
**Action**: Add @radix-ui/react-dialog, @radix-ui/react-select, and other required primitives.
**Validate**: `pnpm --filter @suite/ui install`

#### UI-01.2: Create Input component
**Target**: packages/ui/src/components/ui/input.tsx
**Action**: Create Input component with variants (default, error, success) and proper accessibility.
**Validate**: `pnpm --filter @suite/ui test`

#### UI-01.3: Create Dialog component
**Target**: packages/ui/src/components/ui/dialog.tsx
**Action**: Create Dialog component using Radix UI primitive with portal and overlay.
**Validate**: `pnpm --filter @suite/ui test`

#### UI-01.4: Create Card component
**Target**: packages/ui/src/components/ui/card.tsx
**Action**: Create Card component with header, content, and footer subcomponents.
**Validate**: `pnpm --filter @suite/ui test`

#### UI-01.5: Create Badge component
**Target**: packages/ui/src/components/ui/badge.tsx
**Action**: Create Badge component with variant prop (default, success, error, warning).
**Validate**: `pnpm --filter @suite/ui test`

#### UI-01.6: Create Select component
**Target**: packages/ui/src/components/ui/select.tsx
**Action**: Create Select component using Radix UI primitive with keyboard navigation.
**Validate**: `pnpm --filter @suite/ui test`

#### UI-01.7: Create Textarea component
**Target**: packages/ui/src/components/ui/textarea.tsx
**Action**: Create Textarea component with resize prop and validation states.
**Validate**: `pnpm --filter @suite/ui test`

#### UI-01.8: Add component tests
**Target**: packages/ui/src/components/ui/*.test.tsx
**Action**: Add tests for each component covering rendering, accessibility, and user interactions.
**Validate**: `pnpm --filter @suite/ui test`

---

## Phase 2: Domain Package Database Integration

### [ ] DOM-01: Integrate database into calendar domain package

**Status**: Not started  
**Related Files**: packages/domain-calendar/src/lib/calendar-events.ts, packages/domain-calendar/src/index.ts

**Definition of Done**:
- Calendar events stored in PostgreSQL via Drizzle
- Repository pattern implemented
- All existing domain tests pass with database
- Conflict detection works with database queries
- Reset function clears database state
- Performance acceptable for typical workloads

**Out of Scope**:
- Complex query optimization
- Database indexing strategy
- Multi-user conflict resolution
- Event recurrence patterns

**Rules to Follow**:
- Use PostgresCalendarEventRepository from packages/db
- Keep domain logic pure (no database-specific code in domain)
- Maintain existing domain API (create, list, get, update)
- Add database-specific reset function for tests
- Use transactions for multi-step operations

**Advanced Coding Pattern**:
```typescript
// Domain package with repository injection
export function createCalendarEventRepository(repository: CalendarEventRepository) {
  return {
    create: (input: CreateCalendarEventInput) => repository.create(input),
    list: () => repository.findAll(),
    get: (id: string) => repository.findById(id),
    update: (id: string, input: UpdateCalendarEventInput) => repository.update(id, input),
  };
}
```

**Anti-Patterns**:
- Do NOT import Drizzle directly in domain package
- Do NOT put SQL queries in domain logic
- Do NOT change domain API for database integration
- Do NOT use database-specific error types in domain

**Imports/Exports**:
```typescript
// Exports (unchanged)
export { createCalendarEvent, listCalendarEvents, getCalendarEvent, updateCalendarEvent, resetCalendarEvents }
export type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput, CalendarEventError }
```

**Depends On**: DB-01  
**Blocks**: CAL-02

**Subtasks**:

#### DOM-01.1: Update calendar domain to use repository
**Target**: packages/domain-calendar/src/lib/calendar-events.ts
**Action**: Refactor to accept repository injection instead of in-memory Map.
**Validate**: `pnpm --filter @suite/domain-calendar test`

#### DOM-01.2: Create database-specific reset function
**Target**: packages/domain-calendar/src/lib/calendar-events.ts
**Action**: Add resetCalendarEventsDB function that truncates database table.
**Validate**: `pnpm --filter @suite/domain-calendar test`

#### DOM-01.3: Update domain tests for database
**Target**: packages/domain-calendar/src/lib/calendar-events.test.ts
**Action**: Update tests to use database repository and reset function.
**Validate**: `pnpm --filter @suite/domain-calendar test`

#### DOM-01.4: Add conflict detection with database queries
**Target**: packages/domain-calendar/src/lib/calendar-events.ts
**Action**: Implement conflict detection using database range queries.
**Validate**: `pnpm --filter @suite/domain-calendar test`

---

### [ ] DOM-02: Integrate database into tasks domain package

**Status**: Not started  
**Related Files**: packages/domain-tasks/src/lib/tasks.ts, packages/domain-tasks/src/index.ts

**Definition of Done**:
- Tasks stored in PostgreSQL via Drizzle
- Repository pattern implemented
- All existing domain tests pass with database
- Reset function clears database state
- Filter operations work with database queries

**Out of Scope**:
- Complex query optimization
- Task dependencies/relationships
- Bulk operations

**Rules to Follow**:
- Use PostgresTaskRepository from packages/db
- Keep domain logic pure
- Maintain existing domain API
- Add database-specific reset function

**Advanced Coding Pattern**:
```typescript
// Filter with database queries
export function filterTasks(filter: TaskFilter, repository: TaskRepository): TaskItem[] {
  switch (filter) {
    case 'active':
      return repository.findWhere({ completed: false, archived: false });
    case 'completed':
      return repository.findWhere({ completed: true, archived: false });
    case 'archived':
      return repository.findWhere({ archived: true });
    default:
      return repository.findWhere({ archived: false });
  }
}
```

**Anti-Patterns**:
- Do NOT import Drizzle directly in domain package
- Do NOT put SQL queries in domain logic
- Do NOT change domain API

**Imports/Exports**:
```typescript
// Exports (unchanged)
export { createTask, listTasks, getTask, updateTask, updateTaskCompletion, archiveTask, deleteTask, filterTasks, resetTasks }
export type { TaskItem, CreateTaskInput, UpdateTaskInput, TaskError }
```

**Depends On**: DB-01  
**Blocks**: TASK-02

**Subtasks**:

#### DOM-02.1: Update tasks domain to use repository
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Refactor to accept repository injection instead of in-memory Map.
**Validate**: `pnpm --filter @suite/domain-tasks test`

#### DOM-02.2: Create database-specific reset function
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Add resetTasksDB function that truncates database table.
**Validate**: `pnpm --filter @suite/domain-tasks test`

#### DOM-02.3: Update domain tests for database
**Target**: packages/domain-tasks/src/lib/tasks.test.ts
**Action**: Update tests to use database repository and reset function.
**Validate**: `pnpm --filter @suite/domain-tasks test`

---

### [ ] DOM-03: Integrate database into drive domain package

**Status**: Not started  
**Related Files**: packages/domain-drive/src/index.ts

**Definition of Done**:
- Drive files stored in PostgreSQL via Drizzle
- Repository pattern implemented
- All existing domain tests pass with database
- Reset function clears database state
- File size validation enforced at database level

**Out of Scope**:
- File content storage (BLOB vs external storage)
- File versioning
- Folder hierarchy

**Rules to Follow**:
- Use PostgresDriveFileRepository from packages/db
- Keep domain logic pure
- Maintain existing domain API
- Add database-specific reset function

**Advanced Coding Pattern**:
```typescript
// Domain with repository injection
export function createDriveRepository(repository: DriveFileRepository) {
  return {
    upload: (input: UploadDriveFileInput) => repository.create(input),
    list: () => repository.findAll(),
    get: (id: string) => repository.findById(id),
    rename: (input: RenameDriveFileInput) => repository.update(input.id, { name: input.name }),
    delete: (id: string) => repository.delete(id),
  };
}
```

**Anti-Patterns**:
- Do NOT import Drizzle directly in domain package
- Do NOT put SQL queries in domain logic
- Do NOT change domain API

**Imports/Exports**:
```typescript
// Exports (unchanged)
export { uploadDriveFile, listDriveFiles, getDriveFile, renameDriveFile, deleteDriveFile, resetDriveFiles }
export type { DriveFile, UploadDriveFileInput, RenameDriveFileInput, DriveError }
```

**Depends On**: DB-01  
**Blocks**: DRV-02

**Subtasks**:

#### DOM-03.1: Update drive domain to use repository
**Target**: packages/domain-drive/src/index.ts
**Action**: Refactor to accept repository injection instead of in-memory array.
**Validate**: `pnpm --filter @suite/domain-drive test`

#### DOM-03.2: Create database-specific reset function
**Target**: packages/domain-drive/src/index.ts
**Action**: Add resetDriveFilesDB function that truncates database table.
**Validate**: `pnpm --filter @suite/domain-drive test`

#### DOM-03.3: Update domain tests for database
**Target**: packages/domain-drive/src/index.test.ts
**Action**: Update tests to use database repository and reset function.
**Validate**: `pnpm --filter @suite/domain-drive test`

---

## Phase 3: Tasks App Production Readiness

### [ ] TASK-01: Add missing features to tasks domain

**Status**: Not started  
**Related Files**: packages/domain-tasks/src/lib/tasks.ts, apps/tasks/specs/

**Definition of Done**:
- Task due dates implemented
- Task priorities implemented
- Task tags/categories implemented
- Task search functionality
- Batch operations (complete all, archive all)
- Domain tests for all new features
- Feature specs written for new features

**Out of Scope**:
- Task dependencies
- Recurring tasks
- Task templates
- Task assignments

**Rules to Follow**:
- Add new fields to TaskItem type
- Update validation for new fields
- Maintain backward compatibility
- Write specs before implementation
- Keep domain logic pure

**Advanced Coding Pattern**:
```typescript
// Task with extended fields
export type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  dueDate?: string; // ISO timestamp
  priority: 'low' | 'medium' | 'high';
  tags: string[];
};
```

**Anti-Patterns**:
- Do NOT add complex business rules without tests
- Do NOT break existing API
- Do NOT add UI-specific fields to domain

**Imports/Exports**:
```typescript
// Exports
export { createTask, listTasks, getTask, updateTask, updateTaskCompletion, archiveTask, deleteTask, filterTasks, searchTasks, batchComplete, batchArchive, resetTasks }
export type { TaskItem, CreateTaskInput, UpdateTaskInput, TaskPriority, TaskFilter, TaskError }
```

**Depends On**: DOM-02  
**Blocks**: TASK-02

**Subtasks**:

#### TASK-01.1: Write spec for task due dates
**Target**: apps/tasks/specs/task-due-dates.spec.md
**Action**: Write spec describing due date validation, filtering, and sorting behavior.
**Validate**: Manual review

#### TASK-01.2: Implement task due dates
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Add dueDate field to TaskItem, add validation, update create/update functions.
**Validate**: `pnpm --filter @suite/domain-tasks test`

#### TASK-01.3: Write spec for task priorities
**Target**: apps/tasks/specs/task-priorities.spec.md
**Action**: Write spec describing priority levels, default priority, and sorting behavior.
**Validate**: Manual review

#### TASK-01.4: Implement task priorities
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Add priority field to TaskItem, add validation, update sorting logic.
**Validate**: `pnpm --filter @suite/domain-tasks test`

#### TASK-01.5: Write spec for task tags
**Target**: apps/tasks/specs/task-tags.spec.md
**Action**: Write spec describing tag management, tag search, and tag filtering.
**Validate**: Manual review

#### TASK-01.6: Implement task tags
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Add tags field to TaskItem, implement tag management functions.
**Validate**: `pnpm --filter @suite/domain-tasks test`

#### TASK-01.7: Implement task search
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Add searchTasks function that filters by title and tags.
**Validate**: `pnpm --filter @suite/domain-tasks test`

#### TASK-01.8: Implement batch operations
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Add batchComplete and batchArchive functions for bulk operations.
**Validate**: `pnpm --filter @suite/domain-tasks test`

---

### [ ] TASK-02: Update tasks API with new features

**Status**: Not started  
**Related Files**: apps/tasks/api/src/index.ts, apps/tasks/api/src/index.test.ts

**Definition of Done**:
- API endpoints for due dates, priorities, tags
- Search endpoint with query parameters
- Batch operation endpoints
- Proper error mapping for new features
- API tests for all new endpoints
- OpenAPI spec updated (if using)

**Out of Scope**:
- Real-time updates
- Webhook notifications
- Advanced filtering

**Rules to Follow**:
- Keep API layer thin
- Map domain errors to HTTP status codes
- Validate input at API boundary
- Use query parameters for search/filter
- Maintain existing API contracts

**Advanced Coding Pattern**:
```typescript
// Search endpoint with query parameters
app.get('/api/tasks/search', (c) => {
  const query = c.req.query('q');
  const tags = c.req.query('tags')?.split(',');
  const results = searchTasks({ query, tags });
  return c.json({ tasks: results });
});
```

**Anti-Patterns**:
- Do NOT put business logic in API layer
- Do NOT change existing endpoint contracts
- Do NOT ignore validation errors

**Imports/Exports**:
```typescript
// Exports (Hono app)
export default app;
```

**Depends On**: TASK-01  
**Blocks**: TASK-03

**Subtasks**:

#### TASK-02.1: Add due date to API endpoints
**Target**: apps/tasks/api/src/index.ts
**Action**: Update POST/PUT endpoints to accept dueDate, add validation.
**Validate**: `pnpm --filter @suite/tasks-api test`

#### TASK-02.2: Add priority to API endpoints
**Target**: apps/tasks/api/src/index.ts
**Action**: Update POST/PUT endpoints to accept priority, add validation.
**Validate**: `pnpm --filter @suite/tasks-api test`

#### TASK-02.3: Add tags to API endpoints
**Target**: apps/tasks/api/src/index.ts
**Action**: Update POST/PUT endpoints to accept tags array, add validation.
**Validate**: `pnpm --filter @suite/tasks-api test`

#### TASK-02.4: Implement search endpoint
**Target**: apps/tasks/api/src/index.ts
**Action**: Add GET /api/tasks/search with query and tags parameters.
**Validate**: `pnpm --filter @suite/tasks-api test`

#### TASK-02.5: Implement batch complete endpoint
**Target**: apps/tasks/api/src/index.ts
**Action**: Add POST /api/tasks/batch/complete with task IDs array.
**Validate**: `pnpm --filter @suite/tasks-api test`

#### TASK-02.6: Implement batch archive endpoint
**Target**: apps/tasks/api/src/index.ts
**Action**: Add POST /api/tasks/batch/archive with task IDs array.
**Validate**: `pnpm --filter @suite/tasks-api test`

#### TASK-02.7: Update API tests
**Target**: apps/tasks/api/src/index.test.ts
**Action**: Add tests for all new endpoints and error cases.
**Validate**: `pnpm --filter @suite/tasks-api test`

---

### [ ] TASK-03: Update tasks web app with new features

**Status**: Not started  
**Related Files**: apps/tasks/web/src/App.tsx, apps/tasks/web/src/components/

**Definition of Done**:
- UI for due date input
- UI for priority selection
- UI for tag management
- Search UI with real-time filtering
- Batch operation UI (select multiple, complete/archive)
- Loading states for all new features
- Error handling for all new features
- Component tests for new UI elements

**Out of Scope**:
- Drag and drop reordering
- Keyboard shortcuts
- Advanced filtering UI

**Rules to Follow**:
- Use shared UI components from packages/ui
- Maintain existing UI patterns
- Add loading states for async operations
- Provide clear error messages
- Ensure accessibility (ARIA labels, keyboard navigation)

**Advanced Coding Pattern**:
```typescript
// Search with debouncing
const [searchQuery, setSearchQuery] = useState('');
const debouncedQuery = useDebounce(searchQuery, 300);

useEffect(() => {
  if (debouncedQuery) {
    searchTasks({ query: debouncedQuery });
  }
}, [debouncedQuery]);
```

**Anti-Patterns**:
- Do NOT create custom components when shared ones exist
- Do NOT ignore loading states
- Do NOT break existing UI functionality

**Imports/Exports**:
```typescript
// Exports
export { App };
```

**Depends On**: TASK-02, UI-01  
**Blocks**: None

**Subtasks**:

#### TASK-03.1: Add due date input to task form
**Target**: apps/tasks/web/src/App.tsx
**Action**: Add date input for due date, integrate with create/update logic.
**Validate**: `pnpm --filter @suite/tasks-web test`

#### TASK-03.2: Add priority selector to task form
**Target**: apps/tasks/web/src/App.tsx
**Action**: Add select dropdown for priority, integrate with create/update logic.
**Validate**: `pnpm --filter @suite/tasks-web test`

#### TASK-03.3: Add tag management UI
**Target**: apps/tasks/web/src/App.tsx
**Action**: Add tag input with autocomplete, display tags in task list.
**Validate**: `pnpm --filter @suite/tasks-web test`

#### TASK-03.4: Implement search UI
**Target**: apps/tasks/web/src/App.tsx
**Action**: Add search input with debouncing, filter task list in real-time.
**Validate**: `pnpm --filter @suite/tasks-web test`

#### TASK-03.5: Implement batch selection UI
**Target**: apps/tasks/web/src/App.tsx
**Action**: Add checkboxes for task selection, show batch action buttons.
**Validate**: `pnpm --filter @suite/tasks-web test`

#### TASK-03.6: Implement batch complete action
**Target**: apps/tasks/web/src/App.tsx
**Action**: Add batch complete button, call batch complete API, update UI.
**Validate**: `pnpm --filter @suite/tasks-web test`

#### TASK-03.7: Implement batch archive action
**Target**: apps/tasks/web/src/App.tsx
**Action**: Add batch archive button, call batch archive API, update UI.
**Validate**: `pnpm --filter @suite/tasks-web test`

#### TASK-03.8: Add component tests for new UI
**Target**: apps/tasks/web/src/App.test.tsx
**Action**: Add tests for due date, priority, tags, search, batch operations.
**Validate**: `pnpm --filter @suite/tasks-web test`

---

## Phase 4: Drive App Production Readiness

### [ ] DRV-01: Add missing features to drive domain

**Status**: Not started  
**Related Files**: packages/domain-drive/src/index.ts, apps/drive/specs/

**Definition of Done**:
- Folder hierarchy implemented
- File metadata (created, modified, mime type)
- File size validation at domain level
- File name validation (no special characters)
- Folder operations (create, rename, delete, move)
- Search by name
- Domain tests for all new features
- Feature specs written for new features

**Out of Scope**:
- File versioning
- File sharing/collaboration
- File thumbnails
- Advanced search (content search)

**Rules to Follow**:
- Implement folder as first-class entity
- Add metadata fields to DriveFile type
- Validate file names and sizes
- Write specs before implementation
- Keep domain logic pure

**Advanced Coding Pattern**:
```typescript
// Drive file with folder support
export type DriveFile = {
  id: string;
  name: string;
  size: number;
  folderId?: string;
  mimeType?: string;
  createdAt: string;
  modifiedAt: string;
};

export type DriveFolder = {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
};
```

**Anti-Patterns**:
- Do NOT implement complex folder operations without tests
- Do NOT break existing API
- Do NOT add UI-specific fields to domain

**Imports/Exports**:
```typescript
// Exports
export { uploadDriveFile, listDriveFiles, getDriveFile, renameDriveFile, deleteDriveFile, createFolder, listFolders, renameFolder, deleteFolder, moveFile, searchFiles, resetDriveFiles }
export type { DriveFile, DriveFolder, UploadDriveFileInput, RenameDriveFileInput, DriveError }
```

**Depends On**: DOM-03  
**Blocks**: DRV-02

**Subtasks**:

#### DRV-01.1: Write spec for folder hierarchy
**Target**: apps/drive/specs/folder-hierarchy.spec.md
**Action**: Write spec describing folder creation, nesting, and file organization.
**Validate**: Manual review

#### DRV-01.2: Implement folder entity
**Target**: packages/domain-drive/src/index.ts
**Action**: Add DriveFolder type, create/list/rename/delete/move folder functions.
**Validate**: `pnpm --filter @suite/domain-drive test`

#### DRV-01.3: Add folder support to files
**Target**: packages/domain-drive/src/index.ts
**Action**: Add folderId field to DriveFile, update upload/list to respect folders.
**Validate**: `pnpm --filter @suite/domain-drive test`

#### DRV-01.4: Write spec for file metadata
**Target**: apps/drive/specs/file-metadata.spec.md
**Action**: Write spec describing metadata tracking and validation.
**Validate**: Manual review

#### DRV-01.5: Implement file metadata
**Target**: packages/domain-drive/src/index.ts
**Action**: Add createdAt, modifiedAt, mimeType fields to DriveFile.
**Validate**: `pnpm --filter @suite/domain-drive test`

#### DRV-01.6: Implement file name validation
**Target**: packages/domain-drive/src/index.ts
**Action**: Add validation for file names (no special characters, length limits).
**Validate**: `pnpm --filter @suite/domain-drive test`

#### DRV-01.7: Implement file search
**Target**: packages/domain-drive/src/index.ts
**Action**: Add searchFiles function that filters by name and folder.
**Validate**: `pnpm --filter @suite/domain-drive test`

---

### [ ] DRV-02: Update drive API with new features

**Status**: Not started  
**Related Files**: apps/drive/api/src/index.ts, apps/drive/api/src/index.test.ts

**Definition of Done**:
- API endpoints for folder operations
- File metadata in responses
- Search endpoint with query parameters
- Proper error mapping for new features
- API tests for all new endpoints
- File upload size limits enforced

**Out of Scope**:
- File upload progress tracking
- Chunked file uploads
- File download endpoints

**Rules to Follow**:
- Keep API layer thin
- Map domain errors to HTTP status codes
- Validate input at API boundary
- Use query parameters for search
- Maintain existing API contracts

**Advanced Coding Pattern**:
```typescript
// Folder creation endpoint
app.post('/api/folders', async (c) => {
  const body = await c.req.json();
  const payload = parseCreateFolderBody(body);
  if (!payload) {
    return c.json({ error: 'Invalid folder payload' }, 400);
  }
  try {
    const folder = createFolder(payload);
    return c.json({ folder }, 201);
  } catch (error) {
    const response = readDriveError(error);
    return c.json(response.body, response.status);
  }
});
```

**Anti-Patterns**:
- Do NOT put business logic in API layer
- Do NOT change existing endpoint contracts
- Do NOT ignore validation errors

**Imports/Exports**:
```typescript
// Exports (Hono app)
export default app;
```

**Depends On**: DRV-01  
**Blocks**: DRV-03

**Subtasks**:

#### DRV-02.1: Add folder endpoints
**Target**: apps/drive/api/src/index.ts
**Action**: Add POST/PUT/DELETE /api/folders endpoints with validation.
**Validate**: `pnpm --filter @suite/drive-api test`

#### DRV-02.2: Add folderId to file endpoints
**Target**: apps/drive/api/src/index.ts
**Action**: Update file upload/list to accept folderId parameter.
**Validate**: `pnpm --filter @suite/drive-api test`

#### DRV-02.3: Add metadata to file responses
**Target**: apps/drive/api/src/index.ts
**Action**: Include createdAt, modifiedAt, mimeType in file responses.
**Validate**: `pnpm --filter @suite/drive-api test`

#### DRV-02.4: Implement search endpoint
**Target**: apps/drive/api/src/index.ts
**Action**: Add GET /api/files/search with query and folderId parameters.
**Validate**: `pnpm --filter @suite/drive-api test`

#### DRV-02.5: Enforce file size limits
**Target**: apps/drive/api/src/index.ts
**Action**: Add file size validation in upload endpoint, return 413 if too large.
**Validate**: `pnpm --filter @suite/drive-api test`

#### DRV-02.6: Update API tests
**Target**: apps/drive/api/src/index.test.ts
**Action**: Add tests for all new endpoints and error cases.
**Validate**: `pnpm --filter @suite/drive-api test`

---

### [ ] DRV-03: Update drive web app with new features

**Status**: Not started  
**Related Files**: apps/drive/web/src/App.tsx, apps/drive/web/src/components/

**Definition of Done**:
- Folder tree view UI
- File list with folder navigation
- Folder creation/rename/delete UI
- File metadata display
- Search UI with real-time filtering
- Breadcrumb navigation
- Loading states for all new features
- Error handling for all new features
- Component tests for new UI elements

**Out of Scope**:
- Drag and drop file upload
- File preview
- File download

**Rules to Follow**:
- Use shared UI components from packages/ui
- Maintain existing UI patterns
- Add loading states for async operations
- Provide clear error messages
- Ensure accessibility (ARIA labels, keyboard navigation)

**Advanced Coding Pattern**:
```typescript
// Folder tree with recursive rendering
function FolderTree({ folders, files, onFolderClick, onFileClick }: FolderTreeProps) {
  return (
    <ul>
      {folders.map(folder => (
        <li key={folder.id}>
          <button onClick={() => onFolderClick(folder.id)}>{folder.name}</button>
          {folder.children && (
            <FolderTree folders={folder.children} files={[]} onFolderClick={onFolderClick} onFileClick={onFileClick} />
          )}
        </li>
      ))}
      {files.map(file => (
        <li key={file.id}>
          <button onClick={() => onFileClick(file.id)}>{file.name}</button>
        </li>
      ))}
    </ul>
  );
}
```

**Anti-Patterns**:
- Do NOT create custom components when shared ones exist
- Do NOT ignore loading states
- Do NOT break existing UI functionality

**Imports/Exports**:
```typescript
// Exports
export { App };
```

**Depends On**: DRV-02, UI-01  
**Blocks**: None

**Subtasks**:

#### DRV-03.1: Implement folder tree view
**Target**: apps/drive/web/src/App.tsx
**Action**: Add folder tree component with recursive rendering, click handlers.
**Validate**: `pnpm --filter @suite/drive-web test`

#### DRV-03.2: Add folder navigation to file list
**Target**: apps/drive/web/src/App.tsx
**Action**: Update file list to show files in selected folder, add breadcrumb navigation.
**Validate**: `pnpm --filter @suite/drive-web test`

#### DRV-03.3: Add folder creation UI
**Target**: apps/drive/web/src/App.tsx
**Action**: Add "New Folder" button with dialog for folder name input.
**Validate**: `pnpm --filter @suite/drive-web test`

#### DRV-03.4: Add folder rename/delete UI
**Target**: apps/drive/web/src/App.tsx
**Action**: Add context menu or buttons for folder rename/delete operations.
**Validate**: `pnpm --filter @suite/drive-web test`

#### DRV-03.5: Display file metadata
**Target**: apps/drive/web/src/App.tsx
**Action**: Show file size, created date, modified date, mime type in file list.
**Validate**: `pnpm --filter @suite/drive-web test`

#### DRV-03.6: Implement search UI
**Target**: apps/drive/web/src/App.tsx
**Action**: Add search input with debouncing, filter file list in real-time.
**Validate**: `pnpm --filter @suite/drive-web test`

#### DRV-03.7: Add component tests for new UI
**Target**: apps/drive/web/src/App.test.tsx
**Action**: Add tests for folder tree, navigation, metadata display, search.
**Validate**: `pnpm --filter @suite/drive-web test`

---

## Phase 5: Technical Debt Resolution

### [ ] DEBT-01: Fix crypto.randomUUID compatibility

**Status**: Not started  
**Related Files**: packages/domain-calendar/src/lib/calendar-events.ts, packages/domain-tasks/src/lib/tasks.ts, packages/domain-drive/src/index.ts

**Definition of Done**:
- Replace crypto.randomUUID with polyfill or Node.js crypto module
- All domain packages work in environments without Web Crypto API
- Tests pass in Node.js environment
- No breaking changes to domain API

**Out of Scope**:
- Custom UUID implementation
- UUID version changes

**Rules to Follow**:
- Use Node.js crypto module for server-side
- Use Web Crypto API for client-side
- Provide fallback for environments without either
- Keep UUID format consistent (v4)

**Advanced Coding Pattern**:
```typescript
// Cross-platform UUID generation
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof require !== 'undefined') {
    const nodeCrypto = require('crypto');
    return nodeCrypto.randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

**Anti-Patterns**:
- Do NOT use Math.random() for security-sensitive UUIDs
- Do NOT change UUID format
- Do NOT break existing tests

**Imports/Exports**:
```typescript
// No new exports needed
```

**Depends On**: None  
**Blocks**: None

**Subtasks**:

#### DEBT-01.1: Create UUID utility in shared-kernel
**Target**: packages/shared-kernel/src/uuid.ts
**Action**: Create generateUUID function with cross-platform support.
**Validate**: `pnpm --filter @suite/shared-kernel test`

#### DEBT-01.2: Update calendar domain to use UUID utility
**Target**: packages/domain-calendar/src/lib/calendar-events.ts
**Action**: Replace crypto.randomUUID with generateUUID from shared-kernel.
**Validate**: `pnpm --filter @suite/domain-calendar test`

#### DEBT-01.3: Update tasks domain to use UUID utility
**Target**: packages/domain-tasks/src/lib/tasks.ts
**Action**: Replace createTaskId with generateUUID from shared-kernel.
**Validate**: `pnpm --filter @suite/domain-tasks test`

#### DEBT-01.4: Update drive domain to use UUID utility
**Target**: packages/domain-drive/src/index.ts
**Action**: Replace createDriveFileId with generateUUID from shared-kernel.
**Validate**: `pnpm --filter @suite/domain-drive test`

---

### [ ] DEBT-02: Add API proxy to Vite configs

**Status**: Not started  
**Related Files**: apps/calendar/web/vite.config.ts, apps/tasks/web/vite.config.ts, apps/drive/web/vite.config.ts

**Definition of Done**:
- All web app Vite configs proxy /api/* to API server
- Development works with API proxy
- No CORS errors in development
- Production builds unchanged

**Out of Scope**:
- WebSocket proxying
- Complex proxy rules

**Rules to Follow**:
- Proxy /api/* to API server (localhost:port)
- Change target based on environment variable
- Keep proxy configuration simple
- Document proxy setup in README

**Advanced Coding Pattern**:
```typescript
// Vite proxy configuration
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

**Anti-Patterns**:
- Do NOT hardcode API URLs
- Do NOT proxy non-API routes
- Do NOT use complex rewrite rules

**Imports/Exports**:
```typescript
// No new exports needed
```

**Depends On**: None  
**Blocks**: Local development integration

**Subtasks**:

#### DEBT-02.1: Add proxy to calendar Vite config
**Target**: apps/calendar/web/vite.config.ts
**Action**: Add proxy configuration for /api/* to calendar API server.
**Validate**: `pnpm --filter @suite/calendar-web dev` (manual test)

#### DEBT-02.2: Add proxy to tasks Vite config
**Target**: apps/tasks/web/vite.config.ts
**Action**: Add proxy configuration for /api/* to tasks API server.
**Validate**: `pnpm --filter @suite/tasks-web dev` (manual test)

#### DEBT-02.3: Add proxy to drive Vite config
**Target**: apps/drive/web/vite.config.ts
**Action**: Add proxy configuration for /api/* to drive API server.
**Validate**: `pnpm --filter @suite/drive-web dev` (manual test)

#### DEBT-02.4: Document proxy setup in README
**Target**: README.md
**Action**: Add section documenting API proxy configuration and environment variables.
**Validate**: Manual review

---

### [ ] DEBT-03: Clean up obsolete .devin rules

**Status**: Not started  
**Related Files**: .devin/rules/

**Definition of Done**:
- Delete YDM-branded obsolete rules
- Keep Suite-specific rules
- Keep general guidance rules (accessibility, performance, markdown)
- Update AGENTS.md to reference correct rules

**Out of Scope**:
- Rewriting obsolete rules (delete instead)

**Rules to Follow**:
- Delete rules that describe different architecture
- Keep rules that are Suite-specific
- Keep general guidance that applies to any project
- Update documentation references

**Advanced Coding Pattern**:
```bash
# Delete obsolete rules
rm .devin/rules/ydm-architecture.md
rm .devin/rules/api-first-development.md
rm .devin/rules/tech-stack.md
# ... (other YDM-branded rules)
```

**Anti-Patterns**:
- Do NOT keep obsolete rules "just in case"
- Do NOT rewrite obsolete rules (delete and create new if needed)
- Do NOT break existing rule references

**Imports/Exports**:
```typescript
// N/A
```

**Depends On**: None  
**Blocks**: AI agent clarity

**Subtasks**:

#### DEBT-03.1: Identify obsolete rules
**Target**: .devin/rules/
**Action**: List all YDM-branded rules that describe different architecture.
**Validate**: Manual review

#### DEBT-03.2: Delete obsolete rules
**Target**: .devin/rules/
**Action**: Delete YDM-branded rules (ydm-architecture.md, api-first-development.md, tech-stack.md, etc.).
**Validate**: `git status`

#### DEBT-03.3: Update AGENTS.md references
**Target**: AGENTS.md
**Action**: Update AGENTS.md to reference only Suite-specific rules.
**Validate**: Manual review

#### DEBT-03.4: Verify no broken references
**Target**: .devin/
**Action**: Search for references to deleted rules in other files, update or remove.
**Validate**: `grep -r "ydm-architecture" .devin/`

---

### [ ] DEBT-04: Add error codes to drive domain

**Status**: Not started  
**Related Files**: packages/domain-drive/src/index.ts

**Definition of Done**:
- DriveError uses error codes like other domains
- Error codes: validation_error, not_found_error
- Error details array for validation messages
- Consistent with calendar and tasks error handling
- Tests updated to check error codes

**Out of Scope**:
- New error types beyond validation/not_found

**Rules to Follow**:
- Match error code pattern from calendar/tasks
- Use error codes in API mapping
- Update tests to check error codes
- Maintain backward compatibility

**Advanced Coding Pattern**:
```typescript
// Error codes like other domains
export type DriveErrorCode = 'validation_error' | 'not_found_error';

export class DriveError extends Error {
  constructor(
    message: string,
    public readonly code: DriveErrorCode,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'DriveError';
  }
}
```

**Anti-Patterns**:
- Do NOT use generic Error without codes
- Do NOT break existing error handling
- Do NOT add error codes without tests

**Imports/Exports**:
```typescript
// Exports
export { DriveError }
export type { DriveErrorCode }
```

**Depends On**: None  
**Blocks**: Consistent error handling across domains

**Subtasks**:

#### DEBT-04.1: Add error codes to DriveError
**Target**: packages/domain-drive/src/index.ts
**Action**: Update DriveError to include code and details fields.
**Validate**: `pnpm --filter @suite/domain-drive typecheck`

#### DEBT-04.2: Update drive functions to use error codes
**Target**: packages/domain-drive/src/index.ts
**Action**: Update all functions to throw DriveError with appropriate codes.
**Validate**: `pnpm --filter @suite/domain-drive test`

#### DEBT-04.3: Update drive API error mapping
**Target**: apps/drive/api/src/index.ts
**Action**: Update readDriveError to map error codes to HTTP status codes.
**Validate**: `pnpm --filter @suite/drive-api test`

#### DEBT-04.4: Update drive tests to check error codes
**Target**: packages/domain-drive/src/index.test.ts
**Action**: Update tests to check error.code instead of message strings.
**Validate**: `pnpm --filter @suite/domain-drive test`

---

## Phase 6: Documentation and Quality

### [ ] DOC-01: Update project documentation

**Status**: Not started  
**Related Files**: README.md, MEMORY.md, .planning/

**Definition of Done**:
- README.md reflects current implementation state
- MEMORY.md updated with latest changes
- .planning/ docs marked as historical context
- Architecture decisions documented
- Getting started guide updated
- Development workflow documented

**Out of Scope**:
- Rewriting planning docs (mark as historical)
- API documentation (use OpenAPI if implemented)

**Rules to Follow**:
- Keep documentation accurate
- Mark planning docs as historical
- Document current state, not future plans
- Update diagrams if they exist

**Advanced Coding Pattern**:
```markdown
# README Structure
## Overview
## Current State
## Architecture
## Getting Started
## Development Workflow
## Testing
## Deployment
## Contributing
```

**Anti-Patterns**:
- Do NOT document features that don't exist
- Do NOT leave outdated documentation
- Do NOT mix historical docs with current docs

**Imports/Exports**:
```typescript
// N/A
```

**Depends On**: All previous phases  
**Blocks**: None

**Subtasks**:

#### DOC-01.1: Update README.md
**Target**: README.md
**Action**: Update README to reflect current implementation state, getting started guide.
**Validate**: Manual review

#### DOC-01.2: Update MEMORY.md
**Target**: MEMORY.md
**Action**: Update MEMORY.md with latest changes, current worklist status.
**Validate**: Manual review

#### DOC-01.3: Mark .planning/ as historical
**Target**: .planning/README.md
**Action**: Create README in .planning/ marking docs as historical context.
**Validate**: Manual review

#### DOC-01.4: Document architecture decisions
**Target**: docs/architecture.md
**Action**: Create architecture documentation explaining current decisions.
**Validate**: Manual review

#### DOC-01.5: Document development workflow
**Target**: docs/development.md
**Action**: Create development workflow guide (commands, patterns, conventions).
**Validate**: Manual review

---

### [ ] QA-01: Final quality assurance

**Status**: Not started  
**Related Files**: All packages and apps

**Definition of Done**:
- All tests passing (100%)
- Type checking passes across workspace
- Linting passes (if configured)
- Manual acceptance testing completed
- Performance benchmarks acceptable
- Accessibility audit passed
- Security audit passed
- Ready for production deployment

**Out of Scope**:
- Load testing
- Penetration testing
- User acceptance testing (external)

**Rules to Follow**:
- Run full test suite
- Check coverage thresholds
- Manual test critical paths
- Verify accessibility with screen reader
- Check for security vulnerabilities

**Advanced Coding Pattern**:
```bash
# Full QA suite
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:run
pnpm test:coverage
pnpm build
# Manual testing
# Accessibility audit
# Security audit
```

**Anti-Patterns**:
- Do NOT skip tests
- Do NOT ignore type errors
- Do NOT deploy without manual testing

**Imports/Exports**:
```typescript
// N/A
```

**Depends On**: All previous phases  
**Blocks**: Production deployment

**Subtasks**:

#### QA-01.1: Run full test suite
**Target**: All packages
**Action**: Run pnpm test:run, verify all tests pass.
**Validate**: `pnpm test:run`

#### QA-01.2: Run type checking
**Target**: All packages
**Action**: Run pnpm typecheck, verify no type errors.
**Validate**: `pnpm typecheck`

#### QA-01.3: Check coverage thresholds
**Target**: All packages
**Action**: Run pnpm test:coverage, verify thresholds met.
**Validate**: `pnpm test:coverage`

#### QA-01.4: Build all packages
**Target**: All packages
**Action**: Run pnpm build, verify all packages build successfully.
**Validate**: `pnpm build`

#### QA-01.5: Manual acceptance testing
**Target: apps/calendar, apps/tasks, apps/drive
**Action**: Run through acceptance checklists for all three apps.
**Validate**: Manual testing

#### QA-01.6: Accessibility audit
**Target: apps/calendar/web, apps/tasks/web, apps/drive/web
**Action**: Test with screen reader, keyboard navigation, ARIA attributes.
**Validate**: Manual testing

#### QA-01.7: Security audit
**Target: All packages
**Action**: Run npm audit, check for vulnerabilities, review dependencies.
**Validate**: `pnpm audit`

#### QA-01.8: Performance benchmarks
**Target: All apps
**Action**: Measure load times, API response times, database query performance.
**Validate**: Manual testing

---

## Appendix: Task Status Summary

### Phase 1: Shared Infrastructure Packages
- [ ] DB-01: Implement PostgreSQL integration with Drizzle ORM
- [ ] ENV-01: Implement environment configuration with Zod validation
- [ ] CRYPTO-01: Implement E2EE crypto utilities with Web Crypto API
- [ ] AUTH-01: Implement authentication with Better Auth
- [ ] UI-01: Expand shared UI component library

### Phase 2: Domain Package Database Integration
- [ ] DOM-01: Integrate database into calendar domain package
- [ ] DOM-02: Integrate database into tasks domain package
- [ ] DOM-03: Integrate database into drive domain package

### Phase 3: Tasks App Production Readiness
- [ ] TASK-01: Add missing features to tasks domain
- [ ] TASK-02: Update tasks API with new features
- [ ] TASK-03: Update tasks web app with new features

### Phase 4: Drive App Production Readiness
- [ ] DRV-01: Add missing features to drive domain
- [ ] DRV-02: Update drive API with new features
- [ ] DRV-03: Update drive web app with new features

### Phase 5: Technical Debt Resolution
- [ ] DEBT-01: Fix crypto.randomUUID compatibility
- [ ] DEBT-02: Add API proxy to Vite configs
- [ ] DEBT-03: Clean up obsolete .devin rules
- [ ] DEBT-04: Add error codes to drive domain

### Phase 6: Documentation and Quality
- [ ] DOC-01: Update project documentation
- [ ] QA-01: Final quality assurance
