/**
 * Cron jobs. Регистрируются при старте сервера.
 * Каждый job сам проверяет, настроены ли credentials, и тихо скипает,
 * если что-то не сконфигурировано.
 */

import cron from 'node-cron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { syncSiteMetrics } from './services/metricsSync.js';
import { ga4Status } from './services/analytics.js';
import { gscStatus } from './services/searchConsole.js';
import { runDueAgents } from './services/agents/registry.js';

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

/** Code Review nightly — 04:00 UTC, регенерация api-reference.md + architecture.md auto-sections */
function codeReviewNightly() {
  cron.schedule('0 4 * * *', async () => {
    try {
      const { writeApiReference } = await import('./services/code-review/api-doc-gen.js');
      const { writeArchitectureDoc } = await import('./services/code-review/arch-snapshot.js');
      const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      const apiRes = writeApiReference(repoRoot);
      const archRes = writeArchitectureDoc(repoRoot);
      db.prepare(`INSERT INTO code_review_runs
        (trigger, started_at, finished_at, status, output_files)
        VALUES ('nightly', datetime('now'), datetime('now'), 'completed', ?)`)
        .run(JSON.stringify([apiRes.path, archRes.path]));
      log(`codeReviewNightly: api-ref=${apiRes.totalEndpoints} endpoints, arch=${archRes.tables} tables ${archRes.backendLoc}+${archRes.frontendLoc} LOC`);
    } catch (e) {
      log(`codeReviewNightly error: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered codeReviewNightly (0 4 * * * UTC)');
}

/** Agents ticker — проверяет registry агентов каждые 5 минут и запускает due */
function agentsTicker() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const results = await runDueAgents();
      if (results.length) {
        for (const r of results) {
          log(`agent ${r.id}: ${r.status} — ${r.summary}`);
        }
      }
    } catch (e) {
      log(`agentsTicker error: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered agentsTicker (every 5 min)');
}

export function startCron() {
  if (process.env.DISABLE_CRON === '1') {
    log('cron disabled via DISABLE_CRON=1');
    return;
  }
  dailyMetricsSync();
  hourlyHealth();
  codeReviewNightly();
  agentsTicker();
}
