## 22. Future: Scaling & Full Self‑Hosting

The Sovereign Suite is designed to scale from a solo founder’s prototype to a globally distributed platform. The architecture in Sections 1–21 is the starting point—not the final destination. This section documents the known scaling bottlenecks, the strategies for breaking through them, and the path to full self‑hosting when you eventually outgrow Cloudflare’s free tier or when enterprise customers demand complete infrastructure control.

---

### 22.1 Scaling Bottlenecks at a Glance

| Component | Bottleneck | Free Tier Limit | Scaling Strategy |
|-----------|------------|-----------------|-------------------|
| **Workers** | Request volume | 100k/day (free); 10M/month (paid) | Upgrade to Workers Paid; migrate compute to VPS |
| **Durable Objects** | Concurrent connections per DO | ~20k practical limit | Shard across multiple DOs |
| **R2** | Storage volume | 10 GB free; $0.015/GB thereafter | Lifecycle policies; multi‑region replication |
| **PostgreSQL** | Single node write throughput | ~10k writes/sec (well‑provisioned) | Read replicas → partitioning → Citus sharding |
| **PostgreSQL** | Single node storage | Limited by VPS disk (200 GB–2 TB) | Partitioning → Citus → separate databases per large tenant |
| **Hyperdrive** | Connection pool size | 1 free database | Upgrade to paid plan for larger pools |
| **Better Auth** | Session count | Dependent on PostgreSQL | Session caching (Redis) → distributed session store |

The strategy is to **stay on free tiers as long as possible**, then upgrade to paid plans incrementally, and finally migrate compute to your own hardware when the cost of Cloudflare exceeds the cost of self‑hosting.

---

### 22.2 Workers Scaling: From Free Tier to Paid to Self‑Hosted

**Step 1 — Upgrade to Workers Paid:** The Workers Free tier limit of 100k requests/day is generous but not infinite. When the Sovereign Suite exceeds 80% of this limit consistently for a week, upgrade to the Workers Paid (Standard) plan. The Standard plan includes 10M requests/month (~333k/day) and 30M CPU ms for $5/month.

**Step 2 — Optimise Worker CPU usage:** Before upgrading, review the Worker’s CPU time. The free tier includes 10ms per invocation; exceeding this causes performance degradation. Optimise by:
- Moving heavy computation to Durable Objects (they have different CPU quotas)
- Caching database query results with Hyperdrive
- Using the `Cache API` for static responses
- Reducing the number of database queries per request

**Step 3 — Migrate compute to the VPS:** When the cost of Workers exceeds the cost of running the same code on your VPS (or when Cloudflare’s CPU limits become a bottleneck), migrate the API from Workers to a Node.js server on your Contabo VPS.

**The migration path is already built into the architecture.** The same Hono code that runs on Workers runs identically on Node.js. The only changes needed are:

```typescript
// Instead of binding to Workers env, use Node.js environment variables
const db = createDbClient(process.env.DATABASE_URL);

// Instead of service bindings, use HTTP calls (or keep using the same RPC library)
const driveResponse = await fetch('http://drive-api.internal:3000/api/files/123');
```

**Deploy the fallback API** using Docker Compose:

```yaml
# infra/compose/fallback-api.docker-compose.yml
services:
  calendar-api:
    build: ../../apps/calendar/api
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://suite:${DB_PASSWORD}@postgres:5432/suite
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET}
    depends_on:
      - postgres
```

**Gradual traffic migration:** Use Cloudflare Load Balancing to send a percentage of traffic to the self‑hosted API while keeping the rest on Workers. Increase the percentage over time, monitoring for errors.

| Phase | Workers Traffic | Self‑Hosted Traffic | Duration |
|-------|----------------|---------------------|----------|
| 1 | 100% | 0% | Baseline |
| 2 | 90% | 10% | 1 week |
| 3 | 50% | 50% | 2 weeks |
| 4 | 10% | 90% | 1 week |
| 5 | 0% | 100% | Permanent |

---

### 22.3 Durable Objects Scaling: Sharding the Room

