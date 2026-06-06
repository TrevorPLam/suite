# Suite Monorepo

A productivity suite built as a monorepo with Calendar, Tasks, and Drive applications.

## Overview

Suite is a TypeScript monorepo using pnpm workspaces, implementing Domain-Driven Design (DDD) principles with bounded contexts, shared infrastructure packages, and thin API layers.

## Current State

### Completed Features

**Phase 1: Shared Infrastructure**
- PostgreSQL integration with Drizzle ORM
- Environment configuration with Zod validation
- E2EE crypto utilities with Web Crypto API (AES-256-GCM)
- Authentication with Better Auth
- Shared UI component library (shadcn/ui patterns)

**Phase 2: Domain Packages**
- Calendar domain with database integration
- Tasks domain with database integration
- Drive domain with database integration

**Phase 3: Tasks App**
- Task due dates, priorities, and tags
- Task search and batch operations
- API endpoints with validation
- Web app with full UI

**Phase 4: Drive App**
- Folder hierarchy and navigation
- File metadata tracking
- File search and folder operations
- API endpoints with validation
- Web app with folder tree and file management

**Phase 5: Technical Debt**
- Cross-platform UUID generation
- API proxy configuration for development
- Error code standardization across domains

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

1. Check TODO.md for the current task list
2. Follow the spec-first development workflow
3. Adhere to AGENTS.md rules and patterns
4. Ensure all tests pass before committing
5. Use conventional commit messages

## License

MIT
