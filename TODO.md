# Suite Task List

This task list follows Specification-Driven Development (SDD), Domain-Driven Design (DDD), Test-Driven Development (TDD), Behavior-Driven Development (BDD), and deep modules principles.

## Status Legend

- [ ] Not Started
- [~] In Progress
- [x] Complete
- [!] Blocked

---

### [x] DB-004: Create Per-Domain Migration Configurations

**Priority**: P0
**Bounded Context**: Database Infrastructure
**Status**: Complete (AGENT tasks done, HUMAN tasks pending)

**Related Files**:
- `packages/db/drizzle.config.ts`
- `packages/db/drizzle.calendar.config.ts` (create)
- `packages/db/drizzle.drive.config.ts` (create)
- `packages/db/drizzle.tasks.config.ts` (create)
- `packages/db/scripts/migrate.ts` (create)
- `.planning/03-data-07-drizzle-migrations.md`

**Definition of Done**:
- Per-domain Drizzle configs created with schemaFilter and tablesFilter
- Separate migration tracking tables per domain
- CI migration runner implemented with advisory locks
- APP_DOMAIN environment variable pattern implemented
- Migrations run in CI before deployment
- Never run drizzle-kit push in production
- Tests verify migration safety

**Out of Scope**:
- Schema-per-tenant migration configurations (future)
- Automatic migration rollback (use forward migrations)
- Migration UI (use CLI)

**Rules to Follow**:
- Planning docs require per-domain configs with schemaFilter and tablesFilter
- Planning docs require CI-executed migrations with advisory locks
- Planning docs: Never run drizzle-kit push in production
- Planning docs: Migrations run in CI, never in Workers
- Planning docs: .planning/03-data-07-drizzle-migrations.md

**Advanced Coding Pattern**:
- Per-domain migration isolation
- PostgreSQL advisory locks for concurrency safety
- CI/CD integration for migrations
- Expand/contract migration pattern

**Anti-Patterns**:
- Single drizzle.config.ts for all domains
- Running migrations in Workers (no filesystem)
- Running drizzle-kit push in production
- No advisory locks for concurrent migrations
- No schemaFilter or tablesFilter

**Imports/Exports**:
- No changes to exports
- Migration runner script at packages/db/scripts/migrate.ts

**Depends On**: DB-003
**Blocks**: Production deployment

**Subtasks**:

#### DB-004-01: Create calendar domain Drizzle config ✅
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle.calendar.config.ts` (create)
**Action**: Create drizzle.calendar.config.ts with schema: ./src/schema/calendar, out: ./drizzle/calendar, schemaFilter: ['calendar'], tablesFilter: ['calendar_*', 'events', 'attendees'], migrations: { table: '__drizzle_migrations_calendar', schema: 'drizzle' }.
**Validate Command**: `npx drizzle-kit generate --config=packages/db/drizzle.calendar.config.ts`

#### DB-004-02: Create drive domain Drizzle config ✅
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle.drive.config.ts` (create)
**Action**: Create drizzle.drive.config.ts with schema: ./src/schema/drive, out: ./drizzle/drive, schemaFilter: ['drive'], tablesFilter: ['drive_*', 'files', 'folders'], migrations: { table: '__drizzle_migrations_drive', schema: 'drizzle' }.
**Validate Command**: `npx drizzle-kit generate --config=packages/db/drizzle.drive.config.ts`

#### DB-004-03: Create tasks domain Drizzle config ✅
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle.tasks.config.ts` (create)
**Action**: Create drizzle.tasks.config.ts with schema: ./src/schema/tasks, out: ./drizzle/tasks, schemaFilter: ['tasks'], tablesFilter: ['tasks_*'], migrations: { table: '__drizzle_migrations_tasks', schema: 'drizzle' }.
**Validate Command**: `npx drizzle-kit generate --config=packages/db/drizzle.tasks.config.ts`

#### DB-004-04: Implement CI migration runner ✅
**Assigned To**: AGENT
**Target File**: `packages/db/scripts/migrate.ts` (create)
**Action**: Implement migration runner that uses absolute path resolution, PostgreSQL advisory locks, and per-domain migration tables. Map domain names to unique lock IDs (calendar: 1001, drive: 1002, tasks: 1003). Fail fast if APP_DOMAIN not set.
**Validate Command**: `tsx packages/db/scripts/migrate.ts` (with APP_DOMAIN set)

#### DB-004-05: Add migration runner to package.json ✅
**Assigned To**: AGENT
**Target File**: `packages/db/package.json`
**Action**: Add db:migrate script that runs tsx scripts/migrate.ts. Add db:migrate:calendar, db:migrate:drive, db:migrate:tasks scripts for per-domain migrations.
**Validate Command**: `pnpm --filter @suite/db db:migrate:calendar` (with DATABASE_URL set)

#### DB-004-06: Add migration runner tests ✅
**Assigned To**: AGENT
**Target File**: `packages/db/scripts/migrate.test.ts` (create)
**Action**: Add tests for migration runner. Test advisory lock acquisition, migration application, error handling, and lock release. Test with test database.
**Validate Command**: `pnpm --filter @suite/db test`

#### DB-004-07: Update CI/CD workflow for migrations
**Assigned To**: HUMAN
**Target File**: `.github/workflows/deploy.yml`
**Action**: Add migration job before deployment job. Use APP_DOMAIN environment variable to run migrations for affected domains. Add needs: migrations dependency to deployment jobs.
**Validate Command**: Review workflow syntax

#### DB-004-08: Update domain package.json scripts ✅
**Assigned To**: AGENT
**Target File**: `packages/domain-calendar/package.json`, `packages/domain-drive/package.json`, `packages/domain-tasks/package.json`
**Action**: Add db:generate script using per-domain config. Add db:migrate script using APP_DOMAIN pattern.
**Validate Command**: `pnpm --filter @suite/domain-calendar db:generate`

#### DB-004-09: Document migration workflow
**Assigned To**: HUMAN
**Target File**: `packages/db/README.md`, `AGENTS.md`
**Action**: Update README.md to document per-domain migration workflow, CI integration, and expand/contract pattern. Update AGENTS.md to reference migration planning doc and add AI agent rules for migrations.
**Validate Command**: No validation needed

**Implementation Notes**:
- Reorganized schema files into per-domain subdirectories (calendar/, drive/, tasks/)
- Updated all imports to use new schema paths
- Created per-domain Drizzle configs with schemaFilter and tablesFilter
- Implemented migration runner with PostgreSQL advisory locks
- Added migration runner tests
- Updated domain package.json scripts for db:generate and db:migrate
- Typecheck passes, lint passes with pre-existing warnings (not related to changes)
- Tests pass (23 passed, 77 skipped due to missing DATABASE_URL)

---

### [ ] DB-005: Implement Cloudflare Workers Compatibility

**Priority**: P0
**Bounded Context**: Database Infrastructure
**Status**: Not Started

**Related Files**:
- `packages/db/src/worker-database.ts`
- `apps/calendar/api/wrangler.toml`
- `apps/tasks/api/wrangler.toml`
- `apps/drive/api/wrangler.toml`
- `packages/db/package.json`

**Definition of Done**:
- WorkerDatabase implementation uses Hyperdrive
- Hyperdrive binding configured in wrangler.toml files
- nodejs_compat flag added to wrangler.toml files
- Environment-aware factory returns WorkerDatabase in Workers
- Tests verify Workers compatibility
- Documentation updated for Workers deployment

**Out of Scope**:
- D1 database support (PostgreSQL only)
- Direct TCP connections in Workers (use Hyperdrive)
- Custom Hyperdrive caching configuration

**Rules to Follow**:
- Cloudflare Workers require nodejs_compat flag
- Use Hyperdrive for PostgreSQL connections in Workers
- postgres.js with fetch_types optimization for smaller bundles
- Environment-aware factory for Node.js vs Workers

**Advanced Coding Pattern**:
- Cloudflare Workers bindings
- Hyperdrive connection pooling
- Environment detection
- Conditional dependency loading

**Anti-Patterns**:
- Using Node.js-only postgres client in Workers
- No nodejs_compat flag
- Hard-coded connection strings
- No Hyperdrive integration

**Imports/Exports**:
- Export WorkerDatabase from packages/db/src/index.ts
- Export createDbClient factory from packages/db/src/index.ts

**Depends On**: DB-001
**Blocks**: Production deployment to Workers

**Subtasks**:

#### DB-005-01: Complete WorkerDatabase implementation
**Assigned To**: AGENT
**Target File**: `packages/db/src/worker-database.ts`
**Action**: Complete WorkerDatabase implementation using postgres.js with Hyperdrive connection string. Implement query and transaction methods. Handle Workers environment limitations (no filesystem, no Node.js APIs).
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-005-02: Add Hyperdrive binding to calendar wrangler.toml
**Assigned To**: HUMAN
**Target File**: `apps/calendar/api/wrangler.toml`
**Action**: Add hyperdrive binding configuration with HYPERDRIVE binding name and Hyperdrive ID. Add nodejs_compat flag to compatibility_flags. Set compatibility_date to current date.
**Validate Command**: `wrangler whoami` (to verify wrangler configuration)

#### DB-005-03: Add Hyperdrive binding to tasks wrangler.toml
**Assigned To**: HUMAN
**Target File**: `apps/tasks/api/wrangler.toml`
**Action**: Add hyperdrive binding configuration similar to calendar. Use unique Hyperdrive ID for tasks.
**Validate Command**: `wrangler whoami`

#### DB-005-04: Add Hyperdrive binding to drive wrangler.toml
**Assigned To**: HUMAN
**Target File**: `apps/drive/api/wrangler.toml`
**Action**: Add hyperdrive binding configuration similar to calendar. Use unique Hyperdrive ID for drive.
**Validate Command**: `wrangler whoami`

#### DB-005-05: Update factory for Workers detection
**Assigned To**: AGENT
**Target File**: `packages/db/src/index.ts`
**Action**: Update createDbClient factory to detect Workers environment. Check for globalThis.process existence or typeof window. Return WorkerDatabase if in Workers, PostgresDatabase if in Node.js.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-005-06: Add Workers compatibility tests
**Assigned To**: AGENT
**Target File**: `packages/db/src/worker-database.test.ts` (create)
**Action**: Add tests for WorkerDatabase implementation. Mock Hyperdrive binding for testing. Test query and transaction methods. Test environment detection in factory.
**Validate Command**: `pnpm --filter @suite/db test`

#### DB-005-07: Update package.json for Workers dependencies
**Assigned To**: AGENT
**Target File**: `packages/db/package.json`
**Action**: Ensure postgres.js is listed as dependency. Add @cloudflare/workers-types as devDependency if needed for TypeScript types.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-005-08: Document Workers deployment
**Assigned To**: HUMAN
**Target File**: `packages/db/README.md`
**Action**: Update README.md to document Workers deployment, Hyperdrive configuration, and differences between Node.js and Workers environments. Include wrangler.toml configuration examples.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-003: Add Key Zeroization

**Priority**: P0
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/memory.ts` (create)
- `packages/crypto/src/memory.test.ts` (create)
- `packages/crypto/src/encryption.ts`
- `packages/crypto/src/keyderivation.ts`
- `packages/crypto/src/ecdh.ts`
- `packages/crypto/src/keypair.ts`

