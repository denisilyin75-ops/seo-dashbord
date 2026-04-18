# Site Guardian — агент поиска и улучшения

> **Статус:** spec — 2026-04-18 (planned, not implemented)
> **Scope:** `site` (работает по одному сайту за run)
> **Kind:** `cron` (weekly full scan) + `on_demand` (manual trigger из SiteDetail)
> **AI provider:** **Local LLM** (bulk аналитика, приватные данные) с fallback на OpenRouter Haiku
> **Связь:** `docs/ai-routing.md` §1.3, `docs/business-model.md §11`, `memory/project_content_freshness_agent.md`

---

## 0. Миссия

**Site Guardian заботится о сайте.** Обходит все страницы еженедельно, находит проблемы и возможности улучшения, складывает в очередь для оператора. Не редактирует сам (supreme principle: не ломаем) — предлагает через review-queue в SCC.

Заменяет/объединяет функции нескольких разрозненных checks:
- Content Freshness (устаревший контент)
- Broken Link Monitor (битые ссылки)
- SEO Doctor (тех. SEO health)
- Cannibalization Detector (конкуренция между своими страницами)
- Improvement Suggester (GSC-based подсказки)

Вместо 5 отдельных агентов — один мощный с модульной архитектурой.

## 1. Что сканирует — 6 категорий проверок

### 1.1 Health (критическое — красные флаги)

- **Broken internal links** — парсим HTML каждой опубликованной страницы, проверяем все `<a href>` на /domain/ → если 404/500/redirect chain >2 → red alert
- **Broken affiliate links** (интеграция с Offer Health когда он будет) — clickthrough на каждый partner URL, проверка что не «Товар снят с продажи»
- **Missing required schema** — нет Article / BreadcrumbList / FAQ / HowTo на review/guide/pillar pages → alert
- **Missing featured image** — WP post без featured_image → alert
- **Duplicate titles** — два `<title>` идентичны → cannibalization risk
- **Orphan pages** — статья published, но на неё нет ни одной internal link → не индексируется глубоко

### 1.2 Content quality (жёлтые флаги)

- **Low word count** — review <1000 слов, comparison <1500, pillar <3000 → suggest расширить
- **Thin meta description** — <120 симв → suggest расширить с key intent
- **Missing alt на images** — SEO + accessibility penalty
- **No internal links** — меньше 2 внутренних → suggest добавить
- **Stale `updated_at`** — >6 мес без обновлений + есть новые факты в нише → suggest refresh
- **Keyword density extremes** — <0.3% или >3% от total words

### 1.3 SEO opportunities (зелёные — action suggestions)

- **High impressions, low CTR** (GSC data) — ранжируется, но title/meta не кликабельны → suggest переписать title/meta
- **Ranks 11-20** — на пороге первой страницы, малое усилие → большой потенциал
- **Rising queries** (GSC) — запросы набирают impressions, но статья не оптимизирована под них → suggest LSI injection
- **Featured snippet opportunity** — ранжируется в топ-5, но нет структурированного ответа → suggest добавить summary-box
- **Missing FAQ keywords** — PAA (People Also Ask) запросы в SERP, но не покрыты в нашей FAQ → suggest добавить

### 1.4 Cannibalization (жёлтые)

- **Multiple pages ranking for same query** — наш собственный сайт конкурирует с собой → suggest merge / redirect / repurpose
- **Similar titles** (semantic similarity >0.85) — риск двойного индексирования, Google pick один и игнорит другой
- **Same primary keyword targeted** — проверяем по meta / H1 / title

### 1.5 Technical (жёлтые)

- **Core Web Vitals regressions** — если подключим CrUX или PageSpeed Insights API → watcher на LCP/CLS/INP
- **Page size bloat** — HTML >200KB, images total >2MB → suggest оптимизацию
- **404 counts** — crawl errors из GSC → нужно redirect
- **Sitemap staleness** — sitemap.xml last-modified не соответствует последней публикации
- **SSL expiration** — 14-дневный alert

