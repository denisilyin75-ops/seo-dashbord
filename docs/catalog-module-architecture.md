# Catalog Module — Architecture & Implementation Plan

> **Назначение:** отдельный сервис-модуль для сбора, хранения и отдачи каталога товаров всего рынка (не только affiliate). Независимые нишевые сайты подключаются по категории и получают свой срез.
> **Стратегическая роль:** превращает портфель из «affiliate-блога с обзорами» в **independent product finder**. Усиливает SUPREME-принцип, E-E-A-T, exit-мультипликатор.
> **Статус:** v1 — 2026-04-18 — дизайн утверждён, реализация Phase 1 в Week 3-6.
> **Связано с:** `docs/business-model.md §Product Vision 2.0`, `docs/ai-routing.md`, `docs/backlog.md`.

---

## 1. Executive summary

**Что строим:** сервис `catalog-service` — отдельный Node.js сервис с PostgreSQL-бэкендом, который:

1. Собирает товары из **всех доступных источников рынка** (partner feeds → manufacturer sites → scraping как последний тир)
2. Канонизирует (один товар = одна запись, независимо от сколько retailers его продают)
3. Обогащает структурированными атрибутами (через regex + LLM)
4. Отдаёт через REST API нашим сайтам + внешним подписчикам
5. Линкуется к editorial слою (review на popolkam.ru → catalog product_id)

**Ключевая идея:** мы не прячем товары без аффилейта. Показываем **всё что есть на рынке**, а монетизируем **через честность** (trust → CTR → conversion). Это Wirecutter / RTINGS / NotebookCheck модель, в RU её никто не делает правильно.

**Scope Phase 1 (Week 3-6):** Admitad XML + Я.Маркет YML → 200-500 SKU кофемашин → REST endpoint → WP-виджет на popolkam «Все кофемашины рынка».

---

## 2. Почему отдельный сервис (не таблица в SCC)

| Причина | Детали |
|---|---|
| **Scale** | 5000 SKU × 4 рубрики × N retailers = 100k+ offer rows + millions spec entries. SQLite задохнётся на сложных joins и spec-индексах. |
| **Independence** | SCC = панель оператора, WP = фронт, catalog = data layer. Жизненные циклы разные. Смена фронта не должна ронять каталог. |
| **Multi-tenant** | Catalog должен одновременно обслуживать popolkam (coffee), aykakchisto (cleaning), 4beg (running shoes) и потенциальных внешних подписчиков SaaS. |
| **Exit value** | Catalog-service — отдельный продаваемый asset. Покупатель может забрать только его ($20-50k) без SCC и без контентных сайтов. |
| **Workload isolation** | Парсеры/скраперы/LLM-enrichment = CPU/RAM/network heavy. Не должны влиять на отзывчивость SCC UI. |

---

## 3. High-level architecture

```
                       ┌──────────────────────────────────────┐
                       │         catalog-service              │
                       │   (Node.js + TypeScript + Fastify)   │
                       │                                      │
                       │   ┌──────────────────────────────┐   │
                       │   │  Ingestion layer             │   │
                       │   │  ├─ feed-workers/ (XML/YML)  │   │
                       │   │  ├─ scrape-workers/ (Playwright) │
                       │   │  └─ ai-agent-workers/ (fallback)│ │
                       │   └──────────┬───────────────────┘   │
                       │              ▼                        │
                       │   ┌──────────────────────────────┐   │
                       │   │  Normalization + dedup       │   │
                       │   │  (brand+model→canonical_id)  │   │
                       │   └──────────┬───────────────────┘   │
                       │              ▼                        │
                       │   ┌──────────────────────────────┐   │
                       │   │  Enrichment pipeline         │   │
                       │   │  (regex + LLM attributes)    │   │
                       │   └──────────┬───────────────────┘   │
                       │              ▼                        │
                       │   ┌──────────────────────────────┐   │
                       │   │      PostgreSQL              │   │
                       │   │  products / offers / specs   │   │
                       │   │  categories / sites / links  │   │
                       │   └──────────┬───────────────────┘   │
                       │              ▼                        │
                       │   ┌──────────────────────────────┐   │
                       │   │  REST API (Fastify)          │   │
                       │   │  /search /product /facets    │   │
                       │   └──────────┬───────────────────┘   │
                       └──────────────┼────────────────────────┘
                                      │
        ┌─────────────────────────────┼────────────────────────────┐
        │                             │                            │
        ▼                             ▼                            ▼
   WP popolkam                 WP aykakchisto                 SCC (master)
   plugin catalog-client       plugin catalog-client          admin/merge UI
   → /kofemashiny/             → /pylesosy/                   → approve/dedup
```

