---
trigger: glob
globs: lib/db/**/*.ts
---

# Database Integration Rules

## Current Implementation Status

**IMPORTANT**: The database layer is currently empty but fully configured. All schema definitions need to be implemented from scratch.

### **Database Setup**

- **ORM**: Drizzle ORM 0.45.2 with PostgreSQL
- **Connection**: Use `DATABASE_URL` environment variable
- **Schema Location**: `lib/db/src/schema/index.ts` (currently empty)
- **Migrations**: Use Drizzle Kit for schema management
- **Status**: Template comments only, no actual models implemented

### **Schema Definition Patterns**

```typescript
// Correct schema definition pattern
import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Generate Zod schemas
export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
```

### **Database Operations**

#### **Backend Integration**

- Import from `@workspace/db` for all database operations
- Use generated Zod schemas for validation
- Always use transactions for multi-table operations
- Handle database errors gracefully

```typescript
import { db } from '@workspace/db';
import { usersTable, insertUserSchema } from '@workspace/db/schema';

// Create user with validation
export async function createUser(data: InsertUser) {
  const validated = insertUserSchema.parse(data);
  const result = await db.insert(usersTable).values(validated).returning();
  return result[0];
}
```

#### **API Validation**

- Use `@workspace/api-zod` for request/response validation
- Ensure API endpoints match database schema types
- Validate all inputs before database operations

### **Migration Workflow**

#### **Development Commands**

```bash
# Push schema changes (development only)
pnpm --filter @workspace/db run push

# Force push (development only)
pnpm --filter @workspace/db run push-force

# Generate migration files
pnpm --filter @workspace/db run generate
```

#### **Schema Update Process**

1. Update schema in `lib/db/src/schema/index.ts`
2. Run `pnpm --filter @workspace/db run push` for development
3. Update OpenAPI spec to match new schema
4. Run codegen to regenerate Zod schemas
5. Update API endpoints to use new models

### **Type Safety Integration**

#### **End-to-End Type Flow**

1. **Database Schema** → Drizzle types
2. **Drizzle Types** → Zod schemas (via drizzle-zod)
3. **Zod Schemas** → API validation (via Orval)
4. **API Types** → Frontend hooks (via Orval)

#### **Generated Types Usage**

```typescript
// Backend - use generated types
import { User, InsertUser } from '@workspace/db/schema';

// Frontend - use generated API types
import { useCreateUserMutation } from '@workspace/api-client-react';
```

### **Security Patterns**

#### **Input Validation**

- Always validate with Zod schemas before database operations
- Never use raw SQL or string interpolation
- Use parameterized queries (handled by Drizzle)

#### **Connection Security**

- Use environment variables for database credentials
- Never hardcode connection strings
- Use SSL connections in production

### **Performance Guidelines**

#### **Query Optimization**

- Use Drizzle's query builder for efficient queries
- Implement proper indexing in schema definitions
- Use `select()` to limit returned columns
- Consider pagination for large datasets

#### **Connection Management**

- Use connection pooling (handled by PostgreSQL)
- Close connections properly (handled by Drizzle)
- Monitor connection count in production

### **Common Operations**

#### **CRUD Patterns**

```typescript
// Create
const user = await db.insert(usersTable).values(data).returning();

// Read
const users = await db.select().from(usersTable).where(eq(usersTable.id, id));

// Update
const updated = await db
  .update(usersTable)
  .set({ name: 'New Name' })
  .where(eq(usersTable.id, id))
  .returning();

// Delete
await db.delete(usersTable).where(eq(usersTable.id, id));
```

#### **Transaction Usage**

```typescript
import { db } from '@workspace/db';
import { transaction } from 'drizzle-orm/pg-core';

await transaction(async (tx) => {
  await tx.insert(usersTable).values(userData);
  await tx.insert(profilesTable).values(profileData);
});
```

### **Testing Patterns**

#### **Database Testing**

- Use separate test database
- Wrap tests in transactions for isolation
- Clean up data after each test
- Mock external dependencies

#### **Schema Validation**

- Test Zod schema validation
- Verify database constraints
- Test API endpoint validation
- Check type safety across boundaries

### **Error Handling**

#### **Database Errors**

```typescript
try {
  const result = await db.insert(usersTable).values(data).returning();
  return result;
} catch (error) {
  if (error.code === '23505') {
    // Unique violation
    throw new Error('User already exists');
  }
  throw error; // Re-throw other errors
}
```

#### **Connection Errors**

- Handle connection timeouts
- Implement retry logic for transient failures
- Log connection errors for monitoring
- Provide user-friendly error messages

### **Integration with Other Systems**

#### **API Server Integration**

- Import database models in API routes
- Use Zod schemas for request validation
- Return proper error responses
- Log database operations for audit

#### **Frontend Integration**

- Use generated React Query hooks
- Handle loading and error states
- Implement optimistic updates where appropriate
- Cache data effectively

### **Development Best Practices**

#### **Schema Design**

- Use descriptive table and column names
- Implement proper foreign key relationships
- Add appropriate constraints (NOT NULL, UNIQUE)
- Include timestamps for audit trails

#### **Code Organization**

- Keep schema definitions in dedicated files
- Export types and schemas consistently
- Use proper TypeScript typing throughout
- Document complex relationships

## Implementation Priority (Current Status)

### **Phase 1: Core Business Entities**

Based on the business analysis, implement these schemas first:

1. **Users/Authentication**
   - `users` table (id, email, name, role, created_at)
   - `sessions` table (id, user_id, token, expires_at)
   - Authentication schemas for JWT handling

2. **Leads/Contacts**
   - `leads` table (id, name, email, phone, industry, status, created_at)
   - `lead_sources` table (id, name, description)
   - Contact form processing schemas

3. **Projects/Clients**
   - `clients` table (id, name, industry, contact_info, created_at)
   - `projects` table (id, client_id, name, status, start_date, end_date)
   - Project management schemas

4. **Content Management**
   - `blog_posts` table (id, title, slug, content, category, published_at)
   - `industries` table (id, name, slug, description, image_url)
   - Content schemas matching frontend data structures

### **Schema Implementation Template**

```typescript
// lib/db/src/schema/index.ts - Replace empty export with:
import { pgTable, text, serial, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').default('client'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Generate Zod schemas
export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

// Add other tables following same pattern...
```

### **Immediate Actions Required**

1. Replace empty `export {}` in `lib/db/src/schema/index.ts` with actual schemas
2. Run `pnpm --filter @workspace/db run push` to create tables
3. Update OpenAPI spec to include new endpoints
4. Run `pnpm --filter @workspace/api-spec run codegen` to regenerate types
5. Implement API routes using new database models

This database integration ensures type safety, performance, and security across the full YDM stack.
