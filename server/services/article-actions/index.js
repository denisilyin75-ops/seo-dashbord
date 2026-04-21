// Article Actions service — Phase 3.
//
// Поддерживает действия над imported_articles + our articles:
//   - translate: source HTML → целевой язык через Sonnet
//   - rewrite_preserve: переписывает сохраняя структуру (для research summary)
//   - rewrite_voice: переписывает в голосе персоны (Phase 3b — пока placeholder)
//   - structural_analysis: outline + topics + missing vs our template (Haiku)
//   - fact_extraction: stats с ссылками (Haiku)
//
// PDF (Phase 3b) и merge (Phase 5) — отдельные модули.
// Local LLM (когда online) — через claude.js provider routing.

import { randomUUID } from 'node:crypto';
import { db } from '../../db.js';
import { trackLlmCall, checkSiteBudget } from '../llm-tracker.js';

const ACTION_TYPES = [
  'translate',
  'rewrite_preserve',
  'rewrite_voice',
  'structural_analysis',
  'fact_extraction',
];

// Цена-estimate для UI feedback (USD). Phase 3 — только cloud; Phase 2+ — local Qwen.
const COST_ESTIMATES = {
  translate:           { per_1k_in: 0.003, per_1k_out: 0.015, model: 'sonnet' },
  rewrite_preserve:    { per_1k_in: 0.003, per_1k_out: 0.015, model: 'sonnet' },
  rewrite_voice:       { per_1k_in: 0.003, per_1k_out: 0.015, model: 'sonnet' },
  structural_analysis: { per_1k_in: 0.00025, per_1k_out: 0.00125, model: 'haiku' },
  fact_extraction:     { per_1k_in: 0.00025, per_1k_out: 0.00125, model: 'haiku' },
};

function loadSource(source_type, source_id) {
  if (source_type === 'imported_article') {
    return db.prepare('SELECT * FROM imported_articles WHERE id = ?').get(source_id);
  } else if (source_type === 'article') {
    return db.prepare('SELECT * FROM articles WHERE id = ?').get(source_id);
  }
  return null;
}

function getSourceContent(source_type, row) {
  if (source_type === 'imported_article') {
    return {
      title: row.title,
      contentHtml: row.content_html || '',
      contentText: row.content_text || '',
      language: row.language_detected,
    };
  }
  // our article — пока у нас нет body в SCC (он в WP); используем notes как proxy
  return {
    title: row.title,
    contentHtml: row.notes || '',
    contentText: row.notes || '',
    language: 'ru',
  };
}

// Lazy import чтобы не создавать цикл.
async function getAiClients() {
  return import('../claude.js');
}

// Выбор модели: cheap для bulk, quality для publication-level.
function pickModel(action_type, provider) {
  const c = COST_ESTIMATES[action_type];
  if (provider === 'openrouter') {
    return c.model === 'haiku' ? 'anthropic/claude-haiku-4.5' : 'anthropic/claude-sonnet-4.6';
  }
  return c.model === 'haiku' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6';
}

// --- Prompts per action ---

function buildTranslatePrompt({ targetLang, content, glossary }) {
  const glossaryLine = glossary && Object.keys(glossary).length
    ? '\nGlossary (обязательно для терминов): ' + Object.entries(glossary).map(([a,b]) => `${a} = ${b}`).join('; ')
    : '';
  return {
    system: `Ты — профессиональный переводчик тексов про бытовую технику. Переводи точно, без отсебятины, сохраняя HTML-разметку (ссылки, жирный, списки) неизменной. Не меняй URLs внутри ссылок.${glossaryLine}`,
    user: `Переведи этот HTML на ${targetLang.toUpperCase()}. Верни только переведённый HTML, без комментариев/преамбулы.\n\n${content}`,
  };
}

function buildRewritePreservePrompt({ tone, content, distance }) {
  return {
    system: `Ты — редактор-переписчик. Берёшь чужой HTML и переписываешь его своими словами, сохраняя структуру (H1/H2/H3 на местах, списки остаются списками, ссылки не трогаем). Тон: ${tone || 'neutral'}. Дистанция от оригинала: ${distance || 'medium'}.`,
    user: `Перепиши этот HTML своими словами, сохраняя структуру. Не добавляй факты которых нет в оригинале. Не удаляй ссылки. Верни только HTML.\n\n${content}`,
  };
}

