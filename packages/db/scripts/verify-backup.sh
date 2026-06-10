#!/bin/bash
# PostgreSQL Backup Verification Script
# Verifies backup integrity and completeness
# Supports pg_verifybackup (PostgreSQL 13+) and tar validation

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/lib/postgresql/backup}"
BACKUP_NAME="$1"

if [ -z "$BACKUP_NAME" ]; then
  echo "Usage: $0 <backup_name>"
  echo ""
  echo "Available backups:"
  ls -1 ${BACKUP_DIR}/base_* 2>/dev/null || echo "No backups found in ${BACKUP_DIR}"
  exit 1
fi

echo "Verifying backup: ${BACKUP_NAME}"

# Check backup exists
if [ ! -d "${BACKUP_DIR}/${BACKUP_NAME}" ]; then
  echo "Error: Backup ${BACKUP_NAME} not found in ${BACKUP_DIR}"
  exit 1
fi

# Verify backup integrity (PostgreSQL 13+)
if command -v pg_verifybackup &> /dev/null; then
  echo "Using pg_verifybackup for integrity check..."
  pg_verifybackup "${BACKUP_DIR}/${BACKUP_NAME}"
  echo "Backup integrity verified: ${BACKUP_NAME}"
else
  echo "pg_verifybackup not available (PostgreSQL < 13)"
  echo "Checking tar files..."
  
  # Check base.tar.gz exists and is valid
  if [ ! -f "${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz" ]; then
    echo "Error: base.tar.gz not found"
    exit 1
  fi
  
  tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz" > /dev/null
  echo "base.tar.gz verified"
  
  # Check pg_wal.tar.gz exists and is valid
  if [ ! -f "${BACKUP_DIR}/${BACKUP_NAME}/pg_wal.tar.gz" ]; then
    echo "Error: pg_wal.tar.gz not found"
    exit 1
  fi
  
  tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}/pg_wal.tar.gz" > /dev/null
  echo "pg_wal.tar.gz verified"
  
  echo "Tar files verified: ${BACKUP_NAME}"
fi

# Check WAL position file
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}/wal_position.txt" ]; then
  WAL_POSITION=$(cat "${BACKUP_DIR}/${BACKUP_NAME}/wal_position.txt")
  echo "WAL position: ${WAL_POSITION}"
else
  echo "Warning: WAL position file missing"
fi

# Check backup size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
echo "Backup size: ${BACKUP_SIZE}"

# Check backup age
BACKUP_AGE=$(( $(date +%s) - $(stat -c %Y "${BACKUP_DIR}/${BACKUP_NAME}") ))
BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))
echo "Backup age: ${BACKUP_AGE_HOURS} hours"

echo "Verification completed successfully"
