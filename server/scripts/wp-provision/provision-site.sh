#!/usr/bin/env bash
# Идемпотентный provisioning WordPress-сайта в Docker.
# Запускается на сервере (где Docker + Traefik). Из любого места.
#
# Требует: SSH-доступ к серверу, docker, подключённую external сеть `web`.
#
# Использование:
#   source presets/popolkam.env && bash provision-site.sh
# либо:
#   DOMAIN=mydomain.ru SITE_SLUG=mydomain ... bash provision-site.sh
#
# Идемпотентность:
#   - Если контейнер уже существует — docker compose up -d его не пересоздаёт
#   - wp core install: проверяет, установлен ли WP (is-installed)
#   - Плагины/темы/категории/меню: используются 2>/dev/null || true где уместно
#   - Запуск повторно на уже настроенном сайте безопасен

set -euo pipefail

# ============ обязательные переменные пресета ============
: "${DOMAIN:?DOMAIN required, например popolkam.ru}"
: "${SITE_SLUG:?SITE_SLUG required, например popolkam}"
: "${SITE_TITLE:?SITE_TITLE required}"
: "${SITE_DESCRIPTION:?SITE_DESCRIPTION required}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL required}"

# ============ опциональные ============
: "${ADMIN_USER:=admin_${SITE_SLUG}}"
: "${ADMIN_PASS:=$(openssl rand -base64 12 | tr -d '/+=' | head -c 16)}"
: "${DB_ROOT_PASS:=$(openssl rand -hex 16)}"
: "${DB_PASS:=$(openssl rand -hex 16)}"
: "${DB_NAME:=${SITE_SLUG}}"
: "${DB_USER:=wp_${SITE_SLUG}}"
: "${LOCALE:=ru_RU}"
: "${TIMEZONE:=Europe/Moscow}"
: "${WP_IMAGE:=wordpress:6.9-php8.3-apache}"
: "${DB_IMAGE:=mariadb:11}"
: "${WP_DIR:=/opt/wp-${SITE_SLUG}}"
: "${CONTAINER:=wp-${SITE_SLUG}}"
: "${DB_CONTAINER:=wp-${SITE_SLUG}-db}"
: "${TRAEFIK_NETWORK:=web}"
: "${TRAEFIK_CERT_RESOLVER:=letsencrypt}"
# Категории через | (pipe): "Кофемашины|slug=kofemashiny|desc=Рожковые...;Кухонная техника|slug=kuhnya|desc=..."
# Формат строки: NAME|slug=SLUG|desc=DESCRIPTION
# Разделитель между категориями — ';'
: "${CATEGORIES:=}"
# Плагины через пробел (бесплатные из .org)
: "${PLUGINS:=seo-by-rank-math woocommerce wordpress-importer}"
# Плагины для удаления (дефолтные WordPress)
: "${REMOVE_PLUGINS:=akismet hello}"
# Обновлять WordPress до последней версии?
: "${UPDATE_WP_CORE:=1}"
# Создавать статичную главную?
: "${CREATE_STATIC_HOMEPAGE:=1}"
: "${HOMEPAGE_TITLE:=${SITE_TITLE}}"
: "${HOMEPAGE_CONTENT:=${SITE_DESCRIPTION}}"
: "${BLOG_PAGE_TITLE:=Обзоры}"
: "${BLOG_PAGE_SLUG:=obzory}"
: "${MENU_NAME:=Главное меню}"

log() { echo "[$(date +%H:%M:%S)] $*"; }
wp_exec() { docker exec "$CONTAINER" wp --allow-root "$@"; }

# ============ 1. Каталог и docker-compose.yml ============
log "1/10  Каталог $WP_DIR"
mkdir -p "$WP_DIR"

# Флаг: первая установка или повторный запуск
FIRST_INSTALL=0

if [[ ! -f "$WP_DIR/docker-compose.yml" ]]; then
  FIRST_INSTALL=1
  log "      Создаю docker-compose.yml"
  cat > "$WP_DIR/docker-compose.yml" <<YAML
