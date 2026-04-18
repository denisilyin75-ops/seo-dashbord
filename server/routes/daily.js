import { Router } from 'express';
import { db } from '../db.js';
import { getOrGenerateBrief } from '../services/dailyBrief.js';

const router = Router();

/**
 * GET /api/daily-brief?siteId=...&refresh=1
 * Возвращает brief для одного сайта. Без siteId — массив для всех active сайтов.
 */
router.get('/', async (req, res) => {
  const { siteId, refresh } = req.query;
  const wantRefresh = refresh === '1' || refresh === 'true';

  try {
    if (siteId) {
      const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(siteId);
      if (!site) return res.status(404).json({ error: 'Site not found' });
      const brief = await getOrGenerateBrief(site, { refresh: wantRefresh });
      return res.json(brief);
    }

    // Портфельный режим: все активные + setup сайты
    const sites = db.prepare("SELECT * FROM sites WHERE status IN ('active','setup') ORDER BY created_at ASC").all();
    const briefs = await Promise.all(sites.map((s) => getOrGenerateBrief(s, { refresh: wantRefresh })));
    res.json({ sites: briefs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/daily-brief/ideas-history?siteId=...&limit=30
 * Возвращает историю карточек "Идея дня" — для аккумулированной ленты идей,
 * чтобы оператор видел что уже предлагалось и не дублировал.
 * Если siteId не задан — по всему портфелю (смешанные по сайтам).
 */
router.get('/ideas-history', (req, res) => {
  const { siteId } = req.query;
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 30));
  try {
    const sql = siteId
      ? `SELECT site_id, date, cards_json, created_at FROM daily_briefs WHERE site_id = ? ORDER BY date DESC, created_at DESC LIMIT ?`
      : `SELECT site_id, date, cards_json, created_at FROM daily_briefs ORDER BY date DESC, created_at DESC LIMIT ?`;
    const rows = siteId
      ? db.prepare(sql).all(siteId, limit)
      : db.prepare(sql).all(limit);

    // Hydrate + кэшируем имена сайтов
    const siteNames = new Map();
    const siteRows = db.prepare('SELECT id, name FROM sites').all();
    for (const s of siteRows) siteNames.set(s.id, s.name);

    const ideas = [];
    for (const row of rows) {
      let cards;
      try { cards = JSON.parse(row.cards_json); } catch { continue; }
      if (!cards?.idea) continue;
      ideas.push({
        siteId: row.site_id,
        siteName: siteNames.get(row.site_id) || row.site_id,
        date: row.date,
        createdAt: row.created_at,
        idea: {
          title: cards.idea.title,
          summary: cards.idea.summary,
          impact: cards.idea.impact,
          status: cards.idea.status,
          details: cards.idea.details,
        },
      });
    }

    res.json({ ideas, total: ideas.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
