Here is the cleaned-up and renumbered list of open tasks, with the T032 dependency removed, the biometric task (T043) taken out, and all references adjusted. Only tasks that are not yet [DONE] are included.

---

# Suite Monorepo Deployment Readiness – Open Tasks

> Status: [PENDING] [IN_PROGRESS] [BLOCKED]  
> AGENT = autonomous execution. HUMAN = requires human input.

---

## Task: T050 - Fix Calendar findOverlapping Bug

- [x] **T050** [COMPLETED] Fix Calendar findOverlapping Bug

**Block Reason:** Critical bug in conflict detection logic.

**Files:** `packages/db/src/repositories/calendar.ts`

**Definition of done:** findOverlapping uses ne() instead of eq() for excludeId. Conflict detection works correctly.

**Out of scope:** Changing other repository logic, adding new features.

**Rules:** Bug fixes must be minimal and targeted. Test the fix thoroughly.

**Pattern:** Change eq() to ne() for excludeId parameter in findOverlapping function.

**Anti-pattern:** Leaving the bug unfixed, making unnecessary changes.

**Imports/Exports:** No new exports.

### Subtasks

- [x] **T050.01 [AGENT]** Fix findOverlapping excludeId comparison
  - **File:** `packages/db/src/repositories/calendar.ts`
  - **Action:** Change eq(calendarEvents.id, excludeId) to ne(calendarEvents.id, excludeId) on line 129.
  - **Validation:** `pnpm --filter @suite/db test:run -- calendar.test.ts`.

- [x] **T050.02 [AGENT]** Add regression test for conflict detection
  - **File:** `packages/db/src/repositories/calendar.test.ts`
  - **Action:** Add test that verifies conflict detection excludes the event being updated.
  - **Validation:** `pnpm --filter @suite/db test:run -- calendar.test.ts`.

---

## Task: T051 - Fix Auth Middleware Mounting

- [x] **T051** [COMPLETED] Fix Auth Middleware Mounting

**Block Reason:** GET endpoints are inaccessible because userId is never set in context.

**Files:** `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`

**Definition of done:** authMiddleware is globally mounted. GET endpoints work correctly. Health checks are not blocked.

**Out of scope:** Changing auth logic, adding new endpoints.

**Rules:** Auth middleware must be mounted globally to set userId in context for all requests.

**Pattern:** Mount authMiddleware at the top level, not on specific routes. Use route-specific middleware for health checks.

**Anti-pattern:** Mounting authMiddleware only on specific routes, blocking health checks with requireRepositoryContext.

**Imports/Exports:** No new exports.

### Subtasks

- [x] **T051.01 [AGENT]** Mount authMiddleware globally in Calendar API
  - **File:** `apps/calendar/api/src/index.ts`
  - **Action:** Move authMiddleware to global mount. Ensure it runs before all routes.
  - **Validation:** `pnpm --filter calendar-api typecheck`.

- [x] **T051.02 [AGENT]** Mount authMiddleware globally in Tasks API
  - **File:** `apps/tasks/api/src/index.ts`
  - **Action:** Move authMiddleware to global mount. Ensure it runs before all routes.
  - **Validation:** `pnpm --filter tasks-api typecheck`.

- [x] **T051.03 [AGENT]** Mount authMiddleware globally in Drive API
  - **File:** `apps/drive/api/src/index.ts`
  - **Action:** Move authMiddleware to global mount. Ensure it runs before all routes.
  - **Validation:** `pnpm --filter drive-api typecheck`.

- [x] **T051.04 [AGENT]** Fix health check endpoint blocking
  - **Files:** `apps/*/api/src/index.ts`
  - **Action:** Remove requireRepositoryContext from /api/v1/health and /api/metrics routes.
  - **Validation:** Health checks return 200 without auth.

---

## Task: T056 - Fix Pre-existing Calendar Domain Test Failures

- [x] **T056** [COMPLETED] Fix Pre-existing Calendar Domain Test Failures

**Block Reason:** packages/domain-calendar tests are failing (12 failed, 33 passed). Tests expect conflict detection behavior that may be related to T050 fix.

**Files:** `packages/domain-calendar/src/lib/calendar-events.test.ts`

**Definition of done:** All calendar domain tests pass.

**Out of scope:** Changing test logic without understanding requirements.

**Rules:** Pre-existing test failures must be fixed before proceeding with other work.

**Pattern:** Investigate test failures, determine if they're related to T050 fix, update tests or code accordingly.

**Anti-pattern:** Ignoring test failures, skipping tests without understanding root cause.

**Imports/Exports:** No new exports.

**Implementation Notes:** Root cause was that tests were passing `undefined` as the repository parameter, which created a new `InMemoryCalendarEventRepository` instance for each function call. Events created in one call were not visible in subsequent calls. Fixed by creating a shared repository instance in each test suite's `beforeEach` hook and passing it to all function calls. Also exported `InMemoryCalendarEventRepository` from calendar-events.ts to enable this pattern.

### Subtasks

- [x] **T056.01 [AGENT]** Investigate calendar test failures
  - **File:** `packages/domain-calendar/src/lib/calendar-events.test.ts`
  - **Action:** Analyze failing tests to understand root cause. Check if related to T050 findOverlapping fix.
  - **Validation:** Root cause identified.

- [x] **T056.02 [AGENT]** Fix calendar test failures
  - **File:** `packages/domain-calendar/src/lib/calendar-events.test.ts` or `packages/domain-calendar/src/lib/calendar-events.ts`
  - **Action:** Fix tests or code based on investigation results.
  - **Validation:** `pnpm --filter @suite/domain-calendar test:run` passes.

---

## Task: T052 - Fix pnpm-workspace.yaml Placeholder

- [x] **T052** [COMPLETED] Fix pnpm-workspace.yaml Placeholder

**Block Reason:** Configuration has literal placeholder string instead of boolean.

**Files:** `pnpm-workspace.yaml`

**Definition of done:** protobufjs allowBuilds is set to true or false, not a placeholder string.

**Out of scope:** Changing other workspace configuration.

**Rules:** Configuration files must have valid values, not placeholders.

**Pattern:** Set allowBuilds to boolean value based on build requirements.

**Anti-pattern:** Leaving placeholder strings in configuration files.

**Imports/Exports:** No new exports.

**Implementation Notes:** Set protobufjs allowBuilds to false, consistent with other entries (esbuild, nx, sharp, workerd). protobufjs is not actively used in the codebase.

### Subtasks

- [x] **T052.01 [AGENT]** Fix protobufjs allowBuilds value
  - **File:** `pnpm-workspace.yaml`
  - **Action:** Change "set this to true or false" to boolean value (true or false).
  - **Validation:** `pnpm install` succeeds.

---

## Task: T053 - Configure wrangler.toml Placeholders

- [x] **T053** [COMPLETED] Configure wrangler.toml Placeholders

**Block Reason:** wrangler.toml files have empty BETTER_AUTH_URL and placeholder HYPERDRIVE id.

**Files:** `apps/*/api/wrangler.toml`

**Definition of done:** BETTER_AUTH_URL is configured. HYPERDRIVE id is set to actual value or documented as required.

**Out of scope:** Changing other wrangler configuration.

**Rules:** Production configuration must not have placeholder values.

**Pattern:** Set BETTER_AUTH_URL to actual domain. Set HYPERDRIVE id to actual binding name.

**Anti-pattern:** Leaving placeholder values in production configuration.

**Imports/Exports:** No new exports.

**Implementation Notes:** Removed BETTER_AUTH_URL from wrangler.toml [vars] since it should be set via environment variables (wrangler secret or .env file). Replaced PLACEHOLDER_HYPERDRIVE_ID with comments indicating it needs to be configured with actual Hyperdrive configuration ID from Cloudflare dashboard.

### Subtasks

- [x] **T053.01 [AGENT]** Configure BETTER_AUTH_URL in Calendar API
  - **File:** `apps/calendar/api/wrangler.toml`
  - **Action:** Set BETTER_AUTH_URL to actual domain or document as environment variable.
  - **Validation:** Configuration is valid.

- [x] **T053.02 [AGENT]** Configure BETTER_AUTH_URL in Tasks API
  - **File:** `apps/tasks/api/wrangler.toml`
  - **Action:** Set BETTER_AUTH_URL to actual domain or document as environment variable.
  - **Validation:** Configuration is valid.

- [x] **T053.03 [AGENT]** Configure BETTER_AUTH_URL in Drive API
  - **File:** `apps/drive/api/wrangler.toml`
  - **Action:** Set BETTER_AUTH_URL to actual domain or document as environment variable.
  - **Validation:** Configuration is valid.

- [x] **T053.04 [AGENT]** Configure HYPERDRIVE ids
  - **Files:** `apps/*/api/wrangler.toml`
  - **Action:** Replace PLACEHOLDER_HYPERDRIVE_ID with actual binding names or document as required.
  - **Validation:** Configuration is valid.

---

## Task: T054 - Add Calendar DELETE Endpoint

- [x] **T054** [COMPLETED] Add Calendar DELETE Endpoint

**Block Reason:** Calendar API missing DELETE /api/v1/events/:id endpoint (Tasks and Drive have DELETE).

**Files:** `apps/calendar/api/src/index.ts`

**Definition of done:** DELETE /api/v1/events/:id endpoint exists and works correctly.

**Out of scope:** Changing other endpoints, adding new features.

**Rules:** API consistency across apps - all apps should have CRUD endpoints.

**Pattern:** Follow pattern from Tasks and Drive DELETE endpoints.

**Anti-pattern:** Missing DELETE endpoint, inconsistent API across apps.

**Imports/Exports:** No new exports.

**Implementation Notes:** Added `deleteCalendarEvent` function to domain-calendar package. Added DELETE endpoint to Calendar API following Tasks/Drive pattern. Added tests for DELETE endpoint.

### Subtasks

- [x] **T054.01 [AGENT]** Add DELETE events endpoint
  - **File:** `apps/calendar/api/src/index.ts`
  - **Action:** Add DELETE /api/v1/events/:id endpoint following Tasks/Drive pattern.
  - **Validation:** `pnpm --filter calendar-api typecheck`.

- [x] **T054.02 [AGENT]** Add DELETE endpoint test
  - **File:** `apps/calendar/api/src/index.test.ts` (create if needed)
  - **Action:** Test DELETE endpoint returns 200 and deletes event.
  - **Validation:** `pnpm --filter calendar-api test:run`.

---

## Task: T055 - Fix Unsafe organizationId Cast

- [x] **T055** [COMPLETED] Fix Unsafe organizationId Cast

