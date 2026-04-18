# Scaling Checklist — запуск нового сайта портфеля от 0 до боевого

> Живой документ. Обновляется после каждого успешного запуска. Последнее — 2026-04-18 (aykakchisto.ru).
>
> **Цель:** новый сайт от пустого домена до WP с контентом, SCC-интеграцией и готовой к публикациям темой **за 30-60 минут**.
>
> Фаза 1 — базовая инфра, всё автоматом (скрипты + preset).
> Фаза 2 — платные компоненты (REHub, Content Egg, WP All Import) — руки + лицензии.
> Фаза 3 — наполнение (контент-стратегия, первые 30 статей).

---

## Предпосылки

- [ ] Бриф сайта готов (`docs/legacy-spec/` или custom brief.md)
- [ ] Домен куплен ИЛИ у нас есть временный субдомен
- [ ] DNS A-запись `domain → 5.129.245.98` (+ www CNAME/A)
- [ ] AAAA-запись **отсутствует** (IPv6 не сконфигурен на нашем сервере — backlog P2)
- [ ] Сервер 5.129.245.98 живой (`ssh root@5.129.245.98 true`)

## Фаза 1 — Базовый WP (15-25 минут, скриптами)

### 1.1. Preset

```bash
cp server/scripts/wp-provision/presets/popolkam.env \
   server/scripts/wp-provision/presets/NEW_SITE.env
```

Редактировать:
- `DOMAIN` — реальный домен или `<slug>.bonaka.app` если временно
- `SITE_SLUG` — латиница, без дефисов (станет именем контейнера `wp-<slug>`)
- `SITE_TITLE`, `SITE_DESCRIPTION`, `ADMIN_EMAIL`
- `AUTHOR_NAME`, `BRAND_TAGLINE`
- `CATEGORIES` — в формате `Name|slug=xxx|desc=yyy;Name2|...`
- `PLUGINS` — базовый стек (см. §3.2), **не менять**

### 1.2. Скрипты на прод

```bash
scp -r server/scripts/wp-provision root@5.129.245.98:/tmp/
ssh root@5.129.245.98 "cd /tmp/wp-provision && \
  source presets/NEW_SITE.env && \
  bash provision-site.sh && \
  bash polish-site.sh"
```

`provision-site.sh` сделает (~5-10 мин):
- Docker compose + MariaDB + WP (последний WP core)
- PHP limits (64M upload, 256M memory)
- WP-CLI в контейнер
- Core install с русской локалью
- Плагины из `PLUGINS`
- Категории, главная страница, blog page, меню
- Traefik labels для HTTPS через Let's Encrypt

`polish-site.sh` сделает (~2-3 мин):
- Удаляет Uncategorized и WC-страницы (Shop/Cart/Checkout)
- Описания категорий
- E-E-A-T страницы: About / Contacts / How we test / Privacy / Terms
- Footer меню + footer widgets (если тема поддерживает sidebar `footer-1`)
- Базовая настройка Rank Math

⚠️ Сохранить пароли из stdout — admin_pass показывается только раз.

### 1.3. Проверка

```bash
# DNS до пропагации — через --resolve
ssh root@5.129.245.98 "curl -sSk --resolve DOMAIN:443:5.129.245.98 \
  https://DOMAIN/wp-json/wp/v2/categories?per_page=1 | head -c 200"
```

Ожидаем: JSON с категориями.

## Фаза 2 — Интеграции и лицензии (15-30 минут, руки)

### 2.1. Let's Encrypt cert

Выпускается автоматически при первом HTTPS-запросе. Если NXDOMAIN во время provision — Traefik ретраит на recreate контейнера. Проверить:

```bash
curl -sS -o /dev/null -w "cert_verify=%{ssl_verify_result}\n" https://DOMAIN
```

Ожидаем `cert_verify=0`.

### 2.2. mu-plugins (safe SVG upload)

```bash
ssh root@5.129.245.98 "docker cp wp-popolkam:/var/www/html/wp-content/mu-plugins/allow-svg.php /tmp/ && \
  docker exec wp-NEW_SLUG mkdir -p /var/www/html/wp-content/mu-plugins && \
  docker cp /tmp/allow-svg.php wp-NEW_SLUG:/var/www/html/wp-content/mu-plugins/"
```

