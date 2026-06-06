---
title: "Future Scaling & Self‑Hosting"
section: "scaling"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "04-architecture-technology-stack.md"
  - "14-infrastructure-hybrid-cloud.md"
tags:
  - "scaling"
  - "self-hosting"
  - "cloudflare"
  - "performance"
---

## 22. Future Scaling & Self‑Hosting

The Sovereign Suite is designed to start small and scale gracefully. The initial launch runs entirely on Cloudflare's free tier and a single Contabo VPS. As the user base grows, the architecture provides clear upgrade paths: from free to paid Cloudflare plans, from a single VPS to a PostgreSQL cluster, from Workers to self‑hosted Node.js, and ultimately to full self‑hosting on customer infrastructure. This section documents the scaling bottlenecks for each component, the step‑by‑step upgrade paths, the cost projections at each tier, and the decision framework for when to move from Cloudflare to self‑hosted infrastructure.

---

### 22.1 Scaling Bottlenecks and Upgrade Paths

| Component | Bottleneck | Free Tier Limit | Upgrade Path | Self‑Hosted Alternative |
|-----------|------------|-----------------|---------------|-------------------------|
| **Workers** | 100k requests/day | Hard limit | Workers Paid ($5/mo) | Node.js on VPS or Kubernetes |
| **Pages** | 500 builds/month | Hard limit | Manual approval + caching | Nginx + static file serving |
| **R2** | 10 GB storage, 1M Class A ops | Soft limit | Paid R2 ($0.015/GB) | MinIO or local object storage |
| **Durable Objects** | 1M requests/month, 400k GB‑seconds | Soft limit | Paid DO (usage‑based) | Redis Pub/Sub or custom WebSocket server |
| **PostgreSQL** | Single VPS CPU/RAM | Hardware limits | Read replicas, partitioning | Patroni cluster, Citus |
| **Hyperdrive** | 1 free database | N/A | Paid Hyperdrive | PgBouncer, direct connection pooling |

The Sovereign Suite's scaling strategy is to **upgrade only when the bottleneck is actually hit**, not in anticipation of hypothetical growth. This keeps costs low during the early stage and avoids premature optimisation.

---

### 22.2 Scaling Workers: From Free to Paid to Self‑Hosted

**Stage 1: Free Tier (0–100k requests/day)**

The Sovereign Suite launches on Cloudflare Workers Free tier. With 100k requests/day, the suite can serve approximately **3,000 active users** (assuming 30 requests/day per user). This is sufficient for the initial launch and early growth.

**Stage 2: Workers Paid ($5/month, 10M requests/month)**

When the daily request count approaches 80k (80% of the free tier), upgrade to the Workers Paid plan. The Paid plan increases the limit to 10M requests/month (approximately 333k/day), which can serve **10,000–15,000 active users**. The cost is a flat $5/month plus $0.30 per additional million requests.

**Upgrade trigger:** GraphQL monitoring alerts at 80k requests/day.

**Stage 3: Self‑Hosted Node.js (100k+ requests/day)**

If the Sovereign Suite exceeds the Workers Paid plan or requires custom runtime extensions (e.g., Python for data processing), migrate the API layer to a self‑hosted Node.js server. Because the Sovereign Suite uses Hono, the migration is trivial: the same Hono application runs on Workers or Node.js with zero code changes.

**Deployment:**

```bash
# Build the Worker for Node.js
pnpm --filter=calendar-api build:node

# Run on VPS
node apps/calendar-api/dist/index.js
```

**Load balancing:** Use Nginx or a cloud load balancer (e.g., AWS ALB) to distribute traffic across multiple Node.js instances.

---

### 22.3 Scaling Durable Objects: Sharding and Hibernation

**Stage 1: Free Tier (1M requests/month, 400k GB‑seconds)**

With the Hibernation API (Section 10), idle Durable Objects consume almost no duration. A chat room with 1,000 connected users that exchanges 10 messages per minute consumes approximately 2,000 GB‑seconds per day, well within the free tier.

**Stage 2: Paid Durable Objects (usage‑based)**

When the aggregate DO duration approaches 320k GB‑seconds (80% of the free tier), upgrade to the paid tier. The paid tier charges $0.15 per million requests and $0.50 per 100k GB‑seconds.

**Stage 3: Sharding for High‑Scale Rooms**

If a single room exceeds 10,000 concurrent connections, shard the room by participant ID hash. Each shard is a separate Durable Object, and clients are assigned to shards based on their user ID. This distributes load across multiple DOs.

**Implementation:**