**Deployment:** отдельный Docker-контейнер на том же VPS (5.129.245.98) после upgrade до 120GB/8GB. PostgreSQL в соседнем контейнере.

**Network:** catalog-service наружу **не выставлен**. Traefik экспонирует только `/api/catalog/*` → аутентификация через API-ключ (каждый сайт имеет свой ключ с scope-категорий).

---

## 4. Technology stack — окончательный

| Слой | Инструмент | Почему |
|---|---|---|
| Runtime | **Node.js 20 + TypeScript** | матчится с SCC (код шерится), типы для сложных моделей данных |
| HTTP | **Fastify** | 2-3× быстрее Express, schema validation из коробки |
| DB | **PostgreSQL 16** | JSONB для специфик-атрибутов, full-text search, trigram для fuzzy match, pg_trgm для dedup |
| ORM | **Drizzle ORM** | типобезопасно, без runtime overhead, миграции в SQL (не в магии) |
| XML/YML feeds | `fast-xml-parser` | streaming, низкая память для больших YML Я.Маркета (100-500MB) |
| Static HTML | `cheerio` | jQuery-API, достаточно для производителей |
| Dynamic JS | **Playwright** + `playwright-extra` + stealth | anti-bot evasion, стабильность |
| Orchestration | **Crawlee** (Apify OSS) | queues/retries/proxies/dedup из коробки, синтаксис совпадает с Playwright |
| Proxy pool | **Bright Data / SOAX residential** (только когда нужно) | $300-500/мес при 10k+ запросов/день, только для Ozon/WB |
| AI browsing agent | **Crawl4AI** или Anthropic Computer Use | fallback + discovery mode (см. §6) |
| LLM enrichment | **Qwen-72B локальный** (primary) + Haiku fallback | bulk задачи почти бесплатные |
| Embeddings | `all-MiniLM-L6-v2` локально через `@xenova/transformers` | dedup + semantic search без API costs |
| Queue | **BullMQ** + Redis | распределение задач между workers |
| Monitoring | Logs → file + stdout, metrics → простой JSON в SCC | MVP-уровень, Prometheus позже |

---

## 5. Data model — полный SQL

