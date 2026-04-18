import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

/**
 * Блог «что сделано» — мотивационная лента в Dashboard.
 * Частый (несколько раз в день при активной работе), narrative-first.
 * Отличие от devlog.md (который структурированная milestone-сводка) — частота и живость.
 */

function hydrate(row) {
  if (!row) return null;
  let tags = [];
  try { tags = row.tags ? JSON.parse(row.tags) : []; } catch { /* keep empty */ }
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags,
    pinned: !!row.pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/blog?limit=50&offset=0&tag=gamification
router.get('/', (req, res) => {
  const limit  = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const tag    = req.query.tag?.trim();

  let rows;
  if (tag) {
    // Простой LIKE-match по tags JSON. Не индексировано — ок для нескольких сотен записей.
    rows = db.prepare(`
      SELECT * FROM blog_posts
      WHERE tags LIKE ?
      ORDER BY pinned DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(`%"${tag}"%`, limit, offset);
  } else {
    rows = db.prepare(`
      SELECT * FROM blog_posts
      ORDER BY pinned DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  const total = db.prepare('SELECT COUNT(*) AS n FROM blog_posts').get().n;
  res.json({ items: rows.map(hydrate), total });
});

// GET /api/blog/:id
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(hydrate(row));
});

// POST /api/blog  body: {title, body, tags?, pinned?}
router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.title?.trim()) return res.status(400).json({ error: 'title required' });
  const id = `blog_${new Date().toISOString().slice(0, 10)}_${randomUUID().slice(0, 6)}`;
  db.prepare(`INSERT INTO blog_posts
    (id, title, body, tags, pinned)
    VALUES (?, ?, ?, ?, ?)`).run(
    id,
    b.title.trim(),
    b.body || '',
    JSON.stringify(Array.isArray(b.tags) ? b.tags : []),
    b.pinned ? 1 : 0,
  );
  const fresh = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(id);
  res.status(201).json(hydrate(fresh));
});

// PUT /api/blog/:id
router.put('/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE blog_posts SET
    title = ?, body = ?, tags = ?, pinned = ?, updated_at = datetime('now')
    WHERE id = ?`).run(
    b.title ?? existing.title,
    b.body ?? existing.body,
    b.tags !== undefined ? JSON.stringify(Array.isArray(b.tags) ? b.tags : []) : existing.tags,
    b.pinned !== undefined ? (b.pinned ? 1 : 0) : existing.pinned,
    req.params.id,
  );
  const fresh = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(req.params.id);
  res.json(hydrate(fresh));
});

// DELETE /api/blog/:id
router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
