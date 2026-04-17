# SEO Command Center — Техническое задание для Claude Code

> Этот документ — полная спецификация проекта. Скопируй его в CLAUDE.md в корень проекта,
> чтобы Claude Code имел контекст при каждом запуске.

---

## 1. Обзор проекта

**Что это:** Панель управления портфелем SEO/affiliate-сайтов. Единая точка для мониторинга метрик, управления контентом, AI-команд и развёртывания новых сайтов.

**Для кого:** Соло-владелец портфеля сайтов + будущие операторы (новички).

**Текущий статус:** MVP развёрнут на `cmd.bonaka.app`. Переходим к боевым интеграциям и масштабированию.

---

> ### ⚠️ ГЛАВНОЕ ПРАВИЛО РАЗРАБОТКИ
>
> **Всё должно быть автоматизировано настолько, чтобы новичок без технического опыта
> мог управлять портфелем сайтов целиком из панели SCC.**
>
> Это значит:
> 1. **Никаких SSH/CLI операций для рутины** — деплой сайта, синк контента, публикация статей, мониторинг метрик — всё через UI
> 2. **Каждое действие документировано** — tooltips, onboarding-подсказки, примеры в интерфейсе
> 3. **Шаблоны и пресеты** — не заставлять заполнять с нуля; готовые конфиги для типовых ниш
> 4. **Воспроизводимый пайплайн** — popolkam.ru = первый эталон; каждый следующий сайт разворачивается по тому же шаблону за 15 минут из панели
> 5. **Полный аудит-лог** — кто, когда, что сделал; для разбора и обучения
>
> Мы готовимся к масштабированию: 1 оператор → 10 сайтов → наёмные менеджеры.

**Где будет жить:** Облачный VPS (Ubuntu), доступ по `https://cmd.popolkam.ru` или аналогичному домену.

---

## 2. Бизнес-контекст

```
Тип:           SEO/affiliate агрегатор
Ниша:          Бытовая техника (кофемашины → расширение)
Сайты:         popolkam.ru (RU), koffie-expert.nl (NL), будут ещё
Монетизация:   CPA/CPS через Admitad, Яндекс.Маркет, Bol.com, Awin
CMS:           WordPress + REHub (тема) + WooCommerce
Плагины:       Content Egg, WP All Import, Rank Math SEO
Цель:          $5000/мес через 12-18 месяцев → продажа портфеля
```

### Ключевые KPI (отображаются в дашборде)
- **RPM** = Revenue / Sessions × 1000
- **EPC** = Revenue / Affiliate Clicks
- **CTR** = Affiliate Clicks / Sessions
- **CR (Sales CR)** = Sales / Affiliate Clicks

---

## 3. Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React)               │
│  Dashboard │ Articles │ Plan │ AI │ Deploy │ Analytics   │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                  BACKEND (Node.js / Express)              │
│  /api/sites  /api/articles  /api/metrics  /api/ai        │
│  /api/deploy  /api/plan  /api/log                        │
└───┬──────────┬──────────┬──────────┬────────────────────┘
    │          │          │          │
    ▼          ▼          ▼          ▼
┌──────┐ ┌────────┐ ┌────────┐ ┌─────────┐
│ SQLite│ │WP REST │ │GA4 API │ │Claude   │
│ / DB  │ │  API   │ │GSC API │ │  API    │
└──────┘ └────────┘ └────────┘ └─────────┘
                       │
                  ┌────▼────┐
                  │   n8n   │  (webhook-и, автоматизация)
                  └─────────┘