**Definition of Done**:
- secureZeroize() function implemented for memory clearing
- Key zeroization called after key use in all modules
- Tests verify memory clearing
- Web environment limitations documented
- Security assessment updated

**Out of Scope**:
- Memory locking (mlock/VirtualLock) - not available in Web environment
- Secure memory allocators - Web environment limitations
- Hardware-based memory protection

**Rules to Follow**:
- Zeroize keys after use to prevent memory disclosure
- Document Web environment limitations for memory security
- Use volatile operations where possible to prevent optimization
- Zeroize both CryptoKey objects and raw byte arrays

**Advanced Coding Pattern**:
- Secure memory zeroization
- Resource cleanup patterns
- Web environment security limitations

**Anti-Patterns**:
- Leaving keys in memory after use
- Relying on garbage collection for security
- Assuming memory is inaccessible in Web environment

**Imports/Exports**:
- Export secureZeroize from packages/crypto/src/index.ts
- Import and use in all crypto modules

**Depends On**: CRYPTO-001
**Blocks**: Production deployment

**Subtasks**:

#### CRYPTO-003-01: Implement secureZeroize function
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/memory.ts` (create)
**Action**: Implement secureZeroize() function that accepts Uint8Array or ArrayBuffer and overwrites with zeros. Use volatile operations if possible (note: JavaScript has limited volatile support). Add JSDoc documentation explaining Web environment limitations and that this is best-effort protection.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-003-02: Export secureZeroize from index
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Add export for secureZeroize from memory.ts module.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-003-03: Add memory zeroization tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/memory.test.ts` (create)
**Action**: Add tests for secureZeroize function. Verify that byte arrays are zeroized after calling function. Test with various sizes and input types.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-003-04: Add zeroization to encryption module
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/encryption.ts`
**Action**: Review encryption.ts for any temporary key storage or intermediate values. Add secureZeroize calls after use where applicable. Note: Web Crypto API CryptoKey objects are handled by browser, focus on raw byte arrays.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-003-05: Add zeroization to key derivation module
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/keyderivation.ts`
**Action**: Review keyderivation.ts for temporary password buffers or intermediate values. Add secureZeroize calls after use where applicable.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-003-06: Document Web environment limitations
**Assigned To**: HUMAN
**Target File**: `packages/crypto/src/memory.ts`
**Action**: Add comprehensive documentation in memory.ts explaining Web environment limitations: no memory locking, garbage collector behavior, potential memory dumps, browser sandbox restrictions. Recommend using envelope encryption with KMS for sensitive applications.
**Validate Command**: No validation needed

#### CRYPTO-003-07: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark key zeroization as implemented. Remove from critical security gaps. Add to strengths section with noted limitations.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-004: Design Cryptographic Agility Architecture

**Priority**: P0
**Bounded Context**: Architecture
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/agility.ts` (create)
- `packages/crypto/src/agility.test.ts` (create)
- `packages/crypto/ASSESSMENT.md`
- `.planning/03-data-24-database-schema-reference.md`

**Definition of Done**:
- Algorithm versioning system designed and documented
- Keyset pattern for rotation support designed
- Post-quantum migration strategy documented
- PQC migration timeline documented (2028-2035)
- Implementation plan created
- Assessment updated with architecture design

**Out of Scope**:
- Implementing post-quantum algorithms (Web Crypto API does not support yet)
- Actual key rotation implementation (future task)
- Hybrid encryption implementation (future task)

**Rules to Follow**:
- Design for algorithm migration by 2028 (UK NCSC timeline)
- Support multiple active keys during rotation
- Follow Tink keyset pattern for inspiration
- Document PQC migration strategy clearly
- Maintain backward compatibility during transitions

**Advanced Coding Pattern**:
- Cryptographic agility pattern
- Keyset management
- Algorithm versioning
- Migration strategy design

**Anti-Patterns**:
- Hardcoded algorithms throughout codebase
- No migration path for algorithm updates
- Breaking changes without versioning

**Imports/Exports**:
- Design future exports for algorithm versioning
- No immediate export changes required

**Depends On**: CRYPTO-001, CRYPTO-002, CRYPTO-003
**Blocks**: CRYPTO-009, CRYPTO-012, Long-term viability

**Subtasks**:

#### CRYPTO-004-01: Design algorithm versioning system
**Assigned To**: HUMAN
**Target File**: `packages/crypto/src/agility.ts` (create)
**Action**: Design algorithm versioning system. Document: version identifiers (e.g., AES-256-GCM-v1), algorithm metadata structure, version compatibility rules, deprecation policy. Create TypeScript interfaces for algorithm metadata.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-004-02: Design keyset pattern
**Assigned To**: HUMAN
**Target File**: `packages/crypto/src/agility.ts`
**Action**: Design keyset pattern inspired by Google Tink. Document: keyset structure (primary key, active keys, deprecated keys), key rotation workflow, keyset serialization format, keyset versioning. Create TypeScript interfaces for keyset management.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-004-03: Document PQC migration strategy
**Assigned To**: HUMAN
**Target File**: `packages/crypto/PQC-MIGRATION.md` (create)
**Action**: Create comprehensive PQC migration strategy document. Include: timeline (2028-2035), hybrid encryption approach, algorithm candidates (CRYSTALS-Kyber, CRYSTALS-Dilithium), migration phases, rollback plan, testing strategy. Reference AWS and NIST guidelines.
**Validate Command**: No validation needed

#### CRYPTO-004-04: Create implementation roadmap
**Assigned To**: HUMAN
**Target File**: `packages/crypto/AGILITY-ROADMAP.md` (create)
**Action**: Create implementation roadmap for cryptographic agility. Include: Phase 1 (versioning system), Phase 2 (keyset implementation), Phase 3 (rotation utilities), Phase 4 (PQC integration). Estimate effort and dependencies.
**Validate Command**: No validation needed

#### CRYPTO-004-05: Add agility architecture tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/agility.test.ts` (create)
**Action**: Add tests for algorithm versioning interfaces and keyset structures. Test version compatibility rules, keyset validation, metadata parsing. These are unit tests for the design, not implementation.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-004-06: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to document cryptographic agility architecture design. Add to strengths section. Update PQC readiness assessment to reflect strategy.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-005: Implement Key Wrapping

**Priority**: P1
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/key-wrapping.ts` (create)
- `packages/crypto/src/key-wrapping.test.ts` (create)
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- AES-KW (RFC 3394) key wrapping implemented
- AES-KWP key wrapping with padding implemented
- Envelope encryption pattern implemented
- Tests verify key wrapping/unwrapping
- Documentation updated
- Assessment updated

**Out of Scope**:
- Hardware security module integration (future task)
- PKCS#11 key wrapping (future task)
- Custom key wrapping algorithms

**Rules to Follow**:
- Follow RFC 3394 for AES-KW implementation
- Follow RFC 5649 for AES-KWP implementation
- Use Web Crypto API where possible
- Implement envelope encryption pattern for key transport
- Maintain key hierarchy (DEK/KEK/Root)

**Advanced Coding Pattern**:
- Key wrapping algorithms
- Envelope encryption pattern
- Key hierarchy management
- Cryptographic standard compliance (RFC 3394, RFC 5649)

**Anti-Patterns**:
- Using regular encryption for key wrapping
- Storing keys in plaintext
- No key separation between data and key encryption

**Imports/Exports**:
- Export wrapKey, unwrapKey, envelopeEncrypt, envelopeDecrypt from packages/crypto/src/index.ts

**Depends On**: CRYPTO-001, CRYPTO-002, CRYPTO-003
**Blocks**: CRYPTO-006, CRYPTO-008

**Subtasks**:

#### CRYPTO-005-01: Implement AES-KW key wrapping
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-wrapping.ts` (create)
**Action**: Implement wrapKey function using AES-KW (RFC 3394). Function accepts key to wrap and wrapping key (KEK), returns wrapped key. Use Web Crypto API AES-KW if available, otherwise implement according to RFC 3394 specification.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-005-02: Implement AES-KW key unwrapping
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-wrapping.ts`
**Action**: Implement unwrapKey function using AES-KW. Function accepts wrapped key and wrapping key (KEK), returns unwrapped key. Validate integrity of wrapped key before unwrapping.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-005-03: Implement AES-KWP key wrapping with padding
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-wrapping.ts`
**Action**: Implement wrapKeyPadded function using AES-KWP (RFC 5649). Handles keys of arbitrary length with padding. Similar to AES-KW but with padding support.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-005-04: Implement AES-KWP key unwrapping
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-wrapping.ts`
**Action**: Implement unwrapKeyPadded function using AES-KWP. Handles padded keys. Validate and remove padding after unwrapping.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-005-05: Implement envelope encryption
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-wrapping.ts`
**Action**: Implement envelopeEncrypt and envelopeDecrypt functions. Pattern: generate random DEK, encrypt data with DEK, wrap DEK with KEK, return wrapped DEK + encrypted data. Reverse for decryption.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-005-06: Add key wrapping tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-wrapping.test.ts` (create)
**Action**: Add comprehensive tests for key wrapping functions. Test: wrap/unwrap round-trip, different key sizes, invalid wrapped keys, envelope encryption round-trip. Use known-answer tests if available from RFC specifications.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-005-07: Export key wrapping functions
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Export wrapKey, unwrapKey, wrapKeyPadded, unwrapKeyPadded, envelopeEncrypt, envelopeDecrypt from key-wrapping module.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-005-08: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark key wrapping as implemented. Remove from missing enterprise features. Add to strengths section.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-006: Add Key Lifecycle Management

**Priority**: P1
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/key-lifecycle.ts` (create)
- `packages/crypto/src/key-lifecycle.test.ts` (create)
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- Key versioning implemented
- Key rotation utilities implemented
- Key metadata structure defined (creation, expiration, status)
- Crypto-shredding implemented
- Tests verify lifecycle operations
- Documentation updated
- Assessment updated

