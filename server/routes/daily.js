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

export default router;
