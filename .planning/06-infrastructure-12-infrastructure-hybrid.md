---

## 13. Infrastructure — Hybrid Cloudflare + VPS

The infrastructure of the Sovereign Suite is a deliberate hybrid. The majority of user‑facing compute—static asset serving, API execution, file storage, real‑time coordination—runs on Cloudflare’s global edge network, leveraging the generous free tier to keep costs at zero. The persistent state—PostgreSQL databases, long‑term file archives, and optional fallback API servers—runs on your Contabo VPS, which you already own and control. This section provides the complete infrastructure blueprint: provisioning steps, network configuration, security groups, deployment workflows, and the exact commands to replicate the setup.

---

### 13.1 The Hybrid Architecture at a Glance

| Layer | Cloudflare (Edge) | Contabo VPS (Core) |
|-------|-------------------|---------------------|
| **Static assets** | Pages (53 SPAs) | – |
| **API compute** | Workers (Hono) | Fallback Node.js (optional) |
| **File storage** | R2 (encrypted blobs) | – |
| **Real‑time** | Durable Objects | – |
| **Database** | Hyperdrive (connection pool) | PostgreSQL 17 (Docker) |
| **Backups** | R2 (WAL archive) | Local disk (ephemeral) |
| **DNS** | Cloudflare DNS | – |
| **Secrets** | Workers Secrets (via Wrangler) | Environment files (via Doppler) |

This separation ensures that the most expensive part of the stack—persistent storage—remains under your direct control, while the elastically scaling parts of the system run on a platform designed for global distribution at near‑zero cost.

---

### 13.2 Contabo VPS: Provisioning and Hardening

The Sovereign Suite assumes a Contabo VPS with the following base specification. Any provider with equivalent resources can be used; the configuration steps are provider‑agnostic.

**Minimum recommended specification:**
- **CPU:** 4 vCPU (Intel Xeon or AMD EPYC)
- **RAM:** 8 GB
- **Storage:** 200 GB SSD (NVMe preferred)
- **Network:** 200 Mbit/s dedicated
- **OS:** Ubuntu 24.04 LTS

#### 13.2.1 Initial Provisioning Steps

```bash
# 1. Update system and install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose ufw fail2ban postgresql-client

# 2. Enable Docker for current user
sudo usermod -aG docker $USER
newgrp docker

# 3. Configure firewall (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp          # SSH
sudo ufw allow 80/tcp          # HTTP (redirect to 443)
sudo ufw allow 443/tcp         # HTTPS (Cloudflare Tunnel)
sudo ufw allow 5432/tcp        # PostgreSQL (restrict to Cloudflare IPs later)
sudo ufw enable

# 4. Harden SSH
sudo sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# 5. Install Cloudflared (for Tunnel)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

**Security group rules** for the VPS should limit inbound PostgreSQL access to Cloudflare’s IPv4 and IPv6 ranges. Cloudflare publishes its IP ranges at `https://www.cloudflare.com/ips-v4` and `https://www.cloudflare.com/ips-v6`. A script can update UFW rules daily via cron.

---

### 13.3 PostgreSQL on Docker: Production Configuration

PostgreSQL runs as a Docker container with persistent volume mount. The configuration is optimised for a single VPS with 8 GB RAM and moderate write load.

**`/opt/suite/docker-compose.yml`:**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:17-alpine
    container_name: suite-postgres
    environment:
      POSTGRES_DB: suite
      POSTGRES_USER: suite
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf:ro
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "127.0.0.1:5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U suite -d suite"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: postgres -c config_file=/etc/postgresql/postgresql.conf

  pgbackup:
    image: ghcr.io/wal-g/wal-g:latest
    environment:
      WALG_S3_PREFIX: s3://your-r2-bucket/wal-archive
      AWS_ENDPOINT: https://<account_id>.r2.cloudflarestorage.com
      AWS_REGION: auto
      AWS_ACCESS_KEY_ID: ${R2_ACCESS_KEY}
      AWS_SECRET_ACCESS_KEY: ${R2_SECRET_KEY}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: wal-g wal-push /var/lib/postgresql/data/pgdata

volumes:
  postgres_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

**Performance tuning (`postgresql.conf` for 8 GB VPS):**

