/**
 * Article revisions — журнал всех изменений статьи.
 *
 * Любое действие, меняющее статью (manual edit, WP sync, AI refresh,
 * price update, и т.д.), должно вызывать logRevision(). Это фундамент
 * для Content Freshness Agent — без истории нельзя судить об актуальности.
 */

import { db } from '../db.js';

export const REVISION_KINDS = {
  MANUAL_EDIT:      'manual_edit',       // ✏️ ручное редактирование
  WP_SYNC_PULL:     'wp_sync_pull',      // 📥 pull из WordPress
  WP_SYNC_PUSH:     'wp_sync_push',      // 📤 push в WordPress
  AI_REFRESH:       'ai_refresh',        // ✨ полный AI-refresh
  AI_PRICE_UPDATE:  'ai_price_update',   // 💰 автообновление цен
  AI_BRIEF:         'ai_brief',          // 📝 сгенерирован AI-бриф
  AUTO_SEO:         'auto_seo',          // 🔍 автофикс SEO
  IMPORT:           'import',            // 🆕 первичный импорт
  OFFER_REPLACED:   'offer_replaced',    // 🔗 замена битой партнёрской ссылки
  SYSTEM_NOTE:      'system_note',       // 💡 системная заметка
};

/**
 * @param {string} articleId — может быть null для site-level событий
 * @param {string} siteId
 * @param {string} kind — один из REVISION_KINDS
 * @param {string} summary — короткая ремарка (≤ 200 симв рекомендуется)
 * @param {object} [detail] — JSON-детали (чейнджсет, diff, метаданные)
 * @param {string} [actor='system'] — user email / 'system' / 'ai'
 */
export function logRevision(articleId, siteId, kind, summary, detail = null, actor = 'system') {
  try {
    db.prepare(`INSERT INTO article_revisions
      (article_id, site_id, kind, summary, detail, actor)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      articleId || null,
      siteId || null,
      kind,
      summary.slice(0, 500),
      detail ? JSON.stringify(detail) : null,
      actor,
    );
  } catch (e) {
    console.error('[revisions] logRevision failed:', e.message);
  }
}

/**
 * Массовая запись — для операций вроде "засинкали 366 постов".
 * Вместо 366 отдельных записей создаёт одну с summary "засинкано 366 постов".
 */
export function logBulkRevision(siteId, kind, summary, detail = null, actor = 'system') {
  logRevision(null, siteId, kind, summary, detail, actor);
}

/**
 * Получить историю ревизий статьи (последние N).
 */
export function listRevisions(articleId, { limit = 50 } = {}) {
  const rows = db.prepare(
    `SELECT id, article_id, site_id, kind, summary, detail, actor, created_at
     FROM article_revisions
     WHERE article_id = ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).all(articleId, limit);
  return rows.map(hydrate);
}

export function listSiteRevisions(siteId, { limit = 100 } = {}) {
  const rows = db.prepare(
    `SELECT id, article_id, site_id, kind, summary, detail, actor, created_at
     FROM article_revisions
     WHERE site_id = ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).all(siteId, limit);
  return rows.map(hydrate);
}

function hydrate(row) {
  return {
    id: row.id,
    articleId: row.article_id,
    siteId: row.site_id,
    kind: row.kind,
    summary: row.summary,
    detail: row.detail ? safeParse(row.detail) : null,
    actor: row.actor,
    createdAt: row.created_at,
  };
}

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
