import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// GET /api/log?siteId=...&limit=50&offset=0
router.get('/', (req, res) => {
  const { siteId, limit = 100, offset = 0 } = req.query;
  let sql = 'SELECT * FROM ai_log';
  const params = [];
  if (siteId) { sql += ' WHERE site_id = ?'; params.push(siteId); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r) => ({
    id: r.id,
    siteId: r.site_id,
    articleId: r.article_id,
    command: r.command,
    result: r.result,
    model: r.model,
    tokensUsed: r.tokens_used,
    ts: r.created_at,
  })));
});

export default router;
