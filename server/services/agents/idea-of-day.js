/**
 * Agent: Idea of the Day — генерация идей статей (выделено из Daily Brief).
 * MVP placeholder — использует существующую executeCommand из claude.js.
 */

import { db } from '../../db.js';
import { executeCommand } from '../claude.js';

export const ideaOfDayAgent = {
  id: 'idea_of_day',
  name: 'Idea of the Day',
  description: 'Генерирует одну свежую идею для контента на сайте. Выделено из Daily Brief для независимой настройки (модель, темп) и истории идей (что предлагалось, что реализовано).',
  kind: 'on_demand',
  scope: 'site',
  readiness: 'mvp',
  todo: [
    'Таблица ai_ideas для истории (site_id, idea, accepted, converted_to_plan_id)',
    'UI список идей со статусами (новая / принята / отклонена / в плане)',
    'Batch-генерация: 5 идей за раз вместо одной',
    'Дедупликация: не предлагать то что уже было в идеях',
    'Seasonal prompt — учёт времени года, сезонных запросов',
    'GSC signals — приоритет идей под запросы с низким CTR но высокими impressions',
    'Кнопка "Принять → в план" одним кликом',
  ],
  schedule: null,

  defaultConfig: {
    style: 'balanced',  // balanced | traffic_focused | revenue_focused
  },

  configSchema: [
    { key: 'style', label: 'Стиль идей', type: 'text', default: 'balanced', hint: 'balanced = баланс трафик/доход, traffic_focused = гонка за трафиком, revenue_focused = высокий ticket' },
  ],

  async run(config, ctx) {
    // На portfolio-запуске — генерим по одной идее для каждого active сайта
    const sites = db.prepare("SELECT * FROM sites WHERE status = 'active'").all();
    const results = [];

    for (const site of sites) {
      const arts = db.prepare('SELECT title FROM articles WHERE site_id = ? LIMIT 30').all(site.id);
      const plan = db.prepare('SELECT title FROM content_plan WHERE site_id = ? AND status != ?').all(site.id, 'done');
      const existing = [...arts.map(a => a.title), ...plan.map(p => p.title)].join('; ') || 'пока ничего';

      const prompt = `Сайт «${site.name}» — ${site.niche || 'affiliate'}, рынок ${site.market}.
Уже есть/запланировано: ${existing}.
Стиль: ${config.style || 'balanced'}.
Предложи ОДНУ свежую идею для статьи. Формат: "заголовок — в 1 предложении почему это зайдёт".`;

      try {
        const { result, tokensUsed, stub } = await executeCommand(prompt, { site: { ...site, metrics: {} } });
        results.push({ site: site.name, idea: result.trim().slice(0, 300), tokensUsed: tokensUsed || 0, stub });
      } catch (e) {
        results.push({ site: site.name, error: e.message });
      }
    }

    const ok = results.filter(r => !r.error).length;
    return {
      summary: `Сгенерировано ${ok}/${sites.length} идей`,
      detail: { results },
    };
  },
};
