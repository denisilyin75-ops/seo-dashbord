# SCC Business Model & Product Vision

> **Статус:** living document v1 — 2026-04-18
> **Обновляется по мере эволюции продукта.**

---

## 1. Что мы строим

**SEO Command Center (SCC)** — Command Center для владельцев портфелей
affiliate/SEO сайтов. Единая панель для:
- Управления N сайтами из одной точки
- Запуска и настройки AI-агентов (контент, мониторинг, монетизация, оценка)
- Использования **собственных** AI-ключей или локальных LLM
- Подготовки сайтов к продаже (экзит)

**Позиционирование:** не "ещё один обзорник", не "ещё один SEO-инструмент",
а **операционный центр affiliate-портфеля** — место, где сходятся контент,
метрики, монетизация и стратегия.

---

## 2. Почему это актуально сейчас

| Тренд | Что это даёт SCC |
|-------|------------------|
| Инфляция AI-инструментов (ChatGPT → десятки агентов) | Хаос без единой точки управления → спрос на Command Center |
| Open models догоняют closed | Можно запускать локально, не платя per-token |
| Affiliate-экзиты растут (Empire Flippers, Motion Invest, Flippa) | Систематизированный портфель продаётся дороже |
| E-E-A-T Google требует прозрачности | Наш supreme principle (честность + TCO) = конкурентное преимущество |
| Burnout solo-маркетологов | Нужны агенты, которые делают рутину, а не просто "пишут посты" |

---

## 3. Аудитория — 4 персоны

### 👤 P1: Solo affiliate-owner (наш Denis сейчас)
- 1-3 сайта, бюджет $50-500/мес на инструменты
- Хочет автоматизации, не хочет команды
- Мотивация: пассивный доход → экзит через 1-3 года
- **80% early adopters**

### 👥 P2: Small team affiliate-studio
- 3-10 сайтов, 2-5 человек в команде
- Нужны роли (редактор / SEO / менеджер)
- Бюджет $200-2000/мес
- Мотивация: масштабирование портфеля, продажа кластера

### 🏢 P3: Agency (affiliate + client work)
- 10-50 сайтов, в том числе клиентские
- Нужны white-label отчёты, per-client изоляция
- Бюджет $1k-10k/мес

### 🛠 P4: Self-hosted enthusiast
- Технический, имеет Mac Studio / GPU server
- Использует open-source модели (Llama, Qwen, DeepSeek)
- Не хочет платить за облако — качает SCC и разворачивает сам
- Маржа: ноль напрямую, но дают feedback и contributions

---

## 4. Бизнес-модель — три слоя

### Слой A: Open-source Core (бесплатно)
- Весь SCC-код на GitHub
- Self-hosted вариант для P4 и дата-sensitive P3
- Bring-your-own AI keys (Anthropic, OpenAI, OpenRouter, Ollama локально)
- Общественные агенты (все 8+ текущих)

**Что это даёт нам:** комьюнити, баг-репорты, контрибуции новых агентов, распространение бренда.

### Слой B: Managed Cloud (subscription)
- Мы хостим для P1 и P2 — они не возятся с Docker/VPS
- Bring-your-own AI keys (не оплачиваем за них API)
- Ставка: $9-29/месяц с сайта (или от количества агентов)

**Tiers (набросок):**
| Tier | $/мес | Сайтов | Агентов | Хранилище |
|------|-------|--------|---------|-----------|
| Starter | $9 | 1 | До 5 | 1 GB |
| Growth | $29 | 5 | Все | 10 GB |
| Studio | $99 | 25 | Все + приоритетная поддержка | 100 GB |
| Agency | По запросу | ∞ | Все + white-label | ∞ |

### Слой C: Marketplace агентов (комиссия)
- Сообщество публикует кастомных агентов
- SCC берёт 15-30% комиссии при установке премиум-агента
- Кто пишет агентов: opinionated experts в нишах (food blogs, outdoor, crypto)

**Пример:** "Amazon Review Generator" за $9/мес, мы берём $2.

### Слой D: Managed AI credits (опционально, далеко)
- Для тех кто не хочет возиться с ключами
- Маржа 20-30% поверх Anthropic/OpenAI
- Решение на потом, не core

### Слой E: Managed Services — «Сайт под ключ» ⭐

