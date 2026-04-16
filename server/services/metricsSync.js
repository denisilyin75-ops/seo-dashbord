/**
 * Объединяет GA4 + GSC данные в единый snapshot site_metrics за день.
 *
 * Логика:
 * - GA4 даёт: sessions, screenPageViews, conversions (~ sales), totalRevenue (~ revenue)
 * - GSC даёт: clicks, impressions, ctr, position (агрегировано)
 * - Affiliate clicks мы пока берём как clicks из GSC * 0.6 (грубая прикидка),
 *   позже заменим на pull из Admitad API / Content Egg / WP-плагина.
 *
 * Производные:
 *   rpm  = revenue / sessions * 1000
 *   epc  = revenue / affiliate_clicks
 *   ctr  = affiliate_clicks / sessions * 100  (наш CTR ≠ GSC CTR)
 *   cr   = sales / affiliate_clicks * 100
 */

import { db } from '../db.js';
import { fetchTrafficMetrics, ga4Status, GA4NotConfiguredError } from './analytics.js';
import { fetchTopPages as fetchGscPages, gscStatus, GSCNotConfiguredError } from './searchConsole.js';

export async function syncSiteMetrics(site, days = 7) {
  const result = {
    siteId: site.id,
    days,
    ga4: { configured: false, rows: 0 },
    gsc: { configured: false, rows: 0 },
    upserted: 0,
    skipped: [],
  };

  const endDate   = new Date();
  const startDate = new Date(Date.now() - (days - 1) * 86400_000);
  const start = startDate.toISOString().slice(0, 10);
  const end   = endDate.toISOString().slice(0, 10);

  // GA4
  let ga4ByDate = new Map();
  if (site.ga4_property_id && /^(properties\/)?\d+$/.test(site.ga4_property_id)) {
    const ga4 = ga4Status();
    if (!ga4.configured) result.skipped.push('GA4: GOOGLE_APPLICATION_CREDENTIALS not set');
    else {
      try {
        const rows = await fetchTrafficMetrics(site.ga4_property_id, start, end);
        for (const r of rows) ga4ByDate.set(r.date, r);
        result.ga4 = { configured: true, rows: rows.length };
      } catch (e) {
        if (e instanceof GA4NotConfiguredError) result.skipped.push('GA4: ' + e.message);
        else throw e;
      }
    }
  } else {
    result.skipped.push('GA4: property id not set on site');
  }

  // GSC — агрегированный snapshot за период (один ряд)
  let gscAgg = null;
  if (site.gsc_site_url) {
    const gsc = gscStatus();
    if (!gsc.configured) result.skipped.push('GSC: credentials not set');
    else {
      try {
        const pages = await fetchGscPages(site.gsc_site_url, start, end, { rowLimit: 1000 });
        gscAgg = pages.reduce(
          (acc, p) => ({
            clicks:      acc.clicks      + (p.clicks || 0),
            impressions: acc.impressions + (p.impressions || 0),
          }),
          { clicks: 0, impressions: 0 },
        );
        result.gsc = { configured: true, rows: pages.length };
      } catch (e) {
        if (e instanceof GSCNotConfiguredError) result.skipped.push('GSC: ' + e.message);
        else throw e;
      }
    }
  } else {
    result.skipped.push('GSC: site URL not set');
  }

  // Объединяем по дням
  const upsert = db.prepare(`INSERT INTO site_metrics
    (site_id, date, sessions, revenue, affiliate_clicks, sales, rpm, epc, ctr, cr)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(site_id, date) DO UPDATE SET
      sessions = excluded.sessions,
      revenue = excluded.revenue,
      affiliate_clicks = excluded.affiliate_clicks,
      sales = excluded.sales,
      rpm = excluded.rpm,
      epc = excluded.epc,
      ctr = excluded.ctr,
      cr = excluded.cr`);

  // GSC clicks делим равномерно по дням периода
  const gscClicksPerDay = gscAgg ? gscAgg.clicks / days : 0;

  const tx = db.transaction(() => {
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const date = cursor.toISOString().slice(0, 10);
      const ga = ga4ByDate.get(date) || { sessions: 0, totalRevenue: 0, conversions: 0 };
      const sessions = ga.sessions || 0;
      const revenue  = ga.totalRevenue || 0;
      const sales    = ga.conversions || 0;
      const affClicks = Math.round(gscClicksPerDay * 0.6); // прикидка пока нет реальных affiliate-кликов
      const rpm = sessions > 0 ? +(revenue / sessions * 1000).toFixed(2) : 0;
      const epc = affClicks > 0 ? +(revenue / affClicks).toFixed(2) : 0;
      const ctr = sessions > 0 ? +(affClicks / sessions * 100).toFixed(2) : 0;
      const cr  = affClicks > 0 ? +(sales / affClicks * 100).toFixed(2) : 0;
      upsert.run(site.id, date, sessions, revenue, affClicks, sales, rpm, epc, ctr, cr);
      result.upserted++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  });
  tx();

  return result;
}