### 2.3. Application Password для SCC

```bash
ssh root@5.129.245.98 "docker exec wp-NEW_SLUG wp --allow-root \
  user application-password create ADMIN_USER 'SCC Integration' --porcelain"
```

Сохранить.

### 2.4. Регистрация в SCC

```bash
curl -sS -X POST -H "Authorization: Bearer $AUTH" -H "Content-Type: application/json" \
  -d '{"name":"DOMAIN", "market":"RU", "niche":"...", "status":"setup",
       "wp_api_url":"https://DOMAIN/wp-json/wp/v2",
       "wp_user":"ADMIN_USER", "wp_app_password":"APP_PASS"}' \
  https://cmd.bonaka.app/api/sites
```

⚠️ **wp_api_url** — ВНЕШНИЙ HTTPS URL, не внутренний Docker-hostname. Application Passwords требуют HTTPS context; по `http://wp-container/` вернёт 401.

### 2.5. Sync articles

```bash
curl -sS -X POST -H "Authorization: Bearer $AUTH" \
  https://cmd.bonaka.app/api/sites/$SITE_ID/articles/sync-all
```

Для нового сайта вернёт `{synced: 0, pages: 0}` — норма.

### 2.6. Платные компоненты (ждут лицензий)

Когда куплены:
- **REHub theme** — скачать с Envato → wp-admin → Appearance → Themes → Upload Theme. После активации установить `rehub-framework` plugin из TGMPA (⚠️ по одному, не bulk — падает). Активировать лицензию в Registration tab.
- **ReCompare preset** — Import через wp-cli: `wp eval-file recompare-import.php`
- **Content Egg** — скачать с codecanyon.net → Upload Plugin → Activate → настроить API keys (Admitad, Я.Маркет, Ozon).
- **WP All Import Pro + addons** (ACF / Link Cloak / WooCommerce) — Upload Plugin × 4 → Activate.
- **envato-market** (бесплатный, но только с envato.com) — для auto-updates купленных Envato-продуктов.

## Фаза 3 — Контент (параллельно, недели/месяцы)

- [ ] Стратегия рубрики → `docs/strategies/<niche>.md`
- [ ] Контент-план на 30 статей → SCC Dashboard → Plan (добавить фазу/рубрику)
- [ ] 10 pillar-статей вручную как эталон стиля
- [ ] AI-брифы через SCC на остальные 20
- [ ] Публикация → sync в WP через `article/sync-wp?direction=push`

## Известные гвозди (грабли собрали — не наступать)

| Грабли | Как избежать |
|---|---|
| `plugin install A B C D --activate` падает с WC_CLI conflict | Ставить по одному: woocommerce первым |
| AAAA на выделенный Timeweb IPv6 (не сконфигурен на eth0) | Удалить AAAA у registrar, backlog P2 — настроить IPv6 сервера |
| REHub TGMPA bulk install падает на WP 6.9+ | Ставить плагины по одному через wp-admin |
| MariaDB 11 healthcheck | Скрипт использует `mariadb-admin ping`, не mysqladmin |
| SCC-контейнер кэширует NXDOMAIN новых доменов | extra_hosts в compose.yml (временно) + backlog: `daemon.json: dns=[8.8.8.8, 1.1.1.1]` |
| Internal `http://wp-xxx/wp-json/` + basic-auth = 401 | Application Passwords требуют HTTPS. Использовать внешний URL через Traefik |
| `docker compose up -d --build` с recreate — wp-cli теряется | Переустановить wp-cli в контейнере после recreate |
| Let's Encrypt пытается cert для www.DOMAIN без DNS | Добавить CNAME `www` ДО первого HTTPS-запроса, или удалить www из Traefik rule |

## Текущие сайты портфеля

| Домен | Slug | Статус | Тема | Валюация (2026-04-18) |
|---|---|---|---|---|
| popolkam.ru | popolkam | active | REHub + ReCompare | $2,104 |
| 4beg.ru | 4beg | setup (migration pending) | REHub | $6,836 |
| aykakchisto.ru | aykakchisto | setup (фаза 2 в процессе) | default WP 6.9 | $180 |
