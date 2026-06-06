---
title: "Disaster Recovery & Key Escrow"
section: "disaster-recovery"
status: "complete"
last_updated: "2026-06-04"
related_files:
  - "06-core-packages-database-design.md"
  - "14-infrastructure-hybrid-cloud.md"
tags:
  - "disaster-recovery"
  "backup"
  - "key-escrow"
  - "wal-g"
---

## 15. Disaster Recovery & Key Escrow

Disaster recovery is the final line of defence. If the VPS burns, if the database corrupts, if a malicious migration deletes critical data, or if an attacker gains full access to the Sovereign Suite's infrastructure, the disaster recovery plan must restore every user's encrypted data without violating the zero‑knowledge guarantee. The strategy is therefore not only about bits and bytes—it is about ensuring that even after a catastrophic event, the Sovereign Suite can be rebuilt without ever exposing plaintext user content.

The Sovereign Suite implements three independent recovery pathways:

1. **Database recovery** via continuous WAL archiving to Cloudflare R2, enabling point‑in‑time recovery (PITR).
2. **Key material recovery** via a multi‑layer key escrow system that allows users to regain access to their encrypted data without the server ever holding their master password.
3. **Infrastructure recovery** via infrastructure‑as‑code (Terraform, Ansible) that rebuilds the entire environment from scratch.

This architecture ensures that the only unrecoverable failure mode is the simultaneous destruction of all backups and the loss of all user key escrow shares—an event with probability approaching zero when properly implemented.

---

### 15.1 The DR Philosophy: Continuous WAL Archiving + Key Escrow

The disaster recovery strategy is built on three complementary pillars:

| Pillar | Technology | Purpose |
|--------|------------|---------|
| **Continuous archiving** | WAL‑G + R2 | Every transaction is streamed to object storage within seconds of commit. No data is ever lost beyond the last archived WAL segment. |
| **Incremental backups** | `pg_basebackup` (PostgreSQL 17) | Periodic full base backups reduce restore time. PostgreSQL 17's native incremental backups reduce backup size and network transfer by copying only changed blocks since the last full backup. |
| **Key escrow (zero‑knowledge)** | Shamir secret sharing + AES‑256‑GCM | Users can recover their account key without the server ever holding the master password. The system stores encrypted key shares; the user holds a recovery code printed at account creation. |
| **Infrastructure as code** | Terraform + Ansible | Every Cloudflare resource, Worker, Pages project, and VPS configuration is defined in declarative code. The entire infrastructure can be rebuilt from scratch with a single command. |

The critical innovation for the Sovereign Suite is that the backup system is **zero‑knowledge by design**. The database contains only ciphertext. The key escrow system stores encrypted key shares. Even if an attacker compromises the backup system, they see only encrypted blobs and cannot decrypt a single row without breaking the AES‑256‑GCM encryption or the user's account key.

---

### 15.2 Backup Strategy: WAL‑G + R2

WAL‑G (Write‑Ahead Log archival) is the industry‑standard tool for continuous PostgreSQL backup. It streams WAL files to S3‑compatible storage as they are written, enabling point‑in‑time recovery with near‑zero data loss. The Sovereign Suite uses WAL‑G with Cloudflare R2 as the backup destination, leveraging R2's zero egress fees for restore operations.

**Why WAL‑G?** A 2025 tutorial on setting up point‑in‑time recovery backups for PostgreSQL on Ubuntu with WAL‑G and S3‑compatible storage validates this approach for production environments. WAL‑G is a successor to WAL‑E that uses LZ4/Brotli/ZSTD compression and is optimised for cloud storage. It provides efficient WAL archiving and backup management and supports zero data loss recovery.

#### 15.2.1 R2 Bucket Configuration

Create two R2 buckets:

```bash
npx wrangler r2 bucket create suite-wal-archive
npx wrangler r2 bucket create suite-backup-full
```

Set up an R2 API token with Object Read & Write permission on both buckets. Store the `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` as secrets in Doppler.

#### 15.2.2 WAL‑G Installation and Configuration

**On the VPS (Ubuntu 24.04):**

```bash
# Download and install WAL‑G
wget https://github.com/wal-g/wal-g/releases/latest/download/wal-g-pg-ubuntu-20.04-amd64
sudo mv wal-g-pg-ubuntu-20.04-amd64 /usr/local/bin/wal-g
sudo chmod +x /usr/local/bin/wal-g
```

**Configuration script (`/etc/wal-g/env`):**

```bash
export WALG_S3_PREFIX="s3://suite-wal-archive"
export AWS_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
export AWS_REGION="auto"
export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${R2_SECRET_KEY}"
export PGUSER="suite"
export PGHOST="localhost"
export PGDATABASE="suite"
```

