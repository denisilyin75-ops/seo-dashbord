/**
 * Agent: Offer Health — проверяет партнёрские ссылки на доступность.
 * MVP: пинг URL из post_meta (popolkam_buy_url). Позже — парсинг партнёрских feed'ов.
 */

import { db } from '../../db.js';

export const offerHealthAgent = {
  id: 'offer_health',
  name: 'Offer Health Monitor',
  description: 'Проверяет партнёрские ссылки в обзорах (HTTP-пинг). Помечает 404/timeout/server-error. Критично для supreme principle — битые ссылки = ноль CR и потеря доверия читателя.',
  kind: 'cron',
  scope: 'portfolio',
  readiness: 'placeholder',
  todo: [
    'Интеграция Content Egg API (получение списка офферов из каждой статьи)',
    'Создание таблицы offers (site_id, url, merchant, product_id, status)',
    'Реальный HTTP-пинг с таймаутом и обработкой редиректов',
    'Создание content_health алертов при 404/5xx',
    'Автозамена битых ссылок если есть альтернатива',
  ],
  schedule: '@hourly',

  defaultConfig: {
    timeout_ms: 8000,
    skip_statuses: [200, 301, 302, 303, 307, 308],
  },

  configSchema: [
    { key: 'timeout_ms', label: 'Таймаут проверки (мс)', type: 'number', default: 8000 },
    { key: 'skip_statuses', label: 'Здоровые HTTP-коды', type: 'tags', default: [200, 301, 302, 303, 307, 308], hint: 'Эти коды считаются OK — остальные флагуются' },
  ],

  async run(config) {
    // MVP scope: пока только skeleton. Реальный пинг будет во второй итерации,
    // когда офферы попадут в SCC через Content Egg → WP REST meta или отдельную таблицу offers.
    //
    // Сейчас просто считаем статьи, у которых НЕТ зарегистрированной партнёрской ссылки,
    // чтобы хотя бы понимать охват и подготовить почву.
    const rows = db.prepare(`
      SELECT COUNT(*) AS total FROM articles WHERE status = 'published'
    `).get();

    return {
      summary: `MVP-заглушка: ${rows.total} опубликованных статей. Реальный пинг офферов появится после интеграции Content Egg API.`,
      detail: {
        total_articles: rows.total,
        status: 'placeholder',
        next_steps: [
          'Интеграция Content Egg API (получение списка офферов из каждой статьи)',
          'Создание таблицы offers (site_id, url, merchant, product_id, status)',
          'Реальный HTTP-пинг с таймаутом и обработкой редиректов',
          'Создание content_health алертов при 404/5xx',
        ],
      },
    };
  },
};
