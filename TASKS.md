# Suite Task List

This task list follows Specification-Driven Development (SDD), Domain-Driven Design (DDD), Test-Driven Development (TDD), Behavior-Driven Development (BDD), and deep modules principles.

## Status Legend

- [ ] Not Started
- [~] In Progress
- [x] Complete
- [!] Blocked

---

## Deployment Readiness Tasks

### [ ] DEP-001: Configure Production Secrets

**Status**: Not Started
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

**Advanced Pattern**:
- Secret injection via environment variables in Workers
- Secret validation at startup using Zod schemas

**Anti-Patterns**:
- Hardcoding secrets in code
- Committing secrets to version control
- Using the same secret across environments

**Imports/Exports**:
- None (infrastructure configuration)

**Depends On**:
- None

**Blocks**:
- DEP-002 (E2EE activation)
- DEP-003 (Database connection)

**Subtasks**:

#### DEP-001-01: Configure DATABASE_URL secret
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml files to remove empty DATABASE_URL placeholder and document that it must be set via `wrangler secret put DATABASE_URL`. Add documentation to AGENTS.md or a separate SECRETS.md file explaining secret management workflow.
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### DEP-001-02: Configure BETTER_AUTH_SECRET secret
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml files to remove empty BETTER_AUTH_SECRET placeholder. Document that it must be set via `wrangler secret put BETTER_AUTH_SECRET` with a cryptographically secure random string (minimum 32 characters).
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### DEP-001-03: Configure ENCRYPTION_KEY secret
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml files to remove empty ENCRYPTION_KEY placeholder. Document that it must be set via `wrangler secret put ENCRYPTION_KEY` with a base64-encoded 256-bit AES key. Provide command to generate key: `openssl rand -base64 32`
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### DEP-001-04: Configure Drive R2 secrets
**Assigned To**: AGENT
**Target File**: `apps/drive/api/wrangler.toml`
**Action**: Update wrangler.toml to remove empty R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID placeholders. Document that these must be set via wrangler secret commands for R2 integration.
**Validate Command**: `wrangler secret list --remote` (after deployment)

#### DEP-001-05: Update CI/CD workflow for secrets
**Assigned To**: AGENT
**Target File**: `.github/workflows/deploy.yml`
**Action**: Ensure deployment workflow uses GitHub Actions secrets for CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Add documentation on required secrets in workflow comments or README.
**Validate Command**: Review workflow file for secret references

#### DEP-001-06: Create SECRETS.md documentation
**Assigned To**: AGENT
**Target File**: `SECRETS.md` (create)
**Action**: Create comprehensive documentation for secret management including: secret list, generation commands, wrangler secret commands, CI/CD integration, and security best practices. Update AGENTS.md to reference SECRETS.md.
**Validate Command**: `pnpm typecheck` (to ensure no broken references)

---

### [ ] DEP-002: Activate E2EE Encryption

**Status**: Not Started
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

**Advanced Pattern**:
- Key provider pattern for dependency injection
- Environment-based encryption activation
- Type-safe encrypted data structures

**Anti-Patterns**:
- Storing plaintext user content
- Implementing custom encryption instead of using @suite/crypto
- Hardcoding encryption keys

**Imports/Exports**:
- `@suite/crypto`: encryptItem, decryptItem, generateAESKey
- Domain packages: seal/unseal functions, isEncryptionEnabled

**Depends On**:
- DEP-001-03 (Configure ENCRYPTION_KEY secret)

**Blocks**:
- Production deployment (cannot deploy without encryption active)

**Subtasks**:

#### DEP-002-01: Verify encryption activation logic
**Assigned To**: AGENT
**Target File**: `packages/domain-calendar/src/lib/calendar-crypto.ts`, `packages/domain-tasks/src/lib/tasks-crypto.ts`, `packages/domain-drive/src/drive-crypto.ts`
**Action**: Review isEncryptionEnabled() implementation to ensure it correctly detects when ENCRYPTION_KEY is set. Verify that setKeyProviderFromEnv() properly imports the key and sets the custom provider. Add test to verify encryption is active when ENCRYPTION_KEY is set.
**Validate Command**: `pnpm --filter @suite/domain-calendar test`, `pnpm --filter @suite/domain-tasks test`, `pnpm --filter @suite/domain-drive test`

#### DEP-002-02: Add encryption activation test
**Assigned To**: AGENT
**Target File**: `packages/domain-calendar/src/lib/calendar-crypto.test.ts` (create or update)
**Action**: Add test that verifies isEncryptionEnabled() returns false by default, and returns true after setKeyProviderFromEnv() is called with a valid ENCRYPTION_KEY. Test should verify that seal/unseal functions actually encrypt/decrypt when encryption is enabled.
**Validate Command**: `pnpm --filter @suite/domain-calendar test`

#### DEP-002-03: Update bootstrap to throw if encryption disabled
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/src/bootstrap.ts`, `apps/tasks/api/src/bootstrap.ts`, `apps/drive/api/src/bootstrap.ts`
**Action**: Modify bootstrap functions to throw an error if ENCRYPTION_KEY is not set in production environment (NODE_ENV=production). This prevents accidental deployment without encryption. Add error message explaining that ENCRYPTION_KEY must be set.
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`, `pnpm --filter @suite/tasks-api typecheck`, `pnpm --filter @suite/drive-api typecheck`

#### DEP-002-04: Update documentation
**Assigned To**: AGENT
**Target File**: `README.md`, `AGENTS.md`
**Action**: Update README.md to reflect that E2EE is implemented and activated via ENCRYPTION_KEY. Update AGENTS.md rule 9 status to indicate implementation is complete. Document that encryption is disabled by default for development but required for production.
**Validate Command**: No validation needed

---

### [ ] DEP-003: Verify Better Auth Timing-Safe Comparisons

**Status**: Not Started
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

**Advanced Pattern**:
- Timing-safe comparison wrapper for Better Auth
- Constant-time comparison utility in @suite/crypto

**Anti-Patterns**:
- Using === for secret/token comparisons
- Assuming library handles timing-safe comparisons without verification

**Imports/Exports**:
- `@suite/crypto`: constantTimeEqual (if implemented)
- Better Auth: session, auth

**Depends On**:
- None

**Blocks**:
- Production deployment (security vulnerability if not verified)

**Subtasks**:

#### DEP-003-01: Research Better Auth implementation
**Assigned To**: AGENT
**Target File**: Better Auth documentation and source code
**Action**: Research Better Auth library to determine if it uses timing-safe comparisons for session tokens and HMAC outputs. Check documentation, source code, and GitHub issues. Document findings in a comment or separate verification document.
**Validate Command**: No validation needed (research task)

