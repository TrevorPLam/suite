# PostgreSQL Backup and Restore Strategy

## Overview

This document describes the backup and restore strategy for the Suite monorepo PostgreSQL databases. The strategy uses WAL (Write-Ahead Log) archiving for Point-in-Time Recovery (PITR) with regular base backups using `pg_basebackup`.

**Recovery Objectives:**
- **RTO (Recovery Time Objective):** < 1 hour
- **RPO (Recovery Point Objective):** < 5 minutes

## WAL Archiving Setup

### PostgreSQL Configuration

Add the following to `postgresql.conf`:

```ini
# WAL settings
wal_level = replica
max_wal_size = 4GB
min_wal_size = 1GB
wal_compression = on

# Archiving
archive_mode = on
archive_command = '/usr/local/bin/archive_wal.sh %p %f'
archive_timeout = 300  # 5 minutes - archive incomplete WAL segment after timeout

# Replication (if also using streaming)
max_wal_senders = 10
wal_keep_size = 2GB
```

**Configuration Parameters:**
- `wal_level = replica`: Required for archiving. Records enough information to support WAL archiving and replication.
- `archive_mode = on`: Enables archiving of WAL files.
- `archive_command`: Shell command to copy WAL files to archive location. `%p` is the path to the WAL file, `%f` is the filename.
- `archive_timeout = 300`: Forces archiving of incomplete WAL segments after 5 minutes, reducing RPO.

### Create Archive Directory

```bash
# Create local archive directory
sudo mkdir -p /var/lib/postgresql/archive
sudo chown postgres:postgres /var/lib/postgresql/archive

# Restart PostgreSQL to apply changes
sudo systemctl restart postgresql
```

### Archive Script

Create `/usr/local/bin/archive_wal.sh`:

```bash
#!/bin/bash
set -e

WAL_PATH="$1"
WAL_NAME="$2"
LOCAL_ARCHIVE="/var/lib/postgresql/archive"
S3_BUCKET="${S3_BACKUP_BUCKET:-s3://my-backup-bucket/wal}"

# Compress WAL file
COMPRESSED="/tmp/${WAL_NAME}.gz"
gzip -c "$WAL_PATH" > "$COMPRESSED"

# Archive to local storage
cp "$COMPRESSED" "${LOCAL_ARCHIVE}/${WAL_NAME}.gz"

# Archive to S3 (if configured)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  aws s3 cp "$COMPRESSED" "${S3_BUCKET}/${WAL_NAME}.gz" --only-show-errors
fi

# Cleanup temporary file
rm -f "$COMPRESSED"

# Verify local archive exists
test -f "${LOCAL_ARCHIVE}/${WAL_NAME}.gz"
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/archive_wal.sh
```

### Verify Archiving

```sql
-- Check archive status
SELECT * FROM pg_stat_archiver;

-- Force archive of current WAL segment
SELECT pg_switch_wal();

-- Check archived files
SELECT archived_count, last_archived_wal, last_archived_time FROM pg_stat_archiver;
```

```bash
# List archived files
ls -la /var/lib/postgresql/archive/
```

## Base Backup Strategy

### Backup Script

Create `/usr/local/bin/backup_postgresql.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backup}"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${S3_BACKUP_BUCKET:-s3://my-backup-bucket/base}"
BACKUP_USER="${BACKUP_USER:-backup_user}"
BACKUP_HOST="${BACKUP_HOST:-localhost}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Create base backup with pg_basebackup
pg_basebackup \
  -D "${BACKUP_DIR}/base_${DATE}" \
  -Ft \
  -z \
  -Xs \
  -P \
  -c fast \
  -l "base_${DATE}" \
  -U "${BACKUP_USER}" \
  -h "${BACKUP_HOST}"

# Upload to S3 (if configured)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  aws s3 sync "${BACKUP_DIR}/base_${DATE}" "${S3_BUCKET}/base_${DATE}/" --only-show-errors
fi

# Record backup WAL position
psql -U "${BACKUP_USER}" -h "${BACKUP_HOST}" -c \
  "SELECT pg_walfile_name(pg_current_wal_lsn())" > \
  "${BACKUP_DIR}/base_${DATE}/wal_position.txt"

# Cleanup old local backups (keep last 2)
ls -dt ${BACKUP_DIR}/base_* | tail -n +3 | xargs rm -rf

echo "Backup completed: base_${DATE}"
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/backup_postgresql.sh
```