### 1.6 Competitive (blue — opportunities)

- **Missing topics** (Phase 3) — через competitor scan видим темы которые есть у them + сходная аудитория, у нас нет → suggest новые обзоры/guide
- **Stale competitor content** — конкурент не обновлялся 12+ мес на теме, мы можем «обогнать» обновлением нашего
- **Trending queries** — Google Trends API / Wordstat: запросы растут → suggest быстрее написать обзор

## 2. Приоритизация алертов

Каждая находка имеет **severity** и **impact_estimate**:

| Severity | Когда | Visibility |
|---|---|---|
| 🔴 **Critical** | Broken link на 404, нет schema на review, site down | Toast + email + dashboard alert |
| 🟠 **Warning** | Thin content, stale 6m+, cannibalization | Dashboard alert |
| 🟡 **Improvement** | Could be better (CTR низкий, WP count <1000) | Suggestion queue |
| 🔵 **Opportunity** | Competitor trend, PAA gap | Ideas list |

**Impact estimate** (через Expected Value UX принцип):
- Broken link → «теряем $X/мес в affiliate click-through»
- Stale content → «рефреш вернёт $N к позициям, +$M/мес»
- CTR fix → «+30% CTR на этой странице = +$K/мес»
- New article opportunity → «+$Y к капитализации + $Z/мес»

Приоритет действий: сортировка по `impact_estimate / effort_hours`.

## 3. Интеграция с локальной LLM

Site Guardian — **flagship use-case для local LLM**:

**Что делает AI в Guardian:**
1. **Semantic similarity** для cannibalization — embeddings всех наших title+H1, попарно cosine distance
2. **Quality assessment** — читает content, оценивает «читается ли», «есть ли конкретика», «есть ли мнение» через rubric-based prompt
3. **Suggestion generation** — «ваша статья про De'Longhi Magnifica S набирает 500 impressions/мес с CTR 1.2%. Рекомендую title update: "Обзор De'Longhi Magnifica S 2026: честное мнение после года использования" — это должно дать +40% CTR»
4. **Competitor comparison** (Phase 3) — читает наш контент + 3 competitor URLs, формулирует gaps

**Объём AI-работы на запуск:**
- 100 страниц × 3k tokens input = 300k tokens
- Sonnet: $0.90 за run, weekly = $3.60/мес
- Local: $0 за run (электричество ничтожно)
- На scale (500 pages): Sonnet $4.50 × weekly = $18/мес, local = $0

Поэтому **Guardian → local LLM** основной, fallback Haiku на один-two critical prompts.

## 4. Настройка и config

```js
// Configurable per site через SCC
{
  schedule: '@weekly',              // cron или 'manual'
  checks_enabled: [
    'broken_links',
    'content_quality',
    'seo_opportunities',
    'cannibalization',
    'technical',
    'competitive',
  ],
  thresholds: {
    low_word_count_review: 1000,
    low_word_count_comparison: 1500,
    low_word_count_pillar: 3000,
    stale_days: 180,
    ctr_low_threshold: 2.0,
    orphan_max_days: 30,
  },
  min_severity_to_alert: 'warning',   // critical | warning | improvement | opportunity
  notify_channel: 'dashboard',        // + email | telegram (Phase 2)
  ai_provider: 'local_first',         // local_first | openrouter_haiku | openrouter_sonnet
}
```

## 5. Output — что видит оператор

### 5.1 В SCC Dashboard — новая вкладка «🛡 Site Guardian»

- Сводка: «За последние 7 дней найдено: 3 🔴 / 12 🟠 / 24 🟡 / 8 🔵»
- Filter by severity
- Filter by category (broken links / content / SEO / etc)
- Каждый алерт — карточка с:
  - Title («Broken affiliate link on /obzor-delonghi-magnifica/»)
  - Severity
  - Impact estimate («~$45/мес affiliate revenue loss»)
  - Effort estimate («5 минут — заменить ссылку»)
  - **Action:** кнопка «Устранить» → открывает SCC flow для фикса (или прямую ссылку в wp-admin)
  - **Dismiss** если знаем и принимаем

