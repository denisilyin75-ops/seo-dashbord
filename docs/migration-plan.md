# Migration Plan — быстрая миграция на новый сервер

> **Статус:** текущий сервер `5.129.245.98` — временный. План нужен чтобы
> мигрировать быстро (в окне <2 часов downtime) при необходимости.
>
> **Проверять актуальность** раз в месяц. Обновлять после каждого значимого
> изменения infra (новый Docker-сервис / плагин / мутации конфигов).

---

## 0. Что живёт на текущем сервере `5.129.245.98`

### Docker-контейнеры (проверка: `docker ps`)

| Контейнер | Что это | Volumes / bind mounts | Critical data |
|-----------|---------|----------------------|---------------|
| `scc` | SCC backend + frontend | `scc-data:/app/data` | `seo.sqlite` (вся продовая БД SCC) |
| `wp-popolkam` | WordPress popolkam.ru | `wp-data:/var/www/html` | wp-content/, uploads, mu-plugins |
| `wp-popolkam-db` | MariaDB popolkam | `db-data:/var/lib/mysql` | WP БД |
| `dokploy-traefik` | Reverse proxy + ACME | `/etc/dokploy/traefik/` | acme.json (сертификаты — можно не переносить, Traefik перевыпустит) |
| `dokploy-*` | Dokploy сам | / | Можно пересоздать если нужно |
| `hs-*` | Heat-Sync (отдельный проект) | ... | Не трогаем |
| `affiliate-dashboard`, `bonaka-n8n-*` | Прочее | ... | Отдельные проекты |
| `mosquitto`, `mqtt-acme` | MQTT (Heat-Sync) | ... | Не трогаем |

### Домены на SCC-стек

| Домен | → Контейнер | DNS provider |
|-------|-------------|--------------|
| `cmd.bonaka.app` | `scc` | Timeweb DNS |
| `popolkam.ru` + `www.popolkam.ru` | `wp-popolkam` | Timeweb DNS |
| `mob.bonaka.app`, `disp.bonaka.app`, `mqtt.bonaka.app` | (Heat-Sync) | Отдельный проект, не мигрируем вместе |

### Файловая система

| Путь | Что там |
|------|---------|
| `/opt/scc/` | docker-compose.yml + .env SCC |
| `/opt/wp-popolkam/` | docker-compose.yml + бэкапы `.sql` |
| `/etc/dokploy/traefik/dynamic/` | Traefik file-provider configs |
| `/etc/dokploy/traefik/dynamic/acme.json` | SSL certs (кэш, можно не переносить) |

### Что НЕ на этом сервере (живёт отдельно)

- **4beg.ru** — на Timeweb (отдельный хостинг), мигрируется отдельным планом когда решим
- **Git repo** — на GitHub (`denisilyin75-ops/seo-dashbord`), всегда доступен
- **Domains DNS** — в Timeweb DNS, меняются через веб-панель регистратора

---

## 1. Подготовка нового сервера

### Требования
- Ubuntu 22.04+ / Debian 12+
- 4+ GB RAM (минимум для SCC + WP + MariaDB)
- 40+ GB диск
- Root SSH доступ
- IPv4 публичный (IPv6 опционально)

### Установить (одноразово)
```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sh

# Dokploy (если используем) — или только Docker + Traefik
curl -sSL https://dokploy.com/install.sh | sh

# Создать external-network
docker network create web
```

Либо разворачиваем Traefik вручную без Dokploy — в `deploy/traefik-standalone.yml` (добавить если понадобится).

---

## 2. Процедура миграции — пошагово

### Шаг 1. Бэкап на старом сервере (`5.129.245.98`)