### pg_basebackup Options

- `-D`: Output directory for backup
- `-Ft`: Tar format (portable, compressible)
- `-z`: Compress output
- `-Xs`: Stream WAL during backup (required for PITR)
- `-P`: Show progress
- `-c fast`: Checkpoint before backup (faster, less interruption)
- `-l`: Label for backup

### Automated Backup Schedule

Add to crontab:
```bash
# crontab -e

# Daily base backup at 2 AM
0 2 * * * /usr/local/bin/backup_postgresql.sh >> /var/log/postgresql/backup.log 2>&1

# Archive cleanup weekly (keep 14 days)
0 3 * * 0 find /var/lib/postgresql/archive -name "*.gz" -mtime +14 -delete
```

## Restore Strategy

### Point-in-Time Recovery (PITR)

Restore to a specific point in time using base backup + WAL replay.

#### Restore Script

Create `/usr/local/bin/restore_postgresql.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backup}"
RESTORE_DIR="${RESTORE_DIR:-/var/lib/postgresql/restore}"
BACKUP_NAME="$1"
TARGET_TIME="${2:-$(date +%Y-%m-%d\ %H:%M:%S)}"

if [ -z "$BACKUP_NAME" ]; then
  echo "Usage: $0 <backup_name> [target_time]"
  echo "Example: $0 base_20250121_020000 '2025-01-21 14:30:00'"
  exit 1
fi

# Stop PostgreSQL
sudo systemctl stop postgresql

# Download backup from S3 (if needed)
if [ ! -d "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
  S3_BUCKET="${S3_BACKUP_BUCKET:-s3://my-backup-bucket/base}"
  aws s3 sync "${S3_BUCKET}/${BACKUP_NAME}/" "${BACKUP_DIR}/${BACKUP_NAME}/"
fi

# Clean restore directory
rm -rf "${RESTORE_DIR}"
mkdir -p "${RESTORE_DIR}"

# Extract base backup
tar -xzf "${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz" -C "${RESTORE_DIR}"
tar -xzf "${BACKUP_DIR}/${BACKUP_NAME}/pg_wal.tar.gz" -C "${RESTORE_DIR}/pg_wal"

# Create recovery configuration
cat > "${RESTORE_DIR}/recovery.conf" <<EOF
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_time = '${TARGET_TIME}'
recovery_target_action = 'promote'
EOF

# Move to data directory
sudo mv /var/lib/postgresql/data /var/lib/postgresql/data.old
sudo mv "${RESTORE_DIR}" /var/lib/postgresql/data
sudo chown -R postgres:postgres /var/lib/postgresql/data

# Start PostgreSQL
sudo systemctl start postgresql

echo "Restore completed to: ${TARGET_TIME}"
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/restore_postgresql.sh
```

#### Restore Steps

1. **Stop PostgreSQL:**
   ```bash
   sudo systemctl stop postgresql
   ```

2. **Choose backup:**
   ```bash
   ls -la /var/lib/postgresql/backup/
   ```

3. **Restore to specific time:**
   ```bash
   sudo /usr/local/bin/restore_postgresql.sh base_20250121_020000 '2025-01-21 14:30:00'
   ```

4. **Verify restore:**
   ```sql
   SELECT * FROM pg_stat_archiver;
   ```

## Backup Verification

### Verification Script

Create `/usr/local/bin/verify_backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backup}"
BACKUP_NAME="$1"

if [ -z "$BACKUP_NAME" ]; then
  echo "Usage: $0 <backup_name>"
  exit 1
fi

# Check backup exists
if [ ! -d "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
  echo "Error: Backup ${BACKUP_NAME} not found"
  exit 1
fi

# Verify backup integrity (PostgreSQL 13+)
if command -v pg_verifybackup &> /dev/null; then
  pg_verifybackup "${BACKUP_DIR}/${BACKUP_NAME}"
  echo "Backup integrity verified: ${BACKUP_NAME}"
else
  echo "pg_verifybackup not available (PostgreSQL < 13)"
  echo "Checking tar files..."
  
  # Check tar files exist and are valid
  tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz" > /dev/null
  tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}/pg_wal.tar.gz" > /dev/null
  
  echo "Tar files verified: ${BACKUP_NAME}"
fi

# Check WAL position file
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}/wal_position.txt" ]; then
  echo "WAL position: $(cat ${BACKUP_DIR}/${BACKUP_NAME}/wal_position.txt)"
else
  echo "Warning: WAL position file missing"
fi
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/verify_backup.sh
```

