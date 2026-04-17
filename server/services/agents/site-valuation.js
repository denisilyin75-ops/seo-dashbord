/**
 * Agent: Site Valuation — оценка стоимости сайта для подготовки к экзиту.
 * MVP placeholder — считает Multiple of Profit, сохраняет историю в site_valuations.
 */

import { db } from '../../db.js';

export const siteValuationAgent = {
  id: 'site_valuation',
  name: 'Site Valuation',
  description: 'Оценивает стоимость каждого сайта портфеля (Profit × Multiple). Трекает рост капитализации, выявляет факторы снижающие цену, предлагает рекомендации для подготовки к продаже. Основа стратегии экзита.',
  kind: 'cron',
  scope: 'site',
  readiness: 'mvp',
  todo: [
    'Интеграция с site_expenses для точного profit calculation',
    'WHOIS API для domain age factor',
    'Ahrefs/SEMrush API для DA/backlinks',
    'Empire Flippers comparables API для рыночной калибровки',
    'AI-анализ через Claude: качественные факторы (тренд, доверие, monetization diversity)',
    'Автогенерация рекомендаций growth-действий',
    'Portfolio-wide rollup (общая капитализация)',
    'UI страница /valuation с трендом и рекомендациями',
    'AI Listing Generator (отдельный агент)',
  ],
  schedule: '@weekly',

  defaultConfig: {
    base_multiple_affiliate: 30,
    base_multiple_content: 25,
    period_for_avg_profit: 12,
    min_data_months: 6,
    target_exit_valuation_usd: 50000,
  },

  configSchema: [
    { key: 'base_multiple_affiliate', label: 'Базовый множитель (affiliate)', type: 'number', default: 30, hint: 'Стандартный multiple для affiliate-сайтов (25-40 в зависимости от рынка)' },
    { key: 'base_multiple_content', label: 'Базовый множитель (content)', type: 'number', default: 25, hint: 'Для контентных сайтов без affiliate' },
    { key: 'period_for_avg_profit', label: 'Период усреднения прибыли (мес)', type: 'number', default: 12 },
    { key: 'min_data_months', label: 'Минимум данных для оценки (мес)', type: 'number', default: 6, hint: 'Меньше данных → low confidence' },
    { key: 'target_exit_valuation_usd', label: 'Целевая стоимость портфеля ($)', type: 'number', default: 50000 },
  ],

  async run(config) {
    const sites = db.prepare("SELECT * FROM sites WHERE status = 'active'").all();
    const results = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const site of sites) {
      const months = Number(config.period_for_avg_profit) || 12;
      const revenueRow = db.prepare(`
        SELECT SUM(revenue) AS total, COUNT(DISTINCT substr(date, 1, 7)) AS months_count
        FROM site_metrics
        WHERE site_id = ? AND date >= date('now', '-${months} months')
      `).get(site.id);

      const totalRevenue = revenueRow?.total || 0;
      const monthsCount = revenueRow?.months_count || 0;
      const avgMonthlyRevenue = monthsCount > 0 ? totalRevenue / monthsCount : 0;

      // Расходы из site_expenses
      const expRow = db.prepare(`
        SELECT SUM(amount_usd) AS total FROM site_expenses
        WHERE (site_id = ? OR site_id IS NULL)
          AND date >= date('now', '-${months} months')
      `).get(site.id);
      const totalExpenses = expRow?.total || 0;
      const avgMonthlyExpenses = monthsCount > 0 ? totalExpenses / monthsCount : 0;

      const avgMonthlyProfit = avgMonthlyRevenue - avgMonthlyExpenses;

      // Оцениваем confidence по количеству данных
      const minMonths = Number(config.min_data_months) || 6;
      const confidence = monthsCount >= minMonths * 2 ? 'high' : monthsCount >= minMonths ? 'medium' : 'low';

      // Базовый multiple — affiliate по умолчанию
      const baseMultiple = Number(config.base_multiple_affiliate) || 30;

      // MVP: без детальных adjustments — просто базовый multiple
      // Полноценные adjustments (age, trend, concentration risk) — TODO
      const finalMultiple = baseMultiple;
      const valuationExpected = Math.max(0, avgMonthlyProfit * finalMultiple);
      const valuationLow = Math.max(0, valuationExpected * 0.75);
      const valuationHigh = valuationExpected * 1.3;

      // Сохраняем в history
      db.prepare(`
        INSERT INTO site_valuations
          (site_id, date, revenue_last_12m, profit_last_12m, avg_monthly_revenue, avg_monthly_profit,
           base_multiple, final_multiple, valuation_low, valuation_expected, valuation_high,
           methodology, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        site.id, today,
        totalRevenue,
        (totalRevenue - totalExpenses),
        avgMonthlyRevenue,
        avgMonthlyProfit,
        baseMultiple, finalMultiple,
        Math.round(valuationLow), Math.round(valuationExpected), Math.round(valuationHigh),
        'profit_multiple_mvp',
        confidence,
      );

      results.push({
        site: site.name,
        confidence,
        avgMonthlyProfit: avgMonthlyProfit.toFixed(2),
        valuationExpected: Math.round(valuationExpected),
        valuationLow: Math.round(valuationLow),
        valuationHigh: Math.round(valuationHigh),
      });
    }

    const portfolioValue = results.reduce((s, r) => s + r.valuationExpected, 0);
    const target = Number(config.target_exit_valuation_usd) || 50000;
    const progressPct = target > 0 ? (portfolioValue / target) * 100 : 0;

    return {
      summary: `Портфель: $${portfolioValue.toLocaleString()} (${progressPct.toFixed(0)}% от цели $${target.toLocaleString()})`,
      detail: { results, portfolioValue, target, progressPct },
    };
  },
};
