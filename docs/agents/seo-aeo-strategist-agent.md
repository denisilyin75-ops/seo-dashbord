# SEO/AEO Strategist Agent — design spec

> **Источник идеи:** Reddit r/ClaudeAI пост [«Claude is my SEO strategist, content engine…»](https://www.reddit.com/r/ClaudeAI/comments/1syt37w/claude_is_my_seo_strategist_content_engine_and/) + shared Claude conversation [0dd69cee](https://claude.ai/share/0dd69cee-e3d7-4517-bed1-1235be7c7635).
>
> **Caveat по источнику:** оригинальные тексты Reddit-поста и Claude-share не удалось получить целиком (Reddit 403, Claude.ai 403, archive.org 451). Восстановлено через [jina.ai/r](https://r.jina.ai/) — получен summary 7-step framework и категории 8 промптов. **Точные тексты промптов автора отсутствуют** — реконструированы на основе framework + наших best practices, помечены **`[reconstructed]`** vs **`[verified]`**.
>
> **Дата:** 2026-04-29
> **Спека уровня:** v0 — нужна валидация на собственных метриках перед production rollout.

---

## 1. Идея в одной строке

**Перепозиционировать Claude из «content generator» в «analytical strategist»**: вместо «напиши обзор», скармливать Claude raw GSC + Ahrefs + GA данные → он находит gaps, генерит cluster-стратегию, диктует точный template статей.

Это не «AI пишет за нас». Это **AI читает наши метрики, видит pattern, дальше человек с нашим голосом дописывает по жёсткому шаблону**.

---

## 2. 7-Step Framework `[verified]`

```
┌──────────────────────────────────────────────────────────────┐
│  1. Data Collection (weekly cron)                            │
│  ├── GSC queries (CTR, position, impressions)                │
│  ├── GA4 session sources (включая AI referrers:              │
│  │   Claude.ai, Perplexity.ai, ChatGPT, Gemini)              │
│  ├── Ahrefs competitor data (top pages, gap keywords)        │
│  └── Article publication dates                               │
│                                                              │
│  2. Gap Analysis (Claude API)                                │
│  ├── Type A: keyword gaps with low CTR (мы ранжируемся, но  │
│  │   плохо кликают — нужна перепаковка title/snippet)        │
│  ├── Type B: missing content on competitor queries           │
│  ├── Type C: page cannibalization (несколько наших страниц   │
│  │   борются за один запрос)                                 │
│  └── Type D: lost traffic to AI Overviews (Google AI)        │
│                                                              │
│  3. Content Template (rigid format, no creative freedom)     │
│  ├── 40-60 word "direct answer" block в начале (для AI)      │
│  ├── H2 как вопросы (для AEO + featured snippets)            │
│  ├── Comparative tables (для visual scanning + AI)           │
│  ├── Internal links (минимум 3 на статью)                    │
│  └── FAQPage schema (для rich snippets + voice)              │
│                                                              │
│  4. AEO Infrastructure (one-time setup)                      │
│  ├── robots.txt — allow AI crawlers (GPTBot, Claude-Web,     │
│  │   PerplexityBot, Google-Extended)                         │
│  ├── llms.txt sitemap (стандарт ещё неофициальный — caveat)  │
│  └── Schema markup: Organization + Article + FAQPage +       │
│      BreadcrumbList на каждой статье                         │
│                                                              │
│  5. Technical Audit (weekly)                                 │
│  ├── Unindexed pages (GSC Coverage report)                   │
│  ├── Schema duplicates (RankMath/Yoast вместе с RHHub)       │
│  ├── Core Web Vitals (LCP, INP, CLS) per template            │
│  └── Low-CTR headlines (CTR < 2% при position < 10)          │
│                                                              │
│  6. Iteration Cycle                                          │
│  ├── Publish per gap finding                                 │
│  ├── Wait 2-4 недели (для индексации + начального ранкинга) │
│  ├── Compare GSC pre/post                                    │
│  └── Refine template / promote in cluster / cannibal cleanup │
│                                                              │
│  7. AI Overviews tracking (новое)                            │
│  ├── Какие наши queries попадают в AI Overview               │
│  ├── Сколько трафика теряем по сравнению с Top-1             │
│  └── Tactic: писать так, чтобы наш текст попадал в AI Ov.    │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 8 Prompt Templates `[reconstructed — точные оригиналы недоступны]`

### Prompt 1 — GSC Analysis (gap finding)

```
Я владелец affiliate-сайта {{site}} (ниша: {{niche}}, ru/en).
Ниже — exported GSC данные за последние 90 дней.
Найди 4 типа возможностей:

A. Keyword gaps with low CTR — где мы ранжируемся в топ-10, но
   CTR < 2%. Перечисли URL, query, position, CTR, impressions.
   Для каждого предложи новый title + meta description.

B. Missing content on competitor queries — какие запросы дают трафик
   нам в позициях 11-30 (зона "почти попал"), но мы ничего об этом
   не написали целенаправленно. Это пишем заранее.

C. Page cannibalization — пары URL'ов, ранжирующихся по одному
   и тому же query (position разница <5). Нужен merge или одну
   на noindex.

D. AI Overviews loss — где наша страница в топ-3 органики, но
   трафик упал >30% за 90 дней. Симптом: Google AI забирает.

Формат вывода — markdown table per type. Не выдумывай данные —
работаем с тем что в GSC export.

GSC export attached: {{csv}}
```

### Prompt 2 — Competitor Gap (Ahrefs / Semrush feed)

```
Ниже — Ahrefs Content Gap отчёт между нашим сайтом и 3
конкурентами в нише {{niche}}.

Найди 10 keyword opportunities, где:
- Все 3 конкурента ранжируются в топ-10
- Мы НЕ ранжируемся вообще или position > 30
- KD (keyword difficulty) < 25
- Volume > 200/мес для RU / 500 для EN

Для каждого keyword:
- Какой angle / угол подачи использует лучший конкурент
- Что мы можем сделать ЛУЧШЕ (длиннее, свежее, c real testing data,
  с personal experience у Дмитрия)
- Cluster-position: pillar / cluster-supporting / standalone

Output: markdown table с колонками
keyword | volume | KD | competitors_in_top10 | best_angle | our_angle | type
```

### Prompt 3 — Article Writing (с rigid template)

```
Ты — Дмитрий Полкин, обозреватель кофемашин (литературный псевдоним
редакции popolkam.ru). Пиши ТОЛЬКО по template ниже, не отступай.

Тема: {{topic}}
Target keyword: {{keyword}}
Cluster: {{pillar_or_cluster}}
Internal links: {{list_of_existing_articles}}

TEMPLATE (строго):

1. ОТВЕТ В 40-60 СЛОВ (для AI Overviews):
   <короткий прямой ответ на запрос {{keyword}}>

2. ОПИСАНИЕ ПРОДУКТА (1 параграф 80-120 слов)

3. H2 как ВОПРОС: "Что такое {{keyword}}?"
   ответ + comparative table если применимо

4. H2 как ВОПРОС: "Кому подходит {{keyword}}?"
   2-3 buyer persona с конкретикой

5. H2 как ВОПРОС: "Какие есть альтернативы?"
   minimum 3 модели из других обзоров (с internal links)

6. H2 как ВОПРОС: "На что обратить внимание при покупке?"
   bullet list 5-7 пунктов

7. FAQ-секция (5-7 Q&A) — формат для FAQPage schema

8. Internal links: 3-5 ссылок на pillar + cluster siblings (rel=nofollow
   опц. на партнёрки помечать rel="sponsored" отдельно)

Тон Дмитрия:
- "Мы" в обращении
- Технические замеры в каждой характеристике (мм, ватт, дБ)
- Никаких "идеально", "бомба", "100%"
- Мин. 1500 слов, макс. 3000 (без воды)

Язык: русский
Markdown output. НЕ добавляй H1 — wp_title справится.
```

### Prompt 4 — CTR Optimization (для low-CTR headlines)

```
Ниже список наших URL'ов из GSC где position < 10, но CTR < 2%
(плохие сниппеты).

Для каждого URL предложи:
1. Новый <title> (макс 60 символов)
2. Новый meta description (макс 160 символов)

Используй паттерны с высокой CTR:
- Number + benefit ("7 моделей до 30 000 ₽")
- Year ("в 2026 году")
- Comparison ("vs", "против")
- Question ("стоит ли", "что лучше")
- Specificity (конкретная модель, бренд)
- Social proof где уместно ("от инженера", "после 3 месяцев теста")

Не повторяй keyword буквально 5 раз — один раз достаточно.
Output: table url | current_title | new_title | current_meta | new_meta | rationale
```

### Prompt 5 — Indexation Audit

```
Список наших URL'ов из GSC Coverage отчёта со статусами:

- Crawled but not indexed
- Discovered but not crawled
- Excluded by 'noindex'
- Soft 404 / 4xx
- Duplicate without canonical

Для каждой группы:
1. Объясни вероятную причину
2. Предложи fix (sitemap update / internal links / noindex remove /
   merge / redirect / template fix)
3. Приоритет (P0/P1/P2)

Output: grouped markdown с конкретными действиями.
```

### Prompt 6 — Structured Data Validator

```
URL: {{url}}
HTML/JSON-LD attached: {{markup}}

Валидируй:
- Article schema присутствует и корректен (author, datePublished,
  dateModified, headline, image)
- FAQPage если есть FAQ-секция
- BreadcrumbList на category/post pages
- Organization на homepage / footer
- НЕТ дубликатов schema (RankMath + REHub конфликтуют)

Найди missing/broken и output как fix-list:
- что добавить
- что удалить
- что исправить (с конкретными values)
```

### Prompt 7 — AEO Infrastructure Setup

```
Один раз для сайта {{domain}}.

Сгенерируй:

1. robots.txt — allow:
   - GPTBot (OpenAI / ChatGPT)
   - Claude-Web (Anthropic)
   - ClaudeBot
   - PerplexityBot
   - Google-Extended (для AI Overviews opt-in)
   - Standard googlebot/bingbot
   Block: AhrefsBot, SemrushBot, MJ12bot (опц.)

2. llms.txt в корне:
   # {{site name}}
   > {{description}}

   ## {{cluster name}}
   - [{{Title}}]({{URL}}): краткое описание (1 line)
   ...

3. Schema на homepage:
   - Organization (with sameAs социалок)
   - Person для editor (Дмитрий)
   - WebSite + sitelinks searchbox

4. Schema на каждой статье:
   - Article с author=Person/Дмитрий
   - FAQPage если есть FAQ
   - BreadcrumbList

Выведи каждый артефакт отдельным code-block.
```

### Prompt 8 — Core Web Vitals Fixes

```
PageSpeed Insights отчёт для {{url}} attached.

Проблемы:
- LCP: {{ms}} (target <2.5s)
- INP: {{ms}} (target <200ms)
- CLS: {{value}} (target <0.1)

Для каждой failing метрики предложи 3 fix'а в порядке приоритета:
- Что в HTML/CSS/JS изменить
- Какой плагин/тему правка касается (REHub, RankMath, Greenshift)
- Ожидаемый прирост в баллах PSI
- Ratio "усилий / эффект"

Только actionable советы, не общая теория.
Output: per-metric секция с приоритизированным fix-list.
```

---

## 4. Маппинг на SCC архитектуру

### 4.1 Источники данных

Что нам нужно подключить (из текущего состояния):

| Источник | Статус в SCC | TODO для агента |
|---|---|---|
| **GSC** | API настроена в `searchConsole.js`, но Service Account нет | **P0** настроить Service Account → пока metrics синтетические |
| **GA4** | API настроена в `analytics.js`, тоже без Service Account | **P0** связать |
| **Ahrefs / Semrush** | НЕТ интеграции | **P1** — manual CSV upload через UI пока, потом API |
| **Pagespeed Insights** | НЕТ | **P1** — Google PSI API бесплатна, легко добавить |
| **Schema validator** | НЕТ | **P2** — скрейпить или Google Rich Results Test API |

### 4.2 Где жить агенту

Новый файл-сервис: `server/services/seo-strategist/`

```
seo-strategist/
├── index.js                — основной orchestrator (entry для cron)
├── data-sources/
│   ├── gsc-fetcher.js      — pulls GSC report (использует существующий services/searchConsole.js)
│   ├── ga4-fetcher.js      — pulls GA4 report (по аналогии)
│   ├── ahrefs-importer.js  — accepts CSV upload, парсит в нашу схему
│   ├── psi-fetcher.js      — Pagespeed Insights API
│   └── ai-referrers.js     — выделяет AI traffic из GA4 sources
├── analyzers/
│   ├── gap-analyzer.js     — Prompt 1 (Type A/B/C/D)
│   ├── competitor-gap.js   — Prompt 2
│   ├── ctr-optimizer.js    — Prompt 4
│   ├── indexation.js       — Prompt 5
│   ├── schema-validator.js — Prompt 6
│   └── cwv-fixes.js        — Prompt 8
├── content/
│   └── article-writer.js   — Prompt 3 (выводит markdown по rigid template)
├── infrastructure/
│   ├── robots-generator.js — Prompt 7 part 1
│   ├── llms-txt-builder.js — Prompt 7 part 2
│   └── schema-builder.js   — Prompt 7 part 3-4
└── prompts/
    ├── 01-gsc-analysis.md
    ├── 02-competitor-gap.md
    ├── 03-article-writing.md
    ├── 04-ctr-optimization.md
    ├── 05-indexation-audit.md
    ├── 06-schema-validator.md
    ├── 07-aeo-setup.md
    └── 08-cwv-fixes.md
```

### 4.3 Новые таблицы в SQLite

```sql
-- Sergey raw data exports (для воспроизводимости отчётов)
CREATE TABLE seo_data_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  source TEXT NOT NULL,                  -- gsc, ga4, ahrefs, psi
  collected_at TEXT NOT NULL,            -- snapshot date
  payload TEXT NOT NULL                  -- raw JSON / CSV blob
);

-- Findings от gap-analyzer (Type A-D)
CREATE TABLE seo_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  finding_type TEXT NOT NULL,            -- ctr_low, missing_content, cannibalization, ai_overview_loss, indexation, cwv, schema_broken
  url TEXT,
  query TEXT,
  severity TEXT,                         -- p0, p1, p2
  data TEXT,                             -- JSON: { current_ctr, suggested_title, ... }
  resolved_at TEXT,
  resolution TEXT,                       -- что сделали
  detected_at TEXT DEFAULT (datetime('now'))
);

