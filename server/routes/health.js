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

export default router;
