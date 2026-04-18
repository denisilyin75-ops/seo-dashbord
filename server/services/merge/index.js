// Article Merge workflow — Phase 4 из docs/features/article-import-and-actions.md §6.
//
// Шаги:
//   1. planMerge(article_ids, params) — собирает источники, формирует prompt для Sonnet,
//      получает структурированный ответ (proposed_title, content, conflicts, redirects_plan),
//      сохраняет в merge_previews.
//   2. approveMerge(preview_id) — создаёт новую article, archive source, record 301 redirects.
//   3. rejectMerge(preview_id).
//
// Supreme-соответствие: preview-first (никаких auto-delete), conflicts явно surfaced,
// 301 redirects plan явный (не бэкэнд-side auto-push в WP — оператор сам применит).

import { randomUUID } from 'node:crypto';
import { db } from '../../db.js';

const MAX_SOURCES = 5;
const MAX_CONTENT_PER_SOURCE_CHARS = 15_000; // truncation to fit context window
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.6';

function genId(prefix) {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

function slugify(text) {
  // Только для fallback. Реальный URL оставляет RU как есть (cyr2lat на WP конвертнет).
  return (text || '')
    .toLowerCase()
    .replace(/[^\wа-я0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function hydrateSource(article) {
  return {
    id: article.id,
    title: article.title,
    url: article.url,
    type: article.type,
    wordCount: article.word_count || 0,
    content: (article.notes || '').slice(0, MAX_CONTENT_PER_SOURCE_CHARS),
    updatedAt: article.updated_at,
  };
}

// Парсит LLM output. Мы просим JSON в code-fence, выцепляем.
function parseMergeOutput(raw) {
  // Strip ```json ... ```
  const m = raw.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const candidate = m ? m[1] : raw;
  try {
    return JSON.parse(candidate);
  } catch (e) {
    // try substring of first { ... last }
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error(`LLM output не удалось распарсить как JSON: ${e.message}`);
  }
}

function buildMergePrompt(sources, params) {
  const keepTitleFrom = params.keep_title_from
    ? `Оператор указал — оставить title из article_id=${params.keep_title_from}.`
    : "Выбери лучший title из source'ов ИЛИ предложи новый, более полный.";

  return {
    system: `Ты — редактор, объединяющий 2-5 наших статей об одном продукте/теме в одну консолидированную.

Правила:
- Не выдумывай факты. Всё что есть в результате — должно быть хотя бы в одном source'е.
- Если source'ы противоречат друг другу в фактах (specs, цифры, даты) — surface как conflict.
- Deduplicate одинаковые абзацы.
- Preserve все уникальные факты из всех source'ов (если не дубликат).
- Proposed URL: если параметр не задан, оставь URL самого большого / самого посещаемого source'а (сохраняет SEO equity).
- Все остальные URL → 301 redirect в plan.
- Формат ответа: строго JSON без преамбулы (можешь обернуть в \`\`\`json ... \`\`\`), структура ниже.

${keepTitleFrom}`,
    user: `Source статьи (${sources.length}):\n\n${sources.map((s, i) => `=== Source ${i + 1} (id=${s.id}, type=${s.type}, ${s.wordCount} слов) ===
Title: ${s.title}
URL: ${s.url}
Updated: ${s.updatedAt}

Content:
${s.content}`).join('\n\n')}

Верни JSON:
{
  "proposed_title": "string",
  "proposed_url_slug": "/slug/",
  "proposed_content": "merged HTML",
  "proposed_excerpt": "краткое summary 120-160 симв",
  "proposed_faqs": [{ "q": "...", "a": "..." }],
  "conflicts": [
    { "topic": "Pump pressure", "a_claim": "15 bar (source 1)", "b_claim": "19 bar (source 2)", "recommendation": "15 bar", "reason": "matches manufacturer spec" }
  ],
  "redirects_plan": [
    { "from_url": "/old-slug/", "to_url": "/new-slug/", "reason": "superseded by merge" }
  ],
  "dedup_stats": {
    "total_source_paragraphs": N,
    "deduplicated": N,
    "unique_preserved": N
  }
}`,
  };
}

// Lazy-load AI клиентов — избежать цикла зависимостей.
async function getAi() {
  return import('../claude.js');
}

// PUBLIC API.

/**
 * Создаёт merge-preview через LLM (Sonnet) — консолидация 2-5 наших статей в одну.
 * Sync-run (5-30 сек). Phase 5 = background job если надо.
 *
 * @param {object} opts
 * @param {string} [opts.site_id] — если не задан, определяется из первой статьи
 * @param {string[]} opts.article_ids — 2-5 ID статей одного сайта
 * @param {object} [opts.params] — keep_title_from, model override
 * @param {string} [opts.created_by='operator']
 * @returns {Promise<object>} merge_preview row с proposed_content/conflicts/redirects_plan
 */
export async function planMerge({ site_id, article_ids, params = {}, created_by = 'operator' }) {
  if (!Array.isArray(article_ids) || article_ids.length < 2 || article_ids.length > MAX_SOURCES) {
    throw new Error(`article_ids: нужно 2-${MAX_SOURCES} ID`);
  }

  const placeholders = article_ids.map(() => '?').join(',');
  const sources = db.prepare(`SELECT * FROM articles WHERE id IN (${placeholders})`).all(...article_ids);
  if (sources.length !== article_ids.length) {
    throw new Error(`Не все статьи найдены (${sources.length}/${article_ids.length})`);
  }
  const siteIds = new Set(sources.map(s => s.site_id));
  if (siteIds.size > 1) {
    throw new Error('Все source articles должны принадлежать одному сайту (cross-site merge = Phase 5)');
  }
  const effectiveSiteId = site_id || sources[0].site_id;

  // Pre-insert preview row для tracking
  const id = genId('mp');
  db.prepare(`INSERT INTO merge_previews (id, site_id, source_article_ids, status)
    VALUES (?, ?, ?, 'generating')`).run(id, effectiveSiteId, JSON.stringify(article_ids));

  try {
    const hydrated = sources.map(hydrateSource);
    const { aiStatus, callOpenRouter, callAnthropic } = await getAi();
    const status = aiStatus();
    if (!status.configured) throw new Error('AI not configured');

    const model = params.model || (status.provider === 'openrouter' ? DEFAULT_MODEL : 'claude-sonnet-4-6');
    const prompts = buildMergePrompt(hydrated, params);
    const call = status.provider === 'openrouter' ? callOpenRouter : callAnthropic;

    const r = await call({ system: prompts.system, userMessage: prompts.user, maxTokens: 6000, model });
    if (!r) throw new Error('AI returned null');

    const parsed = parseMergeOutput(r.text);

    // Fallback: если LLM не вернул proposed_url_slug, берём slug самого свежего source.
    const fallbackSource = [...hydrated].sort((a, b) => (b.wordCount - a.wordCount))[0];
    const proposedSlug = parsed.proposed_url_slug || fallbackSource.url || '/' + slugify(parsed.proposed_title) + '/';

    // Cost estimate (roughly Sonnet $3/1M input + $15/1M output; avg)
    const tokens = r.tokensUsed || 0;
    const costUsd = (tokens / 1000) * 0.009;

    db.prepare(`UPDATE merge_previews SET
      proposed_title = ?, proposed_url_slug = ?, proposed_content = ?, proposed_excerpt = ?,
      proposed_faqs = ?, redirects_plan = ?, conflicts = ?, dedup_stats = ?,
      llm_provider = ?, llm_model = ?, llm_tokens_used = ?, llm_cost_usd = ?,
      status = 'pending_review'
      WHERE id = ?`).run(
        parsed.proposed_title || fallbackSource.title,
        proposedSlug,
        parsed.proposed_content || '',
        parsed.proposed_excerpt || '',
        JSON.stringify(parsed.proposed_faqs || []),
        JSON.stringify(parsed.redirects_plan || []),
        JSON.stringify(parsed.conflicts || []),
        JSON.stringify(parsed.dedup_stats || {}),
        status.provider, model, tokens, costUsd,
        id,
      );

    return getMergePreview(id);
  } catch (e) {
    db.prepare(`UPDATE merge_previews SET status = 'failed', error = ? WHERE id = ?`).run(e.message, id);
    throw e;
  }
}

export function getMergePreview(id) {
  const row = db.prepare('SELECT * FROM merge_previews WHERE id = ?').get(id);
  if (!row) return null;
  return hydratePreview(row);
}

export function listMergePreviews({ site_id, status, limit = 30 } = {}) {
  const conds = [];
  const params = [];
  if (site_id) { conds.push('site_id = ?'); params.push(site_id); }
  if (status)  { conds.push('status = ?');  params.push(status); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const sql = `SELECT * FROM merge_previews ${where} ORDER BY created_at DESC LIMIT ?`;
  const rows = db.prepare(sql).all(...params, Math.min(100, Number(limit)));
  return rows.map(hydratePreview);
}

// Approve — создаёт новую статью, archive source, pre-fill redirects.
export function approveMerge(id, { adjustments = {}, by = 'operator' } = {}) {
  const preview = db.prepare('SELECT * FROM merge_previews WHERE id = ?').get(id);
  if (!preview) throw new Error('Preview not found');
  if (preview.status !== 'pending_review') {
    throw new Error(`Preview статус ${preview.status}, approve невозможен`);
  }

  const sourceIds = JSON.parse(preview.source_article_ids);
  const title = adjustments.title || preview.proposed_title;
  const url = adjustments.url_slug || preview.proposed_url_slug;
  const content = adjustments.content || preview.proposed_content;

  const newId = genId('art');
  const tx = db.transaction(() => {
    // 1. Create merged article
    db.prepare(`INSERT INTO articles
      (id, site_id, title, url, type, status, notes, content_text, tags, word_count, merged_from_ids, updated_at)
      VALUES (?, ?, ?, ?, 'review', 'draft', ?, ?, ?, ?, ?, datetime('now'))`).run(
        newId, preview.site_id, title, url,
        content,                                    // notes (HTML)
        (content || '').replace(/<[^>]+>/g, ' '),   // content_text (stripped)
        '[]',                                        // tags
        (content || '').split(/\s+/).length,
        JSON.stringify(sourceIds),
      );

    // 2. Archive source articles + link to superseded_by
    for (const sid of sourceIds) {
      db.prepare(`UPDATE articles SET status = 'archived', superseded_by_id = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(newId, sid);
    }

    // 3. Update preview row
    db.prepare(`UPDATE merge_previews SET
      status = 'approved', decided_at = datetime('now'), decided_by = ?, result_article_id = ?
      WHERE id = ?`).run(by, newId, id);
  });
  tx();

  return { article_id: newId, redirects_to_apply: JSON.parse(preview.redirects_plan || '[]') };
}

export function rejectMerge(id, { reason, by = 'operator' } = {}) {
  db.prepare(`UPDATE merge_previews SET
    status = 'rejected', decided_at = datetime('now'), decided_by = ?, error = ?
    WHERE id = ?`).run(by, reason || null, id);
  return getMergePreview(id);
}

function hydratePreview(row) {
  const parseJson = (s) => { if (!s) return null; try { return JSON.parse(s); } catch { return null; } };
  return {
    id: row.id,
    siteId: row.site_id,
    sourceArticleIds: parseJson(row.source_article_ids) || [],
    proposedTitle: row.proposed_title,
    proposedUrlSlug: row.proposed_url_slug,
    proposedContent: row.proposed_content,
    proposedExcerpt: row.proposed_excerpt,
    proposedFaqs: parseJson(row.proposed_faqs) || [],
    redirectsPlan: parseJson(row.redirects_plan) || [],
    conflicts: parseJson(row.conflicts) || [],
    dedupStats: parseJson(row.dedup_stats) || {},
    llmProvider: row.llm_provider,
    llmModel: row.llm_model,
    llmTokensUsed: row.llm_tokens_used,
    llmCostUsd: row.llm_cost_usd,
    createdAt: row.created_at,
    status: row.status,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
    resultArticleId: row.result_article_id,
    error: row.error,
  };
}
