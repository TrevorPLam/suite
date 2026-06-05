---
trigger: glob
globs: artifacts/api-server/src/**/*.ts, lib/api-spec/**/*.yaml
---

# API Development Rules

## Current Implementation Status

**CRITICAL**: Only health check endpoint exists. All business logic endpoints need implementation.

## API-First Development Workflow

### **OpenAPI Specification First**

1. **Update OpenAPI**: Edit `lib/api-spec/openapi.yaml` with new endpoints
2. **Run Codegen**: `pnpm --filter @workspace/api-spec run codegen`
3. **Implement Backend**: Create routes using generated schemas
4. **Test Integration**: Verify frontend can consume API

### **Current OpenAPI Structure**

```yaml
# lib/api-spec/openapi.yaml - Currently minimal
openapi: 3.1.0
info:
  title: Api
  version: 0.1.0
servers:
  - url: /api
paths:
  /healthz:
    get:
      summary: Health check endpoint
      responses:
        200:
          description: Service is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'
components:
  schemas:
    HealthStatus:
      type: object
      properties:
        status: { type: string }
```

## Required API Endpoints

### **Authentication Endpoints**

```yaml
# Add to OpenAPI paths
/auth/register:
  post:
    summary: Register new user
    tags: [Authentication]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RegisterRequest'
    responses:
      201:
        description: User registered successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'

/auth/login:
  post:
    summary: User login
    tags: [Authentication]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/LoginRequest'
    responses:
      200:
        description: Login successful
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'

/auth/logout:
  post:
    summary: User logout
    tags: [Authentication]
    responses:
      200:
        description: Logout successful
```

### **Lead Management Endpoints**

```yaml
/leads:
  get:
    summary: Get all leads
    tags: [Leads]
    security:
      - bearerAuth: []
    responses:
      200:
        description: List of leads
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Lead'

  post:
    summary: Create new lead
    tags: [Leads]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateLeadRequest'
    responses:
      201:
        description: Lead created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Lead'

/leads/{id}:
  get:
    summary: Get lead by ID
    tags: [Leads]
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    responses:
      200:
        description: Lead details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Lead'

  put:
    summary: Update lead
    tags: [Leads]
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateLeadRequest'
    responses:
      200:
        description: Lead updated successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Lead'
```

### **Content Management Endpoints**

```yaml
/blog/posts:
  get:
    summary: Get all blog posts
    tags: [Blog]
    responses:
      200:
        description: List of blog posts
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/BlogPost'

/blog/posts/{slug}:
  get:
    summary: Get blog post by slug
    tags: [Blog]
    parameters:
      - name: slug
        in: path
        required: true
        schema:
          type: string
    responses:
      200:
        description: Blog post details
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/BlogPost'

/industries:
  get:
    summary: Get all industries
    tags: [Industries]
    responses:
      200:
        description: List of industries
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Industry'
```

## Route Implementation Pattern

### **Route Structure**

```typescript
// artifacts/api-server/src/routes/leads.ts
import express from 'express';
import { db } from '@workspace/db';
import { leadsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { CreateLeadRequest, UpdateLeadRequest } from '@workspace/api-zod';

const router = express.Router();

// GET /api/leads
router.get('/', authenticateToken, async (req, res) => {
  try {
    const leads = await db.select().from(leadsTable);
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const validated = CreateLeadRequest.parse(req.body);
    const [lead] = await db.insert(leadsTable).values(validated).returning();
    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ error: 'Invalid lead data' });
  }
});

// GET /api/leads/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

export default router;
```

### **Error Handling Middleware**

```typescript
// artifacts/api-server/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (error.name === 'ForbiddenError') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (error.name === 'NotFoundError') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};
```

## API Schema Definitions

### **Add to OpenAPI Components**

```yaml
components:
  schemas:
    # Authentication schemas
    RegisterRequest:
      type: object
      required: [name, email, password]
      properties:
        name: { type: string, minLength: 2 }
        email: { type: string, format: email }
        password: { type: string, minLength: 8 }

    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string }

    AuthResponse:
      type: object
      properties:
        user: { $ref: '#/components/schemas/User' }

    User:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
        role: { type: string, enum: [admin, client] }
        createdAt: { type: string, format: date-time }

    # Lead schemas
    Lead:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
        phone: { type: string }
        industry: { type: string }
        status: { type: string, enum: [new, contacted, qualified, closed] }
        message: { type: string }
        createdAt: { type: string, format: date-time }

    CreateLeadRequest:
      type: object
      required: [name, email, industry]
      properties:
        name: { type: string, minLength: 2 }
        email: { type: string, format: email }
        phone: { type: string }
        industry: { type: string }
        message: { type: string }

    UpdateLeadRequest:
      type: object
      properties:
        status: { type: string, enum: [new, contacted, qualified, closed] }
        notes: { type: string }

    # Blog schemas
    BlogPost:
      type: object
      properties:
        id: { type: integer }
        title: { type: string }
        slug: { type: string }
        category: { type: string }
        excerpt: { type: string }
        content: { type: string }
        imageUrl: { type: string }
        publishedAt: { type: string, format: date-time }

    # Industry schemas
    Industry:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        slug: { type: string }
        tagline: { type: string }
        description: { type: string }
        imageUrl: { type: string }
        challenge: { type: string }
        strategy: { type: string }
        outcome: { type: string }

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## Frontend API Integration

### **Replace Mock Data with API Calls**

```typescript
// src/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLeadsQuery, useCreateLeadMutation } from '@workspace/api-client-react';

// Replace static data in components
export const useLeads = () => {
  return useLeadsQuery(); // Generated hook
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useCreateLeadMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
};
```

### **Update Data Sources**

```typescript
// src/pages/BlogList.tsx - Replace static import
// OLD: import { posts } from '@/data/posts';
// NEW: Use API hook

import { useBlogPostsQuery } from '@workspace/api-client-react';

export function BlogList() {
  const { data: posts, isLoading, error } = useBlogPostsQuery();

  if (isLoading) return <div>Loading posts...</div>;
  if (error) return <div>Error loading posts</div>;

  return (
    <div>
      {posts?.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </article>
      ))}
    </div>
  );
}
```

## Implementation Priority

### **Phase 1: Core APIs (Week 1)**

1. **Authentication**: Register, login, logout endpoints
2. **Lead Management**: CRUD operations for leads
3. **Content APIs**: Blog posts and industries (read-only)
4. **Error Handling**: Global error middleware

### **Phase 2: Business Logic (Week 2)**

1. **Project Management**: Clients and projects APIs
2. **File Upload**: File handling for project assets
3. **Admin Features**: User management, analytics
4. **Email Integration**: Lead notifications

### **Phase 3: Advanced Features (Week 3)**

1. **Real-time Updates**: WebSocket integration
2. **Search & Filtering**: Advanced query capabilities
3. **Analytics**: Reporting endpoints
4. **Webhooks**: External integrations

## Development Commands

```bash
# After updating OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Start API server for testing
pnpm --filter @workspace/api-server run dev

# Test endpoints
curl http://localhost:23379/api/healthz
curl -X POST http://localhost:23379/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

This API development approach ensures type-safe, documented, and consistent APIs that integrate seamlessly with the frontend through generated hooks and schemas.
