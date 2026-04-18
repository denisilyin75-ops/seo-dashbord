# Code Review + Documentation Agent

> **Статус:** design v1 — 2026-04-18 (planned, not implemented)
> **Scope:** SCC codebase (server/ + src/ + docs/), опционально catalog-service когда появится
> **Kind:** post-commit hook (sync, быстро) + nightly summary (aggregate) + weekly/monthly deeper audits
> **AI provider:** OpenRouter Sonnet для качества анализа, Haiku для commit-диффов (короткие), local Qwen-72B когда online
> **Связь:** `docs/agents/site-guardian.md`, `docs/agents/content-quality-agent.md`, `docs/business-model.md §exit-readiness`

---

## 0. Миссия

**Каждый коммит и каждый день — audit trail качества кода и актуальности документации.**

Финальная цель: когда покупатель смотрит SCC как asset на Flippa / MotionInvest / Empire Flippers — он видит:

1. **Актуальный `docs/api-reference.md`** — полный список endpoints, сгенерированный агентом (не рукописный, поэтому всегда синхронизирован)
2. **`docs/architecture.md`** — weekly snapshot с dependency graph, table counts, hot paths
3. **`docs/review_log.md`** — хронология: каждый commit с «что и зачем» в 2-3 строках (LLM review diffа)
4. **`docs/exit-readiness.md`** — monthly scorecard /100 по 15 параметрам
5. **`docs/security-audit.md`** — weekly: npm audit + secret hygiene + injection patterns

Это **не** замена GitHub Copilot review — это **accumulated documentation as a byproduct of development**.

**Supreme-соответствие:** прозрачность. Покупатель видит реальное состояние кода, а не marketing.

---

## 1. Триггеры и периодичность — hybrid подход

**Решение:** post-commit + nightly — не одно или другое.

### 1.1 Post-commit (sync, <10s)

**Когда:** после каждого `git commit`. Git hook `.git/hooks/post-commit` или GitHub Action `on: push`.

