// Deploy Queue — SCC записывает tasks, host-worker подхватывает.
//
// API:
//   enqueueTask(payload) → { id, status }
//   getTask(id)          → task row
//   listTasks({ status, limit })
//   cancelTask(id)
//   appendLog(id, chunk) — для host-worker'а (пишет через internal endpoint)
//   updateTaskStatus(id, status, opts)
//
// Task config_json shape — all env vars that provision-site.sh accepts:
//   domain, site_slug, site_title, site_description, admin_email,
//   admin_user, locale, timezone, categories (pipe-separated),
//   plugins, homepage_title, homepage_content, menu_name,
//   template (для default preset'ов), + любые overrides.

import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

export function enqueueTask({ task_type = 'provision', domain, site_slug, template, config }) {
  if (!domain || !site_slug) throw new Error('domain and site_slug required');
  if (!['provision', 'polish', 'migrate', 'delete'].includes(task_type)) {
    throw new Error(`invalid task_type: ${task_type}`);
  }

  // Prevent duplicates: reject если уже есть queued/running task на этот домен
  const existing = db.prepare(`SELECT id, status FROM deploy_tasks
    WHERE domain = ? AND status IN ('queued', 'running') LIMIT 1`).get(domain);
  if (existing) {
    throw new Error(`Уже есть ${existing.status} task для ${domain}: ${existing.id}`);
  }

  const id = 'dep_' + randomUUID().slice(0, 8);
  db.prepare(`INSERT INTO deploy_tasks
    (id, task_type, domain, site_slug, template, config_json, status)
    VALUES (?, ?, ?, ?, ?, ?, 'queued')`).run(
      id, task_type, domain, site_slug, template || null, JSON.stringify(config || {}),
    );
  return getTask(id);
}

export function getTask(id) {
  const row = db.prepare('SELECT * FROM deploy_tasks WHERE id = ?').get(id);
  return hydrate(row);
}

export function listTasks({ status, limit = 50 } = {}) {
  const conds = [];
  const params = [];
  if (status) { conds.push('status = ?'); params.push(status); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const sql = `SELECT * FROM deploy_tasks ${where} ORDER BY created_at DESC LIMIT ?`;
  return db.prepare(sql).all(...params, Math.min(200, Number(limit))).map(hydrate);
}

export function cancelTask(id) {
  const row = db.prepare('SELECT * FROM deploy_tasks WHERE id = ?').get(id);
  if (!row) throw new Error('Task not found');
  if (['success', 'failed', 'cancelled'].includes(row.status)) {
    throw new Error(`Task already ${row.status}, cancel impossible`);
  }
  db.prepare(`UPDATE deploy_tasks SET status = 'cancelled', finished_at = datetime('now') WHERE id = ?`).run(id);
  return getTask(id);
}

// --- Worker API (для host-worker'а) ---

/** Забрать одну queued task для работы. Atomic — CAS. */
export function claimNextTask({ worker_host }) {
  // SQLite не имеет SELECT FOR UPDATE — used OPTIMISTIC CAS pattern.
  const next = db.prepare(`SELECT * FROM deploy_tasks
    WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`).get();
  if (!next) return null;
  const info = db.prepare(`UPDATE deploy_tasks SET
      status = 'running', started_at = datetime('now'), worker_host = ?
    WHERE id = ? AND status = 'queued'`).run(worker_host, next.id);
  if (info.changes === 0) {
    // Race: другой worker забрал. Retry можно.
    return null;
  }
  return getTask(next.id);
}

export function appendLog(id, chunk) {
  if (!chunk) return;
  const row = db.prepare('SELECT log FROM deploy_tasks WHERE id = ?').get(id);
  if (!row) throw new Error('Task not found');
  const current = row.log || '';
  const next = current + chunk;
  db.prepare(`UPDATE deploy_tasks SET log = ? WHERE id = ?`).run(next, id);
}

export function completeTask(id, { success, exit_code, error, site_id } = {}) {
  db.prepare(`UPDATE deploy_tasks SET
      status = ?, finished_at = datetime('now'), exit_code = ?, error = ?, site_id = ?
    WHERE id = ?`).run(
      success ? 'success' : 'failed',
      exit_code == null ? null : Number(exit_code),
      error || null,
      site_id || null,
      id,
    );
  return getTask(id);
}

function hydrate(row) {
  if (!row) return null;
  return {
    id: row.id,
    taskType: row.task_type,
    domain: row.domain,
    siteSlug: row.site_slug,
    template: row.template,
    config: row.config_json ? safeParse(row.config_json) : {},
    status: row.status,
    log: row.log || '',
    exitCode: row.exit_code,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    siteId: row.site_id,
    workerHost: row.worker_host,
    error: row.error,
  };
}
function safeParse(s) { try { return JSON.parse(s); } catch { return {}; } }
