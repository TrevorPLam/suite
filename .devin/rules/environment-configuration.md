---
trigger: model_decision
description: Environment configuration and secret management strategy for the YDM project across development and production
---

# Environment Configuration Rules

## Current State Assessment

**GAPS**: Environment configuration is minimal with only PORT and BASE_PATH validation. No secret management strategy, environment-specific configs, or CI/CD pipeline configuration exists.

## Required Environment Variables

### **Core Application Variables**

```bash
# Required for all environments
PORT=23379                          # Server port (validated in Vite config)
BASE_PATH=/                         # Frontend base path for routing (validated)
NODE_ENV=development                # Environment mode (development/production)
DATABASE_URL=postgresql://...       # PostgreSQL connection string
LOG_LEVEL=info                      # Logging level (error, warn, info, debug)

# Platform-specific
# REPL_ID=your_platform_id               # Platform environment identifier (if needed)
```

### **Security & Authentication**

```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret_here    # JWT signing secret (32+ chars)
JWT_EXPIRES_IN=7d                   # Token expiration
REFRESH_TOKEN_SECRET=refresh_secret # Refresh token secret

# API Security
API_RATE_LIMIT=100                  # Requests per minute
CORS_ORIGIN=https://yourdomain.com  # CORS allowed origins

# Encryption
ENCRYPTION_KEY=your_encryption_key # Data encryption key
```

### **External Services**

```bash
# Error Tracking
SENTRY_DSN=https://your_sentry_dsn  # Sentry error tracking
SENTRY_ENVIRONMENT=production       # Sentry environment

# Email Service
SMTP_HOST=smtp.gmail.com            # SMTP server
SMTP_PORT=587                       # SMTP port
SMTP_USER=your_email@gmail.com      # SMTP username
SMTP_PASS=your_app_password         # SMTP password

# Analytics
ANALYTICS_ENABLED=true              # Enable analytics tracking
ANALYTICS_ENDPOINT=https://...      # Analytics endpoint
```

### **Database Configuration**

```bash
# PostgreSQL Settings
DATABASE_URL=postgresql://user:pass@host:5432/db
DATABASE_SSL_MODE=require           # SSL connection mode
DATABASE_POOL_MIN=2                  # Minimum pool size
DATABASE_POOL_MAX=10                 # Maximum pool size

# Redis (if needed for caching)
REDIS_URL=redis://localhost:6379    # Redis connection
REDIS_PASSWORD=your_redis_pass      # Redis password
```

## Environment-Specific Configuration

### **Development Environment**

```bash
# .env.development
NODE_ENV=development
PORT=23379
BASE_PATH=/
LOG_LEVEL=debug
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/ydm_dev
JWT_SECRET=dev_jwt_secret_32_chars_minimum
SENTRY_ENVIRONMENT=development
ANALYTICS_ENABLED=false
CORS_ORIGIN=http://localhost:23379
```

### **Staging Environment**

```bash
# .env.staging
NODE_ENV=production
PORT=23379
BASE_PATH=/staging
LOG_LEVEL=info
DATABASE_URL=postgresql://staging_user:staging_pass@host:5432/ydm_staging
JWT_SECRET=staging_jwt_secret_32_chars_minimum
SENTRY_ENVIRONMENT=staging
ANALYTICS_ENABLED=true
CORS_ORIGIN=https://staging.yourdomain.com
```

### **Production Environment**

```bash
# .env.production (managed by platform environment variables)
NODE_ENV=production
PORT=23379
BASE_PATH=/
LOG_LEVEL=warn
DATABASE_URL=${DATABASE_URL}        # From platform secrets
JWT_SECRET=${JWT_SECRET}            # From platform secrets
SENTRY_DSN=${SENTRY_DSN}            # From platform secrets
SMTP_USER=${SMTP_USER}              # From platform secrets
SMTP_PASS=${SMTP_PASS}              # From platform secrets
ANALYTICS_ENABLED=true
CORS_ORIGIN=https://yourdomain.com
```

## Configuration Management

### **Environment Configuration Files**

```typescript
// src/lib/config.ts
interface Config {
  port: number;
  basePath: string;
  nodeEnv: string;
  database: {
    url: string;
    sslMode: string;
    poolMin: number;
    poolMax: number;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenSecret: string;
  };
  cors: {
    origin: string;
  };
  logging: {
    level: string;
  };
  sentry?: {
    dsn: string;
    environment: string;
  };
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '23379', 10),
    basePath: process.env.BASE_PATH || '/',
    nodeEnv: process.env.NODE_ENV || 'development',
    database: {
      url: getRequiredEnv('DATABASE_URL'),
      sslMode: process.env.DATABASE_SSL_MODE || 'require',
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    },
    auth: {
      jwtSecret: getRequiredEnv('JWT_SECRET'),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
      refreshTokenSecret: getRequiredEnv('REFRESH_TOKEN_SECRET'),
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:23379',
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
    },
    sentry: process.env.SENTRY_DSN
      ? {
          dsn: process.env.SENTRY_DSN,
          environment: process.env.SENTRY_ENVIRONMENT || 'production',
        }
      : undefined,
    smtp: process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          user: getRequiredEnv('SMTP_USER'),
          pass: getRequiredEnv('SMTP_PASS'),
        }
      : undefined,
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export const config = loadConfig();
```

### **Environment Validation**

