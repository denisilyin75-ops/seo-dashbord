# SEO Command Center — Техническое задание для Claude Code

> Этот документ — полная спецификация проекта. Скопируй его в CLAUDE.md в корень проекта,
> чтобы Claude Code имел контекст при каждом запуске.

---

## 1. Обзор проекта

**Что это:** Панель управления портфелем SEO/affiliate-сайтов. Единая точка для мониторинга метрик, управления контентом, AI-команд и развёртывания новых сайтов.

**Для кого:** Соло-владелец портфеля сайтов (1 пользователь, без команды).

**Текущий статус:** Есть рабочий прототип (React-артефакт в Claude.ai), нужно перевести в полноценное приложение на сервере.

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

**Цель:** Двусторонняя синхронизация статей.

```javascript
// server/services/wordpress.js
class WordPressClient {
  constructor(siteUrl, user, appPassword) {
    this.baseUrl = `${siteUrl}/wp-json/wp/v2`;
    this.auth = Buffer.from(`${user}:${appPassword}`).toString('base64');
  }

  // Получить все посты
  async getPosts(params = {}) { /* GET /posts */ }

  // Создать пост (из AI-сгенерированного контента)
  async createPost(data) { /* POST /posts */ }

  // Обновить пост
  async updatePost(id, data) { /* PUT /posts/:id */ }

  // Получить категории
  async getCategories() { /* GET /categories */ }

  // Создать категорию
  async createCategory(name, slug) { /* POST /categories */ }
}
```

**Настройка в WordPress:**
1. Пользователь → Application Passwords → создать пароль
2. Сохранить в settings сайта в дашборде

### 7.2 Google Analytics 4 (GA4 Data API)

**Цель:** Ежедневный pull метрик трафика.

```javascript
// server/services/analytics.js
// Используем @google-analytics/data
// Service Account → JSON key → GA4 property access

async function fetchMetrics(propertyId, startDate, endDate) {
  // Metrics: sessions, screenPageViews, conversions, totalRevenue
  // Dimensions: date, pagePath
}
```

**Настройка:**
1. Google Cloud Console → Service Account → JSON key
2. GA4 Admin → Property Access → добавить service account email
3. Cron job: ежедневно в 03:00 UTC pull данных

### 7.3 Google Search Console API

**Цель:** Поисковые запросы, позиции, CTR.

```javascript
// server/services/searchConsole.js
// Используем googleapis (google.searchconsole)

async function fetchSearchData(siteUrl, startDate, endDate) {
  // Dimensions: query, page, date
  // Metrics: clicks, impressions, ctr, position
}
```

### 7.4 Claude API (AI-команды)

**Цель:** Обработка команд пользователя, генерация контента, анализ.

```javascript
// server/services/claude.js
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function executeCommand(command, context) {
  const systemPrompt = buildSystemPrompt(context); // включает данные сайта, статьи, метрики
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: command }],
  });
  return response;
}
```

**Системный промпт для AI-команд включает:**
- Роль: SEO-менеджер партнёрского сайта
- Данные сайта: метрики, ниша, рынок
- Список статей с метриками
- Контент-план
- Инструкции по форматированию ответа

### 7.5 n8n (Автоматизация)

**Workflow-ы:**

1. **deploy-wordpress** — webhook → SSH → WP-CLI install → response
2. **sync-metrics** — schedule (daily) → GA4 API → update DB → GSC API → update DB
3. **ai-content-update** — webhook (из дашборда) → Claude API → WP REST API → update post
4. **price-monitor** — schedule → Content Egg API → проверка актуальности цен
5. **alert-traffic-drop** — schedule → check metrics → Telegram/email alert

---

## 8. Deploy Wizard — подробная логика

### Шаг 1: Конфигурация (фронтенд)
Пользователь заполняет:
- Ниша (EN + RU название)
- Рынок (RU/NL/DE/US)
- Тип размещения: поддиректория | поддомен | новый домен
- Родительский сайт (для поддиректории/поддомена)
- Тема (REHub / custom)
- Опции: SSL, GA4, GSC

