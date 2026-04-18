// Article Import Service — Phase 2 MVP.
// Читает URL → Readability.js → сохраняет в imported_articles + imported_images.
//
// Phase 2 MVP scope:
//   - Readability.js primary (Mozilla)
//   - Нет Playwright fallback пока (MVP)
//   - Нет adapter-based extractors (Phase 3)
//   - Images: только URLs, без реального download (Phase 2b)
//   - Auto-tagging: deterministic (пока без LLM — домен-hints)
//   - Language detection: на основе Accept-Language / meta / html[lang]
//
// Legal framing: purpose required, UI disclaimer — это research material, not for republishing.

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import crypto from 'node:crypto';
import { db } from '../../db.js';

const USER_AGENT = 'Popolkam SCC Research Bot (+https://popolkam.ru/)';
const FETCH_TIMEOUT_MS = 20_000;

function genId() {
  return 'imp_' + crypto.randomBytes(8).toString('hex');
}

function sha256Text(txt) {
  return crypto.createHash('sha256').update(txt || '', 'utf8').digest('hex');
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, status: r.status, error: `HTTP ${r.status}` };
    const html = await r.text();
    return { ok: true, html, status: r.status, finalUrl: r.url };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : (e.message || String(e)) };
  }
}

// Выдёргивает meta/schema info из полного HTML (читает head напрямую).
function extractMeta(doc) {
  const get = (sel, attr = 'content') => doc.querySelector(sel)?.getAttribute(attr) || null;

  const schemaTypes = [];
  const ldScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  for (const s of ldScripts) {
    try {
      const p = JSON.parse(s.textContent || '');
      const flatten = (e) => {
        if (Array.isArray(e)) return e.forEach(flatten);
        if (e['@graph']) return e['@graph'].forEach(flatten);
        const t = e['@type'];
        if (Array.isArray(t)) schemaTypes.push(...t);
        else if (typeof t === 'string') schemaTypes.push(t);
      };
      flatten(p);
    } catch { /* skip */ }
  }

  return {
    title: doc.querySelector('title')?.textContent?.trim() || null,
    metaDescription: get('meta[name="description"]') || get('meta[property="og:description"]'),
    ogImage: get('meta[property="og:image"]'),
    canonicalUrl: get('link[rel="canonical"]', 'href'),
    lang: doc.documentElement?.getAttribute('lang') || null,
    author: get('meta[name="author"]') || get('meta[property="article:author"]'),
    publishedAt: get('meta[property="article:published_time"]') || get('meta[name="date"]'),
    schemaTypes: [...new Set(schemaTypes)],
  };
}

// Простейший language detect: сначала html lang, потом meta, потом эвристика по кириллице.
function detectLanguage(doc, metaLang) {
  if (metaLang) {
    const short = metaLang.toLowerCase().split(/[-_]/)[0];
    if (['ru', 'en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt'].includes(short)) return short;
  }
  const text = (doc.body?.textContent || '').slice(0, 2000);
  const cyrillic = (text.match(/[а-яА-Я]/g) || []).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  if (cyrillic > latin * 0.3) return 'ru';
  return 'en';
}

// Domain-hints для auto-tagging (Phase 2 MVP без LLM).
const DOMAIN_TAG_HINTS = {
  'wirecutter.nytimes.com': ['wirecutter', 'competitor', 'english'],
  'ixbt.com': ['ixbt', 'russian', 'competitor'],
  'ixbt.games': ['ixbt', 'russian'],
  '4pda.to': ['4pda', 'russian', 'forum'],
  'notebookcheck.net': ['notebookcheck', 'specs'],
  'rtings.com': ['rtings', 'english', 'test-methodology'],
  'consumerreports.org': ['consumerreports', 'english', 'test-methodology'],
  'delonghi.com': ['manufacturer', 'delonghi'],
  'philips.com': ['manufacturer', 'philips'],
  'jura.com': ['manufacturer', 'jura'],
  'saeco.com': ['manufacturer', 'saeco'],
};

function inferAutoTags(domain, purpose) {
  const tags = [];
  // Exact match
  if (DOMAIN_TAG_HINTS[domain]) tags.push(...DOMAIN_TAG_HINTS[domain]);
  // Partial match (subdomain of known)
  for (const [d, t] of Object.entries(DOMAIN_TAG_HINTS)) {
    if (d !== domain && domain.endsWith('.' + d.replace(/^.+\./, ''))) tags.push(...t);
  }
  if (purpose) tags.push(purpose);
  return [...new Set(tags)];
}