```sql
-- =====================================================
-- Categories hierarchy
-- =====================================================
CREATE TABLE categories (
  id           SERIAL PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,      -- "coffee-machines-auto"
  parent_id    INT REFERENCES categories(id),
  name_ru      TEXT NOT NULL,             -- "Автоматические кофемашины"
  name_en      TEXT,
  description  TEXT,
  attribute_schema JSONB,                 -- обязательные/опциональные атрибуты
  display_order INT DEFAULT 100,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- =====================================================
-- Canonical products (один товар = одна запись)
-- =====================================================
CREATE TABLE products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       INT NOT NULL REFERENCES categories(id),
  brand             TEXT NOT NULL,                   -- "DeLonghi"
  brand_normalized  TEXT NOT NULL,                   -- "delonghi" (lowercase, no spaces)
  model             TEXT NOT NULL,                   -- "Magnifica S ECAM22.110"
  model_normalized  TEXT NOT NULL,                   -- "magnifica-s-ecam22-110"
  ean_gtin          TEXT,                            -- если удалось собрать
  canonical_name    TEXT NOT NULL,                   -- "De'Longhi Magnifica S ECAM22.110"
  canonical_slug    TEXT UNIQUE NOT NULL,            -- "delonghi-magnifica-s-ecam22-110"
  year_released     INT,
  status            TEXT DEFAULT 'active',           -- active | discontinued | unreleased
  image_primary     TEXT,                            -- CDN URL
  image_gallery     JSONB,                           -- ["url1", "url2", ...]
  editorial_review_id TEXT,                          -- link на популяремку popolkam post_id
  editorial_site    TEXT,                            -- "popolkam" / "aykakchisto"
  confidence_score  REAL DEFAULT 1.0,                -- 0-1, confidence что канонизация правильная
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_normalized, model_normalized, category_id)
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand ON products(brand_normalized);
CREATE INDEX idx_products_name_trgm ON products USING gin(canonical_name gin_trgm_ops);

-- =====================================================
-- Offers (каждое предложение каждого retailer)
-- =====================================================
CREATE TABLE offers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  retailer          TEXT NOT NULL,                   -- "ozon" | "ym" | "mvideo" | "admitad:delonghi-ru"
  retailer_sku      TEXT,                            -- их внутренний ID
  url               TEXT NOT NULL,                   -- оригинал
  affiliate_url     TEXT,                            -- с SubID
  affiliate_network TEXT,                            -- "admitad" | "ya_market" | "ozon_direct"
  price             NUMERIC(12,2),
  price_currency    TEXT DEFAULT 'RUB',
  price_old         NUMERIC(12,2),                   -- до скидки
  availability      TEXT,                            -- "in_stock" | "out" | "preorder"
  rating            REAL,                            -- 0-5 если retailer отдаёт
  reviews_count     INT,
  source_type       TEXT NOT NULL,                   -- "partner_feed" | "manufacturer" | "scrape" | "ai_agent"
  source_raw        JSONB,                           -- оригинал записи (для дебага + re-parse)
  first_seen_at     TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ DEFAULT NOW(),
  last_price_change_at TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT TRUE,
  UNIQUE(retailer, retailer_sku, product_id)
);
CREATE INDEX idx_offers_product ON offers(product_id);
CREATE INDEX idx_offers_price ON offers(product_id, price) WHERE is_active = TRUE;
CREATE INDEX idx_offers_retailer ON offers(retailer);

-- =====================================================
-- Specifications (structured attributes)
-- =====================================================
CREATE TABLE specifications (
  id            BIGSERIAL PRIMARY KEY,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attr_key      TEXT NOT NULL,                       -- "pump_pressure_bar"
  attr_value    TEXT,                                -- "15"
  attr_unit     TEXT,                                -- "bar"
  attr_value_numeric NUMERIC,                        -- denormalized для range queries
  source        TEXT,                                -- "manufacturer" | "scrape:ozon" | "llm:qwen"
  confidence    REAL DEFAULT 1.0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, attr_key, source)
);
CREATE INDEX idx_specs_product ON specifications(product_id);
CREATE INDEX idx_specs_attr ON specifications(attr_key, attr_value_numeric);

-- =====================================================
-- Sources & ingestion state
-- =====================================================
CREATE TABLE sources (
  id              SERIAL PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,              -- "admitad:delonghi-ru"
  type            TEXT NOT NULL,                     -- "xml_feed" | "yml_feed" | "manufacturer_site" | "scrape_site"
  url             TEXT NOT NULL,
  retailer        TEXT,                              -- какому retailer принадлежит
  affiliate_network TEXT,
  config          JSONB,                             -- cron schedule, parser id, headers
  is_active       BOOLEAN DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  last_run_status TEXT,                              -- "ok" | "partial" | "failed"
  last_run_stats  JSONB,                             -- {added: 12, updated: 45, skipped: 3}
  consecutive_failures INT DEFAULT 0
);

CREATE TABLE ingestion_runs (
  id           BIGSERIAL PRIMARY KEY,
  source_id    INT NOT NULL REFERENCES sources(id),
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  status       TEXT,
  stats        JSONB,
  error        TEXT
);

-- =====================================================
-- Site subscriptions (какой сайт какие категории показывает)
-- =====================================================
CREATE TABLE site_subscriptions (
  id              SERIAL PRIMARY KEY,
  site_slug       TEXT NOT NULL,                     -- "popolkam"
  category_id     INT NOT NULL REFERENCES categories(id),
  api_key_hash    TEXT NOT NULL,                     -- sha256 API key
  ranking_config  JSONB,                             -- custom weights per site
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE(site_slug, category_id)
);

-- =====================================================
-- Merge queue (manual dedup когда auto не уверен)
-- =====================================================
CREATE TABLE merge_candidates (
  id              BIGSERIAL PRIMARY KEY,
  product_a_id    UUID NOT NULL REFERENCES products(id),
  product_b_id    UUID NOT NULL REFERENCES products(id),
  similarity      REAL,                              -- 0-1
  reason          TEXT,                              -- "same_ean" | "fuzzy_name" | "llm_suggested"
  status          TEXT DEFAULT 'pending',            -- pending | merged | rejected
  decided_at      TIMESTAMPTZ,
  decided_by      TEXT
);
```

