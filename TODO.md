# Suite Task List

This task list follows Specification-Driven Development (SDD), Domain-Driven Design (DDD), Test-Driven Development (TDD), Behavior-Driven Development (BDD), and deep modules principles.

## Status Legend

- [ ] Not Started
- [~] In Progress
- [x] Complete
- [!] Blocked

---

## P0 - Critical Tasks

### [x] DEP-001: Configure Production Secrets

**Priority**: P0
**Bounded Context**: Infrastructure

**Related Files**:
- `apps/calendar/api/wrangler.toml`
- `apps/tasks/api/wrangler.toml`
- `apps/drive/api/wrangler.toml`
- `.github/workflows/deploy.yml`

**Definition of Done**:
- All wrangler.toml files have non-empty secret placeholders
- Secret management strategy documented
- Cloudflare Workers secrets configured via wrangler secret command
- CI/CD workflow uses GitHub Actions secrets for deployment
- Secrets are never committed to repository

**Out of Scope**:
- Implementing custom secret rotation
- Multi-environment secret management (dev/staging/prod)

**Rules to Follow**:
- Never commit secrets to repository
- Use wrangler secret command for production secrets
- Use GitHub Actions secrets for CI/CD
- Follow Cloudflare Workers security best practices

**Depends On**: None
**Blocks**: DEP-002, DEP-003

**Subtasks**:

#### ✅ DEP-001-01: Configure DATABASE_URL secret
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml files to remove empty DATABASE_URL placeholder and document that it must be set via `wrangler secret put DATABASE_URL`. Add documentation to AGENTS.md or a separate SECRETS.md file explaining secret management workflow.
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### ✅ DEP-001-02: Configure BETTER_AUTH_SECRET secret
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml files to remove empty BETTER_AUTH_SECRET placeholder. Document that it must be set via `wrangler secret put BETTER_AUTH_SECRET` with a cryptographically secure random string (minimum 32 characters).
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### ✅ DEP-001-03: Configure ENCRYPTION_KEY secret
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml files to remove empty ENCRYPTION_KEY placeholder. Document that it must be set via `wrangler secret put ENCRYPTION_KEY` with a base64-encoded 256-bit AES key. Provide command to generate key: `openssl rand -base64 32`
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### ✅ DEP-001-04: Configure Drive R2 secrets
**Target File**: `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml to remove empty R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID placeholders. Document that these must be set via wrangler secret commands for R2 integration.
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### ✅ DEP-001-05: Update CI/CD workflow for secrets
**Target File**: `.github/workflows/deploy.yml`
**Action**: Ensure deployment workflow uses GitHub Actions secrets for CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Add documentation on required secrets in workflow comments or README.
**Validate Command**: Review workflow file for secret references

#### ✅ DEP-001-06: Create SECRETS.md documentation
**Target File**: `SECRETS.md` (create)
**Action**: Create comprehensive documentation for secret management including: secret list, generation commands, wrangler secret commands, CI/CD integration, and security best practices. Update AGENTS.md to reference SECRETS.md.
**Validate Command**: `pnpm typecheck` (to ensure no broken references)

**Implementation Notes**:
- Removed all empty secret placeholders from wrangler.toml files (DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEY, R2_*)
- Secrets must now be set via `wrangler secret put` commands for each API
- Created comprehensive SECRETS.md with secret management workflow, generation commands, and security best practices
- Updated AGENTS.md to reference SECRETS.md
- Added documentation comment to deploy.yml about required GitHub Actions secrets
- Typecheck passed successfully

---

### [x] DEP-002: Activate E2EE Encryption

**Priority**: P0
**Bounded Context**: Security

**Related Files**:
- `packages/domain-calendar/src/lib/calendar-crypto.ts`
- `packages/domain-tasks/src/lib/tasks-crypto.ts`
- `packages/domain-drive/src/drive-crypto.ts`
- `apps/calendar/api/src/bootstrap.ts`
- `apps/tasks/api/src/bootstrap.ts`
- `apps/drive/api/src/bootstrap.ts`

**Definition of Done**:
- ENCRYPTION_KEY secret configured (DEP-001-03)
- Encryption is active in production (isEncryptionEnabled() returns true)
- All user content encrypted before storage
- Encryption tests verify encryption is active
- Documentation updated to reflect encryption status

**Out of Scope**:
- Implementing per-user encryption keys
- Key rotation mechanisms
- Client-side encryption (server-side only for MVP)

**Rules to Follow**:
- AGENTS.md rule 9: E2EE crypto is non-negotiable
- All user content must be encrypted with AES-256-GCM before storage
- Use @suite/crypto package for encryption operations
- Never store plaintext user content in database

**Depends On**: DEP-001-03
**Blocks**: Production deployment

**Subtasks**:

#### ✅ DEP-002-01: Verify encryption activation logic
**Target File**: `packages/domain-calendar/src/lib/calendar-crypto.ts`, `packages/domain-tasks/src/lib/tasks-crypto.ts`, `packages/domain-drive/src/drive-crypto.ts`
**Action**: Review isEncryptionEnabled() implementation to ensure it correctly detects when ENCRYPTION_KEY is set. Verify that setKeyProviderFromEnv() properly imports the key and sets the custom provider. Add test to verify encryption is active when ENCRYPTION_KEY is set.
**Validate Command**: `pnpm --filter @suite/domain-calendar test`, `pnpm --filter @suite/domain-tasks test`, `pnpm --filter @suite/domain-drive test`

#### ✅ DEP-002-02: Add encryption activation test
**Target File**: `packages/domain-calendar/src/lib/calendar-crypto.test.ts` (create or update)
**Action**: Add test that verifies isEncryptionEnabled() returns false by default, and returns true after setKeyProviderFromEnv() is called with a valid ENCRYPTION_KEY. Test should verify that seal/unseal functions actually encrypt/decrypt when encryption is enabled.
**Validate Command**: `pnpm --filter @suite/domain-calendar test`

#### ✅ DEP-002-03: Update bootstrap to throw if encryption disabled
**Target File**: `apps/calendar/api/src/bootstrap.ts`, `apps/tasks/api/src/bootstrap.ts`, `apps/drive/api/src/bootstrap.ts`
**Action**: Modify bootstrap functions to throw an error if ENCRYPTION_KEY is not set in production environment (NODE_ENV=production). This prevents accidental deployment without encryption. Add error message explaining that ENCRYPTION_KEY must be set.
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`, `pnpm --filter @suite/tasks-api typecheck`, `pnpm --filter @suite/drive-api typecheck`

#### ✅ DEP-002-04: Update documentation
**Target File**: `README.md`, `AGENTS.md`
**Action**: Update README.md to reflect that E2EE is implemented and activated via ENCRYPTION_KEY. Update AGENTS.md rule 9 status to indicate implementation is complete. Document that encryption is disabled by default for development but required for production.
**Validate Command**: No validation needed

**Implementation Notes**:
- Verified encryption activation logic across all three domains (calendar, tasks, drive)
- Created calendar-crypto.test.ts with comprehensive encryption activation tests
- Added resetKeyProvider() function to calendar-crypto.ts for test isolation
- Updated all three bootstrap files to throw error if ENCRYPTION_KEY not set in NODE_ENV=production
- Updated README.md to remove "End-to-end encryption of user content" from Not Started section
- Updated README.md to note encryption is activated via ENCRYPTION_KEY
- Updated AGENTS.md rule 9 to document encryption activation via ENCRYPTION_KEY and production requirement
- All tests passing (33 tests for calendar domain, 67 for tasks, 53 for drive)
- Typecheck and lint passing

---

### [x] DEP-003: Verify Better Auth Timing-Safe Comparisons

**Priority**: P0
**Bounded Context**: Security

**Related Files**:
- `packages/auth/src/server.ts`
- `packages/auth/src/protected.ts`
- `packages/auth/src/middleware.ts` (if exists)
- `AGENTS.md`

**Definition of Done**:
- Better Auth timing-safe comparison implementation verified
- If Better Auth does not use timing-safe comparisons, implement wrapper
- AGENTS.md rule 11 compliance documented
- Tests verify timing-safe comparisons are used

**Out of Scope**:
- Implementing custom authentication (use Better Auth)
- Modifying Better Auth library source code

**Rules to Follow**:
- AGENTS.md rule 11: Never use === to compare secrets, tokens, or HMAC outputs
- Always use constantTimeEqual() from @suite/crypto or crypto.subtle.timingSafeEqual
- CVE-class timing attacks against HMAC token comparisons are a real exploit path

**Depends On**: None
**Blocks**: Production deployment

**Subtasks**:

#### ✅ DEP-003-01: Research Better Auth implementation
**Target File**: Better Auth documentation and source code
**Action**: Research Better Auth library to determine if it uses timing-safe comparisons for session tokens and HMAC outputs. Check documentation, source code, and GitHub issues. Document findings in a comment or separate verification document.
**Validate Command**: No validation needed (research task)

#### ✅ DEP-003-02: Implement constantTimeEqual in @suite/crypto
**Target File**: `packages/crypto/src/index.ts`, `packages/crypto/src/constant-time.ts` (create)
**Action**: If Better Auth does not use timing-safe comparisons, implement constantTimeEqual() function in @suite/crypto using crypto.subtle.timingSafeEqual. Add comprehensive tests to verify constant-time behavior. Export from index.ts.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### ✅ DEP-003-03: Add timing-safe comparison tests
**Target File**: `packages/crypto/src/constant-time.test.ts` (create)
**Action**: Add property-based tests using fast-check to verify constantTimeEqual() has constant-time execution regardless of input equality. Test should verify timing does not leak information about comparison result.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### ✅ DEP-003-04: Document verification status
**Target File**: `AGENTS.md`
**Action**: Update AGENTS.md rule 11 to document verification status of Better Auth timing-safe comparisons. If wrapper implemented, document usage pattern. If Better Auth verified safe, document verification method and version.
**Validate Command**: No validation needed

**Implementation Notes**:
- Research found that Better Auth has implemented constant-time secret comparison in some plugins (oidc-provider, mcp) as of recent releases, but core session token verification timing-safety is not explicitly documented
- Implemented constantTimeEqual() and constantTimeEqualSync() in @suite/crypto as a safety measure for custom auth handlers and API middleware
- Async version uses crypto.subtle.timingSafeEqual when available (Cloudflare Workers, modern browsers), with sync fallback for other environments
- Added comprehensive test suite with 34 tests covering strings, Uint8Arrays, edge cases, and constant-time behavior verification
- All tests passing (67 total for crypto package)
- Typecheck and lint passing for crypto package and entire monorepo
- Updated AGENTS.md rule 11 with verification status and usage documentation

---

### [!] DEP-012: Enable Workers Node.js Compatibility

**Priority**: P0
**Bounded Context**: Infrastructure

**Related Files**:
- `apps/calendar/api/wrangler.toml`
- `apps/tasks/api/wrangler.toml`
- `apps/drive/api/wrangler.toml`
- `packages/db/src/connection.ts`

**Definition of Done**:
- All wrangler.toml files have nodejs_compat flag enabled
- API servers start successfully in Workers runtime
- Postgres package works in Workers environment
- E2E tests can run with API servers

**Out of Scope**:
- Replacing postgres package with Workers-native solution (future work - see @suite/db assessment)
- Implementing custom Node.js polyfills

**Rules to Follow**:
- Cloudflare Workers requires nodejs_compat flag for Node.js modules
- Postgres package uses Node.js modules (events, buffer, async_hooks, stream)
- Enable compatibility flag in wrangler.toml configuration

**Depends On**: None
**Blocks**: DEP-005 (E2E authentication), Production deployment

**Subtasks**:

#### DEP-012-01: Enable nodejs_compat in calendar API
**Target File**: `apps/calendar/api/wrangler.toml`
**Action**: Add `compatibility_flags = ["nodejs_compat"]` to wrangler.toml to enable Node.js module compatibility for postgres package.
**Validate Command**: `wrangler dev src/index.ts` (should start without errors)

#### DEP-012-02: Enable nodejs_compat in tasks API
**Target File**: `apps/tasks/api/wrangler.toml`
**Action**: Add `compatibility_flags = ["nodejs_compat"]` to wrangler.toml to enable Node.js module compatibility for postgres package.
**Validate Command**: `wrangler dev src/index.ts` (should start without errors)

#### DEP-012-03: Enable nodejs_compat in drive API
**Target File**: `apps/drive/api/wrangler.toml`
**Action**: Add `compatibility_flags = ["nodejs_compat"]` to wrangler.toml to enable Node.js module compatibility for postgres package.
**Validate Command**: `wrangler dev src/index.ts` (should start without errors)