**Для кого:** люди с деньгами и без времени. Инвесторы / предприниматели из
смежных областей, кто хочет affiliate-актив в портфель, но не хочет разбираться.

**Три подмодели:**

#### E1. Done-for-you (full management)
- Клиент передаёт нам сайт (или мы разворачиваем с нуля по его нише)
- Мы ведём всю операционку: контент, SEO, партнёрки, мониторинг
- Клиент получает отчёты через клиентскую копию SCC (view-only)

**Pricing options:**
- **Fixed monthly:** $500-5000/мес в зависимости от сайта
- **Revenue share:** 30-50% revenue (они 70%, мы 30%) — выгодно для сайтов с потенциалом
- **Hybrid:** $300/мес базовая + 20% от revenue выше $X

#### E2. Done-with-you (coaching + setup)
- Клиент работает сам через SCC, мы помогаем
- Onboarding call + ежемесячный ревью
- Настройка агентов, контент-стратегия, разбор метрик
- Pricing: $200-500/мес per client

#### E3. Portfolio acquisition (инвестиционный путь)
- Покупаем у ребят недооценённые affiliate-сайты на Flippa / Telderi / Empire Flippers
- Прогоняем через SCC-автоматизацию + supreme principle (честный рефреш)
- Перепродаём через 6-12 месяцев с наценкой 2-3×
- Мы не только продаём инструмент — мы его используем для собственного экзита

**Почему работает:**
- У нас есть **практический опыт** (popolkam + 4beg) — мы не «коучи-теоретики»
- Сам SCC даёт **прозрачность клиенту** (он видит каждое действие агентов в логах)
- **Supreme principle как маркетинг:** «мы не накрутим вам нечестный контент, мы ведём сайты которые можно продать»

**Что нужно от SCC для поддержки Managed Services:**
- Client-facing view-only интерфейс (отчёты без права редактировать)
- Role-based access (owner / manager / client)
- Отдельные workspaces для каждого клиента
- White-label возможность (subdomain / custom colors / logo)
- Автоматическая генерация monthly report (PDF с метриками и action log)

Это всё укладывается в multi-tenant архитектуру из Stage 1+.

#### Приоритеты запуска Managed Services

| Тип | Когда | Почему в таком порядке |
|-----|-------|------------------------|
| E3 Portfolio (self-test) | Уже сейчас | popolkam + 4beg — это и есть E3 в зародыше |
| E2 Coaching | Q3 2026 | Низкие обязательства, высокая маржа, learning по клиентам |
| E1 Full management (revenue share) | Q4 2026 | После 3-5 успешных E2 клиентов → уверенно масштабируем |
| E1 Full management (fixed monthly) | Q1 2027 | Когда есть команда (2-3 человека) |
| White-label для агентств (P3) | Q2 2027 | Когда SCC отточен |

**Риски managed services:**
- Не масштабируется без команды (1 оператор = 5-10 сайтов максимум)
- Конфликт интересов (свой портфель vs клиентский)
- Ответственность за чужой бизнес — юридические риски

**Ответы на риски:**
- Команда — нанимается только после Stage 1 (первые $5k MRR)
- Конфликт интересов — разные ниши для своего портфеля и клиентских
- Юридические риски — договор с лимитом ответственности + страхование профрисков

---

## 5. Текущее состояние vs целевое

### Сейчас (Solo — Stage 0)
- Одна инсталляция, один пользователь (Denis)
- `.env` содержит глобальные ключи (OPENROUTER_API_KEY, AUTH_TOKEN)
- БД: sites, articles, plan, agents — без user_id, workspace_id
- Одна организация, один акк

### Целевое (SaaS — Stage 2+)
- Multi-tenant: workspaces с изоляцией данных
- Users + Roles (owner / editor / viewer)
- Per-user AI credentials (зашифрованы)
- Per-agent provider choice (использовать Ollama локально для idea_of_day, Sonnet для site_valuation)
- Billing integration (Stripe / Paddle)

### Переход (стадии)

| Stage | Название | Длительность | Цель |
|-------|----------|--------------|------|
| **0. Solo** (сейчас) | Denis + popolkam + 4beg | Q2 2026 | Обкатка архитектуры и агентов |
| **1. Private Beta** | 3-5 доверенных коллег | Q3 2026 | Feedback от real users |
| **2. Public OSS** | GitHub public, self-hosted doc | Q4 2026 | Комьюнити, первые стразы |
| **3. Managed Cloud Beta** | Closed beta с $9 tier | Q1 2027 | Первые paying users |
| **4. Public Launch** | ProductHunt, блог, контент | Q2 2027 | 100-500 paying users |
| **5. Marketplace** | Агенты от сообщества | Q4 2027 | Revenue share |