### Шаг 2: AI-планирование
`POST /api/ai/site-plan` → Claude генерирует JSON:
```json
{
  "siteName": "Электрочайники Эксперт",
  "seoTitle": "Лучшие электрические чайники 2026 — обзоры и сравнения",
  "description": "Независимые обзоры электрочайников...",
  "categories": ["Стеклянные", "Металлические", "С терморегулятором", "Дорожные", "Премиум"],
  "firstArticles": [
    {"title": "...", "type": "review", "priority": "high", "slug": "/.../"}, ...
  ],
  "monetization": "Admitad (DNS, Ситилинк), Яндекс.Маркет...",
  "estimatedTraffic": "500-1500 sessions/мес через 3 месяца",
  "competitionLevel": "medium",
  "keywords": ["электрический чайник купить", ...]
}
```

### Шаг 3: Ревью + корректировка
Пользователь просматривает, может перегенерировать.

### Шаг 4: Реальный деплой
`POST /api/deploy` → бэкенд:

```bash
# server/scripts/deploy-wp.sh
# Параметры: $DOMAIN, $DB_NAME, $DB_USER, $DB_PASS, $WP_TITLE, $WP_ADMIN_EMAIL

# 1. Создать БД
mysql -u root -p -e "CREATE DATABASE $DB_NAME;"

# 2. Скачать и установить WordPress
wp core download --path=/var/www/$DOMAIN
wp config create --dbname=$DB_NAME --dbuser=$DB_USER --dbpass=$DB_PASS --path=/var/www/$DOMAIN
wp core install --url=$DOMAIN --title="$WP_TITLE" --admin_user=admin --admin_email=$WP_ADMIN_EMAIL --path=/var/www/$DOMAIN

# 3. Тема и плагины
wp theme install flavor --activate --path=/var/www/$DOMAIN
# или: скопировать REHub из шаблона
wp plugin install flavor-flavor flavor-flavor-flavor --activate --path=/var/www/$DOMAIN
# Content Egg, WP All Import — через WP-CLI или копирование

# 4. Настройки
wp rewrite structure '/%postname%/' --path=/var/www/$DOMAIN
wp option update blogdescription "$WP_DESCRIPTION" --path=/var/www/$DOMAIN

# 5. Категории из AI-плана
for cat in "${CATEGORIES[@]}"; do
  wp term create category "$cat" --path=/var/www/$DOMAIN
done

# 6. SSL
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $ADMIN_EMAIL

# 7. Nginx config
# Копирует шаблон, подставляет $DOMAIN
```

### Шаг 5: Результат
- Новый сайт появляется в дашборде
- AI-план конвертируется в контент-план
- Первые статьи добавляются как planned

---

## 9. Фичи из прототипа (перенести 1:1)

### Уже работает в артефакте:
- [x] Карточки сайтов с метриками + быстрые ссылки (WP, GA4, GSC, Affiliate)
- [x] Переключение между сайтами
- [x] Таблица статей с типом, статусом, метриками
- [x] AI-поле ввода в каждой строке статьи (inline command)
- [x] Редактирование статьи inline (✏️)
- [x] Удаление статьи (🗑)
- [x] Добавление статьи (модал)
- [x] Контент-план с приоритетами, дедлайнами, статусами
- [x] Добавление/удаление пунктов плана
- [x] AI Command Center (глобальный) с пресетами
- [x] История AI-запросов
- [x] Лог AI-команд
- [x] Deploy Wizard (5 шагов)
- [x] Добавление/редактирование сайтов
- [x] История деплоев
- [x] Persistent storage

### Добавить при переносе:
- [ ] Аутентификация (basic auth / API key)
- [ ] Реальные данные из WP REST API
- [ ] Реальные метрики из GA4/GSC
- [ ] Реальный деплой через SSH/WP-CLI
- [ ] Графики трафика (recharts)
- [ ] Страница настроек (API ключи, webhook URLs)
- [ ] Кнопка "Sync with WordPress" для статей
- [ ] Уведомления (toast)
- [ ] Мобильная адаптация (responsive)
- [ ] Dark/light theme toggle