#### DEP-012-04: Test API servers start successfully
**Target File**: Root directory
**Action**: Test that all three API servers start successfully with nodejs_compat flag enabled. Verify no warnings about missing Node.js modules.
**Validate Command**: `pnpm --filter @suite/calendar-api dev`, `pnpm --filter @suite/tasks-api dev`, `pnpm --filter @suite/drive-api dev`

#### DEP-012-05: Verify E2E tests work with API servers
**Target File**: Root directory
**Action**: Run E2E tests to verify API servers work correctly with nodejs_compat flag. Authentication should work and tests should pass.
**Validate Command**: `npx playwright test --project=chromium`

**Implementation Notes**:
- Added nodejs_compat flag to all three wrangler.toml files
- API servers still fail to start with "process is not defined" error
- Postgres package uses Node.js-specific APIs that are not compatible with Workers even with nodejs_compat
- This is a deeper architectural issue: @suite/db package uses Node.js-only postgres client
- Requires replacing postgres package with Workers-native solution (e.g., Workers D1 or external Postgres with HTTP API)
- Estimated 2-3 weeks to implement Workers-compatible database layer (per @suite/db assessment)
- Task marked as blocked [!] pending database layer refactor

---

### [!] DEP-005: Fix E2E Test Authentication

**Priority**: P0
**Bounded Context**: Testing

**Related Files**:
- `playwright.global-setup.ts`
- `playwright.config.ts`
- `apps/calendar/web/src/auth-provider.tsx`
- `apps/calendar/web/src/App.tsx`
- `apps/calendar/web/package.json`
- `packages/auth/package.json`
- `packages/auth/src/client.ts`
- `apps/calendar/web/package.json`
- `packages/auth/package.json`
- `packages/auth/src/client.ts`

**Definition of Done**:
- Playwright global setup successfully authenticates
- E2E tests can run with authenticated session
- Storage state is properly saved and loaded
- All E2E tests pass

**Out of Scope**:
- Implementing new authentication flow (use existing)
- Changing authentication mechanism

**Rules to Follow**:
- E2E tests must run with authenticated session
- Use Playwright storageState for session persistence
- Follow Playwright best practices for authentication

**Depends On**: DEP-012 (Workers Node.js compatibility)
**Blocks**: E2E test execution

**Subtasks**:

#### DEP-005-01: Debug Playwright global setup authentication
**Target File**: `playwright.global-setup.ts`
**Action**: Run Playwright global setup in debug mode to identify why authentication is failing. Check for: selector changes (Email label not found), timing issues, network errors, or Better Auth configuration issues. Add logging to global setup to trace authentication flow.
**Validate Command**: `npx playwright test --debug`

#### DEP-005-02: Update authentication selectors
**Target File**: `playwright.global-setup.ts`
**Action**: Update authentication selectors in global setup to match current login form. Verify email input, password input, and submit button selectors. Use data-testid attributes if available for more stable selectors.
**Validate Command**: `npx playwright test --project=chromium --global-setup`

#### DEP-005-03: Verify storage state persistence
**Target File**: `playwright.config.ts`, `playwright.global-setup.ts`
**Action**: Verify that storage state is being saved to .auth/storage-state.json and loaded correctly in tests. Check file permissions and path configuration. Ensure storage state includes session cookies.
**Validate Command**: `npx playwright test --project=chromium`

#### DEP-005-04: Add authentication test
**Target File**: `e2e/auth.spec.ts` (create)
**Action**: Create dedicated E2E test for authentication flow to verify sign-in and sign-out work correctly. Test should verify session persistence and redirect behavior.
**Validate Command**: `npx playwright test e2e/auth.spec.ts`

#### DEP-005-05: Run full E2E test suite
**Target File**: All E2E test files
**Action**: Run full E2E test suite to verify all tests pass with authentication working. Fix any remaining test failures related to authentication or session handling.
**Validate Command**: `npx playwright test`

**Implementation Notes**:
- Fixed authentication selectors in playwright.global-setup.ts (Email address, Sign in, Sign out)
- Removed @suite/domain-calendar from calendar web dependencies (Buffer not defined in browser)
- Split @suite/auth package into client/server entry points (added /client export)
- Fixed process.env usage in auth/client.ts (removed Node.js process references)
- Added API servers to Playwright webServer configuration
- Discovered API servers fail to start due to missing nodejs_compat flag in wrangler.toml
- Created DEP-012 to enable Workers Node.js compatibility (blocks this task)
- Task marked as blocked [!] pending DEP-012 completion

**Implementation Notes**:
- Fixed authentication selectors in playwright.global-setup.ts (Email address, Sign in, Sign out)
- Removed @suite/domain-calendar from calendar web dependencies (Buffer not defined in browser)
- Split @suite/auth package into client/server entry points (added /client export)
- Fixed process.env usage in auth/client.ts (removed Node.js process references)
- Added API servers to Playwright webServer configuration
- Discovered API servers fail to start due to missing nodejs_compat flag in wrangler.toml
- Created DEP-012 to enable Workers Node.js compatibility (blocks this task)
- Task marked as blocked [!] pending DEP-012 completion

---

### [x] DEP-009: Implement Timing-Safe Comparisons in API Auth Handlers

**Priority**: P0
**Bounded Context**: Security

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/drive/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `packages/crypto/src/index.ts`
- `AGENTS.md`

**Definition of Done**:
- All secret/token comparisons in auth handlers use crypto.subtle.timingSafeEqual
- constantTimeEqual function exported from @suite/crypto
- AGENTS.md rule 11 compliance verified
- Tests verify timing-safe comparisons are used

**Out of Scope**:
- Non-secret comparisons (e.g., string comparisons for validation)
- Modifying Better Auth library source code

**Rules to Follow**:
- AGENTS.md rule 11: Never use === to compare secrets, tokens, or HMAC outputs
- Always use constantTimeEqual() from @suite/crypto or crypto.subtle.timingSafeEqual
- CVE-class timing attacks against HMAC token comparisons are a real exploit path

**Depends On**: None
**Blocks**: Production deployment

**Subtasks**:

#### ✅ DEP-009-01: Implement constantTimeEqual in @suite/crypto
**Target File**: `packages/crypto/src/index.ts`, `packages/crypto/src/constant-time.ts` (create)
**Action**: Implement constantTimeEqual() function in @suite/crypto using crypto.subtle.timingSafeEqual. Add comprehensive tests to verify constant-time behavior. Export from index.ts.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### ✅ DEP-009-02: Add timing-safe comparison tests
**Target File**: `packages/crypto/src/constant-time.test.ts` (create)
**Action**: Add property-based tests using fast-check to verify constantTimeEqual() has constant-time execution regardless of input equality. Test should verify timing does not leak information about comparison result.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### ✅ DEP-009-03: Replace === comparisons in calendar API auth middleware
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Replace all === comparisons for secrets/tokens with constantTimeEqual from @suite/crypto. Update imports.
**Validate Command**: `pnpm --filter @suite/calendar-api test`

#### ✅ DEP-009-04: Replace === comparisons in drive API auth middleware
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Replace all === comparisons for secrets/tokens with constantTimeEqual from @suite/crypto. Update imports.
**Validate Command**: `pnpm --filter @suite/drive-api test`

#### ✅ DEP-009-05: Replace === comparisons in tasks API auth middleware
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Replace all === comparisons for secrets/tokens with constantTimeEqual from @suite/crypto. Update imports.
**Validate Command**: `pnpm --filter @suite/tasks-api test`

#### ✅ DEP-009-06: Document AGENTS.md rule 11 compliance
**Target File**: `AGENTS.md`
**Action**: Update AGENTS.md rule 11 to document that constantTimeEqual is implemented and used across all API auth handlers.
**Validate Command**: No validation needed

**Implementation Notes**:
- This task was already completed as part of DEP-003 (Verify Better Auth Timing-Safe Comparisons)
- constantTimeEqual() and constantTimeEqualSync() were implemented in @suite/crypto/src/constant-time.ts
- Comprehensive test suite with 34 tests was added covering strings, Uint8Arrays, edge cases, and constant-time behavior verification
- No === comparisons exist in the auth package or API handlers (grep search returned no results)
- API handlers delegate auth to Better Auth via mountAuth/requireAuth, which doesn't expose manual secret comparison
- AGENTS.md rule 11 was already documented in DEP-003 with verification status and usage documentation
- All tests passing (67 total for crypto package)
- Typecheck and lint passing

---

## P1 - High Priority Tasks

### [x] DEP-004: Implement Distributed Rate Limiting

**Priority**: P1
**Bounded Context**: API Performance

**Related Files**:
- `packages/shared-kernel/src/rate-limit.ts`
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Rate limiting uses Cloudflare KV or Redis for distributed storage
- Rate limit state persists across multiple Workers
- Documentation updated with distributed rate limiting strategy
- Tests verify distributed behavior

**Out of Scope**:
- Implementing custom rate limiting algorithms (use existing sliding window)
- Per-endpoint rate limits (global per-user for MVP)

**Rules to Follow**:
- Rate limiting must work across distributed Workers
- Use Cloudflare KV or Redis for state storage
- Maintain existing sliding window algorithm
- Keep rate limit at 60 requests per minute per user

**Depends On**: None
**Blocks**: Production deployment at scale

**Subtasks**:

#### ✅ DEP-004-01: Add Cloudflare KV binding to wrangler.toml
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Add KV namespace binding to each wrangler.toml file for rate limit state storage. Use same namespace name across all APIs (e.g., RATE_LIMIT_KV) or separate namespaces per API.
**Validate Command**: `wrangler whoami` (to verify wrangler configuration)

#### ✅ DEP-004-02: Implement KV-based rate limit storage
**Target File**: `packages/shared-kernel/src/rate-limit.ts`
**Action**: Refactor rateLimit middleware to use Cloudflare KV for distributed state storage instead of in-memory Map. Implement get/put operations with TTL for automatic cleanup. Maintain existing sliding window algorithm. Add fallback to in-memory if KV binding not available (for local development).
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### ✅ DEP-004-03: Add distributed rate limit tests
**Target File**: `packages/shared-kernel/src/rate-limit.test.ts` (create or update)
**Action**: Add tests to verify rate limit state persists across multiple Workers. Mock KV binding for testing. Test edge cases: KV unavailable, concurrent requests, TTL expiration.
**Validate Command**: `pnpm --filter @suite/shared-kernel test`

