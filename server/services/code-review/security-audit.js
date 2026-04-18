// Security Audit — Code Review Agent Phase 3 weekly.
//
// Deterministic pattern-scan + npm audit parse.
// Пишет docs/security-audit.md (regenerated each run).
// Critical findings пишет в code_health с severity=critical/high.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage', '.claude']);

// Имена переменных внутри ${...} которые означают "безопасная SQL-структура"
// (conditions / placeholders / joins / sort keys — constructed by code, не user input).
// Если внутри ${...} только эти имена — не считаем injection.
const SAFE_SQL_VARS = /^(placeholders|conds|clauses|baseJoin|whereSql|sort|sortCol|orderBy|limitClause|fields|offset|limit|buildSort\([\w.]+\))$/;

// True injection: template literal в SQL где ${X} содержит **user-controlled** value.
// Эвристика: match только если ${...} НЕ одно из "safe" имён.
function isLikelySqlInjection(snippet) {
  // Extract interpolation: ${X}
  const m = snippet.match(/\$\{([^}]+)\}/);
  if (!m) return false;
  const inner = m[1].trim();
  return !SAFE_SQL_VARS.test(inner);
}

const PATTERNS = [
  // Critical
  { re: /(api[_-]?key|secret|password|token)['"\s:=]+['"][A-Za-z0-9_-]{20,}/gi, severity: 'critical', label: 'hardcoded secret-like string' },
  { re: /`SELECT[\s\S]{0,100}\$\{([^}]+)\}/g, severity: 'critical', label: 'SQL injection risk (template literal)', filter: m => isLikelySqlInjection(m) },
  { re: /execSync\s*\([^)]*\$\{([^}]+)\}/g, severity: 'critical', label: 'shell injection via template literal' },
  // High
  { re: /\beval\s*\(/g, severity: 'high', label: 'eval() usage' },
  { re: /\.innerHTML\s*=/g, severity: 'high', label: 'innerHTML assignment (XSS risk)' },
  { re: /document\.write\s*\(/g, severity: 'high', label: 'document.write usage' },
  // Medium
  { re: /dangerouslySetInnerHTML/g, severity: 'medium', label: 'React dangerouslySetInnerHTML (audit context)' },
  { re: /Math\.random\(\)\s*(?:\*|\.)?[\s\S]{0,50}(?:token|key|secret|password|id)/gi, severity: 'medium', label: 'Math.random for security-sensitive value' },
  // Informational
  { re: /console\.log\(/g, severity: 'info', label: 'console.log (may leak info in prod)' },
  { re: /TODO|FIXME|XXX|HACK/g, severity: 'info', label: 'TODO/FIXME marker' },
];

// Files содержащие regex patterns сами себе (meta) — skip их от scan.
const META_FILES = [
  'server/services/code-review/security-audit.js',
  'server/services/code-review/smell-scan.js',
];

// Files to skip by path pattern
const SKIP_PATHS = [
  /\.md$/, /\.json$/, /\.lock$/, /package-lock/, /\.d\.ts$/,
  /test\//, /__tests__\//, /\.test\./, /\.spec\./,
];

function shouldSkip(relativePath) {
  if (SKIP_PATHS.some(re => re.test(relativePath))) return true;
  if (META_FILES.includes(relativePath)) return true;
  return false;
}

function walk(dir, relPath, collector) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel = path.posix.join(relPath, e.name);
    if (e.isDirectory()) walk(full, rel, collector);
    else if (e.isFile() && /\.(js|jsx|ts|tsx|mjs)$/.test(e.name) && !shouldSkip(rel)) {
      collector.push({ full, rel });
    }
  }
}

function scanFile(filePath, relPath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const findings = [];
  for (const rule of PATTERNS) {
    rule.re.lastIndex = 0; // reset global regex state
    let m;
    while ((m = rule.re.exec(content)) !== null) {
      // Optional filter (например SAFE_SQL_VARS для SQL pattern)
      if (rule.filter && !rule.filter(m[0])) continue;

      const pos = m.index;
      let lineNo = 1, running = 0;
      for (let i = 0; i < lines.length; i++) {
        if (running + lines[i].length + 1 > pos) { lineNo = i + 1; break; }
        running += lines[i].length + 1;
      }
      findings.push({
        file: relPath,
        line: lineNo,
        severity: rule.severity,
        label: rule.label,
        snippet: m[0].slice(0, 120),
      });
    }
  }
  return findings;
}

function runNpmAudit(repoRoot) {
  try {
    const json = execFileSync('npm', ['audit', '--json'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    const parsed = JSON.parse(json);
    const meta = parsed.metadata?.vulnerabilities || {};
    return { ok: true, critical: meta.critical || 0, high: meta.high || 0, moderate: meta.moderate || 0, low: meta.low || 0, info: meta.info || 0, total: meta.total || 0 };
  } catch (e) {
    // npm audit exit code non-zero если есть vulnerabilities — пытаемся прочитать stdout
    try {
      const out = (e.stdout || '').toString();
      const parsed = JSON.parse(out);
      const meta = parsed.metadata?.vulnerabilities || {};
      return { ok: true, critical: meta.critical || 0, high: meta.high || 0, moderate: meta.moderate || 0, low: meta.low || 0, info: meta.info || 0, total: meta.total || 0 };
    } catch {
      return { ok: false, error: e.message };
    }
  }
}

function checkEnvExample(repoRoot) {
  const envPath = path.join(repoRoot, '.env');
  const examplePath = path.join(repoRoot, '.env.example');
  const out = { hasEnv: fs.existsSync(envPath), hasExample: fs.existsSync(examplePath), missingInExample: [] };
  if (out.hasEnv && out.hasExample) {
    const envVars = parseEnvKeys(fs.readFileSync(envPath, 'utf8'));
    const exVars = parseEnvKeys(fs.readFileSync(examplePath, 'utf8'));
    out.missingInExample = envVars.filter(v => !exVars.includes(v));
  }
  return out;
}

function parseEnvKeys(content) {
  return content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=')[0].trim())
    .filter(Boolean);
}

export function runSecurityAudit(repoRoot) {
  const files = [];
  walk(repoRoot, '', files);

  const allFindings = [];
  for (const f of files) {
    allFindings.push(...scanFile(f.full, f.rel));
  }

  const bySeverity = { critical: [], high: [], medium: [], info: [] };
  for (const f of allFindings) bySeverity[f.severity].push(f);

  const audit = runNpmAudit(repoRoot);
  const envCheck = checkEnvExample(repoRoot);

  // Filter out informational TODOs for count headline
  const countedFindings = [...bySeverity.critical, ...bySeverity.high, ...bySeverity.medium];

  // Markdown output
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  const lines = [
    '# Security Audit',
    '',
    `> Auto-generated by code-review-agent. Last run: ${now}.`,
    `> Всего pattern-findings (критичные): **${countedFindings.length}** (critical=${bySeverity.critical.length}, high=${bySeverity.high.length}, medium=${bySeverity.medium.length}).`,
    `> Файлов просканировано: ${files.length}.`,
    '',
    '## NPM Audit',
    '',
    audit.ok
      ? `| Severity | Count |\n|---|---|\n| Critical | ${audit.critical} |\n| High | ${audit.high} |\n| Moderate | ${audit.moderate} |\n| Low | ${audit.low} |\n| Info | ${audit.info} |\n| **Total** | **${audit.total}** |`
      : `❌ npm audit failed: ${audit.error}`,
    '',
    '## Environment config',
    '',
    `- \`.env\` exists: ${envCheck.hasEnv ? '✅' : '❌'}`,
    `- \`.env.example\` exists: ${envCheck.hasExample ? '✅' : '❌'}`,
    envCheck.missingInExample.length
      ? `- ⚠️ Variables в \`.env\` но не в \`.env.example\`: \`${envCheck.missingInExample.join('`, `')}\``
      : '- ✅ .env и .env.example синхронизированы',
    '',
  ];

  // Findings sections
  for (const sev of ['critical', 'high', 'medium']) {
    const list = bySeverity[sev];
    if (!list.length) continue;
    lines.push(`## ${sev.toUpperCase()} findings (${list.length})`);
    lines.push('');
    lines.push('| File:Line | Label | Snippet |');
    lines.push('|---|---|---|');
    for (const f of list) {
      const snippet = f.snippet.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      lines.push(`| \`${f.file}:${f.line}\` | ${f.label} | \`${snippet}\` |`);
    }
    lines.push('');
  }

  // Info bucket compacted (TODOs, console.log counts)
  if (bySeverity.info.length) {
    const counts = {};
    for (const f of bySeverity.info) counts[f.label] = (counts[f.label] || 0) + 1;
    lines.push(`## INFO counters`);
    lines.push('');
    for (const [k, v] of Object.entries(counts)) {
      lines.push(`- ${k}: ${v}`);
    }
    lines.push('');
  }

  const markdown = lines.join('\n');
  const outPath = path.join(repoRoot, 'docs', 'security-audit.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown);

  return { path: outPath, counts: { critical: bySeverity.critical.length, high: bySeverity.high.length, medium: bySeverity.medium.length, info: bySeverity.info.length }, npmAudit: audit };
}