---

## 6. Архитектурные решения (сейчас → multi-user)

### 6.1 Abstraction layers — что закладываем сегодня

Даже в Solo-режиме код пишем с расчётом на multi-user через абстракции:

**a) "Workspace" вместо глобальных настроек**
Сейчас: `sites`, `articles`, `content_plan` — без owner
Надо: FK `workspace_id` на каждую таблицу, default workspace='default'
Миграция: ALTER TABLE ADD COLUMN workspace_id DEFAULT 'default'

Пока ничего не меняем, но **никогда не добавляем новые таблицы без workspace_id**.

**b) AI Provider abstraction**
Сейчас: в `services/claude.js` hardcoded две ветки (anthropic / openrouter)
Надо: единый интерфейс `ProviderInterface { call(messages, config) → {text, tokens, cost} }`

**Провайдеры к поддержке:**
| Провайдер | Статус | API | Где хостится |
|-----------|--------|-----|--------------|
| Anthropic (Claude) | ✅ есть | SDK | Cloud |
| OpenRouter | ✅ есть | OpenAI-compatible | Cloud (proxy) |
| OpenAI (GPT-4/5) | TODO | SDK | Cloud |
| Google Gemini | TODO | SDK | Cloud |
| Mistral | TODO | OpenAI-compatible | Cloud |
| DeepSeek | TODO | OpenAI-compatible | Cloud |
| Groq | TODO | OpenAI-compatible | Cloud (быстрый inference) |
| **Ollama** | TODO | OpenAI-compatible (:11434) | **Local (Mac Studio / GPU server)** |
| **LM Studio** | TODO | OpenAI-compatible (:1234) | **Local** |
| **vLLM / llama.cpp** | TODO | OpenAI-compatible | **Local / self-hosted** |
| **Custom OpenAI-compatible endpoint** | TODO | OpenAI-compatible | **Any bring-your-own URL** |

**Ключ:** большинство локальных LLM-инструментов выставляют **OpenAI-совместимый API**. Значит одна абстракция покрывает 90% случаев (base_url + api_key + model).

**c) Agent-level provider selection**
Сейчас: все агенты используют один глобальный AI_PROVIDER
Надо: у каждого агента поле `provider_preference` в конфиге — "anthropic" | "openai" | "ollama" | "custom" + fallback chain

**Пример:**
- `idea_of_day` → дешёвый Haiku или локальный Qwen (not critical)
- `site_valuation` → Sonnet (reliable reasoning)
- `listing_generator` → Opus (high stakes, going to buyer)
- `analytics_review` → локальная Llama 70B (privacy: метрики не уходят в cloud)

**d) User/Tenant isolation (вводим позже)**
Сейчас: никакого разделения
Когда вводим Stage 1: таблица `users`, каждая сущность получает `user_id` owner + `workspace_id`

### 6.2 Local LLM — критическая возможность

**Почему важно:**
- Privacy для P3/P4 (данные метрик не уходят в облако)
- Zero per-token cost после initial hardware investment
- Latency для on-demand агентов
- Свобода от rate limits и API outages

**Что поддерживаем (приоритет):**
1. **Ollama** — стандарт де-факто для локального inference, OpenAI-compatible на `:11434/v1`
2. **LM Studio** — GUI-wrapper с OpenAI API на `:1234/v1`, Mac-friendly
3. **Custom OpenAI-compatible endpoint** — любой (vLLM, llama.cpp server, text-generation-inference)

**Поддержка удалённого доступа:**
Для пользователя в облаке SCC → LLM дома:
- Cloudflare Tunnel (рекомендуем): https://my-llm.cloudflare.app
- Tailscale MagicDNS
- ngrok / localtunnel (для тестов)

**Конфиг в UI выглядит так:**
```
Provider: [Custom OpenAI-compatible ▼]
Base URL: [https://my-llm.cloudflare.app/v1]
Model:    [qwen2.5-72b-instruct]
API key:  [optional — if endpoint requires one]
[Test connection]
```

