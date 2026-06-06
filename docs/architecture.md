# Suite Architecture Documentation

This document describes the architectural decisions and patterns used in the Suite monorepo.

## Overview

Suite follows Domain-Driven Design (DDD) principles with bounded contexts, shared infrastructure packages, and thin API layers. The architecture prioritizes domain logic purity, testability, and security.

## Core Principles

### 1. Domain Boundaries

**Rule**: Domain packages never import other domain packages.

Each domain package (`packages/domain-*`) represents a bounded context with its own:
- Ubiquitous language
- Business rules
- Data models
- Repository interfaces

**Rationale**: This prevents tight coupling between domains and enables independent evolution of each bounded context.

**Implementation**: Cross-domain communication uses HTTP calls (Service Bindings) rather than direct imports.

### 2. Spec-First Development

**Rule**: Every feature begins with a spec before implementation.

Specs are created in `apps/<app>/specs/<feature>.spec.md` with:
- User story
- API contract
- Validation rules
- Error cases
- Out-of-scope items

**Rationale**: Ensures clear requirements before coding, prevents scope creep, and provides documentation.

### 3. Thin API Layers

**Rule**: API routes only handle validation, auth checks, and domain package calls.

API layer responsibilities:
- Request validation
- Authentication/authorization
- Error mapping to HTTP status codes
- Domain function invocation

**Anti-patterns**:
- Business logic in API routes
- Direct database access in API layer
- Domain-specific error types in API

### 4. Repository Pattern

**Rule**: Domain packages use repository injection for data access.

Repository pattern provides:
- Testability (in-memory repositories for tests)
- Abstraction from database implementation
- Async operations throughout
- Database-specific reset functions for tests

**Implementation**:
```typescript
// Domain package
export function setCalendarEventRepository(repo: CalendarEventRepository) {
  currentRepository = repo;
}

// In-memory for tests
class InMemoryCalendarEventRepository implements CalendarEventRepository {
  private events = new Map<string, CalendarEvent>();
  // ...
}

// Database for production
class PostgresCalendarEventRepository implements CalendarEventRepository {
  constructor(private db: DrizzleDB) {}
  // ...
}
```

### 5. Shared Packages

**Rule**: Prefer workspace packages over published registry dependencies for local code.

Shared packages:
- `@suite/auth` - Authentication (Better Auth)
- `@suite/crypto` - E2EE crypto utilities
- `@suite/db` - Database (Drizzle ORM)
- `@suite/env-config` - Environment validation (Zod)
- `@suite/ui` - Shared UI components
- `@suite/shared-kernel` - Universal types and utilities

**Rationale**: Reduces dependency duplication, ensures consistency, enables easier updates.

### 6. E2EE Encryption

**Rule**: All user content must be encrypted with AES-256-GCM before storage.

Crypto implementation:
- Web Crypto API (subtle.crypto) for browser and Node.js 18+
- AES-256-GCM encryption with 96-bit IV per operation
- ECDH key pair generation (X25519 curve)
- PBKDF2 key derivation (310,000 iterations)
- Key serialization/deserialization (JWK and raw formats)

**Rationale**: Zero-knowledge architecture - server cannot access user content.

## Repository Structure

```
suite/
├── apps/
│   ├── calendar/
│   │   ├── api/              # Hono API routes (thin layer)
│   │   ├── specs/            # Feature specifications
│   │   └── web/              # React web app (Vite)
│   ├── tasks/
│   │   ├── api/              # Hono API routes (thin layer)
│   │   ├── specs/            # Feature specifications
│   │   └── web/              # React web app (Vite)
│   └── drive/
│       ├── api/              # Hono API routes (thin layer)
│       ├── specs/            # Feature specifications
│       └── web/              # React web app (Vite)
├── packages/
│   ├── auth/                 # Authentication (Better Auth)
│   ├── crypto/               # E2EE crypto utilities
│   ├── db/                   # Database (Drizzle ORM + PostgreSQL)
│   ├── env-config/           # Environment validation (Zod)
│   ├── ui/                   # Shared UI components (shadcn/ui)
│   ├── shared-kernel/        # Universal types and utilities
│   ├── domain-calendar/      # Calendar bounded context
│   ├── domain-tasks/         # Tasks bounded context
│   └── domain-drive/         # Drive bounded context
├── docs/                     # Documentation
├── .devin/                   # AI agent rules and skills
├── .github/                  # GitHub workflows
├── AGENTS.md                 # AI agent rules
├── TODO.md                   # Implementation roadmap
└── MEMORY.md                 # Project memory
```

## Package Dependencies

