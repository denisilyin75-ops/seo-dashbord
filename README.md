# SEO Command Center

Панель управления портфелем SEO/affiliate-сайтов. Полная спецификация — в [CLAUDE.md](./CLAUDE.md).

## Быстрый старт

```bash
cp .env.example .env     # при необходимости заполнить ANTHROPIC_API_KEY
npm install
npm run dev              # vite (5173) + express (3001) через concurrently
```

Открыть: http://localhost:5173

## Скрипты

| Команда          | Что делает                                             |
|------------------|--------------------------------------------------------|
| `npm run dev`    | Запуск фронта (Vite) + бэка (Express) параллельно      |
| `npm run build`  | Production-сборка фронта                               |
| `npm run server` | Запуск только Express                                  |
| `npm run seed`   | Засеять БД демо-данными (idempotent)                   |

## Структура

См. [CLAUDE.md §4](./CLAUDE.md#4-структура-проекта).

Прототип исходного UI-артефакта сохранён в [`prototype/seo-command-center.jsx`](./prototype/seo-command-center.jsx).

## Статус фаз

- [x] **Фаза 1**: Vite+React скелет, SQLite схема, Express CRUD, UI из прототипа
- [x] **Фаза 2**: React Router (Dashboard / SiteDetail / Settings), toast-уведомления,
      график трафика (recharts), AI Command Center через бэкенд-прокси,
      Settings со статусом интеграций
- [x] **Фаза 3**: WP REST client (sync статей), GA4 + GSC clients, объединённый
      `metricsSync`, ежедневный cron в 03:00 UTC, кнопки "Sync WP" и "Pull GA4/GSC"
      на SiteDetail
- [x] **Фаза 4 (артефакты)**: `deploy/nginx.conf`, `deploy/pm2.ecosystem.cjs`,
      `deploy/setup.sh` (Ubuntu bootstrap), `deploy/backup.sh`,
      `server/scripts/deploy-wp.sh` (WP-CLI install), n8n workflow templates
- [ ] **TODO**: реальный запуск deploy на VPS (нужны SSH-ключ + домен), реальные
      ключи для Claude/GA4/GSC в `.env`, мобильная адаптация полировки

## Production deployment

**Целевой сервер использует Dokploy + Traefik (не nginx) — основной путь:**

- **[`DEPLOY-DOKPLOY.md`](./DEPLOY-DOKPLOY.md)** — деплой как Docker-сервис
  через Dokploy UI / `docker compose`, с Traefik labels для SSL и роутинга
- **[`WARP-DEPLOY-DOKPLOY.md`](./WARP-DEPLOY-DOKPLOY.md)** — та же инструкция,
  но для AI-агента (warp.ai), с защитными проверками и STOP-условиями
- `Dockerfile` + `docker-compose.yml` + `.dockerignore` — для сборки и запуска

**Альтернативные пути (для серверов без Docker):**

- [`DEPLOY.md`](./DEPLOY.md) — bare-metal через nginx + PM2
- [`WARP-DEPLOY.md`](./WARP-DEPLOY.md) — то же, для AI-агента
- [`deploy/setup.sh`](./deploy/setup.sh) — bootstrap **нового** чистого
  Ubuntu VPS (если нужно развернуть с нуля)
- [`deploy/nginx.conf`](./deploy/nginx.conf) — nginx-конфиг
- [`deploy/pm2.ecosystem.cjs`](./deploy/pm2.ecosystem.cjs) — PM2

## AI провайдеры

Поддерживаются два (выбор через `AI_PROVIDER` в `.env`):

- **OpenRouter** (`openrouter`) — `OPENROUTER_API_KEY`, OpenAI-совместимый,
  доступ к Claude/GPT/Gemini и др. Дефолтная модель: `anthropic/claude-sonnet-4`
- **Anthropic напрямую** (`anthropic`) — `ANTHROPIC_API_KEY`, дефолтная
  модель: `claude-sonnet-4-20250514`

Если оба ключа заданы, OpenRouter имеет приоритет. Модель можно переопределить
через `AI_MODEL`.