**PostgreSQL configuration (`postgresql.conf`):**

```ini
wal_level = 'replica'                    # Required for archiving
archive_mode = 'on'
archive_command = 'source /etc/wal-g/env && wal-g wal-push %p'
archive_timeout = 60                     # Archive every 60 seconds even if WAL not full
max_wal_senders = 3                      # For replication
wal_keep_size = '1GB'                    # Keep 1GB of WAL locally before archiving
```

**Create base backup (initial):**

```bash
source /etc/wal-g/env
wal-g backup-push /var/lib/postgresql/17/main
```

This copies the entire data directory to R2 and begins continuous archiving of future WAL segments.

#### 15.2.3 PostgreSQL 17 Incremental Backups

Starting with PostgreSQL 17, `pg_basebackup` supports native incremental backups, which copy only changed blocks since the previous backup. This reduces backup size and network transfer dramatically for large databases. The Sovereign Suite implements incremental backups as a complement to WAL‑G, providing a faster restore path for recent states.

**Create an incremental backup:**

```bash
# Full backup (Day 1)
pg_basebackup -D /backup/full -Ft -z

# Incremental backup (Day 2 — only changed blocks)
pg_basebackup --incremental /backup/full -D /backup/inc1 -Ft -z
```

**Restore combining incremental and full:**

```bash
pg_combinebackup /backup/full /backup/inc1 -o /restore/data
```

The WAL summarizer process in PostgreSQL 17 maintains "summaries" of WAL files in the `pg_wal/summaries` directory, enabling fast identification of changed blocks without scanning entire data files.

#### 15.2.4 Backup Scheduling and Retention

A cron job or systemd timer executes the following schedule:

| Backup Type | Frequency | Retention | Storage Location |
|-------------|-----------|-----------|------------------|
| WAL archive (continuous) | Every 60 seconds | 30 days | R2 (`suite-wal-archive`) |
| Full base backup (WAL‑G) | Weekly (Sunday 2:00 AM) | 30 days | R2 (`suite-backup-full`) |
| Incremental backup (`pg_basebackup`) | Daily (2:00 AM) | 7 days | Local disk (ephemeral) |
| Logical dump (`pg_dumpall`) | Daily (3:00 AM) | 30 days | R2 (`suite-backup-full`) |

The WAL archive retention of 30 days ensures point‑in‑time recovery can rewind to any transaction within the last month. The logical dump provides a portable, version‑agnostic backup for emergency recovery where physical restore is not possible.

**Cron configuration (`/etc/cron.d/postgres-backup`):**

```
0 2 * * 0 root source /etc/wal-g/env && wal-g backup-push /var/lib/postgresql/17/main
0 2 * * 1-6 root pg_basebackup --incremental /var/lib/postgresql/17/main -D /backup/inc_$(date +\%Y\%m\%d) -Ft -z
0 3 * * * root pg_dumpall > /backup/suite_$(date +\%Y\%m\%d).sql && wal-g backup-push /backup/suite_$(date +\%Y\%m\%d).sql
```

**Lifecycle rules on R2** automatically delete objects older than 30 days from both buckets, preventing unbounded storage growth.

---

### 15.3 Point‑in‑Time Recovery (PITR)

Point‑in‑time recovery allows the Sovereign Suite to rewind the entire database to any transaction within the WAL archive retention window. This is the primary recovery mechanism for accidental data corruption, erroneous mass deletion, or migration failure.

**Prerequisites for PITR:**
- `wal_level` must be `replica` or higher.
- Continuous WAL archiving must be configured and verified.
- A base backup must exist in the archive.

**Restore procedure:**

```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Clear data directory
rm -rf /var/lib/postgresql/17/main/*

# 3. Fetch latest base backup from R2
source /etc/wal-g/env
wal-g backup-fetch /var/lib/postgresql/17/main LATEST

# 4. Create recovery signal file
touch /var/lib/postgresql/17/main/recovery.signal

# 5. Configure recovery target in postgresql.conf
echo "recovery_target_time = '2026-06-04 14:30:00 UTC'" >> /var/lib/postgresql/17/main/postgresql.conf
echo "recovery_target_inclusive = true" >> /var/lib/postgresql/17/main/postgresql.conf
echo "restore_command = 'source /etc/wal-g/env && wal-g wal-fetch \"%f\" \"%p\"'" >> recovery.conf

# 6. Start PostgreSQL (enters recovery mode)
sudo systemctl start postgresql

# 7. After recovery completes, promote to normal operation
sudo -u postgres psql -c "SELECT pg_wal_replay_resume();"
```