function buildStructuralAnalysisPrompt({ content }) {
  return {
    system: `Ты — контент-аналитик. Изучаешь чужую статью и возвращаешь structured JSON с outline, key topics, missing topics относительно шаблона нашего review (popolkam).

Шаблон нашего review должен покрывать:
- Характеристики (specs)
- Эргономика/интерфейс
- Молочная система (для кофемашин)
- Обслуживание/чистка
- Стоимость владения (TCO)
- Честные компромиссы
- Сравнение с альтернативами

Возвращай строго JSON без преамбулы:
{
  "outline": [{"level": 1|2|3, "text": "string"}, ...],
  "topics_covered": ["..."],
  "topics_missing_vs_our_template": ["..."],
  "sources_cited": [{"url": "...", "anchor": "..."}],
  "stats_found": [{"claim": "...", "citable": true|false}],
  "word_count_estimate": N
}`,
    user: `Проанализируй статью:\n\n${content}`,
  };
}

function buildFactExtractionPrompt({ content }) {
  return {
    system: `Извлекай из статьи факты-statistics, которые можно цитировать у нас с attribution к source. Только цифры, тесты, явные claims от автора. Не изобретай.

Возвращай строго JSON:
{
  "facts": [
    { "claim": "точная цитата или перефраз", "type": "statistic|benchmark|measurement|opinion", "citable": true|false, "confidence": 0-1 }
  ]
}`,
    user: content,
  };
}

function buildVoicePrompt({ voicePersona, content }) {
  const personaRules = voicePersona === 'dmitri'
    ? `Ты — "Дмитрий Полкин", инженер-обозреватель popolkam.ru. Пишешь по-русски, с замерами и честными компромиссами. НЕ используй слова "идеально", "вау", "бомба", "100%". Lead абзац без exclamation, с конкретики. Обязательные секции review: характеристики, эксплуатация, компромиссы, TCO 5-10 лет.`
    : `Ты — "Дарья Метёлкина", химик aykakchisto.ru. Пишешь про чистоту, упоминаешь pH, состав, реакции. НЕ используй "волшебное средство", "идеальная чистота".`;
  return {
    system: personaRules + `\n\nБерёшь source как факт-базу и переписываешь своим голосом. Не как rewrite — как оригинальная работа по фактам из source.`,
    user: `Source (факты):\n${content}\n\nНапиши наш оригинальный обзор на основе этих фактов. Верни HTML.`,
  };
}

function buildPrompt(action_type, params, content) {
  switch (action_type) {
    case 'translate':            return buildTranslatePrompt({ targetLang: params.target_lang || 'en', content, glossary: params.glossary });
    case 'rewrite_preserve':     return buildRewritePreservePrompt({ tone: params.tone, content, distance: params.distance });
    case 'rewrite_voice':        return buildVoicePrompt({ voicePersona: params.voice_persona || 'dmitri', content });
    case 'structural_analysis':  return buildStructuralAnalysisPrompt({ content });
    case 'fact_extraction':      return buildFactExtractionPrompt({ content });
    default: throw new Error(`Unknown action_type: ${action_type}`);
  }
}

/**
 * Main entry — выполняет action на imported_article или our article. Sync (5-30 сек).
 *
 * @param {object} opts
 * @param {('translate'|'rewrite_preserve'|'rewrite_voice'|'structural_analysis'|'fact_extraction')} opts.action_type
 * @param {('imported_article'|'article')} opts.source_type
 * @param {string[]} opts.source_ids — ID источника (MVP берёт первый)
 * @param {object} [opts.params] — action-specific: target_lang, voice_persona, tone, etc.
 * @param {string} [opts.created_by='operator']
 * @returns {Promise<{ id: string, action_type: string, status: string, output_type: string, output: string, elapsed_ms: number, tokens_used: number, cost_usd: number, model: string, provider: string }>}
 */
