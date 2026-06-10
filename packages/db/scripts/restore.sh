#!/bin/bash
# PostgreSQL Restore Script
# Performs Point-in-Time Recovery (PITR) using base backup + WAL replay
# Restores to a specific point in time

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backup}"
RESTORE_DIR="${RESTORE_DIR:-/var/lib/postgresql/restore}"
BACKUP_NAME="$1"
TARGET_TIME="${2:-$(date +%Y-%m-%d\ %H:%M:%S)}"

if [ -z "$BACKUP_NAME" ]; then
  echo "Usage: $0 <backup_name> [target_time]"
  echo "Example: $0 base_20250121_020000 '2025-01-21 14:30:00'"
  echo ""
  echo "Available backups:"
  ls -1 ${BACKUP_DIR}/base_* 2>/dev/null || echo "No backups found in ${BACKUP_DIR}"
  exit 1
fi

echo "Starting restore from backup: ${BACKUP_NAME}"
echo "Target time: ${TARGET_TIME}"

# Stop PostgreSQL
echo "Stopping PostgreSQL..."
sudo systemctl stop postgresql

# Download backup from S3 (if needed)
if [ ! -d "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
  echo "Backup not found locally, downloading from S3..."
  S3_BUCKET="${S3_BACKUP_BUCKET:-s3://my-backup-bucket/base}"
  aws s3 sync "${S3_BUCKET}/${BACKUP_NAME}/" "${BACKUP_DIR}/${BACKUP_NAME}/"
  echo "Download completed"
fi

# Clean restore directory
echo "Preparing restore directory..."
rm -rf "${RESTORE_DIR}"
mkdir -p "${RESTORE_DIR}"

# Extract base backup
echo "Extracting base backup..."
tar -xzf "${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz" -C "${RESTORE_DIR}"
tar -xzf "${BACKUP_DIR}/${BACKUP_NAME}/pg_wal.tar.gz" -C "${RESTORE_DIR}/pg_wal"

# Create recovery configuration
echo "Creating recovery configuration..."
cat > "${RESTORE_DIR}/recovery.conf" <<EOF
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_time = '${TARGET_TIME}'
recovery_target_action = 'promote'
EOF

# Backup current data directory
echo "Backing up current data directory..."
if [ -d "/var/lib/postgresql/data" ]; then
  sudo mv /var/lib/postgresql/data /var/lib/postgresql/data.old.$(date +%Y%m%d_%H%M%S)
fi

# Move restore to data directory
echo "Moving restored data to data directory..."
sudo mv "${RESTORE_DIR}" /var/lib/postgresql/data
sudo chown -R postgres:postgres /var/lib/postgresql/data

# Start PostgreSQL
echo "Starting PostgreSQL..."
sudo systemctl start postgresql

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to start..."
sleep 10

# Check PostgreSQL status
if sudo systemctl is-active --quiet postgresql; then
  echo "PostgreSQL started successfully"
  echo "Restore completed to: ${TARGET_TIME}"
else
  echo "Error: PostgreSQL failed to start"
  echo "Check logs: sudo tail -f /var/log/postgresql/postgresql-*.log"
  exit 1
fi
