#!/usr/bin/env bash
# WordPress install via WP-CLI.
# Вызывается из server/services/deployer.js (Фаза 4 — реальный deploy)
# или из n8n workflow.
#
# Usage:
#   DOMAIN=chainiki-expert.ru \
#   DB_NAME=chainiki_db DB_USER=chainiki_u DB_PASS=secret \
#   WP_TITLE="Электрочайники Эксперт" \
#   WP_DESCRIPTION="Обзоры и сравнения электрочайников" \
#   WP_ADMIN_USER=admin WP_ADMIN_PASS=ChangeMe! WP_ADMIN_EMAIL=admin@example.com \
#   THEME=astra \
#   CATEGORIES="Стеклянные|Металлические|С терморегулятором" \
#   bash deploy-wp.sh

set -euo pipefail

: "${DOMAIN:?required}"
: "${DB_NAME:?required}"
: "${DB_USER:?required}"
: "${DB_PASS:?required}"
: "${WP_TITLE:?required}"
: "${WP_ADMIN_USER:=admin}"
: "${WP_ADMIN_PASS:?required}"
: "${WP_ADMIN_EMAIL:?required}"
: "${WP_DESCRIPTION:=}"
: "${THEME:=astra}"           # rehub — премиум, ставится отдельно
: "${CATEGORIES:=}"            # разделитель |
: "${WP_PATH:=/var/www/$DOMAIN}"
: "${WEBSERVER_USER:=www-data}"

log() { echo "[deploy-wp] $*"; }

log "1/9 Проверка зависимостей"
command -v wp    >/dev/null || { echo "wp-cli не установлен"; exit 1; }
command -v mysql >/dev/null || { echo "mysql клиент не установлен"; exit 1; }

log "2/9 Создание БД $DB_NAME"
mysql -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';"
mysql -e "GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

log "3/9 Каталог $WP_PATH"
mkdir -p "$WP_PATH"
chown -R "$WEBSERVER_USER:$WEBSERVER_USER" "$WP_PATH"

log "4/9 Скачивание WordPress"
sudo -u "$WEBSERVER_USER" wp core download --path="$WP_PATH" --locale=ru_RU

log "5/9 wp-config.php"
sudo -u "$WEBSERVER_USER" wp config create \
  --path="$WP_PATH" \
  --dbname="$DB_NAME" --dbuser="$DB_USER" --dbpass="$DB_PASS" \
  --dbhost=localhost --dbcharset=utf8mb4 --dbcollate=utf8mb4_unicode_ci

log "6/9 Установка WordPress"
sudo -u "$WEBSERVER_USER" wp core install \
  --path="$WP_PATH" \
  --url="https://$DOMAIN" \
  --title="$WP_TITLE" \
  --admin_user="$WP_ADMIN_USER" \
  --admin_password="$WP_ADMIN_PASS" \
  --admin_email="$WP_ADMIN_EMAIL" \
  --skip-email

log "7/9 Базовые настройки"
sudo -u "$WEBSERVER_USER" wp --path="$WP_PATH" rewrite structure '/%postname%/' --hard
sudo -u "$WEBSERVER_USER" wp --path="$WP_PATH" option update blogdescription "$WP_DESCRIPTION"
sudo -u "$WEBSERVER_USER" wp --path="$WP_PATH" option update timezone_string "Europe/Moscow"
sudo -u "$WEBSERVER_USER" wp --path="$WP_PATH" option update default_comment_status closed

log "8/9 Тема: $THEME"
sudo -u "$WEBSERVER_USER" wp --path="$WP_PATH" theme install "$THEME" --activate || log "  ⚠️ тема не найдена в .org repo (premium?) — установите вручную"

# Базовые плагины (только бесплатные из .org). Content Egg, REHub — premium, ставятся вручную.
log "9/9 Плагины (free)"
sudo -u "$WEBSERVER_USER" wp --path="$WP_PATH" plugin install \
  classic-editor seo-by-rank-math wordpress-seo wp-fastest-cache \
  --activate || log "  ⚠️ часть плагинов могла не установиться"

# Категории
if [[ -n "$CATEGORIES" ]]; then
  log "+ Категории"
  IFS='|' read -ra CATS <<< "$CATEGORIES"
  for cat in "${CATS[@]}"; do
    sudo -u "$WEBSERVER_USER" wp --path="$WP_PATH" term create category "$cat" 2>/dev/null || true
  done
fi

log "✅ Готово: https://$DOMAIN"
log "Admin: https://$DOMAIN/wp-admin/  (user: $WP_ADMIN_USER)"
log ""
log "Дальнейшие шаги:"
log "  - certbot --nginx -d $DOMAIN  (SSL)"
log "  - Установить REHub / Content Egg вручную через wp-admin"
log "  - Импортировать первые статьи из AI-плана"
