#!/bin/bash
DB_PATH="/opt/containers/artist-vault/data/dev.db"
BACKUP_DIR="/opt/containers/artist-vault/data/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_DIR/dev.db.$DATE" && echo "✅ [$DATE] Backup created"
find "$BACKUP_DIR" -name "dev.db.*" -mtime +30 -delete
echo "Last 3 backups:"
ls -lhS "$BACKUP_DIR"/dev.db.* 2>/dev/null | head -3
