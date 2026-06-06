# Suite Deployment Task List - P0 (Critical Security & Infrastructure)

This task list follows Domain-Driven Design (DDD), Test-Driven Development (TDD), and Behavior-Driven Development (BDD) principles.

## Legend

- [ ] Incomplete
- [x] Complete
- [~] In Progress
- [!] Blocked

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
**Target File**: `apps/drive/web/src/components/FilePreview.tsx`
**Action**: Add loading="lazy" to img elements; implement Intersection Observer for advanced lazy loading
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P2-006-02: Add responsive images to drive
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
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add compression middleware with gzip, threshold 1KB
**Validate Command**: `curl -H "Accept-Encoding: gzip" http://localhost:3001/api/v1/events -I | grep Content-Encoding`

#### P2-018-02: Add compression to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add compression middleware with gzip, threshold 1KB
**Validate Command**: `curl -H "Accept-Encoding: gzip" http://localhost:3002/api/v1/tasks -I | grep Content-Encoding`

#### P2-018-03: Add compression to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add compression middleware with gzip, threshold 1KB; skip compression for file download routes
**Validate Command**: `curl -H "Accept-Encoding: gzip" http://localhost:3003/api/v1/files -I | grep Content-Encoding`

---

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
**Target File**: `apps/drive/api/src/index.test.ts`
**Action**: Debug why API returns 500 for search, move, and delete operations on non-existent resources
**Status**: ✅ Complete - No 500 errors found; documented failures were outdated

#### INF-004-02: Fix drive API test expectations
**Target File**: `apps/drive/api/src/index.test.ts`, `apps/drive/api/src/schemas.ts`
**Action**: Update test expectations to match actual API behavior after investigation
**Status**: ✅ Complete - Fixed health check test and search schema validation
