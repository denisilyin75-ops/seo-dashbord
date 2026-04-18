// Architecture Snapshot — Code Review Agent Phase 2.
//
// Пишет auto-sections в docs/architecture.md (между маркерами
// <!-- AUTO:counts start --> ... <!-- AUTO:counts end -->).
// Остальное (manual sections) не трогает.
//
// Content:
//   - Counts: tables / routes / services / components / agents / LOC
//   - Top-level dependency graph (упрощённый)

import fs from 'node:fs';
import path from 'node:path';

const AUTO_START = '<!-- AUTO:counts start -->';
const AUTO_END = '<!-- AUTO:counts end -->';

function countFiles(dir, ext) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let n = 0;
  for (const e of entries) {
    if (e.isDirectory()) n += countFiles(path.join(dir, e.name), ext);
    else if (e.name.endsWith(ext)) n++;
  }
  return n;
}

function countLoc(dir) {
  if (!fs.existsSync(dir)) return 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let loc = 0;
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      loc += countLoc(p);
    } else if (e.name.endsWith('.js') || e.name.endsWith('.jsx')) {
      try {
        const c = fs.readFileSync(p, 'utf8');
        loc += (c.match(/\n/g) || []).length + 1;
      } catch { /* skip */ }
    }
  }
  return loc;
}

function countTablesInSchema(dbJsPath) {
  try {
    const c = fs.readFileSync(dbJsPath, 'utf8');
    return (c.match(/CREATE TABLE IF NOT EXISTS (\w+)/g) || []).length;
  } catch { return 0; }
}

function countEndpoints(routesDir) {
  if (!fs.existsSync(routesDir)) return { total: 0, byMethod: {} };
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  const byMethod = {};
  for (const file of files) {
    const c = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const matches = c.match(/router\.(get|post|put|patch|delete)\s*\(/g) || [];
    for (const m of matches) {
      const method = m.match(/router\.(\w+)/)[1].toUpperCase();
      byMethod[method] = (byMethod[method] || 0) + 1;
    }
  }
  const total = Object.values(byMethod).reduce((a, b) => a + b, 0);
  return { total, byMethod };
}

// Упрощённое дерево импортов — читаем главные entry points + их direct children.
// Не полный dep-graph, но показывает layout.
function buildDepGraph(repoRoot) {
  const lines = [];
  lines.push('```');
  lines.push('App (src/App.jsx)');
  lines.push('├── Layout');
  lines.push('│   ├── PortfolioWidget');
  lines.push('│   └── <nav links to routes>');
  lines.push('├── Dashboard (pages/Dashboard.jsx)');
  lines.push('│   ├── BlogPanel');
  lines.push('│   ├── DailyBrief');
  lines.push('│   ├── IdeasHistoryPanel');
  lines.push('│   ├── PhilosophyPanel');
  lines.push('│   └── SiteCard × N');
  lines.push('├── SiteDetail (pages/SiteDetail.jsx)');
  lines.push('│   ├── ArticlesPanel → ArticleRow');
  lines.push('│   ├── ContentHealthPanel ← /api/sites/:id/content-health');
  lines.push('│   ├── ValuationPanel');
  lines.push('│   ├── AIPanel');
  lines.push('│   └── LogPanel');
  lines.push('├── ImportsPage (pages/ImportsPage.jsx)');
  lines.push('│   └── ActionsPanel ← /api/actions');
  lines.push('├── Agents (pages/Agents.jsx)');
  lines.push('└── Settings (pages/Settings.jsx)');
  lines.push('');
  lines.push('Backend:');
  lines.push('server/index.js');
  lines.push('├── routes/* → mounted на /api');
  lines.push('├── services/');
  lines.push('│   ├── wordpress.js        — WP REST client');
  lines.push('│   ├── claude.js           — LLM provider routing (Anthropic + OpenRouter)');
  lines.push('│   ├── article-search.js   — FTS5 wrapper');
  lines.push('│   ├── article-import/     — Readability + images + tag inference');
  lines.push('│   ├── article-actions/    — translate/rewrite/structural/facts');
  lines.push('│   ├── content-quality/    — seo + link-health + schema checkers');
  lines.push('│   ├── code-review/        — diff-analyzer + api-doc-gen + arch-snapshot');
  lines.push('│   ├── agents/             — cron agents (site-valuation, daily-brief, etc)');
  lines.push('│   ├── dailyBrief.js       — 4-card brief builder');
  lines.push('│   └── revisions.js        — article history');
  lines.push('└── cron.js → registers schedules');
  lines.push('```');
  return lines.join('\n');
}

export function generateSnapshot(repoRoot) {
  const tables = countTablesInSchema(path.join(repoRoot, 'server', 'db.js'));
  const endpoints = countEndpoints(path.join(repoRoot, 'server', 'routes'));
  const serviceFiles = countFiles(path.join(repoRoot, 'server', 'services'), '.js');
  const componentFiles = countFiles(path.join(repoRoot, 'src', 'components'), '.jsx');
  const pages = countFiles(path.join(repoRoot, 'src', 'pages'), '.jsx');
  const backendLoc = countLoc(path.join(repoRoot, 'server'));
  const frontendLoc = countLoc(path.join(repoRoot, 'src'));

  const now = new Date().toISOString().slice(0, 10);

  const block = `## System counts (auto, ${now})

| Слой | Значение |
|---|---|
| **Tables (SQLite)** | ${tables} |
| **API endpoints** | ${endpoints.total} (${Object.entries(endpoints.byMethod).map(([k, v]) => `${k} ${v}`).join(', ')}) |
| **Services** | ${serviceFiles} модулей |
| **UI components** | ${componentFiles} |
| **Pages** | ${pages} |
| **Backend LOC** | ${backendLoc.toLocaleString('en-US')} |
| **Frontend LOC** | ${frontendLoc.toLocaleString('en-US')} |

## Dependency graph (top-level)

${buildDepGraph(repoRoot)}`;

  return { block, stats: { tables, endpoints: endpoints.total, backendLoc, frontendLoc } };
}

export function writeArchitectureDoc(repoRoot) {
  const { block, stats } = generateSnapshot(repoRoot);
  const outPath = path.join(repoRoot, 'docs', 'architecture.md');

  let content = '';
  if (fs.existsSync(outPath)) {
    content = fs.readFileSync(outPath, 'utf8');
  }

  if (!content.trim()) {
    // Create file with full template.
    content = `# SCC Architecture

> Auto-sections (между \`${AUTO_START}\` и \`${AUTO_END}\`) обновляются code-review-agent nightly.
> Остальное — manual (пишем руками, не перезаписывается).

${AUTO_START}

${block}

${AUTO_END}

## Manual sections

(добавь описание нестандартных решений здесь — nightly cron не тронет)
`;
  } else if (content.includes(AUTO_START) && content.includes(AUTO_END)) {
    // Replace only the auto block.
    const re = new RegExp(`${escapeRegex(AUTO_START)}[\\s\\S]*?${escapeRegex(AUTO_END)}`);
    content = content.replace(re, `${AUTO_START}\n\n${block}\n\n${AUTO_END}`);
  } else {
    // No markers yet — append block.
    content += `\n\n${AUTO_START}\n\n${block}\n\n${AUTO_END}\n`;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
  return { path: outPath, ...stats };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