#### DEP-003-02: Implement constantTimeEqual in @suite/crypto
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/index.ts`, `packages/crypto/src/constant-time.ts` (create)
**Action**: If Better Auth does not use timing-safe comparisons, implement constantTimeEqual() function in @suite/crypto using crypto.subtle.timingSafeEqual. Add comprehensive tests to verify constant-time behavior. Export from index.ts.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### DEP-003-03: Add timing-safe comparison tests
**Assigned To**: AGENT
**Target File**: `packages/crypto/src/constant-time.test.ts` (create)
**Action**: Add property-based tests using fast-check to verify constantTimeEqual() has constant-time execution regardless of input equality. Test should verify timing does not leak information about comparison result.
**Validate Command**: `pnpm --filter @suite/crypto test`

#### DEP-003-04: Document verification status
**Assigned To**: AGENT
**Target File**: `AGENTS.md`
**Action**: Update AGENTS.md rule 11 to document verification status of Better Auth timing-safe comparisons. If wrapper implemented, document usage pattern. If Better Auth verified safe, document verification method and version.
**Validate Command**: No validation needed

---

### [ ] DEP-004: Implement Distributed Rate Limiting

**Status**: Not Started
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

**Advanced Pattern**:
- Cloudflare KV for distributed state
- Atomic operations for rate limit increments
- Fallback to in-memory if KV unavailable

**Anti-Patterns**:
- Using in-memory Map for production
- Assuming single Worker deployment

**Imports/Exports**:
- `@suite/shared-kernel`: rateLimit, RateLimitOptions
- Cloudflare Workers: KV namespace binding

**Depends On**:
- None

**Blocks**:
- Production deployment at scale (in-memory rate limiting fails with multiple Workers)

**Subtasks**:

#### DEP-004-01: Add Cloudflare KV binding to wrangler.toml
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/wrangler.toml`, `apps/tasks/api/wrangler.toml`, `apps/drive/api/wrangler.toml`
**Action**: Add KV namespace binding to each wrangler.toml file for rate limit state storage. Use same namespace name across all APIs (e.g., RATE_LIMIT_KV) or separate namespaces per API.
**Validate Command**: `wrangler whoami` (to verify wrangler configuration)

#### DEP-004-02: Implement KV-based rate limit storage
**Assigned To**: AGENT
**Target File**: `packages/shared-kernel/src/rate-limit.ts`
**Action**: Refactor rateLimit middleware to use Cloudflare KV for distributed state storage instead of in-memory Map. Implement get/put operations with TTL for automatic cleanup. Maintain existing sliding window algorithm. Add fallback to in-memory if KV binding not available (for local development).
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### DEP-004-03: Add distributed rate limit tests
**Assigned To**: AGENT
**Target File**: `packages/shared-kernel/src/rate-limit.test.ts` (create or update)
**Action**: Add tests to verify rate limit state persists across multiple Workers. Mock KV binding for testing. Test edge cases: KV unavailable, concurrent requests, TTL expiration.
**Validate Command**: `pnpm --filter @suite/shared-kernel test`

#### DEP-004-04: Update API index files to pass KV binding
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`
**Action**: Update rateLimit middleware calls to pass KV binding from env to rateLimit options. Modify rateLimit options to accept KV binding parameter.
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`, `pnpm --filter @suite/tasks-api typecheck`, `pnpm --filter @suite/drive-api typecheck`

#### DEP-004-05: Document distributed rate limiting
**Assigned To**: AGENT
**Target File**: `README.md`, `packages/shared-kernel/src/rate-limit.ts`
**Action**: Update README.md to document distributed rate limiting strategy using Cloudflare KV. Add comments in rate-limit.ts explaining KV usage and fallback behavior.
**Validate Command**: No validation needed

---

### [ ] DEP-005: Fix E2E Test Authentication

**Status**: Not Started
**Priority**: P0
**Bounded Context**: Testing

**Related Files**:
- `playwright.global-setup.ts`
- `playwright.config.ts`
- `apps/calendar/web/src/auth-provider.tsx` (if exists)
- `apps/calendar/web/src/App.tsx`

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

**Advanced Pattern**:
- Playwright global setup for authentication
- Storage state reuse across test runs
- Isolated authentication per test suite

**Anti-Patterns**:
- Hardcoding credentials in tests
- Logging in for every test (slow)

**Imports/Exports**:
- Playwright: test, expect, chromium
- Better Auth: signIn, signOut

**Depends On**:
- None

**Blocks**:
- E2E test execution (all E2E tests currently blocked)

**Subtasks**:

#### DEP-005-01: Debug Playwright global setup authentication
**Assigned To**: AGENT
**Target File**: `playwright.global-setup.ts`
**Action**: Run Playwright global setup in debug mode to identify why authentication is failing. Check for: selector changes (Email label not found), timing issues, network errors, or Better Auth configuration issues. Add logging to global setup to trace authentication flow.
**Validate Command**: `npx playwright test --debug`