-- AI traffic tracking — отдельный stream
CREATE TABLE seo_ai_referrers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  date TEXT NOT NULL,
  source TEXT NOT NULL,                  -- claude.ai, perplexity.ai, chatgpt.com, gemini.google.com
  sessions INTEGER DEFAULT 0,
  bounce_rate REAL,
  avg_session_duration REAL,
  UNIQUE(site_id, date, source)
);
```

### 4.4 Cron schedule

```
30 5 * * 1     seo_weekly_audit       — понедельник 05:30 UTC, runs всех 8 промптов
0 6 * * 1      seo_findings_brief     — после audit, генерит human-readable summary в Daily Brief
*/30 * * * *   psi_realtime_check     — для топ-10 страниц проверяет CWV каждые 30 мин (опц.)
```

### 4.5 UI — новые экраны в Dashboard

```
/seo-strategist/{site_id}
├── Tab: Overview
│   └── Health score + top 5 findings + AI referrer trend
├── Tab: Findings
│   └── Filter by type (CTR / cannibal / AEO loss / etc), bulk-resolve
├── Tab: Cluster Map
│   └── Visualize pillars + clusters + gap topics
├── Tab: Article Writer
│   └── Form: keyword + cluster → Claude generates draft → review → publish
├── Tab: AI Referrers
│   └── Time-series по source: Claude.ai, Perplexity, ChatGPT, Gemini
└── Tab: AEO Infrastructure
    └── Status checklist: robots.txt, llms.txt, schema, OG tags
