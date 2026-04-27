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

/** Code Review weekly — Mon 06:00 UTC, security audit + code smells */
function codeReviewWeekly() {
  cron.schedule('0 6 * * 1', async () => {
    try {
      const { runSecurityAudit } = await import('./services/code-review/security-audit.js');
      const { runSmellScan } = await import('./services/code-review/smell-scan.js');
      const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      const sec = runSecurityAudit(repoRoot);
      const smell = runSmellScan(repoRoot);
      db.prepare(`INSERT INTO code_review_runs
        (trigger, started_at, finished_at, status, output_files)
        VALUES ('weekly', datetime('now'), datetime('now'), 'completed', ?)`)
        .run(JSON.stringify([sec.path, smell.path]));
      log(`codeReviewWeekly: security critical=${sec.counts.critical}/high=${sec.counts.high}, smells big_files=${smell.counts.big_files} orphans=${smell.counts.orphans}`);
    } catch (e) {
      log(`codeReviewWeekly error: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered codeReviewWeekly (0 6 * * 1 UTC)');
}

/** Exit Readiness Scorecard — 1 числа каждого месяца 08:00 UTC */
function exitScorecardMonthly() {
  cron.schedule('0 8 1 * *', async () => {
    try {
      const { runExitScorecard } = await import('./services/code-review/exit-scorecard.js');
      const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
      const r = runExitScorecard(repoRoot);
      db.prepare(`INSERT INTO code_review_runs
        (trigger, started_at, finished_at, status, output_files)
        VALUES ('monthly', datetime('now'), datetime('now'), 'completed', ?)`)
        .run(JSON.stringify([r.path]));
      log(`exitScorecardMonthly: ${r.month} overall=${r.overall}/100 delta=${r.delta ?? 'N/A'}`);
    } catch (e) {
      log(`exitScorecardMonthly error: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered exitScorecardMonthly (0 8 1 * * UTC)');
}

/** Site Health monitoring — каждые 10 минут, ping all active sites */
function siteHealthMonitorCron() {
  cron.schedule('*/10 * * * *', async () => {
    try {
      const { checkAllSites } = await import('./services/site-health-monitor.js');
      const r = await checkAllSites();
      const down = r.filter(s => !s.ok);
      if (down.length) {
        log(`siteHealthMonitor: ${r.length} sites checked, ${down.length} DOWN: ${down.map(s => s.name).join(', ')}`);
      }
    } catch (e) {
      log(`siteHealthMonitor error: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered siteHealthMonitorCron (every 10 min)');
}

/** LLM waste detection — Sun 06:30 UTC, ищет паттерны экономии */
function llmWasteWeekly() {
  cron.schedule('30 6 * * 0', async () => {
    try {
      const { runWasteAnalysis } = await import('./services/llm-waste-detector.js');
      const r = runWasteAnalysis({ days: 30 });
      log(`llmWasteWeekly: ${r.summary.total_findings} findings, projected savings $${r.summary.projection_monthly}/mo`);
    } catch (e) {
      log(`llmWasteWeekly error: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered llmWasteWeekly (30 6 * * 0 UTC)');
}

/** LLM cost reconciliation — каждые 6 часов сверяет ~50 последних calls с OpenRouter billing */
function llmReconciliationCron() {
  cron.schedule('0 */6 * * *', async () => {
    try {
      const { reconcileRecent } = await import('./services/llm-reconciliation.js');
      const r = await reconcileRecent({ limit: 50 });
      if (r.total > 0) {
        log(`llmReconciliation: reconciled=${r.reconciled}, errors=${r.errors}, skipped=${r.skipped} из ${r.total}`);
      }
    } catch (e) {
      log(`llmReconciliation error: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered llmReconciliationCron (0 */6 * * * UTC)');
}

/**
 * Content Quality nightly batch — 02:30 UTC для каждого active сайта.
 * Анализирует 10 последних published статей per-site, данные копятся в
 * content_quality_scores + content_health. UI HealthWidget показывает trend.
 *
 * Осторожно: всё deterministic (без LLM) — zero cost. Когда добавим LLM dims —
 * тогда добавим budget cap.
 */
function contentQualityNightly() {
  cron.schedule('30 2 * * *', async () => {
    try {
      const { analyzeBatch } = await import('./services/content-quality/index.js');
      const sites = db.prepare("SELECT id, name FROM sites WHERE status = 'active' AND wp_api_url IS NOT NULL").all();
      if (!sites.length) { log('contentQualityNightly: нет active сайтов с WP'); return; }
      log(`contentQualityNightly: ${sites.length} сайтов`);
      for (const s of sites) {
        try {
          const r = await analyzeBatch({ site_id: s.id, limit: 10, trigger: 'cron_nightly' });
          log(`  ${s.name}: checked=${r.posts_checked}, results=${r.results.length}`);
        } catch (e) {
          log(`  ${s.name}: error ${e.message}`);
        }
      }
    } catch (e) {
      log(`contentQualityNightly fatal: ${e.message}`);
    }
  }, { timezone: 'UTC' });
  log('registered contentQualityNightly (30 2 * * * UTC)');
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
  contentQualityNightly();
  codeReviewNightly();
  codeReviewWeekly();
  exitScorecardMonthly();
  llmReconciliationCron();
  llmWasteWeekly();
  siteHealthMonitorCron();
  agentsTicker();
}
