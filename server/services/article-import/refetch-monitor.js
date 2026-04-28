// Re-fetch Monitor — periodically re-fetches imported_articles с заданным
// refetch_interval_days, сравнивает content_hash, записывает changes.
//
// Use case: «Конкурент обновил свой best-of-X — у нас сигнал что нужно тоже
// освежить наш обзор». Daily Brief показывает unseen changes.

import crypto from 'node:crypto';
import { db } from '../../db.js';

const USER_AGENT = 'Popolkam SCC Refetch Monitor (+research)';
const FETCH_TIMEOUT_MS = 25_000;

function sha256(text) {
  return crypto.createHash('sha256').update(text || '', 'utf8').digest('hex');
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru,en;q=0.9' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    clearTimeout(t);
    return null;
  }
}

/**
 * Считает что imported_article надо re-fetch'ить:
 * refetch_interval_days задан, и last_refetch_at + interval уже в прошлом.
 */
export function findDueForRefetch({ limit = 50 } = {}) {
  return db.prepare(`SELECT * FROM imported_articles
    WHERE status = 'active'
      AND refetch_interval_days IS NOT NULL
      AND refetch_interval_days > 0
      AND (
        last_refetch_at IS NULL
        OR datetime(last_refetch_at, '+' || refetch_interval_days || ' days') <= datetime('now')
      )
    ORDER BY last_refetch_at ASC
    LIMIT ?`).all(limit);
}

/**
 * Re-fetch одной article + diff detection.
 * @param {object} article — row из imported_articles
 * @returns {Promise<{ changed: boolean, change_type?, error?: string }>}
 */
export async function refetchOne(article) {
  const html = await fetchHtml(article.source_url);
  if (!html) {
    db.prepare(`UPDATE imported_articles SET last_refetch_at = datetime('now') WHERE id = ?`)
      .run(article.id);
    return { changed: false, error: 'fetch_failed' };
  }

  // Lazy import Readability+JSDOM (heavy, no need for healthy fetch)
  const { JSDOM } = await import('jsdom');
  const { Readability } = await import('@mozilla/readability');

  const dom = new JSDOM(html, { url: article.source_url });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();
  if (!parsed) {
    db.prepare(`UPDATE imported_articles SET last_refetch_at = datetime('now') WHERE id = ?`)
      .run(article.id);
    return { changed: false, error: 'readability_failed' };
  }

  const newHash = sha256(parsed.textContent || '');
  const oldHash = article.content_hash;

  if (newHash === oldHash) {
    // No change — just bump last_refetch_at
    db.prepare(`UPDATE imported_articles SET last_refetch_at = datetime('now') WHERE id = ?`)
      .run(article.id);
    return { changed: false };
  }

  // Detected change — record + update record
  const newTitle = parsed.title || article.title;
  const newWordCount = (parsed.textContent || '').trim().split(/\s+/).filter(w => w.length > 1).length;

  let changeType = 'content';
  if (newTitle !== article.title) changeType = 'title';

  db.prepare(`INSERT INTO imported_article_changes
    (imported_article_id, change_type, old_hash, new_hash, old_title, new_title, old_word_count, new_word_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      article.id, changeType, oldHash, newHash,
      article.title, newTitle, article.word_count, newWordCount,
    );

  // Update master record
  db.prepare(`UPDATE imported_articles SET
    content_hash = ?, title = ?, content_html = ?, content_text = ?,
    word_count = ?, last_refetch_at = datetime('now')
    WHERE id = ?`).run(
      newHash, newTitle, parsed.content || article.content_html,
      (parsed.textContent || '').slice(0, 500_000),
      newWordCount, article.id,
    );

  return { changed: true, change_type: changeType, oldTitle: article.title, newTitle, wordDelta: newWordCount - (article.word_count || 0) };
}

/**
 * Process all due articles — для cron daily.
 */
export async function processDueRefetches({ limit = 50 } = {}) {
  const due = findDueForRefetch({ limit });
  let changed = 0, unchanged = 0, errors = 0;
  for (const article of due) {
    try {
      const r = await refetchOne(article);
      if (r.changed) changed++;
      else if (r.error) errors++;
      else unchanged++;
    } catch (e) {
      errors++;
    }
  }
  return { processed: due.length, changed, unchanged, errors };
}

/**
 * Список unseen changes для Daily Brief / UI.
 */
export function listUnseenChanges({ limit = 20 } = {}) {
  return db.prepare(`SELECT
      ch.*,
      ia.source_url, ia.source_domain, ia.purpose
    FROM imported_article_changes ch
    JOIN imported_articles ia ON ia.id = ch.imported_article_id
    WHERE ch.seen_at IS NULL
    ORDER BY ch.detected_at DESC
    LIMIT ?`).all(limit);
}

export function markChangeSeen(id) {
  db.prepare(`UPDATE imported_article_changes SET seen_at = datetime('now') WHERE id = ?`).run(id);
}
