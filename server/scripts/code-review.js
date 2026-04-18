#!/usr/bin/env node
// Code Review Agent — orchestrator entry point.
//
// Usage:
//   node server/scripts/code-review.js --trigger=post_commit --sha=<commit-sha>
//   node server/scripts/code-review.js --trigger=manual --sha=HEAD
//
// Phase 1: читает diff коммита, запускает LLM review, appendит docs/review_log.md,
// записывает code_review_runs row в БД. Не блокирует, ошибки логгирует в stderr.
//
// Не требует AUTH_TOKEN — это локальный script, запускаемый git-hook'ом.

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// Minimal args parser — без внешних зависимостей.
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, ...rest] = a.slice(2).split('=');
      out[k] = rest.length ? rest.join('=') : (argv[i + 1] && !argv[i + 1].startsWith('--') ? (i++, argv[i]) : 'true');
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const trigger = args.trigger || 'manual';
  let sha = args.sha || 'HEAD';

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..', '..');

  // Резолвим HEAD → full SHA
  if (sha === 'HEAD') {
    try {
      sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    } catch (e) {
      console.error('[code-review] git rev-parse HEAD failed:', e.message);
      process.exit(1);
    }
  }

  // Dynamic import — чтобы не тянуть tonn зависимостей если ключа LLM нет.
  const { readCommitDiff, analyzeDiffWithLlm, appendReviewLog } = await import('../services/code-review/diff-analyzer.js');

  // Читаем diff
  let diffCtx;
  try {
    diffCtx = readCommitDiff(sha, repoRoot);
  } catch (e) {
    console.error('[code-review] read diff failed:', e.message);
    process.exit(1);
  }

  // Анализируем LLM
  const startedAt = Date.now();
  const llmResult = await analyzeDiffWithLlm(diffCtx);
  const elapsedMs = Date.now() - startedAt;

  // Appendим review_log.md
  const appendRes = appendReviewLog({ repoRoot, diffCtx, llmResult });

  // Записываем в БД (best-effort; если DB недоступна — не ломаем flow)
  try {
    const { db } = await import('../db.js');
    db.prepare(`INSERT INTO code_review_runs
      (trigger, commit_sha, started_at, finished_at, status, output_files, llm_provider, llm_tokens_in, llm_tokens_out, llm_cost_usd, error)
      VALUES (?, ?, datetime('now', '-' || ? || ' seconds'), datetime('now'), ?, ?, ?, ?, ?, ?, ?)`)
      .run(
        trigger,
        diffCtx.sha,
        Math.round(elapsedMs / 1000),
        llmResult.ok ? 'completed' : 'partial',
        JSON.stringify([appendRes.path]),
        llmResult.provider || null,
        null,                                     // tokens_in (не различаем в openrouter text response)
        llmResult.tokensUsed || 0,
        null,                                     // cost — подсчитаем позже
        llmResult.ok ? null : (llmResult.reason || 'unknown'),
      );
  } catch (e) {
    console.error('[code-review] DB write failed (non-fatal):', e.message);
  }

  // Report
  console.log(`[code-review] ${diffCtx.shortSha} → ${llmResult.ok ? 'OK' : 'SKIP (' + llmResult.reason + ')'} · ${elapsedMs}ms · ${llmResult.tokensUsed || 0} tokens`);
  console.log(`[code-review] wrote ${appendRes.path}`);
}

main().catch(e => {
  console.error('[code-review] fatal:', e.stack || e.message);
  process.exit(2);
});
