---
trigger: always_on
---

# YDM Architecture Rules

## Project Overview

YDM is a **monorepo** using **pnpm workspaces** with TypeScript. This architecture prioritizes type safety, API-first development, and supply chain security over traditional setups.

## Core Architectural Patterns

### **1. Monorepo Structure**

- **Workspace Management**: pnpm workspaces with centralized catalog
- **Package Categories**:
  - `artifacts/*` (deployable applications)
  - `lib/*` (shared libraries)
  - `lib/integrations/*` (external services)
  - `scripts/*` (build automation)
- **Build Order**: Libraries build first, then artifacts in parallel

### **2. API-First Development**

- **Single Source of Truth**: `lib/api-spec/openapi.yaml`
- **Code Generation**: Orval generates React Query hooks and Zod schemas
- **Type Safety**: End-to-end from database to frontend
- **Workflow**: Update OpenAPI → Run codegen → Use generated types

### **3. Technology Stack Constraints**

- **Frontend**: React 19.1.0 + TypeScript + Vite 7.3.2 + Tailwind 4.1.14
- **Backend**: Express 5 + esbuild 0.27.3 + Pino logging
- **Database**: PostgreSQL + Drizzle ORM 0.45.2
- **Animation**: Framer Motion 11.0.0 (NOT motion library)
- **Routing**: Wouter (NOT React Router)

### **4. Platform Requirements**

- **Deployment**: Platform-agnostic with Node.js 24
- **Environment Variables**: PORT and BASE_PATH required with validation
- **Security**: Supply chain protection with 1440min release age

## Development Workflow Rules

### **Package Management**

- **Use pnpm only**: Preinstall script enforces this
- **Workspace Protocol**: Use `@workspace/package-name` for internal dependencies
- **Catalog Dependencies**: Shared dependencies managed in `pnpm-workspace.yaml`
- **Exact Versions**: No semver ranges in catalog

### **Code Generation Workflow**

1. **Update OpenAPI**: Edit `lib/api-spec/openapi.yaml`
2. **Run Codegen**: `pnpm --filter @workspace/api-spec run codegen`
3. **Type Check**: `pnpm run typecheck` to validate integration
4. **Use Generated Types**: Import from `@workspace/api-client-react` and `@workspace/api-zod`

### **Database Operations**

- **Schema Management**: Drizzle ORM with migrations
- **Development Push**: `pnpm --filter @workspace/db run push`
- **Validation**: Zod schemas auto-generated from database models
- **Integration**: Backend uses `@workspace/db` and `@workspace/api-zod`

### **Build System**

- **TypeScript Project References**: Incremental builds with cross-package validation
- **Parallel Builds**: Applications build after libraries complete
- **Source Maps**: Enabled for development, hidden in production
- **Bundle Optimization**: Post-build pnpm store pruning

## Security Requirements

### **Supply Chain Protection**

- **Release Age**: 1440-minute minimum for all packages
- **Exclusions**: Only trusted platform packages bypass release age
- **Platform Filtering**: Extensive package exclusions by platform
- **Native Modules**: Excluded for security (sharp, bcrypt, etc.)

### **Development Security**

- **Environment Variables**: No hardcoded secrets, use platform environment variables
- **Type Safety**: Strict TypeScript configuration prevents runtime errors
- **Validation**: Use generated Zod schemas for all API validation

## Package-Specific Rules

### **API Server (@workspace/api-server)**

- **Framework**: Express 5 with ESM modules
- **Build**: esbuild with external dependencies
- **Logging**: Pino structured logging with security redaction
- **Validation**: Use `@workspace/api-zod` schemas
- **Database**: Use `@workspace/db` for all data operations

### **Frontend (@firm/site)**

- **Routing**: Wouter with BASE_PATH support
- **State Management**: TanStack Query for server state
- **UI Framework**: shadcn/ui components with Tailwind CSS v4
- **Animations**: Framer Motion with reduced motion support
- **Build**: Vite with development plugins

### **Mockup Sandbox (@workspace/mockup-sandbox)**

- **Purpose**: Component preview and development
- **Hot Reload**: File watching with chokidar
- **Dynamic Loading**: Auto-generated component import maps
- **Error Handling**: Graceful error display for missing components

## Strict Constraints

### **Never Use**

- React Router v6 (use Wouter instead)
- motion library (use framer-motion)
- npm/yarn (use pnpm workspaces)
- Manual API client implementations (use generated hooks)
- Manual type definitions (use generated schemas)
- Direct database queries (use Drizzle ORM)

### **Always Use**

- pnpm workspace commands for package operations
- Generated types from OpenAPI specification
- Workspace protocol for internal dependencies
- Platform environment variables for configuration
- TypeScript strict mode settings

### **File Organization**

- **Components**: Organize by feature/domain, not by type
- **Shared Code**: Place in library packages, not individual artifacts
- **Generated Files**: Never edit files in `lib/api-client-react` or `lib/api-zod`
- **Configuration**: Centralize in root workspace files

## Common Commands

```bash
# Full workspace operations
pnpm run typecheck          # Type check all packages
pnpm run build             # Build all packages

# Package-specific operations
pnpm --filter @workspace/api-server run dev
pnpm --filter @firm/site run dev
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push

# Dependency management
pnpm install --frozen-lockfile
pnpm list --depth=0
```

## Error Handling Patterns

### **TypeScript Errors**

- Run full workspace typecheck to catch cross-package issues
- Check individual packages with filter commands
- Verify project references in tsconfig.json

### **Build Failures**

- Ensure dependencies are installed with frozen lockfile
- Check for circular dependencies
- Verify workspace protocol usage

### **Code Generation Issues**

- Validate OpenAPI spec syntax
- Check Orval configuration
- Run typecheck after codegen to verify integration

This architecture ensures type safety, developer experience, and deployment optimization for scalable full-stack applications.