**Out of Scope**:
- Automatic key rotation scheduling (application-level)
- Key backup/recovery (application-level)
- Key escrow (application-level)

**Rules to Follow**:
- Keys must have version identifiers
- Keys must have metadata (creation, expiration, status)
- Deprecated keys must be marked but not immediately deleted
- Crypto-shredding must securely delete keys
- Support multiple active keys during rotation

**Advanced Coding Pattern**:
- Key lifecycle management
- Versioned key storage
- Metadata-driven key operations
- Secure deletion patterns

**Anti-Patterns**:
- Keys without version or metadata
- Immediate deletion of deprecated keys
- No key rotation support
- Insecure key deletion

**Imports/Exports**:
- Export KeyMetadata interface, createKeyMetadata, rotateKey, deactivateKey, cryptoShredKey from packages/crypto/src/index.ts

**Depends On**: CRYPTO-004, CRYPTO-005
**Blocks**: CRYPTO-008

**Subtasks**:

#### CRYPTO-006-01: Define key metadata structure
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-lifecycle.ts` (create)
**Action**: Define KeyMetadata interface with fields: id, version, algorithm, createdAt, expiresAt, status (active, deprecated, revoked), usage (encrypt, decrypt, sign, verify). Add validation functions for metadata.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-006-02: Implement key versioning
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-lifecycle.ts`
**Action**: Implement createKeyMetadata function that generates unique key ID and version. Implement incrementVersion function for key rotation. Ensure versioning is monotonic.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-006-03: Implement key rotation utilities
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-lifecycle.ts`
**Action**: Implement rotateKey function that creates new key version, marks old version as deprecated, maintains both active during transition period. Implement getActiveKey function to retrieve current active key.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-006-04: Implement crypto-shredding
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-lifecycle.ts`
**Action**: Implement cryptoShredKey function that securely deletes key material. For CryptoKey objects, mark as non-extractable if possible. For raw byte arrays, use secureZeroize. Update key metadata status to shredded.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-006-05: Add key lifecycle tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-lifecycle.test.ts` (create)
**Action**: Add tests for key lifecycle operations. Test: metadata creation, version increment, key rotation, active key retrieval, crypto-shredding, status transitions. Test edge cases: expired keys, revoked keys, multiple active keys.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-006-06: Export key lifecycle functions
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Export KeyMetadata interface, createKeyMetadata, rotateKey, deactivateKey, cryptoShredKey, getActiveKey from key-lifecycle module.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-006-07: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark key lifecycle management as implemented. Remove from missing enterprise features. Add to strengths section.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-007: Improve Error Handling

**Priority**: P1
**Bounded Context**: Developer Experience
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/errors.ts` (create)
- `packages/crypto/src/errors.test.ts` (create)
- `packages/crypto/src/encryption.ts`
- `packages/crypto/src/keyderivation.ts`
- `packages/crypto/src/ecdh.ts`
- `packages/crypto/src/keypair.ts`
- `packages/crypto/src/serialization.ts`
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- Error codes and taxonomy defined
- Detailed error messages implemented
- Error classification (retriable vs non-retriable)
- Error context (operation, algorithm, key ID)
- All crypto modules use new error system
- Tests verify error handling
- Documentation updated
- Assessment updated

**Out of Scope**:
- Error logging (separate concern)
- Error monitoring/integration (separate concern)
- Custom error serialization (use standard Error)

**Rules to Follow**:
- Define clear error codes for each error type
- Include context in error messages (operation, algorithm)
- Classify errors as retriable or non-retriable
- Use standard Error class with custom properties
- Maintain backward compatibility where possible

**Advanced Coding Pattern**:
- Error taxonomy design
- Contextual error handling
- Error classification patterns
- Developer-friendly error messages

**Anti-Patterns**:
- Generic error messages without context
- Throwing strings instead of Error objects
- No error classification
- Missing error context

**Imports/Exports**:
- Export CryptoError class, error codes, error utilities from packages/crypto/src/index.ts

**Depends On**: None
**Blocks**: None

**Subtasks**:

#### CRYPTO-007-01: Define error codes and taxonomy
**Assigned To**: HUMAN
**Target File**: `packages/crypto/src/errors.ts` (create)
**Action**: Define error code constants for each error type: ENCRYPTION_FAILED, DECRYPTION_FAILED, KEY_GENERATION_FAILED, KEY_DERIVATION_FAILED, INVALID_KEY, INVALID_ALGORITHM, etc. Define error categories: RETRIABLE, NON_RETRIABLE.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-007-02: Implement CryptoError class
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/errors.ts`
**Action**: Implement CryptoError class extending Error. Include properties: code, message, context (operation, algorithm, keyId), category (retriable/non-retriable), timestamp. Implement constructor and helper methods.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-007-03: Update encryption module error handling
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/encryption.ts`
**Action**: Replace generic error throws with CryptoError instances. Include context: operation (encrypt/decrypt), algorithm (AES-GCM). Use appropriate error codes.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-007-04: Update key derivation module error handling
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/keyderivation.ts`
**Action**: Replace generic error throws with CryptoError instances. Include context: operation (deriveKey), algorithm (PBKDF2). Use appropriate error codes.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-007-05: Update ECDH module error handling
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/ecdh.ts`
**Action**: Replace generic error throws with CryptoError instances. Include context: operation (deriveSharedSecret), algorithm (X25519). Use appropriate error codes.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-007-06: Update keypair module error handling
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/keypair.ts`
**Action**: Replace generic error throws with CryptoError instances. Include context: operation (generateKeyPair), algorithm (X25519). Use appropriate error codes.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-007-07: Update serialization module error handling
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/serialization.ts`
**Action**: Replace generic error throws with CryptoError instances. Include context: operation (serialize/deserialize), format (JWK/raw). Use appropriate error codes.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-007-08: Add error handling tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/errors.test.ts` (create)
**Action**: Add tests for CryptoError class and error codes. Test error creation, context inclusion, error classification, error message formatting. Test each module's error handling with invalid inputs.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-007-09: Export error handling utilities
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Export CryptoError class, error codes, isRetriable helper function from errors module.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-007-10: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark improved error handling as implemented. Remove from missing enterprise features. Add to strengths section.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-008: Add WebAssembly Backend

**Priority**: P1
**Bounded Context**: Infrastructure
**Status**: Not Started

**Related Files**:
- `packages/crypto/package.json`
- `packages/crypto/src/index.ts`
- `packages/crypto/src/wasm-backend.ts` (create)
- `packages/crypto/src/wasm-backend.test.ts` (create)
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- libsodium.js integrated as optional dependency
- Argon2id password hashing implemented via WASM
- Feature flags for WASM backend
- Hybrid Web Crypto + WASM approach documented
- Tests verify WASM backend when enabled
- Documentation updated
- Assessment updated

**Out of Scope**:
- Replacing Web Crypto API entirely (keep as primary)
- Implementing all crypto operations in WASM (only advanced features)
- Post-quantum algorithms via WASM (future task)

**Rules to Follow**:
- Keep Web Crypto API as primary implementation
- Use WASM only for advanced features not available in Web Crypto
- Provide feature flags to enable/disable WASM backend
- Maintain small bundle size for default configuration
- Document when to use each backend

**Advanced Coding Pattern**:
- Optional dependency management
- Feature flag pattern
- Backend abstraction layer
- Hybrid architecture

**Anti-Patterns**:
- Forcing WASM backend for all operations
- Large bundle size by default
- No fallback to Web Crypto API
- Unclear when to use which backend

**Imports/Exports**:
- Export argon2idHash, isWasmAvailable, enableWasmBackend from packages/crypto/src/index.ts

**Depends On**: CRYPTO-001, CRYPTO-002, CRYPTO-003
**Blocks**: CRYPTO-012

**Subtasks**:

#### CRYPTO-008-01: Add libsodium.js as optional dependency
**Assigned To**: HUMAN
**Target File**: `packages/crypto/package.json`
**Action**: Add libsodium.js as optional dependency in package.json. Use optionalDependencies field to avoid forcing installation. Document that this is optional for advanced features.
**Validate Command**: `pnpm install` (to verify package.json syntax)

#### CRYPTO-008-02: Implement WASM backend detection
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/wasm-backend.ts` (create)
**Action**: Implement isWasmAvailable() function that checks if libsodium.js is available and WebAssembly is supported. Return boolean. Handle import errors gracefully.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-008-03: Implement Argon2id via WASM
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/wasm-backend.ts`
**Action**: Implement argon2idHash function using libsodium.js if available. Function accepts password, salt, iterations, memory, parallelism. Returns derived key. Fallback to PBKDF2 if WASM not available.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-008-04: Implement feature flag for WASM backend
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/wasm-backend.ts`
**Action**: Implement enableWasmBackend() function that sets a flag to use WASM backend when available. Implement disableWasmBackend() to force Web Crypto API only. Add state management.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-008-05: Add WASM backend tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/wasm-backend.test.ts` (create)
**Action**: Add tests for WASM backend. Test: WASM detection, Argon2id hashing, feature flag behavior, fallback to Web Crypto. Skip tests if libsodium.js not installed.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-008-06: Export WASM backend functions
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Export argon2idHash, isWasmAvailable, enableWasmBackend, disableWasmBackend from wasm-backend module. Only export if module exists (optional dependency).
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-008-07: Document hybrid approach
**Assigned To**: HUMAN
**Target File**: `packages/crypto/WASM-BACKEND.md` (create)
**Action**: Create documentation for hybrid Web Crypto + WASM approach. Explain: when to use WASM backend, bundle size implications, feature flags, fallback behavior, Argon2id benefits. Provide usage examples.
**Validate Command**: No validation needed

#### CRYPTO-008-08: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark WebAssembly backend as implemented. Update WebAssembly assessment section. Add to strengths section with noted trade-offs.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-009: Add KMS Integration

**Priority**: P2
**Bounded Context**: Enterprise
**Status**: Not Started

**Related Files**:
- `packages/crypto/package.json`
- `packages/crypto/src/index.ts`
- `packages/crypto/src/kms.ts` (create)
- `packages/crypto/src/kms.test.ts` (create)
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- AWS KMS integration implemented
- Azure Key Vault integration implemented
- GCP KMS integration implemented
- Envelope encryption with KMS implemented
- Tests verify KMS operations (with mocks)
- Documentation updated
- Assessment updated

**Out of Scope**:
- On-premises KMS integration
- Custom KMS implementations
- KMS key management (use cloud provider consoles)

**Rules to Follow**:
- Use official SDKs for each cloud provider
- Implement envelope encryption pattern with KMS
- Support external key references
- Mock KMS operations for testing
- Document credential management

**Advanced Coding Pattern**:
- Cloud provider integration
- Envelope encryption with external KMS
- SDK abstraction layer
- Mock-based testing for external services

**Anti-Patterns**:
- Hardcoding cloud provider credentials
- No envelope encryption (direct KMS operations)
- Tightly coupled to single cloud provider
- No fallback for KMS unavailability

**Imports/Exports**:
- Export KMS client interfaces, envelopeEncryptWithKMS, envelopeDecryptWithKMS from packages/crypto/src/index.ts

**Depends On**: CRYPTO-005, CRYPTO-007
**Blocks**: CRYPTO-011

**Subtasks**:

#### CRYPTO-009-01: Add KMS SDK dependencies
**Assigned To**: HUMAN
**Target File**: `packages/crypto/package.json`
**Action**: Add AWS SDK v3, Azure SDK, GCP SDK as optional dependencies. Use optionalDependencies field. Document that these are optional for KMS integration.
**Validate Command**: `pnpm install` (to verify package.json syntax)

#### CRYPTO-009-02: Define KMS client interface
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/kms.ts` (create)
**Action**: Define KMSClient interface with methods: encrypt, decrypt, generateKey. Define KMSConfig interface with provider type and credentials. Create factory function to instantiate provider-specific clients.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-009-03: Implement AWS KMS client
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/kms.ts`
**Action**: Implement AWSKMSClient class implementing KMSClient interface. Use AWS SDK v3. Implement encrypt, decrypt, generateKey methods. Handle errors with CryptoError.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-009-04: Implement Azure Key Vault client
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/kms.ts`
**Action**: Implement AzureKeyVaultClient class implementing KMSClient interface. Use Azure SDK. Implement encrypt, decrypt, generateKey methods. Handle errors with CryptoError.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-009-05: Implement GCP KMS client
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/kms.ts`
**Action**: Implement GCPKMSClient class implementing KMSClient interface. Use GCP SDK. Implement encrypt, decrypt, generateKey methods. Handle errors with CryptoError.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-009-06: Implement envelope encryption with KMS
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/kms.ts`
**Action**: Implement envelopeEncryptWithKMS and envelopeDecryptWithKMS functions. Use KMS to encrypt/encrypt DEK, use DEK to encrypt/decrypt data. Follow envelope encryption pattern.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-009-07: Add KMS integration tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/kms.test.ts` (create)
**Action**: Add tests for KMS integration. Mock all SDK calls. Test: client factory, envelope encryption round-trip, error handling, provider-specific behavior. Skip tests if SDKs not installed.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-009-08: Export KMS integration functions
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Export KMSClient interface, KMSConfig, createKMSClient, envelopeEncryptWithKMS, envelopeDecryptWithKMS from kms module. Only export if module exists (optional dependencies).
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-009-09: Document KMS integration
**Assigned To**: HUMAN
**Target File**: `packages/crypto/KMS-INTEGRATION.md` (create)
**Action**: Create documentation for KMS integration. Explain: supported providers, credential management, envelope encryption pattern, usage examples, testing with mocks. Provide configuration examples.
**Validate Command**: No validation needed

#### CRYPTO-009-10: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark KMS integration as implemented. Remove from missing enterprise features. Add to strengths section.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-010: Expand Testing Coverage

**Priority**: P2
**Bounded Context**: Testing
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.test.ts`
- `packages/crypto/src/encryption.test.ts`
- `packages/crypto/src/keyderivation.test.ts`
- `packages/crypto/src/ecdh.test.ts`
- `packages/crypto/src/keypair.test.ts`
- `packages/crypto/src/serialization.test.ts`
- `packages/crypto/src/blind-index.test.ts`
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- Known-answer tests (KATs) added for all algorithms
- Browser compatibility tests added
- Performance benchmarks added
- Side-channel resistance tests added
- Post-quantum migration test scenarios added
- Coverage thresholds met (90% lines, 90% functions, 85% branches, 90% statements)
- Assessment updated

**Out of Scope**:
- Testing third-party library code
- Testing Web Crypto API implementation
- Fuzzing infrastructure (separate project)

**Rules to Follow**:
- Use known-answer tests from NIST/algorithm specifications
- Test browser compatibility with feature detection
- Benchmark performance with realistic data sizes
- Test side-channel resistance with timing analysis
- Document test coverage

**Advanced Coding Pattern**:
- Known-answer testing
- Performance benchmarking
- Compatibility testing
- Side-channel testing

**Anti-Patterns**:
- Only testing happy path
- No performance regression detection
- No browser compatibility verification
- Missing edge case coverage

**Imports/Exports**:
- No export changes

**Depends On**: CRYPTO-001, CRYPTO-002, CRYPTO-003, CRYPTO-005, CRYPTO-006, CRYPTO-007
**Blocks**: None

**Subtasks**:

#### CRYPTO-010-01: Add known-answer tests for AES-GCM
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/encryption.test.ts`
**Action**: Add known-answer tests for AES-256-GCM using NIST test vectors. Test encryption/decryption with known plaintext, key, IV, and ciphertext. Verify exact match.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-02: Add known-answer tests for PBKDF2
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/keyderivation.test.ts`
**Action**: Add known-answer tests for PBKDF2-SHA256 using RFC 7914 test vectors. Test key derivation with known password, salt, iterations, and output key.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-03: Add known-answer tests for X25519
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/ecdh.test.ts`
**Action**: Add known-answer tests for X25519 using RFC 7748 test vectors. Test key generation and shared secret derivation with known inputs and outputs.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-04: Add known-answer tests for HKDF
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/ecdh.test.ts`
**Action**: Add known-answer tests for HKDF-SHA256 using RFC 5869 test vectors. Test key derivation with known inputs and outputs.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-05: Add known-answer tests for HMAC-SHA256
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/blind-index.test.ts`
**Action**: Add known-answer tests for HMAC-SHA256 using RFC 2104 test vectors. Test HMAC computation with known key, message, and output.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-06: Add browser compatibility tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.test.ts`
**Action**: Add tests to verify Web Crypto API features are available. Test: AES-GCM support, X25519 support, PBKDF2 support, HKDF support. Skip tests if features not available. Document browser support matrix.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-07: Add performance benchmarks
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/benchmark.test.ts` (create)
**Action**: Add performance benchmarks for crypto operations. Benchmark: encryption/decryption (various data sizes), key derivation, key generation, ECDH. Use vitest benchmark feature. Establish baseline performance.
**Validate Command**: `pnpm --filter @suite/crypto test --benchmark`

#### CRYPTO-010-08: Add side-channel resistance tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/constant-time.test.ts`
**Action**: Add tests to verify constant-time comparison has consistent timing. Note: accurate timing measurement difficult in test environment, focus on algorithm correctness and document limitations.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-09: Add post-quantum migration test scenarios
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/agility.test.ts`
**Action**: Add test scenarios for post-quantum migration. Test: algorithm versioning, keyset rotation, hybrid encryption pattern (mock PQC algorithms), backward compatibility during migration.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-010-10: Verify coverage thresholds
**Assigned To**: AGENT
**Target File**: Root directory
**Action**: Run coverage report to verify all thresholds are met (90% lines, 90% functions, 85% branches, 90% statements). Review coverage report for any remaining gaps. Add tests for uncovered code.
**Validate Command**: `pnpm --filter @suite/crypto test --coverage`

#### CRYPTO-010-11: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark expanded testing as implemented. Update testing assessment section. Document coverage percentages.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-011: Add Audit Logging

**Priority**: P2
**Bounded Context**: Enterprise
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/audit.ts` (create)
- `packages/crypto/src/audit.test.ts` (create)
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- Optional audit logging interface implemented
- Key creation logging implemented
- Key usage logging implemented
- Key deletion logging implemented
- Security event tracking implemented
- SIEM integration documented
- Tests verify audit logging
- Documentation updated
- Assessment updated

**Out of Scope**:
- Actual log storage (application-level concern)
- Log aggregation (use external SIEM)
- Real-time alerting (separate concern)

**Rules to Follow**:
- Audit logging should be optional (disabled by default)
- Log key lifecycle events (creation, usage, deletion)
- Log security events (failed operations, suspicious activity)
- Support custom log handlers for SIEM integration
- Do not log sensitive data (keys, plaintext)