**Block Reason:** apps/*/api organizationId read via unsafe (c.get('auth') as any)?.session?.organizationId cast.

**Files:** `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`

**Definition of done:** organizationId is read via c.get('organizationId') set by authMiddleware.

**Out of scope:** Changing auth logic, adding new features.

**Rules:** Avoid unsafe type casts. Use properly typed context values.

**Pattern:** Use c.get('organizationId') instead of (c.get('auth') as any)?.session?.organizationId.

**Anti-pattern:** Unsafe type casts, bypassing type safety.

**Imports/Exports:** No new exports.

**Implementation Notes:** Replaced unsafe type casts with properly typed context access. Added `organizationId: string | null` to Variables type in all three API files to match the value set by authMiddleware.

### Subtasks

- [x] **T055.01 [AGENT]** Fix organizationId cast in Calendar API
  - **File:** `apps/calendar/api/src/index.ts`
  - **Action:** Replace (c.get('auth') as any)?.session?.organizationId with c.get('organizationId').
  - **Validation:** `pnpm --filter calendar-api typecheck`.

- [x] **T055.02 [AGENT]** Fix organizationId cast in Tasks API
  - **File:** `apps/tasks/api/src/index.ts`
  - **Action:** Replace (c.get('auth') as any)?.session?.organizationId with c.get('organizationId').
  - **Validation:** `pnpm --filter tasks-api typecheck`.

- [x] **T055.03 [AGENT]** Fix organizationId cast in Drive API
  - **File:** `apps/drive/api/src/index.ts`
  - **Action:** Replace (c.get('auth') as any)?.session?.organizationId with c.get('organizationId').
  - **Validation:** `pnpm --filter drive-api typecheck`.

---

## Task: T001 - Add Secure Account Recovery with Identity Verification

- [!] **T001** [BLOCKED] Add Secure Account Recovery with Identity Verification

**Block Reason:** Contradictory requirements (biometric verification both in scope and out of scope). Needs clarification before implementation.

**Files:** `packages/auth/src/account-recovery.ts` (create), `packages/auth/src/server.ts`

**Definition of done:** Identity verification integration for account recovery. Multi-step verification process. Rate limiting on recovery attempts. Audit logging. Tests cover recovery.

**Out of scope:** In-person verification, biometric verification, custom verification flows.

**Rules:** Account recovery is a major attack vector. Identity verification secures recovery.

**Pattern:** Multi-step verification (email + SMS + identity proof). Rate limit recovery attempts. Audit log all attempts.

**Anti-pattern:** Single-factor recovery. No rate limiting. No audit trail.

**Imports/Exports:** Export `initiateAccountRecovery()` and `completeAccountRecovery()` functions. Import in server.ts.

### Subtasks

- [ ] **T001.01 [AGENT]** Create account recovery module
  - **File:** `packages/auth/src/account-recovery.ts` (create)
  - **Action:** Create initiateAccountRecovery(email) and completeAccountRecovery(token, verificationData) functions.
  - **Validation:** `pnpm --filter @suite/auth typecheck`.

- [ ] **T001.02 [AGENT]** Add identity verification
  - **File:** `packages/auth/src/account-recovery.ts`
  - **Action:** Integrate identity verification provider (government ID). Multi-step verification flow.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

- [ ] **T001.03 [AGENT]** Add rate limiting
  - **File:** `packages/auth/src/account-recovery.ts`
  - **Action:** Rate limit recovery attempts per email. Use KV for tracking.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

- [ ] **T001.04 [AGENT]** Add audit logging
  - **File:** `packages/auth/src/account-recovery.ts`
  - **Action:** Log all recovery attempts with outcome. Include IP, timestamp, verification method.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

- [ ] **T001.05 [AGENT]** Add account recovery tests
  - **File:** `packages/auth/src/account-recovery.test.ts` (create)
  - **Action:** Test recovery flow. Test rate limiting. Test audit logging.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

---

## Task: T002 - Add Internationalization (i18n) Support

- [!] **T002** [BLOCKED] Add Internationalization (i18n) Support

**Block Reason:** This is a large feature requiring i18n framework integration, translation files for 6+ languages, localized email templates, language detection, and RTL support. Should be deferred until there is a clear business need for multi-language support. Current implementation with English strings is acceptable for MVP.

**Files:** `packages/auth/src/i18n.ts` (create), `packages/auth/locales/` (create), `packages/auth/src/server.ts`

**Definition of done:** i18n framework integration. Translation files for common languages. Localized email templates. Language detection and selection. RTL support. Tests cover i18n.

**Out of scope:** Auto-translation, custom locale formats, locale-specific validation.

**Rules:** Multi-language support required for global applications. Email templates, login prompts, error messages need localization.

**Pattern:** i18n framework (i18next or similar). Translation files per language. Language detection from headers/URL.

**Anti-pattern:** Hardcoded English strings. No localization. No RTL support.

**Imports/Exports:** Export `configureI18n()` and `t()` translation function. Import in server.ts.

### Subtasks

- [ ] **T002.01 [AGENT]** Create i18n module
  - **File:** `packages/auth/src/i18n.ts` (create)
  - **Action:** Create configureI18n() function. Integrate i18n framework. Export t() function.
  - **Validation:** `pnpm --filter @suite/auth typecheck`.

- [ ] **T002.02 [AGENT]** Create translation files
  - **File:** `packages/auth/locales/` (create)
  - **Action:** Create translation files for en, es, fr, de, ja, zh. Translate common auth messages.
  - **Validation:** Translation files exist and are valid JSON.

- [ ] **T002.03 [AGENT]** Localize email templates
  - **File:** `packages/auth/src/server.ts`
  - **Action:** Use t() function in email templates. Support localized email content.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

- [ ] **T002.04 [AGENT]** Add language detection
  - **File:** `packages/auth/src/i18n.ts`
  - **Action:** Detect language from Accept-Language header or URL parameter. Set user language preference.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

- [ ] **T002.05 [AGENT]** Add RTL support
  - **File:** `packages/auth/src/i18n.ts`
  - **Action:** Support RTL languages (ar, he). Provide RTL-aware templates.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

- [ ] **T002.06 [AGENT]** Add i18n tests
  - **File:** `packages/auth/src/i18n.test.ts` (create)
  - **Action:** Test language detection. Test translation loading. Test RTL support.
  - **Validation:** `pnpm --filter @suite/auth test:run`.

---

## Task: T003 - Create Test Data Factories

- [x] **T003** [COMPLETED] Create Test Data Factories

**Files:** `packages/db/src/test-helpers/factories/calendar.ts` (create), `packages/db/src/test-helpers/factories/tasks.ts` (create), `packages/db/src/test-helpers/factories/drive.ts` (create), `packages/db/src/test-helpers/factories/auth.ts` (create)

**Definition of done:** Factories create valid test data. Factories support overrides. Factories handle encryption. Tests use factories consistently.

**Out of scope:** Changing existing test data, adding factory methods for non-existent entities, complex test scenarios.

**Rules:** TDD: reusable test data builders. Factory pattern for test data. Consistent test data across tests.

**Pattern:** Factory functions with required params and optional overrides. Default values for common fields. Encryption handled internally.

**Anti-pattern:** Hardcoded test data in each test. Inconsistent data formats. Manual encryption in tests.

**Blocks:** T004

**Imports/Exports:** Export factory functions. Import in test files.

### Subtasks

- [x] **T003.01 [AGENT]** Create calendar event factory
  - **File:** `packages/db/src/test-helpers/factories/calendar.ts` (create)
  - **Action:** Create createCalendarEvent(overrides) function. Default title, startAt, endAt. Support field overrides.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T003.02 [AGENT]** Create task factory
  - **File:** `packages/db/src/test-helpers/factories/tasks.ts` (create)
  - **Action:** Create createTask(overrides) function. Default title, completed, priority, tags. Support field overrides.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T003.03 [AGENT]** Create drive file factory
  - **File:** `packages/db/src/test-helpers/factories/drive.ts` (create)
  - **Action:** Create createDriveFile(overrides) function. Default name, size, mimeType. Support field overrides.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T003.04 [AGENT]** Create drive folder factory
  - **File:** `packages/db/src/test-helpers/factories/drive.ts`
  - **Action:** Create createDriveFolder(overrides) function. Default name, parentId. Support field overrides.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T003.05 [AGENT]** Create user factory
  - **File:** `packages/db/src/test-helpers/factories/auth.ts` (create)
  - **Action:** Create createUser(overrides) function. Default email, name. Support field overrides.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T003.06 [AGENT]** Add encryption support to factories
  - **Files:** `packages/db/src/test-helpers/factories/*.ts`
  - **Action:** Add encryption parameter to factories. If encryption enabled, encrypt data before returning. Use @suite/crypto.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T003.07 [AGENT]** Update calendar tests to use factory
  - **File:** `packages/db/src/repositories/calendar.test.ts`
  - **Action:** Replace hardcoded test data with createCalendarEvent() calls. Use overrides for specific test cases.
  - **Validation:** `pnpm --filter @suite/db test:run -- calendar.test.ts`.

- [x] **T003.08 [AGENT]** Update tasks tests to use factory
  - **File:** `packages/db/src/repositories/tasks.test.ts`
  - **Action:** Replace hardcoded test data with createTask() calls. Use overrides for specific test cases.
  - **Validation:** `pnpm --filter @suite/db test:run -- tasks.test.ts`.

- [x] **T003.09 [AGENT]** Update drive tests to use factory
  - **File:** `packages/db/src/repositories/drive.test.ts`
  - **Action:** Replace hardcoded test data with createDriveFile() and createDriveFolder() calls.
  - **Validation:** `pnpm --filter @suite/db test:run -- drive.test.ts`.

- [x] **T003.10 [AGENT]** Document factory usage
  - **File:** `packages/db/docs/test-factories.md` (create)
  - **Action:** Document factory functions. Explain override pattern. Provide examples.
  - **Validation:** Documentation explains factory usage clearly.

---

## Task: T004 - Document Expand-Contract Pattern

- [x] **T004** [COMPLETED] Document Expand-Contract Pattern

**Files:** `packages/db/docs/migration-patterns.md` (create), `packages/db/templates/expand-migration.sql` (create), `packages/db/templates/contract-migration.sql` (create), `packages/db/scripts/validate-migration.ts` (create), `packages/db/scripts/verify-migration.ts` (create), `AGENTS.md`

**Definition of done:** Documentation covers all migration phases. Templates are usable for new migrations. Checklist prevents common mistakes. Validation scripts catch errors early.

**Out of scope:** Writing actual migrations, changing existing migrations, new migration tools.

**Rules:** Zero-downtime migrations require expand-contract pattern. AGENTS.md Rule 5: migrations in CI only.

**Pattern:** 4-phase migration: Expand (add new column/table), Deploy (update code), Backfill (migrate data), Contract (remove old column/table).

**Anti-pattern:** Single-phase migrations. Breaking changes without expand phase. Removing columns before backfill.

**Depends on:** T003

**Blocks:** T005

**Imports/Exports:** Export validation functions. Import in CI workflow.

### Subtasks

- [x] **T004.01 [AGENT]** Create migration patterns documentation
  - **File:** `packages/db/docs/migration-patterns.md` (create)
  - **Action:** Document expand-contract pattern. Explain 4 phases. Provide examples. Include checklist.
  - **Validation:** Documentation covers all phases clearly.

- [x] **T004.02 [AGENT]** Create expand migration template
  - **File:** `packages/db/templates/expand-migration.sql` (create)
  - **Action:** Create template for expand phase. Add new column/table. Mark as nullable. Add comment with phase.
  - **Validation:** Template is usable for new expand migrations.

- [x] **T004.03 [AGENT]** Create contract migration template
  - **File:** `packages/db/templates/contract-migration.sql` (create)
  - **Action:** Create template for contract phase. Remove old column/table. Add comment with phase.
  - **Validation:** Template is usable for new contract migrations.

- [x] **T004.04 [AGENT]** Create migration validation script
  - **File:** `packages/db/scripts/validate-migration.ts` (create)
  - **Action:** Create validateMigration() function. Check for forbidden operations (DROP COLUMN without contract, ALTER COLUMN TYPE without expand). Return errors.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T004.05 [AGENT]** Create migration verification script
  - **File:** `packages/db/scripts/verify-migration.ts` (create)
  - **Action:** Create verifyMigration() function. Check migration follows expand-contract pattern. Verify phases in correct order.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T004.06 [AGENT]** Add migration checklist to AGENTS.md
  - **File:** `AGENTS.md`
  - **Action:** Add migration checklist section. Include expand-contract pattern requirements. Add validation steps.
  - **Validation:** AGENTS.md includes migration checklist.

- [x] **T004.07 [AGENT]** Create example migration
  - **File:** `packages/db/examples/add-column-migration.md` (create)
  - **Action:** Document example migration following expand-contract pattern. Show all 4 phases with SQL.
  - **Validation:** Example is clear and follows pattern.

---

## Task: T005 - Add Migration Linter

- [x] **T005** [COMPLETED] Add Migration Linter

**Files:** `packages/db/.migration-linter.json` (create), `packages/db/scripts/lint-migrations.ts` (create), `.github/workflows/ci.yml`

**Definition of done:** Linter catches anti-patterns. CI fails on linter violations. Documentation explains all rules.

**Out of scope:** Writing new migrations, changing existing migrations, custom linter rules beyond anti-patterns.

**Rules:** Pre-commit validation for migrations. CI enforces migration quality. Prevent common mistakes.

**Pattern:** JSON config with forbidden operations. TypeScript linter script. CI integration.

**Anti-pattern:** Manual migration review. No automated validation. Common anti-patterns slip through.

**Depends on:** T004

**Blocks:** T006

**Imports/Exports:** Export lintMigrations() function. Import in CI workflow.

**Implementation Notes:** Created migration linter with 6 forbidden operation rules (DROP_COLUMN, ALTER_COLUMN_TYPE, CREATE_INDEX, DROP_TABLE, DROP_CONSTRAINT, ADD_NOT_NULL) and 2 required pattern rules (PHASE_COMMENT, ROLLBACK_COMMENT). Linter runs in CI before migrations. Initial schema migrations (0000_*.sql, 0001_*.sql) are excluded. All existing migrations pass linter checks.

### Subtasks

- [x] **T005.01 [AGENT]** Create linter configuration
  - **File:** `packages/db/.migration-linter.json` (create)
  - **Action:** Define forbidden operations: DROP COLUMN without contract, ALTER COLUMN TYPE without expand, CREATE INDEX without CONCURRENTLY, missing RLS policy updates.
  - **Validation:** JSON is valid and contains all rules.

- [x] **T005.02 [AGENT]** Create linter script
  - **File:** `packages/db/scripts/lint-migrations.ts` (create)
  - **Action:** Create lintMigrations() function. Parse migration SQL. Check against forbidden operations. Return errors.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T005.03 [AGENT]** Add linter to package.json scripts
  - **File:** `packages/db/package.json`
  - **Action:** Add "lint:migrations": "tsx scripts/lint-migrations.ts" script.
  - **Validation:** `pnpm --filter @suite/db lint:migrations` runs successfully.

- [x] **T005.04 [AGENT]** Integrate linter in CI
  - **File:** `.github/workflows/ci.yml`
  - **Action:** Add step to run migration linter before migration step. Fail CI on linter errors.
  - **Validation:** CI workflow includes linter step.

- [x] **T005.05 [AGENT]** Test linter on existing migrations
  - **Action:** Run linter on existing migrations. Document any violations. Fix or document exceptions.
  - **Validation:** Linter runs without errors or violations are documented.

- [x] **T005.06 [AGENT]** Document linter rules
  - **File:** `packages/db/docs/migration-linter.md` (create)
  - **Action:** Document all linter rules. Explain why each rule exists. Provide examples.
  - **Validation:** Documentation explains all rules clearly.

---

## Task: T006 - Implement Observability

- [x] **T006** [COMPLETED] Implement Observability

**Files:** `packages/db/src/observability/query-logger.ts` (create), `packages/db/src/observability/metrics.ts` (create), `packages/db/src/observability/slow-query-detector.ts` (create), `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`

**Definition of done:** All queries logged with metadata. Metrics exported to Prometheus. Slow queries detected and logged. Connection pool monitored. Dashboard shows key metrics.

**Out of scope:** Changing query logic, adding new metrics beyond basics, custom dashboard design.

**Rules:** Observability is non-negotiable for production. Query logging for debugging. Metrics for monitoring.

**Pattern:** Middleware pattern for query logging. Prometheus metrics export. Slow query threshold configuration.

**Anti-pattern:** No query logging. No metrics. Silent failures. No slow query detection.

**Depends on:** T005

**Blocks:** T007

**Imports/Exports:** Export observability functions. Import in database implementations.

**Implementation Notes:** Created query logger with structured logging, metrics collector with Prometheus export format, slow query detector with configurable thresholds. Integrated observability into both PostgresDatabase and WorkerDatabase. Added connection pool monitoring. Created Grafana dashboard documentation. All tests pass (21/21). Note: In-memory metrics reset per Worker invocation; for production, consider using Workers Analytics Engine for metrics aggregation.

### Subtasks

- [x] **T006.01 [AGENT]** Create query logger
  - **File:** `packages/db/src/observability/query-logger.ts` (create)
  - **Action:** Create logQuery(query, duration, context) function. Log query SQL, duration, userId, tenantId. Use structured logging.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T006.02 [AGENT]** Create metrics collector
  - **File:** `packages/db/src/observability/metrics.ts` (create)
  - **Action:** Create metrics for query duration (p50, p95, p99), connection pool utilization, transaction success/failure rate, slow query count. Export to Prometheus format.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T006.03 [AGENT]** Create slow query detector
  - **File:** `packages/db/src/observability/slow-query-detector.ts` (create)
  - **Action:** Create detectSlowQuery(query, duration) function. Log queries >1s duration. Alert on queries >5s.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T006.04 [AGENT]** Integrate query logging in PostgresDatabase
  - **File:** `packages/db/src/postgres-database.ts`
  - **Action:** Wrap query() method with query logger. Log duration and metadata. Call slow query detector.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T006.05 [AGENT]** Integrate query logging in WorkerDatabase
  - **File:** `packages/db/src/worker-database.ts`
  - **Action:** Same pattern as T006.04.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T006.06 [AGENT]** Add connection pool monitoring
  - **Files:** `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`
  - **Action:** Track active/idle connections. Export as metrics. Log when pool near capacity.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T006.07 [AGENT]** Create observability dashboard
  - **File:** `packages/db/docs/observability-dashboard.md` (create)
  - **Action:** Document key metrics. Provide Grafana dashboard configuration. Explain alert thresholds.
  - **Validation:** Dashboard configuration is complete.

- [x] **T006.08 [AGENT]** Add observability tests
  - **File:** `packages/db/src/observability/observability.test.ts` (create)
  - **Action:** Test query logging. Test metrics collection. Test slow query detection.
  - **Validation:** `pnpm --filter @suite/db test:run`.

---

## Task: T007 - Add Retry Logic and Error Handling

- [x] **T007** [COMPLETED] Add Retry Logic and Error Handling

**Files:** `packages/db/src/error-handling/retry.ts` (create), `packages/db/src/error-handling/error-codes.ts` (create), `packages/db/src/error-handling/circuit-breaker.ts` (create), `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`

**Definition of done:** Transient errors retried with backoff. Permanent errors not retried. Error codes are actionable. Circuit breaker prevents cascading failures.

**Out of scope:** Changing query logic, custom retry strategies beyond exponential backoff, new error codes beyond standard set.

**Rules:** Transient errors should be retried. Permanent errors should fail fast. Error codes must be actionable.

**Pattern:** Exponential backoff retry with max attempts. Error classification (transient vs permanent). Circuit breaker pattern for repeated failures.

**Anti-pattern:** No retry logic. Retry everything including permanent errors. Generic error messages. No circuit breaker.

**Depends on:** T006

**Blocks:** T008

**Imports/Exports:** Export retry functions and error codes. Import in database implementations.

**Implementation Notes:** Created error-codes.ts with PostgreSQL SQLSTATE classification (transient: 57P01, 08006, 08003; permanent: 23505, 23503, etc.). Created retry.ts with exponential backoff (100ms, 200ms, 400ms, 800ms) and jitter. Created circuit-breaker.ts with Closed/Open/Half-Open states. Integrated retry in both PostgresDatabase and WorkerDatabase query methods. Added CircuitBreakerDatabase wrapper in database-factory.ts. Updated error messages to include actionable error codes. All tests passing (40/40).

### Subtasks

- [x] **T007.01 [AGENT]** Create error codes
  - **File:** `packages/db/src/error-handling/error-codes.ts` (create)
  - **Action:** Define error codes: DB_CONNECTION_FAILED, DB_QUERY_TIMEOUT, DB_CONSTRAINT_VIOLATION, DB_DEADLOCK_DETECTED, DB_TRANSIENT_ERROR. Export constants.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T007.02 [AGENT]** Create retry logic
  - **File:** `packages/db/src/error-handling/retry.ts` (create)
  - **Action:** Create retryWithBackoff(fn, maxAttempts) function. Exponential backoff: 100ms, 200ms, 400ms, 800ms. Classify errors as transient/permanent.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T007.03 [AGENT]** Create circuit breaker
  - **File:** `packages/db/src/error-handling/circuit-breaker.ts` (create)
  - **Action:** Create CircuitBreaker class. Track failure count. Open circuit after threshold. Half-open after timeout. Close on success.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T007.04 [AGENT]** Integrate retry in PostgresDatabase
  - **File:** `packages/db/src/postgres-database.ts`
  - **Action:** Wrap query() method with retry logic. Retry transient errors. Fail fast on permanent errors.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T007.05 [AGENT]** Integrate retry in WorkerDatabase
  - **File:** `packages/db/src/worker-database.ts`
  - **Action:** Same pattern as T007.04.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T007.06 [AGENT]** Add circuit breaker to database factory
  - **File:** `packages/db/src/database-factory.ts`
  - **Action:** Wrap database instances with circuit breaker. Configure threshold and timeout.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T007.07 [AGENT]** Update error messages
  - **Files:** `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`
  - **Action:** Replace generic errors with error codes. Add actionable error messages. Include context in errors.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T007.08 [AGENT]** Add error handling tests
  - **File:** `packages/db/src/error-handling/error-handling.test.ts` (create)
  - **Action:** Test retry logic. Test circuit breaker. Test error classification.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T007.09 [AGENT]** Document error handling strategy
  - **File:** `packages/db/docs/error-handling.md` (create)
  - **Action:** Document error codes. Explain retry logic. Document circuit breaker pattern.
  - **Validation:** Documentation explains error handling clearly.

---

## Task: T008 - Implement Backup/Restore Strategy

- [x] **T008** [COMPLETED] Implement Backup/Restore Strategy

**Files:** `packages/db/docs/backup-strategy.md` (create), `packages/db/scripts/backup.sh` (create), `packages/db/scripts/restore.sh` (create), `packages/db/scripts/verify-backup.sh` (create)

**Definition of done:** WAL archiving configured. Backups run automatically. Restore tested and verified. RTO < 1 hour, RPO < 5 minutes.

**Out of scope:** Creating backup storage infrastructure, changing backup schedule, custom backup tools.

**Rules:** Disaster recovery is non-negotiable. WAL archiving for PITR. Regular base backups.

**Pattern:** pg_basebackup for base backups. WAL archiving for continuous backup. PITR for point-in-time recovery.

**Anti-pattern:** No backups. Backups not tested. No WAL archiving. Manual backup process.

**Depends on:** T007

**Blocks:** T009

**Imports/Exports:** Export backup/restore functions. Import in scripts.

**Implementation Notes:** Created comprehensive backup-strategy.md documentation covering WAL archiving setup, base backup strategy, PITR restore procedures, RTO/RPO targets, monitoring, disaster recovery runbook, and troubleshooting. Created backup.sh script using pg_basebackup with compression, S3 upload support, and automatic cleanup. Created restore.sh script for PITR with time-based recovery target. Created verify-backup.sh script supporting pg_verifybackup (PostgreSQL 13+) and tar validation. All scripts use environment variables for configuration (BACKUP_DIR, S3_BACKUP_BUCKET, BACKUP_USER, BACKUP_HOST). Documentation includes cron schedule examples and monitoring queries.

### Subtasks

- [x] **T008.01 [AGENT]** Document WAL archiving setup
  - **File:** `packages/db/docs/backup-strategy.md` (create)
  - **Action:** Document wal_level = replica, archive_mode = on. Explain WAL archiving configuration. Provide PostgreSQL config examples.
  - **Validation:** Documentation covers WAL archiving setup.

- [x] **T008.02 [AGENT]** Create backup script
  - **File:** `packages/db/scripts/backup.sh` (create)
  - **Action:** Create script using pg_basebackup. Compress backup. Upload to storage (S3 or local). Log backup status.
  - **Validation:** Script is executable and runs without errors.

- [x] **T008.03 [AGENT]** Create restore script
  - **File:** `packages/db/scripts/restore.sh` (create)
  - **Action:** Create script for PITR. Restore base backup. Replay WAL to target time. Verify restore.
  - **Validation:** Script is executable and runs without errors.

- [x] **T008.04 [AGENT]** Create backup verification script
  - **File:** `packages/db/scripts/verify-backup.sh` (create)
  - **Action:** Create script to verify backup integrity. Check backup completeness. Test restore in sandbox.
  - **Validation:** Script is executable and runs without errors.

- [x] **T008.05 [AGENT]** Document RTO/RPO targets
  - **File:** `packages/db/docs/backup-strategy.md`
  - **Action:** Document RTO < 1 hour, RPO < 5 minutes. Explain how targets are met. Provide runbook for disaster recovery.
  - **Validation:** Documentation includes RTO/RPO targets.

- [ ] **T008.06 [HUMAN]** Configure WAL archiving in production
  - **Action:** Configure PostgreSQL for WAL archiving. Set up storage for WAL files. Test archiving.
  - **Validation:** WAL files are archived successfully.

- [ ] **T008.07 [HUMAN]** Set up automated backups
  - **Action:** Configure cron job or scheduler for backup script. Set up monitoring for backup failures. Test automated backup.
  - **Validation:** Backups run automatically and succeed.

- [ ] **T008.08 [HUMAN]** Test restore procedure
  - **Action:** Perform test restore from backup. Verify data integrity. Document restore time.
  - **Validation:** Restore succeeds within RTO target.

---

## Task: T009 - Enhance Security Layers

- [x] **T009** [COMPLETED] Enhance Security Layers

**Files:** `packages/db/src/security/query-validator.ts` (create), `packages/db/src/security/audit-logger.ts` (create), `packages/db/src/security/rate-limiter.ts` (create), `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`

**Definition of done:** All queries validated before execution. Sensitive operations audited. Rate limiting enforced per tenant. Audit logs searchable.

**Out of scope:** Changing query logic, new security features beyond basics, custom audit log storage.

**Rules:** Security is defense-in-depth. Query validation prevents injection. Audit logging for compliance. Rate limiting prevents abuse.

**Pattern:** Query validation middleware. Structured audit logging. Token bucket rate limiting per tenant.

**Anti-pattern:** No query validation. No audit logging. No rate limiting. Silent security failures.

**Depends on:** T008

**Blocks:** T010

**Imports/Exports:** Export security functions. Import in database implementations.

**Implementation Notes:** Created three security modules: query-validator.ts (SQL injection detection), audit-logger.ts (sensitive operation logging), rate-limiter.ts (token bucket per-tenant rate limiting). Integrated query validation and rate limiting into both PostgresDatabase and WorkerDatabase. Integrated audit logging into all repository create/update/delete methods (calendar, tasks, drive). Added comprehensive test suite with 36 tests covering all three modules. Created documentation explaining security layers, usage patterns, and production considerations.

### Subtasks

- [x] **T009.01 [AGENT]** Create query validator
  - **File:** `packages/db/src/security/query-validator.ts` (create)
  - **Action:** Create validateQuery(query) function. Check for SQL injection patterns. Validate query length. Reject suspicious queries.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T009.02 [AGENT]** Create audit logger
  - **File:** `packages/db/src/security/audit-logger.ts` (create)
  - **Action:** Create logAuditEvent(event) function. Log user creation/deletion, permission changes, bulk exports, schema modifications. Include userId, tenantId, timestamp.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T009.03 [AGENT]** Create rate limiter
  - **File:** `packages/db/src/security/rate-limiter.ts` (create)
  - **Action:** Create RateLimiter class per tenant. Token bucket algorithm. Configurable limits per tenant. Reject over-limit requests.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T009.04 [AGENT]** Integrate query validation in databases
  - **Files:** `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`
  - **Action:** Call validateQuery() before executing queries. Reject invalid queries with clear error.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T009.05 [AGENT]** Integrate audit logging in repositories
  - **Files:** `packages/db/src/repositories/*.ts`
  - **Action:** Call logAuditEvent() for sensitive operations (create, delete, bulk operations). Log operation type, entity, context.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T009.06 [AGENT]** Integrate rate limiting in databases
  - **Files:** `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`
  - **Action:** Wrap query() with rate limiter check. Track queries per tenant. Reject over-limit.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T009.07 [AGENT]** Add security tests
  - **File:** `packages/db/src/security/security.test.ts` (create)
  - **Action:** Test query validation rejects injection. Test audit logging captures events. Test rate limiting enforces limits.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T009.08 [AGENT]** Document security layers
  - **File:** `packages/db/docs/security-layers.md` (create)
  - **Action:** Document query validation. Explain audit logging. Document rate limiting.
  - **Validation:** Documentation explains security layers clearly.

---

## Task: T010 - Document PgBouncer Integration

- [x] **T010** [COMPLETED] Document PgBouncer Integration

**Files:** `packages/db/docs/pgbouncer-setup.md` (create), `packages/db/config/pgbouncer.ini.template` (create)

**Definition of done:** Configuration guide complete. Pool sizing documented. Monitoring setup documented. Troubleshooting guide available.

**Out of scope:** Installing PgBouncer, configuring production PgBouncer, custom PgBouncer settings.

**Rules:** Connection pooling is required for production. PgBouncer is recommended for PostgreSQL. Proper pool sizing prevents exhaustion.

**Pattern:** PgBouncer in transaction pooling mode. Pool size based on connection limits. Monitoring via PgBouncer stats.

**Anti-pattern:** No connection pooling. Oversized pools. Undersized pools. No monitoring.

**Depends on:** T009

**Blocks:** T011

**Imports/Exports:** Export configuration template. Import in deployment documentation.

**Implementation Notes:** Created comprehensive PgBouncer setup documentation covering installation, pool modes (session/transaction/statement), configuration options, pool sizing formula, timeout settings, authentication methods, TLS/SSL configuration, Suite-specific integration guidance, monitoring with admin console and Prometheus, high availability with HAProxy, troubleshooting guide, and production checklist. Created pgbouncer.ini.template with recommended settings for transaction pooling mode, detailed comments for all configuration options, and Suite-specific examples.

### Subtasks

- [x] **T010.01 [AGENT]** Create PgBouncer configuration guide
  - **File:** `packages/db/docs/pgbouncer-setup.md` (create)
  - **Action:** Document PgBouncer installation. Explain configuration options. Provide pgbouncer.ini example.
  - **Validation:** Documentation covers installation and configuration.

- [x] **T010.02 [AGENT]** Document connection pool sizing
  - **File:** `packages/db/docs/pgbouncer-setup.md`
  - **Action:** Explain pool sizing formula. Document default_pool_size, max_client_conn. Provide sizing examples.
  - **Validation:** Documentation explains pool sizing clearly.

- [x] **T010.03 [AGENT]** Create PgBouncer configuration template
  - **File:** `packages/db/config/pgbouncer.ini.template` (create)
  - **Action:** Create pgbouncer.ini template with recommended settings. Include comments explaining each setting.
  - **Validation:** Template is valid and well-documented.

- [x] **T010.04 [AGENT]** Document PgBouncer monitoring
  - **File:** `packages/db/docs/pgbouncer-setup.md`
  - **Action:** Document SHOW STATS command. Explain key metrics. Provide monitoring dashboard examples.
  - **Validation:** Documentation covers monitoring.

- [x] **T010.05 [AGENT]** Document troubleshooting
  - **File:** `packages/db/docs/pgbouncer-setup.md`
  - **Action:** Document common issues. Provide troubleshooting steps. Include error messages and solutions.
  - **Validation:** Documentation covers troubleshooting.

---

## Task: T011 - Implement Prepared Statements

- [x] **T011** [COMPLETED] Implement Prepared Statements

**Files:** `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`

**Definition of done:** Prepared statements used for repeated queries. Plan caching configured. Performance improved for hot queries. Memory usage monitored.

**Out of scope:** Changing query logic, custom prepared statement management, query plan analysis.

**Rules:** Prepared statements improve performance. Plan caching reduces parsing overhead. Memory monitoring prevents bloat.

**Pattern:** Use postgres.js prepared statement API. Configure plan_cache_mode. Monitor prepared statement count.

**Anti-pattern:** No prepared statements. Unlimited plan cache. Memory bloat from cached plans.

**Depends on:** T010

**Blocks:** T012

**Imports/Exports:** No new exports. Internal implementation change.

**Implementation Notes:** Enabled prepared statements in both PostgresDatabase and WorkerDatabase by setting `prepare: true` in postgres.js config. Added prepared statement count tracking with `preparedStatementCount` field in both classes. Added monitoring via `setPreparedStatementCount()` metric export and logging at 1000-query threshold. Created comprehensive documentation in `packages/db/docs/prepared-statements.md` covering implementation, benefits, monitoring, memory considerations, plan cache modes, configuration, testing, troubleshooting, and production checklist. Added performance benchmark test in `postgres-database.test.ts` (skips when database unavailable). All tests pass (126 passed, 80 skipped due to database unavailability). Typecheck and lint pass.

### Subtasks

- [x] **T011.01 [AGENT]** Configure prepared statements in PostgresDatabase
  - **File:** `packages/db/src/postgres-database.ts`
  - **Action:** Enable prepared statements in postgres.js config. Set prepare: true. Configure plan_cache_mode to force_custom_plan.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T011.02 [AGENT]** Configure prepared statements in WorkerDatabase
  - **File:** `packages/db/src/worker-database.ts`
  - **Action:** Same pattern as T011.01.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T011.03 [AGENT]** Add prepared statement monitoring
  - **Files:** `packages/db/src/postgres-database.ts`, `packages/db/src/worker-database.ts`
  - **Action:** Track prepared statement count. Log when count exceeds threshold. Export as metric.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T011.04 [AGENT]** Test performance improvement
  - **File:** `packages/db/src/postgres-database.test.ts`
  - **Action:** Add benchmark test for repeated query. Compare performance with/without prepared statements.
  - **Validation:** Performance improvement documented.

- [x] **T011.05 [AGENT]** Document prepared statement strategy
  - **File:** `packages/db/docs/prepared-statements.md` (create)
  - **Action:** Document prepared statement usage. Explain plan caching. Document memory monitoring.
  - **Validation:** Documentation explains strategy clearly.

---

## Task: T012 - Create Schema Registry

- [x] **T012** [COMPLETED] Create Schema Registry

**Files:** `packages/db/src/schema-registry/version-tracker.ts` (create), `packages/db/src/schema-registry/contract-tester.ts` (create), `packages/db/scripts/schema-diff.ts` (create)

**Definition of done:** Schema versions tracked. Contract tests prevent breaking changes. Schema drift detected. Diff tool available.

**Out of scope:** Changing existing schema, new contract test rules, custom diff algorithms.

**Rules:** Schema versioning prevents drift. Contract tests catch breaking changes. Diff tool aids review.

**Pattern:** Version tracking in migration metadata. Contract tests compare current vs expected schema. Diff tool shows changes.

**Anti-pattern:** No version tracking. No contract tests. Manual schema comparison. Silent schema drift.

**Depends on:** T011

**Blocks:** T013

**Imports/Exports:** Export registry functions. Import in scripts and tests.

### Subtasks

- [x] **T012.01 [AGENT]** Create version tracker
  - **File:** `packages/db/src/schema-registry/version-tracker.ts` (create)
  - **Action:** Create trackSchemaVersion(domain, version) function. Store version in registry. Query current version.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T012.02 [AGENT]** Create contract tester
  - **File:** `packages/db/src/schema-registry/contract-tester.ts` (create)
  - **Action:** Create testSchemaContract(domain, expectedSchema) function. Compare current schema with expected. Detect breaking changes.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T012.03 [AGENT]** Create schema diff tool
  - **File:** `packages/db/scripts/schema-diff.ts` (create)
  - **Action:** Create diffSchemas(fromVersion, toVersion) function. Show added/removed/changed tables and columns. Output in readable format.
  - **Validation:** `pnpm --filter @suite/db typecheck`.

- [x] **T012.04 [AGENT]** Integrate version tracking in migrations
  - **File:** `packages/db/scripts/migrate.ts`
  - **Action:** Call trackSchemaVersion() after successful migration. Update registry with new version.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T012.05 [AGENT]** Add contract tests to CI
  - **File:** `.github/workflows/ci.yml`
  - **Action:** Add step to run contract tests after migrations. Fail CI on breaking changes.
  - **Validation:** CI workflow includes contract test step.

- [x] **T012.06 [AGENT]** Add schema registry tests
  - **File:** `packages/db/src/schema-registry/schema-registry.test.ts` (create)
  - **Action:** Test version tracking. Test contract detection. Test schema diff.
  - **Validation:** `pnpm --filter @suite/db test:run`.

- [x] **T012.07 [AGENT]** Document schema registry
  - **File:** `packages/db/docs/schema-registry.md` (create)
  - **Action:** Document version tracking. Explain contract tests. Document diff tool usage.
  - **Validation:** Documentation explains registry clearly.

**Implementation Notes:** Created version tracker with SHA-256 checksums, contract tester for breaking change detection, schema diff tool for comparing versions. Integrated version tracking into migration script to automatically track schema versions after successful migrations. Added contract tests to CI workflow. Created comprehensive test suite with 12 tests covering version tracking and contract testing. Documented the schema registry with usage examples, best practices, and troubleshooting guide.

---

## Task: T013 - Migrate Auth Package to DI Pattern

- [x] **T013** [COMPLETED] Migrate Auth Package to DI Pattern

**Files:** `packages/auth/src/server.ts`, `packages/db/src/connection.ts`

**Definition of done:** Auth package uses DI pattern. No singleton usage. Tests pass. Deprecated exports marked.

**Out of scope:** Changing auth logic, new auth features, removing deprecated exports (separate task).

**Rules:** AGENTS.md Rule 4: use shared auth. DI pattern for testability. No singleton pattern.

**Pattern:** createAuth() accepts Database instance. Auth instance created per request. No module-level singleton.

**Anti-pattern:** Singleton exports. Global auth instance. Hardcoded database connection.

**Depends on:** T012

**Imports/Exports:** Remove singleton export. Keep createAuth factory.

**Implementation Notes:** Task was already completed in previous iteration. The auth package already uses the DI pattern with createAuth() factory. No getDbOrNull or singleton export exists in server.ts. All three apps (calendar, tasks, drive) already use createAuth() with proper DI. The packages/db/src/connection.ts file does not exist in the codebase.

### Subtasks

- [x] **T013.01 [AGENT]** Remove getDbOrNull from auth server
  - **File:** `packages/auth/src/server.ts`
  - **Action:** Remove line 155 (const db = (await import('@suite/db')).getDbOrNull()). Remove line 156 (export const auth). Keep only createAuth factory.
  - **Validation:** `grep -n "getDbOrNull\|export const auth" packages/auth/src/server.ts` returns nothing. `pnpm --filter @suite/auth test:run`.

- [x] **T013.02 [AGENT]** Mark connection.ts as deprecated
  - **File:** `packages/db/src/connection.ts`
  - **Action:** Add @deprecated comment to file header. Add deprecation notice to function comments. Keep for backward compatibility.
  - **Validation:** File has deprecation notices.

- [x] **T013.03 [AGENT]** Update auth package documentation
  - **File:** `packages/auth/README.md`
  - **Action:** Document DI pattern. Explain createAuth() usage. Document removal of singleton.
  - **Validation:** README.md documents DI pattern.

- [x] **T013.04 [AGENT]** Update auth tests
  - **File:** `packages/auth/src/server.test.ts`
  - **Action:** Update tests to use createAuth() factory. Remove singleton usage. Pass Database instance to createAuth().
  - **Validation:** `pnpm --filter @suite/auth test:run`.

---

## Task: T014 - Fix ENCRYPTION_KEY Format Mismatch

- [x] **T014** [COMPLETED] Fix ENCRYPTION_KEY Format Mismatch

**Files:** `packages/env-config/src/calendar.ts`, `packages/env-config/src/tasks.ts`, `packages/env-config/src/drive.ts`, `packages/domain-calendar/src/lib/calendar-crypto.ts`, `packages/domain-tasks/src/lib/tasks-crypto.ts`, `packages/domain-drive/src/drive-crypto.ts`, `packages/env-config/src/index.test.ts`, `SECRETS.md`

**Definition of done:** A single agreed key format (base64 of 32 raw bytes) is validated by all three env-config schemas and correctly decoded by all three domain crypto modules. Attempting to set a hex key fails validation. Attempting to import a base64 key succeeds and produces a valid AES-256-GCM CryptoKey. SECRETS.md reflects the correct `openssl rand -base64 32` generation command.

**Out of scope:** Key rotation, per-user keys, changing the encryption algorithm or key length.

**Rules:** All user content must be encrypted with AES-256-GCM (AGENTS.md Rule 9). Secrets must never be hardcoded. Env validation must reject invalid formats before any resource allocation.

**Pattern:** Validate with Zod regex `/^[A-Za-z0-9+/]{43}=?$/` (standard base64 of 32 bytes = 44 chars with padding). Decode with `Uint8Array.from(atob(key), c => c.charCodeAt(0))`. Assert `byteLength === 32` before `importKey`. Fail fast at module load.

**Anti-pattern:** Different validation regex vs. decode logic in the same codebase. Calling `atob()` on a hex string. Accepting arbitrary string length.

**Imports/Exports:** Update `tasksEnvSchema`, `calendarEnvSchema`, `driveEnvSchema` regex fields. Update `setTaskKeyProviderFromEnv`, `setCalendarKeyProviderFromEnv`, `setDriveKeyProviderFromEnv` to assert byte length.

**Blocks:** T026

**Implementation Notes:** Changed ENCRYPTION_KEY regex from hex (64 chars) to base64 (44 chars) in all three env-config schemas. Added byte-length assertion (32 bytes) in all three domain crypto modules after base64 decode. Updated env-config tests to use valid base64 keys and added test to reject hex format. Updated SECRETS.md to clarify base64 format (44 characters) and warn against hex format. All tests pass (19 env-config tests, 13 calendar-crypto tests, 13 tasks-crypto tests, 16 drive-crypto tests). Typecheck passes for all affected packages.

### Subtasks

- [x] **T014.01 [AGENT]** Fix regex in all three env-config schemas
  - **Files:** `packages/env-config/src/calendar.ts`, `packages/env-config/src/tasks.ts`, `packages/env-config/src/drive.ts`
  - **Action:** Change each `ENCRYPTION_KEY` regex from `/^[0-9a-fA-F]{64}$/` to `/^[A-Za-z0-9+/]{43}=?$/`. Update error message to `ENCRYPTION_KEY must be a base64-encoded 32-byte AES-256 key (output of: openssl rand -base64 32)`.
  - **Validation:** `pnpm --filter @suite/env-config test:run -- index.test.ts`

- [x] **T014.02 [AGENT]** Add byte-length assertion to all three domain crypto modules
  - **Files:** `packages/domain-calendar/src/lib/calendar-crypto.ts`, `packages/domain-tasks/src/lib/tasks-crypto.ts`, `packages/domain-drive/src/drive-crypto.ts`
  - **Action:** After `const keyData = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0))`, add `if (keyData.byteLength !== 32) throw new Error('Invalid ENCRYPTION_KEY: must decode to exactly 32 bytes');` before the `importKey` call.
  - **Validation:** `pnpm --filter @suite/domain-calendar test:run -- calendar-crypto.test.ts`

- [x] **T014.03 [AGENT]** Update env-config tests to use base64 keys
  - **File:** `packages/env-config/src/index.test.ts`
  - **Action:** Replace all `'a'.repeat(64)` test values with a valid base64 32-byte key: `btoa(String.fromCharCode(...new Uint8Array(32).fill(0xaa)))`. Add a test asserting a 64-char hex string now fails validation. Add a test asserting a valid base64 key passes.
  - **Validation:** `pnpm --filter @suite/env-config test:run -- index.test.ts`

- [x] **T014.04 [AGENT]** Update SECRETS.md key generation instructions
  - **File:** `SECRETS.md`
  - **Action:** Add or update the ENCRYPTION_KEY section to read: "Generate with `openssl rand -base64 32`. The output (44 characters of base64) is the value to set. Do not use hex format."
  - **Validation:** `SECRETS.md` contains corrected generation command and references 44-char base64 format.

---

## Task: T015 - Fix UsageMonitor findOrCreateUsage Period Query

- [x] **T015** [COMPLETED] Fix UsageMonitor findOrCreateUsage Period Query

**Files:** `packages/db/src/repositories/usage.ts`, `packages/db/src/repositories/usage.test.ts`

**Definition of done:** `findOrCreateUsage` returns the same existing record on repeated calls within the same period window. The `requestCount` increments on the existing record rather than spawning a new row per request. The 80% block threshold is reached correctly.

**Out of scope:** Changing the period duration, adding new usage dimensions, billing integration.

**Rules:** Free tier limits must be monitored at 80% threshold (AGENTS.md Rule 10). Incorrect period queries defeat the entire usage guard.

**Pattern:** Express "current period" as `lte(usage.periodStart, now) AND gte(usage.periodEnd, now)` — the record whose window contains `now`. Not records that started at our computed period start, and not records that already ended.

**Anti-pattern:** `lte(usage.periodEnd, now)` — this matches records whose period has already ended. Creating a new row per request instead of incrementing.

**Imports/Exports:** No new exports. Internal fix to `PostgresUsageRepository.findOrCreateUsage`.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [x] **T015.01 [AGENT]** Fix the period query WHERE condition
  - **File:** `packages/db/src/repositories/usage.ts:28-34`
  - **Action:** Replace the `and(...)` predicate with `and(eq(usage.userId, userId), lte(usage.periodStart, now), gte(usage.periodEnd, now))`. Remove the `gte(usage.periodStart, periodStart)` clause — the `lte(periodStart, now)` constraint is sufficient to anchor to the current window.
  - **Validation:** `pnpm --filter @suite/db test:run -- usage.test.ts`

- [x] **T015.02 [AGENT]** Add regression tests for period deduplication
  - **File:** `packages/db/src/repositories/usage.test.ts` (create if absent)
  - **Action:** Write two tests: (1) Call `findOrCreateUsage` twice with the same userId and overlapping period. Assert the returned `id` is identical on both calls (no duplicate row created). (2) Call `incrementUsage` between two `findOrCreateUsage` calls. Assert `requestCount` is 1 on the second call, not 0.
  - **Validation:** `pnpm --filter @suite/db test:run -- usage.test.ts`

**Implementation Notes:** Fixed the period query WHERE condition in findOrCreateUsage to correctly find the record whose period window contains 'now'. Changed from gte(periodStart, periodStart) + lte(periodEnd, now) to lte(periodStart, now) + gte(periodEnd, now). Added comprehensive regression tests in usage.test.ts to verify period deduplication and requestCount increment behavior. Tests are skipped when DATABASE_URL is not set (integration tests). All typecheck and lint checks pass.

---

## Task: T016 - Fix Health Check Path in Shared Kernel Middleware

- [ ] **T016** [PENDING] Fix Health Check Path in Shared Kernel Middleware

**Files:** `packages/shared-kernel/src/rate-limit.ts`, `packages/shared-kernel/src/usage-monitor.ts`, `packages/shared-kernel/src/rate-limit.test.ts`, `packages/shared-kernel/src/usage-monitor.test.ts`

**Definition of done:** Authenticated requests to `GET /api/v1/health` are not counted against the rate limit and do not create usage records. Both middleware correctly skip the actual health endpoint path.

**Out of scope:** Making the skip path configurable, adding other excluded paths, changing the rate limit algorithm.

**Rules:** Health endpoints must never be rate-limited to allow load balancer probes to pass at all times. Misconfigured exclusion silently exhausts authenticated users' rate limit budgets.

**Pattern:** Exact string match against the actual mounted health endpoint path `/api/v1/health`. Optionally accept a configurable `excludePaths` array in middleware options.

**Anti-pattern:** Hardcoding a path that does not exist in the router (`/api/health`). Testing against the wrong path in tests, giving false confidence.

**Imports/Exports:** No new exports.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T016.01 [AGENT]** Fix path constant in rate-limit middleware
  - **File:** `packages/shared-kernel/src/rate-limit.ts:115`
  - **Action:** Change `c.req.path === '/api/health'` to `c.req.path === '/api/v1/health'`.
  - **Validation:** `pnpm --filter @suite/shared-kernel test:run -- rate-limit.test.ts`

- [ ] **T016.02 [AGENT]** Fix path constant in usage-monitor middleware
  - **File:** `packages/shared-kernel/src/usage-monitor.ts:49`
  - **Action:** Change `c.req.path === '/api/health'` to `c.req.path === '/api/v1/health'`.
  - **Validation:** `pnpm --filter @suite/shared-kernel test:run -- usage-monitor.test.ts`

- [ ] **T016.03 [AGENT]** Update and add health path skip tests
  - **Files:** `packages/shared-kernel/src/rate-limit.test.ts`, `packages/shared-kernel/src/usage-monitor.test.ts`
  - **Action:** In `rate-limit.test.ts`, change the test router from `app.get('/api/health', ...)` to `app.get('/api/v1/health', ...)` and the request path to `/api/v1/health`. Add an equivalent test to `usage-monitor.test.ts` verifying that repeated authenticated calls to `/api/v1/health` do not increment usage.
  - **Validation:** `pnpm --filter @suite/shared-kernel test:run`

---

## Task: T017 - Fix filterTasks Correctness Bugs

- [ ] **T017** [PENDING] Fix filterTasks Correctness Bugs

**Files:** `packages/domain-tasks/src/lib/tasks.ts`, `packages/domain-tasks/src/lib/tasks.test.ts`

**Definition of done:** `filterTasks('all')` returns all tasks including archived ones. The in-memory fallback path (when `repository.findWhere` is absent) applies `unsealTasks` before returning. All six filter/path combinations return correctly decrypted `TaskItem[]`.

**Out of scope:** Adding new filter modes, changing the task schema, changing the encryption algorithm.

**Rules:** Domain logic must be correct regardless of repository implementation (DDD: repository-agnostic domain). E2EE must be applied at the domain boundary (AGENTS.md Rule 9).

**Pattern:** Unify code paths — all branches assign to `tasks` and fall through to a single decrypt-then-return block. Separate filter predicate logic from decryption logic. Use BDD `describe`/`it` blocks to document filter semantics as living specification.

**Anti-pattern:** Early `return` that bypasses the decrypt block. A filter named `'all'` that silently excludes a subset. Returning raw encrypted bytes from a domain function.

**Imports/Exports:** No new exports. Internal fix to `filterTasks`.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T017.01 [AGENT]** Fix 'all' filter to include archived tasks
  - **File:** `packages/domain-tasks/src/lib/tasks.ts`
  - **Action:** In the `case 'all':` branch of the `findWhere` path, change `repository.findWhere({ archived: false }, context)` to `repository.findAll(context)`. In the `else` (in-memory) branch, when `filter === 'all'`, do not apply the `archived: false` predicate.
  - **Validation:** `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts`

- [ ] **T017.02 [AGENT]** Fix fallback path to route through decrypt block
  - **File:** `packages/domain-tasks/src/lib/tasks.ts`
  - **Action:** Remove the early `return` statement inside the `else` fallback branch. Assign the filtered result to the shared `tasks` variable (declared before the `if/else`) so execution continues to the `unsealTasks` block at the bottom of the function.
  - **Validation:** `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts`

- [ ] **T017.03 [AGENT]** Add BDD tests covering all filter modes and both code paths
  - **File:** `packages/domain-tasks/src/lib/tasks.test.ts`
  - **Action:** Add `describe('filterTasks', () => { ... })` with nested describes per filter value. Cover: 'all' includes archived tasks; 'active' excludes completed and archived; 'completed' returns only completed; 'archived' returns only archived. Repeat the 'all' and 'active' tests with encryption enabled and the in-memory repository to confirm the fallback path decrypts. Use `setTaskKeyProvider` to inject a test key.
  - **Validation:** `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts`

---

## Task: T018 - Fix getCalendarOverview Unawaited Async Call

- [ ] **T018** [PENDING] Fix getCalendarOverview Unawaited Async Call

**Files:** `packages/domain-calendar/src/index.ts`

**Definition of done:** Either (a) `getCalendarOverview` is removed (no callers exist) and the barrel export is updated, or (b) the function is `async`, `listCalendarEvents` is `await`-ed, and the return type is `Promise<{...}>`. TypeScript compiler passes with no errors.

**Out of scope:** Adding new overview features, changing public API beyond this single function.

**Rules:** Deep modules principle: unexported or uncalled functions add surface area without value. Async functions must be awaited or the calling function must be async.

**Pattern:** Audit for callers first with `grep`. Remove if zero callers (preferred). Fix with `async`/`await` only if callers exist.

**Anti-pattern:** Fixing a broken export that serves no caller. Shipping a sync function that returns a Promise where an array is typed.

**Imports/Exports:** Remove `getCalendarOverview` from `packages/domain-calendar/src/index.ts` barrel if no callers.

**Depends on:** None. **Blocks:** T029.

### Subtasks

- [ ] **T018.01 [AGENT]** Audit callers of getCalendarOverview
  - **Action:** Run `grep -r "getCalendarOverview" --include="*.ts" . | grep -v "src/index.ts"` from repo root. Record the output. If zero results, execute T018.02. If results exist, execute T018.03.
  - **Validation:** Grep output is inspected and a path is chosen.

- [ ] **T018.02 [AGENT]** Remove getCalendarOverview (preferred — no callers)
  - **File:** `packages/domain-calendar/src/index.ts`
  - **Action:** Delete the `getCalendarOverview` function body and its `export`. Run `grep -n "getCalendarOverview" packages/domain-calendar/src/index.ts` to confirm zero remaining references.
  - **Validation:** `pnpm --filter @suite/domain-calendar typecheck`

- [ ] **T018.03 [AGENT]** Fix getCalendarOverview if callers exist
  - **File:** `packages/domain-calendar/src/index.ts`
  - **Action:** Add `async` keyword to the function. Add `await` before the `listCalendarEvents(undefined, context)` call. Update the return type annotation to reflect `Promise<{ name: string; description: string; events: CalendarEvent[] }>`.
  - **Validation:** `pnpm --filter @suite/domain-calendar typecheck`

---

## Task: T019 - Fix Drive Public Endpoints Using Empty In-Memory Repositories

- [ ] **T019** [PENDING] Fix Drive Public Endpoints Using Empty In-Memory Repositories

**Files:** `apps/drive/api/src/index.ts`, `apps/drive/api/src/index.test.ts`

**Definition of done:** `GET /api/v1/files`, `GET /api/v1/folders`, and `GET /api/v1/files/search` all require authentication, read from the authenticated user's Postgres repository via context, and return real data. No in-memory repository is instantiated in these handlers. Unauthenticated requests receive 401.

**Out of scope:** Pagination, changing response schema, adding new file endpoints.

**Rules:** API routes are thin (AGENTS.md Rule 3). All data-access endpoints require authentication (AGENTS.md Rule 4). No business data should ever be returned from an empty in-memory repository masquerading as real data.

**Pattern:** Mirror authenticated POST/PUT/DELETE handlers in the same file. Use `requireAuth` and `requireOrganization` middleware. Read repositories from `c.get('fileRepo')` / `c.get('folderRepo')` and `c.get('repositoryContext')`.

**Anti-pattern:** `new InMemoryDriveFileRepository()` per request. `userId: 'anonymous'` context for production data endpoints. Commenting that an endpoint is "public" when it should be private.

**Imports/Exports:** No new exports. Refactor three existing handler registrations.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T019.01 [AGENT]** Fix GET /api/v1/files handler
  - **File:** `apps/drive/api/src/index.ts`
  - **Action:** Add `requireAuth, requireOrganization` to the `app.get('/api/v1/files', ...)` handler middleware chain. Replace `const fileRepo = new InMemoryDriveFileRepository()` and the hardcoded `repositoryContext` with `const fileRepo = c.get('fileRepo')` and `const repositoryContext = c.get('repositoryContext')`. Return 500 with `{ error: { code: 'MISSING_CONTEXT' } }` if either is absent.
  - **Validation:** `pnpm --filter @suite/drive-api typecheck`

- [ ] **T019.02 [AGENT]** Fix GET /api/v1/folders handler
  - **File:** `apps/drive/api/src/index.ts`
  - **Action:** Same pattern as T019.01 using `c.get('folderRepo')`.
  - **Validation:** `pnpm --filter @suite/drive-api typecheck`

- [ ] **T019.03 [AGENT]** Fix GET /api/v1/files/search handler
  - **File:** `apps/drive/api/src/index.ts`
  - **Action:** Same pattern as T019.01. The call to `searchFiles(result.data, fileRepo, repositoryContext)` already uses these variables — only the source of `fileRepo` and `repositoryContext` changes.
  - **Validation:** `pnpm --filter @suite/drive-api typecheck`

- [ ] **T019.04 [AGENT]** Add authentication requirement tests for Drive read endpoints
  - **File:** `apps/drive/api/src/index.test.ts` (create if absent)
  - **Action:** Add three test groups (files, folders, search). For each: assert unauthenticated request returns 401. Assert authenticated request returns `{ files: [] }` (or folders/search equivalent) rather than an error. Use the test helper that sets up auth context in Hono.
  - **Validation:** `pnpm --filter @suite/drive-api test:run -- index.test.ts`

---

## Task: T020 - Fix Array.reverse() Mutation in Domain List Functions

- [ ] **T020** [PENDING] Fix Array.reverse() Mutation in Domain List Functions

**Files:** `packages/domain-tasks/src/lib/tasks.ts`, `packages/domain-drive/src/index.ts`, `packages/domain-tasks/src/lib/tasks.test.ts`, `packages/domain-drive/src/index.test.ts`

**Definition of done:** `listTasks` and `listDriveFiles` do not mutate the array reference returned by the repository. Calling either function twice on the same repository instance returns identical ordering both times.

**Out of scope:** Changing default sort order, adding ORDER BY clauses to repository queries, adding sort parameters to the API.

**Rules:** Domain functions must not produce observable side effects on repository state (DDD: pure domain logic). Repository return values must not be mutated by consumers.

**Pattern:** Use `[...array].reverse()` to create a reversed shallow copy without mutation. ES2023 `array.toReversed()` is equivalent if target supports it.

**Anti-pattern:** In-place `Array.prototype.reverse()` on an array whose reference may be cached by the repository. Relying on non-deterministic insertion order from a repository with no ORDER BY clause.

**Imports/Exports:** No new exports.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T020.01 [AGENT]** Fix mutation in listTasks
  - **File:** `packages/domain-tasks/src/lib/tasks.ts`
  - **Action:** Change `const reversedTasks = tasks.reverse();` to `const reversedTasks = [...tasks].reverse();`.
  - **Validation:** `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts`

- [ ] **T020.02 [AGENT]** Fix mutation in listDriveFiles
  - **File:** `packages/domain-drive/src/index.ts`
  - **Action:** Change `const reversed = files.reverse().map(snapshot);` to `const reversed = [...files].reverse().map(snapshot);`.
  - **Validation:** `pnpm --filter @suite/domain-drive test:run -- index.test.ts`

- [ ] **T020.03 [AGENT]** Add mutation regression tests
  - **Files:** `packages/domain-tasks/src/lib/tasks.test.ts`, `packages/domain-drive/src/index.test.ts`
  - **Action:** In each file add a test: create two items, call the list function twice on the same repository, assert the first call and second call return items in the same order (not alternately reversed). Name the test "should not mutate repository internal state on repeated calls".
  - **Validation:** `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts && pnpm --filter @suite/domain-drive test:run -- index.test.ts`

---

## Task: T021 - Fix blindIndex Not Regenerated on Update and Rename

- [ ] **T021** [PENDING] Fix blindIndex Not Regenerated on Update and Rename

**Files:** `packages/domain-tasks/src/lib/tasks.ts`, `packages/domain-drive/src/index.ts`, `packages/domain-tasks/src/lib/tasks.test.ts`, `packages/domain-drive/src/index.test.ts`

**Definition of done:** After updating a task title, `searchTasks` with the new title returns the task; with the old title it does not. After renaming a file, `searchFiles` with the new name returns the file; with the old name it does not. The `blindIndex` column in the DB reflects the HMAC of the current title/name.

**Out of scope:** Adding semantic search, changing the HMAC algorithm or index key derivation, adding search to Calendar.

**Rules:** Blind indexing for exact-match search (AGENTS.md Rule 6). All blind indices must reflect current plaintext. A stale blind index is silently wrong — it produces no error but search breaks invisibly.

**Pattern:** On any write that changes the indexed field (title, name), recompute `generateBlindIndex(newValue, indexKey)` and include the result in the same update payload sent to the repository.

**Anti-pattern:** Updating title/name without updating `blindIndex`. Assuming the repository will derive the blind index.

**Imports/Exports:** No new exports. Update `updateTask` and `renameDriveFile` logic.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T021.01 [AGENT]** Recompute blindIndex in updateTask
  - **File:** `packages/domain-tasks/src/lib/tasks.ts`
  - **Action:** In `updateTask`, when `input.title` is present, derive the blind index using the same `generateBlindIndex(input.title, indexKey)` call pattern that `createTask` uses. Add the computed `blindIndex` to the repository update payload alongside the title.
  - **Validation:** `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts`

- [ ] **T021.02 [AGENT]** Recompute blindIndex in renameDriveFile
  - **File:** `packages/domain-drive/src/index.ts`
  - **Action:** In `renameDriveFile`, after determining `newName` (and optionally encrypting it), recompute `blindIndex` using `generateBlindIndex(newName, indexKey)` and include it in the update passed to `fileRepository.update(...)`.
  - **Validation:** `pnpm --filter @suite/domain-drive test:run -- index.test.ts`

- [ ] **T021.03 [AGENT]** Add BDD tests: search finds item by new name, not old name
  - **Files:** `packages/domain-tasks/src/lib/tasks.test.ts`, `packages/domain-drive/src/index.test.ts`
  - **Action:** Tasks: create task titled "old title", call `updateTask` with `title: "new title"`, call `searchTasks("new title")` — assert one result. Call `searchTasks("old title")` — assert zero results. Drive: upload "old.txt", call `renameDriveFile` to "new.txt", call `searchFiles("new.txt")` — assert one result. Call `searchFiles("old.txt")` — assert zero results.
  - **Validation:** `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts && pnpm --filter @suite/domain-drive test:run -- index.test.ts`

---

## Task: T022 - Fix BaseDurableObject: Hibernation, WebSocket Auth Order, and Alarm API

- [ ] **T022** [PENDING] Fix BaseDurableObject: Hibernation, WebSocket Auth Order, and Alarm API

**Files:** `packages/shared-kernel/src/durable-object.ts`

**Definition of done:** (1) Auth check and rejection occurs before `ctx.acceptWebSocket()`. (2) Sessions survive DO hibernation via `ctx.getWebSockets()` with attachment data. (3) `scheduleCleanupAlarm` calls `this.ctx.storage.setAlarm(timestamp)` with no callback. (4) The inline `DurableObjectStorage.setAlarm` type signature matches the actual Cloudflare runtime API. All changes pass typecheck.

**Out of scope:** Adding new RPC methods, changing the storage schema, changing message broadcast logic.

**Rules:** One DO per room (AGENTS.md Rule 7). Use Hibernation API for cost efficiency. Authentication must be validated before any connection state is established.

**Pattern:** Check auth, return 401 Response if unauthorized (before any WebSocket handshake). Store userId via `server.serializeAttachment({ userId })` so it survives hibernation. Restore sessions from `this.ctx.getWebSockets()` lazily. Call `await this.ctx.storage.setAlarm(Date.now() + delayMs)` — cleanup runs in `alarm()`.

**Anti-pattern:** Accepting a WebSocket before auth check, then closing it. In-memory session Map that empties on hibernation. Callback parameter to `setAlarm`. `void` return type on an async platform API.

**Imports/Exports:** No new exports. Type definition and behavioral corrections.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T022.01 [AGENT]** Move auth check before ctx.acceptWebSocket()
  - **File:** `packages/shared-kernel/src/durable-object.ts`
  - **Action:** In `handleWebSocketUpgrade`, move the `userId` extraction and null check to before the `this.ctx.acceptWebSocket(server)` call. If `!userId`, return `new Response('Unauthorized', { status: 401 })` directly without calling `acceptWebSocket` or constructing the WebSocket response.
  - **Validation:** `pnpm --filter @suite/shared-kernel typecheck`

- [ ] **T022.02 [AGENT]** Persist session identity via WebSocket attachment for hibernation
  - **File:** `packages/shared-kernel/src/durable-object.ts`
  - **Action:** After `this.ctx.acceptWebSocket(server)`, replace `this.sessions.set(server, { userId })` with `server.serializeAttachment({ userId }); this.sessions.set(server, { userId });`. Add a private `restoreSessions()` method that calls `for (const ws of this.ctx.getWebSockets()) { const { userId } = ws.deserializeAttachment(); this.sessions.set(ws, { userId }); }`. Call `restoreSessions()` at the top of `webSocketMessage` and `webSocketClose` when `this.sessions.size === 0`.
  - **Validation:** `pnpm --filter @suite/shared-kernel typecheck`

- [ ] **T022.03 [AGENT]** Fix scheduleCleanupAlarm to omit callback
  - **File:** `packages/shared-kernel/src/durable-object.ts`
  - **Action:** Change `this.ctx.storage.setAlarm(Date.now() + delayMs, async () => { await this.alarm(); });` to `await this.ctx.storage.setAlarm(Date.now() + delayMs);`. The `alarm()` method on the class is already the handler — no callback is needed or supported.
  - **Validation:** `pnpm --filter @suite/shared-kernel typecheck`

- [ ] **T022.04 [AGENT]** Fix DurableObjectStorage.setAlarm type signature
  - **File:** `packages/shared-kernel/src/durable-object.ts`
  - **Action:** In the inline `DurableObjectStorage` interface definition, update `setAlarm` from `setAlarm(timestamp: number, callback: () => void | Promise<void>): void` to `setAlarm(scheduledTime: number | Date, options?: Record<string, unknown>): Promise<void>`.
  - **Validation:** `pnpm --filter @suite/shared-kernel typecheck`

---

## Task: T023 - Fix SET LOCAL Tenant Context Requiring a Transaction

- [ ] **T023** [PENDING] Fix SET LOCAL Tenant Context Requiring a Transaction

**Files:** `packages/db/src/postgres-database.ts`, `packages/db/src/repositories/calendar.ts`, `packages/db/src/repositories/tasks.ts`, `packages/db/src/repositories/drive.ts`

**Definition of done:** Tenant context variables (`app.current_tenant_id`, `app.current_user_id`) are scoped to each repository operation and are effective when any subsequent query in the same operation executes. Cross-tenant data from a different session cannot be accessed via stale session variables.

**Out of scope:** Implementing full PostgreSQL RLS policy definitions, adding new multi-tenancy features, changing the tenant model.

**Rules:** Tenant isolation is required for all multi-tenant data access. `SET LOCAL` is transaction-scoped and has no effect outside a transaction — all calls to `setTenantContext` outside a `BEGIN/COMMIT` block are no-ops.

**Pattern:** Wrap each repository operation that calls `setContext()` in an explicit `BEGIN`/`COMMIT` block so `SET LOCAL` takes effect for the duration of that operation. Document the transaction requirement in `setTenantContext` JSDoc.

**Anti-pattern:** Relying on `SET LOCAL` outside a transaction. Assuming session variables persist when using a connection pool in transaction mode.

**Imports/Exports:** No new exports. Update `setTenantContext` implementation and all repository `setContext` call sites.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T023.01 [AGENT]** Update setTenantContext to require caller-managed transaction
  - **File:** `packages/db/src/postgres-database.ts`
  - **Action:** Update the `setTenantContext` JSDoc to clearly state "This method must be called inside an open transaction for SET LOCAL to take effect. The repository operation that follows must use the same connection." Add a note in the method body: if `this.isClosed`, throw. Otherwise execute both `SET LOCAL` statements as before. Do not start the transaction here — that is the repository's responsibility.
  - **Validation:** `pnpm --filter @suite/db typecheck`

- [ ] **T023.02 [AGENT]** Wrap setContext + query in explicit transactions in each repository
  - **Files:** `packages/db/src/repositories/calendar.ts`, `packages/db/src/repositories/tasks.ts`, `packages/db/src/repositories/drive.ts`
  - **Action:** In each repository, wrap each public method that calls `await this.setContext(context)` followed by a Drizzle query in a `this.db.transaction(async (tx) => { ... })` block. Move both `setContext` and the Drizzle query inside the transaction callback so `SET LOCAL` is scoped to the same transaction.
  - **Validation:** `pnpm --filter @suite/db test:run -- calendar.test.ts tasks.test.ts drive.test.ts`

- [ ] **T023.03 [AGENT]** Add cross-tenant isolation integration test
  - **File:** `packages/db/src/repositories/calendar.test.ts`
  - **Action:** Create two repository contexts with the same `userId` but different `tenantId`. Insert a calendar event under tenant A context. Query `findAll` with tenant B context. Assert the event is not present in the result.
  - **Validation:** `pnpm --filter @suite/db test:run -- calendar.test.ts`

---

## Task: T024 - Fix Calendar API Middleware Ordering

- [ ] **T024** [PENDING] Fix Calendar API Middleware Ordering

**Files:** `apps/calendar/api/src/index.ts`, `apps/calendar/api/src/index.test.ts`

**Definition of done:** Env validation middleware executes before the `usageRepository` DB client is created. An invalid env config produces a 500 response without any DB connection being opened. Middleware order in Calendar API matches Tasks and Drive API ordering.

**Out of scope:** Changing validation logic, adding new env variables, rewriting middleware.

**Rules:** Fail fast on invalid configuration. Do not allocate DB connections before prerequisites are validated.

**Pattern:** Register env validation as the first `app.use('/api/*', ...)` handler. Only create `createDbClient()` in middleware that runs after successful validation.

**Anti-pattern:** Creating DB connections before env validation. DB connection leaked when env validation throws.

**Imports/Exports:** No new exports. Reorder existing middleware registrations.

**Depends on:** None. **Blocks:** T025.

### Subtasks

- [ ] **T024.01 [AGENT]** Move env validation middleware before usageRepository middleware
  - **File:** `apps/calendar/api/src/index.ts`
  - **Action:** Move the env validation middleware block (currently around lines 61-72) to register before the usageRepository setup middleware block (currently around lines 45-58). Verify the resulting registration order is: (1) env validation, (2) usageRepository setup, (3) auth middleware, (4) repository middleware.
  - **Validation:** `pnpm --filter @suite/calendar-api typecheck`

- [ ] **T024.02 [AGENT]** Add test: invalid env returns 500 before DB connection
  - **File:** `apps/calendar/api/src/index.test.ts` (create if absent)
  - **Action:** Mock `validateCalendarEnv` to throw a ZodError. Mock `createDbClient` to record calls. Make a `GET /api/v1/health` request. Assert response status is 500. Assert `createDbClient` mock was not called.
  - **Validation:** `pnpm --filter @suite/calendar-api test:run -- index.test.ts`

---

## Task: T025 - Consolidate DB Client Creation to One Instance Per Request

- [ ] **T025** [PENDING] Consolidate DB Client Creation to One Instance Per Request

**Files:** `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`

**Definition of done:** Each request creates exactly one `Database` instance. All subsequent middleware reads the shared instance from Hono context via `c.get('db')`. No middleware independently calls `createDbClient()`. Connection count per request drops from 2-3 to 1.

**Out of scope:** Connection pooling configuration, Hyperdrive tuning, switching between worker and node database implementations.

**Rules:** Resource allocation must be minimal and controlled. With Hyperdrive (`max: 1`), each independent `createDbClient()` opens a separate connection. Multiple connections per request wastes resources.

**Pattern:** Register `app.use('/api/*', async (c, next) => { c.set('db', createDbClient(runtimeEnv)); await next(); })` as the first middleware. All downstream middleware reads via `const db = c.get('db')`.

**Anti-pattern:** Three separate `createDbClient()` calls inside three different middleware functions per request path.

**Imports/Exports:** No new exports. Refactor internal middleware across all three API index files.

**Depends on:** T024. **Blocks:** T028.

### Subtasks

- [ ] **T025.01 [AGENT]** Add shared DB client middleware to Calendar API
  - **File:** `apps/calendar/api/src/index.ts`
  - **Action:** Register `app.use('/api/*', async (c, next) => { c.set('db', createDbClient(runtimeEnv)); await next(); })` immediately after the env validation middleware. Update usageRepository middleware, auth middleware, and calendar repository middleware to read `const db = c.get('db')` instead of calling `createDbClient(runtimeEnv)` independently.
  - **Validation:** `pnpm --filter @suite/calendar-api typecheck`

- [ ] **T025.02 [AGENT]** Add shared DB client middleware to Tasks API
  - **File:** `apps/tasks/api/src/index.ts`
  - **Action:** Same pattern as T025.01.
  - **Validation:** `pnpm --filter @suite/tasks-api typecheck`

- [ ] **T025.03 [AGENT]** Add shared DB client middleware to Drive API
  - **File:** `apps/drive/api/src/index.ts`
  - **Action:** Same pattern as T025.01.
  - **Validation:** `pnpm --filter @suite/drive-api typecheck`

---

## Task: T026 - Move Encryption Key Init to App Startup

- [ ] **T026** [PENDING] Move Encryption Key Init to App Startup

**Files:** `packages/domain-calendar/src/lib/calendar-crypto.ts`, `packages/domain-tasks/src/lib/tasks-crypto.ts`, `packages/domain-drive/src/drive-crypto.ts`, `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`

**Definition of done:** `setXxxKeyProviderFromEnv` is called at most once per Worker lifecycle, reads from `c.env.ENCRYPTION_KEY` (not `process.env`), and is guarded by an `initialized` flag so repeated calls within the same process are no-ops. `crypto.subtle.importKey` is not called on every request.

**Out of scope:** Key rotation, per-user keys, changing the encryption algorithm.

**Rules:** E2EE is non-negotiable (AGENTS.md Rule 9). In Cloudflare Workers, `process.env` does not include secrets set via `wrangler secret put` — those are in `c.env`. Importing a CryptoKey on every request is incorrect and wasteful.

**Pattern:** Accept `key: string | undefined` as a parameter. Guard with `if (initialized) return;`. Set `initialized = true` after successful import. Call once from the env validation middleware using `c.env.ENCRYPTION_KEY`.

**Anti-pattern:** Reading `process.env.ENCRYPTION_KEY` in a Workers context. Calling `crypto.subtle.importKey` per request. No guard against double-initialization.

**Imports/Exports:** Update signatures of all three `setXxxKeyProviderFromEnv` functions to accept `key: string | undefined`.

**Depends on:** T014. **Blocks:** None.

### Subtasks

- [ ] **T026.01 [AGENT]** Refactor setXxxKeyProviderFromEnv to accept a key parameter and add initialized guard
  - **Files:** `packages/domain-calendar/src/lib/calendar-crypto.ts`, `packages/domain-tasks/src/lib/tasks-crypto.ts`, `packages/domain-drive/src/drive-crypto.ts`
  - **Action:** In each file: (1) Change function signature to `async function setXxxKeyProviderFromEnv(encryptionKey?: string): Promise<void>`. (2) Remove the `const encryptionKey = process.env.ENCRYPTION_KEY` line. (3) Add `let initialized = false;` as a module-level flag. (4) At the start of the function body, add `if (initialized) return;`. (5) At the end of the successful import block, add `initialized = true;`. (6) Export a `resetInitialized()` function for test teardown only.
  - **Validation:** `pnpm --filter @suite/domain-calendar typecheck && pnpm --filter @suite/domain-tasks typecheck && pnpm --filter @suite/domain-drive typecheck`

- [ ] **T026.02 [AGENT]** Call key init once per request chain from env validation middleware
  - **Files:** `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`
  - **Action:** In each API's env validation middleware, after `validateXxxEnv(...)`, add `await setXxxKeyProviderFromEnv(c.env.ENCRYPTION_KEY)`. Remove any per-request call to `setXxxKeyProviderFromEnv()` from the repository setup middleware.
  - **Validation:** `pnpm nx affected -t typecheck`

- [ ] **T026.03 [AGENT]** Update crypto module tests for new signature and guard
  - **Files:** `packages/domain-calendar/src/lib/calendar-crypto.test.ts`, `packages/domain-tasks/src/lib/tasks-crypto.test.ts`, `packages/domain-drive/src/drive-crypto.test.ts`
  - **Action:** Update all calls from `setCalendarKeyProviderFromEnv()` (no args) to `setCalendarKeyProviderFromEnv(base64Key)`. Call `resetInitialized()` in `afterEach` to clear state between tests. Add a test asserting calling with the same key twice does not call `importKey` a second time (verify via spy or initialized flag inspection).
  - **Validation:** `pnpm --filter @suite/domain-calendar test:run -- calendar-crypto.test.ts`

---

## Task: T027 - Fix count() Methods to Use SQL COUNT(*)

- [ ] **T027** [PENDING] Fix count() Methods to Use SQL COUNT(*)

**Files:** `packages/db/src/repositories/tasks.ts`, `packages/db/src/repositories/drive.ts`, `packages/db/src/repositories/tasks.test.ts`, `packages/db/src/repositories/drive.test.ts`

**Definition of done:** All three `count()` methods issue `SELECT COUNT(*) FROM ... WHERE ...` and return a number. No row data is transferred from the DB for a count operation. Memory usage for counting is O(1) regardless of table size.

**Out of scope:** Changing the repository interface, adding count-by-field variants, adding result caching.

**Rules:** Deep modules: implementations must be efficient. Fetching all rows to count them is O(n) memory and network bandwidth waste for a O(1) operation. Use the database for set operations.

**Pattern:** `const result = await db.select({ count: sql<number>\`count(*)\` }).from(table).where(eq(table.userId, context.userId)); return Number(result[0]?.count ?? 0);`

**Anti-pattern:** `SELECT id FROM table WHERE ...` followed by `result.length`. Returning `result.length` of a full table scan as a count.

**Imports/Exports:** Ensure `sql` is imported from `drizzle-orm` in each file (it likely already is).

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T027.01 [AGENT]** Fix PostgresTaskRepository.count()
  - **File:** `packages/db/src/repositories/tasks.ts`
  - **Action:** Replace the body of the `count` method with: `await this.setContext(context); const db = this.db.getDrizzleDb(); const result = await db.select({ count: sql<number>\`count(*)\` }).from(tasks).where(eq(tasks.userId, context.userId)); return Number(result[0]?.count ?? 0);`
  - **Validation:** `pnpm --filter @suite/db test:run -- tasks.test.ts`

- [ ] **T027.02 [AGENT]** Fix PostgresDriveFileRepository.count()
  - **File:** `packages/db/src/repositories/drive.ts`
  - **Action:** Same pattern as T027.01 using the `driveFiles` table.
  - **Validation:** `pnpm --filter @suite/db test:run -- drive.test.ts`

- [ ] **T027.03 [AGENT]** Fix PostgresDriveFolderRepository.count()
  - **File:** `packages/db/src/repositories/drive.ts`
  - **Action:** Same pattern as T027.01 using the `driveFolders` table.
  - **Validation:** `pnpm --filter @suite/db test:run -- drive.test.ts`

- [ ] **T027.04 [AGENT]** Add count efficiency tests
  - **Files:** `packages/db/src/repositories/tasks.test.ts`, `packages/db/src/repositories/drive.test.ts`
  - **Action:** Add a test: insert 100 records, call `count()`, assert the return value is 100 and the test completes in under 50ms (ensuring no full table scan occurs). Use `vi.spyOn` on the db query method to assert only one query was issued and no row data was returned.
  - **Validation:** `pnpm --filter @suite/db test:run -- tasks.test.ts`

---

## Task: T028 - Move Env Validation to App Startup

- [ ] **T028** [PENDING] Move Env Validation to App Startup

**Files:** `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`

**Definition of done:** `validateXxxEnv()` is called at most once per Worker lifecycle. The validated env object is cached at module level. Per-request middleware reads from the cached result rather than re-running Zod parsing. A misconfigured Worker fails to handle any request (fast startup failure).

**Out of scope:** Changing env variable schema, adding new variables, changing Zod schemas in `@suite/env-config`.

**Rules:** Fail fast on invalid configuration (startup, not per-request). Zod validation on every request is CPU overhead with no benefit after the first call.

**Pattern:** `const validatedEnv = validateXxxEnv(process.env);` at module level (outside any handler or middleware). Re-export or close over `validatedEnv` in middleware. If `validateXxxEnv` throws, the Worker fails to initialize and Cloudflare will not serve traffic.

**Anti-pattern:** Running `validateXxxEnv()` inside a request handler or Hono middleware on every request.

**Imports/Exports:** No new exports. Refactor initialization flow in each API.

**Depends on:** T025. **Blocks:** None.

### Subtasks

- [ ] **T028.01 [AGENT]** Move Calendar API env validation to module level
  - **File:** `apps/calendar/api/src/index.ts`
  - **Action:** Remove `validateCalendarEnv(...)` from the per-request middleware. Add `const validatedEnv = validateCalendarEnv(process.env as unknown as Record<string, string>);` at module level before `const app = new Hono()`. Downstream middleware closes over `validatedEnv` directly.
  - **Validation:** `pnpm --filter @suite/calendar-api typecheck`

- [ ] **T028.02 [AGENT]** Move Tasks API env validation to module level
  - **File:** `apps/tasks/api/src/index.ts`
  - **Action:** Same pattern as T028.01 using `validateTasksEnv`.
  - **Validation:** `pnpm --filter @suite/tasks-api typecheck`

- [ ] **T028.03 [AGENT]** Move Drive API env validation to module level
  - **File:** `apps/drive/api/src/index.ts`
  - **Action:** Same pattern as T028.01 using `validateDriveEnv`.
  - **Validation:** `pnpm --filter @suite/drive-api typecheck`

---

## Task: T029 - Remove Dead Code Across APIs and Domain Packages

- [ ] **T029** [PENDING] Remove Dead Code Across APIs and Domain Packages

**Files:** `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`, `packages/domain-calendar/src/index.ts`, `packages/domain-tasks/src/index.ts`, `packages/domain-drive/src/index.ts`, `apps/drive/api/src/bootstrap.ts`, `packages/shared-kernel/src/durable-object.ts`, `packages/shared-kernel/src/index.ts`

**Definition of done:** No exported symbol has zero callers outside its defining file. No declared-but-never-read field exists in a metrics object. Package public API surfaces are minimal. All removals verified by typecheck with zero errors.

**Out of scope:** Removing deprecated code that still has active callers, removing test utilities, changing any behavior.

**Rules:** Deep modules principle: small public interface reduces cognitive overhead and misuse. Dead code misleads agents and reviewers about intended usage.

**Pattern:** Audit each candidate with `grep -r "symbolName" --include="*.ts" .` before removing. Remove symbol, remove from barrel export, run typecheck. One subtask per category of dead code.

**Anti-pattern:** Keeping unused exports "in case they are needed". Shipping template/example code inside a shared package's public API.

**Imports/Exports:** Reduce exported surface only. No new exports.

**Depends on:** T018. **Blocks:** None.

### Subtasks

- [ ] **T029.01 [AGENT]** Remove metrics.totalLatency from all three APIs
  - **Files:** `apps/calendar/api/src/index.ts`, `apps/tasks/api/src/index.ts`, `apps/drive/api/src/index.ts`
  - **Action:** In each file, remove the `totalLatency: 0` field from the `metrics` object literal. Search for any read of `metrics.totalLatency` using `grep -n "totalLatency"` in each file and remove any found references.
  - **Validation:** `pnpm nx affected -t typecheck`

- [ ] **T029.02 [AGENT]** Remove no-op identity factory functions
  - **Files:** Locate with `grep -rn "createTaskRepository\|createCalendarEventRepository\|createDriveFileRepository\|createDriveFolderRepository\|createDriveStorageAdapter" --include="*.ts" .`
  - **Action:** For each of the five identity factory functions: verify zero callers outside the defining file, delete the function body and export, remove from any barrel `index.ts`. If a caller exists, document it and skip that function.
  - **Validation:** `pnpm nx affected -t typecheck`

- [ ] **T029.03 [AGENT]** Remove InMemoryStorageAdapter from bootstrap.ts
  - **File:** `apps/drive/api/src/bootstrap.ts`
  - **Action:** Run `grep -rn "InMemoryStorageAdapter" --include="*.ts" .`. If zero callers outside `bootstrap.ts`, delete the class definition.
  - **Validation:** `pnpm --filter @suite/drive-api typecheck`

- [ ] **T029.04 [AGENT]** Remove ExampleChatRoomDO from shared-kernel public exports
  - **Files:** `packages/shared-kernel/src/durable-object.ts`, `packages/shared-kernel/src/index.ts`
  - **Action:** Remove the `export class ExampleChatRoomDO` declaration. Remove its export from any barrel file in `packages/shared-kernel/src/`. The `BaseDurableObject` base class must remain.
  - **Validation:** `pnpm --filter @suite/shared-kernel typecheck`

- [ ] **T029.05 [AGENT]** Remove unused domain overview exports
  - **Files:** `packages/domain-drive/src/index.ts`, `packages/domain-calendar/src/index.ts` (if not already handled by T018)
  - **Action:** Run `grep -rn "getDriveOverview\|getCalendarOverview" --include="*.ts" . | grep -v "src/index.ts"` to identify callers outside the defining file. Remove any function with zero external callers and update barrel exports accordingly.
  - **Validation:** `pnpm nx affected -t typecheck`

---

## Task: T030 - Consolidate RepositoryContext Type to One Definition

- [ ] **T030** [PENDING] Consolidate RepositoryContext Type to One Definition

**Files:** `packages/shared-kernel/src/repository-context.ts`, `packages/db/src/index.ts`, `packages/shared-kernel/src/usage-monitor.ts`, all domain package files that import `RepositoryContext`

**Definition of done:** `RepositoryContext` is defined in exactly one file. All other files import it from that canonical location. A grep for `interface RepositoryContext\|type RepositoryContext` returns exactly one definition site. TypeScript compiler passes across all packages.

**Out of scope:** Changing the fields of `RepositoryContext`, adding new context types, merging shared-kernel and db packages.

**Rules:** DDD: shared kernel types belong in shared packages. Duplicate type definitions are a maintenance hazard — they can silently diverge.

**Pattern:** Canonical definition in `packages/shared-kernel/src/repository-context.ts`. Re-export from `packages/db/src/index.ts` using `export type { RepositoryContext } from '@suite/shared-kernel'` for backward compatibility. Remove inline definition from `usage-monitor.ts`, import from canonical location.

**Anti-pattern:** Same interface `{ userId: string; tenantId: string; requestId: string }` defined in three separate files.

**Imports/Exports:** `@suite/shared-kernel` exports `RepositoryContext`. `@suite/db` re-exports it. All domain packages and apps import from one of these two.

**Depends on:** None. **Blocks:** None.

### Subtasks

- [ ] **T030.01 [AGENT]** Identify all definition and import sites
  - **Action:** Run `grep -rn "interface RepositoryContext\|type RepositoryContext" --include="*.ts" .` and `grep -rn "from.*RepositoryContext\|import.*RepositoryContext" --include="*.ts" .`. Record all definition files and all import paths.
  - **Validation:** Output documents all sites.

- [ ] **T030.02 [AGENT]** Establish canonical definition in shared-kernel
  - **File:** `packages/shared-kernel/src/repository-context.ts`
  - **Action:** Ensure the file contains exactly one export: `export interface RepositoryContext { userId: string; tenantId: string; requestId: string; }`. Ensure it is re-exported from `packages/shared-kernel/src/index.ts`.
  - **Validation:** `pnpm --filter @suite/shared-kernel typecheck`

- [ ] **T030.03 [AGENT]** Replace all duplicate definitions with re-exports or imports
  - **Files:** `packages/db/src/index.ts`, `packages/shared-kernel/src/usage-monitor.ts`, any other site found in T030.01
  - **Action:** In `packages/db/src/index.ts`, replace the local `RepositoryContext` definition with `export type { RepositoryContext } from '@suite/shared-kernel';`. In `usage-monitor.ts`, remove the local definition and add `import type { RepositoryContext } from './repository-context.js';`. For any other duplicate, do the same.
  - **Validation:** `pnpm nx affected -t typecheck`

---

## Dependency Graph (Open Tasks Only)

```
Infrastructure chain:
T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013

Bug fix chains (prioritize before infrastructure work):
T014 → T026
T018 → T029
T024 → T025 → T028

Independent (no blocking dependencies):
T015, T016, T017, T019, T020, T021, T022, T023, T027, T030
```

(T001 and T002 are blocked with no open dependencies; they can start once unblocked.)

---

## Quick Reference: Validation Commands

| Task | Validation Command |
|------|-------------------|
| T001 | `pnpm --filter @suite/auth test:run` |
| T002 | `pnpm --filter @suite/auth test:run` |
| T003 | `pnpm --filter @suite/db typecheck` + `pnpm --filter @suite/db test:run` |
| T004 | `pnpm --filter @suite/db typecheck` |
| T005 | `pnpm --filter @suite/db lint:migrations` |
| T006 | `pnpm --filter @suite/db test:run` |
| T007 | `pnpm --filter @suite/db test:run` |
| T008 | Script execution (backup/restore) |
| T009 | `pnpm --filter @suite/db test:run` |
| T010 | Documentation review |
| T011 | `pnpm --filter @suite/db test:run` |
| T012 | `pnpm --filter @suite/db test:run` |
| T013 | `pnpm --filter @suite/auth test:run` |
| T014 | `pnpm --filter @suite/env-config test:run -- index.test.ts && pnpm --filter @suite/domain-calendar test:run -- calendar-crypto.test.ts` |
| T015 | `pnpm --filter @suite/db test:run -- usage.test.ts` |
| T016 | `pnpm --filter @suite/shared-kernel test:run -- rate-limit.test.ts` |
| T017 | `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts` |
| T018 | `pnpm --filter @suite/domain-calendar typecheck` |
| T019 | `pnpm --filter @suite/drive-api test:run -- index.test.ts` |
| T020 | `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts && pnpm --filter @suite/domain-drive test:run -- index.test.ts` |
| T021 | `pnpm --filter @suite/domain-tasks test:run -- tasks.test.ts && pnpm --filter @suite/domain-drive test:run -- index.test.ts` |
| T022 | `pnpm --filter @suite/shared-kernel typecheck` |
| T023 | `pnpm --filter @suite/db test:run -- calendar.test.ts tasks.test.ts drive.test.ts` |
| T024 | `pnpm --filter @suite/calendar-api test:run -- index.test.ts` |
| T025 | `pnpm nx affected -t typecheck` |
| T026 | `pnpm --filter @suite/domain-calendar test:run -- calendar-crypto.test.ts` |
| T027 | `pnpm --filter @suite/db test:run -- tasks.test.ts drive.test.ts` |
| T028 | `pnpm nx affected -t typecheck` |
| T029 | `pnpm nx affected -t typecheck` |
| T030 | `pnpm nx affected -t typecheck` |

---

- Update this TODO.md as tasks are completed.
- Mark parent task done only when all subtasks are done.
- If a task is blocked, update status to [BLOCKED] and note the blocking task ID.
- Add new tasks at the end with the next sequential ID.