**Что делает:**
1. `git show --stat HEAD` → список файлов, +added/-removed
2. `git show HEAD` → полный diff (обрезаем если > 20k tokens)
3. LLM (Haiku для мелких, Sonnet для крупных diff'ов):
   - «Что изменилось» — одно предложение
   - «Зачем, судя по коду» — одно предложение
   - «Риски/observations» — 0-2 bullet'а (если есть)
4. Append в `docs/review_log.md` (newest first)
5. Update `docs/devlog.md` если commit помечен как milestone (содержит `feat:` / `BREAKING:`)

**НЕ блокирует commit** — если LLM недоступен, агент молча пропускает (записывает пустой entry).

**Cost:** Haiku $0.002 per commit average. За 100 commits/мес = $0.20.

### 1.2 Nightly summary (aggregate, ~30s)

**Когда:** 04:00 UTC, после Site Guardian и Content Quality.

**Что делает:**
1. Собирает все commits за последние 24h
2. LLM (Sonnet) создаёт **daily narrative**: «сегодня добавили X, поправили Y, обнаружили Z»
3. Updates `docs/api-reference.md` — парсит `server/routes/*` (Fastify/Express route definitions + JSDoc) и генерит полную табличку
4. Updates auto-parts `docs/architecture.md` (counts: tables, routes, services, components)
5. Appends daily summary в `docs/devlog.md`
6. Если critical issue обнаружен (нашёл hardcoded secret, SQL injection pattern) → ALERT в Daily Brief SCC

**Cost:** Sonnet ~$0.05-0.15 per nightly run (depending on code volume).

### 1.3 Weekly deeper audits (Mon 06:00)

1. **Security audit** — npm audit + регексы по кодовой базе на common mistakes
2. **Dependency freshness** — какие пакеты стареют (major versions behind)
3. **Code smell scan** — файлы > 500 lines, функции > 50 lines, циклические импорты, `TODO`/`FIXME` trendline
4. **Test coverage delta** (когда тесты появятся)
5. **Orphan files** — файлы без импортов из других файлов (кроме entry points)

Cost ~$0.30 per week.

### 1.4 Monthly exit-readiness scorecard (1-е число)

15 параметров × score 0-100:

| Параметр | Metric |
|---|---|
| Documentation coverage | % файлов с API docs, % endpoints в api-reference.md |
| Staleness | средний возраст `docs/*.md` vs actual code |
| Type safety | % JS files с JSDoc types (pre-TS) / TS migration progress |
| Secret hygiene | hardcoded secrets found, env vars naming consistency |
| Dependency age | % deps ahead by more than 1 minor / 1 major |
| Tests (когда будут) | coverage %, test/code ratio |
| Code complexity | avg cyclomatic per function |
| Architecture coherence | LLM review architecture doc vs actual code deviation |
| API stability | breaking changes in last 30/90/365 days |
| Commit quality | % commits с conventional format + body |
| Git hygiene | force-pushes, branch count, stale branches |
| License clarity | deps license audit, LICENSE файл |
| Build reproducibility | `npm ci` на чистом clone → success |
| Deploy reproducibility | docker-compose up → success on fresh VM |
| Secrets rotation | когда env vars были последний раз ротированы (manual flag) |

Aggregate в `docs/exit-readiness.md`. Trend linia month-over-month → видно что растёт, что деградирует.

**Cost** ~$1/мес.

### 1.5 Итого cost

| Триггер | Cost/мес |
|---|---|
| Post-commit (100 commits/мес) | $0.20 |
| Nightly (30 × $0.10) | $3.00 |
| Weekly audits | $1.20 |
| Monthly scorecard | $1.00 |
| **Total** | **~$5-6/мес** |

Когда local Qwen online: всё кроме weekly/monthly audits → local. Cost падает до **~$1/мес**.

---

## 2. Data model

```sql
-- =====================================================
-- code_review_runs — каждый запуск агента (любого типа)
-- =====================================================
CREATE TABLE code_review_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger         TEXT NOT NULL,          -- 'post_commit' | 'nightly' | 'weekly' | 'monthly' | 'manual'
  commit_sha      TEXT,                    -- для post-commit
  started_at      TEXT DEFAULT (datetime('now')),
  finished_at     TEXT,
  status          TEXT,                    -- running | completed | failed
  output_files    JSON,                    -- ['docs/review_log.md', 'docs/api-reference.md']
  llm_provider    TEXT,
  llm_tokens_in   INTEGER,
  llm_tokens_out  INTEGER,
  llm_cost_usd    REAL,
  error           TEXT
);
CREATE INDEX idx_crr_trigger ON code_review_runs(trigger, started_at DESC);
CREATE INDEX idx_crr_commit ON code_review_runs(commit_sha);

-- =====================================================
-- code_health — accumulated issues & observations
-- =====================================================
CREATE TABLE code_health (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id          INTEGER REFERENCES code_review_runs(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,          -- 'security' | 'smell' | 'docs_drift' | 'dep_age' | 'test_gap' | 'complexity'
  severity        TEXT NOT NULL,          -- 'critical' | 'high' | 'medium' | 'low' | 'info'
  file_path       TEXT,
  line_number     INTEGER,
  message         TEXT NOT NULL,
  suggestion      TEXT,
  detected_at     TEXT DEFAULT (datetime('now')),
  resolved_at     TEXT,                    -- NULL если открыт
  resolved_commit TEXT,
  ignored         BOOLEAN DEFAULT FALSE,
  ignore_reason   TEXT
);
CREATE INDEX idx_ch_open ON code_health(category, severity) WHERE resolved_at IS NULL;

-- =====================================================
-- exit_readiness_scorecards — monthly snapshots
-- =====================================================
CREATE TABLE exit_readiness_scorecards (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  month           TEXT NOT NULL UNIQUE,    -- '2026-04'
  overall_score   INTEGER,                  -- 0-100
  scores_json     JSON,                     -- {documentation: 85, staleness: 72, ...}
  trend_json      JSON,                     -- deltas vs prev month
  narrative       TEXT,                     -- LLM summary
  created_at      TEXT DEFAULT (datetime('now'))
);
```

---

## 3. Architecture — как это работает

```
┌────────────────────────────────────────────────────┐
│  Git hook: post-commit                              │
│    → spawns: node server/scripts/code-review.js     │
│             --trigger=post_commit --sha=HEAD        │
└──────────────────┬─────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────┐
│  server/services/code-review/                       │
│  ├─ index.js         — orchestrator                 │
│  ├─ diff-analyzer.js — read diff + LLM narrate     │
│  ├─ api-doc-gen.js   — parse routes → api-ref.md   │
│  ├─ arch-snapshot.js — counts, deps, dep graph     │
│  ├─ security-audit.js — npm audit + pattern scans  │
│  ├─ smell-scan.js    — file size / TODO / orphans  │
│  └─ exit-scorecard.js — 15 params aggregator       │
└──────────────────┬─────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────┐
│  Outputs (files written atomically)                 │
│  ├─ docs/review_log.md       (append-only)          │
│  ├─ docs/api-reference.md    (regenerated)          │
│  ├─ docs/architecture.md     (auto-section замен.)  │
│  ├─ docs/security-audit.md   (regenerated weekly)   │
│  ├─ docs/exit-readiness.md   (regenerated monthly)  │
│  └─ docs/devlog.md           (append ежедневно)     │
└────────────────────────────────────────────────────┘
                   │
                   ▼
              DB: code_review_runs + code_health
                   │
                   ▼
              SCC UI: /code-health dashboard
```

---

## 4. Post-commit hook implementation

### 4.1 Hook file `.git/hooks/post-commit`

```bash
#!/bin/sh
# Post-commit — async code review trigger.
# Не блокирует коммит, запускает в фоне с low priority.

if [ -f "$(git rev-parse --show-toplevel)/server/scripts/code-review.js" ]; then
  nohup nice -n 19 node "$(git rev-parse --show-toplevel)/server/scripts/code-review.js" \
    --trigger=post_commit \
    --sha=$(git rev-parse HEAD) \
    > /tmp/scc-code-review.log 2>&1 &
fi
exit 0
```

**Устанавливается** через `npm run install-hooks` или при первом запуске dev-server.

### 4.2 GitHub Action alternative

Для branch-push сценариев (когда пользователь работает через GitHub web UI или forks):

```yaml
# .github/workflows/code-review.yml
name: Post-push code review
on:
  push:
    branches: [main]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci --omit=dev
      - run: node server/scripts/code-review.js --trigger=post_commit --sha=${{ github.sha }}
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
```

Опционально: если агент находит critical issue → comment в PR или issue создаётся.

---

## 5. Post-commit workflow — shape output

### 5.1 Что идёт в `docs/review_log.md`

Format: **newest first**. Each entry ~5 lines.

```markdown
## 530814c — 2026-04-18 22:40 UTC

**What:** Миграция FTS5 теперь восстанавливает индекс через user_version pragma, не через count-check.

**Why:** Contentless FTS5 возвращает count из source-таблицы → старая проверка `ftsCount===0` была ненадёжна (всегда ==articlesCount), rebuild никогда не запускался.

**Risks:** None — migration idempotent.

**Files:** server/db.js (+6 -6)

---

## b47a1ec — 2026-04-18 22:20 UTC

**What:** ArticlesPanel: replaced default import from ConfirmDialog with useConfirm hook.

**Why:** ConfirmDialog.jsx не экспортирует default — только ConfirmProvider и useConfirm hook. Build failed на prod.

**Risks:** None.

**Files:** src/components/ArticlesPanel.jsx (+9 -19)
```

### 5.2 Промпт для Haiku (post-commit)

```
Ты — code reviewer. Смотришь на git diff + commit message, пишешь 3 секции:
"What": что изменилось (одно предложение, без marketing).
"Why": какая логика судя по коду (одно предложение).
"Risks": observations если есть (0-2 bullet'а короткие, иначе "None").

Стиль: нейтральный, технический, на русском. Не повторяй commit message — читай код.
Не хвали. Не критикуй без конкретики.

Diff:
{diff обрезанный до 15k tokens}

Commit message:
{message}

Вывод строго в формате:
**What:** <one sentence>
**Why:** <one sentence>
**Risks:** <bullets или "None">
```

---

## 6. API documentation generator

### 6.1 Цель

Один `docs/api-reference.md` со всеми endpoints, всегда синхронизированный.

### 6.2 Parser для Express routes

Сканирует `server/routes/*.js`:

```typescript
// Pattern to detect: router.<method>(<path>, <handler>)
//                    + предшествующий JSDoc block с @body / @query / @returns
// + Имя файла = section heading в output
```

**Example output в `docs/api-reference.md`:**

````markdown
# SCC API Reference

Auto-generated by code-review-agent. Last updated: 2026-04-18 04:00 UTC.

## Articles (`server/routes/articles.js`)

### GET `/api/sites/:siteId/articles`
Список статей сайта. Two modes:
- Без фильтров: plain array (backward compat)
- С `?paged=1` или любыми фильтрами: `{ items, total, facets, limit, offset }`

**Query params:**
| Name | Type | Description |
|---|---|---|
| q | string | FTS5 search по title/notes/content_text/tags |
| type | string | review \| comparison \| guide \| ... |
| status | string | published \| draft \| planned \| archived |
| tags | string \| string[] | CSV or repeated — все должны присутствовать |
| sort | string | modified_desc (default) \| title_asc \| sessions_desc \| ... |
| limit | number | 50 default, max 500 |
| offset | number | 0 default |

**Response example:**
```json
{ "items": [...], "total": 366, "facets": { "byType": [...], ... }, "limit": 50, "offset": 0 }
```

### POST `/api/articles/bulk`
Массовые операции. Max 500 items per request.

**Body:**
```json
{ "article_ids": [...], "action": "archive|delete|tag_add|tag_remove|status", "payload": { ... } }
```

...
````

### 6.3 Алгоритм: «что добавить в parser»

Phase 1 — простой regex-based (достаточно для Express).  
Phase 2 — proper AST через `@babel/parser` когда размер router'ов вырастет.

---

## 7. Architecture snapshot

Файл `docs/architecture.md` содержит **auto-sections** (между маркерами `<!-- AUTO:start -->` и `<!-- AUTO:end -->`) и **manual sections** (rest).

Auto-parts обновляются nightly:

```markdown
<!-- AUTO:counts start -->

## System counts (auto, 2026-04-18)

- **Tables:** 18 (sites, site_metrics, articles, content_plan, ai_log, deploys,
  daily_briefs, user_prefs, agent_configs, agent_runs, site_valuations,
  article_revisions, blog_posts, articles_fts + ...)
- **API endpoints:** 47 (GET 28, POST 12, PUT 4, DELETE 3)
- **Services:** 12 (wordpress, analytics, searchConsole, claude, deployer,
  revisions, article-search, daily-brief, valuation, portfolio, content-plan,
  agents)
- **Agents:** 8 configured, 6 active
- **UI components:** 32
- **Backend LOC:** 4,850 (server/)
- **Frontend LOC:** 6,120 (src/)

## Dependency graph (top-level)

```
Layout
├── PortfolioWidget
├── Dashboard
│   ├── BlogPanel
│   ├── DailyBrief
│   ├── PhilosophyPanel
│   └── SiteCard ×N
└── SiteDetail
    ├── ArticlesPanel ← ArticleRow, EmptyState, ConfirmDialog
    ├── ValuationPanel
    ├── AIPanel
    └── LogPanel
```

<!-- AUTO:counts end -->
```

---

## 8. Security audit

### 8.1 Weekly scan

```javascript
// server/services/code-review/security-audit.js

const PATTERNS = [
  { re: /process\.env\.\w+\s*=/g, issue: 'env mutation', severity: 'medium' },
  { re: /api[_-]?key['"\s:=]+['"]?[A-Za-z0-9]{20,}/gi, issue: 'hardcoded API key', severity: 'critical' },
  { re: /eval\s*\(/g, issue: 'eval() usage', severity: 'high' },
  { re: /execSync\s*\(.*\$\{/g, issue: 'template literal in shell exec', severity: 'critical' },
  { re: /`SELECT.*\$\{/g, issue: 'SQL injection risk (template literal in query)', severity: 'critical' },
  { re: /innerHTML\s*=/g, issue: 'innerHTML assignment (XSS)', severity: 'high' },
  { re: /dangerouslySetInnerHTML/g, issue: 'React XSS vector (used)', severity: 'medium' },
];

