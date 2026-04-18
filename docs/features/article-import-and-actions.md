# Article Import & Actions — SCC feature design

> **Статус:** design v1 — 2026-04-18 (planned, not implemented)
> **Scope:** SCC (seo-dashbord) — расширение Articles page + новый `/articles/import` модуль
> **Kind:** user-facing feature, использует existing `claude.js`, добавляет `article-import-service`
> **Связь:** `docs/agents/content-quality-agent.md`, `docs/catalog-module-architecture.md`, `docs/ai-routing.md`

---

## 0. Миссия

Одна вкладка SCC — все операции со статьями:

1. **Import** любой статьи с внешнего URL (text + images + meta) → сохраняется в SCC как research material
2. **Actions** над импортированной: translate / deep rewrite / save PDF / structural analysis / fact extraction / outline-to-brief
3. **Bulk search + filters** в основном списке статей портфеля
4. **Bulk merge** — объединение 2+ наших статей в одну через AI (fix cannibalization + консолидация тематических кластеров)

**Зачем:** оператор сейчас тратит 30-60 минут на competitor research per статью. С этим модулем — 5 минут. Плюс merge-workflow решает проблему cannibalization без ручной работы.

**Supreme-соответствие:** imported articles — research, не публикуемся as-is. Translate/rewrite — всегда через human approval. Fact extraction — всегда с attribution chain.

---

## 1. Decisions (defaults, can be overridden)

Пользователь не дал точных ответов — использую рекомендованные defaults. Каждое помечено 🔧 = легко изменить, 🔒 = архитектурно.

| # | Решение | Default | Заметка |
|---|---|---|---|
| 1 | Imported articles storage | 🔒 Отдельная таблица `imported_articles` | семантика разная vs наших статей |
| 2 | Translate Phase 1 языки | 🔧 RU↔EN | NL/DE/FR когда запустим соответствующие сайты |
| 3 | Merge output | 🔒 Всегда новый draft + 301 redirects list | не разрушаем оригиналы до approval |
| 4 | UI placement | 🔒 Articles page = filters/bulk, отдельный `/articles/import` page | разные data shapes |
| 5 | PDF output | 🔧 2 варианта: clean (research) + branded (share) | branded template через Puppeteer |

---

## 2. Data model

### 2.1 Новые таблицы

