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
- [ ] Фаза 2: AI команды через Claude SDK (ключ в `.env`), AI-бриф для плана, графики
- [ ] Фаза 3: WP REST, GA4, GSC, cron-синхронизация
- [ ] Фаза 4: Реальный deploy через WP-CLI, n8n, nginx, PM2, SSL
