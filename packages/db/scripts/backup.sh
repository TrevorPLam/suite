#!/bin/bash
# PostgreSQL Base Backup Script
# Creates compressed base backups using pg_basebackup
# Uploads to S3 if AWS credentials are configured
# Cleans up old local backups (keeps last 2)

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backup}"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${S3_BACKUP_BUCKET:-s3://my-backup-bucket/base}"
BACKUP_USER="${BACKUP_USER:-backup_user}"
BACKUP_HOST="${BACKUP_HOST:-localhost}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo "Starting base backup: base_${DATE}"

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

echo "Base backup created successfully"

# Upload to S3 (if configured)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  echo "Uploading backup to S3..."
  aws s3 sync "${BACKUP_DIR}/base_${DATE}" "${S3_BUCKET}/base_${DATE}/" --only-show-errors
  echo "Upload to S3 completed"
fi

# Record backup WAL position
echo "Recording WAL position..."
psql -U "${BACKUP_USER}" -h "${BACKUP_HOST}" -c \
  "SELECT pg_walfile_name(pg_current_wal_lsn())" > \
  "${BACKUP_DIR}/base_${DATE}/wal_position.txt"

# Cleanup old local backups (keep last 2)
echo "Cleaning up old local backups..."
ls -dt ${BACKUP_DIR}/base_* 2>/dev/null | tail -n +3 | xargs -r rm -rf

echo "Backup completed: base_${DATE}"