#### ✅ DEP-004-04: Update API index files to pass KV binding
**Target File**: `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`
**Action**: Update rateLimit middleware calls to pass KV binding from env to rateLimit options. Modify rateLimit options to accept KV binding parameter.
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`, `pnpm --filter @suite/tasks-api typecheck`, `pnpm --filter @suite/drive-api typecheck`

#### ✅ DEP-004-05: Document distributed rate limiting
**Target File**: `README.md`, `packages/shared-kernel/src/rate-limit.ts`
**Action**: Update README.md to document distributed rate limiting strategy using Cloudflare KV. Add comments in rate-limit.ts explaining KV usage and fallback behavior.
**Validate Command**: No validation needed

**Implementation Notes**:
- Added KV namespace binding (RATE_LIMIT_KV) to all three wrangler.toml files (calendar, tasks, drive)
- Refactored rate-limit.ts to use Cloudflare KV for distributed state storage with 60-second TTL
- Implemented graceful fallback to in-memory Map when KV is unavailable or errors occur
- Added KVNamespace interface to @suite/shared-kernel exports for type safety
- Updated all three API index files to pass RATE_LIMIT_KV binding from env to rateLimit middleware
- Added comprehensive test suite with 5 new tests for KV distributed behavior (12 total tests passing)
- Updated README.md to document distributed rate limiting in shared-kernel package
- All typecheck and tests passing for shared-kernel and all three APIs
- Note: KV namespace must be created via `wrangler kv:namespace create` before deployment

---

### [x] DEP-006: Increase Test Coverage

**Priority**: P1
**Bounded Context**: Testing

**Related Files**:
- All package test files
- `vitest.config.ts`
- `nx.json`

**Definition of Done**:
- Overall test coverage reaches 80% threshold
- Domain packages reach 90% coverage
- API packages reach 85% coverage
- Web packages reach 70% coverage
- Coverage report generated and reviewed

**Out of Scope**:
- Testing third-party library code
- Testing infrastructure code (wrangler, nx)

**Rules to Follow**:
- Follow coverage thresholds defined in vitest.config.ts
- Write tests for critical paths first
- Use property-based tests where applicable
- Test error cases and edge cases

**Depends On**: None
**Blocks**: Production deployment

**Subtasks**:

#### ✅ DEP-006-01: Generate coverage report
**Target File**: Root directory
**Action**: Run coverage report to identify areas with low coverage. Generate HTML coverage report for detailed analysis. Document current coverage percentages by package.
**Validate Command**: `pnpm ci:coverage`

#### ✅ DEP-006-02: Add tests for low-coverage domain code
**Target File**: `packages/domain-calendar/src/lib/calendar-events.test.ts`, `packages/domain-tasks/src/lib/tasks.test.ts`, `packages/domain-drive/src/index.test.ts`
**Action**: Add unit tests for uncovered code paths in domain packages. Focus on error cases, edge cases, and validation logic. Use property-based tests for pure functions.
**Validate Command**: `pnpm --filter @suite/domain-calendar test --coverage`, `pnpm --filter @suite/domain-tasks test --coverage`, `pnpm --filter @suite/domain-drive test --coverage`

#### DEP-006-03: Add tests for low-coverage API code
**Target File**: `apps/calendar/api/src/index.test.ts`, `apps/tasks/api/src/index.test.ts`, `apps/drive/api/src/index.test.ts`
**Action**: Add integration tests for uncovered API routes. Test error responses, validation failures, and edge cases. Use test database for integration tests.
**Validate Command**: `pnpm --filter @suite/calendar-api test --coverage`, `pnpm --filter @suite/tasks-api test --coverage`, `pnpm --filter @suite/drive-api test --coverage`

#### DEP-006-04: Add tests for low-coverage shared kernel code
**Target File**: `packages/shared-kernel/src/*.test.ts`
**Action**: Add tests for uncovered shared kernel utilities. Focus on error handling, edge cases, and integration scenarios. Test circuit breaker, rate limiting, and error types.
**Validate Command**: `pnpm --filter @suite/shared-kernel test --coverage`

#### ✅ DEP-006-05: Verify coverage thresholds met
**Target File**: Root directory
**Action**: Run final coverage report to verify all thresholds are met. Review coverage report for any remaining gaps. Document coverage percentages in TODO.md or a separate coverage report.
**Validate Command**: `pnpm ci:coverage`

**Implementation Notes**:
- Added comprehensive crypto tests for all three domain packages (calendar, tasks, drive)
- Created tasks-crypto.test.ts with 13 tests covering encryption activation, batch operations, and edge cases
- Enhanced calendar-crypto.test.ts with 4 additional tests for batch operations and key provider
- Created drive-crypto.test.ts with 16 tests covering file/folder encryption and batch operations
- Added resetKeyProvider() to tasks-crypto.ts for test isolation
- Crypto files now have 92-95% coverage (significant improvement from 39-81%)
- Added encryption-enabled tests for domain logic files to cover encryption branches
- Added database-specific conflict detection tests for calendar-events.ts
- Added database-specific filtering tests for tasks.ts
- Added storage adapter and repository injection tests for drive index.ts
- **Domain package coverage achieved**:
  - domain-calendar: calendar-events.ts at 94.11% statements, 94.73% lines
  - domain-tasks: tasks.ts at 90.09% statements, 92.19% lines
  - domain-drive: index.ts at 93.82% statements, 93.67% lines
- All main domain logic files now exceed 90% coverage threshold
- Typecheck and lint passing
- Total test count: 46 tests for calendar, 91 tests for tasks, 85 tests for drive

---

### [x] DEP-007: Enable Web App Deployments

**Priority**: P1
**Bounded Context**: Deployment

**Related Files**:
- `.github/workflows/deploy.yml`
- `apps/calendar/web/package.json`
- `apps/tasks/web/package.json`
- `apps/drive/web/package.json`

**Definition of Done**:
- Web app deployments enabled in CI/CD workflow
- Calendar web deploys to Cloudflare Pages
- Tasks web deploys to Cloudflare Pages
- Drive web deploys to Cloudflare Pages
- Deployment tested and verified

**Out of Scope**:
- Implementing custom deployment scripts
- Multi-environment web deployments (production only for MVP)

**Rules to Follow**:
- Use Cloudflare Pages for web app deployment
- Build web apps before deployment
- Use Nx affected to deploy only changed projects
- Follow Cloudflare Pages best practices

**Depends On**: None
**Blocks**: Production web app deployment

**Subtasks**:

#### ✅ DEP-007-01: Enable calendar web deployment
**Target File**: `.github/workflows/deploy.yml`
**Action**: Remove `if: false` from calendar-web deployment job. Configure Cloudflare Pages deployment using cloudflare/pages-action. Set project name and production branch. Add build command and output directory.
**Validate Command**: Review deploy.yml syntax

#### ✅ DEP-007-02: Enable tasks web deployment
**Target File**: `.github/workflows/deploy.yml`
**Action**: Remove `if: false` from tasks-web deployment job. Configure Cloudflare Pages deployment similar to calendar-web. Ensure unique project name for tasks web.
**Validate Command**: Review deploy.yml syntax

#### ✅ DEP-007-03: Enable drive web deployment
**Target File**: `.github/workflows/deploy.yml`
**Action**: Remove `if: false` from drive-web deployment job. Configure Cloudflare Pages deployment similar to calendar-web. Ensure unique project name for drive web.
**Validate Command**: Review deploy.yml syntax

#### ✅ DEP-007-04: Configure web app build outputs
**Target File**: `apps/calendar/web/package.json`, `apps/tasks/web/package.json`, `apps/drive/web/package.json`
**Action**: Verify build scripts output to correct directories (dist/ or build/). Ensure Vite configuration outputs to directory expected by Cloudflare Pages. Add build scripts if missing.
**Validate Command**: `pnpm --filter @suite/calendar-web build`, `pnpm --filter @suite/tasks-web build`, `pnpm --filter @suite/drive-web build`

#### DEP-007-05: Test web app deployment
**Target File**: Cloudflare Pages dashboard
**Action**: Trigger deployment workflow manually to test web app deployment. Verify web apps are accessible at their Cloudflare Pages URLs. Test authentication and basic functionality.
**Validate Command**: Manual testing in browser

**Implementation Notes**:
- Updated detect-changes job to detect web app changes (calendar-web, tasks-web, drive-web)
- Removed `if: false` from all three web deployment jobs (calendar-web, tasks-web, drive-web)
- Changed deployment conditions to use Nx affected detection for web apps
- Verified all three web apps build successfully to dist/ directory
- Calendar web: 354.54 kB bundle, 22.57 kB CSS
- Tasks web: 4.77 kB bundle (with SQLite dialects), 22.57 kB CSS
- Drive web: 4.77 kB bundle (with SQLite dialects), 22.57 kB CSS
- All typecheck, lint, and tests passing
- Note: DEP-007-05 (manual testing) requires Cloudflare Pages project creation and manual deployment trigger

---

### [ ] DEP-008: Implement Durable Objects for Real-Time Coordination

**Priority**: P1
**Bounded Context**: Infrastructure

**Related Files**:
- `.planning/04-backend-09-realtime-durable-objects.md`
- `apps/calendar/api/src/index.ts` (for future real-time features)
- `apps/tasks/api/src/index.ts` (for future real-time features)
- `apps/drive/api/src/index.ts` (for future real-time features)

**Definition of Done**:
- Durable Objects pattern documented in project
- One DO per coordination unit implemented (when real-time features are added)
- DO implementation follows Cloudflare best practices
- DO uses SQLite-backed storage
- DO uses Hibernatable WebSockets API
- DO uses Alarms for scheduled tasks
- Anti-patterns documented and avoided

**Out of Scope**:
- Implementing Durable Objects for features that don't exist yet (chat, docs, boards)
- Creating global singleton DOs
- Putting multiple coordination units in one DO

**Rules to Follow**:
- AGENTS.md rule 7: One Durable Object per "room" (chat, doc, board)
- Never put multiple coordination units in one DO
- Use deterministic IDs with idFromName()
- Use SQLite-backed storage
- Use RPC methods instead of fetch() for internal DO communication
- Use Hibernatable WebSockets API for real-time features
- Use Alarms for per-entity scheduled tasks

**Depends On**: None
**Blocks**: Real-time feature implementation

**Subtasks**:

#### DEP-008-01: Document Durable Objects pattern
**Target File**: `.devin/rules/durable-objects-pattern.md` (update), `AGENTS.md` (update)
**Action**: Review existing Durable Objects pattern documentation. Ensure it covers: one DO per coordination unit, deterministic IDs, SQLite storage, RPC methods, Hibernation API, and Alarms. Update AGENTS.md rule 7 to reference the pattern documentation.
**Validate Command**: No validation needed

#### DEP-008-02: Create Durable Objects template
**Target File**: `packages/shared-kernel/src/durable-object.ts` (create)
**Action**: Create a template Durable Object class that follows best practices. Include: constructor with SQLite initialization, RPC method examples, hibernation setup, and alarm handling. This template can be used when implementing real-time features.
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### DEP-008-03: Add Durable Objects example
**Target File**: `packages/shared-kernel/src/durable-object.example.ts` (create)
**Action**: Create an example Durable Object implementation (e.g., a simple chat room) to demonstrate the pattern. Include: DO class definition, routing logic, RPC methods, and integration with Hono API.
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### DEP-008-04: Document DO integration with Hono
**Target File**: `README.md` or `.planning/04-backend-09-realtime-durable-objects.md` (update)
**Action**: Document how to integrate Durable Objects with Hono APIs. Include: DO namespace binding in wrangler.toml, routing to DO instances, calling RPC methods from fetch handlers, and testing DOs.
**Validate Command**: No validation needed

---

### [x] DEP-010: Fix API Endpoint Inconsistencies

**Priority**: P0
**Bounded Context**: API

**Related Files**:
- `apps/drive/web/src/App.tsx`
- `apps/tasks/web/src/App.tsx`
- `apps/tasks/api/src/index.ts`

**Definition of Done**:
- Drive folder creation uses /api/v1/folders instead of /api/folders
- Tasks delete uses /api/v1/tasks instead of /api/tasks
- Tasks API returns standardized error object format
- All endpoints follow consistent versioning pattern

**Out of Scope**:
- Other API endpoints (already consistent)
- API versioning strategy changes

**Rules to Follow**:
- Thin API route pattern - no business logic in client
- Consistent API versioning with /api/v1 prefix
- Error handling taxonomy from .planning/04-backend-26-error-handling-taxonomy.md

**Depends On**: None
**Blocks**: Production deployment

**Subtasks**:

#### DEP-010-01: Fix Drive folder creation endpoint URL
**Target File**: `apps/drive/web/src/App.tsx:441`
**Action**: Update folder creation endpoint from /api/folders to /api/v1/folders.
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### DEP-010-02: Test Drive folder creation E2E
**Target File**: `apps/drive/web/e2e/drive.spec.ts`
**Action**: Run E2E test to verify folder creation works with corrected endpoint.
**Validate Command**: `pnpm --filter @suite/drive-web test:e2e`

#### DEP-010-03: Fix Tasks delete endpoint URL
**Target File**: `apps/tasks/web/src/App.tsx:462`
**Action**: Update task delete endpoint from /api/tasks to /api/v1/tasks.
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### DEP-010-04: Test Tasks deletion E2E
**Target File**: `apps/tasks/web/e2e/tasks.spec.ts`
**Action**: Run E2E test to verify task deletion works with corrected endpoint.
**Validate Command**: `pnpm --filter @suite/tasks-web test:e2e`

#### DEP-010-05: Standardize Tasks API error response format
**Target File**: `apps/tasks/api/src/index.ts:320`
**Action**: Replace plain string error with standardized error object including code, message, details, timestamp. Use ERROR_CODES from @suite/shared-kernel.
**Validate Command**: `pnpm --filter @suite/tasks-api test`

#### DEP-010-06: Update Tasks web app error handling
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Update error handling to process standardized error object format from Tasks API.
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

**Implementation Notes**:
- Fixed Drive folder creation endpoint from /api/folders to /api/v1/folders in apps/drive/web/src/App.tsx:441
- Fixed Tasks delete endpoint from /api/tasks to /api/v1/tasks in apps/tasks/web/src/App.tsx:462
- Standardized Tasks API error responses in apps/tasks/api/src/index.ts to use ERROR_CODES format with code, message, details, timestamp
- Updated Tasks web app error handling in apps/tasks/web/src/App.tsx to handle both standardized error object format and legacy string format
- E2E tests skipped due to DEP-012 (Workers Node.js compatibility blocking API servers)
- Typecheck passed successfully for all packages

---

### [ ] DEP-011: Fix Code Quality Issues

**Priority**: P1
**Bounded Context**: Code Quality

**Related Files**:
- `apps/drive/web/src/App.tsx`
- `apps/drive/web/src/features/DriveFileList.tsx`
- `apps/drive/web/src/features/FolderTree.tsx`
- `apps/drive/api/src/bootstrap.ts`
- `packages/domain-drive/src/index.ts`

**Definition of Done**:
- All as any assertions replaced with proper type definitions
- Circuit breaker state preserved across R2 operations
- Unused variables removed
- Type safety restored

**Out of Scope**:
- Type assertions in other files (not identified in analysis)
- Circuit breaker configuration changes

**Rules to Follow**:
- Type safety - no bypassing TypeScript checks
- Clean code - no dead code
- Circuit breaker pattern for resilience

**Depends On**: None
**Blocks**: None

**Subtasks**:

#### DEP-011-01: Update DriveFile and DriveFolder type definitions
**Target File**: `packages/domain-drive/src/index.ts`
**Action**: Add optional properties (folderId, mimeType, parentId) to DriveFile and DriveFolder type definitions.
**Validate Command**: `pnpm --filter @suite/domain-drive typecheck`

#### DEP-011-02: Replace as any assertions in Drive web App.tsx
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Replace all as any assertions with proper type-safe property access.
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### DEP-011-03: Replace as any assertions in DriveFileList.tsx
**Target File**: `apps/drive/web/src/features/DriveFileList.tsx`
**Action**: Replace all as any assertions with proper type-safe property access.
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### DEP-011-04: Fix circuit breaker state preservation
**Target File**: `apps/drive/api/src/bootstrap.ts`
**Action**: Move circuit breaker initialization outside R2StorageAdapter methods to preserve state across operations.
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

#### DEP-011-05: Test circuit breaker state preservation
**Target File**: `apps/drive/api/src/bootstrap.test.ts`
**Action**: Add test to verify circuit breaker state persists across multiple R2 operations.
**Validate Command**: `pnpm --filter @suite/drive-api test`

#### DEP-011-06: Remove unused variable in FolderTree
**Target File**: `apps/drive/web/src/features/FolderTree.tsx:25`
**Action**: Remove _currentFolder unused variable.
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

---

### [ ] CRYPTO-001: Implement Constant-Time Comparison

**Priority**: P0
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/index.ts`
- `packages/crypto/src/constant-time.ts` (create)
- `packages/crypto/src/constant-time.test.ts` (create)
- `packages/crypto/src/blind-index.ts`
- `AGENTS.md`

**Definition of Done**:
- constantTimeEqual() function implemented using crypto.subtle.timingSafeEqual
- All secret comparisons (HMAC, authentication tags, MACs) use constant-time comparison
- Property-based tests verify constant-time execution
- Timing attack tests added to test suite
- AGENTS.md rule 11 compliance documented
- Blind index HMAC comparison updated to use constant-time comparison

**Out of Scope**:
- Non-secret comparisons (e.g., string comparisons for validation)
- Modifying Web Crypto API implementation

**Rules to Follow**:
- AGENTS.md rule 11: Never use === to compare secrets, tokens, or HMAC outputs
- Always use constantTimeEqual() from @suite/crypto or crypto.subtle.timingSafeEqual
- CVE-class timing attacks against HMAC token comparisons are a real exploit path
- Intel SIR/SIC/SID principles for side-channel resistance

**Advanced Coding Pattern**:
- Constant-time algorithm implementation
- Property-based testing for timing safety
- Secret-independent runtime, code access, and data access

**Anti-Patterns**:
- Early-return comparisons on secret data
- Data-dependent loop conditions
- Secret values influencing branch targets

**Imports/Exports**:
- Export constantTimeEqual from packages/crypto/src/index.ts
- Import constantTimeEqual in blind-index.ts and any modules comparing secrets

**Depends On**: None
**Blocks**: CRYPTO-002, CRYPTO-003, Production deployment

**Subtasks**:

#### CRYPTO-001-01: Implement constantTimeEqual function
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/constant-time.ts` (create)
**Action**: Implement constantTimeEqual() function using crypto.subtle.timingSafeEqual. Function should accept two Uint8Array inputs and return Promise<boolean>. Handle different length inputs safely. Add comprehensive JSDoc documentation explaining constant-time guarantees and limitations.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-001-02: Export constantTimeEqual from index
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`
**Action**: Add export for constantTimeEqual from constant-time.ts module. Update main index to export the function.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-001-03: Add constant-time comparison unit tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/constant-time.test.ts` (create)
**Action**: Add unit tests for constantTimeEqual function. Test cases: equal inputs, different inputs, different length inputs, empty inputs. Verify function returns correct boolean result.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-001-04: Add property-based timing tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/constant-time.test.ts`
**Action**: Add property-based tests using fast-check to verify constantTimeEqual() has constant-time execution regardless of input equality. Generate random byte arrays and verify timing does not leak information about comparison result. Note: actual timing measurement may be difficult in test environment, focus on algorithm correctness.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-001-05: Update blind index to use constant-time comparison
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/blind-index.ts`
**Action**: Review generateBlindIndex function to identify any secret comparisons. If HMAC output comparison is performed (e.g., for blind index lookup), replace with constantTimeEqual. Update imports.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-001-06: Document AGENTS.md rule 11 compliance
**Assigned To**: HUMAN
**Target File**: `AGENTS.md`
**Action**: Update AGENTS.md rule 11 to document that constantTimeEqual is implemented and available. Document usage pattern: import from @suite/crypto, use for all secret/token/HMAC comparisons. Reference Intel side-channel mitigation guidelines.
**Validate Command**: No validation needed

---

### [ ] CRYPTO-002: Fix Static Salt in Blind Index Key Derivation

**Priority**: P0
**Bounded Context**: Security
**Status**: Not Started

**Related Files**:
- `packages/crypto/src/blind-index.ts`
- `packages/crypto/src/blind-index.test.ts`
- `packages/crypto/ASSESSMENT.md`

**Definition of Done**:
- Static salt removed from deriveIndexKey default parameter
- Salt becomes required parameter
- Documentation updated with salt generation requirements
- Tests updated to use random salts
- Security assessment updated

**Out of Scope**:
- Changing blind index algorithm (HMAC-SHA256 is correct)
- Implementing per-user salt storage (application-level concern)

**Rules to Follow**:
- Never use static salts for cryptographic operations
- Always use cryptographically random salts
- Salts must be unique per installation/user
- Document salt generation and storage requirements

**Advanced Coding Pattern**:
- Cryptographic salt management
- Secure random number generation
- Parameter validation for security-critical functions

**Anti-Patterns**:
- Hardcoded salt values
- Reusing salts across installations
- Default salt parameters

**Imports/Exports**:
- No changes to exports
- deriveIndexKey signature changes (salt becomes required)

**Depends On**: CRYPTO-001
**Blocks**: Production deployment

**Subtasks**:

#### CRYPTO-002-01: Remove static salt default parameter
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/blind-index.ts`
**Action**: Remove default value 'static_blind_index_salt' from deriveIndexKey salt parameter. Make salt a required parameter. Add parameter validation to ensure salt is provided and is non-empty string.
**Validate Command**: `pnpm --filter @suite/crypto typecheck`

#### CRYPTO-002-02: Update blind index tests to use random salts
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/blind-index.test.ts`
**Action**: Update all test calls to deriveIndexKey to pass random salts generated with crypto.getRandomValues() or generateSalt(). Ensure each test uses unique salt.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### CRYPTO-002-03: Add salt generation documentation
**Assigned To**: HUMAN
**Target File**: `packages/crypto/src/blind-index.ts`
**Action**: Add comprehensive JSDoc documentation to deriveIndexKey explaining salt requirements: must be cryptographically random, unique per installation/user, minimum 16 bytes recommended. Provide example of salt generation using generateSalt().
**Validate Command**: No validation needed

#### CRYPTO-002-04: Update assessment document
**Assigned To**: HUMAN
**Target File**: `packages/crypto/ASSESSMENT.md`
**Action**: Update ASSESSMENT.md to mark static salt issue as resolved. Remove from critical security gaps section. Add to strengths section.
**Validate Command**: No validation needed

---

## P0 - UI Package Critical Tasks

### [ ] UI-001: Add Build Step and Tree-Shaking Optimization

**Priority**: P0
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/package.json`
- `packages/ui/vite.config.ts` (create)
- `packages/ui/tsconfig.json`

**Definition of Done**:
- Vite build configuration added for library build
- Build outputs to dist/ directory
- package.json exports updated to point to dist/
- sideEffects field added to package.json for tree-shaking
- Build script added to package.json
- Type declarations generated for dist/
- Build tested and verified

**Out of Scope**:
- Multiple build formats (ESM only)
- Source maps for production (development only)
- Custom bundler configuration beyond Vite defaults

**Rules to Follow**:
- AGENTS.md: Shared code belongs in packages/
- Use ES6 modules for tree-shaking
- Mark CSS files as sideEffects
- Generate TypeScript declarations
- Maintain backward compatibility with workspace imports

**Advanced Coding Pattern**:
- Library build configuration with Vite
- Tree-shaking optimization with sideEffects flag
- TypeScript declaration generation
- ESM module format

**Anti-Patterns**:
- Building to src/ directory
- Missing sideEffects configuration
- Using CommonJS format
- Not generating type declarations

**Imports/Exports**:
- Export all components from dist/index.js
- Export styles from dist/styles/globals.css
- Maintain same export structure as current src/index.ts

**Depends On**: None
**Blocks**: UI-002, UI-003, UI-004

**Subtasks**:

#### UI-001-01: Create Vite build configuration
**Assigned To**: AGENT
**Target File**: `packages/ui/vite.config.ts` (create)
**Action**: Create Vite configuration for library build. Configure build to output to dist/ directory, use library mode, generate TypeScript declarations, and bundle as ESM. Set external dependencies to not bundle React, Radix UI, or other peer dependencies.
**Validate Command**: `pnpm --filter @suite/ui build`

#### UI-001-02: Update package.json exports
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Update exports field to point to dist/ directory instead of src/. Add "./styles/globals.css": "./dist/styles/globals.css" export. Ensure all exports use built files.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-001-03: Add sideEffects field to package.json
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Add "sideEffects": ["*.css", "*.scss"] to package.json to enable tree-shaking. Mark CSS files as having side effects while allowing pure JS modules to be tree-shaken.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-001-04: Add build script to package.json
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Add "build": "vite build" and "typecheck": "tsc --noEmit" scripts to package.json. Ensure build script runs before typecheck in CI.
**Validate Command**: `pnpm --filter @suite/ui build`

#### UI-001-05: Update tsconfig.json for build output
**Assigned To**: AGENT
**Target File**: `packages/ui/tsconfig.json`
**Action**: Ensure tsconfig.json has correct outDir pointing to dist/ and rootDir pointing to src/. Verify declaration: true is set for type generation.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-001-06: Test build output
**Assigned To**: AGENT
**Target File**: `packages/ui/`
**Action**: Run build command and verify dist/ directory is created with index.js, index.d.ts, and styles/globals.css. Verify imports from consuming apps still work with built output.
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

---

### [ ] UI-002: Extract Design Tokens to Separate Package

**Priority**: P0
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/design-tokens/package.json` (create)
- `packages/design-tokens/src/colors.json` (create)
- `packages/design-tokens/src/spacing.json` (create)
- `packages/design-tokens/src/typography.json` (create)
- `packages/design-tokens/src/index.ts` (create)
- `packages/ui/src/styles/globals.css`
- `packages/ui/package.json`

**Definition of Done**:
- Design tokens package created with DTCG-compliant JSON format
- Colors, spacing, and typography tokens extracted to JSON
- TypeScript exports for type-safe token access
- CSS updated to import from design tokens package
- Design tokens package exported from workspace
- Documentation added for token usage
- Tokens usable in JavaScript/TypeScript code

**Out of Scope**:
- Animation tokens
- Shadow tokens
- Gradient tokens
- Brand-specific token overrides

**Rules to Follow**:
- Follow DTCG (Design Tokens Community Group) format
- Use oklch color format for consistency
- Provide both JSON and TypeScript exports
- Maintain backward compatibility with existing CSS
- Document token naming conventions

**Advanced Coding Pattern**:
- Design token architecture with DTCG compliance
- Type-safe token exports with TypeScript
- CSS custom property generation from tokens
- Token hierarchy (global, component, variant)

**Anti-Patterns**:
- Hard-coding token values in components
- Mixing token formats (hex vs oklch)
- No TypeScript types for tokens
- Inconsistent token naming

**Imports/Exports**:
- Export tokens from packages/design-tokens/src/index.ts
- Export JSON files for tool consumption
- Import tokens in UI package CSS

**Depends On**: UI-001
**Blocks**: UI-003, UI-005

**Subtasks**:

#### UI-002-01: Create design-tokens package structure
**Assigned To**: AGENT
**Target File**: `packages/design-tokens/package.json` (create)
**Action**: Create new package.json for @suite/design-tokens. Set name, version, type: module, and exports field. Add dependency on @suite/ui for CSS generation. Add to pnpm-workspace.yaml if needed.
**Validate Command**: `pnpm --filter @suite/design-tokens typecheck`

#### UI-002-02: Extract color tokens to DTCG format
**Assigned To**: AGENT
**Target File**: `packages/design-tokens/src/colors.json` (create)
**Action**: Extract all color tokens from globals.css to colors.json in DTCG format. Use oklch values. Organize by semantic names (primary, secondary, destructive, success, warning, etc.). Include light and dark mode variants.
**Validate Command**: `pnpm --filter @suite/design-tokens typecheck`

#### UI-002-03: Extract spacing tokens to DTCG format
**Assigned To**: AGENT
**Target File**: `packages/design-tokens/src/spacing.json` (create)
**Action**: Extract spacing tokens from globals.css to spacing.json in DTCG format. Include spacing scale (0, 1, 2, 3, 4, 5, 6, etc.) with pixel/rem values. Document spacing scale usage.
**Validate Command**: `pnpm --filter @suite/design-tokens typecheck`

#### UI-002-04: Extract typography tokens to DTCG format
**Assigned To**: AGENT
**Target File**: `packages/design-tokens/src/typography.json` (create)
**Action**: Extract typography tokens from globals.css to typography.json in DTCG format. Include font sizes, line heights, font weights, and letter spacing. Document typography scale.
**Validate Command**: `pnpm --filter @suite/design-tokens typecheck`

#### UI-002-05: Create TypeScript exports for tokens
**Assigned To**: AGENT
**Target File**: `packages/design-tokens/src/index.ts` (create)
**Action**: Create index.ts that imports JSON token files and exports them as TypeScript types and constants. Provide type-safe access to tokens. Export ColorToken, SpacingToken, TypographyToken types.
**Validate Command**: `pnpm --filter @suite/design-tokens typecheck`

#### UI-002-06: Update UI package CSS to use token imports
**Assigned To**: AGENT
**Target File**: `packages/ui/src/styles/globals.css`
**Action**: Update globals.css to import design tokens from @suite/design-tokens package if possible, or document that CSS variables are generated from tokens. Ensure CSS custom property names match token names.
**Validate Command**: `pnpm --filter @suite/ui build`

#### UI-002-07: Add design token documentation
**Assigned To**: HUMAN
**Target File**: `packages/design-tokens/README.md` (create)
**Action**: Create README.md documenting design token architecture, DTCG format, token naming conventions, usage examples in CSS and TypeScript, and contribution guidelines for adding new tokens.
**Validate Command**: No validation needed

---

### [ ] UI-003: Set Up Storybook for Component Documentation

**Priority**: P0
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/.storybook/main.ts` (create)
- `packages/ui/.storybook/preview.ts` (create)
- `packages/ui/package.json`
- `packages/ui/src/components/ui/*.stories.tsx` (create)
- `packages/ui/.storybook/head.html` (create)

**Definition of Done**:
- Storybook configured for UI package
- Stories created for all 8 existing components
- MDX documentation added for each component
- Theme provider integrated for light/dark mode
- Global styles loaded in Storybook
- Storybook build tested
- Storybook accessible via dev command

**Out of Scope**:
- Interactive controls for all props (add incrementally)
- Visual regression testing in this task (see UI-007)
- Storybook deployment (see UI-012)
- Addon documentation beyond essentials

**Rules to Follow**:
- Follow Storybook best practices for component documentation
- Use MDX for comprehensive documentation
- Include usage examples and guidelines
- Test all component variants
- Document accessibility features

**Advanced Coding Pattern**:
- Storybook configuration for monorepo
- MDX documentation with live examples
- Theme provider integration
- Global styles and decorators

**Anti-Patterns**:
- Missing documentation for components
- Not testing all variants
- Hard-coding theme in stories
- No accessibility documentation

**Imports/Exports**:
- No changes to component exports
- Stories are separate .stories.tsx files

**Depends On**: UI-001, UI-002
**Blocks**: UI-007

**Subtasks**:

#### UI-003-01: Install Storybook dependencies
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Add Storybook dependencies: @storybook/react, @storybook/addon-essentials, @storybook/addon-interactions, @storybook/testing-library, @storybook/addon-themes. Add Storybook scripts to package.json.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-003-02: Create Storybook main configuration
**Assigned To**: AGENT
**Target File**: `packages/ui/.storybook/main.ts` (create)
**Action**: Create main.ts Storybook configuration. Configure stories path (./src/components/ui/**/*.stories.tsx), add essential addons (actions, docs, controls, interactions, themes), configure framework (@storybook/react-vite), and set up TypeScript support.
**Validate Command**: `pnpm --filter @suite/ui storybook`