```sql
-- =====================================================
-- Imported articles (research material, не наши)
-- =====================================================
CREATE TABLE imported_articles (
  id                 TEXT PRIMARY KEY,              -- uuid
  source_url         TEXT NOT NULL,
  source_domain      TEXT NOT NULL,                 -- "ixbt.com" | "wirecutter.nytimes.com"
  canonical_url      TEXT,                          -- <link rel="canonical">
  
  title              TEXT NOT NULL,
  author             TEXT,
  published_at       TEXT,                          -- from meta
  language_detected  TEXT,                          -- "ru" | "en" | auto

  content_html       TEXT,                          -- cleaned HTML (readability output)
  content_text       TEXT,                          -- plain text для FTS
  excerpt            TEXT,
  word_count         INTEGER,
  reading_time_min   INTEGER,

  -- Extraction metadata
  extraction_method  TEXT,                          -- "readability" | "playwright" | "adapter:ixbt"
  extraction_confidence REAL,                       -- 0-1, readability даёт score
  extraction_warnings JSON,                         -- ["paywall_detected", "images_blocked"]

  -- Meta captured
  meta_title         TEXT,
  meta_description   TEXT,
  og_image_url       TEXT,
  schema_types       JSON,                          -- ["Article", "Review"] если есть
  
  -- Links found
  internal_links_count INTEGER DEFAULT 0,
  external_links_count INTEGER DEFAULT 0,
  links_json         JSON,                          -- [{url, anchor, rel}]
  
  -- Tags / categorization (auto + manual)
  auto_tags          JSON,                          -- LLM-inferred: ["кофемашины", "делонги"]
  user_tags          JSON,                          -- оператор додаёт

  -- Lifecycle
  imported_at        TEXT DEFAULT (datetime('now')),
  imported_by        TEXT,                          -- user_id когда будет auth
  purpose            TEXT,                          -- "competitor_research" | "source_material" | "migration" | "inspiration"
  status             TEXT DEFAULT 'active',         -- active | archived | converted_to_draft

  -- Re-fetch monitoring
  last_refetch_at    TEXT,
  refetch_interval_days INTEGER,                    -- NULL = off
  content_hash       TEXT,                          -- sha256 content_text для change detection
  
  -- Related (if converted to our article)
  converted_to_article_id TEXT REFERENCES articles(id),
  converted_at       TEXT
);
CREATE INDEX idx_imported_domain ON imported_articles(source_domain);
CREATE INDEX idx_imported_purpose ON imported_articles(purpose, status);
CREATE INDEX idx_imported_tags ON imported_articles(auto_tags);

-- Full-text search
CREATE VIRTUAL TABLE imported_articles_fts USING fts5(
  title, content_text, excerpt, auto_tags,
  content='imported_articles', content_rowid='rowid',
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Trigger to keep FTS in sync
CREATE TRIGGER imported_articles_ai AFTER INSERT ON imported_articles BEGIN
  INSERT INTO imported_articles_fts(rowid, title, content_text, excerpt, auto_tags)
  VALUES (new.rowid, new.title, new.content_text, new.excerpt, new.auto_tags);
END;
CREATE TRIGGER imported_articles_ad AFTER DELETE ON imported_articles BEGIN
  DELETE FROM imported_articles_fts WHERE rowid = old.rowid;
END;
CREATE TRIGGER imported_articles_au AFTER UPDATE ON imported_articles BEGIN
  DELETE FROM imported_articles_fts WHERE rowid = old.rowid;
  INSERT INTO imported_articles_fts(rowid, title, content_text, excerpt, auto_tags)
  VALUES (new.rowid, new.title, new.content_text, new.excerpt, new.auto_tags);
END;

-- =====================================================
-- Imported images (local storage)
-- =====================================================
CREATE TABLE imported_images (
  id                 TEXT PRIMARY KEY,
  imported_article_id TEXT NOT NULL REFERENCES imported_articles(id) ON DELETE CASCADE,
  original_url       TEXT NOT NULL,
  local_path         TEXT,                          -- /data/imports/<uuid>/<filename>
  alt_text           TEXT,
  caption            TEXT,
  width              INTEGER,
  height             INTEGER,
  size_bytes         INTEGER,
  download_status    TEXT,                          -- pending | ok | failed | skipped
  download_error     TEXT
);
CREATE INDEX idx_imported_images_article ON imported_images(imported_article_id);

-- =====================================================
-- Article actions (history log + outputs)
-- =====================================================
CREATE TABLE article_actions (
  id                 TEXT PRIMARY KEY,
  action_type        TEXT NOT NULL,                 -- "translate" | "rewrite_preserve" | "rewrite_voice" | "pdf_clean" | "pdf_branded" | "structural_analysis" | "fact_extraction" | "outline_to_brief" | "merge"
  source_type        TEXT NOT NULL,                 -- "imported_article" | "article" (наш)
  source_ids         JSON NOT NULL,                 -- [uuid1, uuid2] (для merge — 2+)
  
  -- Params
  params_json        JSON,                          -- {target_lang: "en", voice_persona: "dmitri", keep_structure: true}
  
  -- Output
  status             TEXT DEFAULT 'pending',        -- pending | running | completed | failed
  output_type        TEXT,                          -- "text" | "html" | "pdf" | "draft_article" | "analysis_json"
  output_data        TEXT,                          -- text content или JSON
  output_file_path   TEXT,                          -- для PDF
  output_article_id  TEXT REFERENCES articles(id),  -- если создали новый draft

  -- Metrics
  llm_provider       TEXT,                          -- "openrouter:sonnet" | "local:qwen"
  llm_tokens_in      INTEGER,
  llm_tokens_out     INTEGER,
  llm_cost_usd       REAL,
  elapsed_ms         INTEGER,

  -- Lifecycle
  created_at         TEXT DEFAULT (datetime('now')),
  started_at         TEXT,
  finished_at        TEXT,
  created_by         TEXT,
  error              TEXT
);
CREATE INDEX idx_actions_status ON article_actions(status, created_at DESC);
CREATE INDEX idx_actions_type ON article_actions(action_type);

-- =====================================================
-- Merge candidates (prep work before user approval)
-- =====================================================
CREATE TABLE merge_previews (
  id                 TEXT PRIMARY KEY,
  source_article_ids JSON NOT NULL,                 -- [id1, id2, ...]
  
  -- Proposed output
  proposed_title     TEXT,
  proposed_url_slug  TEXT,
  proposed_content   TEXT,                          -- merged HTML
  proposed_faqs      JSON,
  proposed_images    JSON,                          -- [{local_path, original_source_id, alt}]
  
  -- Redirect plan
  redirects_plan     JSON,                          -- [{from_url, to_url, reason}]
  
  -- Conflicts surfaced by LLM
  conflicts          JSON,                          -- [{topic, source_a_claim, source_b_claim, recommendation}]
  
  -- Dedup stats
  dedup_stats        JSON,                          -- {paragraphs_merged: 12, duplicates_removed: 5, unique_from_a: 8, unique_from_b: 11}
  
  -- LLM metadata
  llm_provider       TEXT,
  llm_tokens_used    INTEGER,
  llm_cost_usd       REAL,
  
  -- Lifecycle
  created_at         TEXT DEFAULT (datetime('now')),
  status             TEXT DEFAULT 'pending_review',  -- pending_review | approved | rejected
  decided_at         TEXT,
  decided_by         TEXT,
  
  -- If approved
  result_article_id  TEXT REFERENCES articles(id)
);
```

### 2.2 Extensions к existing `articles`

