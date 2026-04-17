/**
 * Agent: Metrics Sync — ежедневный pull GA4/GSC для всех активных сайтов.
 * Обёртка над существующим кодом (server/cron.js + services/metricsSync.js).
 */

import { db } from '../../db.js';
import { syncSiteMetrics } from '../metricsSync.js';

export const metricsSyncAgent = {
  id: 'metrics_sync',
  name: 'Metrics Sync',
  description: 'Ежедневный pull GA4 + Search Console для всех активных сайтов. Нужно для работы всех аналитических графиков и Daily Brief.',
  kind: 'cron',
  scope: 'portfolio',
  readiness: 'active',
  todo: [],
  schedule: '@daily',

  defaultConfig: {
    days: 7,            // за сколько последних дней подтягивать
    siteStatuses: ['active', 'setup'],
  },

  configSchema: [
    { key: 'days', label: 'Период синхронизации (дней)', type: 'number', default: 7, hint: 'Сколько последних дней метрик подтягивать при каждом запуске' },
    { key: 'siteStatuses', label: 'Статусы сайтов для синка', type: 'tags', default: ['active', 'setup'], hint: 'Только сайты с этими статусами будут синкаться' },
  ],

  async run(config) {
    const statuses = Array.isArray(config.siteStatuses) ? config.siteStatuses : ['active'];
    const placeholders = statuses.map(() => '?').join(',');
    const sites = db.prepare(`SELECT * FROM sites WHERE status IN (${placeholders})`).all(...statuses);

    const days = Math.max(1, Math.min(90, Number(config.days) || 7));

    let ok = 0, skipped = 0, errors = [];
    for (const site of sites) {
      try {
        const r = await syncSiteMetrics(site, days);
        if (r?.skipped?.length && !r?.upserted) skipped++;
        else ok++;
      } catch (e) {
        errors.push({ site: site.name, error: e.message });
      }
    }

    return {
      summary: `Синк ${sites.length} сайтов: ${ok} успешно, ${skipped} пропущено, ${errors.length} ошибок`,
      detail: { sitesCount: sites.length, ok, skipped, errors, days },
    };
  },
};
