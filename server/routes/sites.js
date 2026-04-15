import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

function hydrateSite(row) {
  if (!row) return null;
  const metrics = db
    .prepare('SELECT sessions, revenue, affiliate_clicks, sales, rpm, epc, ctr, cr FROM site_metrics WHERE site_id = ? ORDER BY date DESC LIMIT 1')
    .get(row.id) || { sessions: 0, revenue: 0, affiliate_clicks: 0, sales: 0, rpm: 0, epc: 0, ctr: 0, cr: 0 };
  return {
    id: row.id,
    name: row.name,
    market: row.market,
    niche: row.niche,
    status: row.status,
    wpAdmin: row.wp_admin_url,
    wpApi: row.wp_api_url,
    ga4: row.ga4_property_id,
    gsc: row.gsc_site_url,
    affiliate: row.affiliate_url,
    createdAt: row.created_at,
    metrics: {
      sessions: metrics.sessions,
      revenue: metrics.revenue,
      affiliateClicks: metrics.affiliate_clicks,
      sales: metrics.sales,
      rpm: metrics.rpm,
      epc: metrics.epc,
      ctr: metrics.ctr,
      cr: metrics.cr,
    },
  };
}

// GET /api/sites
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM sites ORDER BY created_at ASC').all();
  res.json(rows.map(hydrateSite));
});

// POST /api/sites
router.post('/', (req, res) => {
  const b = req.body || {};
  const id = b.id || `site_${randomUUID().slice(0, 8)}`;
  db.prepare(`INSERT INTO sites
    (id, name, market, niche, status, wp_admin_url, wp_api_url, wp_user, wp_app_password,
     ga4_property_id, gsc_site_url, affiliate_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    b.name || 'unnamed',
    b.market || 'RU',
    b.niche || null,
    b.status || 'setup',
    b.wpAdmin || null,
    b.wpApi || null,
    b.wpUser || null,
    b.wpAppPassword || null,
    b.ga4 || null,
    b.gsc || null,
    b.affiliate || null,
  );
  // seed пустые метрики на сегодня чтобы карточка не падала
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`INSERT OR IGNORE INTO site_metrics (site_id, date) VALUES (?, ?)`).run(id, today);
  res.status(201).json(hydrateSite(db.prepare('SELECT * FROM sites WHERE id = ?').get(id)));
});

// PUT /api/sites/:id
router.put('/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Site not found' });
  db.prepare(`UPDATE sites SET
    name = ?, market = ?, niche = ?, status = ?,
    wp_admin_url = ?, wp_api_url = ?, wp_user = ?, wp_app_password = ?,
    ga4_property_id = ?, gsc_site_url = ?, affiliate_url = ?,
    updated_at = datetime('now')
    WHERE id = ?`).run(
    b.name ?? existing.name,
    b.market ?? existing.market,
    b.niche ?? existing.niche,
    b.status ?? existing.status,
    b.wpAdmin ?? existing.wp_admin_url,
    b.wpApi ?? existing.wp_api_url,
    b.wpUser ?? existing.wp_user,
    b.wpAppPassword ?? existing.wp_app_password,
    b.ga4 ?? existing.ga4_property_id,
    b.gsc ?? existing.gsc_site_url,
    b.affiliate ?? existing.affiliate_url,
    req.params.id,
  );
  res.json(hydrateSite(db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.id)));
});

// DELETE /api/sites/:id
router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM sites WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Site not found' });
  res.json({ ok: true });
});

// GET /api/sites/:id/metrics?from=...&to=...
router.get('/:id/metrics', (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT * FROM site_metrics WHERE site_id = ?';
  const params = [req.params.id];
  if (from) { sql += ' AND date >= ?'; params.push(from); }
  if (to)   { sql += ' AND date <= ?'; params.push(to); }
  sql += ' ORDER BY date ASC';
  res.json(db.prepare(sql).all(...params));
});

// POST /api/sites/:id/sync-metrics — stub, Фаза 3
router.post('/:id/sync-metrics', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet', phase: 3 });
});

export default router;
