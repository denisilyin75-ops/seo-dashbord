import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { generateContentBrief } from '../services/claude.js';
import { logRevision, REVISION_KINDS } from '../services/revisions.js';

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
    phase: row.phase,
    rubric: row.rubric,
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
    (id, site_id, title, type, priority, deadline, status, phase, rubric)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, req.params.siteId,
    b.title || 'Без названия',
    b.type || 'review',
    b.priority || 'medium',
    b.deadline || null,
    b.status || 'idea',
    b.phase ?? null,
    b.rubric ?? null,
  );
  res.status(201).json(hydrate(db.prepare('SELECT * FROM content_plan WHERE id = ?').get(id)));
});

// PUT /api/plan/:id
router.put('/plan/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM content_plan WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plan item not found' });
  db.prepare(`UPDATE content_plan SET
    title = ?, type = ?, priority = ?, deadline = ?, status = ?,
    phase = ?, rubric = ?, article_id = ?, ai_brief = ?
    WHERE id = ?`).run(
    b.title ?? existing.title,
    b.type ?? existing.type,
    b.priority ?? existing.priority,
    b.deadline ?? existing.deadline,
    b.status ?? existing.status,
    b.phase ?? existing.phase,
    b.rubric ?? existing.rubric,
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

    // revision-логирование (brief на уровне плана — article_id пока null)
    logRevision(null, siteRow.id, REVISION_KINDS.AI_BRIEF,
      `AI-бриф для плана "${planItem.title.slice(0, 80)}" (${tokensUsed} токенов)`,
      { planId: req.params.id, tokensUsed, model });

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

// GET /api/sites/:siteId/progress
// Сводка по рубрикам и фазам: сколько в плане, сколько опубликовано, drafts, ideas
router.get('/sites/:siteId/progress', (req, res) => {
  const siteId = req.params.siteId;

  // Все пункты плана + join с articles для определения опубликованных
  const rows = db.prepare(`
    SELECT p.rubric, p.phase, p.status, p.article_id, a.status AS article_status
    FROM content_plan p
    LEFT JOIN articles a ON p.article_id = a.id
    WHERE p.site_id = ?
  `).all(siteId);

  // Дополнительно — все опубликованные articles без plan-item (которые импортнулись из WP)
  // группируем по категории/типу — пока без rubric, просто для общих метрик
  const orphanArts = db.prepare(`
    SELECT status, COUNT(*) as n FROM articles
    WHERE site_id = ? AND id NOT IN (SELECT COALESCE(article_id,'') FROM content_plan WHERE site_id = ?)
    GROUP BY status
  `).all(siteId, siteId);

  // Группируем plan по rubric → phase
  const byRubric = new Map();
  for (const r of rows) {
    const rubric = r.rubric || '(без рубрики)';
    const phase = r.phase || 0; // 0 = без фазы
    if (!byRubric.has(rubric)) byRubric.set(rubric, new Map());
    const phases = byRubric.get(rubric);
    if (!phases.has(phase)) phases.set(phase, { total: 0, published: 0, drafts: 0, inProgress: 0, queued: 0, ideas: 0 });
    const bucket = phases.get(phase);
    bucket.total++;
    // "Опубликовано" = есть связанная статья со статусом published
    if (r.article_status === 'published') bucket.published++;
    else if (r.article_status === 'draft') bucket.drafts++;
    else if (r.status === 'in_progress') bucket.inProgress++;
    else if (r.status === 'queued') bucket.queued++;
    else bucket.ideas++;
  }

  // В JSON
  const rubrics = [];
  for (const [rubric, phases] of byRubric) {
    const phasesArr = [];
    for (const [phase, bucket] of phases) phasesArr.push({ phase, ...bucket });
    phasesArr.sort((a, b) => a.phase - b.phase);
    const total = phasesArr.reduce((s, p) => s + p.total, 0);
    const published = phasesArr.reduce((s, p) => s + p.published, 0);
    rubrics.push({ rubric, total, published, phases: phasesArr });
  }
  rubrics.sort((a, b) => b.total - a.total);

  // Orphan articles summary
  const orphan = orphanArts.reduce((o, r) => { o[r.status] = r.n; return o; }, {});

  res.json({
    siteId,
    rubrics,
    orphan: {
      total: (orphan.published || 0) + (orphan.draft || 0) + (orphan.planned || 0),
      published: orphan.published || 0,
      draft: orphan.draft || 0,
      planned: orphan.planned || 0,
    },
  });
});

export default router;
