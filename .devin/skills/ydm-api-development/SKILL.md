---
name: ydm-api-development
description: Complete guide for implementing API-first development from scratch in the YDM monorepo (currently only health check exists)
---

# YDM API Development Workflow

This skill guides you through the API-first development process that ensures end-to-end type safety across the YDM monorepo.

## Understanding the Architecture

### **Code Generation Pipeline**

```
OpenAPI Spec → Orval → React Query Hooks + Zod Schemas → Type-safe API
```

### **Key Components**

- **lib/api-spec/openapi.yaml**: Single source of truth for API contract
- **lib/api-spec/orval.config.ts**: Code generation configuration
- **lib/api-client-react**: Generated TanStack Query hooks
- **lib/api-zod**: Generated Zod validation schemas

## API Development Workflow

### **1. Define API Specification**

#### **OpenAPI Specification Structure**

```yaml
# lib/api-spec/openapi.yaml
openapi: 3.1.0
info:
  title: Api # Must remain "Api" for import path compatibility
  version: 0.1.0
servers:
  - url: /api # All endpoints use /api prefix

paths:
  /users:
    get:
      operationId: getUsers
      summary: Get all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string
          format: email
      required:
        - id
        - name
        - email
```

#### **Schema Definition Best Practices**

- Use clear, descriptive property names
- Include proper type constraints (format, minLength, etc.)
- Define required properties explicitly
- Use consistent naming conventions
- Include example values for complex types

### **2. Configure Code Generation**

#### **Orval Configuration Overview**

The `lib/api-spec/orval.config.ts` is already configured for dual generation:

```typescript
export default {
  // React Query Client Generation
  'api-client-react': {
    target: '../api-client-react/src/generated',
    mode: 'split',
    client: 'react-query',
    // ... configuration
  },

  // Zod Schema Generation
  'api-zod': {
    target: '../api-zod/src/generated/types',
    mode: 'split',
    schemas: true,
    // ... configuration
  },
};
```

#### **Generation Settings**

- **Mode**: split (separate files per operation)
- **Type Coercion**: Boolean, number, string for queries/params
- **Advanced Features**: Dates and BigInt support enabled
- **Clean Output**: Auto-cleans generated files

### **3. Run Code Generation**

#### **Generation Command**

```bash
pnpm --filter @workspace/api-spec run codegen
```

#### **What Gets Generated**

- **React Query Hooks**: In `lib/api-client-react/src/generated/`
- **Zod Schemas**: In `lib/api-zod/src/generated/types/`
- **Type Definitions**: Complete TypeScript types for all API operations

### **4. Implement Backend Endpoints**

#### **Express Route Implementation**

```typescript
// artifacts/api-server/src/routes/users.ts
import { Router } from 'express';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db/schema';
import { z } from 'zod';
import { insertUserSchema } from '@workspace/api-zod';

const router = Router();

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const validated = insertUserSchema.parse(req.body);
    const result = await db.insert(usersTable).values(validated).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

export default router;
```

#### **Route Registration**

```typescript
// artifacts/api-server/src/routes/index.ts
import usersRouter from './users';
// ... other routers

const router = Router();
router.use('/users', usersRouter);
// ... other routes

export default router;
```

### **5. Use Generated Frontend Hooks**

#### **React Query Hook Usage**

```typescript
// artifacts/nexus-digital/src/pages/Users.tsx
import { useUsersQuery, useCreateUserMutation } from '@workspace/api-client-react';

export function UsersPage() {
  const { data: users, isLoading, error } = useUsersQuery();

  const createUserMutation = useCreateUserMutation({
    onSuccess: () => {
      // Handle success
    },
    onError: (error) => {
      // Handle error
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users?.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>

      <button onClick={() => createUserMutation.mutate({
        name: 'New User',
        email: 'user@example.com'
      })}>
        Add User
      </button>
    </div>
  );
}
```

## Advanced Patterns

### **Request/Response Transformation**

```typescript
// Custom fetch mutator for headers, auth, etc.
// lib/api-spec/src/custom-fetch.ts
export const customFetch = async (url: string, options?: RequestInit) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      // Add auth headers here
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};
```

### **Error Handling Patterns**

```typescript
// Global error handling for API calls
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Retry on network errors, not on 4xx errors
        return failureCount < 3 && error.status >= 500;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### **Optimistic Updates**

```typescript
const createUserMutation = useCreateUserMutation({
  onMutate: async (newUser) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['users'] });

    // Snapshot the previous value
    const previousUsers = queryClient.getQueryData(['users']);

    // Optimistically update to the new value
    queryClient.setQueryData(['users'], (old: User[] | undefined) => [
      ...(old || []),
      { ...newUser, id: Date.now() },
    ]);

    return { previousUsers };
  },
  onError: (err, newUser, context) => {
    // Rollback on error
    queryClient.setQueryData(['users'], context.previousUsers);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
```

## Integration Patterns

### **Database Schema Integration**

```typescript
// lib/db/src/schema/users.ts
import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// This schema will match the OpenAPI User schema
export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
```

### **Validation Chain**

1. **Frontend**: Zod schemas validate form inputs
2. **API Client**: Generated hooks include type validation
3. **Backend**: Zod schemas validate request bodies
4. **Database**: Drizzle enforces schema constraints

## Testing Strategies

### **API Endpoint Testing**

```typescript
// Use generated schemas for test data
import { insertUserSchema } from '@workspace/api-zod';

describe('POST /api/users', () => {
  it('should create a user with valid data', async () => {
    const validUser = insertUserSchema.parse({
      name: 'Test User',
      email: 'test@example.com',
    });

    const response = await request(app).post('/api/users').send(validUser).expect(201);

    expect(response.body).toMatchObject(validUser);
  });

  it('should reject invalid data', async () => {
    const invalidUser = { name: '', email: 'invalid' };

    const response = await request(app).post('/api/users').send(invalidUser).expect(400);

    expect(response.body.error).toBeDefined();
  });
});
```

### **Frontend Hook Testing**

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUsersQuery } from '@workspace/api-client-react';

describe('useUsersQuery', () => {
  it('should fetch users successfully', async () => {
    const queryClient = new QueryClient();

    const { result } = renderHook(() => useUsersQuery(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(expectedUsers);
    });
  });
});
```

## Common Issues and Solutions

### **Type Mismatch Errors**

- **Problem**: Generated types don't match database schema
- **Solution**: Ensure OpenAPI schemas match Drizzle table definitions
- **Prevention**: Run typecheck after codegen to validate integration

### **Missing Hooks**

- **Problem**: React Query hooks not generated
- **Solution**: Check operationId in OpenAPI paths, ensure they're unique
- **Prevention**: Use consistent naming convention for operationIds

### **Validation Errors**

- **Problem**: Zod schemas too strict or too lenient
- **Solution**: Adjust OpenAPI schema constraints
- **Prevention**: Test validation with edge cases

## Best Practices

### **API Design**

- Use RESTful conventions for endpoints
- Include proper HTTP status codes
- Provide meaningful error messages
- Version APIs when breaking changes occur

### **Schema Management**

- Keep OpenAPI schemas in sync with database models
- Use descriptive names for all operations
- Include examples for complex types
- Document authentication requirements

### **Frontend Integration**

- Leverage loading and error states from generated hooks
- Implement proper error boundaries
- Use optimistic updates for better UX
- Cache data appropriately with TanStack Query

This API-first approach ensures type safety, consistency, and excellent developer experience across the full YDM stack.
