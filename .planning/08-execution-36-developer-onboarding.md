# Developer Onboarding

This document provides a comprehensive guide for new developers joining the Sovereign Suite project, covering setup.sh, annotated .env.example, Hello World walkthrough, common first-day errors, and environment parity documentation.

---

## Quick Start: One Command to Running Dev Server

```bash
./scripts/setup.sh
```

This script installs all dependencies, starts Docker services, and launches the development server.

---

## scripts/setup.sh

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Sovereign Suite development environment..."

# Check for required tools
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm not found. Installing..."; npm install -g pnpm; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Please install Docker Desktop."; exit 1; }
command -v wrangler >/dev/null 2>&1 || { echo "❌ wrangler not found. Installing..."; npm install -g wrangler; }
command -v doppler >/dev/null 2>&1 || { echo "⚠️  Doppler CLI not found. Install for secret management: https://doppler.com/docs/cli"; }

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec suite-postgres pg_isready -U postgres; do
  sleep 1
done

# Run database migrations
echo "🗄️  Running database migrations..."
APP_DOMAIN=calendar pnpm --filter=domain-calendar db:migrate
APP_DOMAIN=drive pnpm --filter=domain-drive db:migrate
APP_DOMAIN=tasks pnpm --filter=domain-tasks db:migrate

# Start development server
echo "🎯 Starting development server..."
pnpm nx dev

echo "✅ Setup complete! Dev server running at http://localhost:3000"
```

---

## .env.example

```bash
# ============================================================================
# Database Configuration
# ============================================================================
# PostgreSQL connection string for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/suite

# ============================================================================
# Authentication
# ============================================================================
# Better Auth secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-better-auth-secret-here

# ============================================================================
# OAuth Providers (Optional)
# ============================================================================
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# ============================================================================
# Cloudflare Workers
# ============================================================================
# Cloudflare Account ID (find in Cloudflare dashboard)
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id

# Cloudflare API Token (for wrangler deployment)
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token

# ============================================================================
# R2 Storage
# ============================================================================
# R2 Access Key ID
R2_ACCESS_KEY_ID=your-r2-access-key-id

# R2 Secret Access Key
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key

# R2 Bucket Name
R2_BUCKET_NAME=your-r2-bucket-name

# ============================================================================
# Email (SMTP)
# ============================================================================
# SMTP server for outbound email
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password

# ============================================================================
# AI Assistant (Ollama)
# ============================================================================
# Ollama API URL
OLLAMA_API_URL=http://localhost:11434

# ============================================================================
# Webhook Secrets
# ============================================================================
# Stripe webhook secret (if using Stripe)
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# ============================================================================
# Environment
# ============================================================================
NODE_ENV=development
LOG_LEVEL=debug
```

### Environment Variable Explanations

| Variable | Required For | How to Generate |
|----------|--------------|----------------|
| `DATABASE_URL` | All apps | Docker Compose provides this |
| `BETTER_AUTH_SECRET` | Auth | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Google Cloud Console |
| `CLOUDFLARE_ACCOUNT_ID` | Workers deployment | Cloudflare dashboard |
| `CLOUDFLARE_API_TOKEN` | Workers deployment | Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | R2 storage | Cloudflare R2 dashboard |
| `R2_SECRET_ACCESS_KEY` | R2 storage | Cloudflare R2 dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe payments | Stripe dashboard |

---

## Hello World Walkthrough

This walkthrough demonstrates how to add a new `hello-world` app to the Sovereign Suite.

### Step 1: Create Spec File

Create `apps/hello-world/specs/greeting.spec.md`:

```markdown
# Greeting Feature Spec

## User Story
As a user, I want to see a greeting message so that I can verify the app is working.

## API Contract
- GET /api/greeting
- Response: `{ "message": "Hello, World!" }`

## Validation Rules
- None

## Error Cases
- None

## Out of Scope
- Authentication
- Personalization
```

### Step 2: Create Domain Package

Create `packages/domain-hello-world/src/lib/greet.ts`:

```typescript
export function greet(): { message: string } {
  return { message: 'Hello, World!' };
}
```

Create `packages/domain-hello-world/src/index.ts`:

```typescript
export * from './lib/greet';
```

Create `packages/domain-hello-world/package.json`:

```json
{
  "name": "@suite/domain-hello-world",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "dependencies": {
    "@suite/db": "workspace:*"
  }
}
```

### Step 3: Create Hono API Route

Create `apps/hello-world/api/src/index.ts`:

```typescript
import { Hono } from 'hono';
import { greet } from '@suite/domain-hello-world';

const app = new Hono();

app.get('/api/greeting', (c) => {
  const result = greet();
  return c.json(result);
});

export default app;
```

### Step 4: Update OpenAPI Spec

Add to `apps/hello-world/api/openapi.yaml`:

```yaml
openapi: 3.0.0
info:
  title: Hello World API
  version: 1.0.0
paths:
  /api/greeting:
    get:
      summary: Get greeting
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  message:
                    type: string
```

### Step 5: Generate API Client with Orval

Update `apps/hello-world/web/orval.config.ts`:

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  helloWorld: {
    output: './src/api/generated.ts',
    input: '../api/openapi.yaml',
  },
});
```

Run: `pnpm orval`

### Step 6: Create React Component

Create `apps/hello-world/web/src/components/greeting.tsx`:

```typescript
import { useGreeting } from '../api/generated';

export function Greeting() {
  const { data, isLoading, error } = useGreeting();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.message}</div>;
}
```

### Step 7: Write Vitest Unit Test

Create `packages/domain-hello-world/src/lib/greet.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { greet } from './greet';

describe('greet', () => {
  it('should return greeting message', () => {
    const result = greet();
    expect(result.message).toBe('Hello, World!');
  });
});
```

### Step 8: Write Playwright E2E Test

Create `apps/hello-world/web/e2e/greeting.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('displays greeting', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=Hello, World!')).toBeVisible();
});
```

### Step 9: Run Tests

```bash
# Unit tests
pnpm --filter=domain-hello-world test

# E2E tests
pnpm --filter=hello-world-web test:e2e
```

### Step 10: Deploy

```bash
# Deploy Worker
pnpm --filter=hello-world-api deploy

# Deploy Web App
pnpm --filter=hello-world-web deploy
```

---

## Common First-Day Errors

### ESLint Not Resolving Workspace Packages

**Error**: `Cannot find module '@suite/domain-calendar'`

**Solution**: Reset Nx cache:

```bash
pnpm nx reset
```

### Nx Daemon Not Starting

**Error**: `Nx daemon failed to start`

**Solution**: Start daemon manually:

```bash
pnpm nx daemon --start
```

### pnpm Store Path Mismatch in CI

**Error**: `pnpm store path mismatch`

**Solution**: Explicitly set store path in CI:

```yaml
# .github/workflows/ci.yml
- run: pnpm install --frozen-lockfile
  env:
    PNPM_STORE_PATH: ~/.pnpm-store
```

### Wrangler Not Finding TypeScript Types for Workers

**Error**: `Cannot find module 'cloudflare:workers'`

**Solution**: Run wrangler types command:

```bash
wrangler types
```

### Database Connection Refused

**Error**: `Connection refused at localhost:5432`

**Solution**: Ensure Docker is running and PostgreSQL is ready:

```bash
docker-compose up -d
docker exec suite-postgres pg_isready -U postgres
```

### Migration Failed: Schema Not Found

**Error**: `Schema "calendar" does not exist`

**Solution**: Create schema first:

```sql
CREATE SCHEMA calendar;
```

---

## Environment Parity Documentation

### 5 Key Differences Between Local, Staging, and Production

| Aspect | Local | Staging | Production |
|--------|-------|---------|------------|
| **Database** | Direct connection via Docker | Hyperdrive (Cloudflare) | Hyperdrive (Cloudflare) |
| **Storage** | Local MinIO | R2 | R2 |
| **Workers** | `wrangler dev` | Deployed Workers | Deployed Workers |
| **Secrets** | `.env` file | Doppler dev environment | Doppler prod environment |
| **Auth Cookies** | `.localhost` domain | `.staging.yourdomain.com` | `.yourdomain.com` |

### Local Development

- **Database**: PostgreSQL in Docker
- **Storage**: MinIO (S3-compatible local storage)
- **Workers**: `wrangler dev` (local emulation)
- **Secrets**: `.env` file (never commit)
- **Auth**: Local Better Auth session

### Staging

- **Database**: Hyperdrive (Cloudflare's Postgres connection pooler)
- **Storage**: R2 (Cloudflare's S3-compatible storage)
- **Workers**: Deployed to Cloudflare Workers
- **Secrets**: Doppler staging environment
- **Auth**: Better Auth with staging domain

### Production

- **Database**: Hyperdrive (Cloudflare's Postgres connection pooler)
- **Storage**: R2 (Cloudflare's S3-compatible storage)
- **Workers**: Deployed to Cloudflare Workers
- **Secrets**: Doppler production environment
- **Auth**: Better Auth with production domain

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Edit code
- Write tests
- Update documentation

### 3. Run Tests

```bash
# Run all tests
pnpm test

# Run typecheck
pnpm typecheck

# Run lint
pnpm lint
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add your feature"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Create PR on GitHub with description referencing the spec file.

### 6. CI Checks

CI will run:
- Typecheck
- Lint
- Unit tests
- E2E tests
- Build

### 7. Code Review

Request review from team members.

### 8. Merge

After approval, merge to main.

### 9. Deploy

CI will automatically deploy to staging on merge to main.

---

## Useful Commands

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test

# Run typecheck
pnpm typecheck

# Run lint
pnpm lint

# Build all apps
pnpm build

# Run database migrations
APP_DOMAIN=calendar pnpm --filter=domain-calendar db:migrate

# Deploy to Cloudflare
pnpm --filter=calendar-api deploy

# Generate database migration
pnpm --filter=domain-calendar db:generate

# View dependency graph
pnpm graph
```

---

## Resources

- **Documentation**: `docs/`
- **AGENTS.md**: Root AGENTS.md for AI agent rules
- **Domain-specific rules**: `packages/domain-<name>/AGENTS.md`
- **Migration guide**: `docs/08-execution/20-migration-plan.md`
- **Testing guide**: `docs/02-monorepo/25-testing-strategy.md`
- **Schema reference**: `docs/03-data/24-database-schema-reference.md`

---

## Getting Help

- **Slack**: #sovereign-suite-dev
- **GitHub Issues**: https://github.com/your-org/suite/issues
- **On-call**: [On-call schedule](docs/07-business/33-incident-response.md)

---

*This document must be updated when the development workflow changes or when new common errors are identified.*
