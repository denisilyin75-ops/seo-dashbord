/**
 * Agents Registry — единая точка регистрации всех автоматических воркеров.
 *
 * Каждый агент — объект со структурой:
 *   {
 *     id:          'content_freshness',           // стабильный ID
 *     name:        'Content Freshness Monitor',   // human-readable
 *     description: '...',
 *     kind:        'cron' | 'on_demand' | 'webhook',
 *     schedule:    '0 3 * * *',                    // cron, для kind=cron; null иначе
 *     defaultConfig: { threshold_months: 6, ... },
 *     configSchema:  [ {key, label, type, default, hint} ],
 *     run: async (config, ctx) => ({ summary, detail })
 *   }
 *
 * При добавлении нового агента: импортировать его и зарегистрировать в registerAll().
 */

import { db } from '../../db.js';
import { metricsSyncAgent } from './metrics-sync.js';
import { dailyBriefAgent } from './daily-brief.js';
import { contentFreshnessAgent } from './content-freshness.js';
import { offerHealthAgent } from './offer-health.js';
import { analyticsReviewAgent } from './analytics-review.js';
import { siteValuationAgent } from './site-valuation.js';
import { expenseTrackerAgent } from './expense-tracker.js';
import { ideaOfDayAgent } from './idea-of-day.js';

const AGENTS = new Map();

export function register(agent) {
  if (!agent?.id) throw new Error('Agent must have id');
  AGENTS.set(agent.id, agent);
}

export function getAgent(id) {
  return AGENTS.get(id) || null;
}

export function listAgentDefs() {
  return [...AGENTS.values()];
}

/**
 * Synchronize registry with DB: вставляет неизвестные агенты, обновляет description/kind/schedule
 * (но не трогает пользовательский config_json/enabled).
 */
export function syncAgentsToDb() {
  const upsert = db.prepare(`
    INSERT INTO agents (id, name, description, kind, schedule, enabled, config_json)
    VALUES (@id, @name, @description, @kind, @schedule, 1, @config_json)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      kind = excluded.kind,
      schedule = excluded.schedule,
      updated_at = datetime('now')
  `);

  for (const a of AGENTS.values()) {
    upsert.run({
      id: a.id,
      name: a.name,
      description: a.description || '',
      kind: a.kind,
      schedule: a.schedule || null,
      config_json: JSON.stringify(a.defaultConfig || {}),
    });
  }
}

/**
 * Запустить агента — обрабатывает хранение истории, ошибки, обновление last_run_*
 */
export async function runAgent(id, { triggeredBy = 'manual' } = {}) {
  const def = getAgent(id);
  if (!def) throw new Error(`Agent "${id}" not registered`);

  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);
  if (!row) throw new Error(`Agent "${id}" not in DB (run syncAgentsToDb first)`);

  if (!row.enabled) {
    return { status: 'skipped', summary: 'Агент отключён' };
  }

  let config = {};
  try { config = JSON.parse(row.config_json || '{}'); } catch {}
  // Fill missing fields with defaults
  config = { ...(def.defaultConfig || {}), ...config };

  const runInsert = db.prepare(`
    INSERT INTO agent_runs (agent_id, status, triggered_by)
    VALUES (?, 'running', ?)
  `);
  const runRes = runInsert.run(id, triggeredBy);
  const runId = runRes.lastInsertRowid;

  let status = 'success', summary = '', detail = null;
  try {
    const result = await def.run(config, { db, runId });
    summary = result?.summary || 'OK';
    detail = result?.detail || null;
  } catch (e) {
    status = 'error';
    summary = e.message || String(e);
    detail = { error: e.message, stack: e.stack?.slice(0, 2000) };
  }

  db.prepare(`
    UPDATE agent_runs SET
      finished_at = datetime('now'),
      status = ?,
      summary = ?,
      detail = ?
    WHERE id = ?
  `).run(status, summary.slice(0, 1000), detail ? JSON.stringify(detail) : null, runId);

  db.prepare(`
    UPDATE agents SET
      last_run_at = datetime('now'),
      last_run_status = ?,
      last_run_summary = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(status, summary.slice(0, 500), id);

  return { status, summary, detail, runId };
}

/**
 * Запустить все enabled cron-агенты чей schedule попадает в текущий момент.
 * Вызывается из cron-тикера раз в минуту.
 * Упрощение: не используем полноценный cron-парсер пока, просто сравниваем
 * с сохранённой меткой last_run_at по базовым паттернам (hourly, daily, weekly).
 */
export async function runDueAgents() {
  const agents = db.prepare("SELECT * FROM agents WHERE enabled = 1 AND kind = 'cron'").all();
  const results = [];

  for (const a of agents) {
    if (!a.schedule) continue;
    if (!isDue(a.schedule, a.last_run_at)) continue;
    try {
      const r = await runAgent(a.id, { triggeredBy: 'schedule' });
      results.push({ id: a.id, ...r });
    } catch (e) {
      results.push({ id: a.id, status: 'error', summary: e.message });
    }
  }
  return results;
}

/**
 * Минимальный cron-matcher. Поддерживает базовые паттерны:
 *   '@hourly'  — каждый час
 *   '@daily'   — раз в день (после last_run_at >= 23h)
 *   '@weekly'  — раз в неделю
 *   '@monthly' — раз в месяц
 *   'interval:Nh' | 'interval:Nm' — каждые N часов/минут
 *
 * Для MVP этого достаточно. Позже можно подключить node-cron.
 */
function isDue(schedule, lastRunAt) {
  const now = Date.now();
  const last = lastRunAt ? Date.parse(lastRunAt + (lastRunAt.endsWith('Z') ? '' : 'Z')) : 0;
  const elapsed = now - last;

  if (schedule === '@hourly')  return elapsed >= 55 * 60 * 1000;   // ~55 мин
  if (schedule === '@daily')   return elapsed >= 23 * 3600 * 1000; // ~23 ч
  if (schedule === '@weekly')  return elapsed >= 6.5 * 24 * 3600 * 1000;
  if (schedule === '@monthly') return elapsed >= 29 * 24 * 3600 * 1000;

  const im = schedule.match(/^interval:(\d+)(h|m)$/);
  if (im) {
    const n = Number(im[1]);
    const ms = im[2] === 'h' ? n * 3600 * 1000 : n * 60 * 1000;
    return elapsed >= ms * 0.95;
  }

  return false;
}

// ===== Регистрируем всех известных агентов =====
register(metricsSyncAgent);
register(dailyBriefAgent);
register(contentFreshnessAgent);
register(offerHealthAgent);
register(analyticsReviewAgent);
register(siteValuationAgent);
register(expenseTrackerAgent);
register(ideaOfDayAgent);