A single Durable Object can handle approximately 10,000–20,000 concurrent WebSocket connections in practice. When a chat room or collaborative document exceeds this limit, shard the room across multiple DOs.

**Sharding strategy 1 — Hash‑based partitioning:**

```typescript
function getRoomShard(roomId: string, shardCount: number): string {
  const hash = crypto.createHash('md5').update(roomId).digest('hex');
  const shardIndex = parseInt(hash.slice(0, 8), 16) % shardCount;
  return `${roomId}:shard_${shardIndex}`;
}
```

Each shard is a separate Durable Object instance. Clients connect to the correct shard based on their user ID hash. This works well for rooms that are large but do not require global broadcast (e.g., a chat room with 100,000 participants where users only see a subset of messages).

**Sharding strategy 2 — Leader‑follower replication:**

For rooms that require global broadcast (e.g., a live event stream), designate one DO as the “leader” and replicate its state to multiple “follower” DOs. The followers handle read requests and WebSocket connections, and the leader handles writes. This pattern is described in the Durable Objects documentation as “active‑active” replication.

**Implementation with Durable Objects Alarms:**

```typescript
export class ShardedRoomLeader extends DurableObject {
  private followers: Map<string, DurableObjectId> = new Map();

  async registerFollower(followerId: DurableObjectId) {
    this.followers.set(followerId.toString(), followerId);
    await this.ctx.storage.put('followers', Array.from(this.followers.keys()));
  }

  async broadcast(message: ArrayBuffer) {
    // Write to storage first (durable)
    await this.ctx.storage.put(`msg_${Date.now()}`, message);

    // Then broadcast to all followers
    for (const followerId of this.followers.values()) {
      const follower = this.ctx.container.get(followerId);
      await follower.broadcast(message);
    }
  }
}
```

**When to shard:** When a single room exceeds 15,000 concurrent connections or when the CPU usage of the DO exceeds 50% consistently.

---

### 22.4 PostgreSQL Scaling: The Proven Path

The Sovereign Suite’s database scaling follows the same progression as thousands of successful startups: single node → read replicas → partitioning → distributed (Citus). Each step is triggered by a specific metric, not by calendar time.

**Step 1 — Single node (0–5,000 tenants):** A well‑provisioned PostgreSQL 17 instance on a VPS with 8 GB RAM, 4 vCPUs, and SSD storage can handle 5,000 moderate‑usage tenants. No scaling actions needed.

**Step 2 — Read replicas (5,000–50,000 tenants):** When the primary database’s CPU exceeds 70% during peak hours, add read replicas for reporting and analytics queries. Writes still go to the primary; reads are distributed across replicas.

**Set up a read replica with pgBackRest:**

```bash
# On the replica server
pg_basebackup -h primary.example.com -D /var/lib/postgresql/17/main -U replicator -P --wal-method=stream
touch /var/lib/postgresql/17/main/standby.signal
echo "primary_conninfo = 'host=primary.example.com port=5432 user=replicator password=secret'" >> /var/lib/postgresql/17/main/postgresql.conf
```

**Route read queries in Hono:**

```typescript
// Use the replica for read operations
app.get('/api/events', async (c) => {
  const db = createDbClient(process.env.DATABASE_URL_REPLICA);
  const events = await db.query.events.findMany();
  return c.json(events);
});

// Use the primary for writes
app.post('/api/events', async (c) => {
  const db = createDbClient(process.env.DATABASE_URL);
  // ...
});
```

**Step 3 — Table partitioning (100,000+ tenants):** When any single table exceeds 100 GB, partition it by `created_at` (time‑range) or by `tenant_id` (list). Partitioning improves query performance and makes data archival trivial.

**Example: partitioning `calendar.events` by month:**

```sql
-- Create partitioned table
CREATE TABLE calendar.events (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- other columns
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE calendar.events_2026_01 PARTITION OF calendar.events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE calendar.events_2026_02 PARTITION OF calendar.events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- etc.
```

