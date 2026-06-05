---
name: codegen-workflow
description: Complete guide for API-first development using OpenAPI specifications and Orval code generation to create type-safe React Query hooks and Zod schemas
---

# Code Generation Workflow

This skill guides you through the complete API-first development workflow using OpenAPI specifications and Orval code generation.

## Understanding the Code Generation Pipeline

### Architecture Overview

```
OpenAPI Spec (lib/api-spec/openapi.yaml)
    ↓
Orval Configuration (lib/api-spec/orval.config.ts)
    ↓
┌─────────────────────────────────────────┐
│  Generated React Query Hooks             │
│  lib/api-client-react/src/generated/   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Generated Zod Schemas                  │
│  lib/api-zod/src/generated/types/       │
└─────────────────────────────────────────┘
    ↓
Type-Safe API Integration (Frontend + Backend)
```

### Generated Packages

**@workspace/api-client-react**

- Auto-generated TanStack Query hooks
- Type-safe API calls with built-in error handling
- Automatic caching and invalidation
- Request/response type safety

**@workspace/api-zod**

- Auto-generated Zod validation schemas
- Runtime type validation
- TypeScript type inference
- API contract enforcement

## Step-by-Step Workflow

### Step 1: Define API Specification

**Location**: `lib/api-spec/openapi.yaml`

**Key Sections**:

```yaml
openapi: 3.1.0
info:
  title: Api # Must remain "Api" for import path compatibility
  version: 0.1.0
servers:
  - url: /api
paths:
  /healthz:
    get:
      operationId: healthCheck
      responses:
        '200':
          description: Health check response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'
components:
  schemas:
    HealthStatus:
      type: object
      properties:
        status:
          type: string
          example: ok
```

**Best Practices**:

- Use operationId for hook naming (e.g., healthCheck → useHealthCheckQuery)
- Define all request/response models in components/schemas
- Use descriptive names that follow TypeScript conventions
- Include example values for better documentation

### Step 2: Configure Orval

**Location**: `lib/api-spec/orval.config.ts`

**Configuration Structure**:

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    output: {
      mode: 'split',
      target: 'src/generated',
      schemas: 'src/generated/schemas',
      client: 'react-query',
      override: {
        query: {
          useInfiniteQuery: false,
        },
      },
    },
    input: {
      target: './openapi.yaml',
    },
    hooks: {
      afterCreateFiles: async (outputFiles) => {
        // Custom post-processing if needed
      },
    },
  },
  zod: {
    output: {
      mode: 'split',
      target: 'src/generated/types',
      schemas: 'src/generated/schemas',
      override: {
        transform: (value) => {
          // Custom transformation logic
        },
      },
    },
    input: {
      target: './openapi.yaml',
    },
  },
});
```

**Key Settings**:

- **mode: 'split'**: Separate files per operation for better organization
- **client: 'react-query'**: Generate TanStack Query hooks
- **override**: Custom configurations for query behavior
- **transform**: Custom transformations for Zod schemas

### Step 3: Run Code Generation

**Command**:

```bash
pnpm --filter @workspace/api-spec run codegen
```

**What Happens**:

1. Orval reads the OpenAPI specification
2. Generates React Query hooks in `lib/api-client-react/src/generated/`
3. Generates Zod schemas in `lib/api-zod/src/generated/types/`
4. Runs workspace typecheck to validate integration
5. Updates package exports automatically

**Generated Files Example**:

```
lib/api-client-react/src/generated/
├── healthCheck.ts
├── hooks/
│   ├── index.ts
│   └── useHealthCheckQuery.ts
└── index.ts

lib/api-zod/src/generated/types/
├── healthStatus.ts
├── schemas/
│   └── index.ts
└── index.ts
```

### Step 4: Use Generated Code

**Frontend Usage**:

```typescript
// Import generated hooks
import { useHealthCheckQuery } from '@workspace/api-client-react';

