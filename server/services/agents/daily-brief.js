/**
 * Agent: Daily Brief — предгенерирует Daily Brief для всех активных сайтов
 * утром, чтобы оператор при открытии Dashboard сразу видел готовые карточки.
 */

import { db } from '../../db.js';
import { getOrGenerateBrief } from '../dailyBrief.js';

export const dailyBriefAgent = {
  id: 'daily_brief',
  name: 'Daily Brief (предгенерация)',
  description: 'Утром предгенерирует Daily Brief (Health, Pulse, Idea, Quick Win) для всех активных сайтов. Оператор при открытии панели видит готовые карточки без ожидания AI.',
  kind: 'cron',
  scope: 'portfolio',
  readiness: 'active',
  todo: [
    'Отдельная карточка "Idea of the Day" с историей (выделение в отдельный агент)',
    'Кастомизация времени утренней генерации (сейчас @daily)',
  ],
  schedule: '@daily',

  defaultConfig: {
    refresh: true,
    siteStatuses: ['active'],
  },

  configSchema: [
    { key: 'refresh', label: 'Принудительное обновление', type: 'boolean', default: true, hint: 'true = пересгенерировать даже если кэш на сегодня уже есть' },
    { key: 'siteStatuses', label: 'Статусы сайтов', type: 'tags', default: ['active'], hint: 'Генерировать только для сайтов с этими статусами' },
  ],

  async run(config) {
    const statuses = Array.isArray(config.siteStatuses) ? config.siteStatuses : ['active'];
    const placeholders = statuses.map(() => '?').join(',');
    const sites = db.prepare(`SELECT * FROM sites WHERE status IN (${placeholders})`).all(...statuses);

    let ok = 0, errors = [];
    for (const site of sites) {
      try {
        await getOrGenerateBrief(site, { refresh: !!config.refresh });
        ok++;
      } catch (e) {
        errors.push({ site: site.name, error: e.message });
      }
    }

    return {
      summary: `Сгенерировано ${ok}/${sites.length} брифов${errors.length ? `, ${errors.length} ошибок` : ''}`,
      detail: { sitesCount: sites.length, ok, errors },
    };
  },
};