**Advanced Coding Pattern**:
- Optional logging interface
- Event-driven logging
- SIEM integration patterns
- Privacy-preserving logging

**Anti-Patterns**:
- Logging sensitive data
- No option to disable logging
- Performance impact from logging
- No SIEM integration path

**Imports/Exports**:
- Export AuditLogger interface, createAuditLogger, logKeyEvent, logSecurityEvent from packages/crypto/src/index.ts

**Depends On**: CRYPTO-006, CRYPTO-007
**Blocks**: None

**Subtasks**:

#### CRYPTO-011-01: Define audit logging interface
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/audit.ts` (create)
**Action**: Define AuditLogger interface with methods: logKeyCreated, logKeyUsed, logKeyDeleted, logSecurityEvent. Define AuditEvent interface with fields: timestamp, eventType, keyId, operation, metadata. Create factory function for custom log handlers.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-011-02: Implement console audit logger
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/audit.ts`
**Action**: Implement ConsoleAuditLogger class implementing AuditLogger interface. Log events to console with structured format. Include timestamp, event type, and metadata. Redact sensitive data.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-011-03: Implement key lifecycle logging
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/key-lifecycle.ts`
**Action**: Add audit logging calls to key lifecycle functions. Log: key creation (createKeyMetadata), key usage (getActiveKey), key deletion (cryptoShredKey). Use optional audit logger if provided.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-011-04: Implement security event logging
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/errors.ts`
**Action**: Add audit logging calls to error handling. Log: failed operations, invalid keys, suspicious activity patterns. Use optional audit logger if provided.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-011-05: Add audit logging tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/audit.test.ts` (create)
**Action**: Add tests for audit logging. Test: console logger output, custom log handler, key lifecycle logging, security event logging, sensitive data redaction.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-011-06: Export audit logging functions
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Export AuditLogger interface, ConsoleAuditLogger, createAuditLogger, setAuditLogger from audit module.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-011-07: Document SIEM integration
**Assigned To**: HUMAN
**Target File**: `packages/crypto/AUDIT-LOGGING.md` (create)
**Action**: Create documentation for SIEM integration. Explain: custom log handler implementation, event format, SIEM integration examples (Splunk, Datadog, ELK), privacy considerations.
**Validate Command**: No validation needed

#### CRYPTO-011-08: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark audit logging as implemented. Remove from missing enterprise features. Add to strengths section.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-012: Add Post-Quantum Algorithm Support

**Priority**: P2
**Bounded Context**: Future-Proofing
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/pqc.ts` (create)
- `packages/crypto/src/pqc.test.ts` (create)
- `packages/crypto/PQC-MIGRATION.md`
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- CRYSTALS-Kyber key exchange implemented (via WASM)
- Hybrid encryption pattern implemented
- Web Crypto API PQC support monitored
- PQC algorithm versioning implemented
- Tests verify PQC operations
- Documentation updated
- Assessment updated

**Out of Scope**:
- Implementing PQC algorithms from scratch (use libsodium or similar)
- CRYSTALS-Dilithium signatures (future task)
- Replacing classical algorithms (hybrid approach only)

**Rules to Follow**:
- Monitor Web Crypto API for PQC support
- Use hybrid encryption (classical + PQC) for migration
- Implement via WebAssembly (libsodium or similar)
- Maintain backward compatibility
- Follow NIST PQC standardization progress

**Advanced Coding Pattern**:
- Hybrid encryption pattern
- Post-quantum algorithm integration
- WebAssembly polyfill pattern
- Migration path design

**Anti-Patterns**:
- Replacing classical algorithms entirely
- No hybrid approach during migration
- Ignoring NIST standardization status
- Breaking existing encryption

**Imports/Exports**:
- Export kyberKeyExchange, hybridEncrypt, hybridDecrypt, isPQCSupported from packages/crypto/src/index.ts

**Depends On**: CRYPTO-004, CRYPTO-008
**Blocks**: None

**Subtasks**:

#### CRYPTO-012-01: Monitor Web Crypto API PQC support
**Assigned To**: HUMAN
**Target File**: `packages/crypto/PQC-MIGRATION.md` (update)
**Action**: Research and document current Web Crypto API support for post-quantum algorithms. Monitor browser implementation status. Update PQC-MIGRATION.md with current status and timeline.
**Validate Command**: No validation needed

#### CRYPTO-012-02: Implement CRYSTALS-Kyber via WASM
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/pqc.ts` (create)
**Action**: Implement kyberKeyExchange function using WebAssembly backend (libsodium or similar PQC library). Generate key pair, encapsulate, decapsulate. Handle errors with CryptoError.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-012-03: Implement hybrid encryption pattern
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/pqc.ts`
**Action**: Implement hybridEncrypt and hybridDecrypt functions. Pattern: encrypt with classical algorithm (AES-GCM) and PQC algorithm (Kyber), combine ciphertexts. Decrypt with both algorithms. Provide fallback if PQC not available.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-012-04: Add PQC algorithm versioning
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/pqc.ts`
**Action**: Integrate PQC algorithms into cryptographic agility architecture. Add algorithm identifiers for Kyber, Dilithium. Support versioning for PQC algorithms as they evolve.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-012-05: Add PQC tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/pqc.test.ts` (create)
**Action**: Add tests for PQC operations. Test: Kyber key exchange, hybrid encryption round-trip, fallback to classical only, algorithm versioning. Skip tests if WASM backend not available.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-012-06: Export PQC functions
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Export kyberKeyExchange, hybridEncrypt, hybridDecrypt, isPQCSupported from pqc module. Only export if module exists (WASM dependency).
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-012-07: Update PQC migration documentation
**Assigned To**: HUMAN
**Target File**: `packages/crypto/PQC-MIGRATION.md` (update)
**Action**: Update PQC-MIGRATION.md with implementation status. Document: available PQC algorithms, hybrid encryption usage, migration timeline, performance considerations.
**Validate Command**: No validation needed

#### CRYPTO-012-08: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark post-quantum algorithm support as implemented. Update PQC readiness assessment. Add to strengths section.
**Validate Command**: No validation needed

---

### [ ] DEP-012: Add CI Migration Script with APP_DOMAIN

**Priority**: P0
**Bounded Context**: CI/CD

**Related Files**:
- `package.json`
- `.github/workflows/ci.yml`
- `AGENTS.md`

**Definition of Done**:
- CI workflow runs migrations with APP_DOMAIN set before tests
- Migration script added to package.json
- AGENTS.md rule 5 compliance documented

**Out of Scope**:
- Local development migration scripts
- Multi-environment migration strategies

**Rules to Follow**:
- AGENTS.md rule 5: Migrations run in CI, never in Workers
- Use APP_DOMAIN=<domain> pnpm db:migrate for migrations
- Never call migrate() inside a Worker
- Never run drizzle-kit push in staging or production

**Depends On**: None
**Blocks**: Production deployment

**Subtasks**:

#### DEP-012-01: Add migration script to package.json
**Target File**: `package.json`
**Action**: Add db:migrate script that uses APP_DOMAIN environment variable.
**Validate Command**: `pnpm typecheck`

#### DEP-012-02: Update CI workflow to run migrations
**Target File**: `.github/workflows/ci.yml`
**Action**: Add migration step before test step that sets APP_DOMAIN and runs pnpm db:migrate.
**Validate Command**: Review workflow syntax

#### DEP-012-03: Test migration script locally
**Target File**: None
**Action**: Run migration script locally with APP_DOMAIN set to verify it works correctly.
**Validate Command**: `APP_DOMAIN=localhost pnpm db:migrate`

#### DEP-012-04: Document AGENTS.md rule 5 compliance
**Target File**: `AGENTS.md`
**Action**: Update AGENTS.md rule 5 to document CI migration script implementation.
**Validate Command**: No validation needed

---

### [ ] DEP-013: Complete Encryption Verification Test

**Priority**: P1
**Bounded Context**: Testing

**Related Files**:
- `packages/domain-calendar/src/lib/calendar-events.test.ts`

**Definition of Done**:
- Test verifies repository stores ciphertext for encrypted calendar events
- TODO comment removed after implementation
- Encryption verification complete

**Out of Scope**:
- Other calendar domain tests (already comprehensive)
- Encryption implementation (already done)

**Rules to Follow**:
- TDD - write test before implementation
- Integration test with database verification

**Depends On**: DEP-002 (E2EE Encryption Activation)
**Blocks**: None

**Subtasks**:

#### DEP-013-01: Implement encryption verification test
**Target File**: `packages/domain-calendar/src/lib/calendar-events.test.ts:275`
**Action**: Implement test that verifies repository stores ciphertext when encryption is enabled. Remove TODO comment.
**Validate Command**: `pnpm --filter @suite/domain-calendar test`

---

### [ ] DEP-014: Improve Auth Client Test Coverage

**Priority**: P2
**Bounded Context**: Testing

**Related Files**:
- `packages/auth/src/index.test.ts`

**Definition of Done**:
- Comprehensive tests for auth client methods (signIn, signUp, signOut)
- Session management tests added
- Test coverage improved

**Out of Scope**:
- Better Auth library internals
- Custom authentication logic (use Better Auth)

**Rules to Follow**:
- TDD - write tests for all public methods
- Mock-based unit testing

**Depends On**: None
**Blocks**: None

**Subtasks**:

#### DEP-014-01: Add signIn method test
**Target File**: `packages/auth/src/index.test.ts`
**Action**: Add test for signIn method with success and error cases.
**Validate Command**: `pnpm --filter @suite/auth test`

#### DEP-014-02: Add signUp method test
**Target File**: `packages/auth/src/index.test.ts`
**Action**: Add test for signUp method with success and error cases.
**Validate Command**: `pnpm --filter @suite/auth test`

#### DEP-014-03: Add signOut method test
**Target File**: `packages/auth/src/index.test.ts`
**Action**: Add test for signOut method.
**Validate Command**: `pnpm --filter @suite/auth test`

