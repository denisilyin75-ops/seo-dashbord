/**
 * Agent: Expense Tracker — трекает расходы по всем сайтам и агентам.
 * MVP placeholder — считает AI-agent costs, ждёт ручного ввода хостинга/лицензий.
 */

import { db } from '../../db.js';

export const expenseTrackerAgent = {
  id: 'expense_tracker',
  name: 'Expense Tracker',
  description: 'Трекает расходы проекта (AI-агенты автоматически + хостинг/домены/лицензии ручным вводом). Фундамент для честного profit calculation и Site Valuation.',
  kind: 'cron',
  scope: 'portfolio',
  readiness: 'mvp',
  todo: [
    'UI для ручного ввода расходов (страница /expenses)',
    'Автоматическое вычисление cost_usd в agent_runs по tokens × model_price',
    'Reminders по продлению доменов (10 дней до expiry) и лицензий',
    'Разбивка расходов по сайтам (site_expenses.site_id)',
    'Включение/выключение amortization (стоимость создания контента)',
    'Partner API интеграция (Admitad, Awin) для автоматического revenue трекинга',
    'Monthly P&L отчёт для каждого сайта',
  ],
  schedule: '@daily',

  defaultConfig: {
    include_ai_costs: true,
    include_amortization: false,
  },

  configSchema: [
    { key: 'include_ai_costs', label: 'Учитывать стоимость AI-агентов', type: 'boolean', default: true, hint: 'Автоматически считается по agent_runs × model price' },
    { key: 'include_amortization', label: 'Амортизация контента', type: 'boolean', default: false, hint: 'Включать ли стоимость создания контента в расходы' },
  ],

  async run(config) {
    // MVP: считаем AI-costs за последние 30 дней по agent_runs
    const aiCosts = db.prepare(`
      SELECT
        COUNT(*) AS runs,
        SUM(COALESCE(tokens_used, 0)) AS tokens,
        SUM(COALESCE(cost_usd, 0)) AS total_usd
      FROM agent_runs
      WHERE started_at >= datetime('now', '-30 days')
    `).get();

    const manualExpenses = db.prepare(`
      SELECT
        COUNT(*) AS entries,
        SUM(amount_usd) AS total_usd,
        category
      FROM site_expenses
      WHERE date >= date('now', '-30 days')
      GROUP BY category
    `).all();

    const totalManual = manualExpenses.reduce((s, r) => s + (r.total_usd || 0), 0);
    const totalAi = aiCosts?.total_usd || 0;

    return {
      summary: `30 дней: AI-агенты $${totalAi.toFixed(2)} · Ручные расходы $${totalManual.toFixed(2)} · Итого $${(totalAi + totalManual).toFixed(2)}`,
      detail: {
        ai: { runs: aiCosts?.runs || 0, tokens: aiCosts?.tokens || 0, cost_usd: totalAi },
        manual: manualExpenses,
        total: totalAi + totalManual,
        note: 'MVP: AI-costs считаются только для запусков где tokens_used и cost_usd заполнены. Ручной ввод через UI — в TODO.',
      },
    };
  },
};