function HealthCheckComponent() {
  const { data, error, isLoading } = useHealthCheckQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>Status: {data?.status}</div>;
}
```

**Backend Usage**:

```typescript
// Import generated schemas
import { HealthCheckResponse } from '@workspace/api-zod';

// Use for validation
app.get('/api/healthz', (req, res) => {
  const response: HealthCheckResponse = { status: 'ok' };
  res.json(response);
});
```

## Advanced Patterns

### Custom Fetch Configuration

**Location**: `lib/api-spec/custom-fetch.ts`

```typescript
import { createFetch } from 'orval';

export const customFetch = createFetch({
  baseUrl: '/api',
  // Custom configuration
  interceptors: {
    request: [
      (request) => {
        // Add headers, authentication, etc.
        return request;
      },
    ],
    response: [
      (response) => {
        // Handle responses globally
        return response;
      },
    ],
  },
});
```

### Query Configuration

**Custom Query Options**:

```typescript
// In generated hooks, you can pass custom options
const { data } = useHealthCheckQuery({
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
  retry: 3,
});
```

### Mutation Hooks

**Define in OpenAPI**:

```yaml
paths:
  /api/users:
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
```

**Generated Usage**:

```typescript
import { useCreateUserMutation } from '@workspace/api-client-react';

function CreateUserForm() {
  const createUser = useCreateUserMutation({
    onSuccess: (data) => {
      console.log('User created:', data);
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });

  const handleSubmit = (userData) => {
    createUser.mutate(userData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Troubleshooting

### Common Issues

**Type Errors After Codegen**:

```bash
# Run full workspace typecheck
pnpm run typecheck

# Check specific package
pnpm --filter @workspace/api-client-react run typecheck
```

**Generated Hooks Not Working**:

1. Verify OpenAPI spec is valid YAML
2. Check operationId values (must be valid TypeScript identifiers)
3. Ensure schema references are correct
4. Run codegen again: `pnpm --filter @workspace/api-spec run codegen`

**Import Errors**:

1. Check package.json exports in generated packages
2. Verify workspace dependencies are correctly referenced
3. Run `pnpm install` to update internal dependencies

### Debugging Code Generation

**Verbose Output**:

```bash
# Run with verbose logging
pnpm --filter @workspace/api-spec run codegen -- --verbose
```

**Check Orval Configuration**:

```bash
# Validate orval config
pnpm --filter @workspace/api-spec run orval --config lib/api-spec/orval.config.ts
```

## Best Practices

### API Design

1. **Consistent Naming**: Use camelCase for operationId and schema names
2. **Type Safety**: Define all request/response models explicitly
3. **Validation**: Include validation rules in OpenAPI schemas
4. **Documentation**: Add descriptions and examples for all endpoints

### Code Generation

1. **Never Edit Generated Files**: Always update OpenAPI spec instead
2. **Version Control**: Track OpenAPI changes in git
3. **Automation**: Run codegen in CI/CD pipeline
4. **Testing**: Test generated hooks with mock data

### Integration Patterns

1. **Error Handling**: Use built-in error states from generated hooks
2. **Loading States**: Leverage isLoading from generated hooks
3. **Caching**: Configure staleTime and cacheTime appropriately
4. **Optimistic Updates**: Use mutation hooks with onMutate

## Workflow Integration

### Git Hooks

Add codegen to pre-commit hook:

```bash
#!/bin/sh
# .git/hooks/pre-commit
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
```

### CI/CD Pipeline

```yaml
# Example GitHub Actions
- name: Generate API Client
  run: pnpm --filter @workspace/api-spec run codegen

- name: Type Check
  run: pnpm run typecheck

- name: Build
  run: pnpm run build
```

### Development Workflow

1. **Update OpenAPI**: Edit specification file
2. **Run Codegen**: Generate hooks and schemas
3. **Type Check**: Validate integration
4. **Implement**: Use generated code in components
5. **Test**: Verify functionality with generated types

This workflow ensures complete type safety from API specification to frontend implementation, reducing errors and improving developer experience.
