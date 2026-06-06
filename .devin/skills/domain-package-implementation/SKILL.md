---
name: domain-package-implementation
description: Guides implementation of domain packages (packages/domain-*) with proper bounded context isolation, ensuring no cross-domain imports and using HTTP/Service Bindings for cross-domain communication
---

## Domain Package Implementation Guide

This skill guides implementation of domain packages following Domain-Driven Design (DDD) bounded context principles, ensuring proper isolation and communication patterns.

## Bounded Context Principles

A **Bounded Context** is a central pattern in Domain-Driven Design. It deals with large models by dividing them into different bounded contexts and being explicit about their interrelationships.

**Key principles:**
- Each bounded context has a unified model - internally consistent with no contradictions
- Different contexts may have completely different models of common concepts
- Boundaries are drawn by human culture (ubiquitous language changes) and technical representation
- Never try to build a single, unified model for a large domain

## Repository Structure

Domain packages are located at: `packages/domain-<context>/`

Example structure:
```
packages/
  domain-calendar/
    src/
      index.ts
      entities/
      use-cases/
      repositories/
    package.json
    tsconfig.json
  domain-tasks/
    src/
      index.ts
      entities/
      use-cases/
      repositories/
    package.json
    tsconfig.json
```

## Critical Rule: No Cross-Domain Imports

**NEVER import from another domain package.**

```typescript
// ❌ FORBIDDEN
import { Task } from '@suite/domain-tasks';

// ❌ FORBIDDEN
import { CalendarEvent } from '@suite/domain-calendar';

// ✅ CORRECT - only import from shared packages
import { encrypt } from '@suite/crypto';
import { getUser } from '@suite/auth';
```

## Cross-Domain Communication

When a domain package needs data from another domain, use **HTTP calls via Cloudflare Service Bindings**:

```typescript
// packages/domain-calendar/src/use-cases/create-event-with-task.ts
import { fetch } from 'cloudflare:workers';

export async function createEventWithTask(input: CreateEventInput) {
  // Create event in calendar domain
  const event = await createEvent(input);

  // Call tasks domain via HTTP (Service Binding)
  const taskResponse = await fetch(env.TASKS_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: event.title,
      dueDate: event.startDate,
    }),
  });

  if (!taskResponse.ok) {
    throw new Error('Failed to create task');
  }

  return event;
}
```

## Domain Package Structure

### 1. Entities

Core domain objects with business logic:

```typescript
// packages/domain-calendar/src/entities/event.ts
export class CalendarEvent {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly organizationId: string,
  ) {}

  // Business logic methods
  overlapsWith(other: CalendarEvent): boolean {
    return this.startDate < other.endDate && this.endDate > other.startDate;
  }

  isValid(): boolean {
    return this.startDate < this.endDate;
  }
}
```

### 2. Use Cases

Application-specific business operations:

```typescript
// packages/domain-calendar/src/use-cases/create-event.ts
import { CalendarEvent } from '../entities/event';
import { EventRepository } from '../repositories/event';

export async function createEvent(
  input: CreateEventInput,
  repo: EventRepository
): Promise<CalendarEvent> {
  // Validation
  if (input.startDate >= input.endDate) {
    throw new Error('End date must be after start date');
  }

  // Check for overlaps
  const existingEvents = await repo.findByDateRange(
    input.startDate,
    input.endDate,
    input.organizationId
  );

  const newEvent = new CalendarEvent(
    generateId(),
    input.title,
    input.startDate,
    input.endDate,
    input.organizationId
  );

  for (const existing of existingEvents) {
    if (newEvent.overlapsWith(existing)) {
      throw new Error('Event overlaps with existing event');
    }
  }

  // Persist
  await repo.save(newEvent);
  return newEvent;
}
```

### 3. Repositories

Data access interfaces (implementation in app layer):

```typescript
// packages/domain-calendar/src/repositories/event.ts
import { CalendarEvent } from '../entities/event';

export interface EventRepository {
  save(event: CalendarEvent): Promise<void>;
  findById(id: string): Promise<CalendarEvent | null>;
  findByDateRange(
    start: Date,
    end: Date,
    organizationId: string
  ): Promise<CalendarEvent[]>;
  delete(id: string): Promise<void>;
}
```

### 4. Index File

Public API of the domain package:

```typescript
// packages/domain-calendar/src/index.ts
export * from './entities/event';
export * from './use-cases/create-event';
export * from './use-cases/update-event';
export * from './use-cases/delete-event';
export * from './repositories/event';
```