```sql
-- Добавляем для search + bulk + quality integration
ALTER TABLE articles ADD COLUMN content_text TEXT;     -- plain для FTS
ALTER TABLE articles ADD COLUMN tags JSON;
ALTER TABLE articles ADD COLUMN is_imported_source BOOLEAN DEFAULT 0;
ALTER TABLE articles ADD COLUMN merged_from_ids JSON;   -- [id1, id2] если создана через merge
ALTER TABLE articles ADD COLUMN superseded_by_id TEXT REFERENCES articles(id);  -- если замерджена в другую

-- FTS для наших статей
CREATE VIRTUAL TABLE articles_fts USING fts5(
  title, content_text, notes, tags,
  content='articles', content_rowid='rowid',
  tokenize = 'unicode61 remove_diacritics 2'
);
-- аналогичные триггеры как для imported_articles_fts
```

---

## 3. Backend architecture

### 3.1 Service structure

```
server/
├── services/
│   ├── article-import/
│   │   ├── index.ts                    # public API
│   │   ├── extractors/
│   │   │   ├── readability.ts          # primary — @mozilla/readability + jsdom
│   │   │   ├── playwright-fallback.ts  # для JS-heavy / cookie walls
│   │   │   ├── adapters/               # per-domain custom extractors
│   │   │   │   ├── ixbt.ts
│   │   │   │   ├── wirecutter.ts
│   │   │   │   └── index.ts            # router
│   │   │   └── types.ts
│   │   ├── images.ts                   # download, validate, store
│   │   ├── language-detect.ts          # franc-min или compromise
│   │   ├── refetch-monitor.ts          # cron для re-fetch
│   │   └── tag-inference.ts            # LLM auto_tags
│   ├── article-actions/
│   │   ├── index.ts
│   │   ├── translate.ts
│   │   ├── rewrite.ts                  # preserve + voice modes
│   │   ├── pdf-renderer.ts             # Puppeteer
│   │   ├── structural-analysis.ts
│   │   ├── fact-extraction.ts
│   │   ├── outline-to-brief.ts
│   │   └── merge-planner.ts
│   └── article-search.ts               # FTS5 wrapper + filter builder
└── routes/
    ├── imported.ts                     # /api/imported/*
    ├── actions.ts                      # /api/actions/*
    ├── merge.ts                        # /api/merge/*
    └── articles.ts                     # (existing) + search/filter extensions
```

### 3.2 API endpoints

#### Import

```
POST /api/imported
  Body: { url, purpose?, tags?, refetch_interval_days? }
  Response: { id, status: 'ok'|'partial', warnings: [...], imported_article }

POST /api/imported/:id/refetch
  Response: { diff: {content_changed, images_changed, meta_changed}, new_snapshot_id? }

GET  /api/imported
  Query: ?q=&domain=&purpose=&tags=&language=&sort=&limit=&offset=
  Response: { items, total, facets }

GET  /api/imported/:id
  Response: full imported_article + images + actions history

DELETE /api/imported/:id
  (soft delete, status='archived')

POST /api/imported/:id/convert-to-draft
  Body: { site_id, title_override?, tags? }
  Response: { article_id }
  Creates new entry in articles with is_imported_source=true, links conversion
```

#### Actions

```
POST /api/actions
  Body: {
    action_type: 'translate' | 'rewrite_preserve' | 'rewrite_voice' | 'pdf_clean' | 'pdf_branded' | 'structural_analysis' | 'fact_extraction' | 'outline_to_brief',
    source_type: 'imported_article' | 'article',
    source_ids: [uuid],
    params: { ... action-specific ... }
  }
  Response: { action_id, status: 'pending' }
  (actual work async, poll status)

GET  /api/actions/:id
  Response: current status + output (когда completed)

GET  /api/actions?source_id=:uuid&type=:t
  Response: история actions для статьи

GET  /api/actions/:id/output
  Response: полный output (может быть большим), или binary для PDF (content-type)
```

#### Merge

```
POST /api/merge/preview
  Body: { article_ids: [id1, id2, ...], params: { keep_title_from?, dedup_images?, merge_faqs?, url_strategy? } }
  Response: { merge_preview_id, status: 'generating' }

GET  /api/merge/preview/:id
  Response: merge_previews row (content, conflicts, dedup_stats, redirects_plan)

POST /api/merge/preview/:id/approve
  Body: { adjustments? — operator может править перед commit }
  Response: { article_id: новый, redirects_applied: [...] }

POST /api/merge/preview/:id/reject
```

#### Search / Filters (existing articles endpoint extended)

```
GET /api/sites/:id/articles
  Query params:
    q            — full-text (FTS5 match)
    type         — review | comparison | guide | ...
    status       — published | draft | planned
    tags         — CSV of tags
    quality_min  — number 0-100 (когда Quality Agent live)
    has_images   — boolean
    has_affiliate — boolean
    word_min / word_max — int
    date_from / date_to
    source       — own | imported_source | merged
    sort         — modified_desc | created_desc | score_desc | word_count
    limit / offset
  Response: { items, total, facets: {types, statuses, tags, quality_buckets} }

POST /api/articles/bulk
  Body: { article_ids: [...], action: 'delete' | 'archive' | 'tag_add' | 'tag_remove' | 'move_status', payload? }
  Response: { succeeded: [...], failed: [{id, reason}] }
```