### 6.3 Credentials storage (при переходе к multi-user)

Сейчас: `.env` на сервере (один на всех)
Надо: таблица `user_credentials(user_id, provider, encrypted_key)` + master key в env

Шифрование: `AES-256-GCM` с master_key из env. При запросе агента — расшифровываем на время runtime, не храним в памяти.

### 6.4 Billing (при managed cloud)

- **Stripe** для subscription (более universal) или **Paddle** (включает VAT handling)
- Usage-based tracking (если не bring-your-own keys) — каждый agent_run с cost_usd
- Per-workspace quota (не per-site) для flexibility

---

## 7. Конкуренты и УТП

### Конкуренты

| Конкурент | Что делают | Что им не хватает |
|-----------|-----------|-------------------|
| **SEMrush / Ahrefs** | Аналитика, keyword research | Не делают контент, не управляют агентами |
| **Surfer SEO** | Оптимизация under существующего контента | Только single-site, только optimization |
| **Content at Scale** | Массовая AI-генерация | Низкое качество, не подходит для supreme principle |
| **Postrank / Outrank** | AI-writers с SEO-guardrails | Single-tool, нет multiagent |
| **Frase / Jasper** | Content creation + editing | Нет портфельного взгляда |
| **Seolooper, SERPWorker** | Automation для агентств | Корпоративные, не для solo |

### Наше УТП (supreme principle defines)

1. **Портфельный взгляд** — не про один сайт, а про N
2. **Multiagent framework** — не один workflow, а экосистема специализированных
3. **Supreme principle** — мы честные (нет в других инструментах, они про "быстро массово")
4. **Bring-your-own AI** — не перепродаём токены, без комиссии
5. **Local LLM поддержка** — privacy + свобода (критично для P3/P4)
6. **Exit-ориентированность** — Site Valuation + Listing Generator готовит к продаже
7. **Open-source core** — доверие, можно форкнуть, community-driven

---

## 8. Риски и ответы

| Риск | Как отвечаем |
|------|--------------|
| Google/Anthropic выкатят свой аналог | Open-source core → нас не убьют, всегда будет self-hosted путь |
| AI-контент начнёт штрафоваться Google | Supreme principle нас спасает: глубокие обзоры + human touch |
| Нишевые сайты дешевеют | Переориентируемся на agencies (P3) — clients всегда платят |
| Не хватает ресурсов на SaaS infra | Stage 2 (self-hosted) перед Stage 3 (managed) → не рано |
| Конкурент скопирует | Supreme principle + community moat + мы быстрее |

---

## 9. Что делаем сейчас и что НЕ делаем

### Делаем (Stage 0, Q2 2026)

- ✅ Solo operations (Denis)
- ✅ popolkam.ru как reference site
- ✅ 4beg.ru как второй живой портфель
- ✅ 8+ агентов (metrics, brief, freshness, offers, analytics, valuation, expenses, ideas)
- ✅ Чистая архитектура (abstractions where needed)
- 🔜 Content Egg integration + real offer health
- 🔜 Expense tracker UI + manual entries
- 🔜 Site valuation с adjustments

### НЕ делаем (пока)

- ❌ Multi-user / auth system (JWT, OAuth)
- ❌ Billing (Stripe)
- ❌ Marketplace агентов
- ❌ White-label
- ❌ SaaS landing page

**Но:** при добавлении новой таблицы/фичи держим в голове — "это сломает multi-user?".

### Будущий roadmap (Stage 1-3)

См. раздел 5. Migration к multi-user происходит когда:
1. Есть 3+ заинтересованных beta-tester'а
2. Денежный поток с 2 sites Denis покрывает инфраструктуру SaaS
3. Готова документация для self-hosting

---

## 10. Принципы при разработке

Эти принципы работают вместе с supreme principles:

1. **Решение сегодня не должно закрыть путь завтра** — думаем про multi-user при любой новой таблице/endpoint
2. **Провайдеры равны** — не зашиваем Anthropic как "правильный". Ollama, OpenAI, custom endpoint — равноправные граждане
3. **Privacy first для P3/P4** — data locality возможна, ключи шифруются
4. **Open-source core** — всё что не billing или managed infra — публично
5. **Bring-your-own AI** — по умолчанию, не продаём токены

---

## 11. Longevity & Adaptation — как остаёмся релевантными

