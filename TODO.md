# Suite Deployment Task List - P0 (Critical Security & Infrastructure)

This task list follows Domain-Driven Design (DDD), Test-Driven Development (TDD), and Behavior-Driven Development (BDD) principles.

## Legend

- [ ] Incomplete
- [x] Complete
- [~] In Progress
- [!] Blocked

### [x] P1-015: Add Focus Management to Dialogs

**Status**: Complete
**Priority**: P1
**Bounded Context**: Web Accessibility

**Related Files**:
- `apps/drive/web/src/features/UploadDialog.tsx`
- `apps/drive/web/src/features/RenameDialog.tsx`
- `apps/drive/web/src/features/DeleteConfirmDialog.tsx`

**Note**: Calendar and Tasks use inline forms in App.tsx, not separate dialog components. Focus management for those forms is out of scope for this task.

**Definition of Done**:
- Dialogs trap focus within dialog
- Focus moves to first focusable element on open
- Focus returns to trigger on close
- Escape key closes dialog
- Click outside closes dialog

**Out of Scope**:
- Focus visible indicators
- Focus management for nested dialogs

**Rules to Follow**:
- WCAG 2.1 Level AA compliance
- Keyboard navigation support

**Advanced Pattern**:
- Focus trap utility
- Dialog component with focus management

**Anti-Patterns**:
- Focus escaping dialog
- No keyboard support

**Imports/Exports**:
- UI package exports Dialog with focus management

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P1-015-01: Add focus trap to drive UploadDialog
**Target File**: `apps/drive/web/src/features/UploadDialog.tsx`
**Action**: Implement focus trap using useRef and useEffect; focus first input on open; return focus on close
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`
**Status**: ✅ Complete

#### P1-015-02: Add focus trap to drive RenameDialog
**Target File**: `apps/drive/web/src/features/RenameDialog.tsx`
**Action**: Implement focus trap using useRef and useEffect; focus first input on open; return focus on close
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`
**Status**: ✅ Complete

#### P1-015-03: Add focus trap to drive DeleteConfirmDialog
**Target File**: `apps/drive/web/src/features/DeleteConfirmDialog.tsx`
**Action**: Implement focus trap using useRef and useEffect; focus first button on open; return focus on close
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`
**Status**: ✅ Complete

**Implementation Notes**:
- Added focus trap using useRef and useEffect pattern from WCAG 2.1 best practices
- Focus moves to first focusable element on dialog open
- Focus returns to trigger element on dialog close
- Tab key cycles focus within dialog (Shift+Tab reverses direction)
- Escape key closes dialog
- Click outside closes dialog (backdrop click handler)
- All three Drive dialogs now have proper focus management

---

### [x] P1-016: Fix Drive Web Tests Missing AuthProvider

**Status**: Complete
**Priority**: P1
**Bounded Context**: Testing

**Related Files**:
- `apps/drive/web/src/App.test.tsx`

**Definition of Done**:
- Tests wrapped in AuthProvider
- All Drive web tests pass
- Test coverage maintained

**Out of Scope**:
- Refactoring other test files
- Adding new tests

**Rules to Follow**:
- Tests must provide required context
- No test should fail due to missing providers

**Advanced Pattern**:
- Test wrapper utilities
- Custom render functions

**Anti-Patterns**:
- Tests requiring external context
- Failing tests left unfixed

**Imports/Exports**:
- None (test-only changes)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P1-016-01: Wrap Drive tests in AuthProvider
**Target File**: `apps/drive/web/src/App.test.tsx`
**Action**: Wrap all test renders with AuthProvider or create custom render function
**Validate Command**: `pnpm --filter @suite/drive-web test`
**Status**: ✅ Complete

**Issue Discovered During P1-015**:
- Drive web tests fail with "useAuth must be used within AuthProvider"
- Tests are not wrapped in AuthProvider context
- This is a pre-existing issue, not caused by focus management changes

**Implementation Notes**:
- Mocked auth-provider module using vi.mock to provide fake authenticated user
- Mock provides user object with id and email, loading: false, and mock signIn/signOut functions
- AuthProvider mocked as a passthrough component that renders children
- Updated first test to check for skeleton loading state (aria-label="Loading") instead of text loading message
- All 5 Drive web tests now pass: loading state, upload, rename dialog, delete dialog, validation errors

---

### [ ] P1-017: Remove Dead auth-routes.ts

**Status**: Pending  
**Priority**: P1  
**Bounded Context**: Code Quality

**Related Files**:
- `apps/calendar/api/src/auth-routes.ts`
- `apps/calendar/api/src/index.ts`

**Definition of Done**:
- auth-routes.ts deleted
- No duplicate auth mounting
- All auth routes use @suite/auth mountAuth
- Tests still pass

**Out of Scope**:
- Refactoring other duplicate code
- Code deduplication beyond auth

**Rules to Follow**:
- Remove unused code immediately
- Single source of truth for auth

**Advanced Pattern**:
- Shared package for common functionality

**Anti-Patterns**:
- Keeping "just in case" code
- Duplicate implementations

**Imports/Exports**:
- None (deletion)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P1-016-01: Delete auth-routes.ts
**Target File**: `apps/calendar/api/src/auth-routes.ts`
**Action**: Delete file
**Validate Command**: `ls apps/calendar/api/src/auth-routes.ts 2>&1 | grep "No such file"`

#### P1-016-02: Remove auth-routes import from calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Remove import of mountAuth from auth-routes; confirm @suite/auth mountAuth is used
**Validate Command**: `pnpm --filter @suite/calendar-api test`

---

### [ ] P1-017: Add Keyboard Navigation Patterns

**Status**: Pending  
**Priority**: P1  
**Bounded Context**: Web Accessibility

**Related Files**:
- `apps/calendar/web/src/App.tsx`
- `apps/tasks/web/src/App.tsx`
- `apps/drive/web/src/App.tsx`

**Definition of Done**:
- Keyboard shortcuts for common actions
- Arrow key navigation in lists
- Enter/Space to activate items
- Escape to close dialogs/modals
- Tab order logical and complete

**Out of Scope**:
- Custom keyboard shortcut editor
- Global keyboard shortcuts

**Rules to Follow**:
- WCAG 2.1 Level AA compliance
- Don't override browser shortcuts

**Advanced Pattern**:
- Keyboard context provider
- Keyboard event handlers

**Anti-Patterns**:
- No keyboard support
- Conflicting shortcuts

**Imports/Exports**:
- None (UI pattern)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P1-017-01: Add keyboard shortcuts to calendar
**Target File**: `apps/calendar/web/src/App.tsx`
**Action**: Add 'n' for new event, 'e' to edit selected, 'd' to delete selected, Escape to close dialog
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P1-017-02: Add keyboard shortcuts to tasks
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Add 'n' for new task, 'e' to edit selected, 'd' to delete selected, Escape to close dialog
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P1-017-03: Add keyboard shortcuts to drive
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Add 'u' for upload, 'r' to rename selected, 'd' to delete selected, Escape to close dialog
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P1-017-04: Add arrow key navigation to calendar
**Target File**: `apps/calendar/web/src/App.tsx`
**Action**: Add arrow key navigation to event list; update selected state on arrow keys
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P1-017-05: Add arrow key navigation to tasks
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Add arrow key navigation to task list; update selected state on arrow keys
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P1-017-06: Add arrow key navigation to drive
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Add arrow key navigation to file list; update selected state on arrow keys
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`


