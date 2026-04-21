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
  // Truncate prompt/response до 50KB чтобы БД не разбухла
  const trim = (s) => s ? String(s).slice(0, 50_000) : null;
  const info = db.prepare(`INSERT INTO llm_calls
    (source, source_id, site_id, provider, model, operation,
     tokens_in, tokens_out, tokens_total, cost_usd, latency_ms, status, error,
     generation_id, full_prompt, full_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      opts.source, opts.source_id || null, opts.site_id || null,
      opts.provider, opts.model, opts.operation || null,
      tokensIn, tokensOut, tokensIn + tokensOut,
      cost, opts.latencyMs || null,
      opts.status || 'success', opts.error || null,
      opts.generationId || null, trim(opts.fullPrompt), trim(opts.fullResponse),
    );
  return { id: info.lastInsertRowid, cost_usd: cost };
}

/**
 * Daily spend timeline за N дней: series per-day с calls/tokens/cost.
 * Zeros-filled: если в день N не было calls, row возвращается с 0.
 * Plus anomaly detection — помечаются дни где cost > 3× от 7d rolling median.
 */
export function spendTimeline({ days = 30 } = {}) {
  const rows = db.prepare(`SELECT
      substr(created_at, 1, 10) AS day,
      COUNT(*) AS calls,
      SUM(tokens_total) AS tokens,
      SUM(cost_usd) AS cost,
      SUM(COALESCE(actual_cost_usd, cost_usd)) AS cost_effective
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')
    GROUP BY day
    ORDER BY day ASC`).all(days);

  // Zero-fill пропущенные дни
  const now = new Date();
  const filled = [];
  const byDay = new Map(rows.map(r => [r.day, r]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const row = byDay.get(key);
    filled.push(row || { day: key, calls: 0, tokens: 0, cost: 0, cost_effective: 0 });
  }

  // Anomaly detection: точка считается anomaly если cost > 3× rolling 7d median
  const costs = filled.map(r => r.cost || 0);
  for (let i = 0; i < filled.length; i++) {
    const window = costs.slice(Math.max(0, i - 7), i).filter(c => c > 0).sort((a, b) => a - b);
    if (window.length < 3) continue;
    const median = window[Math.floor(window.length / 2)];
    if (median > 0 && costs[i] > median * 3) filled[i].anomaly = true;
  }

  // Reconciliation summary
  const recon = db.prepare(`SELECT
      SUM(cost_usd) AS computed,
      SUM(COALESCE(actual_cost_usd, cost_usd)) AS actual,
      SUM(CASE WHEN actual_cost_usd IS NOT NULL THEN 1 ELSE 0 END) AS reconciled_calls,
      COUNT(*) AS total_calls
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')`).get(days);

  return { days, timeline: filled, reconciliation: recon };
}

/**
 * Estimated cost для preview перед action. Берёт historical avg по operation+model.
 * Fallback — компьют из входных tokens через pricing table.
 */
export function estimateCost({ operation, model, inputTokensEstimate, expectedOutputRatio = 1.5 }) {
  // Пробуем historical average tokens для same operation+model (last 30d)
  if (operation && model) {
    const hist = db.prepare(`SELECT AVG(tokens_in) AS avg_in, AVG(tokens_out) AS avg_out
      FROM llm_calls WHERE operation = ? AND model = ? AND status = 'success'
      AND created_at > datetime('now', '-30 days')`).get(operation, model);
    if (hist.avg_in && hist.avg_out) {
      return {
        source: 'historical',
        estimated_cost: computeCost({ tokensIn: hist.avg_in, tokensOut: hist.avg_out, model }),
        tokens_in_avg: Math.round(hist.avg_in),
        tokens_out_avg: Math.round(hist.avg_out),
      };
    }
  }
  // Fallback — pricing-table × input estimate × expected output ratio
  if (inputTokensEstimate && model) {
    return {
      source: 'estimate',
      estimated_cost: computeCost({ tokensIn: inputTokensEstimate, tokensOut: Math.round(inputTokensEstimate * expectedOutputRatio), model }),
      tokens_in_avg: inputTokensEstimate,
      tokens_out_avg: Math.round(inputTokensEstimate * expectedOutputRatio),
    };
  }
  return { source: 'unknown', estimated_cost: null };
}

/** Один call по id — для drill-down модала */
export function getLlmCall(id) {
  return db.prepare('SELECT * FROM llm_calls WHERE id = ?').get(id);
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

/**
 * Проверяет не превышает ли сайт monthly budget перед LLM call.
 * Вызывается caller'ом перед tracker.trackLlmCall когда site_id known.
 *
 * @param {string} site_id
 * @param {number} [estimatedCost=0.1] — грубый estimate чтобы заблочить до потенциала
 * @returns {{ allowed: boolean, spent_mtd: number, budget: number|null, remaining: number|null, reason?: string }}
 */
export function checkSiteBudget(site_id, estimatedCost = 0.1) {
  if (!site_id) return { allowed: true, spent_mtd: 0, budget: null, remaining: null };
  const site = db.prepare('SELECT monthly_llm_budget_usd FROM sites WHERE id = ?').get(site_id);
  if (!site || site.monthly_llm_budget_usd == null) {
    return { allowed: true, spent_mtd: 0, budget: null, remaining: null };
  }
  const budget = Number(site.monthly_llm_budget_usd);
  // Этот месяц: с 1-го числа по now
  const row = db.prepare(`SELECT COALESCE(SUM(cost_usd), 0) AS spent FROM llm_calls
    WHERE site_id = ? AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`).get(site_id);
  const spent = row.spent || 0;
  const remaining = budget - spent;
  if (remaining <= 0) {
    return { allowed: false, spent_mtd: spent, budget, remaining, reason: 'budget_exceeded' };
  }
  if (remaining < estimatedCost) {
    return { allowed: false, spent_mtd: spent, budget, remaining, reason: 'insufficient_for_estimate' };
  }
  return { allowed: true, spent_mtd: spent, budget, remaining };
}

/**
 * Portfolio-wide monthly cost: для Dashboard + proactive alert когда > target.
 * @returns {{ current_month: string, spent: number, by_site: Array }}
 */
export function monthlyCostByBite() {
  const current_month = new Date().toISOString().slice(0, 7);
  const by_site = db.prepare(`SELECT site_id, SUM(cost_usd) AS spent, COUNT(*) AS calls
    FROM llm_calls
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY site_id
    ORDER BY spent DESC`).all(current_month);
  const total = by_site.reduce((a, b) => a + (b.spent || 0), 0);
  return { current_month, spent: total, by_site };
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
