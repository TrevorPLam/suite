---
trigger: model_decision
description: Environment variable validation and secret management with Zod schemas
---

# Environment Configuration and Secret Management

All environment variables must be validated at startup using Zod schemas. Never access `process.env` directly.

## The Problem with .env Files

Common security incidents start with:
- .env files accidentally committed to git
- Hardcoded API keys in source code
- Secrets in Docker build args
- No type safety for environment variables

## Required Files

Every repository must have three environment-related files:

### .env
- **Never commit this file**
- Add to `.gitignore`
- Contains actual secrets and values

### .env.example
- **Commit this file**
- Template with keys but no values
- Every developer copies this to create their .env

### .gitignore
Must contain at minimum:
```
.env
.env.local
```

## .env.example Template

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# External APIs
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-...

# App Settings
NODE_ENV=development
PORT=3000

# Auth
BETTER_AUTH_SECRET=<generate with openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Monitoring
SENTRY_DSN=https://...
```

## Multi-Environment Setup

Use specific files that override the base:
- `.env.local` - Local development overrides
- `.env.production` - Production-specific settings
- `.env.test` - Test environment settings

Frameworks load these in defined priority order.

## Validation with Zod

Validate environment variables at startup:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // External APIs
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  
  // App Settings
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive().default(3000),
  
  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  
  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
});

// This throws at startup if validation fails - fail fast, fail loud
export const env = envSchema.parse(process.env);
```

## Usage Pattern

Instead of scattered `process.env.WHATEVER` calls:

```typescript
// ❌ BAD - No type safety
const dbUrl = process.env.DATABASE_URL;

// ✅ GOOD - Full type safety
import { env } from '@/lib/env';
const dbUrl = env.DATABASE_URL;
```

## Secrets in CI/CD

### GitHub Actions

```yaml
- name: Set environment variables
  run: |
    echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" >> $GITHUB_ENV
    echo "STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}" >> $GITHUB_ENV
```

### Docker

Never use Docker build args for secrets:

```dockerfile
# ❌ BAD - Secrets in build image
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# ✅ GOOD - Secrets at runtime only
ENV DATABASE_URL
```

## Secrets Management Services

For production, consider:
- Doppler
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault

These provide:
- Audit logging
- Automatic rotation
- Access controls
- Encryption at rest

## Enforcement

- `.gitignore` must include `.env` and `.env.local`
- Code reviews check for direct `process.env` access
- CI fails if environment validation fails
- Pre-commit hooks prevent committing .env files