```typescript
const shardCount = 4;
const shardIndex = hash(userId) % shardCount;
const doId = `room:${roomId}:shard:${shardIndex}`;
```

**Stage 4: Self‑Hosted WebSocket Server**

If Durable Objects become cost‑prohibitive or require custom extensions, migrate to a self‑hosted WebSocket server using `ws` (Node.js) or `Socket.IO`. The server runs on the VPS or a dedicated WebSocket cluster.

---

### 22.4 Scaling PostgreSQL: From Single VPS to Cluster

**Stage 1: Single VPS (4 vCPU, 8 GB RAM)**

The initial PostgreSQL deployment runs on a single Contabo VPS. This configuration can handle **10,000–20,000 active users** with proper indexing and connection pooling.

**Stage 2: Read Replicas**

When read‑heavy queries (e.g., calendar event listings) become a bottleneck, add read replicas. Cloudflare Hyperdrive automatically routes read queries to replicas if configured.

**Implementation:**

```bash
# Provision a second VPS for the replica
# Configure PostgreSQL streaming replication
# Update Hyperdrive to use the replica for read queries
```

**Stage 3: Partitioning**

When a single table exceeds 10 million rows, partition it by `tenant_id` or time range. PostgreSQL 17 supports declarative partitioning, which is transparent to the application.

**Example:**

```sql
CREATE TABLE calendar.events (
  id UUID,
  tenant_id UUID,
  -- ... other columns
) PARTITION BY HASH (tenant_id);

CREATE TABLE calendar.events_0 PARTITION OF calendar.events FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE calendar.events_1 PARTITION OF calendar.events FOR VALUES WITH (MODULUS 4, REMAINDER 1);
-- ... etc
```

**Stage 4: Citus for Horizontal Scaling**

If the database exceeds the capacity of a single server even with partitioning, migrate to **Citus**, a PostgreSQL extension that enables horizontal sharding across multiple nodes. Citus is the standard solution for scaling PostgreSQL to multi‑tenant workloads.

**Stage 5: Patroni for High Availability**

For enterprise customers requiring 99.99% uptime, deploy a **Patroni** cluster with 3+ nodes. Patroni provides automatic failover, leader election, and configuration management for PostgreSQL.

---

### 22.5 Scaling R2: Lifecycle Rules and MinIO

**Stage 1: Free Tier (10 GB storage, 1M Class A ops)**

The initial launch uses R2's free tier. With 10 GB of storage, the suite can store approximately **2,000 users' files** (assuming 5 MB per user).

**Stage 2: Paid R2 ($0.015/GB/month)**

When storage approaches 8 GB (80% of the free tier), upgrade to paid R2. The cost is negligible: 100 GB costs $1.50/month.

**Stage 3: Lifecycle Rules**

Implement lifecycle rules to automatically delete old files:

- **Temporary uploads:** Delete after 24 hours
- **User files:** Retain indefinitely (subject to user deletion)
- **Backups:** Delete after 30 days (WAL archives)

**Stage 4: MinIO for Self‑Hosting**

For enterprise customers who require data to never leave their infrastructure, replace R2 with **MinIO**, an S3‑compatible object storage server. MinIO runs on the customer's VPS or on‑premises hardware.

