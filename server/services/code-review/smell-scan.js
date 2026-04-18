// Code Smell Scan — Code Review Agent Phase 3 weekly.
//
// Deterministic metrics для code quality deg.
// Пишет docs/code-smells.md (regenerated).
//
// Rules:
//   - File size >500 LOC → low, >1000 LOC → medium
//   - Function size >50 LOC → low, >100 LOC → medium (rough heuristic via braces)
//   - TODO/FIXME count — trend
//   - Orphan files (в /server или /src но никем не импортируются)
//   - console.log count (вне серверных logger модулей)

import fs from 'node:fs';
import path from 'node:path';

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.claude']);
const ALLOWED_EXT = /\.(js|jsx|ts|tsx|mjs)$/;

function walk(dir, relPath, collector) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel = path.posix.join(relPath, e.name);
    if (e.isDirectory()) walk(full, rel, collector);
    else if (e.isFile() && ALLOWED_EXT.test(e.name)) {
      collector.push({ full, rel });
    }
  }
}

function countLines(content) {
  return (content.match(/\n/g) || []).length + 1;
}

// Rough function detector: ищем `function name(` или `const name = (` или `const name = async (`.
// Размер = lines до matching closing brace (грубо, без AST).
function findBigFunctions(content) {
  const lines = content.split('\n');
  const big = [];
  const fnRegex = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(|^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?(?:function\s*\(|\([^)]*\)\s*=>)/;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(fnRegex);
    if (!m) continue;
    const name = m[1] || m[2];
    // Bracket match to find end
    let depth = 0, started = false;
    let endLine = i;
    for (let j = i; j < Math.min(lines.length, i + 300); j++) {
      for (const ch of lines[j]) {
        if (ch === '{') { depth++; started = true; }
        else if (ch === '}') { depth--; if (started && depth === 0) { endLine = j; break; } }
      }
      if (started && depth === 0) { endLine = j; break; }
    }
    const size = endLine - i + 1;
    if (size > 50) big.push({ name, line: i + 1, size });
  }
  return big;
}