**Вопрос:** насколько долгосрочна эта модель? Мир меняется, AI меняет поведение
пользователей, Google меняет алгоритмы.

### Горизонты уверенности

| Горизонт | Уверенность | Почему |
|----------|-------------|--------|
| **5 лет** | Высокая | Affiliate-сайты существуют, экзит-рынок живой, supreme principle растёт вместе с E-E-A-T трендом Google |
| **10 лет** | Средняя | AI-answers в SERP будут давить informational queries; сдвиг к интерактиву + портфельным активам |
| **20+ лет** | Неопределённо | Ядро «command center для digital assets» выживает при любом pivot. Специфика affiliate может измениться |

### Основные угрозы и ответы

| Угроза | Реальность | Наш ответ |
|--------|-----------|-----------|
| AI-answers (Google SGE, Perplexity) | −20-40% CTR на informational | Supreme principle (глубина, TCO, реальный опыт) — Google SGE всё равно цитирует источники с E-E-A-T |
| AI-shopping-assistants (Amazon Rufus) | Покупают в платформе, минуя сайты | Сдвиг контента к формату quiz/tool/guide (не заменимы bot'ом) |
| Аудитория уходит в видео/соцсети | YouTube + TikTok забирают атрибуцию | Мы уже в портфельной модели — один сайт давно не стратегия |
| Новые AI-инструменты убивают «простые агрегаторы» | Конкуренция ускоряется | Open-source + multiagent framework = быстрая адаптация |

### Архитектурные механизмы адаптации

1. **Provider abstraction** — новый AI-провайдер/модель = 1 файл в `services/ai/providers/`. Архитектурно готовы к Claude 5, Gemini 3, DeepSeek 4, MCP, Swarm.
2. **Modular agents** — устаревший агент удаляется; новый добавляется. Нет монолитной логики, зашитой в ядро.
3. **Open-source core** — community обнаруживает новые тренды раньше нас и публикует агентов.
4. **Strategy docs как живые документы** — `docs/strategies/*.md` пересматриваются по мере изменения ниши.
5. **Devlog** — ежемесячный self-review: где свернули не туда?

### Процессы вокруг продукта

- **Ежеквартальный trend review** — Google algo updates, AI landscape, affiliate networks → решение в `devlog.md`
- **Portfolio как R&D полигон** — popolkam + 4beg (и будущие) = реальный тест любой идеи до продуктизации
- **Community loop** (Stage 2+) — OSS-репозиторий даёт раннее обнаружение проблем, feature requests, контрибуции
- **Pivot readiness** — нет инвесторов, нет замороженной стратегии. Pivot за 2-4 недели

### Pivot paths — если модель начнёт сдавать

| Что умрёт | Куда сдвигаемся | Что остаётся |
|-----------|------------------|--------------|
| Affiliate revenue | Managed services для любых content-активов (блоги, newsletter, SaaS) | SCC, agent framework, supreme principle |
| Content marketing | PPC optimization agents, Shopify store management | SCC, agent framework, managed services |
| SEO | Social media operators, YouTube channel management | SCC, multiagent pattern |
| Человеческий контент | AI-assisted editorial (не AI-replaced) | Supreme principle актуален даже в этом сценарии |

### Почему multiagent command center переживёт любой pivot

Фундаментальная потребность: **оператору нужна единая панель для управления N цифровыми активами с помощью AI-агентов**. Это паттерн, а не специфика affiliate:

- Блогеры: агенты для email, SEO, соцсетей
- Shopify-owners: мониторинг товаров, динамическое ценообразование, review management
- Newsletter операторы: контент-планирование, аудиенс-сегментация, A/B тесты
- SaaS стартапы: customer success automation, marketing ops

При pivot'е мы меняем агентов — не ядро.

### Product Vision 2.0 — Vertical Product Finder (закреплено 2026-04-18)

**Эволюция модели:** от «affiliate-блог с 30 обзорами» → к **vertical product finder** с покрытием всего рынка + editorial depth для флагманов.

**Проблема старого подхода:** 30 обзоров = 30 point-of-entry. Пользователь с нишевым запросом («белый чайник 2л быстрый нагрев») либо не находит нас, либо мы показываем ему нерелевантный обзор. Long-tail монетизация упущена.

**Новое решение — 4-layer архитектура:**

```
┌─ Layer 4: Editorial ─────────────────────────────┐
│  30-50 deep обзоров на рубрику (CPT machine)     │
│  Наша экспертиза, мнение, «реальный опыт»       │
│  SEO-target pages, глубокие comparison'ы        │
└──────────────────┬───────────────────────────────┘
                   │ связь через editorial_review_id
┌─ Layer 3: Matching engine ───────────────────────┐
│  L3.1 Scoring quiz (детерминированный MVP)      │
│  L3.2 NL query parsing (Claude → criteria)       │
│  L3.3 RAG semantic matching (Phase 3, >1k items) │
└──────────────────┬───────────────────────────────┘
                   │ читает products table
┌─ Layer 2: Enrichment pipeline ───────────────────┐
│  Regex/known-spec parsers (70% атрибутов)        │
│  AI fallback на Claude Haiku / local LLM         │
│  Batch enrichment: ~$0.10-0.30 на 100 offers     │
└──────────────────┬───────────────────────────────┘
                   │ пишет attributes_json
┌─ Layer 1: Catalog (полный рыночный охват) ──────┐
│  SCC products table (SQLite sep from WP)         │
│  Admitad XML / Я.Маркет YML / Ozon feeds         │
│  Cron feed_sync каждые 6 часов                   │
│  5000+ offers на вертикаль                       │
└──────────────────────────────────────────────────┘
```

**Вклад каждого слоя:**

| Layer | Что даёт | Усилие | Срок |
|---|---|---|---|
| 1. Catalog | Полнота: 5000+ товаров, которых мы не писали | Один агент feed_sync + таблица | Phase 1 (Week 3-6) |
| 2. Enrichment | Structured attributes для matching | AI батчи + regex | Phase 2 (Month 2-3) |
| 3. Matching | Quiz/NL-поиск → конкретный товар | Scoring → AI → RAG | Phase 1-3 постепенно |
| 4. Editorial | Depth и доверие для флагманов | Ручная работа, ~30-50 моделей | Уже делаем (Phase 0) |

**Монетизация:**
- Editorial (30 обзоров): high-trust, high-CTR, но узкое покрытие
- Catalog matching (5000+): long-tail монетизация, тысячи niche-sales с меньшим чеком
- Вместе: editorial = 20% revenue с 80% trust, catalog = 80% revenue через coverage

**UX принцип:** editorial **всегда** имеет приоритет в ranking. Если у нас есть обзор — всплывает первым, даже если по metrics не топ. Если нет — честно показываем matched product из feed + warning «мы не тестировали лично, но по критериям подходит».

**Unique value proposition:** Я.Маркет = агрегатор без интента (user должен сам знать что искать). Блоги = 30 обзоров без coverage. **Мы = intent-matching + editorial + coverage**. В RU никто реально этого не делает.

**Exit implications:** старый shape = $50k exit (affiliate-блог портфель). Новый shape = **$100-200k+** потому что differentiation реальна, и движок (matching engine + feed pipeline) продаётся как SaaS-actifact отдельно.

---

### AI Routing — cloud + local гибрид (закреплено 2026-04-18)

**Проблема:** Claude Sonnet на OpenRouter = $3/млн input tokens. Enrichment 5000 товаров × 500 tokens = 2.5M tokens = ~$10 за батч. Делаем раз в день → $300/мес только на enrichment. На scale (4 рубрики × 5000 offers) → $1200/мес. Не оправдано для bulk задач.

**Решение — routing по типу задачи:**

| Тип задачи | Провайдер | Модель | Обоснование |
|---|---|---|---|
| Публикация контента (user-facing) | OpenRouter | claude-sonnet-4 | Качество критично, один-в-одни статьи |
| NL quiz parsing | OpenRouter | claude-haiku-4 | Скорость важна, простая задача |
| AI-brief для обзоров | OpenRouter | claude-sonnet-4 | Структурная, качество важно |
| Attribute enrichment (bulk feed) | **Local LLM** | mistral-7b / qwen2-7b | Скорость не критична, объём большой, privacy (наши данные) |
| Site Guardian analysis (bulk) | **Local LLM** | qwen2-7b / llama3.2-8b | Аналитика наших же страниц, cost-sensitive |
| Daily Brief AI comments | OpenRouter | claude-haiku-4 | Быстро, свежо |
| Idea generation | OpenRouter | claude-sonnet-4 | Креатив требует хорошую модель |

**Local LLM как первый провайдер для подходящих задач:**
- Текущая инфра: Ollama / LM Studio на машине пользователя (или отдельный server)
- Интеграция: SCC `claude.js` расширяется 3-м провайдером `local` с OpenAI-compatible endpoint
- Fallback chain: local → OpenRouter Haiku → OpenRouter Sonnet (если local недоступен)
- Cost savings: 80-95% на bulk задачах → экономия ~$300-1000/мес на scale

**Детали стратегии:** см. `docs/ai-routing.md`.

---

### Принцип «смежного плода» — как растим рубрики и портфель

**Правило:** следующая рубрика на сайте должна отстоять от предыдущей не дальше чем «adjacent keyword» в семантическом дереве ниши. Запуск через семантическую пропасть = начать сайт заново, без накопленной authority.

**Почему это работает:**
1. **Google (после Helpful Content Update) награждает глубину в adjacent semantic clusters**, не набор разрозненных тем. Каждая следующая статья переиспользует topical authority накопленный в соседнем кластере через internal linking, доменный траст, E-E-A-T.
2. **Консистентность голоса и персоны** — Дарья-химик органично пишет про пылесосы (смежная техника для чистоты), но не про кофемашины (другой эксперт, другой голос).
3. **Нулевая стоимость миграции пайплайна** — AI-бриф шаблоны, блок цен, мерчанты, SubID'ы остаются те же для adjacent рубрик. Для чистой новой ниши — 2-3 недели адаптации с нуля.
4. **Хедж рисков внутри topical cluster** — если одна модель не пошла, соседняя тянет домен вверх. Диверсификация _внутри_ кластера, не _между_ кластерами.

**Trigger для запуска следующей рубрики:**
- 9-15 статей в текущей рубрике опубликованы (база topical authority)
- Есть первый органический трафик (Google принял)
- Текущая рубрика остаётся **drive** (продолжаем в неё писать), следующая идёт на 50-70% ритма

**Текущее распределение портфеля:**

| Сайт | Персона | Anchor-cluster | Очередь рубрик (phase 1 → 5) |
|---|---|---|---|
| popolkam.ru | Редакция «техника для кухни» | «Горячие напитки + приготовление» | Кофемашины → Чайники → Блендеры → Посудомойки → Мультиварки |
| aykakchisto.ru | Дарья Метёлкина, химик | «Чистота дома — химия + техника» | Бытовая химия / трудные случаи → Роботы-пылесосы → Пароочистители → Стиральные машины → Обычные пылесосы |
| 4beg.ru | Редакция «бег и экипировка» | «Бег» | Беговые кроссовки → Беговая одежда → Часы/треки → Гели + рюкзаки |

**Чего НЕ делаем:**
- ❌ popolkam + «техника для авто» — другой semantic, другая аудитория
- ❌ aykakchisto + «DIY-косметика» — другая expertise, не химик-уборщик
- ❌ 4beg + «спортпитание» — другой эксперт (диетолог, не обозреватель экипировки)

**Проверка перед запуском новой рубрики** (шорт-чек на 30 секунд):
1. Та же аудитория (или узкое расширение — те же люди + близкий сегмент)?
2. Те же мерчанты / CPA программы работают (или subset)?
3. Тот же AI-пайплайн переиспользуется без переделки?
4. Голос и persona сайта НЕ меняются?
5. Семантически между рубриками есть топикальный мост (общие под-темы, запросы, FAQ)?

Если все 5 — да, берём. Если хоть одно «нет» — **открываем новый сайт под ту рубрику**, не пихаем в существующий.

### Self-check правило

В **devlog.md** раз в квартал: одна запись-ретроспектива:
- Что изменилось на рынке за квартал?
- Что мы адаптировали / не успели адаптировать?
- Где потенциальные слепые зоны?
- Какие агенты устарели, какие добавить?

Это наш механизм оставаться современным системно, а не реактивно.

---

## 12. Связь с файлами памяти

- `memory/project_scc_business_model.md` — краткая версия + pointer на этот документ
- `memory/project_supreme_principle.md` — user-first governs all
- `memory/project_agents_architecture.md` — агенты как фундамент продукта
- `docs/agents.md` — реестр агентов
- `docs/backlog.md` — что делаем когда

---

_Документ живой. Переосмысливается после каждого значимого feedback'а или pivot'а._
