import { Router } from 'express';
import { planMerge, getMergePreview, listMergePreviews, approveMerge, rejectMerge } from '../services/merge/index.js';

const router = Router();

// POST /api/merge/preview
// Body: { site_id?, article_ids: [...], params?: { keep_title_from?, model? } }
router.post('/merge/preview', async (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.article_ids) || b.article_ids.length < 2) {
    return res.status(400).json({ error: 'article_ids: минимум 2' });
  }
  try {
    const preview = await planMerge({
      site_id: b.site_id,
      article_ids: b.article_ids,
      params: b.params || {},
      created_by: 'operator',
    });
    res.status(201).json(preview);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/merge/preview/:id
router.get('/merge/preview/:id', (req, res) => {
  const p = getMergePreview(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// GET /api/merge/previews?site_id=&status=
router.get('/merge/previews', (req, res) => {
  const r = listMergePreviews({
    site_id: req.query.site_id,
    status: req.query.status,
    limit: req.query.limit,
  });
  res.json({ items: r });
});

// POST /api/merge/preview/:id/approve
// Body: { adjustments?: { title?, url_slug?, content? } }
router.post('/merge/preview/:id/approve', (req, res) => {
  try {
    const r = approveMerge(req.params.id, { adjustments: req.body?.adjustments || {}, by: 'operator' });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/merge/preview/:id/reject
router.post('/merge/preview/:id/reject', (req, res) => {
  try {
    const r = rejectMerge(req.params.id, { reason: req.body?.reason, by: 'operator' });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