#### DEP-014-04: Add session management test
**Target File**: `packages/auth/src/index.test.ts`
**Action**: Add test for session persistence and retrieval.
**Validate Command**: `pnpm --filter @suite/auth test`

---

### [ ] DEP-015: Fix Cloudflare Workers Auth Instance Pattern

**Priority**: P0
**Bounded Context**: Infrastructure
**Status**: Not Started

**Related Files**:
- `packages/auth/src/server.ts`
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`
- `apps/calendar/api/wrangler.toml`
- `apps/tasks/api/wrangler.toml`
- `apps/drive/api/wrangler.toml`

**Definition of Done**:
- Auth instance created per-request instead of singleton
- Auth instance stored in Hono context
- D1 database binding passed to auth instance
- SQLite write lock conflicts eliminated
- 503 errors from D1 binding conflicts resolved
- Local development 33-second hangs eliminated

**Out of Scope**:
- Migrating from PostgreSQL to D1 (keep external PostgreSQL)
- Changing authentication logic (only instance lifecycle)

**Rules to Follow**:
- Cloudflare Workers best practices for D1 bindings
- One auth instance per request, always
- Store auth instance on Hono context with c.set()
- Pass waitUntil for background tasks
- Disable cookieCache due to better-auth#4203

**Advanced Coding Pattern**:
- Per-request resource instantiation
- Context-based dependency injection
- Factory function pattern for auth instance creation

**Anti-Patterns**:
- Module-level singleton auth instance
- Multiple Drizzle wrappers around same D1 binding
- Shared state across requests

**Imports/Exports**:
- Export createAuth factory function from packages/auth/src/server.ts
- Import createAuth in API index files
- Use c.get('auth') to retrieve instance in middleware

**Depends On**: None
**Blocks**: DEP-016, DEP-017, DEP-018, Production deployment

**Subtasks**:

#### DEP-015-01: Refactor auth to factory function
**Target File**: `packages/auth/src/server.ts`
**Action**: Refactor auth singleton to createAuth factory function that accepts env and db parameters. Export createAuth instead of auth. Maintain all existing configuration options.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-015-02: Add KV binding to wrangler.toml files
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Add KV namespace binding for auth secondary storage and rate limiting. Use AUTH_KV as binding name.
**Validate Command**: `wrangler whoami` (to verify wrangler configuration)

#### DEP-015-03: Configure secondary storage with KV
**Target File**: `packages/auth/src/server.ts`
**Action**: Add secondaryStorage configuration using KV binding with 60-second minimum TTL (Math.max(ttl, 60)). Implement get/set/delete operations with error handling.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-015-04: Configure rate limit with custom KV storage
**Target File**: `packages/auth/src/server.ts`
**Action**: Add rateLimit.customStorage configuration using KV binding with hardcoded 60-second TTL. Separate rate limit data from session data.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-015-05: Add waitUntil for background tasks
**Target File**: `packages/auth/src/server.ts`
**Action**: Add advanced.backgroundTasks.handler configuration to accept waitUntil callback. Pass this to createAuth factory.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-015-06: Disable cookieCache
**Target File**: `packages/auth/src/server.ts`
**Action**: Set session.storeSessionInDatabase to true to disable cookieCache due to better-auth#4203 bug.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-015-07: Update calendar API to use per-request auth
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add middleware to create auth instance per request using createAuth(env, db). Store in context with c.set('auth', auth). Pass waitUntil from env. Update mountAuth to use c.get('auth').
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`

#### DEP-015-08: Update tasks API to use per-request auth
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add middleware to create auth instance per request using createAuth(env, db). Store in context with c.set('auth', auth). Pass waitUntil from env. Update mountAuth to use c.get('auth').
**Validate Command**: `pnpm --filter @suite/tasks-api typecheck`

#### DEP-015-09: Update drive API to use per-request auth
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add middleware to create auth instance per request using createAuth(env, db). Store in context with c.set('auth', auth). Pass waitUntil from env. Update mountAuth to use c.get('auth').
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

#### DEP-015-10: Test auth instance pattern locally
**Target File**: Local development environment
**Action**: Run local development server and verify no SQLite write lock conflicts occur. Test multiple concurrent requests. Verify no 33-second hangs.
**Validate Command**: `pnpm dev` (manual testing)

#### DEP-015-11: Update auth package exports
**Target File**: `packages/auth/src/index.ts`
**Action**: Update exports to export createAuth factory function instead of auth singleton. Maintain backward compatibility if needed.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-015-12: Document Cloudflare Workers auth pattern
**Target File**: `README.md` or `docs/auth-cloudflare-workers.md` (create)
**Action**: Document Cloudflare Workers auth pattern including: per-request instance creation, KV storage configuration, waitUntil usage, and common pitfalls.
**Validate Command**: No validation needed

---

### [ ] DEP-016: Add CSRF Protection Configuration

**Priority**: P0
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/auth/src/server.ts`
- `packages/env-config/src/calendar.ts`
- `packages/env-config/src/tasks.ts`
- `packages/env-config/src/drive.ts`
- `.env.example`

**Definition of Done**:
- trustedOrigins configured in auth instance
- TRUSTED_ORIGINS environment variable added to env-config
- Origins validated on all requests
- Open redirect attacks prevented
- CSRF attacks prevented

**Out of Scope**:
- Custom CSRF token implementation (Better Auth handles this)
- Dynamic origin validation without allowlist

**Rules to Follow**:
- Better Auth security best practices
- Origin validation for all requests
- Allowlist approach for trusted origins
- Include localhost origins for development

**Advanced Coding Pattern**:
- Environment-based configuration
- Security by allowlist
- Defense in depth (multiple CSRF protections)

**Anti-Patterns**:
- Wildcard origins
- Missing origin validation
- Trusting all same-origin requests

**Imports/Exports**:
- Import TRUSTED_ORIGINS from env-config
- Pass to betterAuth advanced.trustedOrigins

**Depends On**: DEP-015
**Blocks**: Production deployment

**Subtasks**:

#### DEP-016-01: Add TRUSTED_ORIGINS to env-config
**Target File**: `packages/env-config/src/calendar.ts`, `packages/env-config/src/tasks.ts`, `packages/env-config/src/drive.ts`
**Action**: Add TRUSTED_ORIGINS environment variable to each env-config schema. Type as optional string that can be comma-separated list of origins.
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-016-02: Configure trustedOrigins in auth
**Target File**: `packages/auth/src/server.ts`
**Action**: Add advanced.trustedOrigins configuration to createAuth factory. Parse TRUSTED_ORIGINS from env and split by comma. Default to localhost origins for development.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-016-03: Update .env.example with TRUSTED_ORIGINS
**Target File**: `.env.example`
**Action**: Add TRUSTED_ORIGINS environment variable with example values for localhost and production domains.
**Validate Command**: No validation needed

#### DEP-016-04: Test CSRF protection
**Target File**: Local development environment
**Action**: Test that requests from untrusted origins are blocked. Test that requests from trusted origins are allowed. Verify origin header validation works.
**Validate Command**: Manual testing with curl or Postman

#### DEP-016-05: Document CSRF protection
**Target File**: `README.md` or `docs/security.md` (create)
**Action**: Document CSRF protection implementation including trustedOrigins configuration, how to add new origins, and security benefits.
**Validate Command**: No validation needed

---

### [ ] DEP-017: Configure Cloudflare IP Headers

**Priority**: P0
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/auth/src/server.ts`

**Definition of Done**:
- cf-connecting-ip header configured for IP detection
- IP address spoofing prevented
- Rate limiting uses accurate IP addresses
- Security monitoring uses accurate IP addresses

**Out of Scope**:
- Custom IP header validation
- IP geolocation (future enhancement)

**Rules to Follow**:
- Cloudflare Workers best practices
- Use cf-connecting-ip header for accurate IP detection
- Prevent IP spoofing via header forgery

**Advanced Coding Pattern**:
- Trusted proxy header configuration
- Security-aware IP detection

**Anti-Patterns**:
- Using X-Forwarded-For without validation
- Trusting client-provided IP headers

**Imports/Exports**:
- None (configuration only)

**Depends On**: DEP-015
**Blocks**: Production deployment

**Subtasks**:

#### DEP-017-01: Configure cf-connecting-ip header
**Target File**: `packages/auth/src/server.ts`
**Action**: Add advanced.ipAddress.ipAddressHeaders configuration to use ['cf-connecting-ip'] for accurate IP detection in Cloudflare Workers.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-017-02: Enable trusted proxy headers
**Target File**: `packages/auth/src/server.ts`
**Action**: Add advanced.trustedProxyHeaders configuration set to true to derive base URL from X-Forwarded-Host and X-Forwarded-Proto headers.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-017-03: Test IP header configuration
**Target File**: Local development environment
**Action**: Test that IP addresses are correctly detected from cf-connecting-ip header. Verify rate limiting uses correct IPs.
**Validate Command**: Manual testing with curl or Postman

#### DEP-017-04: Document IP header configuration
**Target File**: `README.md` or `docs/security.md` (create)
**Action**: Document IP header configuration including cf-connecting-ip usage, trusted proxy headers, and security benefits.
**Validate Command**: No validation needed

---

### [ ] DEP-018: Remove Default BETTER_AUTH_SECRET