---

### [ ] P2-001: Create Shared UI Component Library

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: UI

**Related Files**:
- `packages/ui/src/Button.tsx` (create)
- `packages/ui/src/Input.tsx` (create)
- `packages/ui/src/Dialog.tsx` (create)
- `packages/ui/src/Skeleton.tsx` (create)
- `packages/ui/src/index.ts` (create)

**Definition of Done**:
- Button component with variants (primary, secondary, danger)
- Input component with error state
- Dialog component with focus management
- Skeleton component with animation
- Components exported from index.ts
- Storybook or preview for components

**Out of Scope**:
- Full design system
- Theme system
- Component variants beyond basic

**Rules to Follow**:
- AGENTS.md: Shared UI code belongs in packages/ui
- Components must be accessible

**Advanced Pattern**:
- Compound component pattern
- Render props for flexibility

**Anti-Patterns**:
- Duplicating components across apps
- Non-accessible components

**Imports/Exports**:
- UI package exports Button, Input, Dialog, Skeleton

**Depends On**:
- None

**Blocks**:
- P2-002 (Migrate web apps to shared UI)

**Subtasks**:

#### P2-001-01: Create Button component
**Target File**: `packages/ui/src/Button.tsx`
**Action**: Create Button component with variant prop (primary, secondary, danger), disabled state, and proper styling
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### P2-001-02: Create Input component
**Target File**: `packages/ui/src/Input.tsx`
**Action**: Create Input component with error prop, label, and proper styling
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### P2-001-03: Create Dialog component
**Target File**: `packages/ui/src/Dialog.tsx`
**Action**: Create Dialog component with focus trap, backdrop, and portal
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### P2-001-04: Create Skeleton component
**Target File**: `packages/ui/src/Skeleton.tsx`
**Action**: Create Skeleton component with height, width, and animation props
**Validate Command**: `pnpm --filter @suite/ui typecheck`

#### P2-001-05: Export components from index
**Target File**: `packages/ui/src/index.ts`
**Action**: Export Button, Input, Dialog, Skeleton from index.ts
**Validate Command**: `pnpm --filter @suite/ui typecheck`

---

### [ ] P2-002: Migrate Web Apps to Shared UI Components

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: UI

**Related Files**:
- `apps/calendar/web/src/App.tsx`
- `apps/tasks/web/src/App.tsx`
- `apps/drive/web/src/App.tsx`
- `apps/calendar/web/src/components/EventDialog.tsx`
- `apps/tasks/web/src/components/TaskDialog.tsx`

**Definition of Done**:
- All web apps import from @suite/ui
- Custom Button components replaced
- Custom Input components replaced
- Custom Dialog components replaced
- Custom Skeleton components replaced
- Code duplication eliminated

**Out of Scope**:
- Refactoring all custom components
- Complex component migrations