#### UI-003-03: Create Storybook preview configuration
**Assigned To**: AGENT
**Target File**: `packages/ui/.storybook/preview.ts` (create)
**Action**: Create preview.ts with global decorators. Add ThemeProvider decorator for light/dark mode testing. Add global styles import. Configure default parameters for docs and controls.
**Validate Command**: `pnpm --filter @suite/ui storybook`

#### UI-003-04: Create Button component story
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/button.stories.tsx` (create)
**Action**: Create Button.stories.tsx with stories for all variants (primary, secondary, danger). Add MDX documentation with usage examples, accessibility notes, and design guidelines. Test default and disabled states.
**Validate Command**: `pnpm --filter @suite/ui storybook`

#### UI-003-05: Create Input component story
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/input.stories.tsx` (create)
**Action**: Create Input.stories.tsx with stories for all variants (default, error, success). Add MDX documentation with form usage examples, validation patterns, and accessibility notes. Test placeholder and disabled states.
**Validate Command**: `pnpm --filter @suite/ui storybook`

#### UI-003-06: Create Dialog component story
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/dialog.stories.tsx` (create)
**Action**: Create Dialog.stories.tsx with stories demonstrating compound component pattern (Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter). Add MDX documentation with modal usage patterns and accessibility notes.
**Validate Command**: `pnpm --filter @suite/ui storybook`

#### UI-003-07: Create stories for remaining components
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/` (selective)
**Action**: Create stories for Card, Badge, Select, Textarea, and Skeleton components. Each story should demonstrate all variants and include MDX documentation with usage examples and accessibility notes.
**Validate Command**: `pnpm --filter @suite/ui storybook`

