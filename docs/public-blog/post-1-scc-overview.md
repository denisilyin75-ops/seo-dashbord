---
title: "SEO Command Center — control panel для affiliate-портфеля на Claude"
date: 2026-04-19
tags: [claude, affiliate-seo, buildinpublic, anthropic]
audience: ["Anthropic case study", "Hacker News", "Indie Hackers"]
canonical: https://github.com/denisilyin75-ops/seo-dashbord
draft: true
---

# SEO Command Center — control panel для affiliate-портфеля на Claude

Я строю портфель affiliate-сайтов. Задача — несколько WordPress-сайтов в разных нишах, живущие параллельно: кофемашины (popolkam.ru), бытовая химия (aykakchisto.ru), беговые кроссовки (4beg.ru) и дальше.

Классическая проблема такого портфеля — **оператор становится узким местом**. Нужно следить за метриками каждого сайта, публиковать регулярно, проверять цены партнёров, обновлять устаревшие статьи, мониторить broken links, считать сколько это всё стоит.

Обычный путь — Google Sheets + Ahrefs + ручные скрипты + терпение. Я выбрал другой: **построить свой control panel и делегировать Claude всё что можно автоматизировать**.

## Что получилось — SCC (SEO Command Center)

Node.js + React + SQLite, всё в одном Docker-контейнере за Traefik'ом. Self-hosted, один файл БД. На момент поста — 3 сайта подключены, 8 автоматических агентов активны, 60+ API endpoints.

### 8 встроенных агентов

| Агент | Периодичность | Что делает |
|---|---|---|
| `metrics_sync` | daily 03:00 | Pull sessions/revenue из GA4 + GSC |
| `daily_brief` | daily | Генерит 4 карточки: health/pulse/idea/quickWin (Sonnet) |
| `site_valuation` | weekly | Считает asset value (для planning exit) |
| `offer_health` | hourly | Пинг affiliate URLs, детект broken |
| `content_freshness` | weekly | Flag stale content + price drift |
| `expense_tracker` | daily | AI agents cost + manual expenses |
| `analytics_review` | weekly | Trend analysis через Sonnet |
| `idea_of_day` | on-demand | Генерит идеи постов с expected value в $ |

### Плюс 4 fresh agent-системы (построены за 24-часовой sprint недавно)

1. **Code Review Agent** (4 фазы: post-commit → nightly → weekly → monthly)
   - post-commit hook → Haiku делает diff review → `docs/review_log.md`
   - nightly: auto-generates `docs/api-reference.md` + `docs/architecture.md`
   - weekly: security audit + code smells
   - monthly: exit-readiness scorecard (15 dimensions, /100)

2. **Content Quality Agent** (6 deterministic dimensions)
   - SEO hygiene, schema, link health, readability, E-E-A-T, voice persona
   - Nightly batch per-site → issues в единую `content_health` таблицу
   - LLM-dimensions позже когда поедем на local Qwen-72B

3. **Article Import & Actions** (4 фазы)
   - FTS5 full-text search + bulk ops в Articles list
   - Import URL через Mozilla Readability → research material
   - 5 AI actions: translate / rewrite-preserve / rewrite-voice / structural-analysis / fact-extraction
   - **AI merge workflow**: 2+ наших статей → одна консолидированная (fixes cannibalization)

4. **Deploy Wizard V2** (queue + host-worker pattern)
   - 5 шаблонов ниш (coffee-review / cleaning / running-shoes / electronics / custom)
   - 1 клик → WordPress + Let's Encrypt SSL + плагины + категории за 10-15 мин
   - Host-worker polls SCC для queued tasks (SCC container не имеет docker socket)

## Почему это выгодно делегировать LLM

**Точные costs прямо сейчас** (из SCC `llm_calls` таблицы, 30-day window):
- $0.00147 total — 1 test call на Haiku structural_analysis (2145 tokens)
- Остальные агенты пока deterministic или с заглушками

**Проекция в production:**
- Daily Brief (Sonnet ×2 per site × 3 sites × 30 days) ≈ $5/мес
- Code Review post-commit (Haiku, ~1 commit/день) ≈ $0.20/мес
- Nightly api-reference + weekly audits (deterministic) ≈ $0
- Monthly scorecard (deterministic) ≈ $0
- Content Quality LLM-dims (когда добавим voice/factual) ≈ $10-20/мес
- **Total:** ~$15-25/мес на всю автоматизацию 3 сайтов

**Альтернатива — нанять junior SEO оператора:** $600-1000/мес + ошибки + обучение + текучка.

## Архитектурные решения, которые получились правильными

### 1. Local-first routing с fallback chain

```js
callWithFallback({ preferredChain: ['local', 'openrouter', 'anthropic'] })
```