**Restoring to a specific transaction ID (XID) or LSN:**

```sql
-- Show available restore points
SELECT * FROM pg_replication_slots;
SELECT * FROM pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0');

-- Set recovery target
ALTER SYSTEM SET recovery_target_xid = '1234567';
ALTER SYSTEM SET recovery_target_inclusive = true;
```

The archived WAL files are streamed from R2 during recovery. Because R2 has zero egress fees, the bandwidth cost of pulling terabytes of WAL data during a disaster recovery is $0—a critical advantage for a self‑hosted platform.

---

### 15.4 Key Escrow for Zero‑Knowledge Recovery

The Sovereign Suite's zero‑knowledge promise means that even the system administrators cannot decrypt user data. This creates a fundamental tension with disaster recovery: if a user loses their master password (or their device storing the derived key), their encrypted data is permanently inaccessible. Key escrow resolves this tension without breaking the zero‑knowledge model.

The escrow design is a **zero‑knowledge key recovery system** similar to those described in patent literature: the encryption key is split into multiple encrypted shares, each held by a different escrow authority, with the user holding the master recovery code.

#### 15.4.1 The Three‑Layer Key Hierarchy

| Layer | Key | Derivation | Storage |
|-------|-----|------------|---------|
| **Master password** | Human‑memorised | N/A | User's memory only |
| **Account key** | PBKDF2‑SHA‑512 (600k iterations) | Derived from master password + salt | User's device only; never stored on server |
| **Escrow shares** | Shamir secret shares of Account Key | Encrypted with recovery secret | Server (encrypted, in `key_escrow` table) |

The **Account Key** never leaves the user's device. The server stores only a set of **encrypted escrow shares** in the `key_escrow` table:

```sql
CREATE TABLE auth.key_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_shard BYTEA NOT NULL,     -- AES‑256‑GCM ciphertext
  shard_index INTEGER NOT NULL,       -- 1 to N (Shamir threshold)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, shard_index)
);
```

Each share is encrypted with a **recovery secret**—a 32‑byte random value. The recovery secret is encoded as a human‑readable recovery code (e.g., `SUIT-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`) and presented to the user at account creation **once**. The server never stores the plaintext recovery secret; only the encrypted shares.

**Shamir secret sharing:** The Account Key is split into N shares using Shamir's Secret Sharing with threshold T (e.g., N=5, T=3). The user needs any 3 of the 5 shares plus the recovery secret to reconstruct the Account Key. This protects against server compromise: an attacker who steals the database sees only encrypted shares and cannot reconstruct the key without the recovery secret.

#### 15.4.2 Recovery Flow

1. **User initiates recovery** via the "Forgot Password" flow.
2. **User enters the recovery code** (printed at account creation).
3. **Client decodes the recovery secret** from the code.
4. **Client requests encrypted escrow shares** from the server (authenticated via the recovery secret itself, not a session).
5. **Client decrypts each share** using the recovery secret.
6. **Client reconstructs the Account Key** via Shamir interpolation.
7. **Client sets a new master password** and re‑encrypts the Account Key with the new password.
8. **Client re‑saves escrow shares** encrypted with a new recovery secret.
9. **Normal access restored.**

The server never sees the Account Key plaintext, never sees the master password, and never sees the recovery secret. The recovery secret is transmitted once (over TLS) to authenticate the request for escrow shares, but it is not stored.

#### 15.4.3 Zero‑Knowledge Escrow Backup

The escrow shares are stored in the database, which is itself backed up via WAL‑G. This creates a circular dependency: to restore the database, you need the keys; but the keys are only recoverable from the escrow shares stored *in* the database. This is the **key escrow bootstrap problem**.

The solution is a **cold escrow backup** stored separately from the main database. The Sovereign Suite stores:

- **WAL‑G backup of the entire database**, including the `key_escrow` table.
- **Separate, encrypted backup of the key escrow system's metadata** (e.g., the mapping of user IDs to Shamir parameters) stored in R2 with a separate key known only to the Sovereign Suite's operational team (a "break‑glass" key).
- **A physical recovery document** held by the Sovereign Suite's legal entity (in a safe deposit box) containing the break‑glass key and the Shamir parameters.

This three‑layer approach ensures that even if the database and all escrow shares are lost, the Sovereign Suite can still recover the ability to *allow users to recover their keys*, but cannot decrypt any user data without the user's recovery secret.

---

### 15.5 Automated Restore Testing

