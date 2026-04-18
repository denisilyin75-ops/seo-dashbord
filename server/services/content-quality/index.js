// Content Quality Agent — orchestrator.
// Phase 1: deterministic checks only (no LLM yet).
//
// analyzePost(url | site_id + post_id) → fetches HTML → runs 3 checkers →
//   writes content_health + content_quality_scores rows.
//
// Public API:
//   analyzeUrl({ site_id, post_id, post_url, post_type }) → Promise<{ score_overall, issues, stats }>
//   analyzeBatch({ site_id, limit }) → for every recent published article: analyze
//   listHealth(site_id, filters) → issues для дашборда
//   resolveIssue(issue_id, { by, action: 'resolved' | 'ignored', reason })
//
// Не-LLM Phase 1: link_health проверяет HTTP (сеть), остальное — in-process DOM parsing.

import { db } from '../../db.js';
import { checkSeoHygiene } from './seo-hygiene.js';
import { checkLinkHealth } from './link-health.js';
import { checkSchema } from './schema-validator.js';
import { checkReadability } from './readability.js';
import { checkEeat } from './eeat.js';
import { checkVoice } from './voice.js';

const USER_AGENT = 'Popolkam SCC Content-Quality-Bot';
const FETCH_TIMEOUT_MS = 15_000;

// Phase 2 weights (after adding readability/eeat/voice). Freshness/factual пока NULL.
// Веса нормализуются по enabled-dims. Match design doc §3 aggregate formula.
const WEIGHTS = {
  seo_hygiene: 0.20,
  eeat:        0.18,
  voice:       0.15,
  link_health: 0.12,
  schema:      0.10,
  readability: 0.10,
  freshness:   0.10,   // placeholder, считается когда catalog будет
  factual:     0.05,   // placeholder
};

async function fetchPageHtml(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(t);
    if (!r.ok) return { ok: false, status: r.status, error: `HTTP ${r.status}` };
    const html = await r.text();
    return { ok: true, html, status: r.status };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : e.message };
  }
}

// Главный entry.
// opts: { site_id, post_id (optional), post_url (required — абсолютный URL), post_type }
// Возвращает { score_overall, scores, issues, stats, run_id }.
export async function analyzePost(opts) {
  const { site_id, post_id, post_url, post_type } = opts;
  if (!post_url) throw new Error('post_url required');

  // Start run
  const runInsert = db.prepare(`INSERT INTO quality_runs (site_id, trigger, status) VALUES (?, ?, 'running')`).run(site_id || null, opts.trigger || 'manual');
  const run_id = runInsert.lastInsertRowid;

  const startedAt = Date.now();
  const fetchRes = await fetchPageHtml(post_url);
  const html = fetchRes.html || '';
  const siteBaseUrl = opts.siteBaseUrl || (() => { try { return new URL(post_url).origin; } catch { return ''; } })();

  const results = {};
  const allIssues = [];

  if (!fetchRes.ok) {
    // Не получили HTML → залогировать только fetch-error как issue.
    const issue = {
      signal_category: 'seo_hygiene',
      signal_code: 'page_fetch_failed',
      severity: 'red',
      message: `Не удалось получить страницу: ${fetchRes.error}`,
      detail: JSON.stringify({ url: post_url, status: fetchRes.status }),
      suggestion: 'Проверьте что URL доступен публично + SSL валидный',
      auto_fixable: 0,
    };
    allIssues.push(issue);
    persistIssues(allIssues, { site_id, post_id, post_url, run_id });
    finalizeRun(run_id, 'completed', { posts_checked: 1, issues_found: 1, fetch_failed: true });
    return { score_overall: 0, scores: {}, issues: allIssues, stats: {}, run_id };
  }

  // Synchronous checkers (все in-process, fast). Link health — async (HTTP).
  const seo = checkSeoHygiene({ html, siteBaseUrl });
  const schema = checkSchema({ html });
  const readability = checkReadability({ html });
  const eeat = checkEeat({ html });
  const voice = checkVoice({ html, siteBaseUrl });
  const link = await checkLinkHealth({ html, siteBaseUrl });

  results.seo_hygiene = seo;
  results.schema = schema;
  results.readability = readability;
  results.eeat = eeat;
  results.voice = voice;
  results.link_health = link;

  allIssues.push(...seo.issues, ...schema.issues, ...readability.issues, ...eeat.issues, ...voice.issues, ...link.issues);

  // Aggregate score (weighted по enabled-dims)
  let enabledWeightSum = 0;
  let weighted = 0;
  for (const [dim, w] of Object.entries(WEIGHTS)) {
    if (results[dim]?.score != null) {
      weighted += results[dim].score * w;
      enabledWeightSum += w;
    }
  }
  const score_overall = enabledWeightSum > 0 ? Math.round(weighted / enabledWeightSum) : null;

  // Persist
  persistIssues(allIssues, { site_id, post_id, post_url, run_id });
  persistScore({
    site_id, post_id, post_url, post_type,
    score_seo_hygiene: seo.score,
    score_schema: schema.score,
    score_link_health: link.score,
    score_readability: readability.score,
    score_eeat: eeat.score,
    score_voice: voice.score,
    score_overall,
    word_count: seo.stats.word_count,
    image_count: seo.stats.image_count,
    internal_links_count: seo.stats.internal_links_count,
    external_links_count: seo.stats.external_links_count,
  });

  finalizeRun(run_id, 'completed', {
    posts_checked: 1,
    issues_found: allIssues.length,
    red_count: allIssues.filter(i => i.severity === 'red').length,
    yellow_count: allIssues.filter(i => i.severity === 'yellow').length,
    elapsed_ms: Date.now() - startedAt,
  });

  return {
    score_overall,
    scores: {
      seo_hygiene: seo.score,
      link_health: link.score,
      schema: schema.score,
      readability: readability.score,
      eeat: eeat.score,
      voice: voice.score,
    },
    issues: allIssues,
    stats: {
      seo: seo.stats,
      link: link.stats,
      schema: schema.stats,
      readability: readability.stats,
      eeat: eeat.stats,
      voice: voice.stats,
    },
    run_id,
  };
}