### Индексы и расширения

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- fuzzy search имён
CREATE EXTENSION IF NOT EXISTS unaccent;      -- "De'Longhi" ≈ "Delonghi"
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid()
-- pgvector подключим когда дойдём до semantic search (Phase 3)
```

---

## 6. Sources strategy — тиры по legal/effort/value

### Tier A (Phase 1 — стартуем тут)

**Partner XML/YML feeds.** Контрактные, безопасные, структурированные.

| Источник | Формат | Частота | Покрытие | Примечания |
|---|---|---|---|---|
| **Admitad** (каждый рекламодатель отдельным feed) | XML Promo Catalog | 6h | 40-60% top SKU рынка | Главный источник affiliate URLs с SubID |
| **Я.Маркет** (YML feed магазинов-партнёров Admitad) | YML | 6h | Очень полное для RU | Требует активного магазина-партнёра |
| **Ozon** (через Admitad или Ozon Partner API) | JSON/XML | 6h | 50% рынка BT | Ozon Performance API requires approval |
| **Wildberries** (через Admitad) | XML | 6h | 30% | Volatile цены |

**Effort:** 1 парсер на формат (3 парсера). Готовы за 2-3 дня.

### Tier B (Phase 2)

**Сайты производителей.** Authoritative specs, слабо на ценах, но дают правильные ТТХ и канонические названия.

| Производитель | Приоритет | Что берём |
|---|---|---|
| DeLonghi, Philips, Saeco, Jura, Bosch | P0 | Specs tables, official model names, press images |
| Polaris, Redmond, Ariete, Vitek | P1 | Specs, модельные ряды |
| Siemens, Miele, Krups | P2 | Premium segment |

**Effort:** 1 парсер на сайт (site-specific). Cheerio хватает (в основном static HTML). ~2-4 часа на сайт.

### Tier C (Phase 3 — selectively)

**Public HTML крупных retailers.** Для priority SKU (флагманы + top-of-funnel). Не для всего объёма.

| Retailer | Метод | Риск | Частота |
|---|---|---|---|
| Ozon | Playwright + residential proxy | Средний (aggressive anti-bot) | 12h для priority SKU (~100) |
| Wildberries | Playwright | Низкий | 24h |
| MVideo / Eldorado | Playwright + minimal proxy | Низкий | 24h |
| DNS | Playwright | Низкий | 24h |

**Когда:** только после того как у нас есть 500+ products из Tier A. Tier C дополняет, не заменяет.

**Effort:** 1 скрапер на retailer, но с maintenance (layouts меняются). ~1 день на retailer + 1-2 часа/мес поддержки каждого.

### Tier D-E — не делаем

- **Я.Маркет агрегированные данные** (scrape listings напрямую) — ToS violation, получим ban.
- **Hidden APIs (`api.ozon.ru` и подобные)** — ToS violation, technical ban + юр. риск.

### AI browsing agents — где используем

| Use case | Инструмент | Цена | Обоснование |
|---|---|---|---|
| **Discovery**: «обойди сайт производителя X, найди все линейки и категоризируй» | Anthropic Computer Use или Crawl4AI + Claude | ~$2-5 за site | one-shot задача, результат → handwritten parser |
| **Fallback**: когда deterministic parser провалился N раз подряд | Crawl4AI + Qwen-72B | ~$0.05 за страницу (local) | авто-эскалация |
| **Schema extraction**: вытащить структурированные specs из нестандартного HTML | Qwen-72B + Playwright snapshot | ~$0 (local) | bulk tolerant |

**Не используем AI agents для:** ежедневного price-monitoring 5000 URLs (дорого + ненадёжно vs Playwright). AI agent = скальпель, не молоток.

---

## 7. Identity resolution — как канонизируем один товар

**Проблема:** один и тот же «De'Longhi Magnifica S ECAM22.110» приходит из 10 источников под 10 разными именами:
- `"DeLonghi Magnifica S ECAM22.110.B"`
- `"De'Longhi ECAM 22.110 B"`
- `"Кофемашина DELONGHI Magnifica S ECAM22110B"`
- `"Кофеварка Делонги Magnifica ECAM22 110"`

**Стратегия каскадом:**

1. **EAN/GTIN match** (если есть в feed) → 99% confidence, auto-merge
2. **Fuzzy normalized match** — `brand_normalized` (delonghi) + `model_normalized` (regex убирает пробелы/дефисы/модификаторы типа `.B`) → trigram similarity > 0.85 → auto-merge
3. **Embedding match** — если fuzzy < 0.85 но семантически похоже → в `merge_candidates` на ручной review
4. **LLM verification** — для дорогих batch'ей запускаем Haiku: "это один товар?" → если yes + fuzzy > 0.7 → auto-merge, иначе queue

**Merge UI в SCC:** раз в день оператор видит список candidates (ожидаемо 5-20 в неделю на стабильном каталоге), кликает «merge» или «keep separate».

**Modifier handling:** модификаторы вроде цвета (`.B` = black, `.W` = white) — храним как отдельный product если производитель маркетит как отдельный, иначе как spec attribute `color`. Правило per-category в `categories.attribute_schema`.

---

## 8. Enrichment pipeline

Канонический product получает атрибуты из нескольких источников с приоритетом:

```
Priority (highest to lowest):
1. manufacturer    — официальный сайт (authoritative для specs)
2. partner_feed    — Admitad/Я.Маркет (надёжно для цен, средне для specs)
3. scrape:ozon     — public (надёжно для цен real-time)
4. llm:qwen        — LLM вытащил из description (fallback)
```

**Workflow для одного продукта:**

```
1. Получаем offer из Tier A feed → extract raw specs (HTML/JSON)
2. Regex-парсеры пробуют вытащить known attributes (pump_pressure, volume, power)
   → 70% успех на бренд-known форматах