### 5.2 Suggestion queue — ожидающие действия

Отдельный список «To do» в SCC с подсказками агента. Оператор смотрит, принимает/отклоняет. Как Merge Request review.

### 5.3 Статистика в блоге SCC

Еженедельная blog-запись автоматом: «Site Guardian weekly: popolkam 3 fixed / 2 deferred. Suggest publish Top Saeco вместо refresh старого». Motivational loop → оператор видит прогресс.

## 6. Схема БД

```sql
CREATE TABLE site_guardian_findings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  run_id TEXT,
  category TEXT NOT NULL,           -- health | quality | seo_opp | canniball | technical | competitive
  severity TEXT NOT NULL,           -- critical | warning | improvement | opportunity
  url TEXT,                          -- страница о которой речь (NULL если site-wide)
  title TEXT NOT NULL,               -- "Broken affiliate link on /obzor-xyz/"
  description TEXT,                  -- полное описание проблемы
  impact_usd_month REAL,            -- оценка $-эффекта от фикса
  effort_minutes INTEGER,           -- оценка времени
  action_hint TEXT,                  -- "Заменить Admitad link на новую из /go/xxx"
  status TEXT DEFAULT 'open',       -- open | in_progress | fixed | dismissed
  fixed_at TEXT,
  dismissed_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_findings_site_open ON site_guardian_findings(site_id, status);
CREATE INDEX idx_findings_severity ON site_guardian_findings(severity, status);
```

## 7. Phases реализации

| Phase | Что | Effort | AI usage |
|---|---|---|---|
| 0 | Spec (этот документ) | Готово | — |
| 1 | Skeleton agent + broken_links check | 1 день | Local: URL fetching, no AI |
| 2 | Content quality checks (word count, alt, thin) | 1 день | Local: simple parsing |
| 3 | SEO checks (GSC integration + CTR analysis) | 2-3 дня | Local: rules |
| 4 | AI-driven quality assessment | 1 день | **Local LLM** для bulk |
| 5 | Cannibalization (semantic embeddings) | 2 дня | **Local embeddings** + cosine |
| 6 | UI в SCC (findings list + actions) | 2 дня | — |
| 7 | Competitive scan | 2-3 дня | Local + selective Haiku |
| 8 | Auto-blog weekly report | 4 часа | Haiku для narrative |

Суммарно: **~2-3 недели работы** для полной реализации. Первая ценность (broken links + content quality) — **через 2-3 дня** после начала.

## 8. Success metrics

- Среднее время от появления проблемы до её обнаружения: target <7 дней
- % findings которые оператор принимает (не dismiss): target >60%
- Impact от реализованных suggestions (от impact_usd_month sum) vs effort: target ratio >$50/час
- % автоматически восстановленных broken links (Phase 4+ с auto-replace через Admitad API): target >80%

## 9. Правила эволюции

**Не добавляем check в Guardian если:**
- Он триггерит больше 1% false positives
- Он производит больше алертов чем оператор может обработать за неделю
- Impact estimate слишком туманный («может быть полезно»)

**Обновление check'ов:** можно в любой момент выключить отдельный check через config, не трогая весь агент.

## 10. Связь с другими агентами

- **content_freshness** → часть Site Guardian (quality category)
- **offer_health** → часть Site Guardian (health category, broken affiliate links)
- **site_valuation** → читает findings Guardian для точнее оценки (много critical = penalty к valuation)
- **daily_brief** → берёт top-3 findings от Guardian для утренней карточки «Вчера найдено»
- **feed_sync** → когда partner feed updates, Guardian проверяет broken affiliate links immediately
