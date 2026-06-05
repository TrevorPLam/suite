---
trigger: model_decision
description: Testing strategy and framework setup for the YDM monorepo (currently no tests exist)
---

# Testing Strategy Rules

## Current State Assessment

**CRITICAL**: The repository has **no test infrastructure** - no test framework, unit tests, integration tests, or E2E tests are configured or implemented.

## Required Testing Stack

### **Frontend Testing (nexus-digital)**

- **Framework**: Vitest (preferred for Vite projects)
- **Components**: @testing-library/react for component testing
- **E2E**: Playwright for end-to-end testing
- **Mocking**: MSW for API mocking
- **Coverage**: c8 or istanbul for coverage reports

### **Backend Testing (api-server)**

- **Framework**: Jest or Vitest for Node.js
- **API Testing**: Supertest for HTTP endpoint testing
- **Database**: Test database with transaction rollback
- **Mocking**: Jest mocks or vi.mock for dependencies

### **Database Testing**

- **Framework**: Use same test framework as backend
- **Strategy**: Test database with proper cleanup
- **Migrations**: Test migration scripts
- **Seed Data**: Consistent test data setup

## Testing Architecture

### **Test Structure**

```
artifacts/
├── api-server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── health.test.ts
│   │   │   └── users.test.ts
│   │   ├── middleware/
│   │   │   └── auth.test.ts
│   │   └── __tests__/
│   │       └── setup.ts
├── nexus-digital/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.test.tsx
│   │   │   └── Footer.test.tsx
│   │   ├── pages/
│   │   │   ├── Home.test.tsx
│   │   │   └── Contact.test.tsx
│   │   └── __tests__/
│   │       ├── setup.ts
│   │       └── mocks.ts
└── e2e/
    ├── tests/
    │   ├── auth.spec.ts
    │   ├── contact.spec.ts
    │   └── navigation.spec.ts
    └── fixtures/
        ├── users.ts
        └── industries.ts
```

### **Frontend Testing Patterns**

#### **Component Testing**

```typescript
// src/components/Navbar.test.tsx
import { render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('renders navigation links', () => {
    render(<Navbar />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('highlights active route', () => {
    render(<Navbar currentPath="/about" />);
    const aboutLink = screen.getByText('About');
    expect(aboutLink).toHaveClass('active');
  });
});
```

#### **Page Testing with API Mocks**

```typescript
// src/pages/Home.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Home } from './Home';
import { server } from '../__tests__/mocks/server';

// Mock API responses
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Home Page', () => {
  it('displays featured industries', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Photographers')).toBeInTheDocument();
      expect(screen.getByText('Plumbers')).toBeInTheDocument();
    });
  });
});
```

### **Backend Testing Patterns**

#### **API Endpoint Testing**

```typescript
// src/routes/health.test.ts
import request from 'supertest';
import { app } from '../app';

describe('Health Endpoint', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/api/healthz').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
```

#### **Database Integration Testing**

```typescript
// src/routes/users.test.ts
import request from 'supertest';
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db/schema';
import { app } from '../app';

describe('Users API', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await db.delete(usersTable);
  });

  it('creates a new user', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    const response = await request(app).post('/api/users').send(userData).expect(201);

    expect(response.body.name).toBe(userData.name);
    expect(response.body.email).toBe(userData.email);
    expect(response.body).not.toHaveProperty('password');
  });
});
```

### **E2E Testing Patterns**

#### **Critical User Journeys**

```typescript
// e2e/tests/contact.spec.ts
import { test, expect } from '@playwright/test';

test('contact form submission', async ({ page }) => {
  await page.goto('/');

  // Navigate to contact page
  await page.click('text=Contact');
  await expect(page).toHaveURL('/contact');

  // Fill out contact form
  await page.fill('[name="name"]', 'John Doe');
  await page.fill('[name="email"]', 'john@example.com');
  await page.fill('[name="message"]', 'I need a website');

  // Submit form
  await page.click('button[type="submit"]');

  // Verify success message
  await expect(page.locator('text=Thank you for your inquiry')).toBeVisible();
});
```

## Test Configuration

### **Vitest Configuration (Frontend)**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/__tests__/', '**/*.d.ts'],
    },
  },
});
```

### **Jest Configuration (Backend)**

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Testing Workflow

### **Development Testing**

```bash
# Frontend unit tests
pnpm --filter @firm/site test

# Backend unit tests
pnpm --filter @workspace/api-server test

# Watch mode for development
pnpm --filter @firm/site test:watch

# Coverage reports
pnpm --filter @firm/site test:coverage
```

### **CI/CD Testing**

```bash
# Full test suite
pnpm run test

# E2E tests
pnpm run test:e2e

# Type checking + testing
pnpm run typecheck && pnpm run test
```

## Test Data Management

### **Fixtures and Factories**

```typescript
// e2e/fixtures/users.ts
import { faker } from '@faker-js/faker';

export const createUser = (overrides = {}) => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'client',
  ...overrides,
});

export const createAdmin = () => createUser({ role: 'admin' });
```

### **Database Seeding for Tests**

```typescript
// src/__tests__/setup.ts
import { db } from '@workspace/db';
import { usersTable } from '@workspace/db/schema';

beforeAll(async () => {
  // Set up test database
  await setupTestDatabase();
});

afterAll(async () => {
  // Clean up test database
  await cleanupTestDatabase();
});

beforeEach(async () => {
  // Reset database state
  await db.delete(usersTable);
});
```

## Testing Best Practices

### **Frontend Testing**

- Test user behavior, not implementation details
- Use meaningful test names that describe the behavior
- Mock external dependencies (API calls, timers)
- Test error states and loading states
- Keep tests focused and isolated

### **Backend Testing**

- Test happy path and error paths
- Use test database with transaction rollback
- Mock external services (email, payment processors)
- Test authentication and authorization
- Validate request/response schemas

### **E2E Testing**

- Focus on critical user journeys
- Use page object pattern for complex interactions
- Test across multiple viewports (mobile, desktop)
- Include accessibility testing
- Use realistic test data

## Coverage Requirements

### **Minimum Coverage Thresholds**

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### **Critical Path Coverage**

- All API endpoints: 100%
- All user-facing components: 90%
- Business logic: 95%
- Utility functions: 100%

## Integration with Type Safety

### **Type-Safe Testing**

```typescript
// Use generated Zod schemas for test data
import { insertUserSchema } from '@workspace/api-zod';

const validUser = insertUserSchema.parse({
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
});
```

### **API Contract Testing**

```typescript
// Test that API responses match OpenAPI schema
import { validateResponse } from '@workspace/api-zod';

it('returns valid user schema', async () => {
  const response = await request(app).get('/api/users/1');
  expect(() => validateResponse('User', response.body)).not.toThrow();
});
```

This testing strategy ensures comprehensive coverage across the full YDM stack while maintaining type safety and developer experience.