// Извлекает картинки из cleaned content html.
function extractImages(contentHtml, sourceUrl) {
  if (!contentHtml) return [];
  const dom = new JSDOM(contentHtml);
  return Array.from(dom.window.document.querySelectorAll('img')).map(img => {
    let src = img.getAttribute('src');
    if (!src) return null;
    try { src = new URL(src, sourceUrl).toString(); } catch { return null; }
    return {
      original_url: src,
      alt_text: img.getAttribute('alt') || null,
      caption: img.parentElement?.tagName === 'FIGURE' ? img.parentElement.querySelector('figcaption')?.textContent?.trim() : null,
    };
  }).filter(Boolean);
}

// Главный entry: impport URL.
// opts: { url, purpose, user_tags: [], refetch_interval_days }
// Returns: imported_article row + images[] (freshly created).
export async function importUrl(opts) {
  const { url, purpose, user_tags, refetch_interval_days, imported_by } = opts;
  if (!url) throw new Error('url required');
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { throw new Error('invalid url'); }

  const domain = parsedUrl.host.toLowerCase().replace(/^www\./, '');

  // Check cache — если этот URL уже был импортирован в последние 24h, вернуть существующую запись.
  const existing = db.prepare(`SELECT * FROM imported_articles
    WHERE source_url = ? AND imported_at > datetime('now', '-24 hours') AND status = 'active'
    ORDER BY imported_at DESC LIMIT 1`).get(url);
  if (existing) {
    const images = db.prepare('SELECT * FROM imported_images WHERE imported_article_id = ?').all(existing.id);
    return { article: hydrate(existing), images, cached: true };
  }

  const fetchRes = await fetchHtml(url);
  if (!fetchRes.ok) {
    throw new Error(`Fetch failed: ${fetchRes.error}`);
  }

  const dom = new JSDOM(fetchRes.html, { url: fetchRes.finalUrl || url });
  const meta = extractMeta(dom.window.document);

  // Readability extraction
  const readerDom = new JSDOM(fetchRes.html, { url: fetchRes.finalUrl || url });
  const reader = new Readability(readerDom.window.document);
  const article = reader.parse();

  let confidence = 0;
  const warnings = [];
  if (!article) {
    warnings.push('readability_failed');
  } else {
    if (!article.content || article.length < 500) {
      warnings.push('low_word_count');
      confidence = 0.4;
    } else {
      confidence = Math.min(1.0, (article.length / 5000) + 0.3);
    }
  }

  // Cookie wall / paywall heuristics
  const textLower = (article?.textContent || '').toLowerCase();
  if (textLower.includes('accept cookies') || textLower.includes('subscribe to continue')) {
    warnings.push('paywall_or_cookie_wall_suspected');
    confidence = Math.min(confidence, 0.3);
  }

  const title = article?.title || meta.title || parsedUrl.pathname;
  const contentHtml = article?.content || '';
  const contentText = article?.textContent || '';
  const wordCount = contentText.trim().split(/\s+/).filter(w => w.length > 1).length;
  const readingTime = Math.max(1, Math.round(wordCount / 220));

  // Links analysis
  const allLinks = Array.from(new JSDOM(contentHtml).window.document.querySelectorAll('a[href]'));
  let internalCount = 0, externalCount = 0;
  const linksSummary = [];
  for (const a of allLinks) {
    try {
      const href = a.getAttribute('href');
      const u = new URL(href, url);
      const isInternal = u.host === parsedUrl.host;
      if (isInternal) internalCount++; else externalCount++;
      if (linksSummary.length < 50) {
        linksSummary.push({ url: u.toString(), anchor: (a.textContent || '').trim().slice(0, 80), internal: isInternal });
      }
    } catch { /* skip */ }
  }

  // Auto-tags + language
  const autoTags = inferAutoTags(domain, purpose);
  const language = detectLanguage(dom.window.document, meta.lang);

  // Images (только URLs собираем, реальный download = Phase 2b)
  const images = extractImages(contentHtml, url);

  // Persist
  const id = genId();
  const contentHash = sha256Text(contentText);

  db.prepare(`INSERT INTO imported_articles
    (id, source_url, source_domain, canonical_url, title, author, published_at,
     language_detected, content_html, content_text, excerpt, word_count, reading_time_min,
     extraction_method, extraction_confidence, extraction_warnings,
     meta_title, meta_description, og_image_url, schema_types,
     internal_links_count, external_links_count, links_json,
     auto_tags, user_tags, imported_by, purpose, refetch_interval_days, content_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?,  ?, ?, ?, ?, ?, ?,  ?, ?, ?,  ?, ?, ?, ?,  ?, ?, ?,  ?, ?, ?, ?, ?, ?)`).run(
      id, url, domain, meta.canonicalUrl, title, article?.byline || meta.author, meta.publishedAt,
      language, contentHtml, contentText, article?.excerpt || null, wordCount, readingTime,
      'readability', confidence, JSON.stringify(warnings),
      meta.title, meta.metaDescription, meta.ogImage, JSON.stringify(meta.schemaTypes),
      internalCount, externalCount, JSON.stringify(linksSummary),
      JSON.stringify(autoTags), JSON.stringify(user_tags || []), imported_by || null,
      purpose || 'research', refetch_interval_days || null, contentHash,
    );

  // Insert image records (download_status = pending, Phase 2b download-worker их поднимет)
  const imgStmt = db.prepare(`INSERT INTO imported_images
    (id, imported_article_id, original_url, alt_text, caption, download_status)
    VALUES (?, ?, ?, ?, ?, 'pending')`);
  const imageRows = [];
  const tx = db.transaction(() => {
    for (const img of images) {
      const imgId = 'img_' + crypto.randomBytes(6).toString('hex');
      imgStmt.run(imgId, id, img.original_url, img.alt_text, img.caption);
      imageRows.push({ id: imgId, imported_article_id: id, ...img, download_status: 'pending' });
    }
  });
  tx();

  const row = db.prepare('SELECT * FROM imported_articles WHERE id = ?').get(id);
  return { article: hydrate(row), images: imageRows, cached: false };
}