```typescript
// src/lib/env-validation.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  BASE_PATH: z.string().min(1),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']),
  CORS_ORIGIN: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  SMTP_USER: z.string().email().optional(),
  SMTP_PASS: z.string().min(1).optional(),
});

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Environment validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
}
```

## Secret Management Strategy

### **Platform Secrets Management**

```bash
# Set secrets via your platform's CLI or UI
# Example commands (adjust for your platform):
# platform secrets set JWT_SECRET="your_production_jwt_secret_32_chars_minimum"
# platform secrets set REFRESH_TOKEN_SECRET="your_refresh_token_secret"
# platform secrets set DATABASE_URL="postgresql://..."
# platform secrets set SMTP_USER="your_email@gmail.com"
# platform secrets set SMTP_PASS="your_app_password"
# platform secrets set SENTRY_DSN="https://your_sentry_dsn"
```

### **Development Secrets**

```bash
# .env.local (gitignored)
JWT_SECRET=dev_jwt_secret_32_chars_minimum_at_least
REFRESH_TOKEN_SECRET=dev_refresh_token_secret_minimum
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/ydm_dev
SMTP_USER=your_dev_email@gmail.com
SMTP_PASS=your_dev_app_password
```

### **Secret Rotation Strategy**

```typescript
// src/lib/secret-rotation.ts
export class SecretManager {
  static validateJWTSecret(secret: string): boolean {
    return secret.length >= 32 && /[A-Za-z0-9]/.test(secret);
  }

  static generateSecureSecret(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static checkSecretExpiry(secret: string, maxAge: number = 90): boolean {
    // Implement secret age checking if needed
    return true;
  }
}
```

## Frontend Environment Configuration

### **Vite Environment Variables**

```typescript
// vite.config.ts - Enhanced validation
export default defineConfig(({ mode }) => {
  // Load environment variables
  const rawPort = process.env.PORT;
  if (!rawPort) {
    throw new Error('PORT environment variable is required but was not provided.');
  }
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH;
  if (!basePath) {
    throw new Error('BASE_PATH environment variable is required but was not provided.');
  }

  // Validate environment-specific requirements
  if (mode === 'production') {
    const requiredProdVars = ['VITE_SENTRY_DSN', 'VITE_API_URL'];
    const missing = requiredProdVars.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(`Missing required production variables: ${missing.join(', ')}`);
    }
  }

  return {
    base: basePath,
    // ... rest of config
  };
});
```

### **Frontend Config Access**

```typescript
// src/lib/frontend-config.ts
export const frontendConfig = {
  apiBaseUrl: import.meta.env.VITE_API_URL || '/api',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  analyticsEnabled: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
  debugMode: import.meta.env.DEV,
};

export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

export function isProduction(): boolean {
  return import.meta.env.PROD;
}
```

## Database Environment Setup

### **Database Configuration by Environment**

```typescript
// lib/db/src/config.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Environment-specific database configuration
const clientOptions = {
  max: process.env.NODE_ENV === 'production' ? 10 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
};

if (process.env.NODE_ENV === 'production') {
  clientOptions.ssl = 'require';
}

const client = postgres(connectionString, clientOptions);
export const db = drizzle(client);
```

## CI/CD Environment Configuration

### **GitHub Actions Environment Setup**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm run typecheck

      - name: Build
        run: pnpm run build
        env:
          NODE_ENV: production
          BASE_PATH: /
          PORT: 23379
          # Production secrets from GitHub environment
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
```

## Environment Loading Strategy

### **Environment Loading Order**

```typescript
// src/lib/env-loader.ts
import dotenv from 'dotenv';

export function loadEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Load base environment
  dotenv.config();

  // Load environment-specific overrides
  const envFile = `.env.${nodeEnv}`;
  dotenv.config({ path: envFile });

  // Load local overrides (gitignored)
  dotenv.config({ path: '.env.local' });

  console.log(`📦 Loaded environment: ${nodeEnv}`);
  console.log(`📄 Environment files: .env, ${envFile}, .env.local`);
}
```

## Security Best Practices

### **Secret Security**

- Never commit secrets to version control
- Use environment-specific secret management
- Rotate secrets regularly
- Use strong, randomly generated secrets
- Implement secret validation at startup

### **Environment Security**

- Validate all required environment variables
- Use type-safe environment configuration
- Implement graceful degradation for optional services
- Log environment configuration without secrets

### **Development vs Production**

- Use different secrets for each environment
- Implement feature flags for environment-specific features
- Use development databases and services in non-production
- Validate production environment strictly

## Troubleshooting

### **Common Environment Issues**

```typescript
// Environment debugging utilities
export function debugEnvironment(): void {
  console.log('🔧 Environment Debug Info:');
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`PORT: ${process.env.PORT}`);
  console.log(`BASE_PATH: ${process.env.BASE_PATH}`);
  console.log(`Database URL configured: ${!!process.env.DATABASE_URL}`);
  console.log(`JWT Secret configured: ${!!process.env.JWT_SECRET}`);
  console.log(`Sentry configured: ${!!process.env.SENTRY_DSN}`);
}

export function checkRequiredVariables(): string[] {
  const required = ['PORT', 'BASE_PATH', 'DATABASE_URL', 'JWT_SECRET'];
  return required.filter((name) => !process.env[name]);
}
```

This environment configuration ensures secure, type-safe, and maintainable deployment across all environments while following security best practices.
