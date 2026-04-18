// E-E-A-T checker — Experience/Expertise/Authority/Trust signals per design doc §2.4.
// В основном deterministic rules + optional JSON-LD проверки (integration с schema-validator).
//
// Rules:
//   - Author byline присутствует + ссылается на /o-avtore/ или /author/
//   - Published + Updated dates visible (в HTML или в schema)
//   - Affiliate disclosure если обнаружены affiliate links
//   - Author schema.org Person привязан к Article.author
//   - Review schema с rating + reviewedObject (для review-постов)
//
// Phase 1: только deterministic, без LLM.

import { JSDOM } from 'jsdom';

function makeIssue(code, severity, message, opts = {}) {
  return {
    signal_category: 'eeat',
    signal_code: code,
    severity,
    message,
    detail: opts.detail ? JSON.stringify(opts.detail) : null,
    suggestion: opts.suggestion || null,
    auto_fixable: opts.autoFixable ? 1 : 0,
  };
}

const AFFILIATE_DOMAINS = ['admitad', 'market.yandex', 'tds.lovko.pro', 'aliexpress'];
const AFFILIATE_DISCLOSURE_PATTERNS = [
  /партнёрск(ий|ая|ие)\s+(сссылк|материал)/i,
  /рекламн(ый|ая|ые)/i,
  /получ(ить|ать|аем).+комисс/i,
  /affiliate/i,
  /раскрытие/i,
  /disclosure/i,
];

const AUTHOR_PAGE_HINTS = [/\/o-avtore\//, /\/author\//, /\/about/i];

export function checkEeat({ html }) {
  const issues = [];
  const stats = {};

  if (!html) {
    return { issues: [makeIssue('no_html', 'red', 'HTML недоступен')], stats, score: 0 };
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const textContent = (doc.body?.textContent || '').toLowerCase();

  // --- Author byline ---
  // Ищем авторскую атрибуцию: <meta name="author"> или <a rel="author"> или <span class="author">
  const metaAuthor = doc.querySelector('meta[name="author"]')?.getAttribute('content');
  const relAuthor = doc.querySelector('a[rel="author"]');
  const schemaAuthor = doc.querySelector('[itemprop="author"]');
  const bylineLinks = Array.from(doc.querySelectorAll('a[href]'))
    .filter(a => {
      const href = a.getAttribute('href') || '';
      return AUTHOR_PAGE_HINTS.some(p => p.test(href));
    });

  const hasByline = !!(metaAuthor || relAuthor || schemaAuthor || bylineLinks.length);
  stats.author_byline = hasByline;
  if (!hasByline) {
    issues.push(makeIssue('missing_author_byline', 'red',
      'Нет author byline на странице',
      { suggestion: 'Добавьте ссылку "Автор: Имя" ведущую на /o-avtore/. Существенный E-E-A-T сигнал.' }));
  } else if (!bylineLinks.length) {
    issues.push(makeIssue('byline_not_linked', 'yellow',
      'Author упомянут, но без ссылки на /o-avtore/',
      { suggestion: 'Свяжите byline со страницей автора' }));
  }

  // --- Dates: published + updated ---
  const hasPublished = !!doc.querySelector('meta[property="article:published_time"]')
    || !!doc.querySelector('time[datetime]')
    || !!doc.querySelector('[itemprop="datePublished"]');
  const hasUpdated = !!doc.querySelector('meta[property="article:modified_time"]')
    || !!doc.querySelector('time[data-datetime]')
    || !!doc.querySelector('[itemprop="dateModified"]');
  stats.has_published_date = hasPublished;
  stats.has_updated_date = hasUpdated;
  if (!hasPublished) {
    issues.push(makeIssue('missing_published_date', 'yellow',
      'Нет даты публикации в HTML/meta',
      { suggestion: 'Добавьте <time datetime="2026-04-15"> или meta article:published_time' }));
  }
  if (!hasUpdated && hasPublished) {
    issues.push(makeIssue('missing_updated_date', 'yellow',
      'Нет даты последнего обновления',
      { suggestion: 'Поможет если давно не меняли — показывает читателю актуальность' }));
  }

  // --- External authoritative sources cited ---
  const externalLinks = Array.from(doc.querySelectorAll('a[href]'))
    .map(a => {
      try {
        const href = a.getAttribute('href');
        const u = new URL(href);
        return u.host;
      } catch { return null; }
    })
    .filter(Boolean);

  const authoritativeHints = ['.gov', '.edu', 'rospotrebnadzor', 'rostest', 'wirecutter', 'consumerreports', 'iso.org', 'wikipedia'];
  const hasAuthoritative = externalLinks.some(h => authoritativeHints.some(hint => h.includes(hint)));
  stats.has_authoritative_link = hasAuthoritative;
  if (!hasAuthoritative && externalLinks.length > 0) {
    issues.push(makeIssue('no_authoritative_sources', 'yellow',
      'Нет ссылок на авторитетные источники (.gov/.edu/wiki/wirecutter/consumerreports)',
      { suggestion: 'Минимум 1 ссылка на test lab / производителя / независимый обзор' }));
  }

  // --- Affiliate disclosure ---
  const hasAffiliateLinks = externalLinks.some(h => AFFILIATE_DOMAINS.some(d => h.includes(d)));
  stats.has_affiliate_links = hasAffiliateLinks;
  if (hasAffiliateLinks) {
    const hasDisclosure = AFFILIATE_DISCLOSURE_PATTERNS.some(p => p.test(textContent));
    stats.has_affiliate_disclosure = hasDisclosure;
    if (!hasDisclosure) {
      issues.push(makeIssue('missing_affiliate_disclosure', 'red',
        'Affiliate-ссылки без явного disclosure',
        { suggestion: 'Добавьте блок "Мы получаем комиссию с покупок по ссылкам" — требование Google + закон РФ о рекламе ст.5 ФЗ-38',
          autoFixable: false }));
    }
  }

  // --- JSON-LD Author schema presence ---
  const ldScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  let hasAuthorSchema = false;
  let hasArticleSchema = false;
  for (const s of ldScripts) {
    try {
      const parsed = JSON.parse(s.textContent || '');
      const flatten = (e) => {
        if (Array.isArray(e)) return e.forEach(flatten);
        if (e['@graph']) return e['@graph'].forEach(flatten);
        const t = e['@type'];
        const types = Array.isArray(t) ? t : (typeof t === 'string' ? [t] : []);
        if (types.includes('Person')) hasAuthorSchema = true;
        if (types.includes('Article') || types.includes('Review') || types.includes('BlogPosting')) {
          hasArticleSchema = true;
          if (e.author) hasAuthorSchema = true;
        }
      };
      flatten(parsed);
    } catch { /* skip */ }
  }
  stats.has_author_schema = hasAuthorSchema;
  stats.has_article_schema = hasArticleSchema;

  if (hasArticleSchema && !hasAuthorSchema) {
    issues.push(makeIssue('article_schema_without_author', 'yellow',
      'Article schema без author field',
      { suggestion: 'Добавьте author: { @type: "Person", name: "...", url: "..." }' }));
  }

  // Score
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'red') score -= 18;
    else if (i.severity === 'yellow') score -= 6;
  }
  score = Math.max(0, Math.min(100, score));
  return { issues, stats, score };
}