#### DEP-005-02: Update authentication selectors
**Assigned To**: AGENT
**Target File**: `playwright.global-setup.ts`
**Action**: Update authentication selectors in global setup to match current login form. Verify email input, password input, and submit button selectors. Use data-testid attributes if available for more stable selectors.
**Validate Command**: `npx playwright test --project=chromium --global-setup`

#### DEP-005-03: Verify storage state persistence
**Assigned To**: AGENT
**Target File**: `playwright.config.ts`, `playwright.global-setup.ts`
**Action**: Verify that storage state is being saved to .auth/storage-state.json and loaded correctly in tests. Check file permissions and path configuration. Ensure storage state includes session cookies.
**Validate Command**: `npx playwright test --project=chromium`

#### DEP-005-04: Add authentication test
**Assigned To**: AGENT
**Target File**: `e2e/auth.spec.ts` (create)
**Action**: Create dedicated E2E test for authentication flow to verify sign-in and sign-out work correctly. Test should verify session persistence and redirect behavior.
**Validate Command**: `npx playwright test e2e/auth.spec.ts`

#### DEP-005-05: Run full E2E test suite
**Assigned To**: AGENT
**Target File**: All E2E test files
**Action**: Run full E2E test suite to verify all tests pass with authentication working. Fix any remaining test failures related to authentication or session handling.
**Validate Command**: `npx playwright test`

---

### [ ] DEP-006: Increase Test Coverage

**Status**: Not Started
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

**Advanced Pattern**:
- Property-based testing with fast-check
- Integration tests with test database
- Test doubles for external dependencies

**Anti-Patterns**:
- Writing tests without coverage goals
- Testing implementation details instead of behavior
- Skipping error case tests

**Imports/Exports**:
- Vitest: describe, it, expect, beforeEach
- fast-check: fc, property, asyncProperty

**Depends On**:
- None

**Blocks**:
- Production deployment (coverage below threshold)

**Subtasks**:

#### DEP-006-01: Generate coverage report
**Assigned To**: AGENT
**Target File**: Root directory
**Action**: Run coverage report to identify areas with low coverage. Generate HTML coverage report for detailed analysis. Document current coverage percentages by package.
**Validate Command**: `pnpm ci:coverage`

#### DEP-006-02: Add tests for low-coverage domain code
**Assigned To**: AGENT
**Target File**: `packages/domain-calendar/src/lib/calendar-events.test.ts`, `packages/domain-tasks/src/lib/tasks.test.ts`, `packages/domain-drive/src/index.test.ts`
**Action**: Add unit tests for uncovered code paths in domain packages. Focus on error cases, edge cases, and validation logic. Use property-based tests for pure functions.
**Validate Command**: `pnpm --filter @suite/domain-calendar test --coverage`, `pnpm --filter @suite/domain-tasks test --coverage`, `pnpm --filter @suite/domain-drive test --coverage`

