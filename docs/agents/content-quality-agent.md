# Content Quality Agent

> **Статус:** design v1 — 2026-04-18 (planned, not implemented)
> **Scope:** portfolio-wide (работает по всем сайтам, per-post анализ)
> **Kind:** cron (nightly quality sweep) + event-driven (post-publish hook)
> **AI provider:** **Local LLM primary** (Qwen-72B для bulk), OpenRouter Haiku fallback, Sonnet для review-worthy issues
> **Supersedes:** `memory/project_content_freshness_agent.md` — freshness становится одним из 8 измерений qualityагента
> **Связь:** `docs/agents/site-guardian.md`, `docs/agents/image-curator.md`, `docs/catalog-module-architecture.md`

---

## 0. Миссия

**Один агент — качество всего контента портфеля.** Проверяет каждую опубликованную статью по **8 измерениям**, агрегирует в общий quality score, алертит оператора на issues которые надо чинить.

**Supreme-соответствие:** публикуем только то, что реально хорошо для читателя. Некачественный контент — это скрытая долгосрочная потеря trust, падение GSC, ангажированность.

**Почему один агент, а не 8:**
- Один LLM-проход по посту покрывает 5-6 измерений (экономия tokens 3-4×)
- Общий дашборд (quality score 87/100) понятнее 8 отдельных табличек
- Централизованный `content_health` table = единый источник истины для issues

---

## 1. Разграничение vs Site Guardian

Чтобы не дублировать:

| Агент | Что делает | Scope |
|---|---|---|
| **Site Guardian** | Crawl сайта, finds **структурные** проблемы: broken links, orphan pages, missing schema, site-wide SEO issues | Обходит сайт целиком, смотрит на HTML/структуру |
| **Content Quality Agent** | Per-post **глубокий анализ** текста: голос, factual, readability, E-E-A-T, freshness | Смотрит в каждый пост отдельно, с LLM reasoning |

Оба пишут в общий `content_health` table (разные `signal_category`). UI объединяет.

---

## 2. 8 измерений качества

### 2.1 Factual accuracy (источник: catalog-service)

Cross-check утверждений в тексте с canonical product data из catalog.

**Что проверяет:**
- Spec numbers в тексте ↔ `specifications` в catalog (pressure bar, water tank ml, power watts)
- Цены в абзацах «где купить» ↔ actual `offers.price` (tolerance ±5%)
- Упомянутые модели ↔ `products.canonical_name` (typos / wrong models)
- Год выпуска ↔ `products.year_released`

**Как:**
1. NLP extraction (Qwen): «найди все claims вида `<spec> <value>`» в тексте
2. Match к product (через WP custom field `popolkam_machine_product_id` или fuzzy brand+model)
3. Compare → если mismatch > tolerance → flag

**Severity rules:**
- Цена расходится >10% → **red**
- Spec number wrong → **red** (подрывает доверие)
- Модель названа с typo но узнаваемо → **yellow**
- Небольшое расхождение в описательных фактах → **green** (логгируем, не алертим)

### 2.2 Voice / Style (Dmitri's voice для popolkam, Darya для aykakchisto)

Соблюдение голоса автора через LLM-check.

**Что проверяет (popolkam / Dmitri):**
- Запрещённые слова: «идеально», «бомба», «вау», «100%», «лучший на рынке», «никаких недостатков», «офигенный»
- Exclamation marks: не более 1 на 1000 слов
- Adjectives inflation: не больше 3 «отличных/превосходных/шикарных» на абзац
- «Инженерный» tone: упоминание замеров, цифр, компромиссов в review-статье (обязательно)
- Lead абзац: не начинается с «!», не с CTA, с конкретики

**Что проверяет (aykakchisto / Darya):**
- Запрещённые: «волшебное средство», «идеальная чистота» (persona Darya знает что идеальной чистоты не бывает)
- «Химический» tone: ссылки на pH, состав, реакции (обязательно в guide-статьях)

**Как:**
1. Regex/keyword check (быстро, deterministic)
2. LLM (Qwen): «соответствует ли текст voice гайду X?» → structured response `{score: 0-1, violations: [...]}`

**Voice guide** загружается из `docs/personas/*.md` как system prompt.

