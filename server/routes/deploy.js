import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';
import {
  enqueueTask, getTask, listTasks, cancelTask,
  claimNextTask, appendLog, completeTask,
} from '../services/deploy-queue.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'scripts', 'wp-provision', 'templates');

const router = Router();

// Legacy hydrate для /api/deploys (старая таблица deploys — for backward compat)
function hydrateLegacy(row) {
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

// ========== TEMPLATES ==========
// GET /api/deploy/templates — список доступных шаблонов для UI dropdown
router.get('/templates', (req, res) => {
  try {
    const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
    const templates = files.map(f => {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8');
      const parsed = JSON.parse(raw);
      return { ...parsed.meta, defaults: parsed.defaults, polish: parsed.polish };
    });
    res.json({ templates });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/deploy/template/:id
router.get('/template/:id', (req, res) => {
  const file = path.join(TEMPLATES_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Template not found' });
  try {
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== TASKS (главный API) ==========

// POST /api/deploy — enqueue provision task
// Body: { domain, site_slug, template, config: { ...preset env vars... } }
router.post('/', (req, res) => {
  const b = req.body || {};

  // Backward compat: старый UI шлёт { config, aiPlan, siteId } → treat as legacy simulation
  if (b.config && !b.domain && !b.site_slug && b.config.theme != null) {
    return legacyStubDeploy(b, res);
  }

  try {
    const task = enqueueTask({
      task_type: b.task_type || 'provision',
      domain: b.domain,
      site_slug: b.site_slug,
      template: b.template,
      config: b.config || {},
    });
    res.status(201).json(task);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

function legacyStubDeploy(b, res) {
  // Сохраняем старый поведение для UI пока не мигрирован: эмулируем шаги
  const { config, aiPlan, siteId } = b;
  const id = `dep_${randomUUID().slice(0, 8)}`;
  const log = [
    { msg: '🔍 Проверка домена и DNS...', status: 'ok' },
    { msg: '🗄️ Создание базы данных MySQL...', status: 'ok' },
    { msg: '📦 Установка WordPress (WP-CLI)...', status: 'ok' },
    { msg: `🎨 Тема: ${config?.theme === 'rehub' ? 'REHub' : 'Custom'}...`, status: 'ok' },
    { msg: '🔌 Плагины...', status: 'ok' },
    { msg: '⚙️ Пермалинки и SEO...', status: 'ok' },
    { msg: '🚀 Финализация...', status: 'ok' },
  ];
  db.prepare(`INSERT INTO deploys (id, site_id, config, ai_plan, status, log)
              VALUES (?, ?, ?, ?, ?, ?)`).run(
    id, siteId || null, JSON.stringify(config || {}), JSON.stringify(aiPlan || null),
    'deployed', JSON.stringify(log),
  );
  res.status(201).json(hydrateLegacy(db.prepare('SELECT * FROM deploys WHERE id = ?').get(id)));
}

// GET /api/deploy/tasks?status=&limit=
router.get('/tasks', (req, res) => {
  res.json({ items: listTasks({ status: req.query.status, limit: req.query.limit }) });
});

// GET /api/deploy/tasks/:id — полный task + log
router.get('/tasks/:id', (req, res) => {
  const t = getTask(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

// GET /api/deploy/tasks/:id/stream — SSE: real-time log updates
router.get('/tasks/:id/stream', (req, res) => {
  const t = getTask(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let lastLogLen = 0;
  let lastStatus = null;
  const tick = () => {
    const latest = getTask(req.params.id);
    if (!latest) return;
    if (latest.log && latest.log.length > lastLogLen) {
      const chunk = latest.log.slice(lastLogLen);
      res.write(`event: log\ndata: ${JSON.stringify({ chunk })}\n\n`);
      lastLogLen = latest.log.length;
    }
    if (latest.status !== lastStatus) {
      res.write(`event: status\ndata: ${JSON.stringify({ status: latest.status, exitCode: latest.exitCode, error: latest.error, siteId: latest.siteId })}\n\n`);
      lastStatus = latest.status;
      if (['success', 'failed', 'cancelled'].includes(latest.status)) {
        res.write('event: done\ndata: {}\n\n');
        clearInterval(iv);
        res.end();
      }
    }
  };
  const iv = setInterval(tick, 1000);
  tick();
  req.on('close', () => clearInterval(iv));
});

// POST /api/deploy/tasks/:id/cancel
router.post('/tasks/:id/cancel', (req, res) => {
  try {
    res.json(cancelTask(req.params.id));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ========== WORKER API (host-worker only) ==========
// Простая аутентификация: DEPLOY_WORKER_TOKEN env на host + header.
// Отдельная от user auth — чтобы worker мог работать даже если user AUTH меняется.

function requireWorker(req, res, next) {
  const expected = process.env.DEPLOY_WORKER_TOKEN;
  if (!expected) return res.status(501).json({ error: 'DEPLOY_WORKER_TOKEN not set' });
  const given = req.headers['x-worker-token'];
  if (given !== expected) return res.status(403).json({ error: 'Invalid worker token' });
  next();
}

// GET /api/deploy/worker/claim — atomic забор одной queued task
router.get('/worker/claim', requireWorker, (req, res) => {
  const task = claimNextTask({ worker_host: req.query.host || 'unknown' });
  res.json({ task });
});

// POST /api/deploy/worker/tasks/:id/log — append chunk
router.post('/worker/tasks/:id/log', requireWorker, (req, res) => {
  try {
    appendLog(req.params.id, req.body?.chunk || '');
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/deploy/worker/tasks/:id/complete
router.post('/worker/tasks/:id/complete', requireWorker, (req, res) => {
  try {
    res.json(completeTask(req.params.id, req.body || {}));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ========== LEGACY (deploys) — keep backward compat ==========
// GET / — список старых deploys (таблица deploys). Frontend Dashboard.loadBase
// вызывает api.listDeploys() → /api/deploys, регрессия после Wizard V2 рефакторинга.
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM deploys ORDER BY created_at DESC').all();
  res.json(rows.map(hydrateLegacy));
});

router.get('/:id/status', (req, res) => {
  const row = db.prepare('SELECT * FROM deploys WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Deploy not found' });
  res.json(hydrateLegacy(row));
});

export default router;