### Verification Steps

```bash
# Verify latest backup
sudo /usr/local/bin/verify_backup.sh base_$(ls -t /var/lib/postgresql/backup/ | head -1)

# Verify specific backup
sudo /usr/local/bin/verify_backup.sh base_20250121_020000
```

## RTO/RPO Targets

### Recovery Time Objective (RTO): < 1 hour

**Breakdown:**
- Base backup restore: 30-45 minutes (depends on database size)
- WAL replay: 5-15 minutes (depends on recovery point)
- PostgreSQL startup: 2-5 minutes

**How to achieve:**
- Use compressed tar format for faster transfer
- Keep recent base backups locally (avoid S3 download time)
- Monitor restore time during drills
- Optimize WAL replay by limiting recovery target time

### Recovery Point Objective (RPO): < 5 minutes

**Breakdown:**
- WAL archiving interval: 5 minutes (archive_timeout)
- WAL file size: 16MB (default)
- Archive command latency: < 1 minute

**How to achieve:**
- Set `archive_timeout = 300` (5 minutes)
- Use fast storage for archive directory
- Monitor `pg_stat_archiver` for lag
- Archive to local storage first, then async upload to S3

## Monitoring

### Key Metrics

Monitor these metrics to ensure backup health:

```sql
-- Archive status
SELECT 
  archived_count,
  last_archived_wal,
  last_archived_time,
  current_wal_lsn,
  archived_lsn,
  pg_stat_archiver.* 
FROM pg_stat_archiver;

-- WAL size
SELECT 
  pg_size_pretty(pg_walfile_name_offset(pg_current_wal_lsn()).offset) as wal_size;
```

### Alerting

Set up alerts for:
- Archive lag > 10 minutes
- Archive command failures
- Backup script failures
- Disk space < 20% on backup/archive directories

## Disaster Recovery Runbook

### Scenario 1: Database Corruption

1. Stop PostgreSQL
2. Identify last known good backup
3. Restore to point before corruption
4. Verify data integrity
5. Promote to production

### Scenario 2: Complete Server Failure

1. Provision new server
2. Install PostgreSQL
3. Download latest base backup from S3
4. Download WAL files from S3
5. Restore using PITR
6. Update DNS/load balancer

### Scenario 3: Accidental Data Deletion

1. Stop PostgreSQL (prevent further changes)
2. Identify time of deletion
3. Restore to point before deletion
4. Export deleted data
5. Restore current state
6. Re-import deleted data

## Best Practices

1. **Test restores regularly:** Perform monthly restore drills to verify RTO/RPO
2. **Keep multiple backups:** Retain at least 2 base backups locally
3. **Archive to multiple locations:** Local + S3 for redundancy
4. **Monitor archive lag:** Alert if WAL archiving falls behind
5. **Document restore procedures:** Keep runbook up to date
6. **Use compression:** Reduce storage costs and transfer time
7. **Secure backups:** Encrypt backups at rest and in transit
8. **Validate backups:** Run verification after each backup

## Troubleshooting

### Archive Command Fails

Check PostgreSQL log:
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

Test archive command manually:
```bash
sudo -u postgres /usr/local/bin/archive_wal.sh /var/lib/postgresql/pg_wal/000000010000000000000001 000000010000000000000001
```

### Archive Lag Growing

Check disk space:
```bash
df -h /var/lib/postgresql/archive
```

Check archive status:
```sql
SELECT * FROM pg_stat_archiver;
```

Force WAL switch:
```sql
SELECT pg_switch_wal();
```

### Restore Fails

Check recovery log:
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

Verify WAL files exist:
```bash
ls -la /var/lib/postgresql/archive/
```

Check recovery configuration:
```bash
cat /var/lib/postgresql/data/recovery.conf
```

## References

- [PostgreSQL Continuous Archiving](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [pg_basebackup Documentation](https://www.postgresql.org/docs/current/app-pgbasebackup.html)
- [PITR Documentation](https://www.postgresql.org/docs/current/recovery-target-settings.html)