### 2.3 SEO hygiene

Технический SEO per-post.

**Что проверяет:**
- **H1:** ровно один, не пустой, не равен `<title>`, ≤ 70 символов
- **Meta description:** 120-160 символов (не 100, не 200)
- **URL slug:** latin + hyphens (cyr2lat plugin), без stop-words в начале («kak-vybrat-» — ок)
- **Alt texts:** все `<img>` имеют alt, длиной 10-125 символов, не keyword stuffed
- **Internal links:** ≥ 3 links на другие посты портфеля (per long-form); min 1 на pillar-guide, 1 на comparison
- **External links:** ratio <30% от всех links (иначе link juice leak)
- **Image lazy loading:** `loading="lazy"` ниже fold
- **Headings hierarchy:** H2 → H3 → H4 без пропусков

**Как:** HTML parse (cheerio) + rule checks. Быстро, deterministic.

### 2.4 E-E-A-T signals

Experience / Expertise / Authority / Trust per-post.

**Что проверяет:**
- **Author byline** присутствует + ссылается на `/o-avtore/`
- **Published + Updated dates** visible в HTML + structured data
- **Sources cited** — минимум 1 external authoritative link (manufacturer / test lab / peer review)
- **Affiliate disclosure** — для статей с affiliate links обязательный блок disclosure (регулируется Amazon TOS и RU законом о рекламе ст.5 ФЗ-38)
- **Author schema** — JSON-LD `Person` привязан к посту через `Article.author`
- **Review schema** (для review postype) — с rating, author, date, reviewed object

**Severity:**
- Missing affiliate disclosure в affiliate-посте → **red** (юр. риск)
- Missing author byline → **red** (E-E-A-T penalty)
- Missing external authoritative link → **yellow**
- Missing review schema → **yellow**

### 2.5 Readability

Легко ли читать.

**Что проверяет:**
- **Flesch-Kincaid** адаптированный для RU (через `textstat` + RU корпус) — target grade 8-10 для review, 7-9 для guide
- **Sentence length:** avg ≤ 22 words, max single ≤ 40
- **Paragraph length:** ≤ 4 предложения per paragraph
- **Passive voice ratio:** < 15%
- **Bullet lists присутствие:** минимум 2 на long-form (для скан-чтения)
- **Subheadings density:** H2/H3 минимум раз в 300 слов

**Severity:** в основном **yellow**, readability не убивает статью но снижает engagement.

### 2.6 Link health

Состояние ссылок.

**Что проверяет:**
- **Internal links** → 200? (если 404 внутри сайта — грубая ошибка)
- **External links** → 200? Redirect chains ≤ 2
- **Affiliate links** — содержат ли SubID (per-site required parameter)
- **Affiliate target** жив: Admitad API check offer status
- **nofollow rel** на aff links (по закону РФ + TOS Amazon)
- **Outbound domain diversity:** не концентрация одного domain (>60% внешних ссылок на один сайт = подозрительно)

**Severity:**
- 404 / dead affiliate → **red**
- Missing SubID → **red** (теряем tracking)
- Missing nofollow → **yellow** (но compliance issue)

### 2.7 Schema compliance

Structured data.

**Что проверяет:**
- Валидный JSON-LD (parse без ошибок)
- Нет дублей (напр. Person от Rank Math + ручной custom — один)
- Обязательные поля для `Article`, `Review`, `FAQPage`, `BreadcrumbList`
- `Review.reviewRating` в правильном range (bestRating обычно 10, рейтинг внутри)
- `Person.name`, `sameAs` — наполнены
- Google Rich Results Test compatibility (опционально — дополнительный call к Google API если хотим)

**Как:**
1. Fetch post HTML
2. Extract all `<script type="application/ld+json">`
3. Parse each → validate schema (через `schema-dts` types)
4. Duplicate detection
5. Optional: submit to Google Rich Results API для verification

### 2.8 Freshness (бывший Content Freshness Agent scope)

Устаревание.