---

## 4. Extraction pipeline detail

### 4.1 Flow

```
POST /api/imported { url }
  ↓
1. Validate URL (HTTPS preferred, robots.txt check — advisory not blocking)
2. Fetch HEAD → content-type, size sanity (< 5MB)
3. Check cache (we've imported this URL before?) → return existing if < 24h
4. Choose extractor:
   - if adapter exists for domain → use it (highest quality)
   - else → try Readability.js first (JSDOM)
   - if extraction_confidence < 0.5 → retry with Playwright
5. Pipeline:
   a. fetch HTML (or rendered via Playwright)
   b. extract: title / body HTML / author / date / meta / schema
   c. clean HTML: strip scripts / ads markup / social widgets / comments
   d. detect language (franc-min)
   e. extract images from cleaned HTML → queue for download
   f. extract links (internal/external) → store
   g. LLM auto-tag (Haiku, ~300 tokens) → auto_tags
6. Store in imported_articles + imported_images
7. Async: download images
8. Return imported_article response
```

### 4.2 Legal framing

**В UI явный disclaimer на imported article detail page:**

> 📎 Эта статья импортирована из [domain] для research-целей. Публиковать as-is запрещено копирайтом. Используйте transforms (translate / rewrite / brief) или обогатите своим контентом.

**В БД:** `purpose` field required. UI принуждает выбрать при импорте.

### 4.3 Rate limiting / politeness

