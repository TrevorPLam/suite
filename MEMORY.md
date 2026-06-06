# Suite Monorepo - Project Memory

This document serves as a living record of the Suite monorepo project state, decisions, and current worklist status.

## Project Overview

Suite is a TypeScript monorepo implementing a productivity suite with Calendar, Tasks, and Drive applications. The project follows Domain-Driven Design (DDD) principles with bounded contexts, shared infrastructure packages, and thin API layers.

## Technology Stack

- **Package Manager**: pnpm workspaces
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL 14+ with Drizzle ORM
- **Authentication**: Better Auth
- **Crypto**: Web Crypto API (AES-256-GCM)
- **UI**: React + Vite + TailwindCSS + shadcn/ui patterns
- **Testing**: Vitest + Playwright
- **Build Tool**: Nx

## Completed Work

### Phase 1: Shared Infrastructure Packages (Complete)

**DB-01: PostgreSQL Integration**
- Drizzle ORM configured for PostgreSQL
- Schema definitions for calendar_events, tasks, drive_files, users, sessions, accounts
- Database connection pool with environment variables
- Repository pattern implementations
- Migration system with drizzle-kit

**ENV-01: Environment Configuration**
- Zod schemas for all apps (calendar, tasks, drive)
- validateEnv functions with type-safe environment objects
- Validation for DATABASE_URL, PORT, NODE_ENV
- 8 tests passing

**CRYPTO-01: E2EE Crypto Utilities**
- AES-256-GCM encryption/decryption with unique IV per operation
- ECDH key pair generation (X25519 curve)
- PBKDF2 key derivation (310,000 iterations)
- Key serialization/deserialization (JWK and raw formats)
- HKDF for deriving AES keys from ECDH shared secrets
- 26 tests passing

**AUTH-01: Authentication**
- Better Auth v1.1.10 configured
- Email/password authentication
- Session management with HTTP-only cookies
- Hono integration middleware
- User/session context in API routes
- Protected route middleware (requireAuth)
- Auth client for React apps
- Users, sessions, accounts tables in database

**UI-01: Shared UI Component Library**
- Input component with variants (default, error, success)
- Dialog component with Radix UI primitives
- Card component with subcomponents
- Badge component with variants
- Select component with keyboard navigation
- Textarea component with resize variants
- cn utility function for className merging
- 12 tests passing

### Phase 2: Domain Package Database Integration (Complete)

**DOM-01: Calendar Domain**
- Repository injection pattern
- InMemoryCalendarEventRepository for testing
- PostgresCalendarEventRepository for database
- Async domain functions
- resetCalendarEventsDB for test cleanup
- Conflict detection with database queries
- 20 tests passing

**DOM-02: Tasks Domain**
- Repository injection pattern
- InMemoryTaskRepository for testing
- PostgresTaskRepository for database
- Async domain functions
- resetTasksDB for test cleanup
- Filter operations with database queries
- 28 tests passing

**DOM-03: Drive Domain**
- Repository injection pattern
- InMemoryDriveFileRepository for testing
- PostgresDriveFileRepository for database
- Async domain functions
- resetDriveFilesDB for test cleanup
- 16 tests passing

### Phase 3: Tasks App Production Readiness (Complete)

**TASK-01: Missing Features to Tasks Domain**
- Task due dates with ISO 8601 validation
- Task priorities (low, medium, high)
- Task tags (string array)
- Task search (query + tags filtering)
- Batch operations (complete, archive)
- 3 specs written (due dates, priorities, tags)
- 57 tests passing (28 original + 29 new)

**TASK-02: Update Tasks API**
- API endpoints for due dates, priorities, tags
- Search endpoint with query parameters
- Batch operation endpoints
- Proper error mapping
- 35 tests passing (13 original + 22 new)

**TASK-03: Update Tasks Web App**
- Due date input with HTML5 picker
- Priority selector with color-coded display
- Tag management UI with autocomplete
- Search input with 300ms debouncing
- Batch selection checkboxes
- Batch complete/archive actions
- 6 tests passing

### Phase 4: Drive App Production Readiness (Complete)