```ini
shared_buffers = '2GB'
effective_cache_size = '6GB'
maintenance_work_mem = '512MB'
work_mem = '16MB'
max_connections = 200
wal_level = 'replica'
archive_mode = 'on'
archive_command = 'test ! -f /var/lib/postgresql/data/pgdata/wal-archive/%f && wal-g wal-push %p'
max_wal_senders = 3
synchronous_commit = 'off'  # Acceptable for non‑critical workloads
```

**`init.sql` (run on first start) — creates schemas and RLS policies:**

```sql
CREATE SCHEMA IF NOT EXISTS calendar;
CREATE SCHEMA IF NOT EXISTS drive;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS mail;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS drizzle;  -- migration tracking tables

-- Enable row level security on tenant tables (example)
ALTER TABLE calendar.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar.events FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON calendar.events
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

---

### 13.4 Cloudflare Tunnel: Secure Ingress without Public IP

Cloudflare Tunnel establishes an outbound‑only connection from your VPS to Cloudflare’s edge, eliminating the need to open inbound ports on your VPS. This is the most secure way to expose HTTP services (including the optional fallback API) to the internet.

**Create and run the tunnel:**

```bash
cloudflared tunnel create suite-vps
cloudflared tunnel route dns suite-vps api.yourdomain.com
cloudflared tunnel run suite-vps --config ~/.cloudflared/config.yml
```

For production, run `cloudflared` as a systemd service. The tunnel also supports **private network routing**, allowing Workers to communicate with the VPS over a Cloudflare Virtual Private Network without crossing the public internet.

**Private network configuration:** When the VPS is connected via `cloudflared`, it receives an IPv6 address in the `fd80::/64` range. Workers can connect to this private address using the `cloudflared`‑provided `CF‑Tunnel‑ID` header for authentication, removing the need for public IP access entirely.

---

### 13.5 Hyperdrive: Database Connection Pooling from Workers

Hyperdrive is a service that creates a connection pool to your PostgreSQL database, located as close as possible to your Worker’s execution environment. Without Hyperdrive, each Worker request would establish a new database connection, quickly exhausting PostgreSQL’s `max_connections`.

**Create Hyperdrive configuration:**

```bash
npx wrangler hyperdrive create suite-db --connection-string="postgresql://suite:password@<vps-ip>:5432/suite"
```

In your Worker’s `wrangler.jsonc`, add the binding:

```json
{
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "<your-hyperdrive-id>"
    }
  ]
}
```

**Use Hyperdrive in Hono:**

```typescript
import { createDbClient } from '@suite/db';

const app = new Hono<{ Bindings: { HYPERDRIVE: Hyperdrive } }>();

app.get('/api/events', async (c) => {
  const db = createDbClient(c.env.HYPERDRIVE.connectionString);
  const events = await db.query.events.findMany();
  return c.json(events);
});
```

Hyperdrive also maintains a query cache at the edge, reducing latency for repeated queries by storing results for up to 60 seconds by default.

---

### 13.6 R2: Zero‑Egress Object Storage

Cloudflare R2 is S3‑compatible object storage with zero egress fees. The Sovereign Suite uses R2 for two purposes:

1. **User file storage** (Drive, PhotoVault). Files are encrypted client‑side before upload; R2 stores only ciphertext.
2. **WAL archives** from PostgreSQL (`wal-g` pushes to R2). Zero egress fees are particularly beneficial for this use case—restoring from backups costs nothing.

**Create R2 buckets:**

```bash
npx wrangler r2 bucket create suite-drive
npx wrangler r2 bucket create suite-wal-archive
```

**R2 configuration for file uploads (from Worker):**

```typescript
const object = await c.env.R2_BUCKET.put(
  `users/${tenantId}/${fileId}.enc`,
  encryptedBlob,
  { httpMetadata: { contentType: 'application/octet-stream' } }
);
```

**R2 lifecycle rules** (configured via dashboard or API) automatically delete objects older than 30 days from the WAL archive bucket, preventing unbounded storage growth.

---

### 13.7 Fallback API: When Workers Reach Limits

Cloudflare Workers Free tier includes 100k requests/day. While the Sovereign Suite expects to stay within this limit during the initial launch, exceeding it would cause API failures. The fallback API—a Node.js server running on your VPS—serves as a backup.

**Dockerfile for fallback API (`infra/docker/fallback-api.Dockerfile`):**

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY apps/calendar/api/package.json .
RUN npm install --omit=dev
COPY apps/calendar/api/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Run fallback API on VPS:**

```bash
docker run -d \
  --name fallback-api \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://suite:password@host.docker.internal:5432/suite \
  suite-fallback-api