```

### Стек

| Слой | Технология | Почему |
|------|-----------|--------|
| Frontend | Vite + React + React Router | Быстрый, лёгкий, SPA |
| Стили | Tailwind CSS | Утилитарный, быстро верстать |
| Backend | Express.js | Простой, достаточный для 1 пользователя |
| БД | SQLite (better-sqlite3) | Один файл, нет зависимостей, легко бэкапить |
| AI | Anthropic SDK (@anthropic-ai/sdk) | Claude Sonnet 4 для команд |
| Auth | Простой API-ключ или basic auth | 1 пользователь, за nginx |
| Deploy | PM2 + nginx + Let's Encrypt | Стандарт для Node на VPS |
| Автоматизация | n8n (self-hosted) | Визуальные workflow-ы |

---

## 4. Структура проекта

```
seo-command-center/
├── CLAUDE.md                  # ← этот файл (контекст для Claude Code)
├── package.json
├── vite.config.js
├── .env                       # API ключи (не в git!)
├── .env.example
│
├── server/
│   ├── index.js               # Express entry point
│   ├── db.js                  # SQLite init + migrations
│   ├── middleware/
│   │   └── auth.js            # Simple auth middleware
│   ├── routes/
│   │   ├── sites.js           # CRUD сайтов
│   │   ├── articles.js        # CRUD статей + sync с WP
│   │   ├── plan.js            # Контент-план
│   │   ├── metrics.js         # GA4/GSC data fetch
│   │   ├── ai.js              # Claude API proxy
│   │   ├── deploy.js          # Deploy wizard backend
│   │   └── log.js             # AI command log
│   ├── services/
│   │   ├── wordpress.js       # WP REST API client
│   │   ├── analytics.js       # GA4 Data API client
│   │   ├── searchConsole.js   # GSC API client
│   │   ├── claude.js          # Claude SDK wrapper
│   │   └── deployer.js        # WP-CLI deploy scripts
│   └── scripts/
│       ├── deploy-wp.sh       # Bash: WP install via WP-CLI
│       └── sync-metrics.js    # Cron: pull GA4/GSC daily
│
├── src/
│   ├── main.jsx
│   ├── App.jsx                # Router
│   ├── api/
│   │   └── client.js          # fetch wrapper
│   ├── hooks/
│   │   ├── useStore.js        # Generic data hook
│   │   ├── useSites.js
│   │   ├── useArticles.js
│   │   └── useAI.js
│   ├── components/
│   │   ├── Layout.jsx         # Header + sidebar + tabs
│   │   ├── SiteCard.jsx
│   │   ├── MetricCard.jsx
│   │   ├── Badge.jsx
│   │   ├── ArticleRow.jsx     # С AI-полем
│   │   ├── ArticleForm.jsx    # Добавление/редактирование
│   │   ├── PlanCard.jsx
│   │   ├── PlanForm.jsx
│   │   ├── AIPanel.jsx        # Global AI Command Center
│   │   ├── DeployWizard.jsx   # 5-step wizard
│   │   ├── LogPanel.jsx
│   │   ├── Modal.jsx
│   │   └── ui/               # Button, Input, Select, etc.
│   ├── pages/
│   │   ├── Dashboard.jsx      # Главная: site cards + tabs
│   │   ├── SiteDetail.jsx     # Детали одного сайта
│   │   └── Settings.jsx       # API ключи, webhook URLs
│   └── utils/
│       ├── format.js          # fmt(), date helpers
│       └── constants.js       # Status maps, colors, icons
│
├── n8n/                       # Экспорт n8n workflow-ов
│   ├── deploy-wordpress.json
│   ├── sync-metrics.json
│   └── ai-content-update.json
│
└── deploy/
    ├── nginx.conf             # Reverse proxy config
    ├── pm2.ecosystem.js       # PM2 config
    └── setup.sh               # Первоначальная настройка сервера
```

---

## 5. Модели данных (SQLite)

### sites
```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,              -- "popolkam.ru"
  market TEXT NOT NULL,            -- "RU", "NL", "DE"
  niche TEXT,                      -- "Кофемашины"
  status TEXT DEFAULT 'setup',     -- "active", "setup", "paused"
  wp_admin_url TEXT,
  wp_api_url TEXT,                 -- "https://popolkam.ru/wp-json/wp/v2"
  wp_user TEXT,
  wp_app_password TEXT,            -- Application Password для WP REST API
  ga4_property_id TEXT,            -- "properties/123456"
  gsc_site_url TEXT,               -- "https://popolkam.ru"
  affiliate_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### site_metrics (ежедневный снэпшот)
