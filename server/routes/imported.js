import { Router } from 'express';
import { importUrl, listImported, getImported, archiveImported } from '../services/article-import/index.js';

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

export default router;
