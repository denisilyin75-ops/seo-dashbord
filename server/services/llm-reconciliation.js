// LLM Cost Reconciliation — сверка computed cost с actual billing OpenRouter.
//
// Flow:
//   1. Для OpenRouter calls сохраняем data.id → llm_calls.generation_id
//   2. Daily cron вызывает reconcileRecent() — fetches /api/v1/generation?id=X
//      для последних ~100 calls без actual_cost_usd
//   3. Обновляет actual_cost_usd
//
// Rate limit: OpenRouter — не чаще 1 req/200ms. Делаем batch по 50 с delay.

import { db } from '../db.js';
import { fetchOpenRouterGenerationCost } from './claude.js';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Reconcile последние N calls у которых generation_id задан но actual_cost_usd = NULL.
 * @param {object} opts
 * @param {number} [opts.limit=50]
 * @param {number} [opts.delayMs=300] — задержка между requests
 * @returns {Promise<{ reconciled: number, errors: number, skipped: number, total: number }>}
 */
export async function reconcileRecent({ limit = 50, delayMs = 300 } = {}) {
  const pending = db.prepare(`SELECT id, generation_id, cost_usd FROM llm_calls
    WHERE generation_id IS NOT NULL
      AND actual_cost_usd IS NULL
      AND provider = 'openrouter'
      AND status = 'success'
    ORDER BY created_at DESC
    LIMIT ?`).all(limit);

  let reconciled = 0, errors = 0, skipped = 0;
  const update = db.prepare(`UPDATE llm_calls SET actual_cost_usd = ? WHERE id = ?`);

  for (const row of pending) {
    const r = await fetchOpenRouterGenerationCost(row.generation_id);
    if (!r) { skipped++; continue; }
    if (r.error) { errors++; continue; }
    if (typeof r.cost === 'number') {
      update.run(r.cost, row.id);
      reconciled++;
    } else {
      skipped++;
    }
    await sleep(delayMs);
  }

  return { reconciled, errors, skipped, total: pending.length };
}
