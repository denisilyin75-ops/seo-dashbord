#!/usr/bin/env node
// Code Review Agent — Nightly run.
//
// Phase 2: генерирует api-reference.md + architecture.md auto-sections.
// Запускается из cron (server/cron.js регистрирует).
//
// Standalone usage:
//   node server/scripts/code-review-nightly.js
//
// Не требует LLM — 100% deterministic file processing.

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dirname, '..', '..');

  const { writeApiReference } = await import('../services/code-review/api-doc-gen.js');
  const { writeArchitectureDoc } = await import('../services/code-review/arch-snapshot.js');

  const started = Date.now();
  const apiRes = writeApiReference(repoRoot);
  const archRes = writeArchitectureDoc(repoRoot);
  const elapsed = Date.now() - started;

  // Log в code_review_runs если БД доступна
  try {
    const { db } = await import('../db.js');
    db.prepare(`INSERT INTO code_review_runs
      (trigger, started_at, finished_at, status, output_files)
      VALUES ('nightly', datetime('now', '-' || ? || ' seconds'), datetime('now'), 'completed', ?)`)
      .run(Math.round(elapsed / 1000), JSON.stringify([apiRes.path, archRes.path]));
  } catch (e) {
    console.error('[code-review-nightly] DB log failed (non-fatal):', e.message);
  }

  console.log(`[code-review-nightly] OK · ${elapsed}ms`);
  console.log(`  → ${apiRes.path}: ${apiRes.totalEndpoints} endpoints in ${apiRes.files} groups`);
  console.log(`  → ${archRes.path}: ${archRes.tables} tables, ${archRes.endpoints} endpoints, ${archRes.backendLoc} backend LOC, ${archRes.frontendLoc} frontend LOC`);
}

main().catch(e => {
  console.error('[code-review-nightly] fatal:', e.stack || e.message);
  process.exit(2);
});