```sql
CREATE TABLE site_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  date TEXT NOT NULL,              -- "2026-04-15"
  sessions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  affiliate_clicks INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  rpm REAL DEFAULT 0,
  epc REAL DEFAULT 0,
  ctr REAL DEFAULT 0,
  cr REAL DEFAULT 0,
  UNIQUE(site_id, date)
);
```

### articles
```sql
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id),
  wp_post_id INTEGER,              -- ID в WordPress (для sync)
  title TEXT NOT NULL,
  url TEXT,                         -- "/obzor-delonghi-magnifica-s/"
  type TEXT DEFAULT 'review',       -- review, comparison, guide, quiz, tool, category
  status TEXT DEFAULT 'planned',    -- published, draft, planned
  sessions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cr REAL DEFAULT 0,
  notes TEXT,
  wp_last_sync TEXT,                -- datetime последней синхронизации
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### content_plan
```sql
CREATE TABLE content_plan (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id),
  title TEXT NOT NULL,
  type TEXT DEFAULT 'review',
  priority TEXT DEFAULT 'medium',   -- high, medium, low
  deadline TEXT,                     -- "2026-04-20"
  status TEXT DEFAULT 'idea',       -- idea, queued, in_progress, done
  article_id TEXT REFERENCES articles(id),  -- связь когда статья создана
  ai_brief TEXT,                    -- AI-сгенерированный бриф
  created_at TEXT DEFAULT (datetime('now'))
);
```

### ai_log
```sql
CREATE TABLE ai_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT,
  article_id TEXT,
  command TEXT NOT NULL,
  result TEXT,
  model TEXT DEFAULT 'claude-sonnet-4',
  tokens_used INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### deploys
```sql
CREATE TABLE deploys (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id),
  config JSON,                      -- полный конфиг деплоя
  ai_plan JSON,                     -- AI-сгенерированный план
  status TEXT DEFAULT 'pending',    -- pending, deploying, deployed, failed
  log JSON,                         -- лог шагов деплоя
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 6. API Endpoints

### Sites
```
GET    /api/sites                    — список сайтов с последними метриками
POST   /api/sites                    — создать сайт
PUT    /api/sites/:id                — обновить сайт
DELETE /api/sites/:id                — удалить сайт
GET    /api/sites/:id/metrics        — метрики за период (query: from, to)
POST   /api/sites/:id/sync-metrics   — принудительный pull GA4/GSC
```

### Articles
```
GET    /api/sites/:siteId/articles           — статьи сайта
POST   /api/sites/:siteId/articles           — создать статью
PUT    /api/articles/:id                      — обновить
DELETE /api/articles/:id                      — удалить
POST   /api/articles/:id/sync-wp              — синхронизировать с WordPress
POST   /api/sites/:siteId/articles/sync-all   — sync всех статей с WP
```

### Content Plan
```
GET    /api/sites/:siteId/plan       — план сайта
POST   /api/sites/:siteId/plan       — добавить пункт
PUT    /api/plan/:id                  — обновить
DELETE /api/plan/:id                  — удалить
POST   /api/plan/:id/generate-brief   — AI генерирует бриф для пункта
```

### AI
```
POST   /api/ai/command               — выполнить AI-команду
  body: { command, context: { siteId?, articleId? } }
  response: { result, tokensUsed }

POST   /api/ai/ideas                 — генерация идей для сайта
  body: { siteId }

POST   /api/ai/site-plan             — AI-план для нового сайта (deploy wizard)
  body: { niche, market, deployType, parentSite? }
```

### Deploy
```
POST   /api/deploy                   — запустить деплой
  body: { config, aiPlan }

