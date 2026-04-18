# SEO Command Center — старт в Claude Code

Добро пожаловать. Этот набор файлов — полная спецификация проекта
"Панель управления портфелем SEO/affiliate сайтов". Всё готово для
того, чтобы открыть Claude Code в терминале и начать реализацию.

---

## 📁 Что в этом пакете

```
claude-code-project/
├── README.md                    ← ВЫ ЗДЕСЬ (инструкция по использованию)
├── CLAUDE.md                    ← Главный файл контекста (архитектура, БД, API)
├── PROJECT_CONTEXT.md           ← Бизнес-контекст (для любых новых задач)
├── AGENTS.md                    ← Спецификация 14 AI-агентов
├── ADMIN_AND_VALUATION.md       ← Админка агентов + Site Valuation
└── prototype/
    └── seo-command-center.jsx   ← Рабочий UI-прототип (reference)
```

---

## 🚀 Шаг 1. Установка Claude Code

Если ещё не установлен:

```bash
# macOS / Linux
npm install -g @anthropic-ai/claude-code

# Проверка
claude --version
```

Авторизация (один раз):
```bash
claude login
```

---

## 🚀 Шаг 2. Создание проекта и загрузка файлов

```bash
# 1. Создать папку проекта
mkdir seo-command-center
cd seo-command-center

# 2. Скопировать сюда ВСЕ файлы из claude-code-project/
#    (CLAUDE.md, PROJECT_CONTEXT.md, AGENTS.md, ADMIN_AND_VALUATION.md и папку prototype/)

# 3. Инициализировать git
git init
git add .
git commit -m "Initial: specs and prototype"

# 4. Запустить Claude Code в этой папке
claude
```

**Важно:** `CLAUDE.md` должен быть в корне проекта — Claude Code
автоматически подхватывает этот файл как контекст при каждом запуске.
Это значит, что Claude будет знать архитектуру, бизнес-цели и
принципы разработки на каждом шагу, не надо объяснять заново.

---

## 🚀 Шаг 3. Первая команда Claude Code

Когда Claude Code запустится, вставь этот промпт:

```
Привет! Я собираю панель управления портфелем SEO/affiliate сайтов.

В корне проекта лежат спецификации:
- CLAUDE.md — архитектура, БД, API, структура папок
- PROJECT_CONTEXT.md — бизнес-контекст и принципы
- AGENTS.md — спецификация 14 AI-агентов
- ADMIN_AND_VALUATION.md — админка агентов + Site Valuation Agent
- prototype/seo-command-center.jsx — рабочий UI-прототип

Пожалуйста:
1. Прочитай все эти файлы
2. Подтверди, что понял архитектуру и цели
3. Начни с Фазы 1 из CLAUDE.md (раздел 11 "План реализации"):
   - Инициализация Vite + React
   - Express backend
   - SQLite schema + migrations
   - Базовая структура папок

Двигайся по шагам, показывай мне результаты, спрашивай если
что-то неясно. Не трогай реальные API (GA4, WP REST) пока
не дойдём до Фазы 3.
```

---

## 📋 Рекомендуемый порядок работы с Claude Code

### Фаза 1 — Скелет (1-2 дня)
- Vite + React + Express + SQLite
- Структура папок по CLAUDE.md раздел 4
- Базовые API endpoints
- Перенос UI из prototype/ в компоненты

### Фаза 2 — Ядро (2-3 дня)
- CRUD статей и плана
- AI Command Center через Claude API
- Deploy Wizard UI (без реального деплоя)
- Settings page

### Фаза 3 — Интеграции (3-5 дней)
- WordPress REST API
- GA4 Data API + GSC API
- Графики метрик
- Cron jobs для sync

### Фаза 4 — Агенты и админка (5-7 дней)
- Админка агентов (см. ADMIN_AND_VALUATION.md)
- MVP-агенты: Metrics Collector, Affiliate Auditor, Backup, Alerts
- Site Valuation Agent
- Postupno остальные агенты из AGENTS.md

### Фаза 5 — Production (1-2 дня)
- Deploy на VPS (cmd.bonaka.app)
- Nginx + SSL + PM2
- n8n workflow-ы
- Backup strategy

---

## 💡 Полезные паттерны работы с Claude Code

### Паттерн "Один модуль за раз"
```
Давай сделаем только sites module:
- SQL schema
- /api/sites endpoints
- React компонент SiteCard
- Интеграция в Dashboard

Пропусти пока всё остальное.
```

### Паттерн "Покажи diff"
```
Прежде чем писать код, покажи какие файлы ты создашь
и какие изменишь. Я подтверждю или поправлю.
```

### Паттерн "Тесты сразу"
```
Для каждого нового endpoint пиши basic тест (Vitest/Jest).
```

### Паттерн "Context refresh"
Если Claude начал забывать контекст в длинной сессии:
```
Перечитай CLAUDE.md и напомни мне, на каком шаге мы остановились.
```

### Паттерн "Коммиты после каждого модуля"
```
После того как закончишь модуль — предложи commit message и закоммить.
```

---

## 🔧 Переменные окружения

Создай `.env` в корне проекта:

```bash
# Основное
PORT=3001
NODE_ENV=development
AUTH_TOKEN=change-me-to-random-secret

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Google (для интеграций, Фаза 3)
GOOGLE_APPLICATION_CREDENTIALS=./google-sa-key.json

# WordPress (для каждого сайта — в БД через settings UI)
# не сюда, а в sites.wp_app_password через админку

# Telegram alerts (Фаза 4)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# n8n (если используется)
N8N_WEBHOOK_BASE=https://n8n.bonaka.app/webhook
```

Не забудь `.env` в `.gitignore`!

---

## 🆘 Если застрянешь

### Claude забыл контекст
```
Перечитай CLAUDE.md и PROJECT_CONTEXT.md.
```

### Нужно вернуться к прототипу
```
Посмотри prototype/seo-command-center.jsx — как там реализовано X?
Давай перенесём эту логику в модуль Y.
```

### Claude предлагает не то что ты хочешь
```
Остановись. Я хочу сделать по-другому: [объясни].
Это соответствует принципу N из CLAUDE.md раздел 13.
```

### Нужно добавить новую фичу, не описанную в spec
```
Это новая фича, не в spec. Давай сначала добавим её описание в
CLAUDE.md, а потом реализуем. Предложи раздел и текст.
```

---

## 📊 Как следить за прогрессом

Создай файл `PROGRESS.md` в корне и попроси Claude его обновлять:

```
После каждого завершённого модуля обновляй PROGRESS.md —
отмечай что сделано из плана CLAUDE.md раздел 11.
```

---

## ✅ Чеклист готовности к старту

- [ ] Claude Code установлен и работает
- [ ] Папка проекта создана
- [ ] Все 5 файлов (4 .md + папка prototype/) скопированы
- [ ] Получен Anthropic API key для Claude API (https://console.anthropic.com)
- [ ] (Опционально) VPS готов для деплоя на cmd.bonaka.app
- [ ] (Опционально) Домен bonaka.app настроен

---

## 🎯 Конечная цель

Через ~2 недели должна быть рабочая панель на `cmd.bonaka.app`:

- Вход по basic auth
- Карточки сайтов с реальными метриками из GA4/GSC
- CRUD статей с синхронизацией WP
- AI-команды в каждой строке и глобально
- Deploy Wizard для разворачивания новых сайтов
- Работающие MVP-агенты (Metrics, Affiliate, Backup, Alerts)
- Site Valuation с оценкой каждого сайта
- Портфельная стоимость и трекинг роста к exit-цели

Удачи! 🚀
