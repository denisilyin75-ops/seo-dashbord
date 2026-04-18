// Schema.org JSON-LD validator.
// Парсит все <script type="application/ld+json"> блоки, проверяет:
//   - валидный JSON
//   - нет дублей одного и того же @type (часто Rank Math + custom дают дубль Person)
//   - обязательные поля для Article, Review, FAQPage, BreadcrumbList, Organization
//
// Не делаем полную schema.org validation (это уже Google Rich Results Test) —
// только ловим типовые ошибки которые реально ломают snippet.

import { JSDOM } from 'jsdom';

function makeIssue(code, severity, message, opts = {}) {
  return {
    signal_category: 'schema',
    signal_code: code,
    severity,
    message,
    detail: opts.detail ? JSON.stringify(opts.detail) : null,
    suggestion: opts.suggestion || null,
    auto_fixable: opts.autoFixable ? 1 : 0,
  };
}

// Required/recommended fields по типу schema. Source: schema.org + Google structured data docs.
const REQUIRED = {
  Article: ['headline', 'author', 'datePublished'],
  NewsArticle: ['headline', 'author', 'datePublished'],
  BlogPosting: ['headline', 'author', 'datePublished'],
  Review: ['itemReviewed', 'reviewRating', 'author'],
  FAQPage: ['mainEntity'],
  BreadcrumbList: ['itemListElement'],
  Product: ['name'],
  Person: ['name'],
  Organization: ['name', 'url'],
};

// Flattens @graph → array of entities; single entity → [entity]
function flattenEntities(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed.flatMap(flattenEntities);
  if (parsed['@graph'] && Array.isArray(parsed['@graph'])) return parsed['@graph'];
  return [parsed];
}

function getType(entity) {
  const t = entity['@type'];
  if (Array.isArray(t)) return t[0];
  return typeof t === 'string' ? t : null;
}

export function checkSchema({ html }) {
  const issues = [];
  const stats = { jsonld_blocks: 0, entities: 0, types: {}, duplicate_types: [] };

  if (!html) {
    return { issues: [makeIssue('no_html', 'red', 'HTML недоступен')], stats, score: 0 };
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
  stats.jsonld_blocks = scripts.length;

  if (scripts.length === 0) {
    issues.push(makeIssue('no_schema', 'yellow',
      'Нет JSON-LD schema на странице',
      { suggestion: 'Добавьте Article/Review/FAQ schema через Rank Math. Без structured data — потеря rich snippets в SERP.' }));
    return { issues, stats, score: 40 };
  }

  const allEntities = [];
  for (let i = 0; i < scripts.length; i++) {
    const content = scripts[i].textContent || '';
    if (!content.trim()) {
      issues.push(makeIssue('empty_jsonld', 'yellow', `Пустой JSON-LD блок #${i + 1}`));
      continue;
    }
    try {
      const parsed = JSON.parse(content);
      const entities = flattenEntities(parsed);
      allEntities.push(...entities);
    } catch (e) {
      issues.push(makeIssue('invalid_json', 'red',
        `Невалидный JSON в ld+json блоке #${i + 1}: ${e.message}`,
        { suggestion: 'Schema нужно исправить — Google игнорирует невалидный JSON-LD' }));
    }
  }

  stats.entities = allEntities.length;

  // Type counting for dup detection
  for (const e of allEntities) {
    const type = getType(e);
    if (!type) continue;
    stats.types[type] = (stats.types[type] || 0) + 1;
  }

  // Duplicates: Person/Organization/Article более одного = подозрительно.
  // WebSite/WebPage/BreadcrumbList могут легитимно повторяться в @graph, не алертим.
  const DUP_SENSITIVE = ['Person', 'Organization', 'Article', 'Review', 'FAQPage', 'Product'];
  for (const t of DUP_SENSITIVE) {
    if (stats.types[t] > 1) {
      stats.duplicate_types.push(t);
      issues.push(makeIssue('duplicate_schema_type', 'red',
        `Дубль schema ${t} (${stats.types[t]} экз.)`,
        { detail: { type: t, count: stats.types[t] },
          suggestion: `Оставьте один ${t}. Часто Rank Math + ручной custom = дубль, Google penalty.` }));
    }
  }

  // Required fields per entity
  for (const entity of allEntities) {
    const type = getType(entity);
    if (!type || !REQUIRED[type]) continue;
    const missing = REQUIRED[type].filter(f => entity[f] == null);
    if (missing.length) {
      issues.push(makeIssue('missing_required_fields', 'yellow',
        `${type} schema без обязательных полей: ${missing.join(', ')}`,
        { detail: { type, missing, id: entity['@id'] },
          suggestion: `Заполните ${missing.join(', ')} для корректного rich snippet` }));
    }
  }

  // Review: reviewRating должен иметь ratingValue + bestRating
  for (const entity of allEntities) {
    if (getType(entity) !== 'Review') continue;
    const rating = entity.reviewRating;
    if (!rating) continue;
    if (rating.ratingValue == null) {
      issues.push(makeIssue('review_rating_missing_value', 'yellow',
        'Review.reviewRating без ratingValue',
        { suggestion: 'Добавьте ratingValue (напр. 8.2)' }));
    }
    if (rating.bestRating == null) {
      issues.push(makeIssue('review_rating_missing_best', 'yellow',
        'Review.reviewRating без bestRating',
        { suggestion: 'Добавьте bestRating (у нас обычно 10)' }));
    }
  }

  // Score
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'red') score -= 20;
    else if (i.severity === 'yellow') score -= 6;
  }
  score = Math.max(0, Math.min(100, score));

  return { issues, stats, score };
}