```bash
# Создаём общий каталог бэкапа
mkdir -p /tmp/migrate/{scc,wp-popolkam}

# --- SCC ---
# Копируем весь data-volume (SQLite + прочее)
docker cp scc:/app/data /tmp/migrate/scc/data

# .env SCC (там ключи!)
cp /opt/scc/.env /tmp/migrate/scc/env
cp /opt/scc/docker-compose.yml /tmp/migrate/scc/docker-compose.yml

# --- WP popolkam ---
# БД (mariadb-dump внутри контейнера)
DB_ROOT_PASS=$(grep MYSQL_ROOT_PASSWORD /opt/wp-popolkam/docker-compose.yml | awk '{print $2}')
docker exec wp-popolkam-db mariadb-dump -uroot -p"$DB_ROOT_PASS" popolkam > /tmp/migrate/wp-popolkam/db.sql

# wp-content (uploads + plugins + themes + mu-plugins)
docker cp wp-popolkam:/var/www/html /tmp/migrate/wp-popolkam/html

# docker-compose для wp-popolkam
cp /opt/wp-popolkam/docker-compose.yml /tmp/migrate/wp-popolkam/docker-compose.yml

# Создаём один архив
cd /tmp && tar czf migrate-$(date +%Y%m%d-%H%M%S).tar.gz migrate/

ls -lh /tmp/migrate-*.tar.gz
```

### Шаг 2. Копирование на новый сервер

```bash
# С локальной машины или через rsync прямо server-to-server
rsync -avz -e ssh root@OLD_IP:/tmp/migrate-*.tar.gz /tmp/
# или: scp root@OLD_IP:/tmp/migrate-*.tar.gz root@NEW_IP:/tmp/

# На новом сервере:
cd /tmp && tar xzf migrate-*.tar.gz
```

### Шаг 3. Восстановление SCC на новом сервере

```bash
# Склонировать repo
git clone https://github.com/denisilyin75-ops/seo-dashbord.git /opt/scc-repo

# Создать /opt/scc
mkdir -p /opt/scc
cp /tmp/migrate/scc/docker-compose.yml /opt/scc/
cp /tmp/migrate/scc/env /opt/scc/.env

# Восстановить data volume
docker compose -f /opt/scc/docker-compose.yml up -d --no-start scc
docker cp /tmp/migrate/scc/data scc:/app/
docker exec scc chown -R root:root /app/data

# Запустить
docker compose -f /opt/scc/docker-compose.yml up -d

# Проверить
curl -I http://localhost:3001/api/health
```

### Шаг 4. Восстановление popolkam WP

```bash
# Создать /opt/wp-popolkam
mkdir -p /opt/wp-popolkam
cp /tmp/migrate/wp-popolkam/docker-compose.yml /opt/wp-popolkam/

# Запустить БД
docker compose -f /opt/wp-popolkam/docker-compose.yml up -d db

# Импорт дампа
sleep 10  # подождать пока MariaDB стартует
DB_ROOT_PASS=$(grep MYSQL_ROOT_PASSWORD /opt/wp-popolkam/docker-compose.yml | awk '{print $2}')
docker exec -i wp-popolkam-db mariadb -uroot -p"$DB_ROOT_PASS" popolkam < /tmp/migrate/wp-popolkam/db.sql

# Запустить WP
docker compose -f /opt/wp-popolkam/docker-compose.yml up -d wordpress

# Восстановить /var/www/html (uploads, plugins, mu-plugins)
docker cp /tmp/migrate/wp-popolkam/html/. wp-popolkam:/var/www/html/
docker exec wp-popolkam chown -R www-data:www-data /var/www/html

# Проверить
docker exec wp-popolkam wp --allow-root option get siteurl
```

### Шаг 5. Traefik + сертификаты

Если новый сервер использует Dokploy: сертификаты выпустятся автоматически
после того как DNS обновится (шаг 6).

Если standalone Traefik: положить docker-compose с Traefik из `deploy/`
и external-network `web`.

### Шаг 6. Сменить DNS A-записи

**В Timeweb DNS панели:**
- `popolkam.ru` A → **NEW_SERVER_IP**
- `www.popolkam.ru` A → **NEW_SERVER_IP**
- `cmd.bonaka.app` A → **NEW_SERVER_IP**

TTL был 600 (10 минут) → обновится за 10-15 мин. Возможно надо **предварительно**
снизить TTL до 60 за сутки до миграции для быстрого переключения.

### Шаг 7. Проверка

```bash
# Сайты отвечают
curl -I https://popolkam.ru/
curl -I https://cmd.bonaka.app/

# SSL корректен
openssl s_client -servername popolkam.ru -connect popolkam.ru:443 < /dev/null 2>&1 | grep 'subject='

# SCC API отвечает
curl -H "Authorization: Bearer SeoCmd2026!" https://cmd.bonaka.app/api/agents | head -c 200
```

