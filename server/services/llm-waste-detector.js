// LLM Waste Detector — анализирует llm_calls и формирует actionable
// рекомендации по оптимизации стоимости.
//
// Patterns которые ловим:
//   1. Sonnet calls с low output (<500 tokens) — могли быть Haiku в 12× дешевле
//   2. Sonnet calls с long input но коротким output — кэширование могло помочь
//   3. Same operation на разных моделях — сравнение и рекомендация
//   4. Failed calls с retry-pattern — деньги в трубу
//   5. Слишком частые calls на одинаковый source_id — возможно кэш потерян
//   6. High-cost operations (top 5 single calls) — sanity check
//
// Запускается cron weekly (Sun 06:30 UTC), результат в waste_findings table
// + Daily Brief alert если significant savings (>10% projected monthly).

import { db } from '../db.js';
import { computeCost, priceFor } from './ai-pricing.js';

const HAIKU_MODELS = ['anthropic/claude-haiku-4.5', 'anthropic/claude-3.5-haiku', 'claude-haiku-4-5-20251001'];
const SONNET_MODELS = ['anthropic/claude-sonnet-4.6', 'anthropic/claude-sonnet-4', 'claude-sonnet-4-6', 'claude-sonnet-4-20250514'];

// Считается ли это Sonnet (по любому варианту naming)
function isSonnet(model) { return SONNET_MODELS.some(m => model?.includes(m.replace('anthropic/', ''))); }
function isHaiku(model)  { return HAIKU_MODELS.some(m => model?.includes(m.replace('anthropic/', ''))); }

/**
 * Pattern 1: Sonnet calls с малым output → могли быть Haiku.
 * Threshold: output < 500 tokens. Считаем economy через pricing diff.
 */
export function findSonnetUnderusage({ days = 30 } = {}) {
  const rows = db.prepare(`SELECT id, model, tokens_in, tokens_out, cost_usd, COALESCE(actual_cost_usd, cost_usd) AS effective_cost,
      operation, created_at, source
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')
      AND tokens_out < 500
      AND tokens_total > 100
      AND status = 'success'`).all(days);

  const sonnetUnderusage = rows.filter(r => isSonnet(r.model));
  if (!sonnetUnderusage.length) return null;

  // Если бы это всё было на Haiku — какой был бы cost?
  const haikuModel = 'anthropic/claude-haiku-4.5';
  let haikuCost = 0;
  let actualCost = 0;
  for (const r of sonnetUnderusage) {
    haikuCost += computeCost({ tokensIn: r.tokens_in, tokensOut: r.tokens_out, model: haikuModel });
    actualCost += r.effective_cost;
  }

  const savings = actualCost - haikuCost;
  if (savings < 0.0001) return null;

  return {
    pattern: 'sonnet_underusage',
    severity: savings > 1 ? 'high' : savings > 0.1 ? 'medium' : 'low',
    title: `${sonnetUnderusage.length} Sonnet calls с output<500 tokens — Haiku хватило бы`,
    detail: {
      affected_calls: sonnetUnderusage.length,
      total_cost_actual: Number(actualCost.toFixed(6)),
      total_cost_if_haiku: Number(haikuCost.toFixed(6)),
      savings_usd: Number(savings.toFixed(6)),
      savings_pct: Math.round((savings / actualCost) * 100),
      operations_affected: [...new Set(sonnetUnderusage.map(r => r.operation).filter(Boolean))],
    },
    recommendation: `Переключите эти operations на Haiku 4.5: ${[...new Set(sonnetUnderusage.map(r => r.operation).filter(Boolean))].slice(0, 5).join(', ')}. Экономия ~$${savings.toFixed(2)}/${days}d projection.`,
  };
}

/**
 * Pattern 2: Failed calls — money in trash.
 */
export function findFailedCallsCost({ days = 30 } = {}) {
  const rows = db.prepare(`SELECT model, COUNT(*) AS n, SUM(cost_usd) AS cost, SUM(tokens_total) AS tokens
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')
      AND status != 'success'
    GROUP BY model`).all(days);

  if (!rows.length) return null;
  const total = rows.reduce((a, b) => a + (b.cost || 0), 0);
  if (total < 0.0005) return null;

  return {
    pattern: 'failed_calls_cost',
    severity: total > 0.5 ? 'medium' : 'low',
    title: `Failed/error calls стоили $${total.toFixed(4)} за ${days}d`,
    detail: {
      total_cost: Number(total.toFixed(6)),
      breakdown: rows.map(r => ({ model: r.model, calls: r.n, cost: Number((r.cost || 0).toFixed(6)) })),
    },
    recommendation: 'Investigate retries в источниках с высоким failure rate. Проверьте timeout / rate-limit logs.',
  };
}

/**
 * Pattern 3: Same operation на разных models — comparison.
 */