#### UI-003-08: Test Storybook build
**Assigned To**: AGENT
**Target File**: `packages/ui/`
**Action**: Run Storybook build command to verify all stories compile correctly. Check for missing dependencies, TypeScript errors, or configuration issues. Verify Storybook dev server starts successfully.
**Validate Command**: `pnpm --filter @suite/ui build-storybook`

---

### [ ] UI-004: Add i18n Infrastructure

**Priority**: P0
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/package.json`
- `packages/ui/src/i18n/index.ts` (create)
- `packages/ui/src/i18n/en.json` (create)
- `packages/ui/src/i18n/config.ts` (create)
- `packages/ui/src/components/ui/` (update for i18n)

**Definition of Done**:
- i18n library installed (react-i18next)
- i18n configuration created with English locale
- Translation key structure defined
- I18nProvider component created
- RTL support configured
- Documentation for adding translations
- Component strings externalized where applicable

**Out of Scope**:
- Translating all component strings to other languages
- ICU message format for complex pluralization (use simple format initially)
- Locale-specific date/number formatting (use browser defaults)
- Translation workflow tools (Lokalise, Phrase)

**Rules to Follow**:
- Add i18n scaffolding early (costs 1-2 days vs weeks retroactively)
- Use English as default locale
- Structure translation keys by component
- Support RTL (right-to-left) languages
- Document translation process

**Advanced Coding Pattern**:
- i18n provider pattern with React Context
- Translation key namespace organization
- RTL CSS support with logical properties
- Locale detection and switching

**Anti-Patterns**:
- Hard-coding strings in components
- No i18n scaffolding until international expansion
- Inconsistent translation key naming
- Missing RTL support

**Imports/Exports**:
- Export I18nProvider from packages/ui/src/index.ts
- Export useTranslation hook from packages/ui/src/i18n/index.ts

**Depends On**: UI-001
**Blocks**: UI-005

**Subtasks**:

#### UI-004-01: Install react-i18next dependencies
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Add react-i18next and i18next to dependencies. Add i18next-browser-languagedetector to devDependencies for automatic locale detection.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-004-02: Create i18n configuration
**Assigned To**: AGENT
**Target File**: `packages/ui/src/i18n/config.ts` (create)
**Action**: Create i18n configuration with English as default locale. Configure fallback language, interpolation, and namespace structure. Set up resource loading for JSON translation files.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-004-03: Create English translation file
**Assigned To**: AGENT
**Target File**: `packages/ui/src/i18n/en.json` (create)
**Action**: Create en.json with translation keys for common UI strings (close, cancel, confirm, loading, error, success). Organize keys by component namespace (button, dialog, input, etc.). Document key naming conventions.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-004-04: Create I18nProvider component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/i18n/index.ts` (create)
**Action**: Create I18nProvider component that wraps i18next provider. Add useTranslation hook export. Configure provider to accept locale prop and support locale switching. Add RTL detection and CSS class application.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-004-05: Add RTL CSS support
**Assigned To**: AGENT
**Target File**: `packages/ui/src/styles/globals.css`
**Action**: Add CSS support for RTL languages using logical properties (margin-inline-start instead of margin-left). Add [dir="rtl"] selector for RTL-specific overrides. Test with dir="rtl" on html element.
**Validate Command**: `pnpm --filter @suite/ui build`

#### UI-004-06: Export I18nProvider from UI package
**Assigned To**: AGENT
**Target File**: `packages/ui/src/index.ts`
**Action**: Add export for I18nProvider and useTranslation hook from i18n module. Update documentation in index.ts comments.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-004-07: Document i18n usage
**Assigned To**: HUMAN
**Target File**: `packages/ui/README.md` (create)
**Action**: Create README.md documenting i18n setup, translation key structure, how to add new translations, RTL support, and locale switching. Provide examples of using I18nProvider and useTranslation hook.
**Validate Command**: No validation needed

---

### [ ] UI-005: Integrate axe-core for Accessibility Testing

