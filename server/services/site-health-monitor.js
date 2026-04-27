// Site Health Monitor — per-site uptime check + SSL expiry tracking.
//
// Pings active sites каждые 10 мин (cron) → site_health_checks log.
// Aggregate:
//   - last_status, last_latency
//   - availability_pct (24h, 7d, 30d)
//   - ssl_days_left
//   - downtime episodes (consecutive errors)
//
// Phase 1: HEAD probe + SSL check, no Telegram alerts (Phase 2).

import { db } from '../db.js';
import tls from 'node:tls';

const TIMEOUT_MS = 10_000;

async function checkUrl(url) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'SCC Health Monitor (+monitoring)' },
    });
    clearTimeout(t);
    const latency = Date.now() - startedAt;
    // Some sites reject HEAD — fallback на GET
    if (r.status === 405 || r.status === 501) {
      const g = await fetch(url, {
        headers: { 'User-Agent': 'SCC Health Monitor', Range: 'bytes=0-100' },
        redirect: 'follow',
      });
      return {
        ok: g.ok,
        status: g.status,
        latency: Date.now() - startedAt,
        error: g.ok ? null : `HTTP ${g.status}`,
      };
    }
    return {
      ok: r.ok,
      status: r.status,
      latency,
      error: r.ok ? null : `HTTP ${r.status}`,
    };
  } catch (e) {
    clearTimeout(t);
    return {
      ok: false,
      status: 0,
      latency: Date.now() - startedAt,
      error: e.name === 'AbortError' ? 'timeout' : (e.message || 'network'),
    };
  }
}

// Проверка SSL expiry через TLS handshake.
function checkSslExpiry(hostname) {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect({
        host: hostname,
        port: 443,
        servername: hostname,
        timeout: TIMEOUT_MS,
        rejectUnauthorized: false,
      }, () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert?.valid_to) return resolve(null);
        const expiry = new Date(cert.valid_to);
        const daysLeft = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
        resolve(daysLeft);
      });
      socket.on('error', () => resolve(null));
      socket.on('timeout', () => { socket.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

/**
 * Run health check for one site.
 * Records в site_health_checks table.
 */
export async function checkSiteHealth(site) {
  const url = `https://${site.name.replace(/^https?:\/\//, '')}/`;
  const probe = await checkUrl(url);

  let sslDaysLeft = null;
  try {
    const hostname = new URL(url).hostname;
    sslDaysLeft = await checkSslExpiry(hostname);
  } catch {}

  db.prepare(`INSERT INTO site_health_checks
    (site_id, url, http_status, latency_ms, ssl_days_left, ok, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      site.id, url, probe.status, probe.latency, sslDaysLeft, probe.ok ? 1 : 0, probe.error,
    );

  return { site_id: site.id, name: site.name, ...probe, sslDaysLeft };
}

/**
 * Run all active sites checks.
 */
export async function checkAllSites() {
  const sites = db.prepare(`SELECT id, name FROM sites WHERE status = 'active'`).all();
  const results = [];
  for (const site of sites) {
    try { results.push(await checkSiteHealth(site)); }
    catch (e) { results.push({ site_id: site.id, name: site.name, ok: false, error: e.message }); }
  }
  return results;
}

/**
 * Aggregate per-site availability + recent downtime episodes.
 */
export function getSitesHealth() {
  const sites = db.prepare(`SELECT id, name FROM sites`).all();
  const result = [];
  for (const site of sites) {
    // Last check
    const last = db.prepare(`SELECT * FROM site_health_checks
      WHERE site_id = ? ORDER BY checked_at DESC LIMIT 1`).get(site.id);
    if (!last) {
      result.push({ site_id: site.id, name: site.name, status: 'unknown', checks: 0 });
      continue;
    }

    // Availability percentages
    const periods = [
      { key: '24h', sql: "datetime('now', '-24 hours')" },
      { key: '7d',  sql: "datetime('now', '-7 days')" },
      { key: '30d', sql: "datetime('now', '-30 days')" },
    ];
    const availability = {};
    for (const p of periods) {
      const row = db.prepare(`SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN ok = 1 THEN 1 ELSE 0 END) AS up
        FROM site_health_checks
        WHERE site_id = ? AND checked_at > ${p.sql}`).get(site.id);
      availability[p.key] = row.total > 0
        ? Number((row.up / row.total * 100).toFixed(2))
        : null;
    }

    // Current downtime episode
    const downSince = db.prepare(`SELECT MIN(checked_at) AS since FROM (
        SELECT checked_at FROM site_health_checks
        WHERE site_id = ? AND ok = 0
          AND checked_at > (
            SELECT COALESCE(MAX(checked_at), '1970-01-01') FROM site_health_checks
            WHERE site_id = ? AND ok = 1
          )
      )`).get(site.id, site.id);

    result.push({
      site_id: site.id,
      name: site.name,
      status: last.ok ? 'up' : 'down',
      last_check_at: last.checked_at,
      last_status: last.http_status,
      last_latency_ms: last.latency_ms,
      ssl_days_left: last.ssl_days_left,
      ssl_warning: last.ssl_days_left != null && last.ssl_days_left < 30,
      down_since: !last.ok ? downSince?.since : null,
      availability,
    });
  }
  return result;
}

/**
 * Recent checks history для конкретного сайта (для chart).
 */
export function getSiteHistory(siteId, { hours = 24, limit = 200 } = {}) {
  return db.prepare(`SELECT http_status, latency_ms, ok, error, checked_at
    FROM site_health_checks
    WHERE site_id = ? AND checked_at > datetime('now', '-' || ? || ' hours')
    ORDER BY checked_at DESC LIMIT ?`).all(siteId, hours, Math.min(500, limit));
}
