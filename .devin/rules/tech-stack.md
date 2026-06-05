---
trigger: always_on
---

# Tech Stack Rules

This project uses a locked tech stack optimized for pnpm workspace monorepo architecture. Do not deviate from these technologies:

<!-- SECTION: core_technologies -->

<core_technologies>

- **Monorepo**: pnpm workspaces with TypeScript 5.9.2
- **Frontend**: React 19.1.0 + TypeScript (Vite 7.3.2 build tool)
- **UI Framework**: Tailwind CSS v4.1.14 + shadcn/ui (55+ components)
- **State Management**: TanStack Query v5.90.21 for server state
- **Routing**: Wouter (lightweight alternative to React Router)
- **Backend**: Express 5 + esbuild 0.27.3 with ESM modules
- **Database**: PostgreSQL + Drizzle ORM 0.45.2
- **Validation**: Zod 3.25.76 with auto-generated schemas
- **Code Generation**: Orval 8.5.2 for OpenAPI to TypeScript/Zod
- **Animations**: Framer Motion 11.0.0 (not motion library)
- **Platform**: Platform-agnostic deployment with Node.js 24
  </core_technologies>

<!-- ENDSECTION: core_technologies -->

<!-- SECTION: monorepo_structure -->

<monorepo_structure>

- **Package Manager**: pnpm with centralized catalog in pnpm-workspace.yaml
- **Workspace Pattern**: artifacts/_, lib/_, lib/integrations/_, scripts/_
- **Shared Dependencies**: React 19.1.0, TypeScript 5.9.2, Vite 7.3.2, Tailwind 4.1.14
- **Build System**: Parallel builds with esbuild (backend) and Vite (frontend)
- **Type Safety**: End-to-end from OpenAPI spec to frontend via code generation
- **Security**: Supply chain protection with 1440min release age requirement
  </monorepo_structure>

<!-- ENDSECTION: monorepo_structure -->

<!-- SECTION: api_first_development -->

<api_first_development>

- **OpenAPI Spec**: Single source of truth in lib/api-spec/openapi.yaml
- **Code Generation**: Orval generates React Query hooks and Zod schemas
- **Generated Packages**:
  - lib/api-client-react: Auto-generated TanStack Query hooks
  - lib/api-zod: Auto-generated Zod validation schemas
- **Workflow**: Update OpenAPI → Run codegen → Use generated types
- **Type Safety**: Database → Zod → API → Frontend (end-to-end)
  </api_first_development>

<!-- ENDSECTION: api_first_development -->

<!-- SECTION: replit_specific_requirements -->

<platform_requirements>

- **Deployment**: Platform-agnostic with Node.js 24 runtime
- **Environment Variables**: PORT and BASE_PATH required with validation
- **Build Process**: Post-build pnpm store pruning for optimization
- **Port Mapping**: Internal 23379 → External 80
- **Git Hooks**: Post-merge hook for dependency installation and DB push
- **Platform Exclusions**: Extensive package filtering for security and size
  </platform_requirements>

<!-- ENDSECTION: replit_specific_requirements -->

<!-- SECTION: strict_constraints -->

<strict_constraints>

- **Routing**: Use Wouter, NOT React Router v6
- **Animations**: Use framer-motion, NOT motion library
- **Package Manager**: Use pnpm workspaces, NOT npm/yarn
- **Build Tools**: Use esbuild for backend, Vite for frontend
- **Code Generation**: Never modify generated files in lib/api-client-react or lib/api-zod
- **Database**: Use Drizzle ORM with Zod schemas, NOT Prisma or TypeORM
- **Deployment**: Use platform-specific configuration, NOT Vercel/Netlify configs
- **API Development**: API-first approach with OpenAPI spec, NOT direct implementation
- **TypeScript**: Use project references with tsconfig.json, NOT single tsconfig
- **Security**: Follow pnpm-workspace.yaml security policies, NOT bypass them
  </strict_constraints>

<!-- ENDSECTION: strict_constraints -->

<!-- SECTION: component_requirements -->

<component_requirements>

- **Frontend Components**: Use shadcn/ui components as base (55+ available)
- **State Management**: Use generated TanStack Query hooks from @workspace/api-client-react
- **Styling**: Use Tailwind CSS v4 with glass-card utility for morphism effects
- **Animations**: Use Framer Motion with PageTransition wrapper
- **Data**: Use static data in src/data/ for marketing content, API for dynamic data
- **TypeScript**: All components must use TypeScript with proper typing
- **Path Aliases**: Use @/ for src imports, @assets/ for attached_assets (when implemented)
</component_requirements>
<!-- ENDSECTION: component_requirements -->