**MinIO deployment:**

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
```

The application code requires no changes; MinIO is S3‑compatible, so the existing R2 SDK works with MinIO after changing the endpoint URL.

---

### 22.6 Full Self‑Hosting Architecture

For enterprise customers or regulatory requirements that prohibit third‑party cloud providers, the Sovereign Suite can be fully self‑hosted. The architecture replaces every Cloudflare component with an open‑source equivalent:

| Cloudflare Component | Self‑Hosted Alternative |
|---------------------|-------------------------|
| **Workers** | Node.js + Hono (behind Nginx) |
| **Pages** | Nginx static file serving |
| **R2** | MinIO |
| **Durable Objects** | Redis Pub/Sub + custom WebSocket server |
| **Hyperdrive** | PgBouncer |
| **DNS** | Cloudflare DNS (can be replaced with BIND) |
| **Tunnel** | WireGuard VPN |

**Deployment script:** The Sovereign Suite provides a Docker Compose bundle that deploys the entire stack with a single command:

```bash
docker-compose up -d
```

The bundle includes:
- PostgreSQL (with Patroni for HA)
- MinIO
- Redis
- Node.js API servers (one per app)
- Nginx reverse proxy
- WireGuard VPN for secure remote access

**Pricing for self‑hosting:** Flat annual fee of $5,000–$20,000 depending on seat count, plus optional support and maintenance contract.

---

### 22.7 Cost Projections by Tier

| Tier | Users | Monthly Infrastructure Cost | Revenue Required |
|------|-------|------------------------------|------------------|
| **Launch** | 0–3,000 | $0 (free tier) | $0 |
| **Growth** | 3,000–15,000 | $5 (Workers Paid) + $0.50 (R2) = **$5.50** | ~5 premium users |
| **Scale** | 15,000–50,000 | $20 (Workers Paid + overage) + $5 (R2) + $50 (VPS upgrade) = **$75** | ~10 premium users |
| **Enterprise** | 50,000+ | $500 (dedicated infrastructure) | ~60 premium users |

The Sovereign Suite becomes profitable at approximately **15,000 active users**, assuming a 5% conversion rate to premium ($8/month). At 50,000 users, the suite generates $20,000/month in revenue with $500/month in infrastructure costs—a 40:1 revenue‑to‑infrastructure ratio.

---

### 22.8 Multi‑Region Deployment

For global latency requirements, the Sovereign Suite can be deployed in multiple regions. Cloudflare Workers automatically route requests to the nearest data centre. For self‑hosted deployments, use:

- **GeoDNS** to route users to the nearest region
- **PostgreSQL logical replication** to keep databases in sync
- **MinIO multi‑site replication** for object storage

**Multi‑region architecture:**

```
User in US → US Workers → US PostgreSQL (primary) → EU PostgreSQL (replica)
User in EU → EU Workers → EU PostgreSQL (primary) → US PostgreSQL (replica)
```

Writes go to the local primary and are asynchronously replicated to other regions. Reads are served from the local replica for low latency.

---

### 22.9 Scaling the AI Assistant

The Sovereign Suite's AI Assistant (Section 1) requires GPU compute for inference. The scaling strategy is:

1. **Stage 1:** Use Cloudflare Workers AI (built‑in models) for simple tasks (text summarisation, classification).
2. **Stage 2:** For complex tasks (code generation, document analysis), route requests to a dedicated GPU server (e.g., a single A100 instance).
3. **Stage 3:** Deploy a model serving cluster (e.g., vLLM) with multiple GPUs for high‑throughput inference.

**Cost:** A single A100 instance costs approximately $3–$5/hour on cloud providers. For 1,000 AI requests/day, the monthly cost is approximately $150–$250, which is covered by premium subscription revenue.

---

### 22.10 AI Agent Rules for Scaling

Add the following to your root `AGENTS.md`:

```markdown
## Scaling Rules (AI Agents Must Follow)

1. **Monitor free tier usage weekly.** Use the GraphQL monitoring script to alert at 80% of limits.
2. **Upgrade only when the bottleneck is hit.** Do not pre‑emptively scale; it wastes money.
3. **Use Hibernation API for all Durable Objects.** Idle DOs must not consume duration.
4. **Partition tables before they exceed 10M rows.** Use PostgreSQL 17 declarative partitioning.
5. **Implement lifecycle rules for R2.** Delete temporary files after 24 hours.
6. **Test self‑hosted deployment in a fresh environment.** The Docker Compose bundle must work out‑of‑the‑box.
7. **Shard rooms at 10k concurrent connections.** Do not let a single DO exceed this limit.
8. **Use read replicas for read‑heavy workloads.** Configure Hyperdrive to route reads accordingly.
9. **Document scaling decisions in the ops runbook.** Include the trigger metrics and the upgrade steps.
10. **Never scale horizontally without load testing.** Validate the upgrade path in staging first.
```

---

### 22.11 Summary: Scaling Path at a Glance

| Component | Free Tier | Paid Tier | Self‑Hosted |
|-----------|-----------|-----------|-------------|
| **Workers** | 100k requests/day | 10M requests/month ($5/mo) | Node.js + Nginx |
| **Pages** | 500 builds/month | Manual approval | Nginx static |
| **R2** | 10 GB storage | $0.015/GB | MinIO |
| **Durable Objects** | 1M requests/month | Usage‑based | Redis + WebSocket |
| **PostgreSQL** | Single VPS | Read replicas | Patroni + Citus |
| **AI** | Workers AI | GPU server | vLLM cluster |

The Sovereign Suite's scaling architecture is designed to start at zero cost and grow gracefully to enterprise scale. Each component has a clear upgrade path, and the transition from Cloudflare to self‑hosting is seamless because the core application logic (Hono, Drizzle, Better Auth) is platform‑agnostic. The suite can run entirely on your own infrastructure, or entirely on Cloudflare, or any hybrid in between—without changing a single line of code.
