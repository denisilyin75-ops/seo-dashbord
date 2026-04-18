# SCC Architecture

> Auto-sections (между `<!-- AUTO:counts start -->` и `<!-- AUTO:counts end -->`) обновляются code-review-agent nightly.
> Остальное — manual (пишем руками, не перезаписывается).

<!-- AUTO:counts start -->

## System counts (auto, 2026-04-18)

| Слой | Значение |
|---|---|
| **Tables (SQLite)** | 21 |
| **API endpoints** | 60 (POST 18, GET 29, PUT 6, DELETE 6, PATCH 1) |
| **Services** | 27 модулей |
| **UI components** | 29 |
| **Pages** | 6 |
| **Backend LOC** | 7,157 |
| **Frontend LOC** | 5,981 |

## Dependency graph (top-level)

```
App (src/App.jsx)
├── Layout
│   ├── PortfolioWidget
│   └── <nav links to routes>
├── Dashboard (pages/Dashboard.jsx)
│   ├── BlogPanel
│   ├── DailyBrief
│   ├── IdeasHistoryPanel
│   ├── PhilosophyPanel
│   └── SiteCard × N
├── SiteDetail (pages/SiteDetail.jsx)
│   ├── ArticlesPanel → ArticleRow
│   ├── ContentHealthPanel ← /api/sites/:id/content-health
│   ├── ValuationPanel
│   ├── AIPanel
│   └── LogPanel
├── ImportsPage (pages/ImportsPage.jsx)
│   └── ActionsPanel ← /api/actions
├── Agents (pages/Agents.jsx)
└── Settings (pages/Settings.jsx)

Backend:
server/index.js
├── routes/* → mounted на /api
├── services/
│   ├── wordpress.js        — WP REST client
│   ├── claude.js           — LLM provider routing (Anthropic + OpenRouter)
│   ├── article-search.js   — FTS5 wrapper
│   ├── article-import/     — Readability + images + tag inference
│   ├── article-actions/    — translate/rewrite/structural/facts
│   ├── content-quality/    — seo + link-health + schema checkers
│   ├── code-review/        — diff-analyzer + api-doc-gen + arch-snapshot
│   ├── agents/             — cron agents (site-valuation, daily-brief, etc)
│   ├── dailyBrief.js       — 4-card brief builder
│   └── revisions.js        — article history
└── cron.js → registers schedules
```

<!-- AUTO:counts end -->

## Manual sections

(добавь описание нестандартных решений здесь — nightly cron не тронет)
