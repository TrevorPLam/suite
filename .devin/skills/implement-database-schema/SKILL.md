---
name: implement-database-schema
description: Guide for implementing the complete database schema from scratch in the YDM project (currently empty but configured)
---

# Database Schema Implementation Skill

## Current State Assessment

**CRITICAL**: The database layer is completely empty but fully configured with Drizzle ORM and PostgreSQL setup.

### **What's Missing**

- No database models implemented in `lib/db/src/schema/index.ts`
- No database tables created (only `export {}` exists)
- No seed data or migrations
- Frontend uses static mock data instead of API calls

## Implementation Workflow

### **Phase 1: Core Business Entities**

#### **1. Users & Authentication Schema**

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
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('client'), // admin, client
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Sessions table for JWT tokens
export const sessionsTable = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => usersTable.id),
  token: text('token').notNull().unique(),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Generate Zod schemas
export const insertUserSchema = createInsertSchema(usersTable)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    passwordHash: true,
  })
  .extend({
    password: z.string().min(8),
  });

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
```

#### **2. Lead Management Schema**

```typescript
// Lead sources table
export const leadSourcesTable = pgTable('lead_sources', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Leads table
export const leadsTable = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  company: text('company'),
  industry: text('industry').notNull(),
  status: text('status').default('new'), // new, contacted, qualified, closed
  sourceId: serial('source_id').references(() => leadSourcesTable.id),
  message: text('message'),
  budget: text('budget'),
  timeline: text('timeline'),
  assignedTo: serial('assigned_to').references(() => usersTable.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Generate Zod schemas
export const insertLeadSourceSchema = createInsertSchema(leadSourcesTable).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
export type LeadSource = typeof leadSourcesTable.$inferSelect;
```

#### **3. Project Management Schema**

```typescript
// Clients table
export const clientsTable = pgTable('clients', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  website: text('website'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  address: text('address'),
  status: text('status').default('active'), // active, inactive
  assignedTo: serial('assigned_to').references(() => usersTable.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Projects table
export const projectsTable = pgTable('projects', {
  id: serial('id').primaryKey(),
  clientId: serial('client_id').references(() => clientsTable.id),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('planning'), // planning, active, completed, on_hold
  budget: text('budget'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  projectManager: serial('project_manager').references(() => usersTable.id),
  technologies: text('technologies'), // JSON array of technologies
  deliverables: text('deliverables'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Generate Zod schemas
export const insertClientSchema = createInsertSchema(clientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
export type Project = typeof projectsTable.$inferSelect;
```

#### **4. Content Management Schema**

```typescript
// Blog posts table (matches frontend data structure)
export const blogPostsTable = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull(),
  readTime: text('read_time').notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  authorId: serial('author_id').references(() => usersTable.id),
  published: boolean('published').default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Industries table (matches frontend data structure)
export const industriesTable = pgTable('industries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  tagline: text('tagline').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url').notNull(),
  challenge: text('challenge').notNull(),
  strategy: text('strategy').notNull(),
  outcome: text('outcome').notNull(),
  featured: boolean('featured').default(false),
  sortOrder: serial('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Generate Zod schemas
export const insertBlogPostSchema = createInsertSchema(blogPostsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const insertIndustrySchema = createInsertSchema(industriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPostsTable.$inferSelect;
export type Industry = typeof industriesTable.$inferSelect;
```

### **Phase 2: Database Creation**

#### **1. Create Database Tables**

```bash
# Push schema to database (development)
pnpm --filter @workspace/db run push

# Force push if needed (development only)
pnpm --filter @workspace/db run push-force
```

#### **2. Verify Database Creation**

```bash
# Connect to PostgreSQL and verify tables
\dt  # List all tables
\d users  # Describe users table
SELECT * FROM users LIMIT 5;  # Test query
```

### **Phase 3: Seed Data Implementation**

#### **Create Seed Script**

```typescript
// lib/db/src/seed.ts
import { db } from './index';
import { usersTable, industriesTable, blogPostsTable, leadSourcesTable } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const [adminUser] = await db
    .insert(usersTable)
    .values({
      name: 'Admin User',
      email: 'admin@ydm.com',
      passwordHash,
      role: 'admin',
    })
    .returning();

  // Create lead sources
  const [websiteSource] = await db
    .insert(leadSourcesTable)
    .values({
      name: 'Website',
      description: 'Contact form submissions from website',
    })
    .returning();

  // Create industries (matching frontend data)
  const industries = [
    {
      name: 'Photographers',
      slug: 'photographers',
      tagline: 'Capture moments, grow your business',
      description: 'Custom portfolio websites that showcase your visual storytelling',
      imageUrl: 'https://images.unsplash.com/photo-1542038784838-5c71be3c63a6',
      challenge: 'Standing out in a crowded visual market',
      strategy: 'SEO-optimized portfolios with client galleries',
      outcome: '40% increase in qualified inquiries',
    },
    // ... add other 11 industries from frontend data
  ];

  await db.insert(industriesTable).values(industries);

  // Create sample blog posts
  const blogPosts = [
    {
      title: '5 Essential SEO Tips for Local Businesses',
      slug: '5-essential-seo-tips-local-businesses',
      category: 'Home Services',
      readTime: '5 min read',
      excerpt: 'Boost your local search visibility with these proven strategies.',
      content: 'Full blog post content here...',
      authorId: adminUser.id,
      published: true,
      publishedAt: new Date(),
    },
    // ... add other posts
  ];

  await db.insert(blogPostsTable).values(blogPosts);

  console.log('✅ Database seeded successfully!');
}

seed().catch(console.error);
```

#### **Run Seed Script**

```bash
# Add seed script to package.json
"scripts": {
  "seed": "tsx src/seed.ts"
}

# Run seed
pnpm --filter @workspace/db run seed
```

### **Phase 4: Update OpenAPI Specification**

#### **Add Schemas to OpenAPI**

```yaml
# lib/api-spec/openapi.yaml - Add to components/schemas
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
        role: { type: string, enum: [admin, client] }
        createdAt: { type: string, format: date-time }

    Lead:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
        phone: { type: string }
        industry: { type: string }
        status: { type: string, enum: [new, contacted, qualified, closed] }
        createdAt: { type: string, format: date-time }

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

    BlogPost:
      type: object
      properties:
        id: { type: integer }
        title: { type: string }
        slug: { type: string }
        category: { type: string }
        readTime: { type: string }
        excerpt: { type: string }
        content: { type: string }
        imageUrl: { type: string }
        published: { type: boolean }
        publishedAt: { type: string, format: date-time }
```

### **Phase 5: Regenerate API Types**

#### **Run Code Generation**

```bash
# Generate React Query hooks and Zod schemas
pnpm --filter @workspace/api-spec run codegen

# Verify generated files
ls lib/api-client-react/src/generated/
ls lib/api-zod/src/generated/types/
```

### **Phase 6: Frontend Integration**

#### **Replace Static Data with API Calls**

```typescript
// src/pages/BlogList.tsx - Replace static import
// OLD: import { posts } from '@/data/posts';
// NEW: Use generated API hook

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
          <span>{post.readTime}</span>
        </article>
      ))}
    </div>
  );
}
```

## Implementation Checklist

### **Database Schema**

- [ ] Replace empty `export {}` with all table definitions
- [ ] Create users, sessions, leads, clients, projects tables
- [ ] Create blog_posts, industries, lead_sources tables
- [ ] Add proper foreign key relationships
- [ ] Generate Zod schemas for all tables
- [ ] Run `pnpm --filter @workspace/db run push` to create tables

### **Seed Data**

- [ ] Create seed script with admin user
- [ ] Add all 12 industries from frontend data
- [ ] Add sample blog posts
- [ ] Add lead sources and sample leads
- [ ] Run seed script to populate database

### **API Integration**

- [ ] Update OpenAPI spec with new schemas
- [ ] Run codegen to generate API hooks
- [ ] Replace static data imports with API hooks
- [ ] Test API endpoints with generated hooks
- [ ] Verify type safety across frontend

### **Testing**

- [ ] Test database connections
- [ ] Verify CRUD operations work
- [ ] Test API endpoints with curl/Postman
- [ ] Verify frontend loads data from API
- [ ] Run full workspace typecheck

## Common Issues & Solutions

### **Database Connection Issues**

- **Problem**: `DATABASE_URL` not found
- **Solution**: Ensure PostgreSQL is running and environment variable is set
- **Check**: `echo $DATABASE_URL` in terminal

### **Schema Push Failures**

- **Problem**: Table already exists or constraint errors
- **Solution**: Use `push-force` in development or check existing tables
- **Command**: `pnpm --filter @workspace/db run push-force`

### **Type Mismatches**

- **Problem**: Generated types don't match database schema
- **Solution**: Ensure OpenAPI schemas match Drizzle table definitions
- **Fix**: Run typecheck after codegen to validate integration

This database implementation provides the foundation for all business functionality in the YDM project with proper type safety and relationships.