// Orphan files: те .js/.jsx в src/ или server/ которые не импортируются из других.
// Не идеально (dynamic imports не ловит), но даёт полезный baseline.
function findOrphans(files, repoRoot) {
  const entryFiles = new Set(['server/index.js', 'src/main.jsx', 'server/cron.js']);
  const scripts = files.filter(f => f.rel.startsWith('server/scripts/'));
  for (const s of scripts) entryFiles.add(s.rel);

  const imports = new Map();    // file → set of imports
  const importedBy = new Map(); // file → set of files that import

  for (const f of files) {
    imports.set(f.rel, new Set());
    importedBy.set(f.rel, new Set());
  }

  // Static imports: `import X from './path'`
  // Dynamic imports: `import('./path')` / `await import('./path')` / `await import('/app/server/...')`
  // Require: `require('./path')`
  const regexes = [
    /import\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,  // static
    /import\s*\(\s*['"]([^'"]+)['"]/g,              // dynamic (wait for)
    /require\s*\(\s*['"]([^'"]+)['"]/g,             // CJS
  ];

  for (const f of files) {
    try {
      const content = fs.readFileSync(f.full, 'utf8');
      for (const regex of regexes) {
        regex.lastIndex = 0;
        let m;
        while ((m = regex.exec(content)) !== null) {
          let importedPath = m[1];
          // Нормализуем absolute-like dynamic imports вида '/app/server/...'
          if (importedPath.startsWith('/app/')) importedPath = importedPath.replace(/^\/app\//, './');
          if (importedPath.startsWith('.')) {
            const dir = path.posix.dirname(f.rel);
            let resolved = path.posix.normalize(path.posix.join(dir, importedPath));
            for (const candidate of [resolved, resolved + '.js', resolved + '.jsx', resolved + '/index.js']) {
              if (importedBy.has(candidate)) {
                importedBy.get(candidate).add(f.rel);
                imports.get(f.rel).add(candidate);
                break;
              }
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  const orphans = [];
  for (const f of files) {
    if (entryFiles.has(f.rel)) continue;
    if (importedBy.get(f.rel).size === 0) orphans.push(f.rel);
  }
  return orphans;
}

export function runSmellScan(repoRoot) {
  const files = [];
  walk(repoRoot, '', files);
  files.sort((a, b) => a.rel.localeCompare(b.rel));

  const bigFiles = [];
  const bigFunctions = [];
  let totalTodos = 0;
  let totalFixmes = 0;
  let totalConsoleLog = 0;
  const consoleLogByFile = {};

  for (const f of files) {
    try {
      const content = fs.readFileSync(f.full, 'utf8');
      const loc = countLines(content);
      if (loc > 500) bigFiles.push({ file: f.rel, loc });

      const fnFindings = findBigFunctions(content);
      for (const fn of fnFindings) bigFunctions.push({ file: f.rel, ...fn });

      totalTodos += (content.match(/\bTODO\b/g) || []).length;
      totalFixmes += (content.match(/\bFIXME\b/g) || []).length;
      const logs = (content.match(/console\.log\s*\(/g) || []).length;
      totalConsoleLog += logs;
      if (logs > 0) consoleLogByFile[f.rel] = logs;
    } catch { /* skip */ }
  }

  const orphans = findOrphans(files, repoRoot);

  bigFiles.sort((a, b) => b.loc - a.loc);
  bigFunctions.sort((a, b) => b.size - a.size);

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const lines = [
    '# Code Smells',
    '',
    `> Auto-generated by code-review-agent. Last run: ${now}.`,
    `> Files scanned: ${files.length}. TODOs: ${totalTodos}. FIXMEs: ${totalFixmes}. console.log: ${totalConsoleLog}.`,
    '',
  ];

  // Big files
  lines.push('## Files >500 LOC');
  lines.push('');
  if (!bigFiles.length) {
    lines.push('_Нет файлов больше 500 строк. ✅_');
  } else {
    lines.push('| File | LOC | Severity |');
    lines.push('|---|---|---|');
    for (const bf of bigFiles.slice(0, 20)) {
      const sev = bf.loc > 1000 ? '🟠 medium' : '🟡 low';
      lines.push(`| \`${bf.file}\` | ${bf.loc} | ${sev} |`);
    }
  }
  lines.push('');

  // Big functions
  lines.push(`## Functions >50 LOC (top 15)`);
  lines.push('');
  if (!bigFunctions.length) {
    lines.push('_Нет функций >50 строк. ✅_');
  } else {
    lines.push('| File:Line | Function | LOC |');
    lines.push('|---|---|---|');
    for (const fn of bigFunctions.slice(0, 15)) {
      const sev = fn.size > 100 ? '🟠' : '🟡';
      lines.push(`| \`${fn.file}:${fn.line}\` | ${sev} \`${fn.name}\` | ${fn.size} |`);
    }
  }
  lines.push('');

  // TODOs
  lines.push(`## TODOs / FIXMEs`);
  lines.push('');
  lines.push(`- TODO: **${totalTodos}**`);
  lines.push(`- FIXME: **${totalFixmes}**`);
  lines.push('');

  // Orphans
  lines.push(`## Orphan files (0 imports from other files)`);
  lines.push('');
  if (!orphans.length) {
    lines.push('_Нет orphans. ✅_');
  } else {
    for (const o of orphans.slice(0, 30)) lines.push(`- \`${o}\``);
    if (orphans.length > 30) lines.push(`- _…ещё ${orphans.length - 30}_`);
  }
  lines.push('');

  // Console.log hotspots
  if (totalConsoleLog > 10) {
    lines.push(`## console.log hotspots`);
    lines.push('');
    const sorted = Object.entries(consoleLogByFile).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [file, count] of sorted) lines.push(`- \`${file}\`: ${count}`);
    lines.push('');
  }

  const markdown = lines.join('\n');
  const outPath = path.join(repoRoot, 'docs', 'code-smells.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown);

  return {
    path: outPath,
    counts: {
      big_files: bigFiles.length,
      big_functions: bigFunctions.length,
      todos: totalTodos,
      fixmes: totalFixmes,
      console_log: totalConsoleLog,
      orphans: orphans.length,
    },
  };
}