**Rules to Follow**:
- AGENTS.md: Shared UI code belongs in packages/ui
- Prefer shared over custom

**Advanced Pattern**:
- Gradual migration
- Component compatibility layer

**Anti-Patterns**:
- Keeping duplicate components
- Inconsistent UI across apps

**Imports/Exports**:
- Web apps import from @suite/ui

**Depends On**:
- P2-001 (Create shared UI components)

**Blocks**:
- None

**Subtasks**:

#### P2-002-01: Migrate calendar to shared Button
**Target File**: `apps/calendar/web/src/App.tsx`
**Action**: Replace custom button components with @suite/ui Button
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P2-002-02: Migrate calendar to shared Input
**Target File**: `apps/calendar/web/src/App.tsx`
**Action**: Replace custom input components with @suite/ui Input
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P2-002-03: Migrate calendar to shared Dialog
**Target File**: `apps/calendar/web/src/components/EventDialog.tsx`
**Action**: Replace custom dialog with @suite/ui Dialog
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P2-002-04: Migrate calendar to shared Skeleton
**Target File**: `apps/calendar/web/src/App.tsx`
**Action**: Replace custom skeleton with @suite/ui Skeleton
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P2-002-05: Migrate tasks to shared Button
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Replace custom button components with @suite/ui Button
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-002-06: Migrate tasks to shared Input
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Replace custom input components with @suite/ui Input
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-002-07: Migrate tasks to shared Dialog
**Target File**: `apps/tasks/web/src/components/TaskDialog.tsx`
**Action**: Replace custom dialog with @suite/ui Dialog
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-002-08: Migrate tasks to shared Skeleton
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Replace custom skeleton with @suite/ui Skeleton
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-002-09: Migrate drive to shared Button
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Replace custom button components with @suite/ui Button
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P2-002-10: Migrate drive to shared Input
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Replace custom input components with @suite/ui Input
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P2-002-11: Migrate drive to shared Dialog
**Target File**: `apps/drive/web/src/features/UploadDialog.tsx`
**Action**: Replace custom dialog with @suite/ui Dialog
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P2-002-12: Migrate drive to shared Skeleton
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Replace custom skeleton with @suite/ui Skeleton
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

---

### [ ] P2-003: Add ARIA Labels and Roles

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Web Accessibility

**Related Files**:
- `apps/calendar/web/src/App.tsx`
- `apps/tasks/web/src/App.tsx`
- `apps/drive/web/src/App.tsx`

**Definition of Done**:
- All buttons have aria-label or text content
- All inputs have associated labels
- All icons have aria-label
- All interactive elements have appropriate roles
- Landmark regions defined (main, nav, header)

**Out of Scope**:
- Live regions
- ARIA attributes for complex widgets

**Rules to Follow**:
- WCAG 2.1 Level AA compliance
- Semantic HTML preferred over ARIA

**Advanced Pattern**:
- ARIA label utility
- Role assignment helpers

**Anti-Patterns**:
- Missing ARIA labels
- Incorrect roles
- Div soup without semantics

**Imports/Exports**:
- None (HTML attributes)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-003-01: Add ARIA labels to calendar
**Target File**: `apps/calendar/web/src/App.tsx`
**Action**: Add aria-label to icon buttons, add labels to inputs, add role="main" to main content
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P2-003-02: Add ARIA labels to tasks
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Add aria-label to icon buttons, add labels to inputs, add role="main" to main content
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-003-03: Add ARIA labels to drive
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Add aria-label to icon buttons, add labels to inputs, add role="main" to main content
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

---

### [ ] P2-004: Add Color Contrast Fixes

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Web Accessibility

**Related Files**:
- `apps/calendar/web/src/App.css` (create or update)
- `apps/tasks/web/src/App.css` (create or update)
- `apps/drive/web/src/App.css` (create or update)

**Definition of Done**:
- All text meets WCAG AA contrast ratio (4.5:1)
- Large text meets AAA ratio (7:1)
- Interactive elements have sufficient contrast
- Focus indicators visible
- Color not used as only indicator

**Out of Scope**:
- Custom color themes
- Dark mode specific fixes

**Rules to Follow**:
- WCAG 2.1 Level AA compliance
- Test with contrast checker

**Advanced Pattern**:
- Design tokens for colors
- Contrast utility functions

**Anti-Patterns**:
- Low contrast text
- Invisible focus states

**Imports/Exports**:
- None (CSS)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-004-01: Audit calendar color contrast
**Target File**: `apps/calendar/web/src/App.css`
**Action**: Review all color combinations and adjust to meet WCAG AA standards
**Validate Command**: `pnpm --filter @suite/calendar-web build`

#### P2-004-02: Audit tasks color contrast
**Target File**: `apps/tasks/web/src/App.css`
**Action**: Review all color combinations and adjust to meet WCAG AA standards
**Validate Command**: `pnpm --filter @suite/tasks-web build`

#### P2-004-03: Audit drive color contrast
**Target File**: `apps/drive/web/src/App.css`
**Action**: Review all color combinations and adjust to meet WCAG AA standards
**Validate Command**: `pnpm --filter @suite/drive-web build`

---

### [ ] P2-005: Add Virtual Scrolling for Large Lists

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Web Performance

