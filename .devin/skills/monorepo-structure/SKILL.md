---
name: monorepo-structure
description: Guide for understanding and working with YDM's pnpm workspace monorepo architecture, including package management, build systems, and development workflows
---

# Monorepo Structure Management

This skill guides you through working with YDM's sophisticated pnpm workspace monorepo architecture.

## Understanding the Workspace Structure

### Package Categories

**Artifacts (Deployable Applications)**

- `@workspace/api-server`: Express.js backend with esbuild
- `@firm/site`: React frontend with Vite
- `@workspace/mockup-sandbox`: Component preview system

**Libraries (Shared Code)**

- `@workspace/api-spec`: OpenAPI specification and Orval config
- `@workspace/api-client-react`: Generated React Query hooks
- `@workspace/api-zod`: Generated Zod validation schemas
- `@workspace/db`: Drizzle ORM models and database config

**Development Tools**

- `@workspace/scripts`: Build automation and Git hooks
- `lib/integrations/*`: External service integrations (empty currently)

### Workspace Configuration

**pnpm-workspace.yaml**

- Defines package patterns: artifacts/_, lib/_, lib/integrations/_, scripts/_
- Centralized dependency catalog for version consistency
- Security policies with supply chain protection
- Build optimization settings

**tsconfig.json**

- Project references for incremental builds
- Library packages use composite: true
- Path aliases for clean imports

## Common Development Workflows

### Initial Setup

1. **Install Dependencies**

   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Type Check All Packages**

   ```bash
   pnpm run typecheck
   ```

3. **Build All Packages**
   ```bash
   pnpm run build
   ```

### Package-Specific Operations

**API Server Development**

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run typecheck
```

**Frontend Development**

```bash
pnpm --filter @firm/site run dev
pnpm --filter @firm/site run build
pnpm --filter @firm/site run typecheck
```

**Database Operations**

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run push-force
```

### Code Generation Workflow

1. **Update OpenAPI Specification**
   - Edit `lib/api-spec/openapi.yaml`
   - Add new endpoints or modify existing ones

2. **Generate Code**

   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```

3. **Validate Integration**
   ```bash
   pnpm run typecheck
   ```

## Dependency Management

### Using the Catalog

The centralized catalog in `pnpm-workspace.yaml` manages shared dependencies:

```yaml
catalog:
  react: 19.1.0
  typescript: 5.9.2
  vite: 7.3.2
  tailwindcss: 4.1.14
```

### Adding New Dependencies

**For Shared Dependencies** (used across multiple packages):

1. Add to catalog in pnpm-workspace.yaml
2. Update individual package.json to reference catalog

**For Package-Specific Dependencies**:

1. Add to specific package.json
2. Use exact versions for consistency

### Internal Dependencies

Use workspace protocol for internal packages:

```json
{
  "dependencies": {
    "@workspace/api-client-react": "workspace:*",
    "@workspace/api-zod": "workspace:*"
  }
}
```

## Build System Architecture

### Build Order

1. **Libraries First**: Shared libraries build before applications
2. **Parallel Builds**: Applications build in parallel after libraries
3. **TypeScript Validation**: Full workspace typecheck before builds

### Build Commands

```bash
# Type check all packages
pnpm run typecheck

# Build all packages (typecheck + parallel build)
pnpm run build

# Type check libraries only
pnpm run typecheck:libs
```

### TypeScript Project References

- Root tsconfig.json references all packages
- Library packages use composite: true
- Incremental builds for better performance
- Cross-package type validation

## Security Configuration

### Supply Chain Protection

- **minimumReleaseAge**: 1440 minutes (1 day) for all packages
- **Exclusions**: Only trusted platform packages bypass release age
- **Platform Filtering**: Extensive package exclusions by platform

### Platform-Specific Exclusions

- Native modules excluded (sharp, bcrypt, sqlite3)
- Cloud SDKs excluded (@aws-sdk, @azure, @google-cloud)
- Build tools optimized for linux-x64

## Development Best Practices

### Code Organization

- **Single Responsibility**: Each package has clear purpose
- **Dependency Direction**: Artifacts depend on libraries, never vice versa
- **Type Safety**: End-to-end typing through code generation
- **Shared Code**: Common functionality in library packages

### Workflow Patterns

1. **API-First Development**: Update OpenAPI spec before implementation
2. **Code Generation**: Always run codegen after API changes
3. **Type Validation**: Run typecheck before committing
4. **Incremental Builds**: Leverage TypeScript project references

### Common Pitfalls to Avoid

- **Circular Dependencies**: Ensure clean dependency graph
- **Manual Type Definitions**: Use generated types, not manual interfaces
- **Bypassing Workspace**: Use pnpm commands, not individual npm installs
- **Generated File Edits**: Never edit files in lib/api-client-react or lib/api-zod

## Troubleshooting

### Common Issues

**Type Errors Across Packages**

```bash
# Run full workspace typecheck
pnpm run typecheck

# Check specific package
pnpm --filter @workspace/package-name run typecheck
```

**Build Failures**

```bash
# Clean build
pnpm run build

# Check individual package
pnpm --filter @workspace/package-name run build
```

**Dependency Issues**

```bash
# Reinstall with frozen lockfile
pnpm install --frozen-lockfile

# Check workspace graph
pnpm list --depth=0
```

### Git Hooks

**Post-Merge Hook** (scripts/post-merge.sh):

- Automatically runs on git merge
- Installs dependencies: `pnpm install --frozen-lockfile`
- Pushes database changes: `pnpm --filter db push`

## Environment Setup

### Required Environment Variables

- **PORT**: Server port (validated in Vite config)
- **BASE_PATH**: Frontend base path for routing
- **NODE_ENV**: Environment mode (development/production)
- **DATABASE_URL**: PostgreSQL connection string
- **REPL_ID**: Platform environment identifier (for conditional plugins, if needed)

### Development vs Production

**Development**:

- Development plugins loaded (if configured)
- Hot reload enabled
- Source maps generated
- Verbose logging

**Production**:

- Optimized builds
- No development plugins
- Minified output
- Performance optimizations

This monorepo structure provides excellent scalability, type safety, and developer experience for complex full-stack applications.