services:
  db:
    image: ${DB_IMAGE}
    container_name: ${DB_CONTAINER}
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASS}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASS}
    volumes:
      - db-data:/var/lib/mysql
    networks:
      - internal

  wordpress:
    image: ${WP_IMAGE}
    container_name: ${CONTAINER}
    restart: unless-stopped
    depends_on:
      - db
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_NAME: ${DB_NAME}
      WORDPRESS_DB_USER: ${DB_USER}
      WORDPRESS_DB_PASSWORD: ${DB_PASS}
      WORDPRESS_TABLE_PREFIX: wp_
    volumes:
      - wp-data:/var/www/html
    networks:
      - internal
      - ${TRAEFIK_NETWORK}
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=${TRAEFIK_NETWORK}"
      - "traefik.http.routers.${SITE_SLUG}.rule=Host(\`${DOMAIN}\`) || Host(\`www.${DOMAIN}\`)"
      - "traefik.http.routers.${SITE_SLUG}.entrypoints=websecure"
      - "traefik.http.routers.${SITE_SLUG}.tls=true"
      - "traefik.http.routers.${SITE_SLUG}.tls.certresolver=${TRAEFIK_CERT_RESOLVER}"
      - "traefik.http.routers.${SITE_SLUG}.service=${SITE_SLUG}"
      - "traefik.http.routers.${SITE_SLUG}-http.rule=Host(\`${DOMAIN}\`) || Host(\`www.${DOMAIN}\`)"
      - "traefik.http.routers.${SITE_SLUG}-http.entrypoints=web"
      - "traefik.http.routers.${SITE_SLUG}-http.middlewares=${SITE_SLUG}-redirect"
      - "traefik.http.middlewares.${SITE_SLUG}-redirect.redirectscheme.scheme=https"
      - "traefik.http.middlewares.${SITE_SLUG}-redirect.redirectscheme.permanent=true"
      - "traefik.http.services.${SITE_SLUG}.loadbalancer.server.port=80"

volumes:
  db-data:
  wp-data:

networks:
  internal:
  ${TRAEFIK_NETWORK}:
    external: true
YAML
fi

# ============ 2. Запуск контейнеров ============
log "2/10  docker compose up"
(cd "$WP_DIR" && docker compose up -d)

# Ждём, пока контейнер WP и MariaDB полностью стартанут
for i in {1..30}; do
  if docker exec "$CONTAINER" true 2>/dev/null && docker exec "$DB_CONTAINER" healthcheck.sh --connect 2>/dev/null; then
    break
  fi
  if docker exec "$CONTAINER" true 2>/dev/null && docker exec "$DB_CONTAINER" mariadb-admin ping -p"$DB_ROOT_PASS" --silent 2>/dev/null; then
    break
  fi
  sleep 2
done

# ============ 3. PHP limits ============
log "3/10  PHP upload limits (64M)"
docker exec "$CONTAINER" bash -c 'cat > /usr/local/etc/php/conf.d/uploads.ini <<EOF
upload_max_filesize = 64M
post_max_size = 64M
max_execution_time = 300
memory_limit = 256M
EOF' && docker restart "$CONTAINER" >/dev/null
sleep 5

# ============ 4. WP-CLI ============
log "4/10  WP-CLI"
if ! docker exec "$CONTAINER" which wp >/dev/null 2>&1; then
  docker exec "$CONTAINER" bash -c '
    curl -sO https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar &&
    chmod +x wp-cli.phar &&
    mv wp-cli.phar /usr/local/bin/wp
  '
fi
wp_exec --version

# ============ 5. WordPress core install ============
log "5/10  WordPress core install"
if wp_exec core is-installed 2>/dev/null; then
  log "      уже установлен — пропускаю"
else
  wp_exec core install \
    --url="https://${DOMAIN}" \
    --title="${SITE_TITLE}" \
    --admin_user="${ADMIN_USER}" \
    --admin_password="${ADMIN_PASS}" \
    --admin_email="${ADMIN_EMAIL}" \
    --locale="${LOCALE}" \
    --skip-email
fi

# ============ 6. Обновление ядра + базовые настройки ============
if [[ "${UPDATE_WP_CORE}" == "1" ]]; then
  log "6/10  Обновление ядра"
  wp_exec core update >/dev/null 2>&1 || true
  wp_exec core update-db >/dev/null 2>&1 || true
fi

log "      Базовые настройки"
wp_exec rewrite structure '/%category%/%postname%/' --hard >/dev/null
wp_exec option update timezone_string "${TIMEZONE}"
wp_exec option update date_format "d.m.Y"
wp_exec option update time_format "H:i"
wp_exec option update default_comment_status closed
wp_exec option update default_ping_status closed
wp_exec option update blogdescription "${SITE_DESCRIPTION}"

# Русская локаль (если ещё не)
wp_exec language core install "${LOCALE}" >/dev/null 2>&1 || true
wp_exec site switch-language "${LOCALE}" >/dev/null 2>&1 || true

