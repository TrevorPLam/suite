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

### Shared Packages (Unwired)

Infrastructure packages exist but are not yet integrated into the runtime. These will be wired in future phases (see TODO.md).

- **@suite/db** - Drizzle ORM with PostgreSQL schema definitions (not yet wired to APIs)
- **@suite/auth** - Better Auth integration (not yet mounted on APIs)
- **@suite/crypto** - E2EE crypto utilities with AES-256-GCM (not yet applied to user content)
- **@suite/env-config** - Environment validation with Zod schemas (not yet called at API startup)
- **@suite/ui** - Shared UI component library (shadcn/ui patterns)

### Not Started

- PostgreSQL persistence (domains use in-memory repos by default)
- Authentication on API routes
- End-to-end encryption of user content
- Multi-tenant data isolation

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
└── TODO.md                # Implementation roadmap
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
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
# Create .env file with required variables for your environment
# See individual app specs for required environment variables
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
- [Implementation Roadmap](TODO.md) - Current task list

## Contributing

1. Check [TODO.md](TODO.md) for the current task list and implementation roadmap
2. Follow the spec-first development workflow
3. Adhere to AGENTS.md rules and patterns
4. Ensure all tests pass before committing
5. Use conventional commit messages

## License

MIT
