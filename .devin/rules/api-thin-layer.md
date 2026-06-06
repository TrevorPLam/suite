---
trigger: glob
globs: apps/*/api/**/*.ts
---

# API Thin Layer Pattern

API routes in `apps/*/api` must remain thin and orchestrate only validation, authentication, and domain calls. No business logic belongs in the API layer.

## Responsibilities

API routes are responsible for:

1. **Request Validation**
   - Parse and validate incoming request bodies
   - Check required fields and data types
   - Validate against Zod schemas from the spec
   - Return 400 Bad Request for invalid input

2. **Authentication & Authorization**
   - Verify user identity using `@suite/auth/server`
   - Check session validity
   - Verify user has permission for the requested action
   - Return 401 Unauthorized or 403 Forbidden as appropriate

3. **Domain Orchestration**
   - Call domain package functions
   - Map request DTOs to domain models
   - Map domain responses to API responses
   - Handle domain-specific errors and translate to HTTP status codes

4. **Response Formatting**
   - Return properly formatted JSON responses
   - Include appropriate HTTP status codes
   - Add CORS headers if needed
   - Handle error responses consistently

## What NOT to Do

API routes must NOT contain:

- Business logic (belongs in domain packages)
- Database queries (belongs in domain packages)
- Complex calculations or transformations
- Direct encryption/decryption (use `@suite/crypto`)
- Email sending or external API calls (belongs in domain packages)
- State management beyond request scope

## Hexagonal Architecture Pattern

This follows the hexagonal architecture principles:

- **Domain (Core)**: Business logic in `packages/domain-*`
- **Ports**: Interfaces defined by domain packages
- **Adapters**: API layer implements inbound ports
- **Dependency Inversion**: API depends on domain abstractions, not concrete implementations

## Example Pattern

```typescript
// ❌ BAD - Business logic in API
app.post('/api/calendar/events', async (req, res) => {
  const { title, start, end } = req.body;
  // Business logic - DON'T DO THIS
  if (start >= end) {
    return res.status(400).json({ error: 'Invalid date range' });
  }
  const event = await db.insert(events).values({ title, start, end });
  res.json(event);
});

// ✅ GOOD - Thin API layer
app.post('/api/calendar/events', async (req, res) => {
  // 1. Validate request
  const result = CreateEventSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // 2. Check auth
  const session = await auth.getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 3. Call domain
  try {
    const event = await createEvent(result.data, session.userId);
    res.json(event);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }
});
```

## Benefits

Based on 2026 hexagonal architecture best practices:

- **Testability**: Domain logic can be tested without HTTP layer
- **Separation of concerns**: Each layer has a single responsibility
- **Flexibility**: Can swap API frameworks without touching domain logic
- **Maintainability**: Business rules live in one place
- **Reusability**: Domain logic can be called from multiple adapters (REST, GraphQL, CLI)

## Enforcement

- Code reviews check for business logic in API routes
- ESLint rules flag direct database access in API layer
- Unit tests mock domain packages to test API layer in isolation
