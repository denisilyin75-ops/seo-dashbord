import { Router } from 'express';
import { db } from '../db.js';
import { getAgent, listAgentDefs, runAgent } from '../services/agents/registry.js';

const router = Router();

function hydrateAgent(row, def) {
  if (!row) return null;
  let config = {};
  try { config = JSON.parse(row.config_json || '{}'); } catch {}

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    kind: row.kind,
    scope: def?.scope || 'portfolio',
    readiness: def?.readiness || 'active',
    todo: def?.todo || [],
    schedule: row.schedule,
    enabled: !!row.enabled,
    config,
    configSchema: def?.configSchema || [],
    defaultConfig: def?.defaultConfig || {},
    lastRunAt: row.last_run_at,
    lastRunStatus: row.last_run_status,
    lastRunSummary: row.last_run_summary,
    updatedAt: row.updated_at,
  };
}

// GET /api/agents — все агенты
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM agents ORDER BY name ASC').all();
  const defs = new Map(listAgentDefs().map((d) => [d.id, d]));
  res.json(rows.map((r) => hydrateAgent(r, defs.get(r.id))));
});

// GET /api/agents/:id — детали одного агента
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Agent not found' });
  res.json(hydrateAgent(row, getAgent(req.params.id)));
});

// PUT /api/agents/:id — обновить config/enabled/schedule
router.put('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Agent not found' });

  const b = req.body || {};
  const existingConfig = (() => { try { return JSON.parse(row.config_json || '{}'); } catch { return {}; } })();
  const nextConfig = b.config !== undefined ? { ...existingConfig, ...b.config } : existingConfig;

  db.prepare(`UPDATE agents SET
    enabled = ?, schedule = ?, config_json = ?, updated_at = datetime('now')
    WHERE id = ?`).run(
    b.enabled !== undefined ? (b.enabled ? 1 : 0) : row.enabled,
    b.schedule !== undefined ? b.schedule : row.schedule,
    JSON.stringify(nextConfig),
    req.params.id,
  );

  const fresh = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  res.json(hydrateAgent(fresh, getAgent(req.params.id)));
});

// POST /api/agents/:id/run — принудительный запуск
router.post('/:id/run', async (req, res) => {
  try {
    const result = await runAgent(req.params.id, { triggeredBy: 'manual' });
    const fresh = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    res.json({ result, agent: hydrateAgent(fresh, getAgent(req.params.id)) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/:id/runs — история запусков
router.get('/:id/runs', (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 20));
  const rows = db.prepare(`
    SELECT id, started_at, finished_at, status, summary, detail, triggered_by
    FROM agent_runs WHERE agent_id = ?
    ORDER BY started_at DESC LIMIT ?
  `).all(req.params.id, limit);
  res.json(rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    status: r.status,
    summary: r.summary,
    detail: r.detail ? (() => { try { return JSON.parse(r.detail); } catch { return null; } })() : null,
    triggeredBy: r.triggered_by,
  })));
});

export default router;
