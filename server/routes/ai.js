import { Router } from 'express';
import { db } from '../db.js';
import { executeCommand, generateSitePlan, openRouterCredits } from '../services/claude.js';

const router = Router();

// GET /api/ai/credits — остаток кредитов у провайдера (OpenRouter)
router.get('/credits', async (_req, res) => {
  try {
    const credits = await openRouterCredits();
    res.json(credits);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/command — выполнить произвольную команду
router.post('/command', async (req, res) => {
  const { command, context = {} } = req.body || {};
  if (!command?.trim()) return res.status(400).json({ error: 'command is required' });

  // Подтянуть контекст сайта/статьи из БД, если переданы id
  let site = null, article = null;
  if (context.siteId) {
    const row = db.prepare('SELECT * FROM sites WHERE id = ?').get(context.siteId);
    if (row) {
      const m = db.prepare('SELECT * FROM site_metrics WHERE site_id = ? ORDER BY date DESC LIMIT 1').get(row.id) || {};
      site = { id: row.id, name: row.name, market: row.market, niche: row.niche, metrics: m };
    }
  }
  if (context.articleId) {
    article = db.prepare('SELECT * FROM articles WHERE id = ?').get(context.articleId);
  }

  try {
    const { result, tokensUsed, model, stub } = await executeCommand(command, { site, article });
    db.prepare(`INSERT INTO ai_log (site_id, article_id, command, result, model, tokens_used)
                VALUES (?, ?, ?, ?, ?, ?)`).run(
      context.siteId || null, context.articleId || null, command, result.slice(0, 4000), model, tokensUsed,
    );
    res.json({ result, tokensUsed, model, stub: !!stub });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/ideas
router.post('/ideas', async (req, res) => {
  const { siteId } = req.body || {};
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const articles = db.prepare('SELECT title, type, status FROM articles WHERE site_id = ?').all(siteId);
  try {
    const { result, tokensUsed, model } = await executeCommand(
      `Предложи 10 идей статей для сайта "${site.name}" (ниша ${site.niche}, рынок ${site.market}). Учти уже существующие: ${articles.map((a) => a.title).join(', ')}. Форматом: тип + заголовок + краткое обоснование.`,
      { site: { ...site, metrics: {} } },
    );
    res.json({ result, tokensUsed, model });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/ai/site-plan — AI-план для deploy wizard
router.post('/site-plan', async (req, res) => {
  const { niche, market, deployType, parentSite } = req.body || {};
  if (!niche || !market) return res.status(400).json({ error: 'niche and market required' });
  const existingSites = db.prepare('SELECT name, niche FROM sites').all();
  try {
    const { plan, tokensUsed, stub } = await generateSitePlan({ niche, market, deployType, parentSite, existingSites });
    res.json({ plan, tokensUsed, stub: !!stub });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
