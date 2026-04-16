/**
 * Google Search Console API client.
 * Авторизация: тот же Service Account, что для GA4 (GOOGLE_APPLICATION_CREDENTIALS
 * или GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY).
 *
 * SA email нужно добавить как owner/full user в GSC для каждого property.
 */

let _client = null;

export class GSCNotConfiguredError extends Error {
  constructor(msg = 'Search Console not configured') { super(msg); this.code = 'GSC_NOT_CONFIGURED'; }
}

async function getClient() {
  if (_client) return _client;
  const hasFile = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasInline = !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  if (!hasFile && !hasInline) throw new GSCNotConfiguredError();

  const { google } = await import('googleapis');

  let auth;
  if (hasInline) {
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  } else {
    auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
  }
  _client = google.searchconsole({ version: 'v1', auth });
  return _client;
}

export function gscStatus() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return { configured: true, source: 'GOOGLE_APPLICATION_CREDENTIALS' };
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) return { configured: true, source: 'GOOGLE_CLIENT_EMAIL/PRIVATE_KEY' };
  return { configured: false };
}

/**
 * Топ-запросы за период. Группировка по query.
 * @param {string} siteUrl — "https://popolkam.ru/" или "sc-domain:popolkam.ru"
 */
export async function fetchTopQueries(siteUrl, startDate, endDate, { rowLimit = 250 } = {}) {
  const client = await getClient();
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate, endDate,
      dimensions: ['query'],
      rowLimit,
    },
  });
  return (res.data.rows || []).map((r) => ({
    query:       r.keys[0],
    clicks:      r.clicks,
    impressions: r.impressions,
    ctr:         r.ctr,
    position:    r.position,
  }));
}

/**
 * Метрики по страницам — для bind'а с articles.url.
 */
export async function fetchTopPages(siteUrl, startDate, endDate, { rowLimit = 500 } = {}) {
  const client = await getClient();
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate, endDate,
      dimensions: ['page'],
      rowLimit,
    },
  });
  return (res.data.rows || []).map((r) => ({
    page:        r.keys[0],
    clicks:      r.clicks,
    impressions: r.impressions,
    ctr:         r.ctr,
    position:    r.position,
  }));
}