**Что проверяет:**
- **Article age** — last `modified_date` > 6 месяцев + сигналы устаревания → flag
- **Stale price mentions** — «28 900 рублей» в тексте ↔ catalog `offers.price` сейчас
- **«Новейший / 2025 / в этом году»** — если дата уже прошла или катастрофически устарела
- **Discontinued models** — упомянутый товар теперь `products.status='discontinued'`
- **New model in lineup** — вышла модель N+1, мы всё ещё пишем про N как топ-актуальную
- **GSC position drop** (>5 позиций за 2 нед) → signal что контент устарел конкурентно
- **CTR drop** (>20% при same position) → signal что snippet не цепляет

**Как:**
- Intersection с Site Guardian (SEO signals оттуда) + catalog-service (price/model data)
- Cron еженедельно

---

## 3. Data model

Расширение существующей (из `project_content_freshness_agent.md`) + новые поля:

```sql
-- =====================================================
-- content_health (расширено)
-- =====================================================
CREATE TABLE content_health (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id        TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  post_id        INTEGER,                           -- WP post_id; NULL если site-level
  post_url       TEXT,

  -- Signal classification
  signal_category TEXT NOT NULL,                    -- factual | voice | seo_hygiene | eeat | readability | link_health | schema | freshness | image_issue
  signal_code    TEXT NOT NULL,                     -- snake_case id: "meta_desc_too_short" | "price_drift" | "missing_author_byline"
  severity       TEXT NOT NULL,                     -- red | yellow | green

  -- Context
  message        TEXT NOT NULL,                     -- "Meta description 182 символа (лимит 160)"
  detail         JSON,                              -- structured data: {current: 182, limit: 160, actual_text: "..."}
  suggestion     TEXT,                              -- "Сократить до 150-160 символов, оставить primary keyword"
  auto_fixable   BOOLEAN DEFAULT FALSE,             -- может ли агент сам пофиксить (safely)

  -- Source агента
  detected_by    TEXT NOT NULL,                     -- 'content-quality' | 'site-guardian' | 'image-curator'
  detection_run_id INTEGER,

  -- Lifecycle
  detected_at    TEXT DEFAULT (datetime('now')),
  resolved_at    TEXT,
  resolved_by    TEXT,                              -- 'operator' | 'auto_fix' | 'ai_refresh'
  snooze_until   TEXT,
  ignored        BOOLEAN DEFAULT FALSE,
  ignore_reason  TEXT
);
CREATE INDEX idx_health_site_severity ON content_health(site_id, severity, detected_at);
CREATE INDEX idx_health_post ON content_health(post_id);
CREATE INDEX idx_health_category ON content_health(signal_category, severity);

-- =====================================================
-- content_quality_scores (aggregate per post)
-- =====================================================
CREATE TABLE content_quality_scores (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id         TEXT NOT NULL,
  post_id         INTEGER NOT NULL,
  post_url        TEXT,
  post_type       TEXT,                             -- review | comparison | guide | pillar

  -- Per-dimension scores (0-100)
  score_factual        INTEGER,
  score_voice          INTEGER,
  score_seo_hygiene    INTEGER,
  score_eeat           INTEGER,
  score_readability    INTEGER,
  score_link_health    INTEGER,
  score_schema         INTEGER,
  score_freshness      INTEGER,

  -- Aggregate (weighted)
  score_overall        INTEGER,                    -- 0-100

  -- Metadata
  word_count           INTEGER,
  image_count          INTEGER,
  internal_links_count INTEGER,
  external_links_count INTEGER,

  -- Run context
  analyzed_at          TEXT DEFAULT (datetime('now')),
  llm_provider         TEXT,                       -- 'local:qwen' | 'openrouter:haiku'
  llm_tokens_used      INTEGER,
  llm_cost_usd         REAL,

  UNIQUE(site_id, post_id, analyzed_at)
);
CREATE INDEX idx_quality_site_score ON content_quality_scores(site_id, score_overall);
CREATE INDEX idx_quality_post_latest ON content_quality_scores(post_id, analyzed_at DESC);

-- =====================================================
-- quality_runs (агрегатная история)
-- =====================================================
CREATE TABLE quality_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id     TEXT,
  trigger     TEXT,                                 -- 'cron_nightly' | 'post_publish' | 'manual'
  started_at  TEXT DEFAULT (datetime('now')),
  finished_at TEXT,
  status      TEXT,                                 -- running | completed | failed
  stats_json  JSON                                  -- {posts_checked, issues_found, total_tokens, cost_usd}
);
```

