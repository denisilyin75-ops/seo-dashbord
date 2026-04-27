// Health endpoints — aggregate метрики для Dashboard-widget'ов.
// Phase 1: exit-readiness score (последний monthly snapshot) + portfolio quality avg.

import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/health/exit-readiness — latest scorecard + 3 prev months для trend
router.get('/health/exit-readiness', (req, res) => {
  try {
    const latest = db.prepare(`SELECT * FROM exit_readiness_scorecards ORDER BY month DESC LIMIT 1`).get();
    const history = db.prepare(`SELECT month, overall_score FROM exit_readiness_scorecards ORDER BY month DESC LIMIT 6`).all();
    let metrics = null;
    let delta = null;
    if (latest) {
      try { metrics = JSON.parse(latest.scores_json || '{}'); } catch {}
      if (history.length >= 2) delta = latest.overall_score - history[1].overall_score;
    }
    res.json({
      latest: latest ? { month: latest.month, overall: latest.overall_score, delta, metrics } : null,
      history,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/health/portfolio-quality — avg content quality score across sites (last 30d)
router.get('/health/portfolio-quality', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT site_id,
             AVG(score_overall) AS avg_overall,
             AVG(score_seo_hygiene) AS avg_seo,
             AVG(score_link_health) AS avg_link,
             AVG(score_schema) AS avg_schema,
             AVG(score_readability) AS avg_readability,
             AVG(score_eeat) AS avg_eeat,
             AVG(score_voice) AS avg_voice,
             COUNT(*) AS analyzed_count
      FROM content_quality_scores
      WHERE analyzed_at > datetime('now', '-30 days')
      GROUP BY site_id
    `).all();

    const openIssues = db.prepare(`
      SELECT site_id, severity, COUNT(*) AS n
      FROM content_health
      WHERE resolved_at IS NULL AND ignored = 0
      GROUP BY site_id, severity
    `).all();

    // Hydrate with site names
    const siteNames = new Map();
    for (const s of db.prepare('SELECT id, name FROM sites').all()) siteNames.set(s.id, s.name);

    const bySite = {};
    for (const r of rows) {
      bySite[r.site_id] = {
        site_id: r.site_id,
        name: siteNames.get(r.site_id) || r.site_id,
        avg_overall: r.avg_overall != null ? Math.round(r.avg_overall) : null,
        avg_seo: r.avg_seo != null ? Math.round(r.avg_seo) : null,
        avg_link: r.avg_link != null ? Math.round(r.avg_link) : null,
        avg_schema: r.avg_schema != null ? Math.round(r.avg_schema) : null,
        avg_readability: r.avg_readability != null ? Math.round(r.avg_readability) : null,
        avg_eeat: r.avg_eeat != null ? Math.round(r.avg_eeat) : null,
        avg_voice: r.avg_voice != null ? Math.round(r.avg_voice) : null,
        analyzed_count: r.analyzed_count,
        red: 0,
        yellow: 0,
      };
    }
    for (const iss of openIssues) {
      if (!bySite[iss.site_id]) {
        bySite[iss.site_id] = {
          site_id: iss.site_id,
          name: siteNames.get(iss.site_id) || iss.site_id,
          avg_overall: null,
          analyzed_count: 0,
          red: 0, yellow: 0,
        };
      }
      if (iss.severity === 'red') bySite[iss.site_id].red = iss.n;
      else if (iss.severity === 'yellow') bySite[iss.site_id].yellow = iss.n;
    }

    const sites = Object.values(bySite);
    const portfolio_avg = sites.filter(s => s.avg_overall != null).reduce((a, s, _, arr) => a + s.avg_overall / arr.length, 0);
    const total_red = sites.reduce((a, s) => a + s.red, 0);
    const total_yellow = sites.reduce((a, s) => a + s.yellow, 0);

    res.json({
      portfolio_avg: portfolio_avg > 0 ? Math.round(portfolio_avg) : null,
      total_red,
      total_yellow,
      sites,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/feed?limit=50
// Объединённая лента всех agent runs / code-review runs / quality runs.
// Пригодно для мониторинг-дашборда и exit-buyer'а (видит что agents реально работают).
router.get('/activity/feed', (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  try {
    // 3 source таблицы, унифицированная shape { source, id, label, status, started_at, finished_at, summary }
    const agentRuns = db.prepare(`SELECT
        'agent' AS source, id, agent_id AS label, status, started_at, finished_at,
        substr(summary, 1, 120) AS summary, tokens_used, cost_usd
      FROM agent_runs ORDER BY started_at DESC LIMIT ?`).all(limit);

    const codeReviewRuns = db.prepare(`SELECT
        'code_review' AS source, id, trigger AS label, status, started_at, finished_at,
        commit_sha AS summary, llm_tokens_out AS tokens_used, llm_cost_usd AS cost_usd
      FROM code_review_runs ORDER BY started_at DESC LIMIT ?`).all(limit);

    const qualityRuns = db.prepare(`SELECT
        'quality' AS source, id, trigger AS label, status, started_at, finished_at,
        stats_json AS summary, NULL AS tokens_used, NULL AS cost_usd
      FROM quality_runs ORDER BY started_at DESC LIMIT ?`).all(limit);

    const all = [...agentRuns, ...codeReviewRuns, ...qualityRuns]
      .sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''))
      .slice(0, limit);

    // Parse quality summary JSON в читаемый формат
    for (const r of all) {
      if (r.source === 'quality' && r.summary) {
        try {
          const s = JSON.parse(r.summary);
          r.summary = `checked=${s.posts_checked ?? '?'} · issues=${s.issues_found ?? '?'} · red=${s.red_count ?? 0}`;
        } catch {}
      }
      if (r.source === 'code_review' && r.summary) {
        r.summary = `commit ${r.summary.slice(0, 7)}`;
      }
    }

    // Aggregate counters (last 24h)
    const agg24h = {
      agent: db.prepare(`SELECT status, COUNT(*) AS n FROM agent_runs WHERE started_at > datetime('now', '-24 hours') GROUP BY status`).all(),
      code_review: db.prepare(`SELECT status, COUNT(*) AS n FROM code_review_runs WHERE started_at > datetime('now', '-24 hours') GROUP BY status`).all(),
      quality: db.prepare(`SELECT status, COUNT(*) AS n FROM quality_runs WHERE started_at > datetime('now', '-24 hours') GROUP BY status`).all(),
    };

    res.json({ items: all, agg_24h: agg24h });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/llm-costs?days=30&groupBy=source|model|operation|provider|day
// Aggregate statistics по LLM-запросам: calls / tokens / cost / avg latency / errors.
router.get('/activity/llm-costs', async (req, res) => {
  const { days = 30, groupBy = 'source' } = req.query;
  try {
    const { aggregateLlmCost, totalsLlm } = await import('../services/llm-tracker.js');
    const totals = totalsLlm({ days: Number(days) });
    const groups = aggregateLlmCost({ days: Number(days), groupBy });
    res.json({ days: Number(days), groupBy, totals, groups });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/llm-calls?limit=100&source=&model=
// Recent raw calls — для drill-down / debug.
router.get('/activity/llm-calls', async (req, res) => {
  try {
    const { recentLlmCalls } = await import('../services/llm-tracker.js');
    const items = recentLlmCalls({
      limit: req.query.limit,
      source: req.query.source,
      model: req.query.model,
    });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/llm-call/:id — single call drill-down (полный prompt + response)
router.get('/activity/llm-call/:id', async (req, res) => {
  try {
    const { getLlmCall } = await import('../services/llm-tracker.js');
    const row = getLlmCall(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/llm-timeline?days=30 — daily spend series + reconciliation summary
router.get('/activity/llm-timeline', async (req, res) => {
  try {
    const { spendTimeline } = await import('../services/llm-tracker.js');
    const r = spendTimeline({ days: Number(req.query.days) || 30 });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/activity/llm-estimate — preview перед action
// Body: { operation, model, inputTokensEstimate?, expectedOutputRatio? }
router.post('/activity/llm-estimate', async (req, res) => {
  try {
    const { estimateCost } = await import('../services/llm-tracker.js');
    const b = req.body || {};
    res.json(estimateCost(b));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/activity/llm-reconcile — manual trigger reconciliation (для UI button)
router.post('/activity/llm-reconcile', async (req, res) => {
  try {
    const { reconcileRecent } = await import('../services/llm-reconciliation.js');
    const r = await reconcileRecent({ limit: Number(req.body?.limit) || 50 });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/health/sites — per-site availability dashboard
router.get('/health/sites', async (req, res) => {
  try {
    const { getSitesHealth } = await import('../services/site-health-monitor.js');
    res.json({ sites: getSitesHealth() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/health/sites/:id/history?hours=24
router.get('/health/sites/:id/history', async (req, res) => {
  try {
    const { getSiteHistory } = await import('../services/site-health-monitor.js');
    const items = getSiteHistory(req.params.id, { hours: Number(req.query.hours) || 24 });
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/health/sites/check-now — manual trigger для всех сайтов
router.post('/health/sites/check-now', async (req, res) => {
  try {
    const { checkAllSites } = await import('../services/site-health-monitor.js');
    const results = await checkAllSites();
    res.json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/llm-waste?days=30 — waste analysis findings
router.get('/activity/llm-waste', async (req, res) => {
  try {
    const { runWasteAnalysis } = await import('../services/llm-waste-detector.js');
    const r = runWasteAnalysis({ days: Number(req.query.days) || 30 });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/activity/agents-status — список всех agents + их статус на короткий взгляд
router.get('/activity/agents-status', (req, res) => {
  try {
    const agents = db.prepare(`SELECT
        a.id, a.name, a.kind, a.schedule, a.enabled,
        a.last_run_at, a.last_run_status,
        (SELECT COUNT(*) FROM agent_runs WHERE agent_id = a.id AND status = 'success' AND started_at > datetime('now', '-7 days')) AS successes_7d,
        (SELECT COUNT(*) FROM agent_runs WHERE agent_id = a.id AND status = 'error' AND started_at > datetime('now', '-7 days')) AS errors_7d,
        (SELECT SUM(tokens_used) FROM agent_runs WHERE agent_id = a.id AND started_at > datetime('now', '-30 days')) AS tokens_30d,
        (SELECT SUM(cost_usd) FROM agent_runs WHERE agent_id = a.id AND started_at > datetime('now', '-30 days')) AS cost_30d
      FROM agents a ORDER BY a.id`).all();
    res.json({ agents });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