Когда мой home-server с 2×RTX 3090 online (Tailscale VPN), bulk-задачи (content-quality, enrichment) идут на Qwen-72B локально — бесплатно и приватно. Publication-critical (voice rewrite, merge) остаются на Sonnet через OpenRouter.

Проектируя, сразу сделал провайдер-абстракцию. Переход на local = добавить `LOCAL_LLM_URL` в `.env` + restart. Никакого кода не трогаем.

### 2. Queue + poll для deploy (SCC container не имеет docker socket)

SCC пишет `deploy_tasks` в SQLite → host-worker polls каждые 5s через authenticated API → забирает atomic (CAS) → запускает bash provision-site.sh на host → streams logs назад.

Security: SCC не получает root-доступ к host. Worker-token отдельный от user-auth.

### 3. FTS5 + triggers для full-text search 10k+ статей

SQLite FTS5 virtual table с auto-sync triggers. 366 статей 4beg.ru индексируются моментально. Поиск кириллицы работает через `unicode61 remove_diacritics 2` tokenizer + u-flag regex в voice checks (Node `\b` без u-flag не распознаёт Russian word boundaries).

### 4. Auto-generated docs через code-review-agent

**`docs/api-reference.md`** регенерируется nightly:
- Regex-парсер `server/routes/*.js` → 60 endpoints в 15 группах
- Mount-points из `server/index.js` (app.use prefixes)
- JSDoc above route definitions → descriptions в таблице

**`docs/architecture.md`** auto-sections (между маркерами `<!-- AUTO:counts start -->`):
- Tables: 21, API endpoints: 60, Services: 27, Components: 32, Pages: 6
- Backend 7157 LOC, Frontend 5981 LOC
- Dependency graph (top-level, static)

Результат: buyer на due diligence видит актуальную документацию **синхронизированную с кодом**, не устаревшую README.

### 5. Exit-readiness scorecard (monthly)

15 измерений × 0-100. Текущий overall 58/100:

- documentation_coverage: 91 ✓
- tests: 44 (только что добавил первый suite из 19 tests)
- secret_hygiene: 100 ✓
- commit_quality: 80% conventional ✓
- dependency_freshness: 52 (update нужен)
- **license_clarity: 0** (LICENSE file не добавлен)
- **type_safety: 8** (чистый JS + лимит 60 без TS migration)

Эта шкала **давит на меня в правильном направлении** — каждый раз когда score падает, я вижу где deployed tech debt накопился.

## Почему Claude vs OpenAI

Технически мог бы использовать GPT-4o — OpenRouter поддерживает обоих. Выбрал Claude потому что:

1. **Haiku 4.5** ($0.25/$1.25 per 1M tokens) — лучший value-per-quality в своём классе. GPT-4o-mini выдаёт хуже по русскому voice check (проверял на persona rules — forbidden phrases detect).
2. **Sonnet 4.6** для publication content — стабильно лучшие tone + less «AI-slop».
3. **Extended thinking** для сложных decisions (merge conflict resolution) — GPT не даёт аналога.
4. **Anthropic prompt caching** — design-wise уже планирую для Daily Brief's repeated system prompts (−50-80% на репетирующихся контекстах).

## Что дальше

**Ближайшие 2-3 месяца:**
- Публикация 9 обзоров popolkam (drafts готовы, ждут WP-переноса)
- aykakchisto: лицензии REHub + Content Egg → первые 10 статей
- 4beg: миграция с Timeweb на наш VPS + refresh топ-20 статей
- Первая CPA-конверсия (любой сайт) — proof-of-model

**6-12 месяцев:**
- Vertical Product Finder: отдельный catalog-service с 5000+ SKU через Admitad feed + Я.Маркет YML
- Image Curator agent inside catalog-service (press-kits + AI concept illustrations)
- Product Quiz + semantic search через embeddings

**Exit horizon:**
- $5k MRR → listing на Empire Flippers / MotionInvest
- Target 85-90/100 exit-readiness (премиум-тир)
- Estimated sale: 35-45× monthly revenue

## Links

- **Repo:** [github.com/denisilyin75-ops/seo-dashbord](https://github.com/denisilyin75-ops/seo-dashbord) (public)
- **Live demo:** [cmd.bonaka.app](https://cmd.bonaka.app) (auth-gated)
- **Tech stack:** Node.js + Express + React + Vite + SQLite + Docker + Traefik + Claude API через OpenRouter

Подписывайтесь на progress — я пишу в `docs/devlog.md` и публикую highlights здесь.

---

*Этот пост — часть serii "Build in Public" о том как я использую Claude чтобы построить affiliate SEO empire. Все numbers и архитектура — из реального SCC, не mockup.*
