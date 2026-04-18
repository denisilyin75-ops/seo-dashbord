#!/usr/bin/env node
// Устанавливает git hooks для Code Review Agent Phase 1.
// Idempotent — можно запускать многократно. Проверяет/создаёт .git/hooks/post-commit.
//
// Usage:
//   node server/scripts/install-hooks.js
// Uninstall:
//   удалить .git/hooks/post-commit (или откатить до предыдущей версии)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function run() {
  let gitDir;
  try {
    gitDir = execFileSync('git', ['rev-parse', '--git-dir'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    console.error('[install-hooks] not a git repo:', e.message);
    process.exit(1);
  }
  if (!path.isAbsolute(gitDir)) gitDir = path.join(repoRoot, gitDir);

  const hooksDir = path.join(gitDir, 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, 'post-commit');

  const MARKER = '# SCC-CODE-REVIEW-AGENT';
  const script = `#!/bin/sh
${MARKER}
# Post-commit hook — запускает code-review agent в фоне (низкий priority).
# Не блокирует commit. Ошибки идут в /tmp/scc-code-review.log.

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT="$REPO_ROOT/server/scripts/code-review.js"
LOG_FILE="\${TMPDIR:-/tmp}/scc-code-review.log"

if [ -f "$SCRIPT" ] && command -v node > /dev/null 2>&1; then
  # nohup + nice чтобы не замедлять dev flow; background + disown.
  (nohup nice -n 19 node "$SCRIPT" --trigger=post_commit --sha="$(git rev-parse HEAD)" >> "$LOG_FILE" 2>&1 &) > /dev/null 2>&1
fi
exit 0
`;

  // Если уже есть hook не наш — бэкапим.
  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes(MARKER)) {
      // Наш же скрипт — просто переписываем (свежая версия).
      fs.writeFileSync(hookPath, script);
      fs.chmodSync(hookPath, 0o755);
      console.log('[install-hooks] post-commit hook updated');
      return;
    }
    // Не наш — backup
    const backup = hookPath + '.backup-' + Date.now();
    fs.copyFileSync(hookPath, backup);
    console.log('[install-hooks] existing non-SCC hook backed up to', backup);
  }

  fs.writeFileSync(hookPath, script);
  fs.chmodSync(hookPath, 0o755);
  console.log('[install-hooks] post-commit hook installed at', hookPath);
  console.log('[install-hooks] теперь каждый git commit запустит code review в фоне.');
}

run();