### Weighted aggregate formula

```
score_overall = 
    0.20 * score_factual       (factual = supreme-critical)
  + 0.15 * score_eeat          (trust-critical)
  + 0.15 * score_voice         (brand-critical)
  + 0.15 * score_seo_hygiene
  + 0.10 * score_link_health
  + 0.10 * score_freshness
  + 0.10 * score_schema
  + 0.05 * score_readability   (nice-to-have)
```

---

## 4. Workflow

### 4.1 Post-publish hook (event-driven)

Запускается сразу после WP publish:

```
1. WP webhook / REST → /api/quality/analyze { site_id, post_id }
2. Fetch post HTML (rendered) + WP data via REST API
3. Parallel checks:
   - SEO hygiene (cheerio rules) — 100ms
   - Link health (HTTP pings) — 5-30s parallel
   - Schema validation — 500ms
   - Image issues (call image-curator) — 1s
4. Sequential LLM checks:
   - Voice analysis (Qwen, ~2000 tokens) — 10s
   - Factual cross-check (Qwen + catalog query) — 15s
   - Readability (textstat + Qwen nuance) — 5s
5. Aggregate scores → content_quality_scores row
6. Issues → content_health rows
7. Если score_overall < 70 OR есть red issues → notification оператору
```

### 4.2 Nightly cron sweep

Ежедневно 03:30 UTC (после Site Guardian 03:00):

```
Цикл:
1. Sample: все posts < 7 дней (новые) + 20 random older posts
2. For each: full workflow из §4.1
3. Freshness checks (весь портфель):
   - Для каждого поста: last analyzed_at < 30 days → re-check freshness dimension
4. Aggregate run → quality_runs row
5. Daily Brief notification: "3 posts scored <70, 12 red issues"
```

### 4.3 Manual trigger

SCC UI: на странице post detail кнопка «Re-analyze». Можно force за LLM check.

---

## 5. UI в SCC

### 5.1 Site Health Dashboard — `/content-health/:siteId`

```
┌─ Content Health — popolkam.ru ────────────────────────────────┐
│                                                                │
│  Overall portfolio score: 87/100 🟢  (+3 vs прошлая неделя)   │
│  Last run: 2026-04-18 03:30 • 124 posts analyzed               │
│                                                                │
│  ┌─ By dimension ──────────────────────────────────────────┐  │
│  │ Factual      ▓▓▓▓▓▓▓▓▓░ 92    SEO hygiene  ▓▓▓▓▓▓▓▓░░ 84│ │
│  │ Voice        ▓▓▓▓▓▓▓▓▓▓ 96    E-E-A-T      ▓▓▓▓▓▓▓░░░ 78│ │
│  │ Readability  ▓▓▓▓▓▓▓▓░░ 85    Link health  ▓▓▓▓▓▓▓▓▓░ 91│ │
│  │ Schema       ▓▓▓▓▓▓▓▓▓▓ 98    Freshness    ▓▓▓▓▓▓░░░░ 72│ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  🔴 Red issues (4)                                             │
│  ├─ "Обзор De'Longhi Magnifica" — цена расходится -18%         │
│  │  [AI-refresh] [Manual fix] [Snooze 30d]                    │
│  ├─ "Сравнение X vs Y" — missing affiliate disclosure          │
│  │  [Auto-fix] [Ignore with reason]                            │
│  │  ...                                                         │
│                                                                │
│  🟡 Yellow (24) [развернуть]                                   │
│  🟢 OK (96)                                                    │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Daily Brief card

5-я карточка: `contentHealth` с expected value framing:
```
Quality: 87/100
🔴 4 red · 🟡 24 yellow
→ Fix top 3 red: +$45 к капитализации (стабилизация ranking)
[Открыть →]
```

### 5.3 Per-post drill-down

В SCC `/sites/:id/articles/:id` появляется tab «Quality»:
- Scores per dimension
- All active issues с severity и `suggestion`
- Timeline: как менялся score
- Action buttons: AI-refresh / Manual edit / Snooze / Ignore

---

## 6. Auto-fix capabilities

Где безопасно агент чинит сам (с audit-log):

| Issue | Auto-fix | Safety |
|---|---|---|
| Missing `loading="lazy"` на `<img>` | ✅ | деterministic HTML patch |
| Missing alt text | 🟡 (suggest through LLM, requires approval) | visual change, нужен human |
| Meta description too long/short | 🟡 (suggest via LLM) | SEO-critical, нужен review |
| Stale price (caught by catalog diff) | ✅ если цена из catalog confidence=1.0 | safe replacement `<oldprice> → <newprice>` |
| Missing affiliate disclosure | ✅ (append standard block) | legal-critical, всегда включено |
| Broken internal link | ❌ | может быть temporary, нужен human |
| Schema duplicate (Rank Math + custom) | ❌ | требует разобраться какой оставить |
| Voice violation (слово «идеально») | 🟡 (suggest synonym via LLM) | brand-critical, human approves |
| Freshness re-write | ❌ | major content change, всегда через AI-refresh workflow с approval |

Настраивается оператором в Settings → Content Quality → Auto-fix rules.

---

## 7. Integration with other agents

```
               ┌──────────────────────────────────┐
               │       Content Quality Agent      │
               │   (central orchestrator per post)│
               └──────────────┬───────────────────┘
                              │ consumes
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   Site Guardian      catalog-service         image-curator
   (site-wide crawl)  (factual data ref)     (image quality)
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                     content_health table
                     content_quality_scores
                              │
                              ▼
                       SCC UI + Daily Brief