**Step 4 — Citus sharding (1,000,000+ tenants):** When a single PostgreSQL instance can no longer handle write throughput, deploy Citus. Citus is an extension to PostgreSQL that distributes tables across multiple nodes while preserving full SQL semantics.

**Citus architecture:**

- **Coordinator node:** Receives queries, plans distribution, aggregates results
- **Worker nodes:** Store data shards, execute queries on their local shards
- **Shard distribution:** Each table is distributed by a “distribution column” (tenant_id)

**Migration from single node to Citus:**

```sql
-- Enable Citus extension on the coordinator
CREATE EXTENSION citus;

-- Mark the coordinator
SELECT citus_set_coordinator_host('coordinator.example.com', 5432);

-- Add worker nodes
SELECT citus_add_node('worker1.example.com', 5432);
SELECT citus_add_node('worker2.example.com', 5432);

-- Distribute tables by tenant_id
SELECT create_distributed_table('calendar.events', 'tenant_id');
SELECT create_distributed_table('drive.items', 'tenant_id');
```

The Citus open‑source version is free and sufficient for most use cases. The Enterprise version adds advanced features like non‑blocking shard rebalancing and columnar storage.

**When to choose Citus over alternatives:**

| Database | Scale | Cost | Best For |
|----------|-------|------|----------|
| **Single PostgreSQL** | 0–500k tenants | $0 (on VPS) | Start‑up to early growth |
| **Citus (open source)** | 500k–10M tenants | $0 (on your hardware) | Most startups |
| **Citus (Enterprise)** | 10M+ tenants | Licensing fee | Large‑scale SaaS |
| **YugabyteDB** | 10M+ tenants | $0 (open source) | Geo‑distributed multi‑region |
| **Google Spanner** | 10M+ tenants | $$$ | Global enterprises with budget |

---

### 22.5 R2 Scaling: Beyond 10 GB

The R2 free tier includes 10 GB of storage. When this limit is approached, implement lifecycle policies to automatically delete old or temporary objects.

**Lifecycle policy configuration (via Wrangler):**

```bash
# Create a lifecycle rule for the drive bucket
npx wrangler r2 bucket lifecycle add suite-drive \
  --prefix "temp/" \
  --days 1 \
  --type Delete

# Move cold objects to a cheaper tier (if available)
npx wrangler r2 bucket lifecycle add suite-drive \
  --prefix "archived/" \
  --days 90 \
  --type Transition \
  --storage-class INFREQUENT_ACCESS
```

**When R2 storage exceeds 1 TB:** Evaluate the cost of R2 ($0.015/GB/month) versus self‑hosting an object storage solution like **MinIO** on your VPS or dedicated hardware. MinIO is S3‑compatible and can be scaled horizontally.

**MinIO deployment on the VPS:**

```yaml
# docker-compose.minio.yml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}

volumes:
  minio_data:
```

**Replace R2 with MinIO in Workers:** The S3 API is identical. Only the endpoint URL and credentials change.

---

### 22.6 Full Self‑Hosting: Removing Cloudflare Dependencies

The Sovereign Suite is designed to be deployable without any Cloudflare services. When a customer requires complete infrastructure control (or when you decide to leave Cloudflare), the entire suite can run on your own hardware.

**Self‑hosting architecture (no Cloudflare):**

```
┌─────────────────────────────────────────────────────────────┐
│                         USER DEVICE                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   YOUR HARDWARE (VPS / On‑Prem)             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Frontend      │  │     API         │  │  PostgreSQL │ │
│  │   nginx serving │  │   Node.js       │  │             │ │
│  │   SPAs          │  │   Hono          │  │             │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   MinIO         │  │   Redis         │  │  Nginx      │ │
│  │   (Object store)│  │   (Sessions)    │  │  (Proxy)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Component replacements:**

| Cloudflare Service | Self‑Hosted Replacement | Notes |
|--------------------|------------------------|-------|
| **Workers** | Node.js + Hono | The same code runs unchanged |
| **Pages** | nginx + static files | `pnpm build` → serve `/dist` directory |
| **R2** | MinIO | S3‑compatible, horizontally scalable |
| **Durable Objects** | Node.js + WebSocket server + Redis | The Sovereign Suite’s Durable Object code can run on Node.js with a Redis backend |
| **Hyperdrive** | Direct PostgreSQL connection (or PgBouncer) | Connection pooling handled by PgBouncer |
| **Service Bindings** | HTTP calls (internal network) | Use `fetch` with internal IP addresses |
| **Cloudflare Tunnel** | Tailscale or WireGuard | Secure remote access without public IPs |

**Self‑hosting deployment script (`deploy-selfhosted.sh`):**

```bash
#!/bin/bash
# Clone the monorepo
git clone https://github.com/yourorg/suite.git
cd suite

