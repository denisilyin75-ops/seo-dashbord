---
title: "Code Review Agent: $1/мес за непрерывный audit собственного codebase"
date: 2026-04-19
tags: [claude, code-review, haiku, buildinpublic, anthropic, automation]
audience: ["Technical Twitter thread", "Anthropic case study", "Hacker News"]
canonical: https://github.com/denisilyin75-ops/seo-dashbord
draft: true
---

# Code Review Agent: $1/мес за непрерывный audit собственного codebase

Я пишу SaaS-like product в одиночку. Как solo-dev есть одна очевидная проблема: **нет второго человека который смотрит на мой код**. Это значит:
- Решения забываются через 2 недели («зачем я это так сделал?»)
- Technical debt накапливается незаметно
- Документация устаревает сразу после написания
- Если захочу продать продукт через год — буду неделю разбирать что где лежит

Построил Code Review Agent на Claude с 4 фазами автоматизации. Total cost < $2/мес. Вот как он работает.

## Phase 1 — post-commit LLM review (~$0.002-0.01 per commit)

Git hook:

```bash
#!/bin/sh
# SCC-CODE-REVIEW-AGENT
REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$REPO_ROOT/server/scripts/code-review.js"
LOG_FILE="${TMPDIR:-/tmp}/scc-code-review.log"

if [ -f "$SCRIPT" ] && command -v node > /dev/null 2>&1; then
  (nohup nice -n 19 node "$SCRIPT" --trigger=post_commit --sha="$(git rev-parse HEAD)" >> "$LOG_FILE" 2>&1 &) > /dev/null 2>&1
fi
exit 0
```

**Не блокирует commit** (`nohup` + background), **low priority** (`nice -n 19`). Если LLM недоступен — молча пропускает, записывает stub entry.

Диспетчер:

```javascript
// Маленькие diff → Haiku (дешёво, быстро). Большие (>300 lines) → Sonnet.
const diffLines = (diffCtx.fullDiff.match(/\n/g) || []).length;
const model = diffLines > 300
  ? 'anthropic/claude-sonnet-4.6'
  : 'anthropic/claude-haiku-4.5';
```

Системный промпт короткий и жёсткий:

```
Ты — опытный code reviewer. Смотришь на git diff + commit message, пишешь 3 секции:
"What": что изменилось (одно предложение, без marketing-формулировок)
"Why": какая логика изменения — читая код, а не copy-paste commit message
"Risks": observations если есть (0-2 bullet'а). Если ничего не тревожит — "None".

Стиль: нейтральный, технический, на русском. Не хвали. Не критикуй без конкретики.
```

Output формат fixed → append в `docs/review_log.md`:

```markdown
## 7e5b7bc — 2026-04-18 19:51 UTC

**What:** Обновлены идентификаторы моделей Claude в OpenRouter (haiku-4 → haiku-4.5, sonnet-4 → sonnet-4.6) и для прямого API.

**Why:** Модели устарели — OpenRouter и Anthropic API требуют актуальные версии для корректной работы сервиса.

**Risks:**
- Нельзя проверить, существуют ли на OpenRouter именно эти версии — требует проверки.
- Для прямого API строка `claude-haiku-4-5-20251001` необычна (обычно даты, но не в середине названия).

**Files:** 1 changed
**Author:** Denis Ilyin
**Model:** anthropic/claude-haiku-4.5 · 1045 tokens
```

**Важная деталь:** агент не просто парафразит commit message. Он **читает сам код** и пишет что реально поменялось. В приведённом примере агент **нашёл валидный risk** — model IDs могут не существовать на OpenRouter (я не подтвердил факт). Это именно то что mgli бы спросить человек-reviewer.

**Actual cost:** 1045 tokens × Haiku ($0.25/$1.25 per 1M) = **$0.00147 per commit**. За месяц с 100 commits = **$0.15**.

## Phase 2 — nightly API reference + architecture snapshot

Каждую ночь в 04:00 UTC:

**`docs/api-reference.md`** регенерируется:
- Regex-parser `server/routes/*.js` — ловит `router.METHOD('/path'` + preceding JSDoc block
- Mount points из `server/index.js` — `app.use('/api/xyz', router)` → prefix
- Output: markdown table с endpoints + descriptions, 60 endpoints в 15 группах

```markdown
### GET `/api/sites/:siteId/articles`
Список статей сайта. Two modes:
- Без фильтров: plain array (backward compat)
- С `?paged=1` или любыми фильтрами: `{ items, total, facets, limit, offset }`

**Query params:**
| Name | Type | Description |
|---|---|---|
| q | string | FTS5 search по title/notes/content_text/tags |
| type | string | review \| comparison \| guide \| ... |
| sort | string | modified_desc (default) \| title_asc \| ... |
```

**`docs/architecture.md`** auto-sections (между маркерами — manual sections не трогаются):

```markdown
<!-- AUTO:counts start -->

## System counts (auto, 2026-04-19)

| Слой | Значение |
|---|---|
| **Tables (SQLite)** | 21 |
| **API endpoints** | 60 (POST 18, GET 29, PUT 6, DELETE 6, PATCH 1) |
| **Services** | 27 модулей |
| **UI components** | 32 |
| **Pages** | 6 |
| **Backend LOC** | 7,157 |
| **Frontend LOC** | 5,981 |

<!-- AUTO:counts end -->
```

**Zero LLM cost** — всё deterministic parsing. Занимает 50-400ms.

## Phase 3 — weekly security audit + code smells

Каждый понедельник 06:00 UTC:

**Pattern-scan + npm audit:**
```javascript
const PATTERNS = [
  { re: /(api[_-]?key|secret|password|token)['"\s:=]+['"][A-Za-z0-9_-]{20,}/gi,
    severity: 'critical', label: 'hardcoded secret-like string' },
  { re: /`SELECT[\s\S]{0,100}\$\{([^}]+)\}/g,
    severity: 'critical', label: 'SQL injection risk (template literal)',
    filter: m => isLikelySqlInjection(m) },
  { re: /execSync\s*\([^)]*\$\{/g,
    severity: 'critical', label: 'shell injection via template literal' },
  // ...eval, innerHTML, dangerouslySetInnerHTML, etc.
];
```

**Smart false-positive reduction для SQL:**

```javascript
const SAFE_SQL_BASE_VARS = new Set([
  'placeholders', 'conds', 'clauses', 'baseJoin', 'whereSql',
  'sort', 'sortCol', 'orderBy', 'limitClause', 'fields',
]);

function isLikelySqlInjection(snippet) {
  const m = snippet.match(/\$\{([^}]+)\}/);
  if (!m) return false;
  const baseName = m[1].trim().match(/^([a-zA-Z_$][\w$]*)/)?.[1];
  // Если inner expression использует известные "safe" code-constructed vars
  // (conds.join, whereSql, placeholders) — это НЕ injection, а dynamic SQL
  // где params всё равно идут через prepared statement .run(...params)
  return !SAFE_SQL_BASE_VARS.has(baseName);
}
```

Без этого filter'а я получал 11 false-positive "critical" находок на первом прогоне. С filter'ом — 0 critical на моём codebase.

**Code smells scan:**
- Files >500 LOC (medium >1000)
- Functions >50 LOC (rough brace-match, medium >100)
- TODOs/FIXMEs counts
- **Orphan files** (0 imports из других файлов) — с detection dynamic imports (`await import('./path')`) и CJS require
- console.log hotspots

Output: `docs/security-audit.md` + `docs/code-smells.md`.

На моём codebase прямо сейчас:
- 0 critical security findings
- 3 high (innerHTML usage в WP plugin JS — знаю, нужен DOMPurify)
- 3 big files >500 LOC — кандидаты на refactor

## Phase 4 — monthly exit-readiness scorecard

15 dimensions × 0-100:

```javascript
const metrics = {
  documentation_coverage: scoreDocumentationCoverage(repoRoot),
  staleness: scoreStaleness(repoRoot),
  type_safety: scoreTypeSafety(repoRoot),           // JSDoc ratio или TS presence
  secret_hygiene: scoreSecretHygiene(repoRoot),     // .env gitignored + no hardcoded
  dependency_freshness: scoreDependencyFreshness(), // npm outdated major-behind
  tests: scoreTests(repoRoot),                       // test files count + structure
  code_complexity: scoreComplexity(repoRoot),        // big files penalty
  architecture_coherence: scoreArchitectureCoherence(),
  api_stability: scoreApiStability(repoRoot),        // git log BREAKING last 90d
  commit_quality: scoreCommitQuality(repoRoot),      // conventional commits %
  git_hygiene: scoreGitHygiene(),
  license_clarity: scoreLicenseClarity(repoRoot),    // LICENSE file + package.json
  build_reproducibility: scoreBuildReproducibility(), // lock + Dockerfile + compose
  deploy_reproducibility: scoreDeployReproducibility(), // setup.sh + README
  secrets_rotation: scoreSecretsRotation(),          // manual flag
};
```

Output markdown с interpretation:

```markdown
# Exit Readiness Scorecard

> Month: **2026-04**.
> Overall: **58/100** (first run).

## Focus areas (top 3 weakest)

- **tests**: 44/100 — 2 test files, baseline+coverage calculated from structure
- **license_clarity**: 0/100 — has_license_file: false, package_license: private
- **type_safety**: 8/100 — No TypeScript — max score без миграции = 60

## Interpretation

🟡 Pre-sale stage. Нужно доработать weak-dimensions до выхода на Flippa / MotionInvest.
```

**Чем это ценно:** у меня **numeric forcing function** для technical debt. Когда score упал с 60 до 55 — я знаю что нужно investigate. Месячный compare trend показывает что улучшилось/ухудшилось.

## Total cost breakdown

| Phase | Frequency | Cost/month |
|---|---|---|
| 1. Post-commit review | ~100 commits/mo | $0.15 (Haiku avg) |
| 2. Nightly api-ref + arch | 30 runs/mo | $0 (deterministic) |
| 3. Weekly security + smells | 4 runs/mo | $0 (deterministic) |
| 4. Monthly scorecard | 1 run | $0 (deterministic) |
| **Total** | | **~$0.15-0.50/mo** |

При переходе на local Qwen-72B (`LOCAL_LLM_URL` → routing): **$0/mo**.

## Когда стоит построить такой для себя

Если хотя бы 2 из 3 верны:
- 🟢 Solo dev или команда <3 человек
- 🟢 Долгоживущий проект (>6 мес roadmap)
- 🟢 Планируешь exit или хочешь видеть technical debt trend

Setup time: ~1 день. Maintenance: ~30 мин/месяц на tuning rules.

Полный код: [github.com/denisilyin75-ops/seo-dashbord](https://github.com/denisilyin75-ops/seo-dashbord)/server/services/code-review/

Design doc: [docs/agents/code-review-agent.md](https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/agents/code-review-agent.md)

---

*Продолжаю серию "Build in Public" о том как building affiliate SEO empire на Claude. Следующий пост — AI-merge для фикса cannibalization за $0.10.*