```

**Traffic routing strategy:** Use Cloudflare Load Balancing with two origins:
- Priority 1: Worker (`https://calendar.yourdomain.com`)
- Priority 2: Fallback API (`https://fallback.yourdomain.com`)

If the Worker returns a 5xx error or exceeds a configurable timeout, Cloudflare routes the request to the fallback API. This provides **automatic failover** when Worker free tier limits are approached.

---

### 13.8 Secrets Management with Doppler

Doppler is the secrets management platform integrated into the Sovereign Suite’s CI/CD pipeline. Secrets are stored centrally, injected into Workers and VPS services via environment variables, and never committed to the repository.

**Set up Doppler project:**

```bash
doppler setup --project suite
doppler secrets set DATABASE_URL="postgresql://suite:password@vps-ip:5432/suite"
doppler secrets set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
```

**Inject secrets into Wrangler deployment (CI):**

```yaml
- name: Deploy Calendar Worker
  run: |
    doppler run --command="npx wrangler deploy apps/calendar/api/src/index.ts"
```

**On the VPS, use Doppler to write secrets to Docker Compose environment files:**

```bash
doppler secrets download --format env > /opt/suite/.env
docker-compose --env-file /opt/suite/.env up -d
```

---

### 13.9 Free Tier Limits and Overhead

The Sovereign Suite operates entirely within Cloudflare’s free tier during the initial launch. The following table lists the relevant limits and the monitoring strategy for each.

| Service | Free Tier Limit | Monitoring | Overage Action |
|---------|----------------|------------|----------------|
| **Workers** | 100k requests/day | GraphQL metric `httpRequests.daily` | Route traffic to fallback API; alert at 80% |
| **Pages** | 500 builds/month | GitHub Actions runs | Optimise build caching; manual approval for excessive builds |
| **R2** | 10 GB storage, 1M Class A ops | Dashboard storage metric | Alert at 8 GB; implement lifecycle rules |
| **Durable Objects** | 1M requests/month, 400k GB‑seconds | GraphQL metric `durableObjects.totalRequests` | Hibernation reduces duration; alert at 80% |
| **Hyperdrive** | 1 free database | Dashboard | Scale to paid plan only when exceeding 100k active connections/day |

**Free tier quota monitoring in Workers:**

```typescript
// apps/monitoring/src/usage.ts
export async function checkWorkerQuota(env: Env) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  const query = `{
    viewer {
      accounts(filter: {accountTag: "${accountId}"}) {
        workersInvocationsDaily(limit: 1) {
          sum { invocations }
        }
      }
    }
  }`;
  const response = await fetch(`https://api.cloudflare.com/client/v4/graphql`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const { data } = await response.json();
  const usage = data.viewer.accounts[0].workersInvocationsDaily.sum.invocations;
  if (usage > 80_000) {
    console.warn(`Worker usage ${usage} approaching free tier limit of 100k`);
  }
}
```

---

### 13.10 Deployment Workflow (Production)

The deployment pipeline is triggered by pushes to the `main` branch. The workflow is:

1. **Build:** `pnpm nx affected --target=build` (only projects changed in the commit)
2. **Migrate:** For each changed domain, run `drizzle-kit generate` → commit migration files → run `APP_DOMAIN=<domain> tsx packages/db/scripts/migrate.ts` in CI (see Section 8)
3. **Deploy Worker:** `npx wrangler deploy` for each changed API
4. **Deploy Pages:** `npx wrangler pages deploy apps/<app>/web/dist` for each changed frontend
5. **Update VPS:** If the fallback API changed, rebuild Docker image and restart container

This workflow is fully automated by GitHub Actions. No manual SSH into production is required.

---

### 13.11 Monitoring and Observability

The Sovereign Suite uses three tiers of monitoring:

| Tier | Tool | Metrics |
|------|------|---------|
| **Cloudflare** | GraphQL API, Dashboard | Worker invocations, R2 operations, DO requests |
| **VPS** | Prometheus + Node Exporter | CPU, memory, disk, network, PostgreSQL |
| **Application** | OpenTelemetry (via Hono middleware) | Request latency, error rates, database query times |

**OpenTelemetry setup in Hono:**

```typescript
import { trace } from '@opentelemetry/api';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HonoInstrumentation } from '@opentelemetry/instrumentation-hono';