```

**Site Guardian** делится signals через `content_health` с `detected_by='site-guardian'`. Content Quality при своей runs читает эти signals и включает в aggregate score (чтобы не дублировать проверки).

**catalog-service** — source of truth для factual dim. Content Quality делает REST calls: `GET /api/catalog/products/:id` + `GET /api/catalog/products/:id/offers`.

**image-curator** — делегация image checks. Content Quality вызывает `GET /api/catalog/posts/:id/image-health` → получает image_issues оптом.

---

## 8. AI cost & provider routing

### Per-post analysis cost

| Dimension | LLM? | Tokens | Provider |
|---|---|---|---|
| Factual | yes | ~2000 in / 300 out | local:qwen (fallback haiku) |
| Voice | yes | ~3000 in / 500 out | local:qwen |
| SEO hygiene | no | — | deterministic |
| E-E-A-T | partial | ~1000 in / 200 out | local:qwen |
| Readability | partial | ~500 in / 100 out | local:qwen |
| Link health | no | — | HTTP only |
| Schema | no | — | JSON parse |
| Freshness | partial | ~800 in / 200 out | local:qwen |

**Per post (local LLM):** ~7000 tokens × $0 = **$0**
**Per post (cloud fallback):** 7000 × $0.25/1M = **$0.002** (Haiku)

**Portfolio scale:** 300 posts × nightly × $0 (local) = $0/мес. Phase 1 до local LLM online: 20 posts/day × $0.002 × 30 = **$1.20/мес**. Приемлемо.

### Routing strategy

```typescript
const provider = routingDecision({
  task: 'content_quality',
  dimension: 'factual',     // some dims могут требовать бόльшей модели
  priority: post.is_recent ? 'realtime' : 'batch',
});