A disaster recovery plan that is never tested is not a recovery plan—it is a placebo. The Sovereign Suite implements **automated restore drills** that run weekly in a separate, isolated environment.

**Drill procedure executed by a scheduled GitHub Action:**

1. **Provision a temporary VPS** using a pre‑configured Terraform module.
2. **Install PostgreSQL** on the temporary instance.
3. **Download the latest base backup** from R2 using `wal-g backup-fetch`.
4. **Apply WAL archives** to roll forward to a random time within the last 24 hours.
5. **Run validation queries** to ensure the restored database is consistent (e.g., `SELECT COUNT(*) FROM calendar.events` matches expected ranges).
6. **Delete the temporary VPS** after logging success/failure.

**Alerting:** If the restore drill fails for two consecutive weeks, a critical alert is raised, and the backup configuration is investigated.

---

### 15.6 Infrastructure Recovery

Beyond database recovery, the Sovereign Suite maintains the ability to rebuild the entire infrastructure from scratch. This is achieved through two complementary tools:

| Tool | Responsibility | Configuration Storage |
|------|----------------|----------------------|
| **Terraform** | Cloudflare resources (Workers, Pages, R2 buckets, DO namespaces, DNS records, Hyperdrive) | `infra/terraform/` directory |
| **Ansible** | VPS configuration (Docker, PostgreSQL, cloudflared, firewall, cron jobs, WAL‑G) | `infra/ansible/` directory |

**Recovery procedure:**

```bash
# 1. Provision new VPS with desired spec (4 vCPU, 8 GB RAM, 200 GB SSD)
# 2. Apply Terraform configuration to recreate all Cloudflare resources
cd infra/terraform
terraform apply -var="env=production"

# 3. Run Ansible playbook to configure VPS
cd infra/ansible
ansible-playbook -i inventory/prod.yml site.yml --ask-vault-pass

# 4. Restore PostgreSQL database from latest WAL‑G backup
wal-g backup-fetch /var/lib/postgresql/17/main LATEST
```

The Terraform state file is stored in a private R2 bucket, isolated from the main infrastructure. This is the "source of truth" for infrastructure recovery.

---

### 15.7 AI Agent Rules for Disaster Recovery

Add the following to your root `AGENTS.md`:

```markdown
## Disaster Recovery & Key Escrow — Rules for AI Agents

1. **Never modify the key escrow schema without updating the cold backup procedure.** Changes to `auth.key_escrow` require a corresponding update to the break‑glass recovery document.

2. **Test restores weekly.** The automated restore drill must pass before any migration that alters the physical storage format is deployed.

3. **Never store the recovery secret in the database.** The `recovery_secret` is ephemeral, never persisted.

4. **Retain WAL archives for 30 days minimum.** Any change that would reduce retention must be approved by the security review.

5. **Encrypt all backups at rest.** Use AES‑256 via `repo1-cipher-type=aes-256-cbc` in pgBackRest or WAL‑G's built‑in encryption.

6. **Document the break‑glass key in a secure physical location.** The recovery procedure must be printed and stored offline.

7. **Never disable `archive_mode`.** Continuous archiving is non‑negotiable.

8. **Test the full infrastructure recovery annually.** Rebuild the entire stack from Terraform + Ansible + WAL‑G backup.

9. **Monitor backup success and alert on failure.** Any missed backup window within 24 hours triggers a critical alert.

10. **The `pg_basebackup` incremental backup is complementary, not a replacement for WAL‑G.** Do not disable WAL archiving.
```

---

### 15.8 Summary: DR Capabilities and Recovery Time Objectives

| Failure Scenario | Recovery Mechanism | Target RTO | Target RPO |
|------------------|--------------------|------------|------------|
| **Single corrupted table (human error)** | PITR to specific transaction ID | 30 minutes | 0 (any transaction) |
| **Full database loss** | WAL‑G base backup + WAL replay | 4 hours | < 1 minute |
| **Key escrow table corruption** | Cold escrow backup + break‑glass key | 8 hours | 24 hours |
| **Entire VPS loss** | Terraform + Ansible + WAL‑G restore | 6 hours | < 1 minute |
| **Cloudflare account compromise** | Terraform rebuild on new account | 12 hours | 24 hours |
| **User lost master password** | Recovery code + escrow shares | 5 minutes (self‑service) | N/A |

The disaster recovery and key escrow architecture of the Sovereign Suite ensures that no single point of failure—whether hardware, software, or human—can permanently destroy user data. The combination of continuous WAL archiving, incremental backups, zero‑knowledge key escrow, and infrastructure‑as‑code provides a multi‑layered defence against data loss that is both rigorous and practical for a solo founder to maintain.
