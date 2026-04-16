# Deploy через Dokploy + Traefik (cmd.bonaka.app)

Инструкция для развёртывания на сервере где уже есть Dokploy с Traefik v3
и сетью `web`. Не трогает существующие сервисы (bonaka.app, mob/disp/api).

**Результат:**
- `https://cmd.bonaka.app` — UI + API в одном контейнере
- SSL автоматом от Traefik (Let's Encrypt)
- SQLite в Docker volume `scc-data`
- Логи через `docker logs scc` или Dokploy UI

---

## Вариант A — через Dokploy UI (рекомендуемый)

### A.1 Создать "Application" в Dokploy

1. Dokploy → **Create → Application**
2. **Name:** `seo-command-center` (или любое)
3. **Source:** GitHub → выбрать репо `denisilyin75-ops/seo-dashbord`
4. **Branch:** `claude/init-seo-dashboard-soKdZ` (или `main` после мерджа)
5. **Build Type:** **Dockerfile** (он есть в корне репо)
6. **Save**

### A.2 Настроить Environment

В разделе **Environment** добавить:

```
NODE_ENV=production
PORT=3001
AUTH_TOKEN=<openssl rand -hex 32>
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ
OPENROUTER_REFERER=https://cmd.bonaka.app
DB_PATH=/app/data/seo.sqlite
```

### A.3 Настроить Domain

**Domains → Add Domain:**
- **Host:** `cmd.bonaka.app`
- **Port:** `3001` (внутренний порт контейнера)
- **HTTPS:** ON
- **Certificate Provider:** Let's Encrypt
- **Path:** `/`

### A.4 Настроить Volume (для SQLite)

**Volumes → Add Volume:**
- **Type:** Volume Mount (named volume) или Bind Mount
- **Name / Host Path:** `scc-data` (или путь типа `/etc/dokploy/scc-data`)
- **Mount Path:** `/app/data`

### A.5 Настроить DNS

В панели Timeweb (или где у вас DNS):
```
Type: A
Name: cmd
Value: 5.129.245.98
TTL: 3600
```

Проверить:
```bash
dig +short cmd.bonaka.app
# → 5.129.245.98
```

### A.6 Deploy

В Dokploy: **Deploy** (большая синяя кнопка). Он:
1. Сделает `git clone`
2. Запустит `docker build` по Dockerfile
3. Поднимет контейнер с вашими env + volume
4. Подключит к сети `web`
5. Traefik автоматически подхватит и выпустит SSL

**Логи** в реальном времени — в Dokploy UI вкладка Logs.

### A.7 Проверка

```bash
curl https://cmd.bonaka.app/api/health
# → {"ok":true,"sites":...,"integrations":{"ai":{"configured":true,"provider":"openrouter",...}}}
```

Открыть `https://cmd.bonaka.app` в браузере → дашборд.

---

## Вариант B — через Dokploy "Compose"

Если хотите управлять через `docker-compose.yml`:

1. Dokploy → **Create → Compose**
2. **Source:** GitHub → ваш репо
3. **Compose Path:** `docker-compose.yml`
4. **Environment** — те же переменные что в A.2 (Dokploy подложит их в `.env`)
5. **Deploy**

Перед этим проверить в `docker-compose.yml` название certResolver
(по умолчанию `letsencrypt`):

```yaml
- "traefik.http.routers.scc.tls.certresolver=letsencrypt"
```

Если в Dokploy Traefik настроен с другим именем — поправить здесь.

---

## Вариант C — напрямую через `docker compose` (без Dokploy)

Если хочется обойти Dokploy UI:

```bash
ssh root@5.129.245.98
cd /opt
git clone --branch claude/init-seo-dashboard-soKdZ \
  https://github.com/denisilyin75-ops/seo-dashbord.git scc
cd scc

# .env — как в A.2
cp .env.example .env
nano .env

# Сборка + запуск
docker compose up -d --build

# Логи
docker logs -f scc
```

Контейнер появится в сети `web`, Traefik увидит лейблы и выпустит SSL.

---

## Обновление после push в git

### В Dokploy UI:
**Deploy** (повторно) — Dokploy сделает rebuild из последнего коммита.

### Или через webhook:
Dokploy → **Webhooks** — даёт URL, который GitHub может дёргать на каждый push в нужную ветку. Включить **GitHub Auto-Deploy**.

### Через CLI (если Compose):
```bash
cd /opt/scc && git pull && docker compose up -d --build
```

---

## Проверка что bonaka.app не пострадал

После деплоя:
```bash
curl -sI https://bonaka.app | head -3
curl -sI https://mob.bonaka.app | head -3
curl -sI https://disp.bonaka.app | head -3
curl -sI https://api.bonaka.app | head -3
```

Все должны отвечать 200/30x. Если что-то сломалось — это **не из-за** нашего
деплоя (мы только добавили новый сервис в сеть `web`, ничего не редактировали).

---

## Rollback

В Dokploy UI: **Stop** или **Delete Application**. Volume `scc-data` останется
(удалить отдельно если нужно).

Через CLI:
```bash
cd /opt/scc
docker compose down            # остановить
docker compose down -v         # + удалить volume
docker volume rm scc_scc-data  # явно удалить named volume
```

---

## Типичные проблемы

### Traefik не видит контейнер
- Проверить что контейнер в сети `web`: `docker inspect scc | grep -A 3 Networks`
- Проверить лейблы: `docker inspect scc | grep traefik`
- Логи Traefik: `docker logs <traefik-container> | tail -50`

### SSL не выпускается
- Имя certResolver должно совпадать с конфигом Traefik в Dokploy
- DNS должен быть правильно настроен ДО деплоя
- Лимит Let's Encrypt: 5 попыток в час на одно имя

### SQLite не сохраняется между перезапусками
- Volume должен быть прикреплён к `/app/data`
- Проверить: `docker exec scc ls -la /app/data`

### Контейнер падает с "EACCES" на data/
- Volume permissions: `docker exec scc id` должен показать non-root
- Если нужно — добавить в Dockerfile `RUN chown -R node:node /app/data`
  и `USER node`. Но в текущей конфигурации работает от root внутри
  контейнера, что для одного пользователя ок.

### AI команды возвращают заглушку
- В Environment не задан `OPENROUTER_API_KEY` — добавить и rebuild
- Или `AI_PROVIDER` указан как `anthropic` без `ANTHROPIC_API_KEY`
