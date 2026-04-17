/**
 * Agent: Analytics Review — еженедельный анализ метрик сайта.
 * MVP placeholder — читает site_metrics, считает тренды, возвращает отчёт.
 */

import { db } from '../../db.js';

export const analyticsReviewAgent = {
  id: 'analytics_review',
  name: 'Analytics Review',
  description: 'Еженедельный анализ метрик сайта: тренды трафика и revenue, аномалии, top-performers и underperformers, сравнение с прошлой неделей. В отличие от metrics_sync (только pull), этот агент извлекает выводы.',
  kind: 'cron',
  scope: 'site',
  readiness: 'mvp',
  todo: [
    'Вывод в content_health при аномалиях (падение RPM >30%)',
    'GSC интеграция — топ растущих / падающих запросов',
    'Top-10 underperforming pages (sessions ↑, revenue ↓)',
    'Сезонная нормализация (сравнение YoY, не только WoW)',
    'AI-комментарий через Claude: что делать с этими данными',
    'Telegram-алерт при critical',
    'Per-site overrides порогов аномалий',
  ],
  schedule: '@weekly',

  defaultConfig: {
    anomaly_threshold_pct: 20,
    lookback_days: 28,
    compare_period_days: 28,
  },

  configSchema: [
    { key: 'anomaly_threshold_pct', label: 'Порог аномалии (%)', type: 'number', default: 20, hint: 'Падение метрики больше этого % вызывает алерт' },
    { key: 'lookback_days', label: 'Период анализа (дней)', type: 'number', default: 28 },
    { key: 'compare_period_days', label: 'Период сравнения (дней)', type: 'number', default: 28 },
  ],

  async run(config) {
    const sites = db.prepare("SELECT * FROM sites WHERE status = 'active'").all();
    const results = [];

    for (const site of sites) {
      const days = Number(config.lookback_days) || 28;
      const cmpDays = Number(config.compare_period_days) || 28;

      const current = db.prepare(`
        SELECT
          AVG(sessions) as sessions, SUM(revenue) as revenue, AVG(rpm) as rpm, AVG(cr) as cr
        FROM site_metrics
        WHERE site_id = ? AND date >= date('now', '-${days} days')
      `).get(site.id);

      const prev = db.prepare(`
        SELECT
          AVG(sessions) as sessions, SUM(revenue) as revenue, AVG(rpm) as rpm, AVG(cr) as cr
        FROM site_metrics
        WHERE site_id = ? AND date BETWEEN date('now', '-${days + cmpDays} days') AND date('now', '-${days + 1} days')
      `).get(site.id);

      const delta = (cur, p) => p > 0 ? ((cur - p) / p) * 100 : null;

      const anomalies = [];
      const threshold = Number(config.anomaly_threshold_pct) || 20;
      const sessionsDelta = delta(current.sessions || 0, prev.sessions || 0);
      const revenueDelta = delta(current.revenue || 0, prev.revenue || 0);
      const rpmDelta = delta(current.rpm || 0, prev.rpm || 0);

      if (sessionsDelta != null && sessionsDelta < -threshold) anomalies.push(`Sessions −${Math.abs(sessionsDelta).toFixed(0)}%`);
      if (revenueDelta != null && revenueDelta < -threshold) anomalies.push(`Revenue −${Math.abs(revenueDelta).toFixed(0)}%`);
      if (rpmDelta != null && rpmDelta < -threshold) anomalies.push(`RPM −${Math.abs(rpmDelta).toFixed(0)}%`);

      results.push({
        site: site.name,
        current,
        prev,
        deltas: { sessionsDelta, revenueDelta, rpmDelta },
        anomalies,
      });
    }

    const totalAnomalies = results.reduce((s, r) => s + r.anomalies.length, 0);
    return {
      summary: `Проанализировано ${results.length} сайтов · ${totalAnomalies} аномалий обнаружено`,
      detail: { results, threshold: config.anomaly_threshold_pct },
    };
  },
};