GET    /api/deploys                   — история деплоев
GET    /api/deploys/:id/status        — статус текущего деплоя (SSE/polling)
```

### Log
```
GET    /api/log                      — AI command log (query: siteId?, limit, offset)
```

---

## 7. Интеграции

### 7.1 WordPress REST API
**Цель:** Двусторонняя синхронизация статей. Application Passwords для авторизации.

### 7.2 Google Analytics 4 (GA4 Data API)
**Цель:** Ежедневный pull метрик трафика. Service Account → JSON key → GA4 property access.

### 7.3 Google Search Console API
**Цель:** Поисковые запросы, позиции, CTR.

### 7.4 Claude API (AI-команды)
**Модель:** `claude-sonnet-4-20250514`. Системный промпт включает данные сайта, статьи, метрики.

### 7.5 n8n (Автоматизация)
deploy-wordpress, sync-metrics, ai-content-update, price-monitor, alert-traffic-drop.

---

## 8. Deploy Wizard

5 шагов: Конфигурация → AI-планирование → Ревью → Реальный деплой (WP-CLI) → Результат.

---

## 9. Фичи из прототипа (перенести 1:1)

Site cards, переключатель сайтов, таблица статей с inline AI, редактирование/удаление/добавление, контент-план, AI Command Center, история, лог, Deploy Wizard, история деплоев, persistent storage.

**Добавить:** basic auth, реальные данные WP/GA4/GSC, реальный деплой, графики (recharts), Settings, Sync button, toast, responsive, theme toggle.

---

## 10. Файл .env

См. `.env.example` в корне.

---

## 11. План реализации

### Фаза 1: Скелет
1. Vite + React
2. Зависимости (tailwind, react-router, express, better-sqlite3, @anthropic-ai/sdk)
3. Структура папок
4. SQLite schema + seed
5. Express с basic CRUD
6. Vite proxy → Express
7. Перенос компонентов из прототипа

### Фаза 2: Ядро
Dashboard, Articles CRUD, Plan CRUD, AI через Claude, AI log, Deploy wizard UI, Settings.

### Фаза 3: Интеграции
WP REST, GA4, GSC, recharts, cron.

### Фаза 4: Production
Deploy script, n8n, nginx, PM2, SSL, backup.

---

## 12. Команды для начала

```bash
npm install                     # установить все зависимости
npm run dev                     # dev: vite (5173) + express (3001) через concurrently
npm run build                   # production build фронта
npm run server                  # запустить только express
npm run seed                    # заполнить БД демо-данными
```

---

## 13. Принципы разработки

1. **Автоматизация > ручная работа** — если действие повторяется, оно должно быть кнопкой в UI
2. **Новичок должен справиться** — каждая фича проектируется так, чтобы человек без IT-опыта мог ей пользоваться по подсказкам
3. **SQLite** — один файл, простой бэкап
4. **Не трогать WordPress core** — только REST API
5. **Каждый сайт = продаваемый актив** — не привязываться к конкретному
6. **Graceful degradation** — если GA4/GSC не подключён, показывать placeholder с инструкцией как подключить
7. **AI-команды idempotent**
8. **Секреты только в .env**
9. **Логировать всё** — AI команды, деплои, sync, метрики — полный аудит для обучения и разбора
10. **Шаблонность** — popolkam.ru = эталон; каждый новый сайт = клон пайплайна

---

## 14. Дизайн-система

```
Background:     #0a0e17
Card:           #0f172a
Surface:        #1e293b
Border:         #1e293b
Text Primary:   #e2e8f0
Text Muted:     #64748b / #475569
Accent Blue:    #3b82f6 / #60a5fa
Success Green:  #34d399
Warning Yellow: #fbbf24
Danger Red:     #ef4444
Orange:         #f97316

Font Body:      DM Sans
Font Mono:      JetBrains Mono
```

Иконки типов: 📋 review, ⚖️ comparison, 📖 guide, 🎯 quiz, 🔧 tool, 📁 category
Статусы: Live (зелёный), Draft (жёлтый), Plan (фиолетовый), Setup (жёлтый), WIP (жёлтый), Queue (фиолетовый), Idea (серый)

---

## 15. Ссылка на прототип

`prototype/seo-command-center.jsx` — полный React-артефакт с UI-логикой. Использовать как reference при переносе, разбить на компоненты.