**Priority**: P0
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/env-config/src/calendar.ts`
- `packages/env-config/src/tasks.ts`
- `packages/env-config/src/drive.ts`
- `packages/auth/src/index.test.ts`

**Definition of Done**:
- Default BETTER_AUTH_SECRET removed from env-config
- BETTER_AUTH_SECRET required at runtime
- Production deployment fails without secret
- Development requires explicit secret configuration

**Out of Scope**:
- Secret rotation implementation (future enhancement)
- Multi-environment secret management

**Rules to Follow**:
- Never use predictable default secrets
- Require explicit secret configuration
- Fail fast if secret not configured

**Advanced Coding Pattern**:
- Fail-fast security validation
- Environment-based configuration

**Anti-Patterns**:
- Predictable default secrets
- Silent failures on missing secrets

**Imports/Exports**:
- None (configuration only)

**Depends On**: DEP-001-02
**Blocks**: Production deployment

**Subtasks**:

#### DEP-018-01: Remove default BETTER_AUTH_SECRET from calendar env-config
**Target File**: `packages/env-config/src/calendar.ts`
**Action**: Remove .default('dev-secret-change-in-production-32chars') from BETTER_AUTH_SECRET schema. Make it required.
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-018-02: Remove default BETTER_AUTH_SECRET from tasks env-config
**Target File**: `packages/env-config/src/tasks.ts`
**Action**: Remove .default('dev-secret-change-in-production-32chars') from BETTER_AUTH_SECRET schema. Make it required.
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-018-03: Remove default BETTER_AUTH_SECRET from drive env-config
**Target File**: `packages/env-config/src/drive.ts`
**Action**: Remove .default('dev-secret-change-in-production-32chars') from BETTER_AUTH_SECRET schema. Make it required.
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-018-04: Update auth package tests
**Target File**: `packages/auth/src/index.test.ts`
**Action**: Update tests to set BETTER_AUTH_SECRET environment variable before running tests. Remove dependency on default value.
**Validate Command**: `pnpm --filter @suite/auth test`

#### DEP-018-05: Update .env.example with BETTER_AUTH_SECRET generation
**Target File**: `.env.example`
**Action**: Update BETTER_AUTH_SECRET comment to include generation command: openssl rand -base64 32
**Validate Command**: No validation needed

#### DEP-018-06: Test secret requirement
**Target File**: Local development environment
**Action**: Test that application fails to start without BETTER_AUTH_SECRET set. Verify error message is clear.
**Validate Command**: `pnpm dev` (should fail without secret)

---

### [ ] DEP-019: Install Organization Plugin for Multi-Tenancy

**Priority**: P1
**Bounded Context**: Multi-Tenancy
**Status**: Not Started

**Related Files**:
- `packages/auth/package.json`
- `packages/auth/src/server.ts`
- `packages/db/src/schema/users.ts`
- `packages/db/drizzle.config.ts`
- `packages/env-config/src/calendar.ts`
- `packages/env-config/src/tasks.ts`
- `packages/env-config/src/drive.ts`

**Definition of Done**:
- Organization plugin installed and configured
- Organization tables added to database schema
- Organization client plugin added
- Database migration run
- Multi-tenant authentication working
- Organization switching functional

**Out of Scope**:
- Custom organization UI (future enhancement)
- Advanced permission system (start with basic roles)
- Team management (can be enabled later)

**Rules to Follow**:
- Better Auth organization plugin best practices
- Multi-tenant data isolation
- Role-based access control (RBAC)
- Organization-scoped resources

**Advanced Coding Pattern**:
- Plugin-based architecture
- Multi-tenant data modeling
- RBAC implementation

**Anti-Patterns**:
- Shared data across organizations
- Missing tenant isolation
- Hardcoded roles

**Imports/Exports**:
- Import organization from better-auth/plugins
- Import organizationClient from better-auth/client/plugins
- Export from packages/auth/src/index.ts

**Depends On**: DEP-015, DEP-016, DEP-017, DEP-018
**Blocks**: DEP-020, DEP-021, Production multi-tenancy

**Subtasks**:

#### DEP-019-01: Install organization plugin
**Target File**: `packages/auth/package.json`
**Action**: Add better-auth to dependencies if not already present. Organization plugin is included in better-auth core package.
**Validate Command**: `pnpm install`

#### DEP-019-02: Add organization plugin to server config
**Target File**: `packages/auth/src/server.ts`
**Action**: Import organization from better-auth/plugins. Add organization() to plugins array in createAuth factory. Configure appName for issuer.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-019-03: Add organization client plugin
**Target File**: `packages/auth/src/client.ts`
**Action**: Import organizationClient from better-auth/client/plugins. Add organizationClient() to plugins array in createAuthClient.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-019-04: Export organization client utilities
**Target File**: `packages/auth/src/index.ts`
**Action**: Export organization client utilities (createOrganization, getActiveOrganization, etc.) from packages/auth/src/index.ts for use in applications.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-019-05: Generate organization schema
**Target File**: Root directory
**Action**: Run better-auth schema generation to create organization tables (organizations, members, invitations, teams if enabled).
**Validate Command**: `npx auth generate`

#### DEP-019-06: Run database migration
**Target File**: Root directory
**Action**: Run database migration to add organization tables to PostgreSQL database.
**Validate Command**: `APP_DOMAIN=localhost pnpm db:migrate`

#### DEP-019-07: Add organizationId to users table
**Target File**: `packages/db/src/schema/users.ts`
**Action**: Add optional organizationId column to users table for default organization assignment. Add foreign key to organizations table.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DEP-019-08: Create migration for organizationId column
**Target File**: `packages/db/drizzle`
**Action**: Create Drizzle migration to add organizationId column to users table.
**Validate Command**: `pnpm db:generate`

#### DEP-019-09: Update env-config for organization features
**Target File**: `packages/env-config/src/calendar.ts`, `packages/env-config/src/tasks.ts`, `packages/env-config/src/drive.ts`
**Action**: Add environment variables for organization features if needed (e.g., ENABLE_ORGANIZATIONS boolean flag).
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-019-10: Test organization creation
**Target File**: Local development environment
**Action**: Test organization creation via API. Verify organization tables are populated correctly. Test member addition.
**Validate Command**: Manual testing with API client

#### DEP-019-11: Document organization plugin usage
**Target File**: `README.md` or `docs/multi-tenancy.md` (create)
**Action**: Document organization plugin usage including: creating organizations, adding members, role management, and organization switching.
**Validate Command**: No validation needed

---

### [ ] DEP-020: Implement Role-Based Access Control

**Priority**: P1
**Bounded Context**: Authorization
**Status**: Not Started

**Related Files**:
- `packages/auth/src/server.ts`
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Organization roles defined (admin, member, viewer)
- Permission checks implemented in API routes
- Role-based resource access enforced
- Organization-scoped queries implemented

**Out of Scope**:
- Custom permission system (use organization plugin built-in)
- Team-level permissions (future enhancement)
- Dynamic roles (use static roles for MVP)

**Rules to Follow**:
- Better Auth organization plugin RBAC
- Least privilege principle
- Organization-scoped data access
- Role-based route protection

**Advanced Coding Pattern**:
- Declarative authorization
- Permission-based access control
- Organization context propagation

**Anti-Patterns**:
- Hardcoded user checks
- Missing organization scoping
- Admin bypass mechanisms

**Imports/Exports**:
- Import hasPermission from organization client
- Use in API middleware

**Depends On**: DEP-019
**Blocks**: Production multi-tenancy

**Subtasks**:

#### DEP-020-01: Define organization roles
**Target File**: `packages/auth/src/server.ts`
**Action**: Configure organization plugin with default roles: admin (full access), member (read/write), viewer (read-only). Define permissions for each role.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-020-02: Add permission check middleware
**Target File**: `packages/auth/src/middleware.ts` (update)
**Action**: Create requirePermission middleware that checks user has required permission in active organization. Use organization client hasPermission method.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-020-03: Export permission middleware
**Target File**: `packages/auth/src/index.ts`
**Action**: Export requirePermission middleware from packages/auth/src/index.ts for use in applications.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-020-04: Add organization scoping to calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Update calendar API routes to scope queries by organizationId from auth context. Add permission checks for write operations.
**Validate Command**: `pnpm --filter @suite/calendar-api test`

#### DEP-020-05: Add organization scoping to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Update tasks API routes to scope queries by organizationId from auth context. Add permission checks for write operations.
**Validate Command**: `pnpm --filter @suite/tasks-api test`

#### DEP-020-06: Add organization scoping to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Update drive API routes to scope queries by organizationId from auth context. Add permission checks for write operations.
**Validate Command**: `pnpm --filter @suite/drive-api test`

#### DEP-020-07: Test RBAC implementation
**Target File**: Local development environment
**Action**: Test that users with different roles have appropriate access levels. Test permission enforcement on protected routes.
**Validate Command**: Manual testing with API client

#### DEP-020-08: Document RBAC usage
**Target File**: `README.md` or `docs/authorization.md` (create)
**Action**: Document RBAC implementation including: role definitions, permission checks, organization scoping, and how to add custom permissions.
**Validate Command**: No validation needed

---

### [ ] DEP-021: Install Audit Logging Plugin

**Priority**: P1
**Bounded Context**: Compliance
**Status**: Not Started

**Related Files**:
- `packages/auth/package.json`
- `packages/auth/src/server.ts`
- `.env.example`

**Definition of Done**:
- @better-auth/infra package installed
- dash plugin configured
- Audit logs collected automatically
- 30+ tracked events monitored
- Audit log query API available

**Out of Scope**:
- Custom audit logging implementation (use Better Auth Infrastructure)
- Self-hosted audit log storage (use Better Auth Infrastructure)

**Rules to Follow**:
- Better Auth Infrastructure dash plugin
- GDPR compliance requirements
- SOC 2 audit trail requirements
- Security event monitoring

**Advanced Coding Pattern**:
- Plugin-based infrastructure
- Automatic event tracking
- Compliance-ready logging

**Anti-Patterns**:
- Manual audit logging
- Missing security events
- Incomplete event tracking

**Imports/Exports**:
- Import dash from @better-auth/infra
- Add to plugins array

**Depends On**: DEP-015
**Blocks**: Production compliance

**Subtasks**:

#### DEP-021-01: Install @better-auth/infra package
**Target File**: `packages/auth/package.json`
**Action**: Add @better-auth/infra to dependencies.
**Validate Command**: `pnpm install`

#### DEP-021-02: Add dash plugin to server config
**Target File**: `packages/auth/src/server.ts`
**Action**: Import dash from @better-auth/infra. Add dash() to plugins array in createAuth factory. Configure API key if using paid tier.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-021-03: Add BETTER_AUTH_DASH_API_KEY to env-config
**Target File**: `packages/env-config/src/calendar.ts`, `packages/env-config/src/tasks.ts`, `packages/env-config/src/drive.ts`
**Action**: Add BETTER_AUTH_DASH_API_KEY environment variable to env-config schemas. Make optional for free tier.
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-021-04: Update .env.example with DASH_API_KEY
**Target File**: `.env.example`
**Action**: Add BETTER_AUTH_DASH_API_KEY environment variable with comment about optional usage for paid features.
**Validate Command**: No validation needed

#### DEP-021-05: Test audit logging
**Target File**: Local development environment
**Action**: Test that audit events are collected on sign-up, sign-in, and other actions. Verify events appear in Better Auth dashboard (if API key configured).
**Validate Command**: Manual testing

#### DEP-021-06: Document audit logging
**Target File**: `README.md` or `docs/compliance.md` (create)
**Action**: Document audit logging implementation including: tracked events, query API, compliance benefits, and pricing tiers.
**Validate Command**: No validation needed

---

### [ ] DEP-022: Add OAuth Sign-In Providers

**Priority**: P1
**Bounded Context**: Authentication
**Status**: Not Started

**Related Files**:
- `packages/auth/src/server.ts`
- `packages/auth/src/client.ts`
- `packages/env-config/src/calendar.ts`
- `packages/env-config/src/tasks.ts`
- `packages/env-config/src/drive.ts`
- `.env.example`

**Definition of Done**:
- Google OAuth sign-in configured
- GitHub OAuth sign-in configured
- OAuth client methods available
- Account linking functional
- OAuth sign-in tested

**Out of Scope**:
- Other OAuth providers (start with Google and GitHub)
- Custom OAuth provider implementation

**Rules to Follow**:
- Better Auth social providers configuration
- OAuth 2.0 best practices
- Secure client secret management
- Account linking for multiple providers

**Advanced Coding Pattern**:
- Plugin-based OAuth integration
- Environment-based provider configuration
- Account linking strategy

**Anti-Patterns**:
- Hardcoded OAuth credentials
- Missing PKCE (Better Auth handles this)
- Insecure secret storage

**Imports/Exports**:
- Configure socialProviders in server.ts
- OAuth methods available via authClient

**Depends On**: DEP-015, DEP-016, DEP-017, DEP-018
**Blocks**: Production OAuth sign-in

**Subtasks**:

#### DEP-022-01: Add Google OAuth to env-config
**Target File**: `packages/env-config/src/calendar.ts`, `packages/env-config/src/tasks.ts`, `packages/env-config/src/drive.ts`
**Action**: Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables to env-config schemas.
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-022-02: Add GitHub OAuth to env-config
**Target File**: `packages/env-config/src/calendar.ts`, `packages/env-config/src/tasks.ts`, `packages/env-config/src/drive.ts`
**Action**: Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables to env-config schemas.
**Validate Command**: `pnpm --filter @suite/env-config typecheck`

#### DEP-022-03: Configure Google OAuth in auth server
**Target File**: `packages/auth/src/server.ts`
**Action**: Add google provider to socialProviders configuration in createAuth factory. Use GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from env.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-022-04: Configure GitHub OAuth in auth server
**Target File**: `packages/auth/src/server.ts`
**Action**: Add github provider to socialProviders configuration in createAuth factory. Use GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET from env.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-022-05: Update .env.example with OAuth credentials
**Target File**: `.env.example`
**Action**: Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET with comments about OAuth app setup.
**Validate Command**: No validation needed

#### DEP-022-06: Test Google OAuth sign-in
**Target File**: Local development environment
**Action**: Test Google OAuth sign-in flow. Verify user account creation and session establishment.
**Validate Command**: Manual testing

#### DEP-022-07: Test GitHub OAuth sign-in
**Target File**: Local development environment
**Action**: Test GitHub OAuth sign-in flow. Verify user account creation and session establishment.
**Validate Command**: Manual testing

#### DEP-022-08: Test account linking
**Target File**: Local development environment
**Action**: Test that users can link multiple OAuth providers to single account. Verify account linking works correctly.
**Validate Command**: Manual testing

#### DEP-022-09: Document OAuth setup
**Target File**: `README.md` or `docs/oauth-setup.md` (create)
**Action**: Document OAuth provider setup including: Google Cloud Console setup, GitHub OAuth app setup, environment variables, and usage instructions.
**Validate Command**: No validation needed

---

### [ ] DEP-023: Add Two-Factor Authentication

**Priority**: P1
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/auth/src/server.ts`
- `packages/auth/src/client.ts`