**Related Files**:
- `apps/tasks/web/src/components/VirtualizedTaskList.tsx` (create)
- `apps/drive/web/src/components/VirtualizedFileList.tsx` (create)
- `apps/tasks/web/src/App.tsx`
- `apps/drive/web/src/App.tsx`

**Definition of Done**:
- Tasks list uses react-window for virtualization
- Drive file list uses react-window for virtualization
- Only visible items rendered
- Smooth scrolling maintained
- Performance test with 1000+ items

**Out of Scope**:
- Calendar virtualization (smaller data sets)
- Dynamic item heights

**Rules to Follow**:
- Virtualize lists with 100+ items
- Maintain keyboard navigation

**Advanced Pattern**:
- react-window FixedSizeList
- Memoized item renderers

**Anti-Patterns**:
- Rendering all items
- Breaking keyboard nav

**Imports/Exports**:
- Web apps use react-window

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-005-01: Install react-window in tasks web
**Target File**: `apps/tasks/web/package.json`
**Action**: Add react-window to dependencies
**Validate Command**: `pnpm install`

#### P2-005-02: Create VirtualizedTaskList component
**Target File**: `apps/tasks/web/src/components/VirtualizedTaskList.tsx`
**Action**: Create component using FixedSizeList from react-window; pass tasks and render props
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-005-03: Integrate VirtualizedTaskList in tasks app
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Replace task list rendering with VirtualizedTaskList when task count > 100
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-005-04: Install react-window in drive web
**Target File**: `apps/drive/web/package.json`
**Action**: Add react-window to dependencies
**Validate Command**: `pnpm install`

#### P2-005-05: Create VirtualizedFileList component
**Target File**: `apps/drive/web/src/components/VirtualizedFileList.tsx`
**Action**: Create component using FixedSizeList from react-window; pass files and render props
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

#### P2-005-06: Integrate VirtualizedFileList in drive app
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Replace file list rendering with VirtualizedFileList when file count > 100
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

---

### [ ] P2-006: Add Image Optimization

**Status**: Pending  
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

### [ ] P2-007: Add API Versioning

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: API

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- All routes prefixed with /api/v1
- Version header in responses
- Deprecation header for old versions
- Version documentation
- Migration path for breaking changes

**Out of Scope**:
- Multiple version support simultaneously
- Version-specific middleware

**Rules to Follow**:
- Version APIs from v1
- Document breaking changes

**Advanced Pattern**:
- Version middleware
- Semantic versioning

**Anti-Patterns**:
- Breaking changes without version bump
- No version information

**Imports/Exports**:
- None (routing)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-007-01: Add v1 prefix to calendar API routes
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Change all routes from /api/... to /api/v1/...
**Validate Command**: `curl http://localhost:3001/api/v1/events`

#### P2-007-02: Add version header to calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add API-Version: 1.0.0 header to all responses
**Validate Command**: `curl -I http://localhost:3001/api/v1/events`

#### P2-007-03: Add v1 prefix to tasks API routes
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Change all routes from /api/... to /api/v1/...
**Validate Command**: `curl http://localhost:3002/api/v1/tasks`

#### P2-007-04: Add version header to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add API-Version: 1.0.0 header to all responses
**Validate Command**: `curl -I http://localhost:3002/api/v1/tasks`

#### P2-007-05: Add v1 prefix to drive API routes
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Change all routes from /api/... to /api/v1/...
**Validate Command**: `curl http://localhost:3003/api/v1/files`

#### P2-007-06: Add version header to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add API-Version: 1.0.0 header to all responses
**Validate Command**: `curl -I http://localhost:3003/api/v1/files`

---

### [ ] P2-008: Add Health Checks and Observability

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Observability

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- /api/health endpoint on all APIs
- Health check includes: status, timestamp, dependencies
- /api/metrics endpoint for basic metrics
- Metrics include: request count, error rate, latency
- Metrics in Prometheus format

**Out of Scope**:
- Full observability stack
- Distributed tracing
- Metrics dashboard

**Rules to Follow**:
- Health checks must be fast
- Metrics must be structured

**Advanced Pattern**:
- Prometheus metrics format
- Health check aggregation

**Anti-Patterns**:
- Slow health checks
- Unstructured metrics

**Imports/Exports**:
- APIs export health and metrics endpoints

**Depends On**:
- SEC-012 (Structured logging)

**Blocks**:
- None

**Subtasks**:

#### P2-008-01: Add metrics endpoint to calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add GET /api/metrics that returns Prometheus-formatted metrics for request count, errors, latency
**Validate Command**: `curl http://localhost:3001/api/metrics`

#### P2-008-02: Add metrics endpoint to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add GET /api/metrics that returns Prometheus-formatted metrics for request count, errors, latency
**Validate Command**: `curl http://localhost:3002/api/metrics`

#### P2-008-03: Add metrics endpoint to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add GET /api/metrics that returns Prometheus-formatted metrics for request count, errors, latency
**Validate Command**: `curl http://localhost:3003/api/metrics`

---

### [ ] P2-009: Increase Test Coverage Thresholds

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Testing

**Related Files**:
- `vitest.config.ts`