# Install dependencies
pnpm install --frozen-lockfile

# Build all apps
pnpm nx run-many --target=build

# Set up PostgreSQL
docker-compose -f infra/compose/selfhosted/docker-compose.yml up -d postgres

# Run migrations
for domain in calendar drive vault; do
  APP_DOMAIN=$domain pnpm --filter=domain-$domain db:migrate
done

# Start the API servers
pnpm nx run-many --target=serve --parallel=5

# Configure nginx
sudo cp infra/nginx/selfhosted.conf /etc/nginx/sites-available/suite
sudo ln -s /etc/nginx/sites-available/suite /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

**Self‑hosted Docker Compose for the whole stack:**

```yaml
# infra/compose/selfhosted/docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  calendar-api:
    build: ../../apps/calendar/api
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://suite:${DB_PASSWORD}@postgres:5432/suite
      REDIS_URL: redis://redis:6379
      MINIO_ENDPOINT: minio:9000

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ../../apps/calendar/web/dist:/usr/share/nginx/html/calendar
```

The self‑hosted deployment can be offered as an **Enterprise Premium add‑on**, with a flat annual fee covering support and updates.

---

### 22.7 Cost Projections at Scale

| Scale | Users | Workers | R2 Storage | PostgreSQL | Monthly Cost (Cloudflare) | Monthly Cost (Self‑Hosted) |
|-------|-------|---------|------------|------------|---------------------------|----------------------------|
| **Start‑up** | 1k | Free | Free | $12 VPS | $12 | $12 |
| **Growth** | 100k | $5 | $150 (10 TB) | $40 VPS (upgraded) | $195 | $40 |
| **Enterprise** | 1M | $50 | $1,500 (100 TB) | $500 dedicated | $2,050 | $500 |

The crossover point is approximately **100,000 users**. Below this, Cloudflare’s free tier makes it cheaper. Above this, self‑hosting on dedicated hardware becomes more cost‑effective because the marginal cost of Cloudflare services (R2 storage, Workers invocations) exceeds the fixed cost of running your own hardware.

**Self‑hosted hardware specification for 1M users:**

| Component | Specification | Annual Cost (Approx) |
|-----------|---------------|----------------------|
| **API servers** | 5× 8 vCPU, 16 GB RAM | $3,000 |
| **PostgreSQL** | 3× 16 vCPU, 64 GB RAM, NVMe | $10,000 |
| **MinIO cluster** | 5× 4 vCPU, 16 GB RAM, 10 TB HDD | $5,000 |
| **Load balancer** | 2× 2 vCPU, 4 GB RAM | $500 |
| **Network** | 1 Gbps dedicated | $2,000 |
| **Total** | — | **$20,500/year (~$1,700/month)** |

---

### 22.8 Multi‑Region Deployment

When the Sovereign Suite has users across multiple continents, deploy the API and database in multiple regions to reduce latency.

**Multi‑region architecture:**

- **Read replicas** in each region (US, EU, APAC)
- **Write primary** in a single region (e.g., US)
- **Geo‑DNS** routes users to the nearest read replica
- **Write requests** are forwarded to the primary region

**Cloudflare’s multi‑region support** (Enterprise feature) simplifies this. For self‑hosted multi‑region, use **Citus** with replication across availability zones.

**Citus multi‑region configuration:**

