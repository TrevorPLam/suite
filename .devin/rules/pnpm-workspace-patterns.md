---
trigger: always_on
---

# pnpm Workspace Patterns

This project uses pnpm workspaces with extensive security configurations and centralized dependency management. Follow these guidelines for all workspace operations.

<!-- SECTION: workspace_structure -->

<workspace_structure>

- **Root Configuration**: pnpm-workspace.yaml defines workspace patterns, security, and catalog
- **Package Patterns**: artifacts/_, lib/_, lib/integrations/_, scripts/_
- **Catalog Management**: Centralized dependency versions in pnpm-workspace.yaml catalog
- **Workspace Names**: Use @workspace/\* prefix for all internal packages
- **Build Order**: Libraries build first, then artifacts (deployable applications)
- **Supply Chain Protection**: 1440-minute minimum release age enforcement
  </workspace_structure>

<!-- ENDSECTION: workspace_structure -->

<!-- SECTION: dependency_management -->

<dependency_management>

- **Catalog Usage**: All shared dependencies must be defined in catalog section
- **Exact Versions**: Use exact versions (e.g., "19.1.0" not "^19.1.0") in catalog
- **Internal Dependencies**: Use workspace protocol (e.g., "@workspace/api-client-react")
- **Security**: minimumReleaseAge: 1440 minutes for all packages (1-day delay)
- **Exclusions**: Only @replit/\* packages and stripe-replit-sync bypass release age
- **Auto Install**: autoInstallPeers: false (prevents automatic peer installation)
- **Platform Filtering**: Extensive platform-specific package exclusions for security
  </dependency_management>

<!-- ENDSECTION: dependency_management -->

<!-- SECTION: common_commands -->

<common_commands>

- **Full Typecheck**: `pnpm run typecheck` (validates all packages)
- **Build All**: `pnpm run build` (typecheck + parallel build)
- **Code Generation**: `pnpm --filter @workspace/api-spec run codegen`
- **Database Push**: `pnpm --filter @workspace/db run push`
- **API Server Dev**: `pnpm --filter @workspace/api-server run dev`
- **Frontend Dev**: `pnpm --filter @firm/site run dev`
- **Install Dependencies**: `pnpm install --frozen-lockfile`
  </common_commands>

<!-- ENDSECTION: common_commands -->

<!-- SECTION: package_patterns -->

<package_patterns>

**Artifacts (Deployable Applications)**:

- `@workspace/api-server`: Express.js backend with esbuild
- `@firm/site`: React frontend with Vite
- `@workspace/mockup-sandbox`: Component preview system

**Libraries (Shared Code)**:

- `@workspace/api-spec`: OpenAPI specification and Orval config
- `@workspace/api-client-react`: Generated React Query hooks
- `@workspace/api-zod`: Generated Zod validation schemas
- `@workspace/db`: Drizzle ORM models and database config

**Development Tools**:

- `@workspace/scripts`: Build automation and Git hooks
- `lib/integrations/*`: External service integrations (empty currently)

</package_patterns>

<!-- ENDSECTION: package_patterns -->

<!-- SECTION: build_system -->

<build_system>

- **TypeScript Project References**: Use tsconfig.json with incremental builds
- **Parallel Builds**: artifacts build in parallel after libraries complete
- **Composite Builds**: Library packages use composite: true for better performance
- **Build Scripts**: Each package has its own build script in package.json
- **Type Checking**: Separate typecheck command for validation without building
  </build_system>

<!-- ENDSECTION: build_system -->

<!-- SECTION: security_configuration -->

<security_configuration>

- **Supply Chain Protection**: 1440-minute minimum release age enforcement
- **Platform Filtering**: Extensive platform-specific package exclusions
- **Trusted Packages**: @replit/\* packages bypass release age requirements
- **Native Modules**: Excluded from builds for security (sharp, bcrypt, etc.)
- **Cloud SDKs**: Excluded by default (AWS, Azure, Google Cloud)
- **Build Tools**: Specific build tools pinned for security (esbuild 0.27.3)
  </security_configuration>

<!-- ENDSECTION: security_configuration -->

<!-- SECTION: development_workflow -->

<development_workflow>

- **Code First**: Update OpenAPI spec before implementing API changes
- **Generate Types**: Run codegen after OpenAPI changes
- **Type Check**: Always run typecheck before committing
- **Build验证**: Use build command to ensure all packages compile
- **Git Hooks**: Post-merge hook automatically installs dependencies and pushes DB changes
- **Workspace Commands**: Use --filter flag for package-specific operations
  </development_workflow>

<!-- ENDSECTION: development_workflow -->

<!-- SECTION: best_practices -->

<best_practices>

- **Workspace Dependencies**: Always use workspace protocol for internal packages
- **Catalog Management**: Define all shared dependencies in catalog, not individual package.json
- **Version Consistency**: Use catalog to ensure version consistency across packages
- **Security First**: Never bypass supply chain protections without explicit reason
- **Type Safety**: Leverage TypeScript project references for better performance
- **Code Generation**: Never manually edit generated files (api-client-react, api-zod)
  </best_practices>

<!-- ENDSECTION: best_practices -->