**Definition of Done**:
- Two-factor plugin installed and configured
- TOTP authenticator app support
- Backup codes generation
- Trusted devices support
- 2FA enforced for admin accounts

**Out of Scope**:
- SMS OTP (future enhancement)
- Email OTP (future enhancement)
- Hardware keys (future enhancement)

**Rules to Follow**:
- Better Auth two-factor plugin best practices
- TOTP standard implementation
- Secure backup code storage
- 2FA for sensitive operations

**Advanced Coding Pattern**:
- Plugin-based 2FA
- TOTP time-based codes
- Recovery mechanism with backup codes

**Anti-Patterns**:
- Weak backup codes
- Missing 2FA enforcement
- Insecure TOTP secret storage

**Imports/Exports**:
- Import twoFactor from better-auth/plugins
- Import twoFactorClient from better-auth/client/plugins

**Depends On**: DEP-015, DEP-016, DEP-017, DEP-018
**Blocks**: Production 2FA

**Subtasks**:

#### DEP-023-01: Add two-factor plugin to server config
**Target File**: `packages/auth/src/server.ts`
**Action**: Import twoFactor from better-auth/plugins. Add twoFactor() to plugins array in createAuth factory. Configure appName as issuer.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-023-02: Add two-factor client plugin
**Target File**: `packages/auth/src/client.ts`
**Action**: Import twoFactorClient from better-auth/client/plugins. Add twoFactorClient() to plugins array in createAuthClient.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-023-03: Generate 2FA schema
**Target File**: Root directory
**Action**: Run better-auth schema generation to create two-factor tables (two_factor_verification, backup_codes).
**Validate Command**: `npx auth generate`

#### DEP-023-04: Run database migration
**Target File**: Root directory
**Action**: Run database migration to add 2FA tables to PostgreSQL database.
**Validate Command**: `APP_DOMAIN=localhost pnpm db:migrate`

#### DEP-023-05: Export 2FA client utilities
**Target File**: `packages/auth/src/index.ts`
**Action**: Export 2FA client utilities (enableTwoFactor, verifyTwoFactor, generateBackupCodes) from packages/auth/src/index.ts.
**Validate Command**: `pnpm --filter @suite/auth typecheck`

#### DEP-023-06: Test TOTP setup
**Target File**: Local development environment
**Action**: Test TOTP setup flow including QR code generation, authenticator app scanning, and code verification.
**Validate Command**: Manual testing

#### DEP-023-07: Test backup codes
**Target File**: Local development environment
**Action**: Test backup code generation and verification. Verify backup codes work when TOTP unavailable.
**Validate Command**: Manual testing

#### DEP-023-08: Document 2FA implementation
**Target File**: `README.md` or `docs/security.md` (create)
**Action**: Document 2FA implementation including: TOTP setup, backup codes, trusted devices, and admin account enforcement.
**Validate Command**: No validation needed

---

## P2 - Medium/Low Priority Tasks

### [!] P2-006: Add Image Optimization

**Priority**: P2
**Bounded Context**: Web Performance
**Status**: Blocked

**Related Files**:
- `apps/drive/web/src/components/FilePreview.tsx` (create)
- `apps/drive/web/src/App.tsx`

**Definition of Done**:
- Images loaded lazily
- Images resized to display dimensions
- WebP format preferred
- Responsive images with srcset
- Placeholder while loading

**Out of Scope**:
- Image CDN integration
- Client-side image processing

**Block Reason**: FilePreview.tsx does not exist and no image preview feature exists to optimize. Task assumes image preview UI that hasn't been built yet.

**Subtasks**:

#### P2-006-01: Add lazy loading to drive image preview
**Target File**: `apps/drive/web/src/components/FilePreview.tsx`
**Action**: Add loading="lazy" to img elements; implement Intersection Observer for advanced lazy loading
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P2-006-02: Add responsive images to drive
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Add srcset to image elements for responsive sizing
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

---

### [!] P2-013: Add Graceful Shutdown

**Priority**: P2
**Bounded Context**: API
**Status**: Blocked

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Block Reason**: Task assumes traditional Node.js server with SIGTERM handling. Cloudflare Workers are serverless with no SIGTERM signals, no application-managed connection pools (D1 bindings are runtime-managed), and automatic 30-second grace period for in-flight requests. Graceful shutdown is handled by the Cloudflare runtime, not application code.

**Subtasks**:

#### P2-013-01: Add graceful shutdown to calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add SIGTERM handler that stops accepting new requests, waits for in-flight requests, closes DB connections
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`

#### P2-013-02: Add graceful shutdown to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add SIGTERM handler that stops accepting new requests, waits for in-flight requests, closes DB connections
**Validate Command**: `pnpm --filter @suite/tasks-api typecheck`

#### P2-013-03: Add graceful shutdown to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add SIGTERM handler that stops accepting new requests, waits for in-flight requests, closes DB connections
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

---

### [!] P2-018: Add Response Compression

**Priority**: P2
**Bounded Context**: API Performance
**Status**: Blocked

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Block Reason**: Cloudflare Workers automatically compress responses with Brotli and gzip. Manual compression middleware is unnecessary and would add overhead without benefit.

**Definition of Done**:
- Compression middleware mounted
- Gzip compression enabled
- Compress responses > 1KB
- Accept-Encoding header honored
- Compression level configurable

**Out of Scope**:
- Brotli compression
- Dynamic compression level

**Rules to Follow**:
- Handle shutdown signals
- Complete in-flight work

**Advanced Pattern**:
- Graceful shutdown with timeout
- Connection pool draining

**Anti-Patterns**:
- Immediate process exit
- Unclosed connections

**Depends On**: None
**Blocks**: None