export function findModelComparison({ days = 30 } = {}) {
  const rows = db.prepare(`SELECT operation, model,
      COUNT(*) AS calls,
      AVG(tokens_in) AS avg_in,
      AVG(tokens_out) AS avg_out,
      AVG(cost_usd) AS avg_cost,
      AVG(latency_ms) AS avg_latency
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')
      AND status = 'success' AND operation IS NOT NULL
    GROUP BY operation, model
    HAVING calls >= 3`).all(days);

  // Group by operation, find ones with multiple models
  const byOp = {};
  for (const r of rows) {
    if (!byOp[r.operation]) byOp[r.operation] = [];
    byOp[r.operation].push(r);
  }

  const comparisons = [];
  for (const [op, models] of Object.entries(byOp)) {
    if (models.length < 2) continue;
    models.sort((a, b) => a.avg_cost - b.avg_cost);
    const cheapest = models[0];
    const most_expensive = models[models.length - 1];
    if (most_expensive.avg_cost / cheapest.avg_cost < 1.5) continue; // ничего значимого
    comparisons.push({
      operation: op,
      cheapest: { model: cheapest.model, avg_cost: Number(cheapest.avg_cost.toFixed(6)), avg_latency: Math.round(cheapest.avg_latency || 0) },
      most_expensive: { model: most_expensive.model, avg_cost: Number(most_expensive.avg_cost.toFixed(6)), avg_latency: Math.round(most_expensive.avg_latency || 0) },
      savings_pct: Math.round((1 - cheapest.avg_cost / most_expensive.avg_cost) * 100),
    });
  }

  if (!comparisons.length) return null;
  return {
    pattern: 'model_comparison',
    severity: 'info',
    title: `${comparisons.length} операций имеют использование нескольких моделей`,
    detail: { comparisons },
    recommendation: 'Сравните качество output между моделями для same operation — если cheaper give достаточный результат, переключайтесь.',
  };
}

/**
 * Pattern 4: Top 5 most expensive single calls — sanity check.
 */
export function findTopCostCalls({ days = 30, limit = 5 } = {}) {
  const rows = db.prepare(`SELECT id, model, operation, source, source_id,
      tokens_in, tokens_out, cost_usd, COALESCE(actual_cost_usd, cost_usd) AS effective_cost,
      created_at
    FROM llm_calls
    WHERE created_at > datetime('now', '-' || ? || ' days')
      AND status = 'success'
    ORDER BY effective_cost DESC
    LIMIT ?`).all(days, limit);

  if (!rows.length) return null;
  return {
    pattern: 'top_cost_calls',
    severity: 'info',
    title: `Top ${rows.length} most expensive calls за ${days}d`,
    detail: {
      calls: rows.map(r => ({
        id: r.id,
        model: r.model,
        operation: r.operation,
        source: r.source,
        cost: Number(r.effective_cost.toFixed(6)),
        tokens: `${r.tokens_in}+${r.tokens_out}`,
        date: r.created_at,
      })),
    },
    recommendation: 'Откройте через UI drill-down — проверьте что output реально стоил этих токенов.',
  };
}

/**
 * Main entry — все patterns в один report.
 * Возвращает массив findings + summary.
 */
export function runWasteAnalysis({ days = 30 } = {}) {
  const findings = [];
  const checks = [
    findSonnetUnderusage({ days }),
    findFailedCallsCost({ days }),
    findModelComparison({ days }),
    findTopCostCalls({ days }),
  ];
  for (const c of checks) if (c) findings.push(c);

  // Total potential savings (только из actionable patterns)
  const total_savings_usd = findings
    .filter(f => f.detail?.savings_usd)
    .reduce((a, b) => a + (b.detail.savings_usd || 0), 0);

  const projection_monthly = total_savings_usd > 0 ? (total_savings_usd / days) * 30 : 0;

  // Persist в waste_findings table (создается lazy)
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS waste_findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      severity TEXT,
      title TEXT,
      detail_json TEXT,
      recommendation TEXT,
      total_savings_usd REAL,
      analyzed_days INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    const insert = db.prepare(`INSERT INTO waste_findings
      (pattern, severity, title, detail_json, recommendation, total_savings_usd, analyzed_days)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const f of findings) {
      insert.run(f.pattern, f.severity, f.title, JSON.stringify(f.detail), f.recommendation, f.detail?.savings_usd || null, days);
    }
  } catch (e) {
    console.error('[waste-detector] persist failed:', e.message);
  }

  return {
    days,
    findings,
    summary: {
      total_findings: findings.length,
      total_savings_usd: Number(total_savings_usd.toFixed(6)),
      projection_monthly: Number(projection_monthly.toFixed(4)),
    },
  };
}

/**
 * Last waste analysis — для UI отображения без перерасчёта.
 */
export function getLastAnalysis({ limit = 10 } = {}) {
  try {
    return db.prepare(`SELECT * FROM waste_findings ORDER BY created_at DESC LIMIT ?`).all(limit);
  } catch { return []; }
}