// Batch: анализ всех published статей сайта с publicly-доступными URL.
// limit — количество; filter по articles.status='published' + url начинается с /.
export async function analyzeBatch({ site_id, limit = 10, trigger = 'manual' } = {}) {
  if (!site_id) throw new Error('site_id required');
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(site_id);
  if (!site) throw new Error('Site not found');

  // Определяем siteBaseUrl: берём из wp_api_url (/wp-json/wp/v2 → origin)
  let siteBaseUrl = '';
  try {
    const wpApi = site.wp_api_url || '';
    if (wpApi) siteBaseUrl = new URL(wpApi).origin;
  } catch {}
  if (!siteBaseUrl) throw new Error('Cannot determine site base URL (check site.wp_api_url)');

  const articles = db.prepare(`SELECT * FROM articles
    WHERE site_id = ? AND status = 'published' AND url IS NOT NULL AND url != '' AND url != '/'
    ORDER BY updated_at DESC LIMIT ?`).all(site_id, limit);

  const runInsert = db.prepare(`INSERT INTO quality_runs (site_id, trigger, status) VALUES (?, ?, 'running')`).run(site_id, trigger);
  const batch_run_id = runInsert.lastInsertRowid;

  const perPostResults = [];
  let issuesFound = 0;
  let redTotal = 0;
  let yellowTotal = 0;
  const startedAt = Date.now();

  for (const article of articles) {
    const url = article.url.startsWith('http') ? article.url : (siteBaseUrl + article.url);
    try {
      const r = await analyzePost({
        site_id,
        post_id: article.wp_post_id,
        post_url: url,
        post_type: article.type,
        siteBaseUrl,
        trigger: `${trigger}_batch`,
      });
      perPostResults.push({ article_id: article.id, post_id: article.wp_post_id, score: r.score_overall, issues: r.issues.length });
      issuesFound += r.issues.length;
      redTotal += r.issues.filter(i => i.severity === 'red').length;
      yellowTotal += r.issues.filter(i => i.severity === 'yellow').length;
    } catch (e) {
      perPostResults.push({ article_id: article.id, error: e.message });
    }
  }

  finalizeRun(batch_run_id, 'completed', {
    posts_checked: articles.length,
    issues_found: issuesFound,
    red_count: redTotal,
    yellow_count: yellowTotal,
    elapsed_ms: Date.now() - startedAt,
  });

  return { batch_run_id, posts_checked: articles.length, results: perPostResults };
}