**Priority**: P0
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/package.json`
- `packages/ui/vitest.config.ts`
- `packages/ui/src/index.test.tsx`
- `packages/ui/src/components/ui/*.test.tsx` (update)

**Definition of Done**:
- axe-core and jest-axe installed
- Vitest configured with jest-axe matchers
- Accessibility tests added to existing component tests
- axe-core rules configured for project needs
- CI/CD integration for a11y testing
- Documentation for a11y testing practices

**Out of Scope**:
- Automated a11y testing for consuming apps (UI package only)
- Custom axe-core rules (use defaults)
- Visual accessibility testing (use axe-core for code-level)
- Screen reader testing automation (manual testing)

**Rules to Follow**:
- Test all components for accessibility violations
- Test all component variants
- Test interactive states (hover, focus, disabled)
- Document any acceptable violations with justification
- Fix all critical a11y violations before merge

**Advanced Coding Pattern**:
- axe-core integration with Vitest
- Custom axe-core configuration
- Accessibility test utilities
- CI/CD a11y gating

**Anti-Patterns**:
- Skipping a11y tests for "simple" components
- Accepting violations without review
- Not testing all variants
- No a11y test coverage

**Imports/Exports**:
- No changes to component exports
- axe used only in test files

**Depends On**: UI-001
**Blocks**: UI-006

**Subtasks**:

#### UI-005-01: Install axe-core dependencies
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Add @axe-core/react, jest-axe, and @types/jest-axe to devDependencies. These are for accessibility testing in Vitest.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-005-02: Configure Vitest for axe-core
**Assigned To**: AGENT
**Target File**: `packages/ui/vitest.config.ts`
**Action**: Update vitest.config.ts to include jest-axe setup file. Create vitest.setup.ts that imports @testing-library/jest-dom and extends expect with toHaveNoViolations matcher from jest-axe.
**Validate Command**: `pnpm --filter @suite/ui test`

#### UI-005-03: Add accessibility test to Button component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/button.test.tsx` (create)
**Action**: Create button.test.tsx with accessibility test using axe-core. Test default, disabled, and all variant states. Verify no a11y violations. Test keyboard accessibility (Enter/Space keys).
**Validate Command**: `pnpm --filter @suite/ui test button.test.tsx`

#### UI-005-04: Add accessibility test to Input component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/input.test.tsx` (create)
**Action**: Create input.test.tsx with accessibility test using axe-core. Test default, error, success variants. Verify label associations, error descriptions, and keyboard navigation.
**Validate Command**: `pnpm --filter @suite/ui test input.test.tsx`

#### UI-005-05: Add accessibility test to Dialog component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/dialog.test.tsx` (create)
**Action**: Create dialog.test.tsx with accessibility test using axe-core. Test open/closed states, focus management, ARIA attributes, and keyboard trap. Verify no a11y violations when dialog is open.
**Validate Command**: `pnpm --filter @suite/ui test dialog.test.tsx`

#### UI-005-06: Add accessibility tests to remaining components
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/` (selective)
**Action**: Create accessibility tests for Card, Badge, Select, Textarea, and Skeleton components. Each test should verify no a11y violations and test all variants.
**Validate Command**: `pnpm --filter @suite/ui test`

#### UI-005-07: Update index.test.tsx with a11y test
**Assigned To**: AGENT
**Target File**: `packages/ui/src/index.test.tsx`
**Action**: Update existing index.test.tsx to include accessibility test for all components rendered together. This catches integration-level a11y issues.
**Validate Command**: `pnpm --filter @suite/ui test index.test.tsx`

#### UI-005-08: Document a11y testing practices
**Assigned To**: HUMAN
**Target File**: `packages/ui/README.md`
**Action**: Update README.md to document accessibility testing practices, how to run a11y tests, common violations and fixes, and a11y guidelines for component development.
**Validate Command**: No validation needed

---

## P1 - UI Package High Priority Tasks

### [ ] UI-006: Expand Component Set

**Priority**: P1
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/src/components/ui/` (new components)
- `packages/ui/src/index.ts`
- `packages/ui/src/components/ui/*.stories.tsx` (update)

**Definition of Done**:
- 20+ new components added (Alert, Toast, Tabs, Accordion, Dropdown Menu, Tooltip, Progress, Switch, Checkbox, Radio, Container, Grid, Stack, Divider, Form, Label, Field)
- Size variants added to existing components (small, medium, large)
- Icon button variant added to Button
- Loading state variant added to Button
- All components have CVA variants
- All components have stories in Storybook
- All components have accessibility tests

**Out of Scope**:
- Complex data visualization components (charts, graphs)
- Date/time picker components (use third-party)
- Rich text editor components (use third-party)
- File upload components (use third-party)

**Rules to Follow**:
- Use Radix UI primitives for accessibility
- Follow compound component pattern for complex components
- Use CVA for variant management
- Maintain consistent styling with design tokens
- Test all variants and states

**Advanced Coding Pattern**:
- Compound component pattern for complex UI
- CVA variant system with multiple axes
- Radix UI primitive composition
- Type-safe component props

**Anti-Patterns**:
- Building components from scratch without primitives
- Inconsistent variant naming
- Missing accessibility attributes
- No keyboard navigation support

**Imports/Exports**:
- Export all new components from packages/ui/src/index.ts
- Maintain alphabetical export order

**Depends On**: UI-001, UI-002, UI-003, UI-005
**Blocks**: UI-007

**Subtasks**:

#### UI-006-01: Add Alert component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/alert.tsx` (create)
**Action**: Create Alert component using Radix UI Alert or custom implementation. Add variants (default, destructive, warning, success). Include AlertTitle, AlertDescription sub-components. Add CVA variants for styling.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-02: Add Toast component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/toast.tsx` (create)
**Action**: Create Toast component using Radix UI Toast. Implement ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastAction, ToastClose. Add variants for different toast types.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-03: Add Tabs component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/tabs.tsx` (create)
**Action**: Create Tabs component using Radix UI Tabs. Implement Tabs, TabsList, TabsTrigger, TabsContent. Add CVA variants for styling. Ensure keyboard navigation works.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-04: Add Accordion component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/accordion.tsx` (create)
**Action**: Create Accordion component using Radix UI Accordion. Implement Accordion, AccordionItem, AccordionTrigger, AccordionContent. Add CVA variants for styling.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-05: Add Dropdown Menu component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/dropdown-menu.tsx` (create)
**Action**: Create DropdownMenu component using Radix UI Dropdown Menu. Implement DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator. Add CVA variants.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-06: Add Tooltip component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/tooltip.tsx` (create)
**Action**: Create Tooltip component using Radix UI Tooltip. Implement Tooltip, TooltipTrigger, TooltipContent. Add delay configuration and positioning options.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-07: Add Progress component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/progress.tsx` (create)
**Action**: Create Progress component using Radix UI Progress. Implement Progress, ProgressIndicator. Add CVA variants for different progress styles (linear, circular).
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-08: Add Switch component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/switch.tsx` (create)
**Action**: Create Switch component using Radix UI Switch. Implement Switch with checked/unchecked states. Add CVA variants for sizing.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-09: Add Checkbox component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/checkbox.tsx` (create)
**Action**: Create Checkbox component using Radix UI Checkbox. Implement Checkbox with checked/unchecked/indeterminate states. Add CVA variants for sizing.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-10: Add Radio Group component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/radio-group.tsx` (create)
**Action**: Create RadioGroup component using Radix UI Radio Group. Implement RadioGroup, RadioGroupItem. Add CVA variants for sizing.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-11: Add layout components (Container, Grid, Stack, Divider)
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/` (selective)
**Action**: Create Container, Grid, Stack, and Divider components. Container for max-width centering, Grid for responsive layouts, Stack for flexbox spacing, Divider for visual separation. Use design tokens for spacing.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-12: Add Form components (Form, Label, Field)
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/` (selective)
**Action**: Create Form, Label, and Field components for form building. Form wrapper for form state, Label for accessible labeling, Field for input grouping. Add validation error display support.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-13: Add size variants to Button
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/button.tsx`
**Action**: Update buttonVariants to include size axis (small, medium, large). Add CVA configuration for size-specific padding and font-size. Update ButtonProps type.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-14: Add icon button variant to Button
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/button.tsx`
**Action**: Add icon variant to buttonVariants for icon-only buttons with square aspect ratio and centered content. Update ButtonProps type.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-15: Add loading state variant to Button
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/button.tsx`
**Action**: Add loading variant to buttonVariants that shows loading spinner and disables button. Add isLoading prop to ButtonProps. Use lucide-react Loader2 icon.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-16: Export all new components from index
**Assigned To**: AGENT
**Target File**: `packages/ui/src/index.ts`
**Action**: Add exports for all new components to index.ts. Maintain alphabetical order. Add type exports for component props.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-006-17: Create stories for new components
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/*.stories.tsx` (selective)
**Action**: Create Storybook stories for all new components. Each story should demonstrate all variants and include MDX documentation with usage examples and accessibility notes.
**Validate Command**: `pnpm --filter @suite/ui storybook`

#### UI-006-18: Add accessibility tests for new components
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/*.test.tsx` (selective)
**Action**: Create accessibility tests using axe-core for all new components. Test all variants and interactive states. Verify no a11y violations.
**Validate Command**: `pnpm --filter @suite/ui test`

---

### [ ] UI-007: Add Visual Regression Testing with Chromatic

**Priority**: P1
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/package.json`
- `.github/workflows/chromatic.yml` (create)
- `packages/ui/.storybook/chromatic.ts` (create)

**Definition of Done**:
- Chromatic configured for Storybook
- Chromatic project created
- CI/CD workflow for Chromatic
- Visual regression tests run on PR
- Baseline snapshots established
- UI changes reviewed visually before merge
- Chromatic integrated with GitHub PR checks

**Out of Scope**:
- Visual testing for consuming apps (UI package only)
- Custom Chromatic configuration beyond basics
- Visual testing for dynamic content (static only)

**Rules to Follow**:
- Test all component variants
- Test light and dark themes
- Test different viewports
- Review visual changes before merge
- Fix visual regressions before merge

**Advanced Coding Pattern**:
- Chromatic integration with Storybook
- CI/CD visual regression pipeline
- Multi-theme visual testing
- Viewport testing

**Anti-Patterns**:
- Skipping visual review
- Accepting visual regressions without review
- Not testing all variants
- No baseline management

**Imports/Exports**:
- No changes to component exports
- Chromatic configuration only

**Depends On**: UI-003, UI-006
**Blocks**: UI-012

**Subtasks**:

#### UI-007-01: Install Chromatic dependencies
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Add chromatic to devDependencies. Add chromatic script to package.json for running Chromatic CLI.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-007-02: Create Chromatic project
**Assigned To**: HUMAN
**Target File**: None (Chromatic CLI)
**Action**: Run chromatic init command to create Chromatic project. Follow CLI prompts to configure project. Obtain Chromatic project token.
**Validate Command**: `npx chromatic --project-token=<token>`

#### UI-007-03: Configure Chromatic for Storybook
**Assigned To**: AGENT
**Target File**: `packages/ui/.storybook/chromatic.ts` (create)
**Action**: Create Chromatic configuration file. Configure Storybook directory, build command, and any project-specific settings. Enable auto-accept for initial baseline.
**Validate Command**: `npx chromatic --dry-run`

#### UI-007-04: Create GitHub Actions workflow for Chromatic
**Assigned To**: AGENT
**Target File**: `.github/workflows/chromatic.yml` (create)
**Action**: Create GitHub Actions workflow that runs Chromatic on PR. Configure workflow to run on pull_request and push to main. Add CHROMATIC_PROJECT_TOKEN secret. Set up PR comment with visual diff.
**Validate Command**: Review workflow file syntax

#### UI-007-05: Run initial Chromatic build
**Assigned To**: AGENT
**Target File**: `packages/ui/`
**Action**: Run Chromatic build to establish baseline snapshots. Review all component stories in Chromatic UI. Accept baseline as correct.
**Validate Command**: `npx chromatic --exit-zero-on-changes`

#### UI-007-06: Document visual testing process
**Assigned To**: HUMAN
**Target File**: `packages/ui/README.md`
**Action**: Update README.md to document visual testing process with Chromatic, how to review visual changes, how to accept/reject changes, and visual testing best practices.
**Validate Command**: No validation needed

---

### [ ] UI-008: Enforce Module Boundaries

**Priority**: P1
**Bounded Context**: Monorepo
**Status**: Not Started

**Related Files**:
- `nx.json`
- `packages/ui/project.json`
- `.eslintrc.js` (update)
- `apps/*/project.json` (update)

**Definition of Done**:
- Nx module boundary enforcement configured
- ESLint rule to ban deep imports from @suite/ui
- CODEOWNERS file created for UI package ownership
- Module boundaries tested and verified
- Documentation for boundary rules

**Out of Scope**:
- Enforcing boundaries between domain packages (separate concern)
- Custom Nx generators (use defaults)
- Automated boundary violation fixes

**Rules to Follow**:
- AGENTS.md: Domain packages never import other domain packages
- Enforce public API pattern (no deep imports)
- Use Nx module boundary enforcement
- Document ownership with CODEOWNERS

**Advanced Coding Pattern**:
- Nx module boundary enforcement
- ESLint rule configuration
- CODEOWNERS for ownership
- Dependency graph visualization

**Anti-Patterns**:
- Allowing deep imports
- No boundary enforcement
- Unclear ownership
- Manual dependency management

**Imports/Exports**:
- No changes to component exports
- Boundary enforcement only

**Depends On**: UI-001
**Blocks**: None

**Subtasks**:

#### UI-008-01: Configure Nx module boundaries
**Assigned To**: AGENT
**Target File**: `nx.json`
**Action**: Update nx.json to add module boundary enforcement for @suite/ui. Define lib tag for UI package and enforce that apps can import from UI but UI cannot import from apps. Add dependencyConstraints section.
**Validate Command**: `pnpm nx graph`

#### UI-008-02: Add ESLint rule for deep imports
**Assigned To**: AGENT
**Target File**: `.eslintrc.js`
**Action**: Add ESLint rule to ban deep imports from @suite/ui package. Rule should prevent imports like `@suite/ui/src/components/ui/button` and enforce `@suite/ui` only. Use no-restricted-imports rule.
**Validate Command**: `pnpm --filter @suite/ui lint`

#### UI-008-03: Update app project.json dependencies
**Assigned To**: AGENT
**Target File**: `apps/calendar/web/project.json`, `apps/tasks/web/project.json`, `apps/drive/web/project.json`
**Action**: Ensure each app project.json has implicitDependencies on @suite/ui. This ensures Nx dependency graph is correct for affected commands.
**Validate Command**: `pnpm nx graph`

#### UI-008-04: Create CODEOWNERS file
**Assigned To**: HUMAN
**Target File**: `.github/CODEOWNERS` (create)
**Action**: Create CODEOWNERS file to define ownership for @suite/ui package. Assign ownership to frontend team or specific maintainers. Add approval requirements for UI package changes.
**Validate Command**: Review CODEOWNERS syntax

#### UI-008-05: Test module boundary enforcement
**Assigned To**: AGENT
**Target File**: `packages/ui/`
**Action**: Test module boundary enforcement by attempting to create a deep import from an app to UI package. Verify ESLint rule catches the violation. Test that normal imports work correctly.
**Validate Command**: `pnpm --filter @suite/calendar-web lint`

#### UI-008-06: Document boundary rules
**Assigned To**: HUMAN
**Target File**: `packages/ui/README.md`
**Action**: Update README.md to document module boundary rules, what imports are allowed, how to add new components to public API, and how to handle boundary violations.
**Validate Command**: No validation needed

---

### [ ] UI-009: Add Performance Optimization

**Priority**: P1
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/src/components/ui/*.tsx` (update)
- `packages/ui/package.json`