// + `npm audit --json` → count vulns by severity
// + check .env.example vs .env for new vars not in example
// + grep repo for файлы с расширением типа '.env' or *.pem outside gitignore
```

Output → `docs/security-audit.md` + `code_health` entries.

---

## 9. Code smell scan

### 9.1 Deterministic rules

| Rule | Threshold | Severity |
|---|---|---|
| File size | > 500 LOC | Low |
| File size | > 1000 LOC | Medium |
| Function size | > 50 LOC | Low |
| Function size | > 100 LOC | Medium |
| Cyclomatic complexity | > 10 | Medium |
| TODO/FIXME count | > 30 total | Info (trend) |
| Cyclic imports | any | High |
| Orphan files | files with 0 imports from others | Info (show list) |
| console.log count | > 20 outside server/logger | Low |

### 9.2 Output

```markdown
## Code smells (auto, 2026-04-18 weekly)

### Large files (>500 LOC)
- `server/db.js` (620 LOC) — consider splitting migrations into own file
- `src/pages/SiteDetail.jsx` (540 LOC) — candidate for extraction

### TODOs over time
- Current: 23 TODOs, 8 FIXMEs (vs 18+7 week ago, +30% growth)
- Hotspots: `server/routes/articles.js` (5), `src/components/AIPanel.jsx` (4)

