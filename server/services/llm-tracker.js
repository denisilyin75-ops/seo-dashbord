// LLM Call Tracker — единая точка записи в llm_calls для cost/frequency analysis.
//
// Usage (в агентах / services):
//   import { trackLlmCall } from '../services/llm-tracker.js';
//   trackLlmCall({
//     source: 'article_action',
//     source_id: actionId,
//     site_id,
//     operation: 'translate',
//     provider: r.provider,
//     model,
//     tokensIn: r.tokensIn,
//     tokensOut: r.tokensOut,
//     latencyMs: 1234,
//     status: 'success',
//   });
//
// Возвращает { cost_usd } — позволяет caller сразу знать точную цену и writing в свои tables.

import { db } from '../db.js';
import { computeCost } from './ai-pricing.js';

/**
 * Записать LLM-запрос в llm_calls + compute accurate cost.
 * @param {object} opts
 * @param {string} opts.source — 'code_review' | 'article_action' | 'merge' | 'agent:<id>' | 'quality:<dim>'
 * @param {string} [opts.source_id]
 * @param {string} [opts.site_id]
 * @param {string} [opts.operation]
 * @param {string} opts.provider — 'openrouter' | 'anthropic' | 'local'
 * @param {string} opts.model
 * @param {number} [opts.tokensIn=0]
 * @param {number} [opts.tokensOut=0]
 * @param {number} [opts.latencyMs]
 * @param {string} [opts.status='success']
 * @param {string} [opts.error]
 * @returns {{ id: number, cost_usd: number }}
 */
export function trackLlmCall(opts) {
  const tokensIn = opts.tokensIn || 0;
  const tokensOut = opts.tokensOut || 0;
  const cost = computeCost({ tokensIn, tokensOut, model: opts.model });
  const info = db.prepare(`INSERT INTO llm_calls
    (source, source_id, site_id, provider, model, operation, tokens_in, tokens_out, tokens_total, cost_usd, latency_ms, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      opts.source, opts.source_id || null, opts.site_id || null,
      opts.provider, opts.model, opts.operation || null,
      tokensIn, tokensOut, tokensIn + tokensOut,
      cost, opts.latencyMs || null,
      opts.status || 'success', opts.error || null,
    );
  return { id: info.lastInsertRowid, cost_usd: cost };
}

// --- Analytics queries ---

/**
 * Aggregate cost + frequency за период, группировка по dim.
 * @param {object} opts
 * @param {number} [opts.days=30]
 * @param {'source'|'model'|'operation'|'provider'|'day'} [opts.groupBy='source']
 * @returns {Array<{ key: string, calls: number, tokens: number, cost: number }>}
 */
export function aggregateLlmCost({ days = 30, groupBy = 'source' } = {}) {
  const GROUP_COL = {
    source:    'source',
    model:     'model',
    operation: 'operation',
    provider:  'provider',
    day:       "substr(created_at, 1, 10)",
  }[groupBy] || 'source';

  const sql = `SELECT ${GROUP_COL} AS key,
      COUNT(*) AS calls,
      SUM(tokens_total) AS tokens,
      SUM(cost_usd) AS cost,
      AVG(latency_ms) AS avg_latency_ms,
      SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS errors
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY key
    ORDER BY cost DESC, calls DESC`;
  return db.prepare(sql).all(days);
}

/** Totals за период — single line для header. */
export function totalsLlm({ days = 30 } = {}) {
  const row = db.prepare(`SELECT
      COUNT(*) AS calls,
      SUM(tokens_total) AS tokens,
      SUM(cost_usd) AS cost,
      AVG(latency_ms) AS avg_latency_ms,
      SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors,
      COUNT(DISTINCT model) AS unique_models
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')`).get(days);
  return row || { calls: 0, tokens: 0, cost: 0 };
}

/** Recent calls — для drill-down / debug. */
export function recentLlmCalls({ limit = 100, source, model } = {}) {
  const conds = [];
  const params = [];
  if (source) { conds.push('source = ?'); params.push(source); }
  if (model)  { conds.push('model = ?');  params.push(model); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM llm_calls ${where} ORDER BY created_at DESC LIMIT ?`).all(...params, Math.min(500, Number(limit)));
}
