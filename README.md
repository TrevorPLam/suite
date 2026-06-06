# Suite Monorepo

A productivity suite built as a monorepo with Calendar, Tasks, and Drive applications.

## Overview

Suite is a TypeScript monorepo using pnpm workspaces, implementing Domain-Driven Design (DDD) principles with bounded contexts, shared infrastructure packages, and thin API layers.

## Current State

### Runtime MVP (In-Memory Implementation)

The suite currently runs with in-memory repositories for local development. All three apps (Calendar, Tasks, Drive) are fully functional with domain logic, validation, and web UIs.

**Calendar App**
- Event CRUD with conflict detection
- Event range queries
- API endpoints with validation
- Web app with event management

**Tasks App**
- Task CRUD with due dates, priorities, and tags
- Task search and batch operations
- Task filtering (all, active, completed, archived)
- API endpoints with validation
- Web app with full task management UI

**Drive App**
- File upload, rename, delete
- Folder hierarchy and navigation
- File search and folder operations
- API endpoints with validation
- Web app with folder tree and file management

### Shared Packages (Integrated)

Infrastructure packages are integrated into the runtime:

- **@suite/db** - Drizzle ORM with PostgreSQL schema definitions (PostgresUsageRepository used in APIs)
- **@suite/auth** - Better Auth integration (mounted on all APIs via mountAuth)
- **@suite/crypto** - E2EE crypto utilities with AES-256-GCM and blind-index search support (encryption activated via ENCRYPTION_KEY)
- **@suite/env-config** - Environment validation with Zod schemas (called at API startup)
- **@suite/shared-kernel** - Distributed rate limiting with Cloudflare KV, structured logging, error handling, circuit breaker, and usage monitoring
- **@suite/ui** - Shared UI component library (Button component used in web apps)

### Not Started

- Multi-tenant data isolation

### Authentication Status

Better Auth is mounted on all APIs (calendar, tasks, drive) via `@suite/auth`'s `mountAuth` function. Web app auth integration (login UI, session management) is pending implementation.

## Architecture

### Repository Structure

```
suite/
├── apps/
│   ├── calendar/          # Calendar app (API + web)
│   ├── tasks/             # Tasks app (API + web)
│   └── drive/             # Drive app (API + web)
├── packages/
│   ├── auth/              # Authentication (Better Auth)
│   ├── crypto/            # E2EE crypto utilities
│   ├── db/                # Database (Drizzle ORM + PostgreSQL)
│   ├── env-config/        # Environment validation (Zod)
│   ├── ui/                # Shared UI components
│   ├── shared-kernel/     # Universal types and utilities
│   ├── domain-calendar/   # Calendar bounded context
│   ├── domain-tasks/      # Tasks bounded context
│   └── domain-drive/      # Drive bounded context
├── docs/                  # Documentation
```

### Key Principles

- **Domain packages never import other domain packages** - Use HTTP calls (Service Bindings) for cross-domain needs
- **Every feature begins with a spec** - Create specs in `apps/<app>/specs/` before implementation
- **API routes are thin** - Only handle validation, auth checks, and domain package calls
- **Use shared packages** - Prefer workspace packages over published registry dependencies
- **E2EE is non-negotiable** - All user content encrypted with AES-256-GCM before storage

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ (optional for local dev with in-memory repos)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
# Create .env file with required variables for your environment
# See individual app specs for required environment variables

# For PostgreSQL persistence (optional for local dev):
# Copy .env.example to .env and set DATABASE_URL
# Run migrations: APP_DOMAIN=<domain> pnpm --filter @suite/db run db:migrate
# See AGENTS.md rule 5: migrations run in CI, never in Workers
```

### Development

```bash
# Run all packages in development
pnpm dev

# Run specific app
pnpm --filter @suite/tasks-api dev
pnpm --filter @suite/tasks-web dev

# Run tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### API Proxy Configuration

All web apps use Vite's proxy feature to forward API requests to their respective API servers during development. This eliminates CORS issues and simplifies local development.

Each web app's `vite.config.ts` includes a proxy configuration:

- **Calendar web**: Proxies `/api/*` to `http://localhost:3001` (or `VITE_API_URL` if set)
- **Tasks web**: Proxies `/api/*` to `http://localhost:3002` (or `VITE_API_URL` if set)
- **Drive web**: Proxies `/api/*` to `http://localhost:3003` (or `VITE_API_URL` if set)

To override the default API server URL, set the `VITE_API_URL` environment variable:

```bash
# Example: Run calendar web with custom API URL
VITE_API_URL=http://localhost:4000 pnpm --filter @suite/calendar-web dev
```

The proxy is only active in development mode. Production builds should be configured to make direct API calls to the deployed API servers.

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @suite/domain-tasks test

# Run tests with coverage
pnpm test:coverage
```

## Documentation

- [Documentation Index](docs/README.md) - Maps docs/ paths to .planning/ files
- [Full Plan](.planning/00-vision-00-vision-and-principles.md) - Vision and principles
- [Schema Reference](.planning/03-data-24-database-schema-reference.md) - Database schema (mandatory for domain work)
- [Testing Strategy](.planning/02-monorepo-25-testing-strategy.md) - Testing guidelines
- [Developer Onboarding](.planning/08-execution-36-developer-onboarding.md) - Setup guide

## Contributing

1. Follow the spec-first development workflow
2. Adhere to AGENTS.md rules and patterns
3. Ensure all tests pass before committing
4. Use conventional commit messages

## License

MIT