// List — с фильтрами (purpose, domain, status, tags) + pagination.
export function listImported({ purpose, domain, status, q, limit = 50, offset = 0 } = {}) {
  const conds = ["status != 'archived' OR ? = 'archived'"];
  const params = [status || ''];
  if (status) { conds.push('status = ?'); params.push(status); }
  if (purpose) { conds.push('purpose = ?'); params.push(purpose); }
  if (domain) { conds.push('source_domain = ?'); params.push(domain); }
  if (q) { conds.push('(title LIKE ? OR source_url LIKE ?)'); const p = `%${q}%`; params.push(p, p); }

  const sql = `SELECT * FROM imported_articles WHERE ${conds.join(' AND ')}
    ORDER BY imported_at DESC LIMIT ? OFFSET ?`;
  const items = db.prepare(sql).all(...params, Math.min(200, Number(limit)), Math.max(0, Number(offset)));
  const total = db.prepare(`SELECT COUNT(*) AS n FROM imported_articles WHERE ${conds.join(' AND ')}`).get(...params).n;
  return { items: items.map(hydrate), total };
}

export function getImported(id) {
  const row = db.prepare('SELECT * FROM imported_articles WHERE id = ?').get(id);
  if (!row) return null;
  const images = db.prepare('SELECT * FROM imported_images WHERE imported_article_id = ?').all(id);
  return { article: hydrate(row), images };
}

export function archiveImported(id) {
  db.prepare(`UPDATE imported_articles SET status = 'archived' WHERE id = ?`).run(id);
  return true;
}

function hydrate(row) {
  if (!row) return null;
  const parseJson = (s) => { if (!s) return null; try { return JSON.parse(s); } catch { return null; } };
  return {
    id: row.id,
    sourceUrl: row.source_url,
    sourceDomain: row.source_domain,
    canonicalUrl: row.canonical_url,
    title: row.title,
    author: row.author,
    publishedAt: row.published_at,
    language: row.language_detected,
    contentHtml: row.content_html,
    contentText: row.content_text,
    excerpt: row.excerpt,
    wordCount: row.word_count,
    readingTimeMin: row.reading_time_min,
    extractionMethod: row.extraction_method,
    extractionConfidence: row.extraction_confidence,
    extractionWarnings: parseJson(row.extraction_warnings) || [],
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    ogImageUrl: row.og_image_url,
    schemaTypes: parseJson(row.schema_types) || [],
    internalLinksCount: row.internal_links_count,
    externalLinksCount: row.external_links_count,
    autoTags: parseJson(row.auto_tags) || [],
    userTags: parseJson(row.user_tags) || [],
    purpose: row.purpose,
    status: row.status,
    importedAt: row.imported_at,
    convertedToArticleId: row.converted_to_article_id,
  };
}