# Удалить дефолтные Hello World / Sample Page / Privacy
for POST_ID in 1 2 3; do
  wp_exec post delete "$POST_ID" --force >/dev/null 2>&1 || true
done

# Удалить дефолтную категорию Uncategorized
wp_exec term delete category 1 >/dev/null 2>&1 || true

# ============ 7. Плагины ============
log "7/10  Плагины"

# Удалить дефолтные
for PLG in $REMOVE_PLUGINS; do
  wp_exec plugin delete "$PLG" >/dev/null 2>&1 || true
done

# Установить и активировать нужные
for PLG in $PLUGINS; do
  if ! wp_exec plugin is-installed "$PLG" 2>/dev/null; then
    wp_exec plugin install "$PLG" --activate || log "      ⚠️ $PLG не установлен"
  else
    wp_exec plugin activate "$PLG" >/dev/null 2>&1 || true
  fi
done

# ============ 8. Категории ============
if [[ -n "$CATEGORIES" ]]; then
  log "8/10  Категории"
  IFS=';' read -ra CAT_LIST <<< "$CATEGORIES"
  for CAT_LINE in "${CAT_LIST[@]}"; do
    CAT_LINE=$(echo "$CAT_LINE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [[ -z "$CAT_LINE" ]] && continue
    # Парсинг NAME|slug=SLUG|desc=DESC
    CAT_NAME=$(echo "$CAT_LINE" | cut -d'|' -f1)
    CAT_SLUG=$(echo "$CAT_LINE" | grep -oE 'slug=[^|]+' | cut -d= -f2 || echo "")
    CAT_DESC=$(echo "$CAT_LINE" | grep -oE 'desc=[^|]+' | cut -d= -f2 || echo "")

    if wp_exec term list category --slug="$CAT_SLUG" --field=term_id 2>/dev/null | grep -q .; then
      log "      «$CAT_NAME» уже есть — пропуск"
    else
      ARGS=(term create category "$CAT_NAME")
      [[ -n "$CAT_SLUG" ]] && ARGS+=(--slug="$CAT_SLUG")
      [[ -n "$CAT_DESC" ]] && ARGS+=(--description="$CAT_DESC")
      wp_exec "${ARGS[@]}" >/dev/null
      log "      «$CAT_NAME» создана"
    fi
  done
else
  log "8/10  Категории — пропуск (CATEGORIES пусто)"
fi

# ============ 9. Главная + меню ============
if [[ "${CREATE_STATIC_HOMEPAGE}" == "1" ]]; then
  log "9/10  Статичная главная"

  # Сначала проверяем текущий page_on_front (может быть уже установлен)
  CURRENT_HOME=$(wp_exec option get page_on_front 2>/dev/null | tr -d '\r' || echo "0")
  HOME_ID=""
  if [[ "$CURRENT_HOME" != "0" ]] && [[ -n "$CURRENT_HOME" ]]; then
    # Проверяем, что страница ещё существует
    if wp_exec post get "$CURRENT_HOME" --field=ID >/dev/null 2>&1; then
      HOME_ID="$CURRENT_HOME"
      log "      главная уже настроена ID=$HOME_ID"
    fi
  fi

  if [[ -z "$HOME_ID" ]]; then
    HOME_ID=$(wp_exec post create \
      --post_type=page \
      --post_status=publish \
      --post_title="${HOMEPAGE_TITLE}" \
      --post_name="${SITE_SLUG}-home" \
      --post_content="${HOMEPAGE_CONTENT}" \
      --porcelain)
    log "      главная создана ID=$HOME_ID"
  fi

  # Блог-страница по slug
  BLOG_ID=$(wp_exec post list --post_type=page --name="${BLOG_PAGE_SLUG}" --field=ID --format=ids 2>/dev/null | tr -d '\r' | head -1)
  if [[ -z "$BLOG_ID" ]]; then
    BLOG_ID=$(wp_exec post create \
      --post_type=page \
      --post_status=publish \
      --post_title="${BLOG_PAGE_TITLE}" \
      --post_name="${BLOG_PAGE_SLUG}" \
      --porcelain)
    log "      страница обзоров создана ID=$BLOG_ID"
  else
    log "      страница обзоров уже есть ID=$BLOG_ID"
  fi

  wp_exec option update show_on_front page >/dev/null
  wp_exec option update page_on_front "$HOME_ID" >/dev/null
  wp_exec option update page_for_posts "$BLOG_ID" >/dev/null

  # Меню — проверяем по точному имени через wp menu list JSON
  MENU_ID=$(wp_exec menu list --format=json 2>/dev/null | \
    docker exec -i "$CONTAINER" php -r "
      \$j = json_decode(file_get_contents('php://stdin'), true);
      foreach (\$j as \$m) { if (\$m['name'] === '${MENU_NAME}') { echo \$m['term_id']; exit; } }
    " 2>/dev/null || echo "")

  if [[ -z "$MENU_ID" ]]; then
    MENU_ID=$(wp_exec menu create "${MENU_NAME}" --porcelain)
    log "      меню создано ID=$MENU_ID"

    wp_exec menu item add-post "$MENU_ID" "$HOME_ID" --title="Главная" >/dev/null

    # Категории в меню
    if [[ -n "$CATEGORIES" ]]; then
      IFS=';' read -ra CAT_LIST <<< "$CATEGORIES"
      for CAT_LINE in "${CAT_LIST[@]}"; do
        CAT_SLUG=$(echo "$CAT_LINE" | grep -oE 'slug=[^|]+' | cut -d= -f2 || echo "")
        [[ -z "$CAT_SLUG" ]] && continue
        TERM_ID=$(wp_exec term list category --slug="$CAT_SLUG" --field=term_id 2>/dev/null || echo "")
        [[ -n "$TERM_ID" ]] && wp_exec menu item add-term "$MENU_ID" category "$TERM_ID" >/dev/null || true
      done
    fi

    wp_exec menu item add-post "$MENU_ID" "$BLOG_ID" --title="${BLOG_PAGE_TITLE}" >/dev/null
    wp_exec menu location assign "$MENU_ID" primary-menu >/dev/null 2>&1 || \
      wp_exec menu location assign "$MENU_ID" primary >/dev/null 2>&1 || \
      log "      ⚠️ не нашёл primary menu location — привяжи вручную"
  else
    log "      меню уже есть ID=$MENU_ID — пропуск"
  fi

  # Снести дефолтные виджеты
  wp_exec widget reset --all >/dev/null 2>&1 || true
fi

# ============ 10. Rewrite + Application Password ============
log "10/10 Финализация"
wp_exec rewrite flush --hard >/dev/null

# Application Password для SCC: создаём только если нет "SCC Integration" у этого юзера
APP_PASS=""
HAS_APP_PASS=$(wp_exec user application-password list "${ADMIN_USER}" --fields=name --format=csv 2>/dev/null | grep -c "SCC Integration" || echo "0")
if [[ "${HAS_APP_PASS}" -eq 0 ]]; then
  APP_PASS=$(wp_exec user application-password create "${ADMIN_USER}" "SCC Integration" --porcelain 2>/dev/null || echo "")
fi

echo ""
echo "════════════════════════════════════════════════════"
if [[ "${FIRST_INSTALL}" -eq 1 ]]; then
  echo " ✅  $DOMAIN развёрнут (первая установка)"
  echo "════════════════════════════════════════════════════"
  echo " Admin URL   : https://${DOMAIN}/wp-admin/"
  echo " Admin user  : ${ADMIN_USER}"
  echo " Admin pass  : ${ADMIN_PASS}"
  echo " App Pass    : ${APP_PASS:-(не создан)}"
  echo " WP API      : https://${DOMAIN}/wp-json/wp/v2"
  echo ""
  echo " ⚠️  СОХРАНИТЕ ПАРОЛИ — показываются только сейчас!"
  echo ""
  echo " DB creds (для бэкапов, в ${WP_DIR}/docker-compose.yml):"
  echo "   DB          : ${DB_NAME}"
  echo "   User/Pass   : ${DB_USER} / ${DB_PASS}"
  echo "   Root pass   : ${DB_ROOT_PASS}"
else
  echo " ✅  $DOMAIN — повторный запуск, всё синхронизировано"
  echo "════════════════════════════════════════════════════"
  echo " Admin URL   : https://${DOMAIN}/wp-admin/"
  echo " Admin user  : ${ADMIN_USER}"
  echo " WP API      : https://${DOMAIN}/wp-json/wp/v2"
  if [[ -n "${APP_PASS}" ]]; then
    echo " Новый App Pass: ${APP_PASS}"
    echo " (предыдущий не был найден — создан новый)"
  else
    echo " App Pass    : \"SCC Integration\" уже существует"
  fi
  echo ""
  echo " DB creds — см. ${WP_DIR}/docker-compose.yml"
fi
echo "════════════════════════════════════════════════════"