// --- DB helpers ---

function persistIssues(issues, ctx) {
  if (!issues.length) return;
  const stmt = db.prepare(`INSERT INTO content_health
    (site_id, post_id, post_url, signal_category, signal_code, severity, message, detail, suggestion, auto_fixable, detected_by, detection_run_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'content-quality', ?)`);

  // Dedup: если тот же signal_code на том же post_id открыт → skip, не дублируем.
  const openStmt = db.prepare(`SELECT id FROM content_health
    WHERE site_id = ? AND (post_id IS ? OR post_id = ?) AND signal_code = ?
    AND resolved_at IS NULL AND ignored = 0 LIMIT 1`);

  const tx = db.transaction(() => {
    for (const i of issues) {
      const exists = openStmt.get(ctx.site_id, ctx.post_id, ctx.post_id, i.signal_code);
      if (exists) continue; // уже открыто — не дублируем
      stmt.run(
        ctx.site_id, ctx.post_id, ctx.post_url,
        i.signal_category, i.signal_code, i.severity, i.message,
        i.detail, i.suggestion, i.auto_fixable || 0, ctx.run_id,
      );
    }
  });
  tx();
}

function persistScore(row) {
  db.prepare(`INSERT INTO content_quality_scores
    (site_id, post_id, post_url, post_type,
     score_seo_hygiene, score_schema, score_link_health, score_overall,
     word_count, image_count, internal_links_count, external_links_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    row.site_id, row.post_id, row.post_url, row.post_type,
    row.score_seo_hygiene, row.score_schema, row.score_link_health, row.score_overall,
    row.word_count, row.image_count, row.internal_links_count, row.external_links_count,
  );
}

function finalizeRun(run_id, status, stats) {
  db.prepare(`UPDATE quality_runs SET finished_at = datetime('now'), status = ?, stats_json = ? WHERE id = ?`)
    .run(status, JSON.stringify(stats), run_id);
}

// --- Listing API (for UI) ---

export function listHealth(site_id, { severity, category, limit = 200 } = {}) {
  const conds = ['site_id = ?', 'resolved_at IS NULL', 'ignored = 0'];
  const params = [site_id];
  if (severity) { conds.push('severity = ?'); params.push(severity); }
  if (category) { conds.push('signal_category = ?'); params.push(category); }
  const sql = `SELECT * FROM content_health WHERE ${conds.join(' AND ')} ORDER BY
    CASE severity WHEN 'red' THEN 1 WHEN 'yellow' THEN 2 ELSE 3 END,
    detected_at DESC LIMIT ?`;
  params.push(Math.min(500, Number(limit) || 200));
  return db.prepare(sql).all(...params);
}

export function summarizeHealth(site_id) {
  const rows = db.prepare(`SELECT severity, COUNT(*) AS n FROM content_health
    WHERE site_id = ? AND resolved_at IS NULL AND ignored = 0
    GROUP BY severity`).all(site_id);
  const out = { red: 0, yellow: 0, green: 0 };
  for (const r of rows) out[r.severity] = r.n;
  return out;
}

export function latestScore(site_id) {
  const row = db.prepare(`SELECT AVG(score_overall) AS avg_score, COUNT(*) AS n
    FROM content_quality_scores WHERE site_id = ?
    AND analyzed_at > datetime('now', '-7 days')`).get(site_id);
  return { avg_score: row.avg_score != null ? Math.round(row.avg_score) : null, recent_analyzed: row.n };
}

export function resolveIssue(issue_id, { by, action, reason } = {}) {
  if (action === 'ignored') {
    db.prepare(`UPDATE content_health SET ignored = 1, ignore_reason = ?, resolved_at = datetime('now'), resolved_by = ? WHERE id = ?`)
      .run(reason || null, by || null, issue_id);
  } else {
    db.prepare(`UPDATE content_health SET resolved_at = datetime('now'), resolved_by = ? WHERE id = ?`)
      .run(by || null, issue_id);
  }
  return db.prepare('SELECT * FROM content_health WHERE id = ?').get(issue_id);
}