**Definition of Done**:
- Coverage thresholds set to 80% for lines, functions, branches, statements
- CI fails if coverage below threshold
- Coverage report generated
- Coverage uploaded to codecov or similar

**Out of Scope**:
- 100% coverage requirement
- Coverage for generated code

**Rules to Follow**:
- Maintain high coverage
- CI enforces thresholds

**Advanced Pattern**:
- Per-package coverage thresholds
- Coverage exclusions

**Anti-Patterns**:
- Zero thresholds
- Ignoring coverage failures

**Imports/Exports**:
- None (configuration)

**Depends On**:
- SEC-006 (DB tests running in CI)

**Blocks**:
- None

**Subtasks**:

#### P2-009-01: Update coverage thresholds in vitest config
**Target File**: `vitest.config.ts`
**Action**: Change coverage.thresholds from 0 to 80 for lines, functions, branches, statements
**Validate Command**: `pnpm test --coverage`

#### P2-009-02: Add coverage upload to CI
**Target File**: `.github/workflows/ci.yml`
**Action**: Add step to upload coverage report to codecov or similar service
**Validate Command**: `gh workflow view ci.yml | grep coverage`

---

### [ ] P2-010: Add E2E Tests with Playwright

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Testing

**Related Files**:
- `apps/calendar/web/e2e/calendar.spec.ts` (create)
- `apps/tasks/web/e2e/tasks.spec.ts` (create)
- `apps/drive/web/e2e/drive.spec.ts` (create)
- `playwright.config.ts` (create)

**Definition of Done**:
- Playwright configured for all web apps
- E2E test for calendar create event flow
- E2E test for tasks create task flow
- E2E test for drive upload file flow
- E2E tests run in CI
- Tests use test database

**Out of Scope**:
- Visual regression tests
- Cross-browser testing beyond Chromium

**Rules to Follow**:
- Test critical user flows
- Isolated test data

**Advanced Pattern**:
- Page Object Model
- Test data fixtures

**Anti-Patterns**:
- Flaky tests
- Shared test state

**Imports/Exports**:
- E2E tests in each web app

**Depends On**:
- SEC-004 (Auth end-to-end)
- SEC-006 (Postgres default path)

**Blocks**:
- None

**Subtasks**:

#### P2-010-01: Install and configure Playwright
**Target File**: `playwright.config.ts`
**Action**: Create playwright.config.ts with webServer configuration for all three apps
**Validate Command**: `npx playwright test --list`

#### P2-010-02: Create calendar E2E test
**Target File**: `apps/calendar/web/e2e/calendar.spec.ts`
**Action**: Create test that signs in, creates event, verifies event appears
**Validate Command**: `npx playwright test calendar.spec.ts`

#### P2-010-03: Create tasks E2E test
**Target File**: `apps/tasks/web/e2e/tasks.spec.ts`
**Action**: Create test that signs in, creates task, verifies task appears
**Validate Command**: `npx playwright test tasks.spec.ts`

#### P2-010-04: Create drive E2E test
**Target File**: `apps/drive/web/e2e/drive.spec.ts`
**Action**: Create test that signs in, uploads file, verifies file appears
**Validate Command**: `npx playwright test drive.spec.ts`

#### P2-010-05: Add E2E to CI workflow
**Target File**: `.github/workflows/ci.yml`
**Action**: Add e2e job that runs Playwright tests after build
**Validate Command**: `gh workflow view ci.yml | grep playwright`

---

### [ ] P2-011: Add Error Code Taxonomy

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Error Handling

**Related Files**:
- `packages/shared-kernel/src/errors.ts` (create)
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Error codes defined per taxonomy document
- All errors return code field
- Error codes documented
- Client can handle errors by code
- Consistent error format across APIs

**Out of Scope**:
- Custom error handling per endpoint
- Error localization

**Rules to Follow**:
- Follow error taxonomy from planning docs
- Machine-readable error codes

**Advanced Pattern**:
- Error class hierarchy
- Error code constants

**Anti-Patterns**:
- String-only error messages
- Inconsistent error formats

**Imports/Exports**:
- Shared-kernel exports error classes and codes

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-011-01: Create error code constants
**Target File**: `packages/shared-kernel/src/errors.ts`
**Action**: Create error code constants following taxonomy: VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INTERNAL_ERROR
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### P2-011-02: Create error classes
**Target File**: `packages/shared-kernel/src/errors.ts`
**Action**: Create error classes (ValidationError, NotFoundError, etc.) that include code and message
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### P2-011-03: Update calendar API to use error classes
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Replace generic errors with typed error classes from shared-kernel
**Validate Command**: `pnpm --filter @suite/calendar-api test`

#### P2-011-04: Update tasks API to use error classes
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Replace generic errors with typed error classes from shared-kernel
**Validate Command**: `pnpm --filter @suite/tasks-api test`

#### P2-011-05: Update drive API to use error classes
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Replace generic errors with typed error classes from shared-kernel
**Validate Command**: `pnpm --filter @suite/drive-api test`

---

### [ ] P2-012: Add Request ID Tracing

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Observability

