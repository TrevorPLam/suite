## 22. Future: Scaling & Full Self‑Hosting

> Deep‑dive content (migration scripts, Docker Compose, Citus config, DO sharding code, WebGPU integration) moved to [99-research-pipeline.md](99-research-pipeline.md).

### 22.1 Bottlenecks

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

### 22.2 Workers → VPS

Same Hono code runs on Node.js. Change: `createDbClient(process.env.DATABASE_URL)` instead of Worker env binding; HTTP calls instead of Service Bindings.

Gradual migration: 100%→90%→50%→10%→0% Workers over 4 weeks using Cloudflare Load Balancing.

---

### 22.3 DO Sharding

- **Hash‑based:** `md5(roomId) % shardCount` → separate DO per shard.
- **Leader‑follower:** One leader DO for writes; follower DOs for reads and WebSocket connections.

Shard when a room exceeds 15k connections or DO CPU >50% consistently.

---

### 22.4 PostgreSQL Scaling Path

1. **Single node** (0–5k tenants): VPS with 8 GB RAM, 4 vCPUs.
2. **Read replicas** (5k–50k): Add replicas at 70% primary CPU. Route reads to replica, writes to primary.
3. **Partitioning** (100k+): Partition tables >100 GB by `created_at` (range) or `tenant_id` (list).
4. **Citus** (1M+): Distribute by `tenant_id`. Open‑source version is free and sufficient.

---

### 22.5 R2 → MinIO

R2 lifecycle policies delete temp files after 1 day, transition cold objects after 90 days. At >1 TB, evaluate MinIO on VPS ($0 vs $0.015/GB). S3 API is identical; only endpoint/credentials change.

---

### 22.6 Full Self‑Hosting

| Cloudflare | Self‑Hosted |
|------------|-------------|
| Workers | Node.js + Hono |
| Pages | nginx + static files |
| R2 | MinIO |
| Durable Objects | Node.js + WebSocket + Redis |
| Hyperdrive | PgBouncer |
| Service Bindings | Internal HTTP |
| Cloudflare Tunnel | Tailscale / WireGuard |

Self‑hosted deployment offered as **Enterprise Premium** add‑on.

---

### 22.7 Cost at Scale

| Scale | Users | Cloudflare/mo | Self‑Hosted/mo |
|-------|-------|---------------|----------------|
| Start‑up | 1k | $12 | $12 |
| Growth | 100k | $195 | $40 |
| Enterprise | 1M | $2,050 | $500 |

Crossover point: ~100k users.

### 22.8 Multi‑Region

- Read replicas in each region (US, EU, APAC)
- Single write primary
- Geo‑DNS routes reads to nearest replica
- Self‑hosted: Citus with replication across AZs

---

### 22.9 AI Assistant Scaling

| Stage | Deployment | When |
|-------|------------|------|
| 1 | Single VPS, llama.cpp (7B) | 0–1k users |
| 2 | Multiple VPS, load‑balanced | 1k–10k |
| 3 | Dedicated GPU instances | 10k–100k |
| 4 | On‑prem GPU cluster | 100k+ |
| 5 | Client‑side WebGPU | Always (opt‑in) |

### 22.10 Scaling Rules for AI Agents

1. Design for scale; optimise for free tier. Code must run on Workers and Node.js.
2. Upgrade Workers at 80% free tier usage.
3. Shard DOs at 15k connections.
4. Add read replicas at 70% primary CPU.
5. Partition tables >100 GB.
6. Distribute with Citus at 1M tenants.
7. Self‑hosting is Enterprise feature; script in `infra/selfhosted/`.
8. Multi‑region is last resort; read replicas first.
9. AI Assistant: offload to WebGPU when available.
10. Test `deploy-selfhosted.sh` before every major release.

---

**[End of Section 22 — Next: Section 23: Appendices]**