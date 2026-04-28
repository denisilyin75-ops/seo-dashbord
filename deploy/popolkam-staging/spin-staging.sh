#!/usr/bin/env bash
# spin-staging.sh — поднимает чистый WordPress-staging для popolkam,
# ставит REHub theme + child, активирует, готовит к demo-импорту.
#
# Идемпотентно: если контейнеры уже подняты — пере-исполняет только wp-cli шаги.
#
# Зависимости: docker, docker compose. Запускать на VPS из этой директории.
#
# Use:
#   cd /opt/popolkam-staging
#   bash spin-staging.sh

set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f rehub-theme.zip ]]; then
  echo "FATAL: rehub-theme.zip не найден. Положи в эту директорию."
  exit 1
fi

echo "===> 1. Поднимаю docker-compose stack"
docker compose up -d

echo "===> 2. Жду MariaDB до healthy (макс 60 сек)"
for i in {1..30}; do
  if docker exec popolkam-staging-db mariadb -uroot -pstg_root_8e3a91f2c5d7 -e "SELECT 1" >/dev/null 2>&1; then
    echo "    DB ready"
    break
  fi
  sleep 2
done

echo "===> 3. Жду WordPress контейнер (макс 30 сек)"
for i in {1..15}; do
  if docker exec popolkam-staging-wp test -f /var/www/html/wp-config.php 2>/dev/null; then
    echo "    WP filesystem ready"
    break
  fi
  sleep 2
done

WPCLI() {
  docker exec popolkam-staging-wpcli wp --allow-root "$@"
}

echo "===> 4. wp core install (если ещё не установлен)"
if ! WPCLI core is-installed --quiet 2>/dev/null; then
  WPCLI core install \
    --url=https://popolkam-staging.bonaka.app \
    --title="Popolkam Staging" \
    --admin_user=admin \
    --admin_password=stg_admin_a8f3c2b1 \
    --admin_email=admin@popolkam-staging.bonaka.app \
    --skip-email
  echo "    core installed"
else
  echo "    core уже установлен — пропускаю"
fi

echo "===> 5. Установка REHub parent theme из zip"
if ! WPCLI theme is-installed rehub-theme; then
  WPCLI theme install /tmp/rehub-theme.zip
fi

echo "===> 6. Установка REHub child theme"
if [[ -f rehub-blankchild.zip ]] && ! WPCLI theme is-installed rehub-blankchild; then
  WPCLI theme install /tmp/rehub-blankchild.zip
fi

echo "===> 7. Активация child темы"
if WPCLI theme is-installed rehub-blankchild; then
  WPCLI theme activate rehub-blankchild
else
  WPCLI theme activate rehub-theme
fi

echo "===> 8. Установка плагинов для импорта demo + последующего экспорта"
PLUGINS=(
  one-click-demo-import       # OCDI — REHub использует его для demo
  customizer-export-import    # экспорт Customizer.dat
  widget-importer-exporter    # экспорт widgets.wie
  wordpress-importer          # для XML контента (если нужен)
)
for p in "${PLUGINS[@]}"; do
  if ! WPCLI plugin is-installed "$p"; then
    WPCLI plugin install "$p" --activate
  else
    WPCLI plugin activate "$p" 2>/dev/null || true
  fi
done

echo
echo "==============================================="
echo " STAGING ГОТОВ"
echo "==============================================="
echo " URL:     https://popolkam-staging.bonaka.app/wp-admin"
echo " Login:   admin"
echo " Pass:    stg_admin_a8f3c2b1"
echo
echo " СЛЕДУЮЩИЙ ШАГ — РУЧНОЙ (1 клик в staging admin):"
echo " 1. Зайти в Appearance → Import Demo Data (REHub)"
echo " 2. Выбрать 'Magazine' skin → Import"
echo " 3. Дождаться завершения (~3-5 мин)"
echo
echo " Когда demo импортирован — запусти:"
echo "   bash export-rehub.sh"
echo "==============================================="