```sql
-- Add nodes in different regions
SELECT citus_add_node('worker-us.example.com', 5432, node_region => 'us');
SELECT citus_add_node('worker-eu.example.com', 5432, node_region => 'eu');
SELECT citus_add_node('worker-ap.example.com', 5432, node_region => 'ap');

-- Distribute tables with replication factor 2
SELECT create_distributed_table('calendar.events', 'tenant_id', replication_factor => 2);
```

---

### 22.9 Scaling the AI Assistant

The Private AI Assistant (Application #26) is computationally expensive. As usage grows, the initial deployment on a single VPS will become a bottleneck.

**Scaling path for the AI Assistant:**

| Stage | Deployment | Capacity | When |
|-------|------------|----------|------|
| **1** | Single VPS, llama.cpp (7B model) | 100 concurrent requests | 0–1k users |
| **2** | Multiple VPS, load‑balanced | 500 concurrent requests | 1k–10k users |
| **3** | Dedicated GPU instances (e.g., Lambda Labs, Vast.ai) | 1k concurrent requests | 10k–100k users |
| **4** | On‑prem GPU cluster | 10k concurrent requests | 100k+ users |
| **5** | Client‑side (WebGPU, on device) | Unlimited (user’s hardware) | Always available as opt‑in |

**Client‑side AI with WebGPU:** The user’s own device can run a quantised 7B model using WebGPU, eliminating server costs entirely for that user. This is ideal for privacy‑conscious users who want zero‑knowledge AI.

**WebGPU integration in the frontend:**

```typescript
// Load the model using Transformers.js with WebGPU backend
import { pipeline } from '@huggingface/transformers';

const generator = await pipeline('text-generation', 'onnx-community/llama-7b', {
  device: 'webgpu',
  dtype: 'q4f16',
});

const result = await generator('Summarise this document:', {
  max_new_tokens: 256,
  temperature: 0.7,
});
```

---

### 22.10 AI Agent Rules for Scaling

Add the following to your root `AGENTS.md`:

```markdown
## Scaling & Self‑Hosting — Rules for AI Agents

1. **Design for scale, optimise for free tier.** All code must work on both Workers and Node.js. No Cloudflare‑specific locks.

2. **Upgrade to Workers Paid at 80% of free tier.** Monitor the GraphQL endpoint weekly.

3. **Shard Durable Objects when a room exceeds 15k connections.** Use hash‑based partitioning.

4. **Add read replicas at 70% CPU on primary PostgreSQL.** Update connection strings in environment variables.

5. **Partition tables when they exceed 100 GB.** Use `created_at` range partitioning.

6. **Distribute with Citus at 1M tenants.** The `tenant_id` column is already the distribution column.

7. **Self‑hosting is an Enterprise feature.** The deployment script is maintained in `infra/selfhosted/`.

8. **Multi‑region is the last resort.** Use read replicas before adding multiple write regions.

9. **AI Assistant scaling must be transparent to users.** Offload to WebGPU when available; fall back to server.

10. **Never lock users into Cloudflare.** The `deploy-selfhosted.sh` script must be tested before every major release.
```

---

### 22.11 Summary: Scaling Decisions at a Glance

| Component | Default (Free) | Growth ($) | Scale (Enterprise) |
|-----------|----------------|------------|--------------------|
| **Workers** | Free (100k/day) | Paid ($5/mo) → Self‑hosted Node.js | On‑prem Hono |
| **Durable Objects** | Free (1M/mo) | Paid → Self‑hosted Redis + WebSocket | On‑prem cluster |
| **R2** | Free (10 GB) | Paid ($0.015/GB) → MinIO | On‑prem MinIO cluster |
| **PostgreSQL** | VPS ($12/mo) | Read replicas → Partitioning → Citus | On‑prem Citus cluster |
| **AI Assistant** | VPS + llama.cpp | GPU instances → On‑prem GPU | Client‑side WebGPU |

The Sovereign Suite grows with you. Start on free tiers, pay only for what you use, and migrate to self‑hosted hardware when it becomes more cost‑effective. The architecture never forces a rewrite—each scaling step is an additive change, not a replacement.

---

**[End of Section 22 — Next: Section 23: Appendices]**