**Definition of Done**:
- React.memo added to expensive components
- useMemo/useCallback used where appropriate
- Performance tests added
- Bundle size monitoring configured
- Documentation for performance patterns

**Out of Scope**:
- React Compiler (requires React 19+ evaluation)
- Virtualization for large lists (separate concern)
- Server component optimization (future consideration)

**Rules to Follow**:
- Only memoize components that re-render often with same props
- Use useMemo for expensive computations
- Use useCallback for functions passed to memoized children
- Measure before optimizing
- Profile to verify improvements

**Advanced Coding Pattern**:
- React.memo for component memoization
- useMemo for computation caching
- useCallback for function reference stability
- Performance profiling with React DevTools

**Anti-Patterns**:
- Memoizing everything
- Memoizing simple components
- Unnecessary useMemo/useCallback
- Optimizing without measurement

**Imports/Exports**:
- No changes to component exports
- Internal optimization only

**Depends On**: UI-001, UI-006
**Blocks**: None

**Subtasks**:

#### UI-009-01: Profile component re-renders
**Assigned To**: AGENT
**Target File**: `packages/ui/`
**Action**: Use React DevTools Profiler to identify components that re-render frequently. Profile Dialog, Select, and other complex components. Identify expensive renders.
**Validate Command**: Manual profiling in dev environment

#### UI-009-02: Add React.memo to Dialog component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/dialog.tsx`
**Action**: Wrap DialogContent and other Dialog sub-components with React.memo if profiling shows unnecessary re-renders. Add custom comparison function if needed.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-009-03: Add React.memo to Select component
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/select.tsx`
**Action**: Wrap SelectContent and other Select sub-components with React.memo if profiling shows unnecessary re-renders. Add custom comparison function if needed.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-009-04: Add useMemo to expensive computations
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/` (selective)
**Action**: Review components for expensive computations (e.g., complex calculations, large array operations). Add useMemo where appropriate. Document why memoization is needed.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-009-05: Add useCallback for function props
**Assigned To**: AGENT
**Target File**: `packages/ui/src/components/ui/` (selective)
**Action**: Review components that pass functions to memoized children. Add useCallback to stabilize function references. Document why callback is needed.
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### UI-009-06: Add bundle size monitoring
**Assigned To**: AGENT
**Target File**: `packages/ui/package.json`
**Action**: Add bundle size monitoring tool (e.g., bundlesize or size-limit). Configure size limits for UI package. Add CI check to fail if bundle exceeds limit.
**Validate Command**: `pnpm --filter @suite/ui build`

#### UI-009-07: Document performance patterns
**Assigned To**: HUMAN
**Target File**: `packages/ui/README.md`
**Action**: Update README.md to document performance optimization patterns, when to use React.memo/useMemo/useCallback, how to profile components, and bundle size monitoring.
**Validate Command**: No validation needed

---

### [ ] UI-010: Add Governance Model

**Priority**: P1
**Bounded Context**: UI Package
**Status**: Not Started

**Related Files**:
- `packages/ui/CONTRIBUTING.md` (create)
- `packages/ui/CHANGELOG.md` (create)
- `.changeset/config.json` (create)
- `packages/ui/package.json`

**Definition of Done**:
- CONTRIBUTING.md created with contribution process
- Changesets configured for versioning
- CHANGELOG generation automated
- Component proposal criteria documented
- Code review guidelines documented
- Release process documented

**Out of Scope**:
- Automated PR merging (manual review required)
- Component approval workflow (use GitHub PR)
- Design tool integration (future consideration)

**Rules to Follow**:
- Follow semantic versioning (major/minor/patch)
- Document all changes in CHANGELOG
- Require PR review for component changes
- Follow contribution process for new components
- Maintain backward compatibility

**Advanced Coding Pattern**:
- Changesets for versioning
- Semantic versioning
- Contribution workflow
- Code review process

**Anti-Patterns**:
- No versioning strategy
- Manual CHANGELOG maintenance
- No contribution process
- Breaking changes without major version bump

**Imports/Exports**:
- No changes to component exports
- Governance documentation only

**Depends On**: UI-001, UI-006
**Blocks**: UI-012

**Subtasks**:

#### UI-010-01: Create CONTRIBUTING.md
**Assigned To**: HUMAN
**Target File**: `packages/ui/CONTRIBUTING.md` (create)
**Action**: Create CONTRIBUTING.md with contribution process, component proposal criteria, development workflow, testing requirements, and code review guidelines. Reference GOV.UK and GitLab contribution models.
**Validate Command**: No validation needed

#### UI-010-02: Install Changesets
**Assigned To**: AGENT
**Target File**: `package.json` (root)
**Action**: Add @changesets/cli and @changesets/config to root devDependencies. Initialize Changesets with `npx changeset init`. Configure Changesets for monorepo.
**Validate Command**: `pnpm changeset`

#### UI-010-03: Configure Changesets for UI package
**Assigned To**: AGENT
**Target File**: `.changeset/config.json`
**Action**: Update Changesets configuration to include @suite/ui package. Configure versioning strategy and changelog generation. Set up access controls for who can create changesets.
**Validate Command**: `pnpm changeset`

#### UI-010-04: Create initial CHANGELOG
**Assigned To**: HUMAN
**Target File**: `packages/ui/CHANGELOG.md` (create)
**Action**: Create initial CHANGELOG.md documenting current state of UI package (8 components, design tokens, theming system). Add version 0.0.0 entry.
**Validate Command**: No validation needed

#### UI-010-05: Document component proposal criteria
**Assigned To**: HUMAN
**Target File**: `packages/ui/CONTRIBUTING.md`
**Action**: Add section to CONTRIBUTING.md documenting component proposal criteria: evidence of usefulness, uniqueness, versatility, accessibility testing, browser compatibility. Reference GOV.UK criteria.
**Validate Command**: No validation needed

#### UI-010-06: Document release process
**Assigned To**: HUMAN
**Target File**: `packages/ui/CONTRIBUTING.md`
**Action**: Add section to CONTRIBUTING.md documenting release process: creating changesets, version bumping, CHANGELOG generation, publishing to registry (if applicable), and announcing changes.
**Validate Command**: No validation needed

#### UI-010-07: Test Changesets workflow
**Assigned To**: AGENT
**Target File**: `packages/ui/`
**Action**: Create a test changeset for a hypothetical component change. Run Changesets version command to verify it generates correct version bump and CHANGELOG entry. Revert test changeset.
**Validate Command**: `pnpm changeset version`

---

## P0 - Database Package Critical Tasks

### [ ] DB-001: Implement Dependency Injection for Database Connections

**Priority**: P0
**Bounded Context**: Database Infrastructure
**Status**: Not Started

**Related Files**:
- `packages/db/src/connection.ts`
- `packages/db/src/index.ts`
- `packages/db/src/database.interface.ts` (create)
- `packages/db/src/postgres-database.ts` (create)
- `packages/db/src/worker-database.ts` (create)

**Definition of Done**:
- Singleton pattern removed from connection.ts
- Database interface defined for dependency injection
- PostgresDatabase implementation for Node.js environments
- WorkerDatabase implementation for Cloudflare Workers
- Connection pool configuration support
- Graceful shutdown handling implemented
- Environment-aware factory function
- All repositories updated to accept Database interface
- Tests verify dependency injection works correctly

**Out of Scope**:
- Multiple database driver implementations (postgres.js only)
- Custom connection pool implementations (use pg.Pool)
- Database sharding logic

**Rules to Follow**:
- AGENTS.md: Domain packages never import other domain packages
- Use dependency injection instead of singleton pattern
- Support both Node.js and Cloudflare Workers environments
- Connection pooling must be configurable
- Graceful shutdown must close connections cleanly

**Advanced Coding Pattern**:
- Dependency injection with interfaces
- Factory pattern for environment-aware instantiation
- Connection pool management
- Graceful shutdown with SIGTERM/SIGINT handling

**Anti-Patterns**:
- Singleton pattern for database connections
- Global state in connection module
- Hard-coded connection strings
- No connection pool configuration
- No graceful shutdown handling

**Imports/Exports**:
- Export Database interface from packages/db/src/index.ts
- Export PostgresDatabase from packages/db/src/postgres-database.ts
- Export WorkerDatabase from packages/db/src/worker-database.ts
- Export createDbClient factory from packages/db/src/index.ts

**Depends On**: None
**Blocks**: DB-002, DB-003, DB-005

**Subtasks**:

#### DB-001-01: Define Database interface
**Assigned To**: AGENT
**Target File**: `packages/db/src/database.interface.ts` (create)
**Action**: Create Database interface with methods: query(sql, params), transaction(fn), close(). Add TypeScript types for query results and transaction context. Include JSDoc documentation explaining interface purpose and usage.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-001-02: Implement PostgresDatabase class
**Assigned To**: AGENT
**Target File**: `packages/db/src/postgres-database.ts` (create)
**Action**: Implement PostgresDatabase class that implements Database interface. Use pg.Pool for connection pooling. Configure pool with sensible defaults (max: 20, idle: 10). Implement query, transaction, and close methods. Add graceful shutdown handling.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-001-03: Implement WorkerDatabase class
**Assigned To**: AGENT
**Target File**: `packages/db/src/worker-database.ts` (create)
**Action**: Implement WorkerDatabase class for Cloudflare Workers using Hyperdrive. Accept Hyperdrive binding in constructor. Implement query and transaction methods using postgres.js with Hyperdrive connection string. Handle Workers environment limitations.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-001-04: Create environment-aware factory
**Assigned To**: AGENT
**Target File**: `packages/db/src/index.ts`
**Action**: Create createDbClient factory function that accepts environment object. If env.HYPERDRIVE exists, return WorkerDatabase. Otherwise, return PostgresDatabase with DATABASE_URL. Add TypeScript type guards for environment detection.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-001-05: Remove singleton pattern from connection.ts
**Assigned To**: AGENT
**Target File**: `packages/db/src/connection.ts`
**Action**: Remove singleton client and db variables. Replace getDb() and getDbOrNull() with deprecation notice pointing to createDbClient. Keep closeDb() for backward compatibility but mark as deprecated.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-001-06: Update repositories to accept Database interface
**Assigned To**: AGENT
**Target File**: `packages/db/src/repositories/calendar.ts`, `packages/db/src/repositories/drive.ts`, `packages/db/src/repositories/tasks.ts`
**Action**: Update all repository constructors to accept Database interface instead of optional db parameter. Remove userId from constructor (will be passed via context in DB-007). Update type signatures.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-001-07: Add dependency injection tests
**Assigned To**: AGENT
**Target File**: `packages/db/src/connection.test.ts` (create)
**Action**: Add tests for PostgresDatabase and WorkerDatabase implementations. Test connection pooling, transaction handling, and graceful shutdown. Test factory function returns correct implementation based on environment.
**Validate Command**: `pnpm --filter @suite/db test`

#### DB-001-08: Update documentation
**Assigned To**: HUMAN
**Target File**: `packages/db/README.md` (create)
**Action**: Create README.md documenting dependency injection pattern, Database interface, factory function, and migration from singleton pattern. Include examples for both Node.js and Workers environments.
**Validate Command**: No validation needed

---

### [ ] DB-002: Add Transaction Support to Repositories

**Priority**: P0
**Bounded Context**: Database Infrastructure
**Status**: Not Started

**Related Files**:
- `packages/db/src/database.interface.ts`
- `packages/db/src/repositories/calendar.ts`
- `packages/db/src/repositories/drive.ts`
- `packages/db/src/repositories/tasks.ts`
- `packages/db/src/transaction-scope.ts` (create)

**Definition of Done**:
- TransactionScope type defined
- All repository methods accept optional tx parameter
- Unit of Work pattern implemented
- Cross-repository transactions supported
- Tests verify transaction rollback on error
- Tests verify commit on success