### Domain Packages
- No cross-domain imports
- Depend on `@suite/db` for repository implementations
- Depend on `@suite/shared-kernel` for universal types
- Depend on `@suite/crypto` for encryption (if needed)

### API Packages
- Depend on corresponding domain package
- Depend on `@suite/auth` for authentication
- Depend on `@suite/env-config` for environment validation
- Use Hono framework

### Web Packages
- Depend on corresponding API package
- Depend on `@suite/ui` for shared components
- Depend on `@suite/auth` for auth client
- Use React + Vite + TailwindCSS

### Shared Packages
- Minimal dependencies on each other
- `@suite/db` depends on Drizzle ORM
- `@suite/auth` depends on `@suite/db` and Better Auth
- `@suite/crypto` has no external dependencies (Web Crypto API)

## Data Flow

### Request Flow (API)
```
HTTP Request
  ↓
Hono Route
  ↓
Validation (Zod)
  ↓
Auth Check (Better Auth)
  ↓
Domain Function Call
  ↓
Repository Operation
  ↓
Database (PostgreSQL)
  ↓
Response Mapping
  ↓
HTTP Response
```

### Data Flow (Web App)
```
User Action
  ↓
React Component
  ↓
API Call (fetch)
  ↓
Vite Proxy (dev) / Direct (prod)
  ↓
API Route
  ↓
Domain Function
  ↓
Repository
  ↓
Database
  ↓
Response
  ↓
UI Update
```

## Error Handling

### Domain Errors
Each domain package has its own error type with error codes:
```typescript
export type CalendarErrorCode = 'validation_error' | 'not_found_error' | 'conflict_error';

export class CalendarError extends Error {
  constructor(
    message: string,
    public readonly code: CalendarErrorCode,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'CalendarError';
  }
}
```

### API Error Mapping
API layer maps domain error codes to HTTP status codes:
- `validation_error` → 400 Bad Request
- `not_found_error` → 404 Not Found
- `conflict_error` → 409 Conflict

## Testing Strategy

### Unit Tests (Vitest)
- Domain packages: Test business logic with in-memory repositories
- Shared packages: Test utility functions
- API packages: Test route handlers with mocked domain calls
- UI packages: Test component rendering and interactions

### E2E Tests (Playwright)
- Test complete user flows
- Test API integration
- Test web app interactions

### Test Data Management
- Each domain package has reset function for test cleanup
- In-memory repositories for isolated tests
- Database-specific reset functions for integration tests

## Security Architecture

### Authentication
- Better Auth framework
- Email/password authentication
- HTTP-only cookies for sessions
- Session management with database
- Protected route middleware

### Encryption
- AES-256-GCM for all user content
- Unique IV per encryption operation
- ECDH for key exchange
- PBKDF2 for password-based key derivation
- Web Crypto API (browser and Node.js 18+)

### Authorization
- User context in Hono variables
- Session validation on protected routes
- User-specific data isolation

## Deployment Architecture

### Development
- Vite dev server for web apps
- API proxy to local API servers
- Hot module replacement
- Environment variables from .env

### Production (Planned)
- Cloudflare Workers for API routes
- Static hosting for web apps
- PostgreSQL database (managed service)
- Environment-specific configuration

## Technology Choices

### Why pnpm?
- Efficient disk space usage (hard links)
- Fast installation
- Strict workspace support
- Better monorepo tooling

### Why Drizzle ORM?
- Type-safe queries
- SQL-like API (not too abstract)
- Good TypeScript support
- Migration system included

### Why Better Auth?
- Modern authentication framework
- Good TypeScript support
- Session management built-in
- Easy Hono integration

### Why Hono?
- Lightweight
- Cloudflare Workers support
- Good TypeScript support
- Fast performance

### Why Vite?
- Fast development server
- Hot module replacement
- Good React support
- Built-in proxy

## Future Considerations

### Multi-Tenancy
- Row-level security in PostgreSQL
- Tenant isolation at database level
- Tenant context in domain packages

### Real-Time Features
- Durable Objects for coordination
- One DO per "room" (chat, doc, board)
- Hibernation API for state management

### Search
- Blind indexing with HMAC tokens for encrypted data
- Exact-match search first
- Semantic search deferred until validated

### Offline Sync
- CRDT patterns for conflict resolution
- Background sync for mobile/desktop
- Conflict resolution strategies

## References

- [AGENTS.md](../AGENTS.md) - AI agent rules
- [TODO.md](../TODO.md) - Implementation roadmap
- [MEMORY.md](../MEMORY.md) - Project memory
- [Development Workflow](development.md) - Development guide
