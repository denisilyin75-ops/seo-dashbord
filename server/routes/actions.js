import { Router } from 'express';
import { runAction, listActionsForSource, getAction, ACTION_TYPES } from '../services/article-actions/index.js';

const router = Router();

// POST /api/actions
// Body: { action_type, source_type: 'imported_article'|'article', source_ids: [id], params: {...} }
// Выполняется sync (5-30 сек). В Phase 3b перейдём на background-job с polling'ом.
router.post('/actions', async (req, res) => {
  const b = req.body || {};
  if (!ACTION_TYPES.includes(b.action_type)) {
    return res.status(400).json({ error: `action_type must be one of ${ACTION_TYPES.join(', ')}` });
  }
  if (!b.source_type || !Array.isArray(b.source_ids) || !b.source_ids.length) {
    return res.status(400).json({ error: 'source_type + source_ids required' });
  }
  try {
    const r = await runAction({
      action_type: b.action_type,
      source_type: b.source_type,
      source_ids: b.source_ids,
      params: b.params || {},
      created_by: 'operator',
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/actions/:id — получить результат конкретного action
router.get('/actions/:id', (req, res) => {
  const r = getAction(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json(r);
});

// GET /api/actions?source_type=&source_id=&limit=
router.get('/actions', (req, res) => {
  const { source_type, source_id, limit } = req.query;
  if (!source_type || !source_id) return res.status(400).json({ error: 'source_type + source_id required' });
  const items = listActionsForSource(source_type, source_id, { limit });
  res.json({ items });
});

export default router;