---

## 10. Файл .env

```bash
# .env.example
PORT=3001
NODE_ENV=production

# Auth
AUTH_TOKEN=your-secret-token-here

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Google (Service Account)
GOOGLE_APPLICATION_CREDENTIALS=./google-sa-key.json
# или отдельные переменные:
GOOGLE_CLIENT_EMAIL=sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# n8n
N8N_WEBHOOK_BASE=https://n8n.your-server.com/webhook

# Default WordPress (для deploy)
WP_DEFAULT_ADMIN_EMAIL=admin@example.com
SERVER_SSH_HOST=your-server.com
SERVER_SSH_USER=deploy
SERVER_SSH_KEY_PATH=~/.ssh/deploy_key
```

---

## 11. План реализации (порядок задач)

### Фаза 1: Скелет (день 1)
1. `npm create vite@latest seo-command-center -- --template react`
2. Установить зависимости: `tailwindcss, react-router-dom, express, better-sqlite3, @anthropic-ai/sdk`
3. Структура папок (см. раздел 4)
4. SQLite schema + seed data
5. Express server с basic CRUD routes
6. Vite proxy → Express
7. Перенести компоненты из прототипа, разбить на файлы

### Фаза 2: Ядро (день 2-3)
1. Dashboard page с site cards
2. Articles CRUD (фронт + бэк)
3. Content plan CRUD
4. AI commands через Claude API (бэкенд proxy)
5. AI log
6. Deploy wizard UI (без реального деплоя)
7. Settings page

### Фаза 3: Интеграции (день 4-5)
1. WordPress REST API — sync статей
2. GA4 Data API — pull метрик
3. GSC API — поисковые данные
4. Графики (recharts) на dashboard
5. Cron jobs для автоматического pull

### Фаза 4: Deploy + Production (день 6-7)
1. Реальный deploy script (WP-CLI)
2. n8n workflow-ы
3. nginx config
4. PM2 config
5. SSL setup
6. Backup strategy (SQLite file + cron)

---

## 12. Команды для начала

```bash
# Инициализация
npm create vite@latest seo-command-center -- --template react
cd seo-command-center

# Frontend
npm install react-router-dom recharts lucide-react

# Backend
npm install express better-sqlite3 cors dotenv
npm install @anthropic-ai/sdk
npm install -D concurrently nodemon

# Tailwind
npm install -D tailwindcss @tailwindcss/vite

# Опционально (для интеграций)
npm install googleapis @google-analytics/data node-ssh
```

---

## 13. Принципы разработки (ВАЖНО)

1. **Один пользователь** — не нужно сложного auth, multi-tenancy, ролей
2. **SQLite** — один файл, простой бэкап (`cp db.sqlite db.sqlite.bak`)
3. **Не трогать WordPress core** — только REST API, Application Passwords
4. **Каждый сайт = продаваемый актив** — дашборд не должен быть привязан к конкретному сайту
5. **Graceful degradation** — если GA4/GSC не подключён, показывать placeholder, не ломаться
6. **AI-команды idempotent** — повторный запуск не должен ломать данные
7. **Все секреты в .env** — никаких hardcoded ключей
8. **Логировать всё** — AI команды, деплои, sync результаты

---

## 14. Дизайн-система

Из прототипа:
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
Font Mono:      JetBrains Mono (метрики, коды, URL)
```

Иконки типов контента: 📋 review, ⚖️ comparison, 📖 guide, 🎯 quiz, 🔧 tool, 📁 category

Статусы: Live (зелёный), Draft (жёлтый), Plan (фиолетовый), Setup (жёлтый), WIP (жёлтый), Queue (фиолетовый), Idea (серый)

---

## 15. Ссылка на прототип

Рабочий артефакт (React JSX, ~270 строк) с полной UI-логикой находится в файле
`prototype/seo-command-center.jsx`. Используй его как reference для UI/UX,
но разбей на компоненты при переносе.