3. Для не-извлечённого → LLM pass (Qwen-72B):
   prompt: "извлеки атрибуты X, Y, Z из этого описания. верни JSON."
   → заполняем specs с source="llm:qwen", confidence=0.7
4. Когда появляется manufacturer данные → overwrite specs с confidence=1.0
5. Cross-check: если несколько источников дают разные значения → флаг conflict
```

**Cost calculation:**
- 5000 products × 500 tokens enrichment × $0 (local Qwen) = **$0**
- Если OpenRouter Haiku вместо local: 5000 × 500 × $0.25/1M = **$0.63** (одноразово, потом только новые)
- Что реально дорого: initial backfill → разовый cost. Incremental (новые feed entries) ~50-100/день → копейки.

---

## 9. REST API design

Base URL: `https://catalog.popolkam.ru/api/v1` (внутренний), или `/api/catalog/*` через Traefik прокси.

Auth: `Authorization: Bearer <site_api_key>` — каждый сайт получает ключ со scope (какие категории).

### Endpoints

```
GET  /products
  Query: ?category=coffee-machines-auto
         &brand=DeLonghi
         &price_min=20000
         &price_max=50000
         &spec.pump_pressure_bar_gte=15
         &has_offers=true
         &sort=price|rating|popularity
         &limit=20&offset=0
  Response: { items: [...], total, facets: {brands, price_ranges, specs} }

GET  /products/:id
  Response: полный product + all offers + all specs + editorial link

GET  /products/search?q=белый чайник большая семья
  → NL-parsing через Haiku → structured criteria → match
  Response: { items, parsed_criteria, match_explanations }

GET  /facets?category=coffee-machines-auto
  Response: { brands: [...], price: {min,max}, specs: {key: [values]} }

GET  /compare?ids=uuid1,uuid2,uuid3
  Response: side-by-side specs + offers

POST /webhooks/price-drop     (for subscribers)
  Body: { product_id, subscriber, threshold }
```

