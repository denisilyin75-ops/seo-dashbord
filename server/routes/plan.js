import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { generateContentBrief } from '../services/claude.js';

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

// POST /api/plan/:id/generate-brief
// Генерит AI-бриф для плана, сохраняет в ai_brief, логирует в ai_log
router.post('/plan/:id/generate-brief', async (req, res) => {
  const planRow = db.prepare('SELECT * FROM content_plan WHERE id = ?').get(req.params.id);
  if (!planRow) return res.status(404).json({ error: 'Plan item not found' });

  const siteRow = db.prepare('SELECT * FROM sites WHERE id = ?').get(planRow.site_id);
  if (!siteRow) return res.status(404).json({ error: 'Site not found' });

  // Для контекста — существующие статьи сайта (для внутренних ссылок)
  const existingArticles = db.prepare(
    `SELECT title, type, url FROM articles
     WHERE site_id = ? AND status IN ('published','draft')
     ORDER BY updated_at DESC LIMIT 20`
  ).all(planRow.site_id);

  const planItem = {
    title: planRow.title,
    type: planRow.type,
    priority: planRow.priority,
    deadline: planRow.deadline,
  };

  const site = {
    id: siteRow.id,
    name: siteRow.name,
    niche: siteRow.niche,
    market: siteRow.market,
  };

  try {
    const { brief, tokensUsed, model, provider, stub } = await generateContentBrief({
      planItem, site, existingArticles,
    });

    // Сохраняем бриф в content_plan
    db.prepare('UPDATE content_plan SET ai_brief = ? WHERE id = ?').run(brief, req.params.id);

    // Логируем в ai_log для аудита (+ мониторинг расхода токенов)
    db.prepare(`INSERT INTO ai_log (site_id, article_id, command, result, model, tokens_used)
                VALUES (?, ?, ?, ?, ?, ?)`).run(
      siteRow.id, null,
      `generate-brief:${planItem.type}:${planItem.title.slice(0, 80)}`,
      brief.slice(0, 4000),
      model, tokensUsed,
    );

    res.json({
      ok: true,
      planId: req.params.id,
      brief,
      tokensUsed,
      model,
      provider,
      stub: !!stub,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
