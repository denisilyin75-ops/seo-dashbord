// SEO Hygiene checks — deterministic per-post rules.
// Вход: rendered HTML страницы + meta.
// Выход: список issues { signal_code, severity, message, detail, suggestion, auto_fixable }.
//
// Rules per design doc §2.3:
//   - H1: ровно один, не пустой, ≤70 символов
//   - Meta description: 120-160 символов
//   - URL slug: проверка оставлена (требует external view)
//   - Alt texts: все <img> с alt, длиной 10-125 символов
//   - Internal links: ≥3 ссылок на внутренние страницы (определяется по siteBaseUrl)
//   - External links ratio: <30% от total внешних
//   - Images lazy loading: <img loading="lazy"> для НЕ-первых 2 картинок
//   - Headings hierarchy: H2→H3→H4 без пропусков (не начинаем с H3 сразу после H1)

import { JSDOM } from 'jsdom';

function makeIssue(code, severity, message, opts = {}) {
  return {
    signal_category: 'seo_hygiene',
    signal_code: code,
    severity,
    message,
    detail: opts.detail ? JSON.stringify(opts.detail) : null,
    suggestion: opts.suggestion || null,
    auto_fixable: opts.autoFixable ? 1 : 0,
  };
}

// Главный entry-point. html — полный HTML страницы (или body innerHTML).
// siteBaseUrl — https://popolkam.ru — для определения internal vs external.
export function checkSeoHygiene({ html, siteBaseUrl, metaDescription }) {
  const issues = [];
  const stats = {
    h1_count: 0,
    word_count: 0,
    image_count: 0,
    internal_links_count: 0,
    external_links_count: 0,
  };

  if (!html || typeof html !== 'string') {
    issues.push(makeIssue('empty_html', 'red', 'HTML не был получен или пуст'));
    return { issues, stats };
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // --- H1 check ---
  const h1s = Array.from(doc.querySelectorAll('h1'));
  stats.h1_count = h1s.length;
  if (h1s.length === 0) {
    issues.push(makeIssue('missing_h1', 'red', 'Нет H1 на странице',
      { suggestion: 'Добавьте один H1 с основным ключевым словом темы' }));
  } else if (h1s.length > 1) {
    issues.push(makeIssue('multiple_h1', 'red', `${h1s.length} H1 на странице (должен быть один)`,
      { detail: { count: h1s.length, texts: h1s.map(h => h.textContent?.trim()).slice(0, 3) },
        suggestion: 'Оставьте один H1, остальные замените на H2' }));
  } else {
    const h1 = h1s[0];
    const text = h1.textContent?.trim() || '';
    if (!text) {
      issues.push(makeIssue('empty_h1', 'red', 'H1 пустой'));
    } else if (text.length > 70) {
      issues.push(makeIssue('h1_too_long', 'yellow',
        `H1 слишком длинный: ${text.length} символов (оптимум ≤70)`,
        { detail: { length: text.length, text }, suggestion: 'Сократите до 50-70 символов' }));
    }
  }

  // --- Meta description ---
  if (metaDescription == null) {
    // Не всегда доступно. Попробуем из HTML.
    const meta = doc.querySelector('meta[name="description"]');
    metaDescription = meta?.getAttribute('content') || '';
  }
  if (!metaDescription) {
    issues.push(makeIssue('missing_meta_description', 'red', 'Нет meta description',
      { suggestion: 'Добавьте meta description 120-160 символов с primary keyword' }));
  } else {
    const len = metaDescription.length;
    if (len < 120) {
      issues.push(makeIssue('meta_description_too_short', 'yellow',
        `Meta description ${len} символов (минимум 120)`,
        { detail: { length: len, text: metaDescription }, suggestion: 'Дополните до 120-160 символов' }));
    } else if (len > 160) {
      issues.push(makeIssue('meta_description_too_long', 'yellow',
        `Meta description ${len} символов (лимит 160 — обрежется в SERP)`,
        { detail: { length: len, text: metaDescription }, suggestion: 'Сократите до 150-160 символов, оставив primary keyword в начале' }));
    }
  }

  // --- Headings hierarchy ---
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(h => ({ level: Number(h.tagName.charAt(1)), text: h.textContent?.trim() }));

  let prevLevel = 0;
  for (const h of headings) {
    if (prevLevel > 0 && h.level - prevLevel > 1) {
      issues.push(makeIssue('heading_skip', 'yellow',
        `Пропущен уровень заголовков: H${prevLevel} → H${h.level}`,
        { detail: { from: prevLevel, to: h.level, text: h.text?.slice(0, 80) },
          suggestion: `Добавьте H${prevLevel + 1} между ними или понизьте H${h.level} до H${prevLevel + 1}` }));
      break; // одно нарушение достаточно для флага
    }
    prevLevel = h.level;
  }

  // --- Images: alt + lazy ---
  const imgs = Array.from(doc.querySelectorAll('img'));
  stats.image_count = imgs.length;
  let missingAlt = 0;
  let shortAlt = 0;
  let longAlt = 0;
  let missingLazy = 0;
  imgs.forEach((img, idx) => {
    const alt = img.getAttribute('alt');
    if (alt == null || alt.trim() === '') missingAlt++;
    else {
      const len = alt.length;
      if (len < 10) shortAlt++;
      if (len > 125) longAlt++;
    }
    // Первые 2 картинки могут быть above-the-fold → не lazy, иначе бы плохо для LCP.
    if (idx >= 2) {
      const loading = img.getAttribute('loading');
      if (loading !== 'lazy') missingLazy++;
    }
  });
  if (missingAlt > 0) {
    issues.push(makeIssue('missing_alt', 'red',
      `${missingAlt} из ${imgs.length} изображений без alt`,
      { detail: { count: missingAlt, total: imgs.length },
        suggestion: 'Добавьте alt с описанием 10-125 символов. Accessibility + SEO.',
        autoFixable: false }));
  }
  if (shortAlt > 0) {
    issues.push(makeIssue('short_alt', 'yellow',
      `${shortAlt} alt-атрибутов короче 10 символов`,
      { detail: { count: shortAlt } }));
  }
  if (longAlt > 0) {
    issues.push(makeIssue('long_alt', 'yellow',
      `${longAlt} alt-атрибутов длиннее 125 символов (может быть keyword stuffing)`,
      { detail: { count: longAlt } }));
  }
  if (missingLazy > 0 && imgs.length > 2) {
    issues.push(makeIssue('missing_lazy_loading', 'yellow',
      `${missingLazy} картинок ниже fold без loading="lazy"`,
      { detail: { count: missingLazy },
        suggestion: 'Добавьте loading="lazy" ко всем <img> кроме первых 1-2',
        autoFixable: true }));
  }

  // --- Links: internal ratio ---
  const links = Array.from(doc.querySelectorAll('a[href]'));
  let baseHost = '';
  try { baseHost = new URL(siteBaseUrl || 'https://example.com').host; } catch { /* ignore */ }

  for (const a of links) {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    try {
      const url = new URL(href, siteBaseUrl || 'https://example.com');
      if (!baseHost || url.host === baseHost) stats.internal_links_count++;
      else stats.external_links_count++;
    } catch {
      // malformed href → skip
    }
  }

  if (stats.internal_links_count < 3) {
    issues.push(makeIssue('few_internal_links', 'yellow',
      `${stats.internal_links_count} внутренних ссылок (рекомендуется ≥3)`,
      { detail: { count: stats.internal_links_count },
        suggestion: 'Добавьте ссылки на pillar-статьи, сравнения, смежные обзоры' }));
  }

  const totalLinks = stats.internal_links_count + stats.external_links_count;
  if (totalLinks >= 10) {
    const externalRatio = stats.external_links_count / totalLinks;
    if (externalRatio > 0.3) {
      issues.push(makeIssue('high_external_ratio', 'yellow',
        `${Math.round(externalRatio * 100)}% ссылок — внешние (лимит 30%)`,
        { detail: { internal: stats.internal_links_count, external: stats.external_links_count },
          suggestion: 'Замените часть external на internal ссылки на наши страницы' }));
    }
  }

  // --- Word count (очень грубо: text of body without script/style) ---
  const body = doc.querySelector('body') || doc;
  const clone = body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
  const text = clone.textContent || '';
  stats.word_count = text.trim().split(/\s+/).filter(w => w.length > 1).length;

  // --- Score calculation ---
  // Base 100, -20 за red, -8 за yellow. Min 0.
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'red') score -= 20;
    else if (i.severity === 'yellow') score -= 8;
  }
  score = Math.max(0, Math.min(100, score));

  return { issues, stats, score };
}
