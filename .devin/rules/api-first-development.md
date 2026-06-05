---
trigger: always_on
---

# API-First Development Rules

This project follows API-first development using OpenAPI specifications and Orval code generation. Never implement API endpoints directly.

<!-- SECTION: openapi_specification -->

<openapi_specification>

- **Single Source of Truth**: lib/api-spec/openapi.yaml contains the API contract
- **Version**: OpenAPI 3.1.0 specification
- **Base URL**: All endpoints use /api prefix
- **Title Constraint**: Must remain "Api" for import path compatibility (enforced by titleTransformer)
- **Schema Definitions**: All request/response models defined in components/schemas
  </openapi_specification>

<!-- ENDSECTION: openapi_specification -->

<!-- SECTION: orval_configuration -->

<orval_configuration>

- **Dual Generation**: Generates both React Query hooks and Zod schemas
- **React Query Client**: Target lib/api-client-react/src/generated with workspace support
- **Zod Schemas**: Target lib/api-zod/src/generated/types with workspace support
- **Mode**: split for better organization (separate files per operation)
- **Custom Fetch**: custom-fetch.ts mutator for request handling
- **Type Coercion**: Boolean, number, string for queries/params; bigint, date for body/response
- **Advanced Features**: Dates and BigInt support enabled
- **Clean Output**: Auto-cleans generated files on each run
- **Title Transformer**: Enforces "Api" title for consistent imports
  </orval_configuration>

<!-- ENDSECTION: orval_configuration -->

<!-- SECTION: code_generation_workflow -->

<code_generation_workflow>

1. **Update OpenAPI**: Edit lib/api-spec/openapi.yaml with new endpoints/schemas
2. **Run Codegen**: Execute `pnpm --filter @workspace/api-spec run codegen`
3. **Generated Hooks**: Auto-created in lib/api-client-react
4. **Generated Schemas**: Auto-created in lib/api-zod
5. **Type Check**: Run `pnpm run typecheck` to validate integration
6. **Use Generated Types**: Import and use in frontend/backend
   </code_generation_workflow>

<!-- ENDSECTION: code_generation_workflow -->

<!-- SECTION: generated_packages -->

<generated_packages>

**lib/api-client-react**:

- **Purpose**: Auto-generated TanStack Query hooks
- **Exports**: useHealthCheckQuery and other operation hooks
- **Type Safety**: End-to-end typing from API to frontend
- **Error Handling**: Built-in error state management
- **Caching**: Automatic query caching and invalidation

**lib/api-zod**:

- **Purpose**: Auto-generated Zod validation schemas
- **Exports**: HealthCheckResponse and other schema types
- **Runtime Validation**: Type-safe request/response validation
- **API Integration**: Used by backend for response validation
- **Type Inference**: TypeScript types derived from schemas

</generated_packages>

<!-- ENDSECTION: generated_packages -->

<!-- SECTION: backend_integration -->

<backend_integration>

- **Import Schemas**: Use @workspace/api-zod for request/response validation
- **Response Validation**: Validate API responses with generated Zod schemas
- **Type Safety**: Backend uses same types as frontend
- **Error Handling**: Consistent error responses across API
- **Middleware**: Use Zod schemas in Express middleware for validation
  </backend_integration>

<!-- ENDSECTION: backend_integration -->

<!-- SECTION: frontend_integration -->

<frontend_integration>

- **Import Hooks**: Use @workspace/api-client-react for API calls
- **Generated Hooks**: useHealthCheckQuery, useMutation, etc.
- **Type Safety**: Auto-typed request/response data
- **Error States**: Built-in loading, error, success states
- **Caching**: Automatic data caching and refetching
  </frontend_integration>

<!-- ENDSECTION: frontend_integration -->

<!-- SECTION: development_patterns -->

<development_patterns>

- **API Changes**: Always update OpenAPI spec first
- **Code Generation**: Run codegen after any OpenAPI changes
- **Type Safety**: Never manually type API interfaces
- **Validation**: Use generated Zod schemas for all validation
- **Testing**: Mock API responses using generated types
  </development_patterns>

<!-- ENDSECTION: development_patterns -->

<!-- SECTION: strict_constraints -->

<strict_constraints>

- **No Direct Implementation**: Never implement API endpoints without OpenAPI spec
- **No Manual Types**: Never manually create API interface types
- **No Generated File Edits**: Never edit files in lib/api-client-react or lib/api-zod
- **Codegen First**: Always run codegen before implementing API usage
- **Schema Consistency**: Ensure OpenAPI schemas match database models
- **Version Control**: OpenAPI spec changes trigger codegen changes
  </strict_constraints>

<!-- ENDSECTION: strict_constraints -->

<!-- SECTION: common_operations -->

<common_operations>

- **Add Endpoint**: Update openapi.yaml → run codegen → use generated hooks
- **Update Schema**: Modify components/schemas → run codegen → types update automatically
- **Backend Validation**: Import from @workspace/api-zod → use in middleware
- **Frontend API Calls**: Import from @workspace/api-client-react → use generated hooks
- **Type Checking**: Full workspace typecheck validates API integration
  </common_operations>

<!-- ENDSECTION: common_operations -->