// Policy:
// - batch + local available → Qwen-72B
// - realtime + local available → Qwen-72B (still faster than remote)
// - local unavailable → Haiku
// - complex voice case (>80% violations detected) → escalate to Sonnet
```

---

## 9. Phasing

### Phase 1 — Foundation (Week 1-2)

- [ ] Database schema + migrations
- [ ] Core agent skeleton (service + scheduler)
- [ ] **3 dimensions only**: SEO hygiene + Link health + Schema (все deterministic, быстро)
- [ ] UI: basic dashboard page с issues list
- [ ] Daily Brief card (без expected value пока)

### Phase 2 — LLM dimensions (Week 3-4, после LLM host online)

- [ ] + Voice dimension (требует Qwen + persona prompts)
- [ ] + Readability
- [ ] + E-E-A-T
- [ ] Per-post drill-down UI

### Phase 3 — Catalog integration (Month 2, после catalog Phase 1)

- [ ] + Factual dimension (cross-check с catalog-service)
- [ ] + Freshness (migration from Content Freshness Agent)
- [ ] + Image dimension (integration с image-curator)
- [ ] Auto-fix rules в Settings

### Phase 4 — Full automation (Month 3-4)

- [ ] AI-refresh workflow integration (при issue → на 1 клик draft refresh)
- [ ] Expected Value UX в dashboard cards
- [ ] Historical trends (per-post score timeline)
- [ ] Cross-site quality benchmarks

### Phase 5 — Scale (Month 5+)

- [ ] Escalation routing (complex issues → Sonnet)
- [ ] Operator training mode: annotator UI для fine-tune LLM на наши voice standards
- [ ] Public quality badge (если score >90 — значок в footer «Verified Quality»)

---

## 10. Edge cases & risks

| Risk | Mitigation |
|---|---|
| **LLM hallucinates violation** (говорит «нарушение voice», а там нет) | Confidence threshold: severity=red только при LLM confidence > 0.85, иначе yellow |
| **False positives на legitimate уникальных формулировках** | Whitelist system: оператор помечает «это норма, не алерт» → record в `ignored` + reason. Агент учитывает паттерн для future posts |
| **Site Guardian и Content Quality дублируют signal** | Deduplication: перед insert в `content_health` проверяем существующую запись same post + same signal_code → merge |
| **Cron jobs долго выполняются → timeout** | Chunking: 20 posts per batch, параллельно 4 worker'а, per-post timeout 60s, skip при timeout + log |
| **LLM cost выходит за бюджет** | Budget control per day ($2 hard limit) → после достижения агент skips LLM dims, делает только deterministic. Alert оператору |
| **Voice guide меняется** (редактор решил разрешить «идеально» в ироничном контексте) | Voice guide в `docs/personas/*.md` — source of truth, при update агент перечитывает + re-analyzes все posts |
| **GDPR / privacy в content_health** | Post-level data only, никаких user data. `ignored + reason` не содержат personal info |

---

## 11. Settings (в SCC)

```
┌─ Settings → Content Quality ──────────────────────────────┐
│                                                            │
│  [✓] Run nightly sweep (03:30 UTC)                         │
│  [✓] Run on post publish                                   │
│                                                            │
│  LLM provider policy:                                      │
│  (•) Local first (Qwen-72B), cloud fallback                │
│  ( ) Cloud only (OpenRouter)                                │
│  ( ) Disabled (deterministic checks only)                  │
│                                                            │
│  Daily LLM budget:  $[ 2.00 ] / day                        │
│                                                            │
│  Auto-fix rules:                                           │
│  [✓] Add loading="lazy" to images                          │
│  [✓] Append affiliate disclosure if missing                │
│  [✓] Update stale prices from catalog (confidence=1.0)    │
│  [ ] Auto-suggest alt texts (still requires approval)      │
│                                                            │
│  Notification thresholds:                                  │
│  - Red issue found → [immediate Daily Brief card]          │
│  - Overall score drops >5 points → [email]                 │
│  - Quality run failed → [email]                            │
│                                                            │
│  [ Save ]                                                  │
└────────────────────────────────────────────────────────────┘
```

---

## 12. Связанные документы

- `memory/project_content_freshness_agent.md` — superseded (freshness = одно из 8 измерений)
- `docs/agents/site-guardian.md` — коэкзистирует (site-crawl focus vs per-post deep analysis)
- `docs/agents/image-curator.md` — потребляется (image dimension делегируется)
- `docs/catalog-module-architecture.md` — factual dim source of truth
- `docs/ai-routing.md` — LLM routing pattern
- `docs/personas/popolkam-dmitri-polkin.md` — voice guide для popolkam
- `docs/personas/aykakchisto-darya-metyolkina.md` — voice guide для aykakchisto
- `docs/business-model.md §Product Vision 2.0` — как quality agent поддерживает editorial layer

---

## 13. Changelog

- **v1 (2026-04-18):** первая версия. Объединяет Content Freshness Agent (из memory) + новые 7 измерений. 4 фазы rollout. AI routing local-first.