**Related Files**:
- `packages/shared-kernel/src/request-id.ts` (create)
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Request ID generated for each request
- Request ID included in logs
- Request ID returned in response header
- Request ID passed to downstream services
- Traceability across request lifecycle

**Out of Scope**:
- Distributed tracing across services
- Span generation

**Rules to Follow**:
- Include request ID in all logs
- Return request ID to client

**Advanced Pattern**:
- Middleware for request ID generation
- UUID v4 for request IDs

**Anti-Patterns**:
- Missing request IDs in logs
- Inconsistent request ID format

**Imports/Exports**:
- Shared-kernel exports requestId middleware

**Depends On**:
- SEC-012 (Structured logging)

**Blocks**:
- None

**Subtasks**:

#### P2-012-01: Create request ID middleware
**Target File**: `packages/shared-kernel/src/request-id.ts`
**Action**: Create middleware that generates UUID v4, sets in context, adds to response header
**Validate Command**: `pnpm --filter @suite/shared-kernel typecheck`

#### P2-012-02: Mount request ID middleware in calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Import and mount requestId middleware before logger
**Validate Command**: `curl -I http://localhost:3001/api/v1/events | grep X-Request-Id`

#### P2-012-03: Mount request ID middleware in tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Import and mount requestId middleware before logger
**Validate Command**: `curl -I http://localhost:3002/api/v1/tasks | grep X-Request-Id`

#### P2-012-04: Mount request ID middleware in drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Import and mount requestId middleware before logger
**Validate Command**: `curl -I http://localhost:3003/api/v1/files | grep X-Request-Id`

---

### [ ] P2-013: Add Graceful Shutdown

**Status**: Pending  
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

### [ ] P2-014: Add OpenAPI/Swagger Documentation

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: API Documentation

**Related Files**:
- `apps/calendar/api/src/openapi.ts` (create)
- `apps/tasks/api/src/openapi.ts` (create)
- `apps/drive/api/src/openapi.ts` (create)

**Definition of Done**:
- OpenAPI spec generated for each API
- /api/docs endpoint serves Swagger UI
- All endpoints documented
- Request/response schemas documented
- Authentication documented

**Out of Scope**:
- Code generation from OpenAPI
- API client SDK generation

**Rules to Follow**:
- Document all public endpoints
- Keep docs in sync with code

**Advanced Pattern**:
- Automatic OpenAPI generation from routes
- Schema inference from Zod

**Anti-Patterns**:
- Outdated documentation
- Undocumented endpoints

**Imports/Exports**:
- APIs serve OpenAPI spec

**Depends On**:
- P1-009 (Standardize API validation)

**Blocks**:
- None

**Subtasks**:

#### P2-014-01: Generate OpenAPI spec for calendar API
**Target File**: `apps/calendar/api/src/openapi.ts`
**Action**: Create OpenAPI spec document for all calendar endpoints with schemas
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`

#### P2-014-02: Serve Swagger UI for calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add GET /api/docs that serves Swagger UI with OpenAPI spec
**Validate Command**: `curl http://localhost:3001/api/docs`

#### P2-014-03: Generate OpenAPI spec for tasks API
**Target File**: `apps/tasks/api/src/openapi.ts`
**Action**: Create OpenAPI spec document for all tasks endpoints with schemas
**Validate Command**: `pnpm --filter @suite/tasks-api typecheck`

#### P2-014-04: Serve Swagger UI for tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add GET /api/docs that serves Swagger UI with OpenAPI spec
**Validate Command**: `curl http://localhost:3002/api/docs`

#### P2-014-05: Generate OpenAPI spec for drive API
**Target File**: `apps/drive/api/src/openapi.ts`
**Action**: Create OpenAPI spec document for all drive endpoints with schemas
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

#### P2-014-06: Serve Swagger UI for drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add GET /api/docs that serves Swagger UI with OpenAPI spec
**Validate Command**: `curl http://localhost:3003/api/docs`

---

### [ ] P2-015: Add Circuit Breaker Pattern

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: API Resilience

**Related Files**:
- `packages/shared-kernel/src/circuit-breaker.ts` (create)
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Circuit breaker implemented for external calls
- Circuit opens after N failures
- Circuit closes after success
- Fallback responses when circuit open
- Circuit state logged

**Out of Scope**:
- Circuit breaker for database (use connection pool)
- Circuit breaker dashboard

**Rules to Follow**:
- Protect against cascading failures
- Provide fallback responses

**Advanced Pattern**:
- State machine for circuit states
- Configurable thresholds

**Anti-Patterns**:
- No failure isolation
- Cascading failures

**Imports/Exports**:
- Shared-kernel exports circuit breaker

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-015-01: Create circuit breaker utility
**Target File**: `packages/shared-kernel/src/circuit-breaker.ts`
**Action**: Create CircuitBreaker class with states (closed, open, half-open), failure threshold, timeout
**Validate Command**: `pnpm --filter @suite/shared-kernel test`

#### P2-015-02: Wrap R2 calls with circuit breaker in drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Wrap R2 client calls with circuit breaker to handle R2 failures
**Validate Command**: `pnpm --filter @suite/drive-api test`

---

