import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

function hydrate(row) {
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    title: row.title,
    type: row.type,
    priority: row.priority,
    deadline: row.deadline,
    status: row.status,
    articleId: row.article_id,
    aiBrief: row.ai_brief,
  };
}

// GET /api/sites/:siteId/plan
router.get('/sites/:siteId/plan', (req, res) => {
  const rows = db.prepare('SELECT * FROM content_plan WHERE site_id = ? ORDER BY deadline ASC').all(req.params.siteId);
  res.json(rows.map(hydrate));
});

// POST /api/sites/:siteId/plan
router.post('/sites/:siteId/plan', (req, res) => {
  const b = req.body || {};
  const id = b.id || `plan_${randomUUID().slice(0, 8)}`;
  db.prepare(`INSERT INTO content_plan
    (id, site_id, title, type, priority, deadline, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.params.siteId,
    b.title || 'Без названия',
    b.type || 'review',
    b.priority || 'medium',
    b.deadline || null,
    b.status || 'idea',
  );
  res.status(201).json(hydrate(db.prepare('SELECT * FROM content_plan WHERE id = ?').get(id)));
});

// PUT /api/plan/:id
router.put('/plan/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM content_plan WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plan item not found' });
  db.prepare(`UPDATE content_plan SET
    title = ?, type = ?, priority = ?, deadline = ?, status = ?, article_id = ?, ai_brief = ?
    WHERE id = ?`).run(
    b.title ?? existing.title,
    b.type ?? existing.type,
    b.priority ?? existing.priority,
    b.deadline ?? existing.deadline,
    b.status ?? existing.status,
    b.articleId ?? existing.article_id,
    b.aiBrief ?? existing.ai_brief,
    req.params.id,
  );
  res.json(hydrate(db.prepare('SELECT * FROM content_plan WHERE id = ?').get(req.params.id)));
});

// DELETE /api/plan/:id
router.delete('/plan/:id', (req, res) => {
  const r = db.prepare('DELETE FROM content_plan WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Plan item not found' });
  res.json({ ok: true });
});

// POST /api/plan/:id/generate-brief — stub, Фаза 2
router.post('/plan/:id/generate-brief', (req, res) => {
  res.status(501).json({ error: 'Not implemented yet', phase: 2 });
});

export default router;
