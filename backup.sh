#!/bin/bash
# Artist Vault SQLite backup  —  safe hot copy (SQLite WAL mode tolerates cp)
DB_SRC="/opt/containers/artist-vault/data/dev.db"
BACKUP_DIR="/opt/containers/artist-vault/data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dev_${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"
cp "$DB_SRC" "$BACKUP_FILE"

if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK  $BACKUP_FILE  ($(du -sh $BACKUP_FILE | cut -f1))"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL — backup missing or empty"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Keep latest symlink
ln -sf "$BACKUP_FILE" "$BACKUP_DIR/dev_latest.db"

# Rotate — keep last 30
ls -t "$BACKUP_DIR"/dev_2*.db 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rotation done. Stored: $(ls $BACKUP_DIR/dev_2*.db 2>/dev/null | wc -l) backups"
