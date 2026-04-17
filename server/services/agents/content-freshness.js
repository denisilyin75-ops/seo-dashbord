/**
 * Agent: Content Freshness — placeholder MVP.
 *
 * Пока только сканирует articles и помечает в логе кандидатов на обновление.
 * В следующих фазах будет создавать записи в content_health + отправлять
 * алерты + запускать AI-refresh.
 *
 * См. spec в memory/project_content_freshness_agent.md
 */

import { db } from '../../db.js';

export const contentFreshnessAgent = {
  id: 'content_freshness',
  name: 'Content Freshness Monitor',
  description: 'Сканирует все статьи портфеля, помечает устаревшие (>N месяцев без обновлений) и падающие по позициям в GSC. В MVP только отчёт — без автодействий.',
  kind: 'cron',
  scope: 'portfolio',
  readiness: 'mvp',
  todo: [
    'Создание записей в content_health при обнаружении устаревших статей',
    'Алерты на Dashboard для red-алертов',
    'Интеграция GSC для отслеживания падения позиций (drop >5 pos / 2 недели)',
    'Опция auto-queue для AI-refresh (автопостановка в очередь на обновление)',
    'Per-site overrides (popolkam=60дн, 4beg=120дн)',
  ],
  schedule: '@weekly',

  defaultConfig: {
    age_threshold_months: 6,       // статья считается устаревшей после N месяцев
    max_age_months: 12,            // красный алерт
    check_sites: 'all',            // 'all' | ['site_id_1', ...]
  },

  configSchema: [
    { key: 'age_threshold_months', label: 'Порог устаревания (мес)', type: 'number', default: 6, hint: 'После скольких месяцев без обновлений статья считается устаревшей (yellow alert)' },
    { key: 'max_age_months', label: 'Критический возраст (мес)', type: 'number', default: 12, hint: 'После скольких месяцев статья попадает в red-алерт' },
  ],

  async run(config) {
    const threshold = Number(config.age_threshold_months) || 6;
    const maxAge = Number(config.max_age_months) || 12;

    // Все published статьи
    const rows = db.prepare(`
      SELECT a.id, a.site_id, a.title, a.url, a.updated_at, s.name AS site_name
      FROM articles a
      JOIN sites s ON a.site_id = s.id
      WHERE a.status = 'published' AND a.updated_at IS NOT NULL
    `).all();

    let green = 0, yellow = 0, red = 0;
    const now = Date.now();
    const yellowMs = threshold * 30 * 86400 * 1000;
    const redMs = maxAge * 30 * 86400 * 1000;

    const bySite = {};
    for (const r of rows) {
      const d = Date.parse(r.updated_at + (r.updated_at.endsWith('Z') ? '' : 'Z'));
      const age = now - d;
      let sev = 'green';
      if (age >= redMs) sev = 'red';
      else if (age >= yellowMs) sev = 'yellow';

      if (sev === 'green') green++;
      else if (sev === 'yellow') yellow++;
      else red++;

      bySite[r.site_name] = bySite[r.site_name] || { green: 0, yellow: 0, red: 0 };
      bySite[r.site_name][sev]++;
    }

    const summary = `Просканировано ${rows.length} опубликованных статей: 🟢 ${green} свежих · 🟡 ${yellow} устаревают · 🔴 ${red} требуют refresh`;

    return {
      summary,
      detail: {
        total: rows.length,
        green, yellow, red,
        bySite,
        thresholds: { yellow_months: threshold, red_months: maxAge },
        note: 'MVP: только отчёт. В Phase 2 будет создание content_health алертов и триггер AI-refresh.',
      },
    };
  },
};