- Max 5 requests/min на один domain (не DoS'им)
- User-Agent: `Popolkam SCC Research Bot (+https://popolkam.ru/about-research-bot)`
- Robots.txt check: если явно запрещено → warning, но не блок (advisory per fair-use)

---

## 5. Actions detail

### 5.1 Translate

```typescript
params: {
  target_lang: 'en' | 'ru' | 'nl' | 'de',
  preserve_structure: true,           // keep H1/H2/H3 levels
  preserve_links: true,               // не трогаем URLs
  glossary?: {                         // per-domain term mapping
    'кофемашина': 'coffee machine',
    'кофеварка': 'drip coffee maker',
  }
}
```

**LLM:** Claude Sonnet primary (translation quality). Для коротких EN→RU (<500 words) можно Haiku.

**Cost estimate:** 2000 words article ≈ 3000 input tokens + 3500 output = ~$0.06 (Sonnet).

**Output:** saved as `article_actions.output_data` (HTML). UI даёт download .md / .html или «Save as draft article».

### 5.2 Rewrite

**Two modes:**

#### 5.2.1 Rewrite-preserve

```typescript
params: {
  preserve_structure: true,
  preserve_facts: true,
  tone: 'neutral' | 'informal' | 'formal',
  plagiarism_distance: 'medium' | 'high',  // how different from source
}
```

Keeps outline, changes wording. Use case: internal research summary, talking points draft.

#### 5.2.2 Rewrite-voice

```typescript
params: {
  voice_persona: 'dmitri' | 'darya' | 'custom',
  persona_guide_path?: string,   // путь к персона-доку
  target_length: 'shorter' | 'same' | 'longer',
  add_sections?: ['price_block', 'compromisses', 'tco_calc'],   // наши кастомные секции
  fact_checklist?: [...],         // что обязательно должно быть упомянуто
}
```

Берёт факты из source, переписывает как бы автор Дмитрий/Дарья от первого лица редакции. **Это почти всегда означает оригинальную работу** — persona выбирает свою структуру, компромиссы, tone. Source = факт-база, не шаблон.

**LLM:** Sonnet (quality critical для voice).

**Output:** HTML draft. Всегда с pre-publish checklist («Перед публикацией проверь: факты не исказились vs original, наш бренд-voice соблюдён, добавлены required sections»).

### 5.3 PDF

**Clean mode:**
- Puppeteer render
- Template: чистый sans-serif, printable margins, page numbers
- No branding — для research / sharing с коллегой

**Branded mode:**
- Popolkam/Aykakchisto header + logo
- Цветовая палитра бренда
- Footer с «Powered by popolkam.ru research»
- Template per-site (через site config)

**File storage:** `/data/exports/pdf/<action_id>.pdf` — expires через 7 дней (cleanup cron).

### 5.4 Structural analysis

Deterministic + LLM. Output JSON:

```json
{
  "outline": [
    { "level": 1, "text": "Обзор кофемашины X" },
    { "level": 2, "text": "Технические характеристики" },
    { "level": 3, "text": "Бойлер" },
    ...
  ],
  "word_count_per_section": { ... },
  "key_topics_covered": ["hydraulics", "burrs", "milk system", "maintenance"],
  "key_topics_missing_vs_our_template": ["TCO", "compromisses", "cleaning cost"],
  "sources_cited": [
    { "url": "...", "anchor": "...", "authority_score": 0.8 }
  ],
  "stats_found": [
    { "claim": "15 bar pump pressure", "position": "section 2 paragraph 3" },
    ...
  ]
}
```

Use case: шаблон для нашей статьи (+ gap analysis what to add). LLM (Haiku, быстро и дёшево).

### 5.5 Fact extraction

Output:

```json
{
  "facts": [
    {
      "claim": "Kahwa Japan's arabica yields decreased 8% in 2024",
      "type": "statistic",
      "source_position": "paragraph 5",
      "citable": true,
      "suggested_attribution": "по данным [domain], 2024",
      "confidence": 0.9
    },
    ...
  ]
}
```

Use case: база цитируемых фактов со ссылкой обратно. LLM (Haiku).

### 5.6 Outline-to-brief

Комбинация: structural analysis + fact extraction + catalog data (если product detected) + persona guide → AI-brief для оригинальной статьи (как existing `generateContentBrief` endpoint но с input от imported article).

Output: готовый plan-item в `content_plan` со заполненным `ai_brief`.

---

## 6. Merge workflow detail

### 6.1 Planning phase

`POST /api/merge/preview` → создаёт `merge_previews` row в status `generating`:

```
1. Fetch articles by IDs
2. LLM pass (Sonnet) с prompt:
   - Identify duplicate paragraphs (дедуп)
   - Identify unique content from each
   - Surface contradictions (где источники расходятся)
   - Propose merged structure (H1/H2/H3 outline)
   - Merge FAQs (union vs dedup)
   - Rank images by quality → pick best 5-10
3. Generate merged HTML draft
4. Compute redirects plan:
   - If user keeps old article A's URL → 301 from B, C, ... to A
   - If new slug → 301 from all to new
5. Store in merge_previews (status='pending_review')
6. Return merge_preview_id (poll for completion)
```

### 6.2 Review UI

```
┌─ Merge Preview ─────────────────────────────────────────────┐
│  Merging 3 articles:                                        │
│  ├─ "Обзор DeLonghi Magnifica S" (1200 words, 8 images)    │
│  ├─ "DeLonghi ECAM22.110 — опыт использования" (800, 4)    │
│  └─ "Делонги Магнифика — обзор" (600, 3)                   │
│                                                             │
│  📊 Dedup stats:                                            │
│  • 12 paragraphs merged                                     │
│  • 5 duplicates removed                                     │
│  • 18 unique paragraphs preserved                           │
│  • 8 best images selected from 15                           │
│                                                             │
│  ⚠️ Conflicts (2) — требуют решения:                       │
│  1. Pump pressure: A says "15 bar", B says "19 bar"         │
│     Recommendation: A (matches manufacturer spec)           │
│     [Keep A] [Keep B] [Manual]                              │
│                                                             │
│  2. Water tank: A says "1.8L", C says "1.6L"                │
│     Recommendation: A (matches catalog)                      │
│     [Keep A] [Keep C] [Manual]                              │
│                                                             │
│  📝 Proposed title:                                         │
│  [ Обзор DeLonghi Magnifica S ECAM22.110 — полный разбор ] │
│                                                             │
│  🔗 URL strategy:                                           │
│  (•) Keep URL of article A: /obzor-delonghi-magnifica-s/    │
│  ( ) New URL: [                                         ]   │
│  ( ) Keep none (archive all)                                │
│                                                             │
│  🔀 Redirects plan:                                         │
│  • /delonghi-ecam22-110/ → /obzor-delonghi-magnifica-s/    │
│  • /delonghi-magnifica/ → /obzor-delonghi-magnifica-s/     │
│                                                             │
│  📄 Preview:                                                │
│  [........... merged content ............]                  │
│                                                             │
│  [Edit draft] [Approve & Commit] [Reject]                  │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Commit phase

`POST /api/merge/preview/:id/approve`:

```
1. Create new article в articles table (или update существующей если URL strategy=keep_A)
2. Set articles.merged_from_ids = [id_a, id_b, ...]
3. For each source article: set superseded_by_id = new_article_id, status = 'archived'
4. Push redirects to WP:
   - через plugin popolkam-catalog-client новый endpoint POST /redirects
   - или в WP через Rank Math → Redirections (у REHub это есть из коробки)
5. Trigger WP sync для new article (через existing sync-wp flow)
6. Record action in article_actions (merge type)
```

### 6.4 SEO safety

- Redirects 301 (permanent) — передают link equity
- Old URLs не удаляются из WP сразу — status 'archived' и redirected
- GSC: через неделю проверяем что new article индексируется + old не вылетают в 404

---

## 7. Search + Filters (Articles page)

### 7.1 Implementation: SQLite FTS5

```typescript
// server/services/article-search.ts

export function searchArticles(filters: ArticleFilters): Article[] {
  const clauses: string[] = [];
  const params: any[] = [];
  let useFts = false;

  if (filters.q) {
    useFts = true;
    // Prepared: q sanitized to FTS query syntax
  }

  const base = useFts
    ? `SELECT a.* FROM articles_fts fts JOIN articles a ON a.rowid = fts.rowid WHERE articles_fts MATCH ?`
    : `SELECT a.* FROM articles a WHERE 1=1`;

  if (useFts) params.push(ftsSanitize(filters.q));

  if (filters.site_id) { clauses.push('a.site_id = ?'); params.push(filters.site_id); }
  if (filters.type)    { clauses.push('a.type = ?');    params.push(filters.type); }
  if (filters.status)  { clauses.push('a.status = ?');  params.push(filters.status); }
  if (filters.tags?.length) {
    clauses.push(`EXISTS (SELECT 1 FROM json_each(a.tags) WHERE json_each.value IN (${filters.tags.map(() => '?').join(',')}))`);
    params.push(...filters.tags);
  }
  if (filters.word_min) { clauses.push('a.word_count >= ?'); params.push(filters.word_min); }
  if (filters.word_max) { clauses.push('a.word_count <= ?'); params.push(filters.word_max); }
  if (filters.quality_min) { clauses.push('a.quality_score >= ?'); params.push(filters.quality_min); }
  if (filters.has_affiliate) { clauses.push('a.affiliate_links_count > 0'); }
  // ...

  const sql = base + (clauses.length ? ' AND ' + clauses.join(' AND ') : '') + ` ORDER BY ${buildSort(filters.sort)} LIMIT ? OFFSET ?`;
  params.push(filters.limit ?? 20, filters.offset ?? 0);

  return db.prepare(sql).all(...params);
}
```

### 7.2 Sanitization

FTS5 — ругается на особенные символы. Sanitize:
- Strip: `" * ^ () : {}`
- Phrase search если user обернёт в quotes
- AND по умолчанию между словами
- Wildcard suffix: `автомат*` (prefix search)

### 7.3 Facets

При каждом response считаем faceted counts (для sidebar UI):

```sql
-- Parallel queries
SELECT type, count(*) FROM articles WHERE {filters-минус-type} GROUP BY type;
SELECT status, count(*) FROM articles WHERE {filters-минус-status} GROUP BY status;
-- quality_score в buckets 0-20, 21-40, 41-60, 61-80, 81-100
```

Кэш facets 30 секунд (Redis или in-memory LRU).

---

## 8. Bulk operations

### 8.1 UI

Checkbox column в списке. Header: «Select all on page» / «Select all matching filter» (последнее — важно когда 500 matches).

Bulk toolbar появляется когда selected > 0:

```
[3 selected]  [Archive] [Tag +] [Tag −] [Export CSV] [Merge with AI]  [Clear]
```

### 8.2 Backend safety

- `POST /api/articles/bulk` ограничен 500 items per request
- Для > 500: background job с progress polling
- Каждое действие логируется в `audit_log` (когда эта таблица будет готова — сейчас в backlog)
- Destructive actions (delete, merge) требуют explicit confirmation (UI modal с count + preview)

### 8.3 Merge через bulk

Bulk select 2+ → click `[Merge with AI]` → POST `/api/merge/preview` → переход на merge preview UI (§6.2).

---

## 9. UI wireframes

### 9.1 Articles page (расширенная)

```
┌─ Articles ────────────────────────────────────────────────────────┐
│                                                                    │
│  [🔍 search........................] [+ Import] [+ New]           │
│                                                                    │
│  ┌─ Filters ──────┐   Showing 47 of 214  [Sort: modified ▼]      │
│  │ Site          │                                                 │
│  │ □ popolkam 84 │  ┌──────────────────────────────────────────┐ │
│  │ □ aykakchisto │  │ □ Обзор DeLonghi Magnifica S             │ │
│  │ □ 4beg 63     │  │    review · published · q.92 · 1800w    │ │
│  │               │  │                                           │ │
│  │ Type          │  │ □ Сравнение X vs Y                        │ │
│  │ □ review 145  │  │    comparison · draft · q.78 · 2400w    │ │
│  │ □ comparison  │  │                                           │ │
│  │ □ guide 19    │  │ □ ...                                     │ │
│  │               │  │                                           │ │
│  │ Status        │  └──────────────────────────────────────────┘ │
│  │ ...           │                                                 │
│  │               │  [2 selected] [Archive] [Tag] [Merge with AI] │
│  │ Quality       │                                                 │
│  │ [=====] 0-100 │  < 1 2 3 4 5 ... 11 >                          │
│  │               │                                                 │
│  │ [Reset]       │                                                 │
│  └───────────────┘                                                 │
└────────────────────────────────────────────────────────────────────┘
```

### 9.2 Import page `/articles/import`

```
┌─ Import Article ──────────────────────────────────────────────────┐
│                                                                    │
│  Import from URL:                                                  │
│  [https://wirecutter.nytimes.com/reviews/best-espresso-machine/]  │
│                                                                    │
│  Purpose: (•) Competitor research  ( ) Source material  ( ) Other │
│  Tags: [кофемашины] [wirecutter] [+]                              │
│  Re-fetch: [●] Every [30] days                                    │
│                                                                    │
│  [Import]                                                          │
│                                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                    │
│  Recent imports (6):                                               │
│  📄 Wirecutter — Best Espresso Machines 2026                      │
│     30 min ago · 3200 words · en · 8 images                       │
│     [Analyze] [Translate] [Rewrite] [PDF] [More ▼]                │
│                                                                    │
│  📄 iXBT — Тест DeLonghi Specialista                              │
│     2 hours ago · 2400 words · ru · 12 images                     │
│     [Analyze] [Translate] [Rewrite] [PDF] [More ▼]                │
│                                                                    │
│  ...                                                               │
└────────────────────────────────────────────────────────────────────┘
```

### 9.3 Imported article detail `/imported/:id`

```
┌─ Imported: Wirecutter — Best Espresso Machines 2026 ──────────────┐
│  Source: wirecutter.nytimes.com | en | 3200 words | 8 images      │
│  Imported 30 min ago | Purpose: Competitor research                │
│  ⚠️ Research material — publishing as-is violates copyright.      │
│                                                                    │
│  ┌─ Actions ──────────────────────────────────────────────────┐  │
│  │ [📝 Translate to RU] [✏️ Rewrite (preserve)]              │  │
│  │ [🎙 Rewrite in Dmitri voice] [📑 Structural analysis]     │  │
│  │ [📊 Extract facts] [💡 Outline to brief] [📄 Save PDF]    │  │
│  │ [🔄 Re-fetch] [🗄 Archive]                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Tabs: [Content] [Metadata] [Images] [Links] [Actions history]    │
│                                                                    │
│  [ Content HTML preview ... ]                                      │
└────────────────────────────────────────────────────────────────────┘
```

### 9.4 Action output (example: Structural Analysis)

```
┌─ Structural Analysis — Wirecutter Best Espresso Machines ─────────┐
│                                                                    │
│  📑 Outline (5 sections, 18 subsections):                         │
│     1. Our pick                                                    │
│        1.1. Why we love it                                         │
│        ...                                                          │
│     2. Budget pick                                                  │
│     ...                                                             │
│                                                                    │
│  🎯 Topics covered: 11                                             │
│     hydraulics · burrs · milk system · maintenance ·              │
│     water filtration · pressure · temp stability · ...            │
│                                                                    │
│  ❗ Missing vs our review template: 3                             │
│     • TCO calculation                                              │
│     • Compromisses block                                           │
│     • Cleaning cost breakdown                                      │
│                                                                    │
│  📚 Sources cited: 12                                              │
│     [Show table: URL, anchor, authority score]                     │
│                                                                    │
│  📊 Stats found: 28                                                │
│     [Show table: claim, position, citable]                         │
│                                                                    │
│  [Create plan item from this outline →]                            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 10. AI cost & routing

### 10.1 Per-action costs (Sonnet unless noted)

| Action | Tokens in | Tokens out | Cost | Notes |
|---|---|---|---|---|
| Auto-tag on import | 500 | 100 | $0.003 | Haiku |
| Translate (2000 words) | 3000 | 3500 | $0.06 | Sonnet |
| Rewrite-preserve (2000) | 3000 | 3200 | $0.058 | Sonnet |
| Rewrite-voice (2000) | 3500 | 3500 | $0.063 | Sonnet, больше prompt (persona guide) |
| Structural analysis | 3500 | 800 | $0.015 | Haiku |
| Fact extraction | 3500 | 1500 | $0.021 | Haiku |
| Outline-to-brief | 4000 | 1500 | $0.023 | Sonnet (brief критичен) |
| Merge 2 articles | 8000 | 5000 | $0.10 | Sonnet (quality critical) |
| Merge 3 articles | 12000 | 6000 | $0.14 | Sonnet |

### 10.2 Monthly budget

Conservative оператор (20 imports/month, 10 translates, 5 rewrites, 2 merges):
- 20 × $0.003 + 10 × $0.06 + 5 × $0.06 + 2 × $0.10 = **$1.16/мес**

Активный (100 imports, 50 translates, 20 rewrites, 10 merges):
- 100 × $0.003 + 50 × $0.06 + 20 × $0.06 + 10 × $0.10 = **$5.50/мес**

### 10.3 Local LLM routing (Phase 2+)

Когда GPU host online:
- Auto-tag → local Qwen
- Translate простых языков (EN↔RU) <1000 words → local Qwen (faster + free)
- Structural analysis / fact extraction → local Qwen
- Rewrite-voice / merge → **сохраняем Sonnet** (critical quality для persona + merge)
- Fallback: если local недоступен, всё через OpenRouter как сейчас

Ожидаемая экономия: **60-70%** на bulk actions.

---

## 11. Phasing

### Phase 1 — Search, filters, bulk (1-2 сессии) 🎯 quick win

- [ ] FTS5 миграция для `articles` (добавить `content_text`, FTS virtual table, triggers)
- [ ] Backend: extended `GET /api/sites/:id/articles` с filters + search
- [ ] `POST /api/articles/bulk` для archive/tag (без merge пока)
- [ ] UI: Articles page — search bar, filter sidebar, checkbox column, bulk toolbar
- [ ] Tests: edge cases FTS (спец. символы, пустой q, pagination)

**Ценность:** сразу полезно, без интеграций.

### Phase 2 — Import MVP (2-3 сессии)

- [ ] Миграции: `imported_articles`, `imported_images`, `article_actions`
- [ ] Service: `article-import` с Readability.js + Playwright fallback
- [ ] Image downloader
- [ ] Auto-tag via Haiku
- [ ] API endpoints `/api/imported/*`
- [ ] UI: `/articles/import` page, `/imported/:id` detail
- [ ] Purpose required + disclaimer UI

### Phase 3 — Actions MVP (2 сессии)

- [ ] Service: `article-actions` с translate + rewrite-preserve + PDF-clean + structural-analysis
- [ ] API: `POST /api/actions`, polling
- [ ] UI: action buttons, output viewer, history

### Phase 4 — Advanced actions (1-2 сессии)

- [ ] Rewrite-voice (персона integration)
- [ ] Fact extraction
- [ ] Outline-to-brief (интеграция с existing `generateContentBrief`)
- [ ] PDF-branded templates per-site

### Phase 5 — Merge workflow (2 сессии)

- [ ] Миграция `merge_previews`
- [ ] Service: `merge-planner` с Sonnet
- [ ] Conflict detection & surfacing
- [ ] Redirect plan → WP push (через plugin или Rank Math API)
- [ ] UI: merge preview, conflicts resolver, approval flow

### Phase 6 — Re-fetch monitoring (1 сессия)

- [ ] Cron worker: re-fetch imported_articles с interval_days
- [ ] Diff detection via content_hash
- [ ] Notify оператора о changes через Daily Brief

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Copyright claim** за storage чужого контента | Explicit `purpose` required + UI disclaimer + audit trail (`imported_by`, `imported_at`). На запрос — remove. Храним максимум 90 дней если `purpose='competitor_research'` без activity |
| **Paywall / cookie wall ломает Readability** | Playwright fallback + extraction_warnings + adapter per top-5 проблемных доменов |
| **FTS performance на 10k+ articles** | SQLite FTS5 scales до 100k легко. Индексы на filter columns. Если упрёмся — Postgres (на catalog-service уже есть) |
| **Merge LLM теряет важные факты** | Dedup stats + conflicts UI (user видит какие куски merge'нулись, где LLM неуверен). Preview before commit всегда |
| **PDF rendering resource hog** | Puppeteer pool (max 3 concurrent), timeout 60s, cleanup job для старых PDFs (>7 дней) |
| **Bulk action misclick на 500 articles** | Explicit confirmation modal с count + first 5 items preview. Soft delete (status='archived') — не hard delete |
| **Rate limit от source domain на re-fetch** | Distributed scheduling (per-domain max 10 refetches/день), exponential backoff |
| **imported_articles расход диска** (3200 words × 100 imports × images) | Image local cache ~200MB Phase 1. Cleanup cron: archived > 90 days → delete images (метаданные сохраняем) |

---

## 13. Security / auth

- Imported_articles видимость: 🔒 **per-user когда будет auth** (сейчас solo-owner — всё). Будущее SaaS: каждый tenant видит только свои.
- API endpoints: existing SCC basic auth (будет расширен до user-scope)
- Rate limit на `/api/imported` POST: 30/min per user (чтобы не DDoS'ить чужие сайты через наш сервис)

---

## 14. Open decisions

1. **Adapter priority:** какие 5 top-сайтов стоят custom-adapters?
   — Кандидаты: iXBT, 4PDA, Wirecutter, NotebookCheck, Consumer Reports. Решим при Phase 2 исходя из того что оператор чаще всего импортирует.

2. **PDF templates:** 2 варианта достаточно (clean + branded) или нужен ещё «email-friendly» (без тяжёлых изображений)?
   — Моя рекомендация: 2 достаточно.

3. **Merge: сохранять ли все три оригинала как archived или удалять старые (кроме первого)?**
   — Моя рекомендация: все archived — безопаснее, легко rollback.

4. **FTS5 tokenizer:** стандартный или stemmed (RU lemmas через yarn add `sqlite-fts-ru`)?
   — MVP стандартный (`unicode61`), Phase 2 добавить lemmatization для русского если будут false negatives.

5. **Quality Score filter в bulk merge** — показывать ли warning когда merge включает low-quality article? Может захламить результат.
   — Моя рекомендация: warning yes, блокировка no. Оператор решает.

---

## 15. Связанные документы

- `docs/agents/content-quality-agent.md` — quality_score используется в filters
- `docs/catalog-module-architecture.md` — imported specs cross-check с catalog facts
- `docs/ai-routing.md` — провайдер-routing для actions
- `docs/personas/*.md` — persona guides для rewrite-voice
- `docs/backlog.md` — задачи phase 1-6 детализируются

---

## 16. Changelog

- **v1 (2026-04-18):** first design. 6 phases rollout. FTS5 для search. Puppeteer для PDF. Sonnet для merge/voice, Haiku для bulk tasks. AI cost estimate $1-6/мес активного использования.