## Package.json Configuration

```json
{
  "name": "@suite/domain-calendar",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@suite/crypto": "workspace:*",
    "@suite/auth": "workspace:*"
  },
  "devDependencies": {
    "@suite/typescript-config": "workspace:*"
  }
}
```

**Important:** Domain packages should ONLY depend on:
- Other shared packages (`@suite/*`)
- External libraries (never other domain packages)

## Service Binding Configuration

In `wrangler.toml` for the app that uses the domain:

```toml
[[services]]
binding = "TASKS_API"
service = "tasks-api"
```

## Anti-Patterns to Avoid

### ❌ Direct Cross-Domain Imports

```typescript
// BAD: Direct import breaks bounded context
import { Task } from '@suite/domain-tasks';
```

### ❌ Shared Domain Models

```typescript
// BAD: Creating a "shared" domain model defeats the purpose
// packages/shared/src/domain-models.ts
export interface User { /* ... */ }
export interface Task { /* ... */ }
```

### ❌ Business Logic in API Layer

```typescript
// BAD: Business logic belongs in domain package
// apps/calendar/api/routes/events.ts
app.post('/events', async (c) => {
  const data = await c.req.json();
  // Validation and business logic should be in domain
  if (data.start >= data.end) {
    return c.text('Invalid dates', 400);
  }
});
```

## Testing Domain Packages

```typescript
// packages/domain-calendar/src/use-cases/__tests__/create-event.test.ts
import { describe, it, expect } from 'vitest';
import { createEvent } from '../create-event';
import { InMemoryEventRepository } from '../repositories/event.in-memory';

describe('createEvent', () => {
  it('should create a valid event', async () => {
    const repo = new InMemoryEventRepository();
    const event = await createEvent(
      {
        title: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00'),
        endDate: new Date('2024-01-01T11:00:00'),
        organizationId: 'org-123',
      },
      repo
    );

    expect(event.title).toBe('Meeting');
    expect(event.isValid()).toBe(true);
  });

  it('should reject overlapping events', async () => {
    const repo = new InMemoryEventRepository();
    await repo.save(
      new CalendarEvent(
        'event-1',
        'Existing',
        new Date('2024-01-01T10:00:00'),
        new Date('2024-01-01T11:00:00'),
        'org-123'
      )
    );

    await expect(
      createEvent(
        {
          title: 'New',
          startDate: new Date('2024-01-01T10:30:00'),
          endDate: new Date('2024-01-01T11:30:00'),
          organizationId: 'org-123',
        },
        repo
      )
    ).rejects.toThrow('overlaps');
  });
});
```

## Context Mapping Patterns

When domains need to interact, use these patterns:

### 1. Customer/Supplier

One domain (customer) consumes another domain's (supplier) published API:

```typescript
// Calendar domain consumes Tasks domain's published API
const response = await fetch(env.TASKS_API + '/tasks', {
  method: 'POST',
  body: JSON.stringify({ /* published contract */ }),
});
```

### 2. Open Host Service

Domain provides a well-documented public API for others to use:

```typescript
// Tasks domain provides OpenAPI spec
// apps/tasks/api/openapi.yaml
```

### 3. Anticorruption Layer

When integrating with external systems, translate their model to your domain:

```typescript
// packages/domain-calendar/src/integrations/google-calendar.ts
export function fromGoogleCalendarEvent(gcalEvent: GCalEvent): CalendarEvent {
  return new CalendarEvent(
    gcalEvent.id,
    gcalEvent.summary,
    new Date(gcalEvent.start.dateTime),
    new Date(gcalEvent.end.dateTime),
    organizationId
  );
}
```

## Checklist

- [ ] Domain package created in `packages/domain-<context>/`
- [ ] No imports from other domain packages
- [ ] Only depends on shared packages or external libraries
- [ ] Entities contain business logic
- [ ] Use cases orchestrate business operations
- [ ] Repositories are interfaces (implementation in app layer)
- [ ] Cross-domain communication uses HTTP/Service Bindings
- [ ] Tests cover business logic
- [ ] Public API exported from index.ts
- [ ] Package.json configured correctly

## Related Skills

- **spec-first-development**: Create specs before implementing domain logic
- **thin-api-route-implementation**: API routes call domain use cases
- **e2ee-encryption-implementation**: Encrypt sensitive data in domain layer
