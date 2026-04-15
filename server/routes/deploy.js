import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

function hydrate(row) {
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    config: row.config ? JSON.parse(row.config) : null,
    aiPlan: row.ai_plan ? JSON.parse(row.ai_plan) : null,
    status: row.status,
    log: row.log ? JSON.parse(row.log) : [],
    ts: row.created_at,
  };
}

// POST /api/deploy — запустить деплой (Фаза 1: имитация шагов в памяти)
router.post('/', (req, res) => {
  const { config, aiPlan, siteId } = req.body || {};
  const id = `dep_${randomUUID().slice(0, 8)}`;
  const log = [
    { msg: '🔍 Проверка домена и DNS...', status: 'ok' },
    { msg: '🗄️ Создание базы данных MySQL...', status: 'ok' },
    { msg: '📦 Установка WordPress (WP-CLI)...', status: 'ok' },
    { msg: `🎨 Тема: ${config?.theme === 'rehub' ? 'REHub' : 'Custom'}...`, status: 'ok' },
    { msg: '🔌 Плагины: Content Egg, WP All Import, WooCommerce, Rank Math...', status: 'ok' },
    { msg: '⚙️ Пермалинки и SEO...', status: 'ok' },
    { msg: config?.ssl ? "🔒 SSL (Let's Encrypt)..." : '⏭️ SSL skip', status: 'ok' },
    { msg: config?.analytics ? '📊 GA4 + GSC...' : '⏭️ Analytics skip', status: 'ok' },
    { msg: '📝 Категории...', status: 'ok' },
    { msg: '🚀 Финализация...', status: 'ok' },
  ];
  db.prepare(`INSERT INTO deploys (id, site_id, config, ai_plan, status, log)
              VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, siteId || null, JSON.stringify(config || {}), JSON.stringify(aiPlan || null),
    'deployed', JSON.stringify(log),
  );
  res.status(201).json(hydrate(db.prepare('SELECT * FROM deploys WHERE id = ?').get(id)));
});

// GET /api/deploys
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM deploys ORDER BY created_at DESC').all();
  res.json(rows.map(hydrate));
});

// GET /api/deploys/:id/status
router.get('/:id/status', (req, res) => {
  const row = db.prepare('SELECT * FROM deploys WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Deploy not found' });
  res.json(hydrate(row));
});

export default router;
