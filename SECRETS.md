# Secrets Management

This document describes the secret management strategy for the Suite productivity suite. Secrets are never committed to the repository and must be configured via Cloudflare Workers secrets and GitHub Actions secrets.

## Security Principles

- **Never commit secrets to the repository** - All secrets are managed externally
- **Use wrangler secret command for production secrets** - Secrets are encrypted at rest in Cloudflare
- **Use GitHub Actions secrets for CI/CD** - CI/CD workflows use encrypted secrets
- **Generate cryptographically secure random values** - Use proper entropy for all secrets
- **Rotate secrets regularly** - Implement secret rotation for production environments

## Required Secrets

### Common Secrets (All APIs)

#### DATABASE_URL
- **Purpose**: PostgreSQL connection string for database access
- **Format**: `postgresql://user:password@host:port/database`
- **Required by**: calendar-api, tasks-api, drive-api
- **Set via**: `wrangler secret put DATABASE_URL`
- **CI/CD**: GitHub Actions secret `DATABASE_URL`

#### BETTER_AUTH_SECRET
- **Purpose**: Secret key for Better Auth session token signing
- **Format**: Cryptographically secure random string (minimum 32 characters)
- **Required by**: calendar-api, tasks-api, drive-api
- **Generate**: `openssl rand -base64 32`
- **Set via**: `wrangler secret put BETTER_AUTH_SECRET`
- **CI/CD**: Set per-API via `wrangler secret put` (not in GitHub Actions)

#### ENCRYPTION_KEY
- **Purpose**: AES-256-GCM encryption key for E2EE user content encryption
- **Format**: Base64-encoded 256-bit key (32 bytes)
- **Required by**: calendar-api, tasks-api, drive-api
- **Generate**: `openssl rand -base64 32`
- **Set via**: `wrangler secret put ENCRYPTION_KEY`
- **CI/CD**: Set per-API via `wrangler secret put` (not in GitHub Actions)

### Drive API Specific Secrets

#### R2_BUCKET
- **Purpose**: R2 bucket name for file storage
- **Format**: Bucket name string
- **Required by**: drive-api
- **Set via**: `wrangler secret put R2_BUCKET`
- **CI/CD**: Set via `wrangler secret put` (not in GitHub Actions)

#### R2_ACCESS_KEY_ID
- **Purpose**: R2 access key ID for authentication
- **Format**: Access key ID string
- **Required by**: drive-api
- **Set via**: `wrangler secret put R2_ACCESS_KEY_ID`
- **CI/CD**: Set via `wrangler secret put` (not in GitHub Actions)

#### R2_SECRET_ACCESS_KEY
- **Purpose**: R2 secret access key for authentication
- **Format**: Secret access key string
- **Required by**: drive-api
- **Set via**: `wrangler secret put R2_SECRET_ACCESS_KEY`
- **CI/CD**: Set via `wrangler secret put` (not in GitHub Actions)

#### R2_ACCOUNT_ID
- **Purpose**: Cloudflare account ID for R2 access
- **Format**: Account ID string
- **Required by**: drive-api
- **Set via**: `wrangler secret put R2_ACCOUNT_ID`
- **CI/CD**: Set via `wrangler secret put` (not in GitHub Actions)

## Secret Setup Workflow

### 1. Generate Secrets

Generate all required secrets using cryptographically secure methods:

```bash
# Generate Better Auth secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32
```

### 2. Set Secrets for Calendar API

```bash
cd apps/calendar/api

# Set database URL
wrangler secret put DATABASE_URL

# Set Better Auth secret
wrangler secret put BETTER_AUTH_SECRET

# Set encryption key
wrangler secret put ENCRYPTION_KEY
```

### 3. Set Secrets for Tasks API

```bash
cd apps/tasks/api

# Set database URL
wrangler secret put DATABASE_URL

# Set Better Auth secret
wrangler secret put BETTER_AUTH_SECRET

# Set encryption key
wrangler secret put ENCRYPTION_KEY
```

### 4. Set Secrets for Drive API

```bash
cd apps/drive/api

# Set database URL
wrangler secret put DATABASE_URL

# Set Better Auth secret
wrangler secret put BETTER_AUTH_SECRET

# Set encryption key
wrangler secret put ENCRYPTION_KEY

# Set R2 secrets
wrangler secret put R2_BUCKET
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_ACCOUNT_ID
```

### 5. Configure GitHub Actions Secrets

Navigate to your GitHub repository settings and add the following secrets:

- `CLOUDFLARE_API_TOKEN` - Cloudflare API token for deployment
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
- `DATABASE_URL` - PostgreSQL connection string for migrations

**Note**: API-specific secrets (BETTER_AUTH_SECRET, ENCRYPTION_KEY, R2_*) are set via wrangler and are not stored in GitHub Actions.

## Verifying Secrets

After setting secrets, verify they are configured correctly:

```bash
# List secrets for an API (shows secret names only, not values)
cd apps/calendar/api
wrangler secret list --remote

# Repeat for other APIs
cd apps/tasks/api
wrangler secret list --remote

cd apps/drive/api
wrangler secret list --remote
```

## Local Development

For local development, use environment variables in a `.env` file (never commit `.env`):

```env
DATABASE_URL=postgresql://localhost:5432/suite
BETTER_AUTH_SECRET=your-dev-secret
BETTER_AUTH_URL=http://localhost:8787
ENCRYPTION_KEY=your-dev-encryption-key
```

For Drive API local development:

```env
R2_BUCKET=dev-bucket
R2_ACCESS_KEY_ID=dev-access-key
R2_SECRET_ACCESS_KEY=dev-secret-key
R2_ACCOUNT_ID=dev-account-id
```

## Secret Rotation

To rotate secrets in production:

1. Generate new secret values
2. Update secrets via `wrangler secret put <SECRET_NAME>`
3. Redeploy the affected API
4. Verify the application works with new secrets
5. If applicable, update any dependent systems

## Security Best Practices

- **Use unique secrets per environment** - Development, staging, and production should have different secrets
- **Never share secrets via unencrypted channels** - Use secure communication methods
- **Limit secret access** - Only authorized personnel should have access to production secrets
- **Audit secret access** - Use Cloudflare's audit logs to track secret access
- **Use secret management services** - For larger deployments, consider using Cloudflare's Secrets Manager or a dedicated secret management service
- **Implement secret rotation** - Regularly rotate secrets to minimize exposure windows
- **Monitor for secret leaks** - Use tools to detect accidentally committed secrets

## Troubleshooting

### Secret Not Found Error

If you get a "secret not found" error:

1. Verify the secret is set: `wrangler secret list --remote`
2. Ensure you're in the correct API directory
3. Set the secret again: `wrangler secret put <SECRET_NAME>`

### CI/CD Deployment Fails

If deployment fails due to missing secrets:

1. Verify GitHub Actions secrets are configured in repository settings
2. Check the deployment workflow logs for specific secret errors
3. Ensure `CLOUDFLARE_API_TOKEN` has proper permissions

### Encryption Disabled in Production

If encryption is not active in production:

1. Verify `ENCRYPTION_KEY` is set: `wrangler secret list --remote`
2. Check the bootstrap logic in the API
3. Ensure the key is a valid base64-encoded 256-bit key

## References

- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare R2 Authentication](https://developers.cloudflare.com/r2/api/s3/tokens/)
- [Better Auth Configuration](https://www.better-auth.com/docs)
- [AGENTS.md](./AGENTS.md) - Repository rules and guidelines