### [ ] P2-016: Add Request Timeout Middleware

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: API Performance

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Request timeout middleware mounted
- Default timeout 30 seconds
- Timeout configurable per route
- Timeout returns 408 status
- Timeout logged

**Out of Scope**:
- Per-client timeout configuration
- Timeout for streaming responses

**Rules to Follow**:
- Prevent hanging requests
- Reasonable default timeout

**Advanced Pattern**:
- AbortController for cancellation
- Per-route timeout override

**Anti-Patterns**:
- Unlimited request time
- No timeout handling

**Imports/Exports**:
- None (middleware)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-016-01: Add timeout middleware to calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add timeout middleware with 30s default; return 408 on timeout
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`

#### P2-016-02: Add timeout middleware to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add timeout middleware with 30s default; return 408 on timeout
**Validate Command**: `pnpm --filter @suite/tasks-api typecheck`

#### P2-016-03: Add timeout middleware to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add timeout middleware with 30s default; return 408 on timeout; longer timeout for upload routes
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

---

### [ ] P2-017: Add Request Body Size Limit

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: API Security

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Request body size limit middleware mounted
- Default limit 1MB
- Upload routes have higher limit (100MB)
- Oversized requests return 413
- Size limit logged

**Out of Scope**:
- Per-user size limits
- Dynamic size limits

**Rules to Follow**:
- Prevent DoS via large payloads
- Appropriate limits per route

**Advanced Pattern**:
- Per-route limit override
- Streaming for large uploads

**Anti-Patterns**:
- Unlimited body size
- Same limit for all routes

**Imports/Exports**:
- None (middleware)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-017-01: Add body size limit to calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add body size limit middleware with 1MB default
**Validate Command**: `pnpm --filter @suite/calendar-api typecheck`

#### P2-017-02: Add body size limit to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add body size limit middleware with 1MB default
**Validate Command**: `pnpm --filter @suite/tasks-api typecheck`

#### P2-017-03: Add body size limit to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add body size limit middleware with 1MB default; 100MB for upload routes
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

---

### [ ] P2-018: Add Response Compression

**Status**: Pending  
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

### [ ] P2-019: Add Cache Control Headers

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: API Performance

**Related Files**:
- `apps/calendar/api/src/index.ts`
- `apps/tasks/api/src/index.ts`
- `apps/drive/api/src/index.ts`

**Definition of Done**:
- Cache-Control headers set on GET endpoints
- ETag headers for conditional requests
- Last-Modified headers
- 304 responses for conditional requests
- No caching for authenticated endpoints

**Out of Scope**:
- CDN integration
- Response caching middleware

**Rules to Follow**:
- Cache GET endpoints appropriately
- Don't cache private data

**Advanced Pattern**:
- ETag generation from content
- Cache-Control per endpoint

**Anti-Patterns**:
- Caching authenticated data
- No cache headers

**Imports/Exports**:
- None (headers)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-019-01: Add cache headers to calendar API
**Target File**: `apps/calendar/api/src/index.ts`
**Action**: Add Cache-Control: no-cache for authenticated endpoints; Cache-Control: max-age=60 for public health endpoint
**Validate Command**: `curl -I http://localhost:3001/api/v1/events | grep Cache-Control`

#### P2-019-02: Add cache headers to tasks API
**Target File**: `apps/tasks/api/src/index.ts`
**Action**: Add Cache-Control: no-cache for authenticated endpoints; Cache-Control: max-age=60 for public health endpoint
**Validate Command**: `curl -I http://localhost:3002/api/v1/tasks | grep Cache-Control`

#### P2-019-03: Add cache headers to drive API
**Target File**: `apps/drive/api/src/index.ts`
**Action**: Add Cache-Control: no-cache for authenticated endpoints; Cache-Control: max-age=60 for public health endpoint
**Validate Command**: `curl -I http://localhost:3003/api/v1/files | grep Cache-Control`

---

### [ ] P2-021: Fix Pre-existing Lint Errors in Tasks Web

**Status**: Pending
**Priority**: P2
**Bounded Context**: Code Quality

**Related Files**:
- `apps/tasks/web/src/App.tsx`
- `apps/tasks/web/src/components/TaskRow.tsx`

**Definition of Done**:
- Remove unused variable 'setSearchTags' in App.tsx
- Remove unused parameter 'onEditTagsChange' in TaskRow.tsx
- Lint passes for tasks/web with 0 errors

**Out of Scope**:
- Fixing any warnings (only errors)
- Changing functionality

**Rules to Follow**:
- Prefix unused variables/parameters with underscore if needed for interface compatibility
- Remove truly unused code

**Anti-Patterns**:
- Commenting out code instead of removing
- Adding eslint-disable comments

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-021-01: Fix unused setSearchTags in App.tsx
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Remove unused setSearchTags variable or prefix with underscore if needed
**Validate Command**: `pnpm --filter @suite/tasks-web lint`

#### P2-021-02: Fix unused onEditTagsChange in TaskRow.tsx
**Target File**: `apps/tasks/web/src/components/TaskRow.tsx`
**Action**: Remove unused onEditTagsChange parameter or prefix with underscore if needed
**Validate Command**: `pnpm --filter @suite/tasks-web lint`

---

