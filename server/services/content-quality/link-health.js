// Link Health — проверка что все ссылки (internal + external + affiliate) возвращают 200.
// Deterministic HTTP-проверки с rate-limiting и timeout.
//
// Rules:
//   - Internal 4xx/5xx → red (наша проблема)
//   - External 404 → yellow (может быть временно)
//   - Redirect chain >2 → yellow (теряем link equity)
//   - Affiliate link без SubID → red (теряем tracking)
//   - Missing rel="nofollow" на aff links → yellow (compliance)

import { JSDOM } from 'jsdom';

const DEFAULT_TIMEOUT = 8000;
const CONCURRENT_LIMIT = 5;
const MAX_LINKS_TO_CHECK = 30;

// Known affiliate network domains; используется для detection + SubID check.
const AFFILIATE_SIGNATURES = [
  { domain: 'admitad', param: /subid=/i },
  { domain: 'adm.', param: /subid=/i },
  { domain: 'market.yandex.ru/partner', param: null },
  { domain: 'tds.lovko.pro', param: /sub_id=|subid=/i },
  { domain: 'aliexpress', param: /aff_trace_key=|aff_short_key=/i },
];

function makeIssue(code, severity, message, opts = {}) {
  return {
    signal_category: 'link_health',
    signal_code: code,
    severity,
    message,
    detail: opts.detail ? JSON.stringify(opts.detail) : null,
    suggestion: opts.suggestion || null,
    auto_fixable: opts.autoFixable ? 1 : 0,
  };
}

async function fetchWithRedirects(url, timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': 'Popolkam SCC Content-Quality-Bot' },
    });
    clearTimeout(t);

    let redirects = 0;
    let current = r;
    let currentUrl = url;
    while (current.status >= 300 && current.status < 400 && redirects < 5) {
      const loc = current.headers.get('location');
      if (!loc) break;
      currentUrl = new URL(loc, currentUrl).toString();
      redirects++;
      const next = await fetch(currentUrl, { method: 'HEAD', redirect: 'manual', headers: { 'User-Agent': 'Popolkam SCC Content-Quality-Bot' } });
      current = next;
    }

    // Некоторые серверы не отвечают на HEAD → fallback на GET-range 0-0
    if (current.status === 405 || current.status === 501) {
      const g = await fetch(currentUrl, { method: 'GET', headers: { Range: 'bytes=0-0', 'User-Agent': 'Popolkam SCC Content-Quality-Bot' } });
      return { status: g.status, redirects, finalUrl: currentUrl };
    }

    return { status: current.status, redirects, finalUrl: currentUrl };
  } catch (e) {
    clearTimeout(t);
    return { status: 0, error: e.name === 'AbortError' ? 'timeout' : (e.message || String(e)) };
  }
}

// Concurrent pool с лимитом.
async function checkPool(urls, checker, limit = CONCURRENT_LIMIT) {
  const results = [];
  const iter = urls[Symbol.iterator]();
  const workers = Array(Math.min(limit, urls.length)).fill(0).map(async () => {
    while (true) {
      const next = iter.next();
      if (next.done) return;
      results.push(await checker(next.value));
    }
  });
  await Promise.all(workers);
  return results;
}

function detectAffiliate(href) {
  for (const sig of AFFILIATE_SIGNATURES) {
    if (href.includes(sig.domain)) return sig;
  }
  return null;
}

export async function checkLinkHealth({ html, siteBaseUrl, timeout = DEFAULT_TIMEOUT }) {
  const issues = [];
  const stats = { total: 0, internal: 0, external: 0, affiliate: 0, checked: 0, broken: 0, redirect_chains: 0 };

  if (!html) {
    return { issues: [makeIssue('no_html', 'red', 'HTML недоступен для проверки ссылок')], stats, score: 0 };
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  let baseHost = '';
  try { baseHost = new URL(siteBaseUrl || 'https://example.com').host; } catch { /* ignore */ }

  const allLinks = Array.from(doc.querySelectorAll('a[href]'))
    .map(a => ({
      href: a.getAttribute('href'),
      rel: a.getAttribute('rel') || '',
      anchor: (a.textContent || '').trim().slice(0, 80),
    }))
    .filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('mailto:') && !l.href.startsWith('tel:') && !l.href.startsWith('javascript:'));

  stats.total = allLinks.length;

  const toCheck = [];
  for (const link of allLinks) {
    let url;
    try { url = new URL(link.href, siteBaseUrl || 'https://example.com'); } catch { continue; }

    const isInternal = baseHost && url.host === baseHost;
    if (isInternal) stats.internal++; else stats.external++;

    const aff = detectAffiliate(url.toString());
    if (aff) {
      stats.affiliate++;
      // Affiliate-specific rules
      if (aff.param && !aff.param.test(url.toString())) {
        issues.push(makeIssue('affiliate_missing_subid', 'red',
          `Аффилейт-ссылка без SubID: ${url.host}${url.pathname.slice(0, 40)}`,
          { detail: { url: url.toString(), network: aff.domain, anchor: link.anchor },
            suggestion: `Добавьте SubID (${aff.param}) для tracking. Без него не видим источник продаж.` }));
      }
      if (!/(^|\s)(nofollow|sponsored)(\s|$)/i.test(link.rel)) {
        issues.push(makeIssue('affiliate_missing_nofollow', 'yellow',
          `Аффилейт-ссылка без rel="nofollow sponsored": ${url.host}`,
          { detail: { url: url.toString(), current_rel: link.rel },
            suggestion: 'Добавьте rel="nofollow sponsored" — требование Google + закон РФ о рекламе',
            autoFixable: true }));
      }
    }

    // Ограничиваем HTTP-проверки чтобы не долбить внешние домены.
    if (toCheck.length < MAX_LINKS_TO_CHECK) {
      toCheck.push({ ...link, url: url.toString(), isInternal });
    }
  }

  // HTTP-check batch
  const results = await checkPool(toCheck, async (link) => {
    const r = await fetchWithRedirects(link.url, timeout);
    return { ...link, ...r };
  });
  stats.checked = results.length;

  for (const r of results) {
    if (r.status === 0) {
      issues.push(makeIssue(
        r.isInternal ? 'broken_link_internal' : 'broken_link_external',
        r.isInternal ? 'red' : 'yellow',
        `${r.isInternal ? 'Внутренняя' : 'Внешняя'} ссылка не отвечает: ${r.url.slice(0, 80)}`,
        { detail: { error: r.error, anchor: r.anchor } }));
      stats.broken++;
    } else if (r.status >= 400) {
      issues.push(makeIssue(
        r.isInternal ? 'broken_link_internal' : 'broken_link_external',
        r.isInternal ? 'red' : 'yellow',
        `${r.isInternal ? 'Внутренняя' : 'Внешняя'} ссылка ${r.status}: ${r.url.slice(0, 80)}`,
        { detail: { status: r.status, anchor: r.anchor, url: r.url } }));
      stats.broken++;
    } else if (r.redirects > 2) {
      issues.push(makeIssue('redirect_chain', 'yellow',
        `Длинная редиректная цепочка (${r.redirects}): ${r.url.slice(0, 80)}`,
        { detail: { redirects: r.redirects, final: r.finalUrl },
          suggestion: 'Используйте финальный URL напрямую — меньше потерь link equity' }));
      stats.redirect_chains++;
    }
  }

  // Score: -25 red, -8 yellow, cap [0, 100]
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'red') score -= 25;
    else if (i.severity === 'yellow') score -= 8;
  }
  score = Math.max(0, Math.min(100, score));

  return { issues, stats, score };
}