### Orphan files (no imports found)
- `deploy/allow-svg.php` — possibly legacy, verify
- `prototype/seo-command-center.jsx` — confirmed prototype, safe
```

---

## 10. Exit-readiness scorecard

### 10.1 Формулы для scoring

```typescript
// Example: documentation coverage
score_docs = 
    (% endpoints documented in api-reference.md) × 0.5
  + (% services with JSDoc module block) × 0.3
  + (avg freshness: days since last update of docs/*.md, negative) × 0.2

// Staleness
score_staleness = 100 - (avg age of docs/*.md in days, capped at 365)
```

### 10.2 Trend narrative

LLM читает current + previous 3 months scores, пишет 2-3 абзаца:

```markdown
## Exit Readiness — 2026-04

**Overall: 78/100** (+3 from 75 in March)

Рост documentation coverage (62 → 78) за счёт добавления catalog-module + content-quality design docs. Security audit чистый, 0 critical issues.

Регресс: code complexity (82 → 76) — ArticlesPanel + ValuationPanel подошли к 500 LOC пороги. Recommend: extract sub-components в ближайший рефактор-спринт.

Dependency age стабильно (85): 3 пакета > 1 minor behind (non-critical).

**Для продажи:** если сохраним trend, к August достигнем 90+ — comfortable zone для listing'а на Empire Flippers (их минимум для premium tier).
```

---

## 11. UI в SCC

### 11.1 `/code-health` page

```
┌─ Code Health — SCC ─────────────────────────────────────────┐
│                                                              │
│  Exit Readiness: 78/100 🟢  (+3 vs прошлый месяц)           │
│  [View scorecard →]                                          │
│                                                              │
│  ┌─ Open issues ──────────────────────────────────────────┐ │
│  │ 🔴 Critical (0)                                        │ │
│  │ 🟠 High (2)                                            │ │
│  │ ├─ innerHTML assignment in RevisionsModal.jsx:45      │ │
│  │ └─ File size > 1000 LOC: server/db.js (rewrite)       │ │
│  │ 🟡 Medium (12) [развернуть]                           │ │
│  │ 🟢 Low (34) [развернуть]                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Recent reviews (last 7 days, 23 commits):                  │
│  [Open review_log.md →]                                     │
│                                                              │
│  Trends:                                                     │
│  • Documentation: ████████░░ 78% (+5)                       │
│  • Security:      ██████████ 100%                           │
│  • Staleness:     ██████░░░░ 62%                            │
│  • Complexity:    ███████░░░ 76% (-6 ⚠️)                    │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 Daily Brief integration

6-я карточка `codeHealth`:

```
Code: 78/100 🟢
🟠 2 high issues
📄 Docs freshness 85% → api-ref обновлён вчера
[→ /code-health]
```

---

## 12. Phasing

### Phase 1 — MVP post-commit (1 сессия)

- [ ] Схема таблиц `code_review_runs`, `code_health`
- [ ] `server/scripts/code-review.js` orchestrator
- [ ] `server/services/code-review/diff-analyzer.js` — post-commit LLM review
- [ ] `.git/hooks/post-commit` установщик
- [ ] `docs/review_log.md` initial

### Phase 2 — API doc generator + architecture snapshot (1 сессия)

- [ ] `api-doc-gen.js` — Express route parser
- [ ] `arch-snapshot.js` — counts + dependency graph
- [ ] `docs/api-reference.md` + auto-sections в `docs/architecture.md`
- [ ] Nightly cron

### Phase 3 — Security + smell weekly (1 сессия)

- [ ] `security-audit.js` + patterns
- [ ] `smell-scan.js` + thresholds
- [ ] `docs/security-audit.md` + `docs/code-smells.md`
- [ ] SCC UI `/code-health` MVP (read-only)

### Phase 4 — Exit readiness scorecard (1 сессия, после 2-3 месяцев данных)

- [ ] `exit-scorecard.js` + formulas
- [ ] Monthly cron
- [ ] `docs/exit-readiness.md` + trend narrative
- [ ] Daily Brief `codeHealth` карточка

### Phase 5 — GitHub Action fallback (optional)

- [ ] `.github/workflows/code-review.yml`
- [ ] OPENROUTER_API_KEY secret setup

---

## 13. Guardrails

| Risk | Mitigation |
|---|---|
| **LLM hallucinates что-то в review** | Always link to actual commit SHA + diff preview in `review_log.md`. Human может перепроверить |
| **Post-commit hook замедляет dev flow** | Runs `nohup` в фоне, не блокирует terminal |
| **LLM cost runaway** | Hard daily budget (`CODE_REVIEW_DAILY_BUDGET=$2`). При превышении — skip weekly/monthly. Post-commit продолжает (критично для trail) но с Haiku only |
| **Author unhappy с «ты сделал Х»** | Агент пишет «commit сделал X» — не персонифицирует |
| **API-reference содержит secrets accidentally** | Parser игнорирует JSDoc где упомянуты `@private`, `@internal` |
| **Scorecard subjective без данных** | Первые 3 месяца — only deterministic measures. LLM narrative добавляется после baseline |
| **docs/review_log.md бесконтрольно растёт** | Auto-archive после N месяцев в `docs/archive/review_log_2026-04.md` |

---

## 14. Settings (SCC)

```
┌─ Settings → Code Review ──────────────────────────────────┐
│                                                            │
│  [✓] Post-commit review                                    │
│  [✓] Nightly summary (04:00 UTC)                           │
│  [✓] Weekly audits (Mon 06:00)                             │
│  [✓] Monthly scorecard (1st of month)                      │
│                                                            │
│  LLM provider policy:                                      │
│  (•) Hybrid: Haiku для commits, Sonnet для weekly+         │
│  ( ) Cloud only (all Sonnet)                                │
│  ( ) Local first (when Qwen online)                        │
│  ( ) Disabled                                              │
│                                                            │
│  Daily budget:  $[ 2.00 ] / day                           │
│                                                            │
│  Outputs:                                                  │
│  [✓] docs/review_log.md (post-commit)                     │
│  [✓] docs/api-reference.md (nightly)                      │
│  [✓] docs/architecture.md auto-sections (nightly)         │
│  [✓] docs/security-audit.md (weekly)                      │
│  [✓] docs/code-smells.md (weekly)                         │
│  [✓] docs/exit-readiness.md (monthly)                     │
│                                                            │
│  Notification:                                             │
│  - Critical security finding → [Daily Brief immediate]    │
│  - Scorecard drop >5 points → [Daily Brief]               │
│                                                            │
│  [ Save ]                                                  │
└────────────────────────────────────────────────────────────┘
```

---

## 15. Связанные документы

- `docs/agents/site-guardian.md` — coexists (site content vs code)
- `docs/agents/content-quality-agent.md` — parallel pattern (post-event + nightly + weekly)
- `docs/business-model.md §exit-implications` — scorecard directly feeds exit value
- `docs/devlog.md` — потребитель nightly output
- `docs/architecture.md` — потребитель auto-sections

---

## 16. Changelog

- **v1 (2026-04-18):** initial design. Hybrid post-commit + nightly + weekly + monthly. Cost $5-6/мес cloud, ~$1/мес когда Qwen online. 5 phases rollout, MVP — Phase 1.
