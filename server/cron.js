/**
 * Cron jobs. Регистрируются при старте сервера.
 * Каждый job сам проверяет, настроены ли credentials, и тихо скипает,
 * если что-то не сконфигурировано.
 */

import cron from 'node-cron';
import { db } from './db.js';
import { syncSiteMetrics } from './services/metricsSync.js';
import { ga4Status } from './services/analytics.js';
import { gscStatus } from './services/searchConsole.js';

const log = (...a) => console.log(`[cron ${new Date().toISOString()}]`, ...a);

/** Daily metrics sync — 03:00 UTC */
function dailyMetricsSync() {
  cron.schedule('0 3 * * *', async () => {
    if (!ga4Status().configured && !gscStatus().configured) {
      log('skip dailyMetricsSync: ни GA4 ни GSC не сконфигурированы');
      return;
    }
    const sites = db.prepare('SELECT * FROM sites').all();
    log(`dailyMetricsSync: ${sites.length} сайтов`);
    for (const site of sites) {
      try {
        const r = await syncSiteMetrics(site, 1); // вчерашний день
        log(`  ${site.name}: GA4 rows=${r.ga4.rows}, GSC rows=${r.gsc.rows}, upserted=${r.upserted}`);
      } catch (e) {
        log(`  ${site.name}: error ${e.message}`);
      }
    }
  }, { timezone: 'UTC' });
  log('registered dailyMetricsSync (0 3 * * * UTC)');
}

/** Health log — каждый час просто пишет что живой (для диагностики PM2) */
function hourlyHealth() {
  cron.schedule('0 * * * *', () => {
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM sites').get();
    log(`alive · sites=${n} · uptime=${Math.floor(process.uptime() / 60)}min`);
  }, { timezone: 'UTC' });
}

export function startCron() {
  if (process.env.DISABLE_CRON === '1') {
    log('cron disabled via DISABLE_CRON=1');
    return;
  }
  dailyMetricsSync();
  hourlyHealth();
}