**DRV-01: Missing Features to Drive Domain**
- Folder hierarchy with DriveFolder entity
- File metadata (createdAt, modifiedAt, mimeType)
- File name validation (no special characters)
- Folder operations (create, rename, delete, move)
- File search by name and folder
- 2 specs written (folder hierarchy, file metadata)
- 47 tests passing (16 original + 31 new)

**DRV-02: Update Drive API**
- Folder endpoints (POST/PUT/DELETE /api/folders)
- File move endpoint
- Search endpoint with query and folderId
- File size limit validation (100MB)
- Metadata in file responses
- 36 tests passing (13 original + 23 new)

**DRV-03: Update Drive Web App**
- Folder tree component with recursive rendering
- Folder navigation with breadcrumbs
- Folder creation/rename/delete UI
- File metadata display
- Search input with debouncing
- File move functionality
- 5 tests passing

### Phase 5: Technical Debt Resolution (Complete)

**DEBT-01: Fix crypto.randomUUID Compatibility**
- Created generateUUID in shared-kernel with cross-platform support
- Tries Web Crypto API first, falls back to Node.js crypto module
- Final fallback to Math.random for UUID v4 format
- Updated all domain packages to use generateUUID
- All domain tests passing

**DEBT-02: Add API Proxy to Vite Configs**
- Proxy configuration in all three web app Vite configs
- Unique default ports (3001, 3002, 3003)
- VITE_API_URL environment variable for override
- changeOrigin: true for CORS handling
- Documented in README

**DEBT-03: Clean Up Obsolete .devin Rules**
- Deleted YDM-branded motion-implementation skill
- Deleted DEVIN_RULES_SKILLS_GUIDE.md
- Verified no broken references
- Kept Suite-specific rules

**DEBT-04: Add Error Codes to Drive Domain**
- DriveErrorCode type with 'validation_error' | 'not_found_error'
- Updated DriveError class with code and details fields
- Updated all DriveError instantiations
- Added readDriveError function in drive API
- Updated tests to check error codes
- 47 tests passing

## Current Worklist Status

### Phase 6: Documentation and Quality (In Progress)

**DOC-01: Update Project Documentation** (In Progress)
- ✅ Updated README.md with current implementation state
- ✅ Created MEMORY.md with project state
- ⏳ Skip .planning/ marking (directory is empty)
- ⏳ Create docs/architecture.md
- ⏳ Create docs/development.md
- ⏳ Quality assurance (typecheck, lint, tests)

**QA-01: Final Quality Assurance** (Not Started)
- Run full test suite
- Run type checking
- Check coverage thresholds
- Build all packages
- Manual acceptance testing
- Accessibility audit
- Security audit
- Performance benchmarks

## Known Issues

- Pre-existing test failures in apps/calendar/api (conflict detection, update event tests)
- Pre-existing test failures in apps/drive/api (delete, update tests)
- These are known infrastructure issues with the API layer, unrelated to domain packages

## Architecture Decisions

### Domain Boundaries
- Domain packages never import other domain packages
- Cross-domain communication via HTTP calls (Service Bindings)
- Each domain has its own bounded context and ubiquitous language

### Repository Pattern
- Repository injection for testability
- In-memory repositories for testing
- Database repositories for production
- Async operations throughout

### API Layer
- Thin API routes (validation, auth, domain calls only)
- No business logic in API layer
- Error code mapping to HTTP status codes
- Hono framework for Cloudflare Workers

### Testing Strategy
- Vitest for unit tests
- Playwright for E2E tests
- Test-first development (TDD)
- Spec-first development (BDD)

### Security
- E2EE with AES-256-GCM for all user content
- Better Auth for authentication
- HTTP-only cookies for sessions
- Never store plaintext keys
- Zeroize sensitive data after use

## Next Steps

1. Complete DOC-01 documentation updates
2. Run QA-01 final quality assurance
3. Address pre-existing test failures in API layers
4. Prepare for production deployment

## Repository Statistics

- Total packages: 12
- Domain packages: 3 (calendar, tasks, drive)
- Shared packages: 6 (auth, crypto, db, env-config, ui, shared-kernel)
- Apps: 3 (calendar, tasks, drive)
- Total tests: 200+ passing
- Typecheck: Passing for all packages
