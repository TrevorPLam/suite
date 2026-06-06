# Suite Development Workflow

This document describes the development workflow, commands, patterns, and conventions for the Suite monorepo.

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ (for local development)
- Git

## Setup

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd suite

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

Required environment variables (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - development, production, or test
- App-specific ports (optional, defaults provided)

## Commands

### Workspace Commands

```bash
# Install all dependencies
pnpm install

# Run all packages in development mode
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Graph dependencies
pnpm graph
```

### Package-Specific Commands

```bash
# Run specific package
pnpm --filter @suite/domain-tasks dev

# Test specific package
pnpm --filter @suite/domain-tasks test

# Type check specific package
pnpm --filter @suite/domain-tasks typecheck

# Build specific package
pnpm --filter @suite/domain-tasks build
```

### Database Commands

```bash
# Generate migration
pnpm --filter @suite/db drizzle-kit generate

# Run migration
pnpm --filter @suite/db drizzle-kit migrate

# Push schema changes (development only)
pnpm --filter @suite/db drizzle-kit push

# Open Drizzle Studio
pnpm --filter @suite/db drizzle-kit studio
```

## Development Workflow

### 1. Spec-First Development

Before implementing any feature, create a specification:

```bash
# Create spec file
touch apps/tasks/specs/new-feature.spec.md
```

Spec template:
```markdown
# Feature Name

## User Story
As a [user type], I want [feature] so that [benefit].

## API Contract
- Endpoint: POST /api/endpoint
- Request body: { ... }
- Response: { ... }
- Error responses: { ... }

## Validation Rules
- Field validation rules
- Business logic validation

## Error Cases
- Error condition 1
- Error condition 2

## Out of Scope
- Features not included in this implementation
```

### 2. Domain Package Development

Implement domain logic in the appropriate `packages/domain-*` package:

```bash
# Add domain logic
cd packages/domain-tasks/src/lib/
# Edit or create domain functions

# Add tests
cd packages/domain-tasks/src/lib/
# Edit or create test file

# Run tests
pnpm --filter @suite/domain-tasks test
```

**Pattern**: Use repository injection for testability
```typescript
// Set repository (in tests)
setTaskRepository(new InMemoryTaskRepository());

// Use repository (in production)
setTaskRepository(new PostgresTaskRepository(db));
```

### 3. API Layer Development

Implement thin API routes in the appropriate `apps/*/api` package:

```bash
# Add API endpoint
cd apps/tasks/api/src/
# Edit index.ts to add route

# Add validation
# Create validation function with Zod

# Add tests
cd apps/tasks/api/src/
# Edit index.test.ts

# Run tests
pnpm --filter @suite/tasks-api test
```

**Pattern**: Keep API layer thin
```typescript
app.post('/api/tasks', async (c) => {
  const body = await c.req.json();
  const payload = parseCreateTaskBody(body);
  if (!payload) {
    return c.json({ error: 'Invalid payload' }, 400);
  }
  try {
    const task = await createTask(payload);
    return c.json({ task }, 201);
  } catch (error) {
    const response = readTaskError(error);
    return c.json(response.body, response.status);
  }
});
```

### 4. Web App Development

Implement UI in the appropriate `apps/*/web` package:

```bash
# Add UI component
cd apps/tasks/web/src/
# Edit App.tsx or create component

# Add tests
cd apps/tasks/web/src/
# Edit App.test.tsx

# Run tests
pnpm --filter @suite/tasks-web test

# Run dev server
pnpm --filter @suite/tasks-web dev
```

**Pattern**: Use shared UI components from `@suite/ui`
```typescript
import { Button, Input, Dialog } from '@suite/ui';
```

### 5. Quality Assurance

Before committing changes:

```bash
# Type check all packages
pnpm typecheck

# Run all tests
pnpm test

# Lint all packages
pnpm lint

# Build all packages
pnpm build
```

## Patterns and Conventions

### Domain Package Patterns

**Repository Pattern**
```typescript
// Define repository interface
export interface TaskRepository {
  create(input: CreateTaskInput): Promise<TaskItem>;
  findById(id: string): Promise<TaskItem | null>;
  findAll(): Promise<TaskItem[]>;
  update(id: string, input: UpdateTaskInput): Promise<TaskItem>;
  delete(id: string): Promise<void>;
}

// Implement in-memory repository for tests
class InMemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, TaskItem>();
  // ...
}

// Implement database repository for production
class PostgresTaskRepository implements TaskRepository {
  constructor(private db: DrizzleDB) {}
  // ...
}

// Injection pattern
let currentRepository: TaskRepository;
export function setTaskRepository(repo: TaskRepository) {
  currentRepository = repo;
}
```

**Error Handling**
```typescript
export type TaskErrorCode = 'validation_error' | 'not_found_error';

export class TaskError extends Error {
  constructor(
    message: string,
    public readonly code: TaskErrorCode,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'TaskError';
  }
}

// Usage
throw new TaskError('Task not found', 'not_found_error');
```

### API Layer Patterns

**Validation with Zod**
```typescript
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  completed: z.boolean().optional(),
  archived: z.boolean().optional(),
});

function parseCreateTaskBody(body: unknown): CreateTaskInput | null {
  const result = createTaskSchema.safeParse(body);
  return result.success ? result.data : null;
}
```

**Error Mapping**
```typescript
function readTaskError(error: unknown): { body: { error: string }; status: number } {
  if (error instanceof TaskError) {
    switch (error.code) {
      case 'validation_error':
        return { body: { error: error.message }, status: 400 };
      case 'not_found_error':
        return { body: { error: error.message }, status: 404 };
    }
  }
  return { body: { error: 'Internal server error' }, status: 500 };
}
```

### Web App Patterns

**Shared UI Components**
```typescript
import { Button, Input, Dialog, Card } from '@suite/ui';
import { cn } from '@suite/ui';

// Use cn utility for className merging
<Button className={cn('base-class', conditionalClass)}>
  Click me
</Button>
```

**Debounced Search**
```typescript
const [searchQuery, setSearchQuery] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    if (searchQuery) {
      searchTasks({ query: searchQuery });
    }
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery]);
```

## Testing Guidelines

### Unit Tests (Vitest)

**Domain Tests**
```typescript
describe('createTask', () => {
  beforeEach(() => {
    setTaskRepository(new InMemoryTaskRepository());
  });

  it('should create a task', async () => {
    const task = await createTask({ title: 'Test task' });
    expect(task.title).toBe('Test task');
    expect(task.completed).toBe(false);
  });

  it('should throw validation error for empty title', async () => {
    await expect(createTask({ title: '' })).rejects.toThrow(TaskError);
  });
});
```

**API Tests**
```typescript
describe('POST /api/tasks', () => {
  beforeEach(async () => {
    await resetTasks();
  });

  it('should create a task', async () => {
    const response = await app.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test task' }),
    });
    expect(response.status).toBe(201);
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can create a task', async ({ page }) => {
  await page.goto('http://localhost:3002');
  await page.fill('input[name="title"]', 'Test task');
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Test task')).toBeVisible();
});
```

## Git Workflow

### Branching Strategy

- `main` - Production branch
- `develop` - Integration branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `chore/*` - Maintenance branches

### Commit Messages

Use conventional commit format:

```
feat: add task due dates
fix: resolve calendar conflict detection bug
refactor: simplify drive folder navigation
docs: update architecture documentation
test: add domain package tests
chore: update dependencies
```

### Pull Request Process

1. Create feature branch from `develop`
2. Implement feature with tests
3. Run quality assurance commands
4. Create pull request with description
5. Request review
6. Address feedback
7. Merge to `develop`

## Code Review Guidelines

### What to Review

- **Domain Logic**: Business rules, validation, error handling
- **API Layer**: Validation, error mapping, thinness
- **UI Components**: Accessibility, loading states, error handling
- **Tests**: Coverage, edge cases, isolation
- **TypeScript**: Type safety, proper types
- **Security**: No hardcoded secrets, proper encryption

### Common Issues

- Domain packages importing other domain packages
- Business logic in API layer
- Missing tests for new features
- Hardcoded environment variables
- Ignoring validation errors
- Breaking existing API contracts

## Troubleshooting

### Common Issues

**TypeScript errors**
```bash
# Clear cache and reinstall
rm -rf node_modules
pnpm install
pnpm typecheck
```

**Test failures**
```bash
# Run tests in watch mode to debug
pnpm --filter @suite/domain-tasks test --watch

# Run specific test file
pnpm --filter @suite/domain-tasks test src/lib/tasks.test.ts
```

**Database connection issues**
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running
# Test connection
pnpm --filter @suite/db drizzle-kit studio
```

**Port conflicts**
```bash
# Change port in environment variable
VITE_API_URL=http://localhost:4000 pnpm --filter @suite/tasks-web dev
```

## Performance Considerations

### Database Queries
- Use indexes for frequently queried columns
- Avoid N+1 queries
- Use transactions for multi-step operations

### Bundle Size
- Lazy load components in web apps
- Use dynamic imports for large dependencies
- Optimize shared UI components

### API Response Time
- Keep API layer thin
- Use async operations throughout
- Implement caching where appropriate

## Security Best Practices

### Never Do
- Hardcode secrets in code
- Store passwords in plaintext
- Ignore validation errors
- Use weak encryption
- Expose sensitive data in logs

### Always Do
- Use environment variables for secrets
- Validate all inputs
- Encrypt user content
- Use HTTPS in production
- Follow principle of least privilege

## References

- [Architecture Documentation](architecture.md)
- [Testing Commands](testing-commands.md)
- [AGENTS.md](../AGENTS.md)
- [TODO.md](../TODO.md)