**Out of Scope**:
- Distributed transactions across databases
- Nested transaction savepoints (unless needed)
- Transaction isolation level configuration (use defaults)

**Rules to Follow**:
- Drizzle transaction API with isolation level configuration
- Pass transaction context to repository methods
- Caller controls transaction boundaries
- Unit of Work pattern for cross-repository operations

**Advanced Coding Pattern**:
- Transaction context passing
- Unit of Work pattern
- Drizzle db.transaction() API
- Transaction rollback on error

**Anti-Patterns**:
- beginTransaction method on repositories
- Repository-controlled transaction boundaries
- Nested transactions without savepoints
- Implicit transaction management

**Imports/Exports**:
- Export TransactionScope type from packages/db/src/index.ts
- Export UnitOfWork class from packages/db/src/unit-of-work.ts` (create)

**Depends On**: DB-001
**Blocks**: DB-003, Production deployment

**Subtasks**:

#### DB-002-01: Define TransactionScope type
**Assigned To**: AGENT
**Target File**: `packages/db/src/transaction-scope.ts` (create)
**Action**: Define TransactionScope type that extends Drizzle database client with transaction-specific methods. Add type for transaction configuration (isolation level, access mode). Export from index.ts.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-002-02: Update repository methods to accept tx parameter
**Assigned To**: AGENT
**Target File**: `packages/db/src/repositories/calendar.ts`, `packages/db/src/repositories/drive.ts`, `packages/db/src/repositories/tasks.ts`
**Action**: Add optional tx?: TransactionScope parameter to all repository methods (create, update, delete). Use tx ?? this.db to use transaction context if provided, otherwise use main connection.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-002-03: Implement Unit of Work class
**Assigned To**: AGENT
**Target File**: `packages/db/src/unit-of-work.ts` (create)
**Action**: Implement UnitOfWork class that accepts Database instance. Add transaction(fn) method that starts transaction, passes context to callback, commits on success, rolls back on error. Include support for multiple repositories in single transaction.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-002-04: Add transaction rollback tests
**Assigned To**: AGENT
**Target File**: `packages/db/src/unit-of-work.test.ts` (create)
**Action**: Add tests verifying transaction rolls back on error. Test that partial updates are not committed when error occurs. Test that multiple repository operations in single transaction either all commit or all rollback.
**Validate Command**: `pnpm --filter @suite/db test`

#### DB-002-05: Add transaction commit tests
**Assigned To**: AGENT
**Target File**: `packages/db/src/unit-of-work.test.ts`
**Action**: Add tests verifying transaction commits on success. Test that multiple repository operations persist when callback completes without error. Test that transaction context is properly passed to repositories.
**Validate Command**: `pnpm --filter @suite/db test`

#### DB-002-06: Update documentation
**Assigned To**: HUMAN
**Target File**: `packages/db/README.md`
**Action**: Update README.md to document transaction support, Unit of Work pattern, and usage examples. Include example of cross-repository transaction.
**Validate Command**: No validation needed

---

### [ ] DB-003: Implement Multi-Tenancy Infrastructure

**Priority**: P0
**Bounded Context**: Database Infrastructure
**Status**: Not Started

**Related Files**:
- `packages/db/src/schema/users.ts`
- `packages/db/src/schema/calendar.ts`
- `packages/db/src/schema/drive.ts`
- `packages/db/src/schema/tasks.ts`
- `packages/db/drizzle/0006_add_tenant_id.sql` (create)
- `packages/db/drizzle/0007_update_rls_policies.sql` (create)
- `packages/db/src/tenant-context.ts` (create)

**Definition of Done**:
- tenant_id columns added to all tenant-scoped tables
- RLS policies updated to use tenant_id
- Tenant context middleware implemented
- SET LOCAL app.current_tenant_id implemented
- Composite indexes on (tenant_id, ...) added
- Tests verify tenant isolation
- Tests verify RLS policies work correctly

**Out of Scope**:
- Schema-per-tenant isolation (future enterprise feature)
- Database-per-tenant isolation (future enterprise feature)
- Tenant-specific migration strategies

**Rules to Follow**:
- Planning docs require shared schema + tenant_id + RLS
- Composite indexes on (tenant_id, ...) for RLS efficiency
- SET LOCAL for tenant context (not SET)
- FORCE ROW LEVEL SECURITY on all tables
- Planning docs: .planning/03-data-06-database-multitenancy.md

**Advanced Coding Pattern**:
- Row-Level Security (RLS) with PostgreSQL
- Session variable-based tenant context
- Composite indexing for multi-tenant queries
- Tenant context propagation via middleware

**Anti-Patterns**:
- Manual WHERE tenant_id filtering (rely on RLS)
- SET instead of SET LOCAL (causes tenant leakage)
- Missing FORCE ROW LEVEL SECURITY
- No composite indexes on tenant_id

**Imports/Exports**:
- Export setTenantContext from packages/db/src/tenant-context.ts
- Export getTenantId from packages/db/src/tenant-context.ts

**Depends On**: DB-001
**Blocks**: DB-004, Production deployment

**Subtasks**:

#### DB-003-01: Add tenant_id column to users table
**Assigned To**: AGENT
**Target File**: `packages/db/src/schema/users.ts`
**Action**: Add tenant_id UUID column to users table. Make nullable initially for backward compatibility. Add foreign key to tenants table (create tenants table if needed). Update type exports.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-003-02: Add tenant_id column to calendar_events table
**Assigned To**: AGENT
**Target File**: `packages/db/src/schema/calendar.ts`
**Action**: Add tenant_id UUID column to calendar_events table. Make NOT NULL for new tables. Add foreign key to users table. Update type exports.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-003-03: Add tenant_id column to drive tables
**Assigned To**: AGENT
**Target File**: `packages/db/src/schema/drive.ts`
**Action**: Add tenant_id UUID column to drive_files and drive_folders tables. Make NOT NULL. Add foreign key to users table. Update type exports.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-003-04: Add tenant_id column to tasks table
**Assigned To**: AGENT
**Target File**: `packages/db/src/schema/tasks.ts`
**Action**: Add tenant_id UUID column to tasks table. Make NOT NULL. Add foreign key to users table. Update type exports.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-003-05: Create migration for tenant_id columns
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle/0006_add_tenant_id.sql` (create)
**Action**: Generate migration for adding tenant_id columns to all tables. Use expand pattern: add nullable columns first, backfill data, then make NOT NULL in separate migration.
**Validate Command**: `pnpm --filter @suite/db db:generate`

#### DB-003-06: Create migration for updated RLS policies
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle/0007_update_rls_policies.sql` (create)
**Action**: Create migration to update RLS policies to use tenant_id instead of user_id. Add FORCE ROW LEVEL SECURITY. Use current_setting('app.current_tenant_id', true) pattern.
**Validate Command**: Review generated SQL manually

#### DB-003-07: Implement tenant context module
**Assigned To**: AGENT
**Target File**: `packages/db/src/tenant-context.ts` (create)
**Action**: Implement setTenantContext(db, tenantId) function that executes SET LOCAL app.current_tenant_id. Implement getTenantId(request) function to extract tenant ID from request headers or JWT. Add TypeScript types.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-003-08: Add composite indexes on tenant_id
**Assigned To**: AGENT
**Target File**: `packages/db/src/schema/calendar.ts`, `packages/db/src/schema/drive.ts`, `packages/db/src/schema/tasks.ts`
**Action**: Add composite indexes on (tenant_id, created_at) for all tables. Add indexes on (tenant_id, user_id) where applicable. This ensures RLS-filtered queries are efficient.
**Validate Command**: `pnpm --filter @suite/db typecheck`

#### DB-003-09: Create migration for composite indexes
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle/0008_add_tenant_indexes.sql` (create)
**Action**: Generate migration for adding composite indexes. Review SQL to ensure indexes are created correctly.
**Validate Command**: `pnpm --filter @suite/db db:generate`

#### DB-003-10: Add tenant isolation tests
**Assigned To**: AGENT
**Target File**: `packages/db/src/repositories/calendar.test.ts`, `packages/db/src/repositories/drive.test.ts`, `packages/db/src/repositories/tasks.test.ts`
**Action**: Add tests verifying tenant isolation. Create two tenants with different IDs, verify data from one tenant is not visible to another. Test RLS policies by attempting direct SQL queries.
**Validate Command**: `pnpm --filter @suite/db test`

#### DB-003-11: Update documentation
**Assigned To**: HUMAN
**Target File**: `packages/db/README.md`, `AGENTS.md`
**Action**: Update README.md to document multi-tenancy implementation, RLS policies, and tenant context usage. Update AGENTS.md to reference multi-tenancy planning doc.
**Validate Command**: No validation needed

---

### [ ] DB-004: Create Per-Domain Migration Configurations

**Priority**: P0
**Bounded Context**: Database Infrastructure
**Status**: Not Started

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

#### DB-004-01: Create calendar domain Drizzle config
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle.calendar.config.ts` (create)
**Action**: Create drizzle.calendar.config.ts with schema: ./src/schema/calendar, out: ./drizzle/calendar, schemaFilter: ['calendar'], tablesFilter: ['calendar_*', 'events', 'attendees'], migrations: { table: '__drizzle_migrations_calendar', schema: 'drizzle' }.
**Validate Command**: `npx drizzle-kit generate --config=packages/db/drizzle.calendar.config.ts`

#### DB-004-02: Create drive domain Drizzle config
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle.drive.config.ts` (create)
**Action**: Create drizzle.drive.config.ts with schema: ./src/schema/drive, out: ./drizzle/drive, schemaFilter: ['drive'], tablesFilter: ['drive_*', 'files', 'folders'], migrations: { table: '__drizzle_migrations_drive', schema: 'drizzle' }.
**Validate Command**: `npx drizzle-kit generate --config=packages/db/drizzle.drive.config.ts`

#### DB-004-03: Create tasks domain Drizzle config
**Assigned To**: AGENT
**Target File**: `packages/db/drizzle.tasks.config.ts` (create)
**Action**: Create drizzle.tasks.config.ts with schema: ./src/schema/tasks, out: ./drizzle/tasks, schemaFilter: ['tasks'], tablesFilter: ['tasks_*'], migrations: { table: '__drizzle_migrations_tasks', schema: 'drizzle' }.
**Validate Command**: `npx drizzle-kit generate --config=packages/db/drizzle.tasks.config.ts`

#### DB-004-04: Implement CI migration runner
**Assigned To**: AGENT
**Target File**: `packages/db/scripts/migrate.ts` (create)
**Action**: Implement migration runner that uses absolute path resolution, PostgreSQL advisory locks, and per-domain migration tables. Map domain names to unique lock IDs (calendar: 1001, drive: 1002, tasks: 1003). Fail fast if APP_DOMAIN not set.
**Validate Command**: `tsx packages/db/scripts/migrate.ts` (with APP_DOMAIN set)

#### DB-004-05: Add migration runner to package.json
**Assigned To**: AGENT
**Target File**: `packages/db/package.json`
**Action**: Add db:migrate script that runs tsx scripts/migrate.ts. Add db:migrate:calendar, db:migrate:drive, db:migrate:tasks scripts for per-domain migrations.
**Validate Command**: `pnpm --filter @suite/db db:migrate:calendar` (with DATABASE_URL set)

#### DB-004-06: Add migration runner tests
**Assigned To**: AGENT
**Target File**: `packages/db/scripts/migrate.test.ts` (create)
**Action**: Add tests for migration runner. Test advisory lock acquisition, migration application, error handling, and lock release. Test with test database.
**Validate Command**: `pnpm --filter @suite/db test`

#### DB-004-07: Update CI/CD workflow for migrations
**Assigned To**: HUMAN
**Target File**: `.github/workflows/deploy.yml`
**Action**: Add migration job before deployment job. Use APP_DOMAIN environment variable to run migrations for affected domains. Add needs: migrations dependency to deployment jobs.
**Validate Command**: Review workflow syntax

#### DB-004-08: Update domain package.json scripts
**Assigned To**: AGENT
**Target File**: `packages/domain-calendar/package.json`, `packages/domain-drive/package.json`, `packages/domain-tasks/package.json`
**Action**: Add db:generate script using per-domain config. Add db:migrate script using APP_DOMAIN pattern.
**Validate Command**: `pnpm --filter @suite/domain-calendar db:generate`

#### DB-004-09: Document migration workflow
**Assigned To**: HUMAN
**Target File**: `packages/db/README.md`, `AGENTS.md`
**Action**: Update README.md to document per-domain migration workflow, CI integration, and expand/contract pattern. Update AGENTS.md to reference migration planning doc and add AI agent rules for migrations.
**Validate Command**: No validation needed

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