export async function runAction({ action_type, source_type, source_ids, params = {}, created_by = 'operator' }) {
  if (!ACTION_TYPES.includes(action_type)) throw new Error(`action_type must be one of ${ACTION_TYPES.join(', ')}`);
  if (!Array.isArray(source_ids) || !source_ids.length) throw new Error('source_ids must be non-empty array');

  const id = 'act_' + randomUUID().slice(0, 8);
  const startedAt = Date.now();

  // Init row
  db.prepare(`INSERT INTO article_actions
    (id, action_type, source_type, source_ids, params_json, status, created_by, started_at)
    VALUES (?, ?, ?, ?, ?, 'running', ?, datetime('now'))`).run(
      id, action_type, source_type, JSON.stringify(source_ids), JSON.stringify(params), created_by,
    );

  try {
    // Load source(s) — MVP: single source
    const source = loadSource(source_type, source_ids[0]);
    if (!source) throw new Error('source not found');
    const content = getSourceContent(source_type, source);

    // Per-site budget guard. Actions по our articles имеют site_id; imported — no site constraint.
    const siteId = source_type === 'article' ? source.site_id : null;
    if (siteId) {
      const budget = checkSiteBudget(siteId, 0.08);
      if (!budget.allowed) {
        throw new Error(`Monthly LLM budget для сайта исчерпан (spent $${budget.spent_mtd.toFixed(2)} / $${budget.budget.toFixed(2)}).`);
      }
    }

    // Truncate if too large (LLM context limit)
    const maxChars = 40_000;
    const html = (content.contentHtml || '').slice(0, maxChars);

    const { aiStatus, callOpenRouter, callAnthropic } = await getAiClients();
    const status = aiStatus();
    if (!status.configured) {
      throw new Error('AI not configured (no OPENROUTER_API_KEY / ANTHROPIC_API_KEY)');
    }

    const model = pickModel(action_type, status.provider);
    const prompts = buildPrompt(action_type, params, html);
    const call = status.provider === 'openrouter' ? callOpenRouter : callAnthropic;
    const maxTokens = action_type === 'structural_analysis' || action_type === 'fact_extraction' ? 2000 : 4000;

    const r = await call({
      system: prompts.system,
      userMessage: prompts.user,
      maxTokens,
      model,
    });
    if (!r) throw new Error('AI returned null');

    const elapsedMs = Date.now() - startedAt;
    // Accurate cost через llm-tracker (получает precise prompt/completion tokens + pricing table)
    const tracked = trackLlmCall({
      source: 'article_action',
      source_id: id,
      site_id: siteId,
      operation: action_type,
      provider: r.provider || status.provider,
      model,
      tokensIn: r.tokensIn || 0,
      tokensOut: r.tokensOut || 0,
      latencyMs: elapsedMs,
      status: 'success',
      generationId: r.generationId,
      fullPrompt: `SYSTEM:\n${prompts.system}\n\nUSER:\n${prompts.user}`.slice(0, 50_000),
      fullResponse: r.text,
    });
    const tokensOut = r.tokensUsed || 0;
    const costUsd = tracked.cost_usd;

    // Determine output_type
    let output_type = 'text';
    if (action_type === 'translate' || action_type === 'rewrite_preserve' || action_type === 'rewrite_voice') output_type = 'html';
    if (action_type === 'structural_analysis' || action_type === 'fact_extraction') output_type = 'analysis_json';

    db.prepare(`UPDATE article_actions SET
      status = 'completed', output_type = ?, output_data = ?,
      llm_provider = ?, llm_tokens_out = ?, llm_cost_usd = ?,
      elapsed_ms = ?, finished_at = datetime('now')
      WHERE id = ?`).run(
        output_type, r.text,
        status.provider, tokensOut, costUsd,
        elapsedMs, id,
      );

    return {
      id, action_type, status: 'completed',
      output_type, output: r.text,
      elapsed_ms: elapsedMs, tokens_used: tokensOut, cost_usd: costUsd,
      model, provider: status.provider,
    };
  } catch (e) {
    db.prepare(`UPDATE article_actions SET status = 'failed', error = ?, finished_at = datetime('now') WHERE id = ?`)
      .run(e.message, id);
    throw e;
  }
}

// List actions for a source (history для UI).
export function listActionsForSource(source_type, source_id, { limit = 20 } = {}) {
  const sql = `SELECT * FROM article_actions
    WHERE source_type = ? AND source_ids LIKE ?
    ORDER BY created_at DESC LIMIT ?`;
  const pattern = `%"${source_id}"%`;
  return db.prepare(sql).all(source_type, pattern, Math.min(100, Number(limit))).map(hydrate);
}

export function getAction(id) {
  const row = db.prepare('SELECT * FROM article_actions WHERE id = ?').get(id);
  return row ? hydrate(row) : null;
}

function hydrate(row) {
  const parseJson = (s) => { if (!s) return null; try { return JSON.parse(s); } catch { return null; } };
  return {
    id: row.id,
    actionType: row.action_type,
    sourceType: row.source_type,
    sourceIds: parseJson(row.source_ids) || [],
    params: parseJson(row.params_json) || {},
    status: row.status,
    outputType: row.output_type,
    output: row.output_data,
    outputFilePath: row.output_file_path,
    outputArticleId: row.output_article_id,
    llmProvider: row.llm_provider,
    llmTokensOut: row.llm_tokens_out,
    llmCostUsd: row.llm_cost_usd,
    elapsedMs: row.elapsed_ms,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    error: row.error,
  };
}

export { ACTION_TYPES };
