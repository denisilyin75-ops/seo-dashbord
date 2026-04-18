import { Router } from 'express';
import { db } from '../db.js';
import { analyzePost, analyzeBatch, listHealth, summarizeHealth, latestScore, resolveIssue } from '../services/content-quality/index.js';

const router = Router();

// POST /api/quality/analyze
// Body: { site_id, post_id?, post_url (required — абсолютный URL или pathname) }
// Возвращает { score_overall, scores, issues, stats, run_id }.
router.post('/quality/analyze', async (req, res) => {
  const b = req.body || {};
  if (!b.post_url) return res.status(400).json({ error: 'post_url required' });

  // Если URL относительный — резолвим через site.wp_api_url
  let url = b.post_url;
  let siteBaseUrl;
  if (b.site_id) {
    const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(b.site_id);
    if (site?.wp_api_url) {
      try { siteBaseUrl = new URL(site.wp_api_url).origin; } catch {}
    }
  }
  if (!url.startsWith('http')) {
    if (!siteBaseUrl) return res.status(400).json({ error: 'post_url относительный; требуется site_id с валидным wp_api_url' });
    url = siteBaseUrl + (url.startsWith('/') ? url : '/' + url);
  }

  try {
    const r = await analyzePost({
      site_id: b.site_id,
      post_id: b.post_id,
      post_url: url,
      post_type: b.post_type,
      siteBaseUrl,
      trigger: b.trigger || 'manual',
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sites/:siteId/quality/batch?limit=N
// Запускает анализ N последних published статей.
router.post('/sites/:siteId/quality/batch', async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  try {
    const r = await analyzeBatch({ site_id: req.params.siteId, limit, trigger: 'manual_batch' });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sites/:siteId/content-health
// Query: severity=red|yellow|green, category=seo_hygiene|schema|..., limit=N
// Response: { summary: {red,yellow,green}, avg_score, recent_analyzed, issues: [...] }
router.get('/sites/:siteId/content-health', (req, res) => {
  const site_id = req.params.siteId;
  const { severity, category, limit } = req.query;
  const issues = listHealth(site_id, { severity, category, limit });
  const summary = summarizeHealth(site_id);
  const scoreInfo = latestScore(site_id);
  res.json({ summary, ...scoreInfo, issues });
});

// PATCH /api/content-health/:id
// Body: { action: 'resolved' | 'ignored', reason? }
router.patch('/content-health/:id', (req, res) => {
  const b = req.body || {};
  if (!['resolved', 'ignored'].includes(b.action)) {
    return res.status(400).json({ error: 'action must be resolved | ignored' });
  }
  const updated = resolveIssue(Number(req.params.id), { action: b.action, reason: b.reason, by: 'operator' });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json(updated);
});

// GET /api/sites/:siteId/quality/scores?limit=N
// История оценок для trending-графика.
router.get('/sites/:siteId/quality/scores', (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const rows = db.prepare(`SELECT * FROM content_quality_scores WHERE site_id = ?
    ORDER BY analyzed_at DESC LIMIT ?`).all(req.params.siteId, limit);
  res.json(rows);
});

export default router;