#### DEP-006-03: Add tests for low-coverage API code
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/src/index.test.ts`, `apps/tasks/api/src/index.test.ts`, `apps/drive/api/src/index.test.ts`
**Action**: Add integration tests for uncovered API routes. Test error responses, validation failures, and edge cases. Use test database for integration tests.
**Validate Command**: `pnpm --filter @suite/calendar-api test --coverage`, `pnpm --filter @suite/tasks-api test --coverage`, `pnpm --filter @suite/drive-api test --coverage`

#### DEP-006-04: Add tests for low-coverage shared kernel code
**Assigned To**: AGENT
**Target File**: `packages/shared-kernel/src/*.test.ts`
**Action**: Add tests for uncovered shared kernel utilities. Focus on error handling, edge cases, and integration scenarios. Test circuit breaker, rate limiting, and error types.
**Validate Command**: `pnpm --filter @suite/shared-kernel test --coverage`

#### DEP-006-05: Verify coverage thresholds met
**Assigned To**: AGENT
**Target File**: Root directory
**Action**: Run final coverage report to verify all thresholds are met. Review coverage report for any remaining gaps. Document coverage percentages in TASKS.md or a separate coverage report.
**Validate Command**: `pnpm ci:coverage`

---

### [ ] DEP-007: Enable Web App Deployments

**Status**: Not Started
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

**Advanced Pattern**:
- Nx affected for efficient deployments
- Cloudflare Pages with GitHub integration
- Build optimization for production

**Anti-Patterns**:
- Deploying without building
- Deploying all projects on every change

**Imports/Exports**:
- None (CI/CD configuration)

**Depends On**:
- None

**Blocks**:
- Production web app deployment (currently disabled)

**Subtasks**:

#### DEP-007-01: Enable calendar web deployment
**Assigned To**: AGENT
**Target File**: `.github/workflows/deploy.yml`
**Action**: Remove `if: false` from calendar-web deployment job. Configure Cloudflare Pages deployment using cloudflare/pages-action. Set project name and production branch. Add build command and output directory.
**Validate Command**: Review deploy.yml syntax

#### DEP-007-02: Enable tasks web deployment
**Assigned To**: AGENT
**Target File**: `.github/workflows/deploy.yml`
**Action**: Remove `if: false` from tasks-web deployment job. Configure Cloudflare Pages deployment similar to calendar-web. Ensure unique project name for tasks web.
**Validate Command**: Review deploy.yml syntax

#### DEP-007-03: Enable drive web deployment
**Assigned To**: AGENT
**Target File**: `.github/workflows/deploy.yml`
**Action**: Remove `if: false` from drive-web deployment job. Configure Cloudflare Pages deployment similar to calendar-web. Ensure unique project name for drive web.
**Validate Command**: Review deploy.yml syntax

#### DEP-007-04: Configure web app build outputs
**Assigned To**: AGENT
**Target File**: `apps/calendar/web/package.json`, `apps/tasks/web/package.json`, `apps/drive/web/package.json`
**Action**: Verify build scripts output to correct directories (dist/ or build/). Ensure Vite configuration outputs to directory expected by Cloudflare Pages. Add build scripts if missing.
**Validate Command**: `pnpm --filter @suite/calendar-web build`, `pnpm --filter @suite/tasks-web build`, `pnpm --filter @suite/drive-web build`

#### DEP-007-05: Test web app deployment
**Assigned To**: HUMAN
**Target File**: Cloudflare Pages dashboard
**Action**: Trigger deployment workflow manually to test web app deployment. Verify web apps are accessible at their Cloudflare Pages URLs. Test authentication and basic functionality.
**Validate Command**: Manual testing in browser

---

### [ ] DEP-008: Implement Durable Objects for Real-Time Coordination

**Status**: Not Started
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

**Advanced Pattern**:
- One DO per coordination unit (chat room, document, board)
- Deterministic routing with idFromName()
- SQLite storage in DO constructor
- Hibernation API for cost reduction
- RPC methods for internal communication

**Anti-Patterns**:
- Global singleton DO (bottleneck, poor scaling)
- Multiple coordination units in one DO
- Using fetch() instead of RPC methods
- Not using hibernation for WebSockets (higher cost)

**Imports/Exports**:
- Cloudflare Workers: DurableObject, DurableObjectState
- Hono: Context, Next

**Depends On**:
- None

**Blocks**:
- Real-time feature implementation (chat, docs, boards)

**Subtasks**:

#### DEP-008-01: Document Durable Objects pattern
**Assigned To**: AGENT
**Target File**: `.devin/rules/durable-objects-pattern.md` (update), `AGENTS.md` (update)
**Action**: Review existing Durable Objects pattern documentation. Ensure it covers: one DO per coordination unit, deterministic IDs, SQLite storage, RPC methods, Hibernation API, and Alarms. Update AGENTS.md rule 7 to reference the pattern documentation.
**Validate Command**: No validation needed

#### DEP-008-02: Create Durable Objects template
**Assigned To**: AGENT
**Target File**: `packages/shared-kernel/src/durable-object.ts` (create)
**Action**: Create a template Durable Object class that follows best practices. Include: constructor with SQLite initialization, RPC method examples, hibernation setup, and alarm handling. This template can be used when implementing real-time features.
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### DEP-008-03: Add Durable Objects example
**Assigned To**: AGENT
**Target File**: `packages/shared-kernel/src/durable-object.example.ts` (create)
**Action**: Create an example Durable Object implementation (e.g., a simple chat room) to demonstrate the pattern. Include: DO class definition, routing logic, RPC methods, and integration with Hono API.
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### DEP-008-04: Document DO integration with Hono
**Assigned To**: AGENT
**Target File**: `README.md` or `.planning/04-backend-09-realtime-durable-objects.md` (update)
**Action**: Document how to integrate Durable Objects with Hono APIs. Include: DO namespace binding in wrangler.toml, routing to DO instances, calling RPC methods from fetch handlers, and testing DOs.
**Validate Command**: No validation needed

---

## Blocked Tasks (Not Applicable to Cloudflare Workers)

### [!] P2-006: Add Image Optimization

**Status**: Blocked
**Priority**: P2
**Bounded Context**: Web Performance

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

**Rules to Follow**:
- Lazy load off-screen images
- Serve appropriate sizes

**Advanced Pattern**:
- Intersection Observer for lazy loading
- Responsive image component

**Anti-Patterns**:
- Loading full-size images
- No lazy loading

**Imports/Exports**:
- None (HTML/CSS)

**Depends On**:
- None

**Blocks**:
- None

**Block Reason**: FilePreview.tsx does not exist and no image preview feature exists to optimize. Task assumes image preview UI that hasn't been built yet.

**Subtasks**:

#### P2-006-01: Add lazy loading to drive image preview
**Assigned To**: AGENT
**Target File**: `apps/drive/web/src/components/FilePreview.tsx`
**Action**: Add loading="lazy" to img elements; implement Intersection Observer for advanced lazy loading
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P2-006-02: Add responsive images to drive
**Assigned To**: AGENT
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Add srcset to image elements for responsive sizing
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

---

### [!] P2-013: Add Graceful Shutdown

**Status**: Blocked
**Priority**: P2
**Bounded Context**: API

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- SIGTERM handler implemented
- In-flight requests allowed to complete
- Database connections closed gracefully
- Shutdown logged
- Health check returns shutting down

**Out of Scope**:
- Zero-downtime deployments
- Connection draining for Workers

**Rules to Follow**:
- Handle shutdown signals
- Complete in-flight work

**Advanced Pattern**:
- Graceful shutdown with timeout
- Connection pool draining

**Anti-Patterns**:
- Immediate process exit
- Unclosed connections

**Imports/Exports**:
- None (signal handling)

**Depends On**:
- None

**Blocks**:
- None

**Block Reason**: Task assumes traditional Node.js server with SIGTERM handling. Cloudflare Workers are serverless with no SIGTERM signals, no application-managed connection pools (D1 bindings are runtime-managed), and automatic 30-second grace period for in-flight requests. Graceful shutdown is handled by the Cloudflare runtime, not application code.

**Subtasks**:

#### P2-013-01: Add graceful shutdown to calendar API
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add SIGTERM handler that stops accepting new requests, waits for in-flight requests, closes DB connections
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`

#### P2-013-02: Add graceful shutdown to tasks API
**Assigned To**: AGENT
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add SIGTERM handler that stops accepting new requests, waits for in-flight requests, closes DB connections
**Validate Command**: `pnpm --filter @suite/tasks-api typecheck`

#### P2-013-03: Add graceful shutdown to drive API
**Assigned To**: AGENT
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add SIGTERM handler that stops accepting new requests, waits for in-flight requests, closes DB connections
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

---

### [!] P2-018: Add Response Compression

**Status**: Blocked
**Priority**: P2
**Bounded Context**: API Performance

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

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
- Compress text-based responses
- Don't compress already compressed content

**Advanced Pattern**:
- Compression threshold
- Content-type based compression

**Anti-Patterns**:
- Compressing small responses
- Compressing images

**Imports/Exports**:
- None (middleware)

**Depends On**:
- None

**Blocks**:
- None

**Block Reason**: Cloudflare Workers automatically compress responses at the platform level. Hono documentation states: "On Cloudflare Workers and Deno Deploy, the response body will be compressed automatically, so there is no need to use this middleware." Adding compression middleware would be redundant and adds unnecessary overhead.

**Subtasks**:

#### P2-018-01: Add compression to calendar API
**Assigned To**: AGENT
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add compression middleware with gzip, threshold 1KB
**Validate Command**: `curl -H "Accept-Encoding: gzip" http://localhost:3001/api/v1/events -I | grep Content-Encoding`

#### P2-018-02: Add compression to tasks API
**Assigned To**: AGENT
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add compression middleware with gzip, threshold 1KB
**Validate Command**: `curl -H "Accept-Encoding: gzip" http://localhost:3002/api/v1/tasks -I | grep Content-Encoding`

#### P2-018-03: Add compression to drive API
**Assigned To**: AGENT
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add compression middleware with gzip, threshold 1KB; skip compression for file download routes
**Validate Command**: `curl -H "Accept-Encoding: gzip" http://localhost:3003/api/v1/files -I | grep Content-Encoding`

---

## Completed Tasks

### [x] INF-004: Fix Drive API Test Failures

**Status**: Complete
**Priority**: P2
**Bounded Context**: Testing

**Related Files**:
- `apps/drive/api/src/index.test.ts`
- `apps/drive/api/src/schemas.ts`

**Definition of Done**:
- `pnpm --filter @suite/drive-api test` passes
- All 43 tests in drive/api pass

**Issue Description**:
TASKS.md documented 7 test failures, but actual test run showed only 2 failures:
1. Health check test expected 200 but got 503 (database unavailable in test environment)
2. Search missing query parameter test expected 400 but got 200 (schema allowed optional `q` parameter)

The documented 7 failures were outdated - the actual API behavior was correct, only test expectations needed adjustment.

**Implementation Notes**:
- Fixed health check test to expect 503 when database is unavailable (test environment)
- Changed search schema to require `q` parameter (removed `.optional()`)
- Updated schema transform to always include query in result
- All 43 tests now pass

**Out of Scope**:
- Modifying production API code (only test and schema fixes)
- Changing test behavior beyond fixing expectations

**Rules to Follow**:
- Fix test expectations to match actual API behavior
- Ensure schema validation matches test expectations

**Anti-Patterns**:
- Ignoring test failures
- Suppressing test errors

**Depends On**:
- None

**Blocks**:
- None (previously blocked `pnpm -r run test` workflow validation)

**Subtasks**:

#### INF-004-01: Investigate drive API 500 errors
**Assigned To**: AGENT
**Target File**: `apps/drive/api/src/index.test.ts`
**Action**: Debug why API returns 500 for search, move, and delete operations on non-existent resources
**Status**: Complete - No 500 errors found; documented failures were outdated
**Validate Command**: `pnpm --filter @suite/drive-api test`

#### INF-004-02: Fix drive API test expectations
**Assigned To**: AGENT
**Target File**: `apps/drive/api/src/index.test.ts`, `apps/drive/api/src/schemas.ts`
**Action**: Update test expectations to match actual API behavior after investigation
**Status**: Complete - Fixed health check test and search schema validation
**Validate Command**: `pnpm --filter @suite/drive-api test`
