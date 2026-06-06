---
name: spec-first-development
description: Guides the specification-first workflow for features, including creating spec files with user stories, API contracts, validation rules, error cases, and out-of-scope items before any code implementation
---

## Spec-First Development Guide

This skill guides the specification-first workflow where every feature begins with a comprehensive spec before any implementation code is written.

## Why Spec-First?

API-First development treats the API specification as the system's single source of truth. Endpoints, request/response schemas, and authentication flows are defined before any implementation code is written. This provides:

- **Clear contract** for how services, applications, and clients interact
- **Consistency and predictability** across the software ecosystem
- **Parallel development** - frontend and backend teams work simultaneously against a stable API contract
- **Reduced rework** - stakeholders align on API structure and behavior early
- **Reliable artifacts** - SDKs, client libraries, and documentation remain accurate

## Spec File Location

Create spec files at: `apps/<app>/specs/<feature>.spec.md`

## Spec File Template

```markdown
# <Feature Name> Specification

## User Story
As a [type of user], I want [goal] so that [benefit].

## Context
[Background information about why this feature is needed]

## API Contract

### Endpoints

#### POST /api/<resource>
**Description:** [What this endpoint does]

**Request Body:**
```typescript
{
  "field1": "string",
  "field2": "number"
}
```

**Response (200 OK):**
```typescript
{
  "id": "uuid",
  "field1": "string",
  "createdAt": "datetime"
}
```

**Error Responses:**
- 400 Bad Request: Invalid input
- 401 Unauthorized: Not authenticated
- 403 Forbidden: Insufficient permissions
- 409 Conflict: Resource already exists

#### GET /api/<resource>/:id
**Description:** [What this endpoint does]

**Response (200 OK):**
```typescript
{
  "id": "uuid",
  "field1": "string",
  "createdAt": "datetime"
}
```

**Error Responses:**
- 404 Not Found: Resource does not exist

### Data Models

```typescript
interface Resource {
  id: string;
  field1: string;
  field2: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Validation Rules

### Request Validation
- `field1`: Required, string, 1-255 characters
- `field2`: Required, number, min 0, max 1000
- `email`: Required, valid email format

### Business Logic Validation
- Resource name must be unique within organization
- Cannot delete resource with active dependencies
- Field2 must be greater than field1

## Error Cases

| Error Code | HTTP Status | Message | Trigger |
|------------|-------------|---------|---------|
| INVALID_INPUT | 400 | "Invalid request body" | Schema validation fails |
| RESOURCE_NOT_FOUND | 404 | "Resource not found" | ID does not exist |
| ALREADY_EXISTS | 409 | "Resource already exists" | Unique constraint violated |
| INSUFFICIENT_PERMISSIONS | 403 | "Insufficient permissions" | User lacks access |
| QUOTA_EXCEEDED | 429 | "Quota exceeded" | Free tier limit reached |

## Out of Scope

- [Feature not included in this iteration]
- [Another feature not included]
- [Complexity deferred to later]

## Security Considerations

- All endpoints require authentication
- Rate limiting: 100 requests/minute per user
- Input sanitization to prevent injection attacks
- Audit logging for sensitive operations

## Performance Requirements

- API response time < 200ms (p95)
- Support 1000 concurrent users
- Database queries optimized with proper indexes

## Testing Strategy

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Load testing for performance validation

## Dependencies

- Requires `@suite/auth` for authentication
- Requires `packages/domain-<domain>` for business logic
- Requires PostgreSQL database with specific schema

## Success Criteria

- [ ] All API endpoints return correct responses
- [ ] Validation rules enforced consistently
- [ ] Error cases handled gracefully
- [ ] Performance requirements met
- [ ] Security requirements satisfied
```

## Spec Review Process

1. **Create spec** in `apps/<app>/specs/<feature>.spec.md`
2. **Review with team** - get feedback on API contract and requirements
3. **Approve spec** - stakeholders sign off before implementation
4. **Implement** - write code following the approved spec
5. **Test** - verify implementation matches spec
6. **Update spec** - if requirements change during implementation, update spec first

## Common Pitfalls

- **Starting implementation before spec is approved** - leads to rework
- **Vague error cases** - be specific about what triggers each error
- **Missing validation rules** - specify all input and business validation
- **Ignoring out-of-scope items** - prevents scope creep
- **Not updating spec when requirements change** - causes drift between spec and implementation

## Integration with OpenAPI

For API-first development, consider generating OpenAPI specs from your feature spec:

```yaml
openapi: 3.0.0
info:
  title: <Feature> API
  version: 1.0.0
paths:
  /api/<resource>:
    post:
      summary: Create resource
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateResourceRequest'
      responses:
        '200':
          description: Resource created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
components:
  schemas:
    CreateResourceRequest:
      type: object
      required:
        - field1
        - field2
      properties:
        field1:
          type: string
        field2:
          type: number
    Resource:
      type: object
      properties:
        id:
          type: string
          format: uuid
        field1:
          type: string
        field2:
          type: number
        createdAt:
          type: string
          format: date-time
```

## Checklist Before Implementation

- [ ] Spec file created in correct location
- [ ] User story clearly defined
- [ ] API contract complete with all endpoints
- [ ] Validation rules specified
- [ ] Error cases documented
- [ ] Out-of-scope items listed
- [ ] Security considerations addressed
- [ ] Performance requirements defined
- [ ] Spec reviewed and approved
- [ ] Dependencies identified

## Related Skills

- **thin-api-route-implementation**: Implement the API routes defined in the spec
- **domain-package-implementation**: Implement domain logic called by API routes
- **e2ee-encryption-implementation**: Add encryption if handling sensitive data