### Шаг 8. Smoke tests

Через UI:
- [ ] https://cmd.bonaka.app/ — логин работает
- [ ] Dashboard видит 2 сайта
- [ ] Daily Brief загружается
- [ ] Agents страница — 8 агентов с метаданными
- [ ] Запустить `metrics_sync` → success
- [ ] https://popolkam.ru/ — открывается, топ-10 статья работает
- [ ] Калькулятор TCO рендерится на странице
- [ ] https://popolkam.ru/wp-admin/ — логин работает

---

## 3. Оценка downtime

- DNS propagation: 10-15 мин при TTL=600, 1-2 мин при TTL=60
- Миграция данных: 15-30 мин (зависит от размера uploads)
- Restart + проверки: 10 мин
- **Итого:** ~1 час при готовом новом сервере

**Если новый сервер не готов:** +30-60 мин на установку Docker + Dokploy.

---

## 4. Автоматизация — будущее

Пока план — **ручной runbook**. Когда будет время, автоматизировать в
`server/scripts/migrate.sh`:

```bash
#!/usr/bin/env bash
# usage: ./migrate.sh old_server_ip new_server_ip
# 1. Backup remote old server
# 2. Rsync backup to new
# 3. Restore all containers
# 4. Smoke tests
```

---

## 5. Disaster Recovery (не миграция, а восстановление)

Если старый сервер **умер внезапно** и у нас **нет свежего бэкапа**:

### Что восстановится из Git
- Весь SCC код (включая config provision-скриптов, плагин калькулятора, docs)
- `.env.example` → создать `.env` заново с актуальными ключами (OPENROUTER_API_KEY — достать из OpenRouter dashboard)

### Что НЕ восстановится из Git
- **SCC БД (seo.sqlite)** — sites, articles, plan, agents configs, daily_briefs, revisions, content_health
- **popolkam WP БД** — все страницы, посты, настройки REHub, контент калькуляторов, media uploads

### Defense in depth — регулярные бэкапы

**Сейчас:** ручные (есть `deploy/backup.sh` для SCC SQLite).

**Планируем (Stage B):**
- Cron ежедневного бэкапа на новом сервере:
  - SQLite dump каждые 6 часов → local retention 7 дней
  - MariaDB dump каждую ночь → local retention 14 дней
  - Еженедельный upload в S3-compatible (Backblaze B2 / Cloudflare R2 / Wasabi) → retention 90 дней
  - Еженедельный упаковка уploads → snapshot в облачное хранилище

**Это P1 задача в backlog** (добавить).

---

## 6. Частичные миграции

### Если нужно перенести только SCC (без WP)
- Шаг 1 — только SCC часть
- Шаг 3, 6 (DNS cmd.bonaka.app), 7-8 — только SCC проверки

### Если нужно перенести только popolkam
- Шаг 1 — только WP часть
- Шаг 4, 6 (DNS popolkam.ru + www), 7-8 — только WP проверки

---

## 7. Post-migration checklist

- [ ] Старый сервер остаётся читаемым минимум 7 дней (на случай rollback)
- [ ] DNS TTL вернуть к 600 или 1200 (снижали до 60 для миграции)
- [ ] Обновить этот документ: новый IP в разделе 0
- [ ] Запись в `devlog.md`: дата миграции, downtime, что сработало / не сработало
- [ ] Если какие-то конфиги поменялись — коммит в репо

---

## 8. Заметки

- **Traefik acme.json** можно не переносить — Traefik перевыпустит LE-сертификаты после DNS-переключения (первый выпуск занимает 30-60 секунд)
- **Docker volumes** надёжнее переносить через `docker cp` + смена owner, чем через `-v` bind-mount (избегаем permissions issues)
- **Mosquitto / MQTT / Heat-Sync** — отдельный проект, мигрируется автономно по своему плану (см. Heat-Sync docs)
- Если на новом сервере **тот же Dokploy** — добавить external-network `web` и всё встанет без ручного Traefik-конфига

---

_Документ актуален на 2026-04-18. При изменении infra (новый контейнер / volume / домен) — обновить разделы 0 и 7._
