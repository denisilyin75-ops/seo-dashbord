import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

function hydrateArticle(row) {
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    wpPostId: row.wp_post_id,
    title: row.title,
    url: row.url,
    type: row.type,
    status: row.status,
    sessions: row.sessions,
    clicks: row.clicks,
    cr: row.cr,
    notes: row.notes,
    wpLastSync: row.wp_last_sync,
    updated: row.updated_at,
  };
}

// GET /api/sites/:siteId/articles
router.get('/sites/:siteId/articles', (req, res) => {
  const rows = db.prepare('SELECT * FROM articles WHERE site_id = ? ORDER BY updated_at DESC').all(req.params.siteId);
  res.json(rows.map(hydrateArticle));
});

// POST /api/sites/:siteId/articles
router.post('/sites/:siteId/articles', (req, res) => {
  const b = req.body || {};
  const id = b.id || `art_${randomUUID().slice(0, 8)}`;
  db.prepare(`INSERT INTO articles
    (id, site_id, title, url, type, status, sessions, clicks, cr, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
    id, req.params.siteId,
    b.title || 'Без названия',
    b.url || '/',
    b.type || 'review',
    b.status || 'planned',
    b.sessions || 0,
    b.clicks || 0,
    b.cr || 0,
    b.notes || '',
  );
  res.status(201).json(hydrateArticle(db.prepare('SELECT * FROM articles WHERE id = ?').get(id)));
});

// PUT /api/articles/:id
router.put('/articles/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found' });
  db.prepare(`UPDATE articles SET
    title = ?, url = ?, type = ?, status = ?,
    sessions = ?, clicks = ?, cr = ?, notes = ?,
    updated_at = datetime('now')
    WHERE id = ?`).run(
    b.title ?? existing.title,
    b.url ?? existing.url,
    b.type ?? existing.type,
    b.status ?? existing.status,
    b.sessions ?? existing.sessions,
    b.clicks ?? existing.clicks,
    b.cr ?? existing.cr,
    b.notes ?? existing.notes,
    req.params.id,
  );
  res.json(hydrateArticle(db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id)));
});

// DELETE /api/articles/:id
router.delete('/articles/:id', (req, res) => {
  const r = db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Article not found' });
  res.json({ ok: true });
});

// POST /api/articles/:id/sync-wp — stub, Фаза 3
router.post('/articles/:id/sync-wp', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet', phase: 3 });
});

// POST /api/sites/:siteId/articles/sync-all — stub, Фаза 3
router.post('/sites/:siteId/articles/sync-all', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet', phase: 3 });
});

export default router;