```

### 4.6 Стоимость

Сейчас наш Claude usage ~$5/мес. С агентом:
- Weekly audit: ~50K input + 20K output × 4 site = 80K out + 200K in. Sonnet 4.6 → ~$1.20/нед = $5/мес
- Article writer: ~30K input + 8K output × ~10 статей/мес = 300K in + 80K out → $4.50/мес
- Per-finding (CTR / schema fixes): ~5K × 30 findings/мес → $0.50/мес

**Итого +$10/мес** на Claude API. С учётом Local LLM (когда заведём) — половина уйдёт туда.

---

## 5. Phased rollout

### Phase 0 — prerequisites (нужны от пользователя или manual)

- [ ] **GSC Service Account** — для popolkam, aykakchisto, 4beg (см. `docs/guides/google-service-account-setup.md`)
- [ ] **GA4 Service Account** — то же
- [ ] **Ahrefs / Semrush trial / paid** ИЛИ ручной CSV экспорт раз в неделю (cheap path)
- [ ] **Decision: AI referrers tracking via UTM или regex GA4 sources** — зависит от того, помечаем ли мы свои partner links UTM-кампаниями

### Phase 1 — read-only audit (1 неделя)

- [ ] Создать таблицы `seo_data_snapshots`, `seo_findings`, `seo_ai_referrers`
- [ ] Реализовать `gsc-fetcher.js` + `ga4-fetcher.js` (используем уже написанные `services/searchConsole.js`, `services/analytics.js`)
- [ ] Реализовать `gap-analyzer.js` (Prompt 1) с Sonnet 4.6
- [ ] UI: `/seo-strategist/{site_id}` Tab Overview + Findings (без write-actions, только read)
- [ ] Запустить разово на popolkam → validate качество гипотез вручную перед автоматизацией

### Phase 2 — write-actions + cron (2 недели)

- [ ] CTR optimizer (Prompt 4) → applies via WP REST PATCH title/excerpt
- [ ] Indexation audit (Prompt 5) → manual review of recommendations
- [ ] Schema validator (Prompt 6) → flags issues
- [ ] AI referrers tracking (даже если ничтожно — будет growth signal)
- [ ] Weekly cron `seo_weekly_audit`
- [ ] Daily brief integration: top 3 findings popup

### Phase 3 — content production (1 неделя)

- [ ] Article writer (Prompt 3) с rigid template
- [ ] UI Tab Article Writer: form-based input → markdown preview → 1-click publish via existing publish-page-direct.js
- [ ] Подключить к persona системы (Дмитрий / Дарья / Артём в зависимости от site_id)
- [ ] Persona-specific tone forbidden phrases уже в content-quality, voice.js — переиспользовать

### Phase 4 — AEO infrastructure (1 неделя)

- [ ] Generate robots.txt с AI crawlers allow + auto-deploy на каждый сайт
- [ ] Build llms.txt из content_plan + опубликованных статей, deploy
- [ ] Schema builder (Article, FAQPage, BreadcrumbList, Organization)
- [ ] Validate через Google Rich Results Test API

### Phase 5 — CWV automation (опционально, 1 неделя)

- [ ] PSI fetcher для топ-10 страниц
- [ ] CWV fixes prompt (Prompt 8) — рекомендации
- [ ] Auto-applicable: lazy-load images, preload hero, defer non-critical CSS

---

## 6. Что не из источника, но усилит 3×

Мы можем не ограничиваться 7-step framework — добавить **наши collected ресурсы**:

1. **Imported_articles re-fetch** (уже работает) — competitor freshness signal
2. **Content Quality агент** (уже работает) — pre-publish validation
3. **Persona voice checker** (уже в content-quality) — после AI generation проверяем соответствие Дмитрию/Дарье/Артёму
4. **Site Valuation агент** (уже есть) — feedback loop на $ от каждой опубликованной статьи

Из того что НЕ упомянуто в источнике, но нужно:
- **People Also Ask scraper** (по запросам где мы в топ-10) — дополнительный источник FAQ-вопросов
- **Reddit/Quora/Specialized forums** — для понимания пользовательского языка
- **YouTube transcripts** (через Whisper на local LLM) — competitor research

---

## 7. Risks / каpverats `[verified]`

1. **Growth claims автора post'а — не replicable** — это его сайт в его нише с его доменной авторитетностью. Воспроизводимость может оказаться 30-50% от его результатов
2. **llms.txt не имеет официальной поддержки от Google** — это inrasturctura ставки на anthropic + perplexity, не для AI Overviews самого Google
3. **AI Overviews сами часто галлюцинируют** — наш контент может попасть в AI Ov с искажением, мы не контролируем как Google reformulate'ит наш ответ
4. **Cannibalization fix через merge может убить trust signals** — лучше делать noindex + 301 на winner page, не удаление

---

## 8. Открытые вопросы (нужны ответы перед Phase 1)

- [ ] **GA4 + GSC Service Accounts** — у тебя были планы подключить, статус?
- [ ] **Ahrefs/Semrush** — есть ли paid доступ или живём на CSV?
- [ ] **AI referrer tracking** — UTM-помечать наши же ссылки или regex по `host` referrer'а?
- [ ] **Content gen + voice voice** — генерировать на Sonnet 4.6 или подождать local LLM (qwen2.5:14b)?
- [ ] **Где UI** — отдельный route `/seo-strategist/...` или встраиваем в текущий SiteDetail?

---

*Owner: Денис*
*Implementer: SCC (Claude)*
*Last updated: 2026-04-29*