### Response format (example `/products/:id`)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "brand": "DeLonghi",
  "canonical_name": "De'Longhi Magnifica S ECAM22.110",
  "canonical_slug": "delonghi-magnifica-s-ecam22-110",
  "category": { "id": 12, "slug": "coffee-machines-auto" },
  "image_primary": "https://cdn.popolkam.ru/products/delonghi-magnifica-s-ecam22-110.webp",
  "editorial": {
    "review_url": "https://popolkam.ru/obzor-delonghi-magnifica-s-ecam22-110/",
    "rating": 8.2,
    "verdict": "best-entry-level"
  },
  "offers": [
    { "retailer": "ozon", "price": 28900, "url": "...", "affiliate_url": "...", "in_stock": true },
    { "retailer": "mvideo", "price": 31400, ... },
    { "retailer": "wb", "price": 27500, ... }
  ],
  "price_range": { "min": 27500, "max": 34900 },
  "specs": {
    "pump_pressure_bar": 15,
    "beans_hopper_ml": 250,
    "milk_system": "manual_steam_wand",
    "weight_kg": 9.0,
    ...
  }
}
```

---

## 10. Site integration — WP client plugin

Отдельный плагин `catalog-client` на каждом WP (popolkam / aykakchisto / 4beg):

**Что делает:**
1. Регистрирует shortcodes: `[catalog_products category="coffee-machines-auto" limit="12"]`
2. Block Gutenberg: «Каталог товаров» — вставляешь в любую страницу
3. Cron раз в час: обновляет цены в блоках «где купить» (Transient cache 1h)
4. Fallback: если catalog-service недоступен → показывает кэш (сутки)
5. Auto-linking: когда статья review опубликована → plugin находит product по brand+model → обновляет `editorial_review_id` в catalog

**Архитектура плагина:**
```
popolkam-catalog-client/
├── popolkam-catalog-client.php      # main plugin file
├── includes/
│   ├── class-api-client.php         # REST client + cache
│   ├── class-shortcodes.php         # [catalog_products] etc
│   ├── class-gutenberg-blocks.php   # blocks registration
│   ├── class-editorial-linker.php   # review→product link
│   └── class-admin.php              # Settings page (API key, category scope)
├── blocks/
│   ├── products-list/
│   └── product-card/
└── assets/
    ├── css/
    └── js/
