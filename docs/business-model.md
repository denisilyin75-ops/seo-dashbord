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

## 11. Связь с файлами памяти

- `memory/project_scc_business_model.md` — краткая версия + pointer на этот документ
- `memory/project_supreme_principle.md` — user-first governs all
- `memory/project_agents_architecture.md` — агенты как фундамент продукта
- `docs/agents.md` — реестр агентов
- `docs/backlog.md` — что делаем когда

---

_Документ живой. Переосмысливается после каждого значимого feedback'а или pivot'а._
