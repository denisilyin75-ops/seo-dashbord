// Code Review Agent — Phase 1: post-commit diff analysis.
//
// Читает git diff для commit SHA, отправляет в LLM, получает 3-секционный review
// (What / Why / Risks) и append'ит в docs/review_log.md.
//
// Не блокирует commit. Если LLM недоступен / провайдер кривой / budget exceeded —
// пишет stub-entry с commit metadata, возвращает ok=false в метаданных run'а.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MAX_DIFF_TOKENS_APPROX = 12000;       // ~50k chars safe для Haiku context
const TRUNCATE_MARKER = '\n\n...(diff truncated)...';
const REVIEW_LOG_PATH = 'docs/review_log.md';
const REVIEW_LOG_HEADER = `# Code Review Log

> Автоматически генерируется code-review-agent (Phase 1) на каждый commit.
> Записи хронологически от самых свежих к старым.
> Спека: \`docs/agents/code-review-agent.md\`.

`;

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).trim();
}

export function readCommitDiff(sha, cwd) {
  const full     = git(['show', '--no-color', sha], cwd);
  const stat     = git(['show', '--stat', '--format=', sha], cwd);
  const message  = git(['show', '--no-patch', '--format=%B', sha], cwd);
  const author   = git(['show', '--no-patch', '--format=%an', sha], cwd);
  const date     = git(['show', '--no-patch', '--format=%aI', sha], cwd);
  const shortSha = sha.slice(0, 7);

  let diffBody = full;
  let truncated = false;
  // Approximate: 1 token ≈ 4 chars. Cap 50k chars.
  if (diffBody.length > MAX_DIFF_TOKENS_APPROX * 4) {
    diffBody = diffBody.slice(0, MAX_DIFF_TOKENS_APPROX * 4) + TRUNCATE_MARKER;
    truncated = true;
  }

  return { sha, shortSha, fullDiff: diffBody, stat, message, author, date, truncated };
}

// Промпт для LLM — строгий формат, чтобы парсить reliably.
const SYSTEM_PROMPT = `Ты — опытный code reviewer. Смотришь на git diff + commit message и пишешь краткий review по 3 секциям.

Правила:
- "What": что конкретно изменилось (ровно одно предложение, без marketing-формулировок)
- "Why": какая логика изменения — читая код, а не copy-paste commit message (одно предложение)
- "Risks": observations если есть (0-2 bullet'а короткие). Если ничего не тревожит — "None".

Стиль: нейтральный, технический, на русском. Не хвали, не критикуй без конкретики. Не повторяй commit message буквально.

Вывод строго в формате:
**What:** <текст>
**Why:** <текст>
**Risks:** <bullets или "None">`;

function buildUserPrompt({ stat, message, fullDiff, truncated }) {
  return `Commit stat:
${stat}

Commit message:
${message}

Git diff:
\`\`\`diff
${fullDiff}
\`\`\`${truncated ? '\n\n(diff был обрезан для prompt-бюджета)' : ''}`;
}

// Вызов LLM — переиспользуем callOpenRouter из claude.js.
// Выбор модели: <300 строк diff → Haiku; иначе → Sonnet.
export async function analyzeDiffWithLlm(diffCtx) {
  const { callOpenRouter, callAnthropic, aiStatus } = await importAiClients();
  const status = aiStatus();
  if (!status.configured) {
    return { ok: false, reason: 'ai_not_configured', text: null };
  }

  const diffLines = (diffCtx.fullDiff.match(/\n/g) || []).length;
  // Модель: берём из env или выбираем по размеру diff'а.
  const override = process.env.CODE_REVIEW_MODEL;
  let model;
  if (override) {
    model = override;
  } else if (status.provider === 'openrouter') {
    // OpenRouter model IDs с точками (4.5/4.6). Haiku 4.5 для быстрых review,
    // Sonnet 4.6 для крупных diff'ов (>300 строк).
    model = diffLines > 300 ? 'anthropic/claude-sonnet-4.6' : 'anthropic/claude-haiku-4.5';
  } else {
    model = diffLines > 300 ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
  }

  const userPrompt = buildUserPrompt(diffCtx);
  const call = status.provider === 'openrouter' ? callOpenRouter : callAnthropic;
  try {
    const r = await call({
      system: SYSTEM_PROMPT,
      userMessage: userPrompt,
      maxTokens: 500,
      model,
    });
    if (!r) return { ok: false, reason: 'empty_response', text: null };
    return {
      ok: true,
      text: r.text,
      tokensIn: r.tokensIn || 0,
      tokensOut: r.tokensOut || 0,
      tokensUsed: r.tokensUsed || 0,
      model,
      provider: status.provider,
    };
  } catch (e) {
    return { ok: false, reason: 'llm_error', error: e.message, text: null };
  }
}

// Lazy import чтобы не создавать циклическую зависимость при загрузке модуля.
let _aiClients = null;
async function importAiClients() {
  if (_aiClients) return _aiClients;
  const mod = await import('../claude.js');
  _aiClients = mod;
  return mod;
}

// Append entry в review_log.md.
// Format: newest first. Secondary header H2 per commit.
export function appendReviewLog({ repoRoot, diffCtx, llmResult }) {
  const logPath = path.join(repoRoot, REVIEW_LOG_PATH);
  const logDir = path.dirname(logPath);
  fs.mkdirSync(logDir, { recursive: true });

  let body;
  if (llmResult?.ok && llmResult.text) {
    body = llmResult.text.trim();
  } else {
    // Stub-entry — только metadata, без LLM narrative.
    body = `**What:** _LLM review skipped (${llmResult?.reason || 'unknown'})_
**Why:** _commit message: ${(diffCtx.message || '').replace(/\n+/g, ' ').slice(0, 200)}_
**Risks:** None (automated stub)`;
  }

  const filesLine = diffCtx.stat.split('\n').filter(l => l.includes('|')).length;
  const entry = `## ${diffCtx.shortSha} — ${new Date(diffCtx.date).toISOString().replace('T', ' ').slice(0, 16)} UTC

${body}

**Files:** ${filesLine} changed${diffCtx.truncated ? ' _(diff truncated for LLM)_' : ''}
**Author:** ${diffCtx.author}${llmResult?.model ? `\n**Model:** ${llmResult.model} · ${llmResult.tokensUsed || 0} tokens` : ''}

---

`;

  let existing = '';
  if (fs.existsSync(logPath)) {
    existing = fs.readFileSync(logPath, 'utf8');
  }
  if (!existing.startsWith('# Code Review Log')) {
    existing = REVIEW_LOG_HEADER + existing;
  }

  // Insert AFTER header block (до первого `---` в конце header'а) — append вверх списка commits.
  const headerEnd = existing.indexOf('\n## ');
  let next;
  if (headerEnd === -1) {
    next = existing + entry;
  } else {
    next = existing.slice(0, headerEnd + 1) + entry + existing.slice(headerEnd + 1);
  }
  fs.writeFileSync(logPath, next);
  return { path: logPath, entrySize: entry.length };
}