```

---

## 11. Editorial integration — Layer 4

Editorial review — это «наше мнение» поверх каталога.

**Data flow:**
1. Оператор пишет review на popolkam для модели X
2. WP publish hook → plugin extract `brand`, `model` из custom fields (`popolkam_machine_name`, etc)
3. Plugin вызывает `POST /api/catalog/editorial-link { product_id, review_url, site }`
4. Catalog обновляет `products.editorial_review_id` и `editorial_site`
5. Впредь во всех `/products` responses этого товара — review bubble up

**Display logic:**
- В listing: products с editorial_review_id сортируются выше в пределах равных criteria (editorial boost)
- В product card: если есть editorial → показываем «Обзор: 8.2/10 →» на popolkam
- В matching engine: editorial products получают +10% confidence score в NL matching

**Cross-site editorial:** product может иметь editorial на одном сайте, но показываться на другом. Пример: Jura E8 с popolkam review → показывается в каталоге 4beg (другая рубрика не пересекается, но может если добавим «премиум БТ для ЗОЖ» или что-то такое).

---

## 12. Phasing — executable plan

### Phase 1 (Week 3-6) — MVP one category

**Goal:** popolkam показывает все кофемашины рынка (не только те что мы написали).

Deliverables:
- [ ] `catalog-service` Docker контейнер на VPS
- [ ] PostgreSQL + miграции (Drizzle)
- [ ] 3 парсера: Admitad XML, Я.Маркет YML, + 1 manufacturer (DeLonghi)
- [ ] Dedup v1 (EAN + fuzzy)
- [ ] REST API: `/products`, `/products/:id`, `/facets`
- [ ] WP plugin `popolkam-catalog-client` — Gutenberg block «Каталог кофемашин»
- [ ] Admin UI в SCC: «Catalog» вкладка — sources status, merge queue
- [ ] 200-500 SKU кофемашин в базе, 60%+ покрытие топ-30 запросов

**Не включаем:** enrichment LLM (пока regex), scraping, editorial auto-link (manual).

**Infra требования:** VPS upgrade 48→120GB SSD, 8GB RAM.

### Phase 2 (Month 2-3) — enrichment + matching

Deliverables:
- [ ] Enrichment pipeline (regex + Qwen-72B local)
- [ ] `/products/search` с NL query (Haiku парсит criteria)
- [ ] Quiz engine v1 (детерминированный scoring по specs)
- [ ] +3 manufacturer парсеров (Philips, Saeco, Jura)
- [ ] Editorial auto-link через WP hook
- [ ] Вторая рубрика: чайники → 200-400 SKU

**Infra:** LLM host online (Tailscale + Ollama + Qwen-72B на сервере пользователя).

### Phase 3 (Month 4-6) — scraping + semantic

Deliverables:
- [ ] Playwright скраперы: Ozon, MVideo, DNS (selectively для priority SKU)
- [ ] Semantic search через pgvector + embeddings
- [ ] Price drift alerts: изменение >10% → алерт оператору
- [ ] aykakchisto подключается: пылесосы (300-500 SKU)
- [ ] Cross-retailer price comparison на product page

### Phase 4 (Month 7-12) — SaaS exposure

Deliverables:
- [ ] Public API docs + onboarding
- [ ] Billing layer ($49-199/мес per category)
- [ ] 3-5 внешних подписчиков (обзорные сайты БТ / товарные агрегаторы мелкого масштаба)
- [ ] Reseller портал

---

## 13. Cost breakdown

### One-time (Phase 1 setup)

| Item | Cost |
|---|---|
| VPS upgrade (48→120GB/8GB) | ~$15/мес incremental |
| Dev time (4-6 weeks own) | Opportunity cost |
| LLM host (user-side, уже есть) | $0 |

### Ongoing (Phase 1-2 scale: 500-2000 SKU, 1-2 рубрики)

| Item | Cost/мес |
|---|---|
| VPS (with catalog-service + PG) | $30-50 |
| OpenRouter (Haiku для NL search) | $5-15 |
| Local LLM (electricity) | $10-20 |
| Proxies | $0 (не начинаем Tier C) |
| **Total** | **~$50-85/мес** |

### Phase 3 (scale: 5000+ SKU, 3 рубрики, price scraping)

| Item | Cost/мес |
|---|---|
| VPS upgrade to 16GB / 250GB | $80-100 |
| Residential proxies | $300-500 |
| OpenRouter enrichment overflow | $20-50 |
| **Total** | **~$400-650/мес** |

### Revenue offset

Phase 3 трафик: conservative 50k sessions/мес от long-tail catalog pages × $2 RPM = **$100/мес just from long-tail**. Scales with content. Phase 4 SaaS: 5 подписчиков × $99 = $495/мес = окупает инфру.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Admitad не подключает feed достаточно быстро** | Заранее оформляем partner accounts (Week 1-2). Fallback на Я.Маркет первым. |
| **Dedup провалится, получим 3 записи одного товара** | Merge queue + manual review на старте. Embedding match добавляем в Phase 2. |
| **Prices stale** | last_seen_at filter + TTL 48h. Offers старше 48h без свежего сигнала → is_active=false. |
| **Retailer банит IP (Tier C)** | Residential proxies + polite rate limits (1 req / 3-5 sec per retailer). Graceful degradation. |
| **LLM enrichment галлюцинирует specs** | Confidence<1.0 для всех LLM-sourced, manufacturer override с confidence=1.0. |
| **Catalog service down → сайты мертвы** | WP plugin Transient cache (1 сутки). Degraded mode показывает stale prices + warning. |
| **ToS violation в Tier C** | Держимся robots.txt, не бьём hidden APIs, rate-limit. Готовность убрать retailer из скрейпа при первом запросе. |
| **Exit buyer не хочет catalog сложность** | Catalog-service = standalone asset, можно продать отдельно от портфеля. |

---

## 15. Open questions (требуют решения пользователя)

1. **PostgreSQL — отдельный контейнер на том же VPS или managed (Timeweb Cloud DB)?**
   — Рекомендация: self-hosted контейнер (дешевле, backup простой).

2. **CDN для изображений товаров — нужен?** Catalog будет хранить 5000 картинок × ~100KB = 500MB. Можно хранить оригиналы на VPS. CDN для Phase 3+ когда трафик большой.
   — Рекомендация: Phase 1-2 без CDN, Phase 3 — Cloudflare R2 ($0.015/GB).

3. **Admitad partner account** — уже есть или нужно регистрировать под каждый сайт?
   — Нужно проверить с текущими учётками.

4. **Когда стартуем Phase 1?** Week 3-6 было в backlog. Но блокеры: VPS upgrade, Admitad feed confirmation, сначала докопать aykakchisto WP лицензии.

5. **Admin UI catalog в SCC или отдельный wp-admin-like?**
   — Рекомендация: в SCC (унифицированный опыт оператора).

---

## 16. Next immediate steps (если зелёный свет)

1. **Заказать VPS upgrade** (Timeweb panel) — 1 час простоя
2. **Договориться с Admitad** — подтвердить access к partner XML feed для кофемашин (тикет в Admitad support)
3. **Создать репозиторий** `catalog-service` (отдельный от seo-dashbord, или monorepo `apps/catalog`)
4. **Схема + миграции** (Drizzle) — 1 день
5. **Первый парсер Admitad** — 2 дня
6. **REST API минимум** `/products` + `/facets` — 1 день
7. **WP plugin MVP** (один shortcode `[catalog_products]`) — 1 день

**Критерий готовности Phase 1:** popolkam.ru/kofemashiny/ показывает **все** кофемашины рынка (500+), пользователь может фильтровать по бюджету/бренду/specs, для 5-10 моделей есть editorial review сверху.

---

## 17. Связанные документы

- `docs/business-model.md §Product Vision 2.0` — strategic framing
- `docs/ai-routing.md` — как local LLM интегрируется в enrichment
- `docs/backlog.md` — задачи Phase 1-3 будут детализированы
- `docs/strategies/coffee-machines.md` — первая рубрика, на ней обкатываем
- `docs/scaling-checklist.md` — как добавлять новые сайты, catalog-aware

---

## Changelog

- **v1 (2026-04-18):** первая версия архитектуры, утверждены PostgreSQL + модульное решение. AI browsing agents закреплены как fallback/discovery (не primary).
