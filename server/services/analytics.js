/**
 * GA4 Data API client.
 * Авторизация: Service Account JSON key (GOOGLE_APPLICATION_CREDENTIALS) или
 * GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY в .env.
 *
 * Service Account email нужно добавить в GA4 Property Access (Viewer).
 *
 * Метод pull(propertyId, from, to) → массив { date, sessions, screenPageViews, ... }
 */

let _client = null;

export class GA4NotConfiguredError extends Error {
  constructor(msg = 'GA4 not configured') { super(msg); this.code = 'GA4_NOT_CONFIGURED'; }
}

/** Лениво создаём BetaAnalyticsDataClient — не загружаем @google-analytics/data, если ключ не настроен. */
async function getClient() {
  if (_client) return _client;
  const hasFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasInline = !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  if (!hasFile && !hasInline) throw new GA4NotConfiguredError();

  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  if (hasInline) {
    _client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });
  } else {
    _client = new BetaAnalyticsDataClient(); // подхватит GOOGLE_APPLICATION_CREDENTIALS
  }
  return _client;
}

/**
 * Проверка статуса.
 * @returns {{ configured: boolean, source?: string }}
 */
export function ga4Status() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return { configured: true, source: 'GOOGLE_APPLICATION_CREDENTIALS' };
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) return { configured: true, source: 'GOOGLE_CLIENT_EMAIL/PRIVATE_KEY' };
  return { configured: false };
}

/**
 * Pull трафик-метрики за период.
 * @param {string} propertyId — например "properties/123456789" или "123456789"
 * @param {string} startDate — "2026-04-01" или "7daysAgo"
 * @param {string} endDate   — "2026-04-15" или "today"
 * @returns {Promise<Array<{ date: string, sessions: number, screenPageViews: number, conversions: number, totalRevenue: number }>>}
 */
export async function fetchTrafficMetrics(propertyId, startDate, endDate) {
  const client = await getClient();
  const property = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
  const [response] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'conversions' },
      { name: 'totalRevenue' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  return (response.rows || []).map((r) => {
    const raw = r.dimensionValues[0].value; // YYYYMMDD
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    return {
      date,
      sessions:        Number(r.metricValues[0].value || 0),
      screenPageViews: Number(r.metricValues[1].value || 0),
      conversions:     Number(r.metricValues[2].value || 0),
      totalRevenue:    Number(r.metricValues[3].value || 0),
    };
  });
}

/**
 * Топ-страницы по сессиям. Используется для bind'а с articles.url.
 */
export async function fetchTopPages(propertyId, startDate, endDate, { limit = 100 } = {}) {
  const client = await getClient();
  const property = propertyId.startsWith('properties/') ? propertyId : `properties/${propertyId}`;
  const [response] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'totalRevenue' },
    ],
    limit,
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  });
  return (response.rows || []).map((r) => ({
    pagePath:        r.dimensionValues[0].value,
    sessions:        Number(r.metricValues[0].value || 0),
    screenPageViews: Number(r.metricValues[1].value || 0),
    totalRevenue:    Number(r.metricValues[2].value || 0),
  }));
}
