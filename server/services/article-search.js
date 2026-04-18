import { db } from '../db.js';

// Экранирует пользовательский запрос под синтаксис FTS5.
// Пустой query → null (caller не использует FTS join).
// Phrase в кавычках — сохраняем как есть.
// Иначе: разбиваем на tokens, удаляем опасные символы, добавляем AND.
// Wildcard-хвост (автомат*) — поддерживаем через prefix.
export function ftsSanitize(q) {
  if (!q || typeof q !== 'string') return null;
  const trimmed = q.trim();
  if (!trimmed) return null;

  // Phrase search: "..."
  const phrases = [];
  const withoutPhrases = trimmed.replace(/"([^"]+)"/g, (_, inner) => {
    phrases.push(`"${inner.replace(/"/g, '')}"`);
    return ' ';
  });

  const tokens = withoutPhrases
    .split(/\s+/)
    .map(t => t.replace(/[*^:(){}\[\]!,;]/g, '').trim())
    .filter(Boolean)
    .map(t => t.endsWith('*') ? t : t + '*'); // prefix match по каждому слову

  const all = [...phrases, ...tokens];
  return all.length ? all.join(' AND ') : null;
}

// Парсит JSON-массив тегов из строки; возвращает [] на невалидном.
function parseTags(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(t => typeof t === 'string') : [];
  } catch { return []; }
}

const SORT_MAP = {
  modified_desc:  'a.updated_at DESC',
  modified_asc:   'a.updated_at ASC',
  created_desc:   'a.created_at DESC',
  created_asc:    'a.created_at ASC',
  title_asc:      'a.title COLLATE NOCASE ASC',
  title_desc:     'a.title COLLATE NOCASE DESC',
  sessions_desc:  'a.sessions DESC',
  clicks_desc:    'a.clicks DESC',
  word_count_desc:'a.word_count DESC',
};

// Главный search API. Возвращает { items, total, facets }.
//
// filters: {
//   site_id?         — конкретный сайт (иначе по всем сайтам)
//   q?               — полнотекстовый поиск
//   type?            — review | comparison | guide | quiz | tool | category
//   status?          — published | draft | planned | archived
//   tags?            — массив строк (AND — все должны быть)
//   word_min?, word_max?
//   quality_min?, quality_max?
//   has_url?         — boolean (есть ли url)
//   date_from?, date_to? — фильтр по updated_at
//   sort?            — ключ из SORT_MAP, default 'modified_desc'
//   limit?, offset?
// }
export function searchArticles(filters = {}) {
  const params = [];
  const whereParts = [];
  let useFts = false;
  let ftsQuery = null;

  if (filters.q) {
    ftsQuery = ftsSanitize(filters.q);
    if (ftsQuery) useFts = true;
  }

  if (filters.site_id) {
    whereParts.push('a.site_id = ?');
    params.push(filters.site_id);
  }
  if (filters.type) {
    whereParts.push('a.type = ?');
    params.push(filters.type);
  }
  if (filters.status) {
    whereParts.push('a.status = ?');
    params.push(filters.status);
  }
  if (filters.word_min != null) {
    whereParts.push('a.word_count >= ?');
    params.push(Number(filters.word_min));
  }
  if (filters.word_max != null) {
    whereParts.push('a.word_count <= ?');
    params.push(Number(filters.word_max));
  }
  if (filters.quality_min != null) {
    whereParts.push('a.quality_score >= ?');
    params.push(Number(filters.quality_min));
  }
  if (filters.quality_max != null) {
    whereParts.push('a.quality_score <= ?');
    params.push(Number(filters.quality_max));
  }
  if (filters.has_url === true || filters.has_url === 'true') {
    whereParts.push(`a.url IS NOT NULL AND a.url != '' AND a.url != '/'`);
  }
  if (filters.date_from) {
    whereParts.push('a.updated_at >= ?');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    whereParts.push('a.updated_at <= ?');
    params.push(filters.date_to);
  }

  // tags: SQLite json_each проверка что все заявленные tags есть в массиве.
  const tagList = Array.isArray(filters.tags) ? filters.tags : (filters.tags ? [filters.tags] : []);
  for (const tag of tagList) {
    whereParts.push(`EXISTS (SELECT 1 FROM json_each(a.tags) WHERE json_each.value = ?)`);
    params.push(tag);
  }

  const baseJoin = useFts
    ? `FROM articles_fts fts JOIN articles a ON a.rowid = fts.rowid WHERE articles_fts MATCH ?`
    : `FROM articles a WHERE 1=1`;

  const baseParams = useFts ? [ftsQuery, ...params] : [...params];

  const whereSql = whereParts.length ? ' AND ' + whereParts.join(' AND ') : '';
  const sort = SORT_MAP[filters.sort] || SORT_MAP.modified_desc;
  const limit = Math.min(Number(filters.limit) || 50, 500);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const itemsSql = `SELECT a.* ${baseJoin}${whereSql} ORDER BY ${sort} LIMIT ? OFFSET ?`;
  const items = db.prepare(itemsSql).all(...baseParams, limit, offset);

  const totalSql = `SELECT COUNT(*) AS n ${baseJoin}${whereSql}`;
  const total = db.prepare(totalSql).get(...baseParams).n;

  // Facets — параллельные агрегаты. Для скорости считаем только по items в пределах ±500.
  // При необходимости facet'ы могут игнорировать тот фильтр, к которому относятся;
  // это паттерн refinement-фасетов. MVP — все фасеты полные (учитывают все фильтры).
  const facetsParams = baseParams;
  const facets = {
    byType:   db.prepare(`SELECT a.type AS k, COUNT(*) AS n ${baseJoin}${whereSql} GROUP BY a.type`).all(...facetsParams),
    byStatus: db.prepare(`SELECT a.status AS k, COUNT(*) AS n ${baseJoin}${whereSql} GROUP BY a.status`).all(...facetsParams),
    bySite:   db.prepare(`SELECT a.site_id AS k, COUNT(*) AS n ${baseJoin}${whereSql} GROUP BY a.site_id`).all(...facetsParams),
  };

  return { items, total, facets };
}

// Hydrate — преобразует row БД в API-формат.
// tags парсится из JSON, остальные поля как есть (camelCase).
export function hydrateArticle(row) {
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    wpPostId: row.wp_post_id,
    title: row.title,
    url: row.url,
    type: row.type,
    status: row.status,
    sessions: row.sessions,
    clicks: row.clicks,
    cr: row.cr,
    notes: row.notes,
    tags: parseTags(row.tags),
    wordCount: row.word_count || 0,
    qualityScore: row.quality_score,
    wpLastSync: row.wp_last_sync,
    created: row.created_at,
    updated: row.updated_at,
  };
}
