import { Router } from 'express';
import { importUrl, listImported, getImported, archiveImported } from '../services/article-import/index.js';
import {
  listUnseenChanges,
  markChangeSeen,
  processDueRefetches,
  refetchOne,
} from '../services/article-import/refetch-monitor.js';
import { db } from '../db.js';

const router = Router();

// POST /api/imported
// Body: { url, purpose?, user_tags?, refetch_interval_days? }
router.post('/imported', async (req, res) => {
  const b = req.body || {};
  if (!b.url) return res.status(400).json({ error: 'url required' });

  try {
    const r = await importUrl({
      url: b.url,
      purpose: b.purpose || 'research',
      user_tags: Array.isArray(b.user_tags) ? b.user_tags : [],
      refetch_interval_days: b.refetch_interval_days ? Number(b.refetch_interval_days) : null,
      imported_by: 'operator', // когда будет multi-user auth — брать из req.user
    });
    res.status(201).json(r);
  } catch (e) {
    res.status(e.message === 'url required' || e.message === 'invalid url' ? 400 : 500)
       .json({ error: e.message });
  }
});

// GET /api/imported?q=&purpose=&domain=&status=&limit=&offset=
router.get('/imported', (req, res) => {
  const q = req.query;
  const r = listImported({
    q: q.q,
    purpose: q.purpose,
    domain: q.domain,
    status: q.status,
    limit: q.limit,
    offset: q.offset,
  });
  res.json(r);
});

// GET /api/imported/:id
router.get('/imported/:id', (req, res) => {
  const r = getImported(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});

// DELETE /api/imported/:id — soft archive
router.delete('/imported/:id', (req, res) => {
  archiveImported(req.params.id);
  res.json({ ok: true, archived: req.params.id });
});

// GET /api/imported/changes/unseen?limit=20 — лента непросмотренных изменений
router.get('/imported/changes/unseen', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const items = listUnseenChanges({ limit });
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM imported_article_changes WHERE seen_at IS NULL`).get();
  res.json({ items, total_unseen: n });
});

// POST /api/imported/changes/:id/seen
router.post('/imported/changes/:id/seen', (req, res) => {
  markChangeSeen(Number(req.params.id));
  res.json({ ok: true });
});

// POST /api/imported/refetch/run — manual trigger (кнопка "запустить сейчас")
router.post('/imported/refetch/run', async (req, res) => {
  try {
    const limit = Math.min(Number(req.body?.limit) || 50, 200);
    const r = await processDueRefetches({ limit });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/imported/:id/refetch — re-fetch ровно одной статьи (для теста / "обнови сейчас")
router.post('/imported/:id/refetch', async (req, res) => {
  const article = db.prepare(`SELECT * FROM imported_articles WHERE id = ?`).get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Not found' });
  try {
    const r = await refetchOne(article);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