registerInstrumentations({
  instrumentations: [new HonoInstrumentation()],
});

const tracer = trace.getTracer('suite-api');
app.use('*', async (c, next) => {
  const span = tracer.startSpan(`${c.req.method} ${c.req.path}`);
  await next();
  span.end();
});
```

Trace data is exported to **Jaeger** (running on the VPS) for distributed tracing across Workers and the database.

---

### 13.12 Disaster Recovery for Infrastructure

Disaster recovery is not limited to database restoration. The entire infrastructure can be re‑created from scratch using infrastructure‑as‑code.

**The Sovereign Suite uses:**
- **Terraform** for Cloudflare resources (Pages projects, Workers, R2 buckets, Durable Object namespaces, DNS records)
- **Ansible** for VPS provisioning (Docker, PostgreSQL, cloudflared, firewall)
- **GitHub Actions** for continuous deployment (restoring from backup is a manual approval step)

**Terraform configuration for Cloudflare (excerpt):**

```hcl
resource "cloudflare_workers_script" "calendar_api" {
  name    = "calendar-api"
  content = file("dist/calendar-api/index.js")
  module  = true
}

resource "cloudflare_r2_bucket" "suite_drive" {
  name = "suite-drive"
  location = "auto"
}
```

The entire infrastructure can be recreated by running `terraform apply` and restoring the latest PostgreSQL backup from R2.

---

### 13.13 Cost Analysis (Monthly, Free Tier)

| Service | Cost | Notes |
|---------|------|-------|
| Cloudflare Workers | $0 | 100k requests/day |
| Cloudflare Pages | $0 | unlimited bandwidth |
| Cloudflare R2 | $0 | 10 GB storage, 1M Class A ops |
| Cloudflare Durable Objects | $0 | 1M requests/month |
| Cloudflare Hyperdrive | $0 | 1 database |
| Contabo VPS | $7.99–$12.99 | Already purchased |
| **Total monthly cost (launch)** | **$0** | Excluding VPS (existing) |

When the free tier limits are exceeded, the Workers Paid plan costs $5/month + $0.30 per million additional requests. R2 storage beyond 10 GB costs $0.015/GB/month. These costs are covered by the earliest paying users.

---

### 13.14 AI Agent Rules for Infrastructure

Add the following to `AGENTS.md`:

```markdown
## Infrastructure Rules (AI Agents Must Follow)

1. **Never expose database to public internet.** Use Cloudflare Tunnel or Tailscale for access.
2. **Secrets go in Doppler, never in code.** Inject them at runtime via `doppler run`.
3. **Use Hyperdrive for database connections from Workers.** Never connect directly.
4. **R2 is for object storage, not for database backups alone.** WAL‑G pushes to R2; database dumps are ephemeral.
5. **Fallback API is optional until free tier exceeded.** Test it manually, but do not deploy until needed.
6. **Monitor free tier quotas weekly.** Use the GraphQL script in this section.
7. **Infrastructure as code is mandatory.** Cloudflare resources defined in Terraform.
8. **Do not manually edit production Workers or Pages.** Always use CI/CD.
9. **Backup WAL archives daily.** Retention policy: 30 days.
10. **Test DR annually.** Restore from backup to a staging environment.
```

---

### 13.15 Summary: Why Hybrid Wins for the Sovereign Suite

| Concern | Solution | Benefit |
|---------|----------|---------|
| **Cost** | Cloudflare free tier + your VPS | $0 monthly cost at launch |
| **Latency** | Workers on 300+ edge locations | Global API response < 50 ms |
| **Data sovereignty** | Database on your VPS | You control access, logs, encryption |
| **Scaling** | Workers auto‑scale; VPS remains fixed | No sudden cloud bills |
| **Resilience** | Workers retry on failure; fallback API | 99.95% uptime for free |
| **Security** | Cloudflare Tunnel, Hyperdrive, R2 encryption | No public IP for database; encrypted at rest |
| **Portability** | Same Hono code runs on Workers or Node | Zero‑vendor lock‑in |

The hybrid infrastructure delivers global performance, full data control, and negligible operating costs. It is the foundation upon which the Sovereign Suite competes with Google Workspace and Microsoft 365, without the surveillance, without the lock‑in, and without the monthly cloud bill.

---

**[End of Section 13 — Next: Section 14: Push Notifications]**