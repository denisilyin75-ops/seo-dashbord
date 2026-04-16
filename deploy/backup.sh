#!/usr/bin/env bash
# Бэкап SQLite (через .backup чтобы не блокировать запись).
# Хранит последние N бэкапов, остальные удаляет.
#
# Cron: 0 4 * * * /var/www/seo-command-center/deploy/backup.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/seo-command-center}"
DB="${DB:-$APP_DIR/data/seo.sqlite}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/data/backups}"
KEEP="${KEEP:-30}"   # дней хранения

if [[ ! -f "$DB" ]]; then
  echo "[backup] DB not found: $DB" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
TS=$(date -u +%Y%m%d-%H%M%S)
DEST="$BACKUP_DIR/seo-$TS.sqlite"

# Hot backup через sqlite3 .backup (атомарно, безопасно для WAL)
sqlite3 "$DB" ".backup '$DEST'"

# Сжатие
gzip -9 "$DEST"
echo "[backup] $(date -u +%FT%TZ) → $DEST.gz ($(du -h "$DEST.gz" | cut -f1))"

# Ротация
find "$BACKUP_DIR" -name "seo-*.sqlite.gz" -mtime +"$KEEP" -delete

# Опционально: загрузка в S3 / rclone
# rclone copy "$DEST.gz" remote:seo-backups/