### [ ] P2-020: Add Dark Mode Support

**Status**: Pending  
**Priority**: P2  
**Bounded Context**: Web UX

**Related Files**:
- `apps/calendar/web/src/App.tsx`
- `apps/tasks/web/src/App.tsx`
- `apps/drive/web/src/App.tsx`

**Definition of Done**:
- Dark mode toggle in all apps
- System preference detected
- Theme persisted in storage
- All components styled for dark mode
- Smooth theme transitions

**Out of Scope**:
- Custom theme colors
- Theme editor

**Rules to Follow**:
- Respect system preference
- Persist user choice

**Advanced Pattern**:
- CSS custom properties for theming
- Theme context provider

**Anti-Patterns**:
- Hardcoded light mode
- No theme persistence

**Imports/Exports**:
- None (UI theming)

**Depends On**:
- None

**Blocks**:
- None

**Subtasks**:

#### P2-020-01: Add dark mode to calendar web
**Target File**: `apps/calendar/web/src/App.tsx`
**Action**: Add theme state, toggle button, CSS variables for dark mode colors
**Validate Command**: `pnpm --filter @suite/calendar-web typecheck`

#### P2-020-02: Add dark mode to tasks web
**Target File**: `apps/tasks/web/src/App.tsx`
**Action**: Add theme state, toggle button, CSS variables for dark mode colors
**Validate Command**: `pnpm --filter @suite/tasks-web typecheck`

#### P2-020-03: Add dark mode to drive web
**Target File**: `apps/drive/web/src/App.tsx`
**Action**: Add theme state, toggle button, CSS variables for dark mode colors
**Validate Command**: `pnpm --filter @suite/drive-web typecheck`

---

### [ ] INF-001: Fix Postgres Bundling in Web Builds

**Status**: Pending  
**Priority**: P1  
**Bounded Context**: Infrastructure

**Related Files**:
- `apps/calendar/web/vite.config.ts`
- `apps/tasks/web/vite.config.ts`
- `apps/drive/web/vite.config.ts`
- `packages/db/package.json`

**Definition of Done**:
- `pnpm --filter @suite/calendar-web build` succeeds
- `pnpm --filter @suite/tasks-web build` succeeds
- `pnpm --filter @suite/drive-web build` succeeds
- `postgres` module is not included in browser bundles

**Issue Description**:
Vite build fails for all three web apps with:
```
"performance" is not exported by "__vite-browser-external", imported by "postgres/src/connection.js"
```
This occurs because `drizzle-orm` or another dependency is pulling the `postgres` Node.js driver into browser bundles. The `postgres` package imports Node-only modules (`perf_hooks`, `crypto`, `stream`).

**Out of Scope**:
- Replacing drizzle-orm
- Removing postgres from API packages

**Rules to Follow**:
- Keep DB code out of browser bundles
- Use `resolve.alias` or `optimizeDeps.exclude` in Vite config

**Anti-Patterns**:
- Bundling server-only code into client builds
- Adding broad `external` arrays that hide real problems

**Depends On**:
- None

**Blocks**:
- P1-006 build validation
- Any web app production builds

**Subtasks**:

#### INF-001-01: Add postgres to Vite externals/alias
**Target File**: `apps/calendar/web/vite.config.ts`, `apps/tasks/web/vite.config.ts`, `apps/drive/web/vite.config.ts`
**Action**: Configure Vite to exclude `postgres` from bundling or alias it to an empty module
**Validate Command**: `pnpm --filter @suite/calendar-web build`

---

### [ ] INF-002: Fix API Test Type Errors

**Status**: Pending  
**Priority**: P1  
**Bounded Context**: Testing

**Related Files**:
- `apps/drive/api/src/index.test.ts`
- `apps/tasks/api/src/index.test.ts`

**Definition of Done**:
- `pnpm --filter @suite/drive-api typecheck` passes
- `pnpm --filter @suite/tasks-api typecheck` passes
- `pnpm -r run typecheck` passes

**Issue Description**:
API test files have TypeScript errors where `json` and `createJson` are typed as `unknown`. This prevents typecheck from passing for drive/api and tasks/api packages.

**Out of Scope**:
- Modifying production code (only test files)
- Changing test logic (only type fixes)

**Rules to Follow**:
- Fix type errors with proper type assertions or type guards
- Maintain test behavior

**Anti-Patterns**:
- Using `@ts-ignore` or `@ts-expect-error` without justification
- Suppressing type errors instead of fixing them

**Depends On**:
- None

**Blocks**:
- `pnpm -r run typecheck` workflow validation
- Any PR requiring full typecheck

**Subtasks**:

#### INF-002-01: Fix drive/api test type errors
**Target File**: `apps/drive/api/src/index.test.ts`
**Action**: Add proper type assertions for `json` and `createJson` variables to resolve `unknown` type errors
**Validate Command**: `pnpm --filter @suite/drive-api typecheck`

#### INF-002-02: Fix tasks/api test type errors
**Target File**: `apps/tasks/api/src/index.test.ts`
**Action**: Add proper type assertions for `json` and `createJson` variables to resolve `unknown` type errors
**Validate Command**: `pnpm --filter @suite/tasks-api typecheck`
