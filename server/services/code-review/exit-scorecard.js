// Exit-Readiness Scorecard — Code Review Agent Phase 4 (monthly).
//
// 15 параметров × score 0-100 → aggregate /100.
// Monthly snapshot в exit_readiness_scorecards с trend vs previous month.
// Используется при оценке готовности SCC к продаже / listing на Flippa / MotionInvest.
//
// Source: design doc docs/agents/code-review-agent.md §10.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { db } from '../../db.js';

const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'coverage']);

function walkFiles(dir, extensions, relPath = '') {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    const rel = path.posix.join(relPath, e.name);
    if (e.isDirectory()) out.push(...walkFiles(full, extensions, rel));
    else if (extensions.some(ext => e.name.endsWith(ext))) out.push({ full, rel });
  }
  return out;
}

// --- Individual score calculators ---

function scoreDocumentationCoverage(repoRoot) {
  const routesDir = path.join(repoRoot, 'server', 'routes');
  const servicesDir = path.join(repoRoot, 'server', 'services');
  const apiRefPath = path.join(repoRoot, 'docs', 'api-reference.md');

  // % endpoints documented: считаем routes vs api-reference endpoints
  const routeFiles = walkFiles(routesDir, ['.js']);
  let totalEndpoints = 0;
  for (const f of routeFiles) {
    const c = fs.readFileSync(f.full, 'utf8');
    totalEndpoints += (c.match(/router\.(get|post|put|patch|delete)\s*\(/g) || []).length;
  }
  let referencedEndpoints = 0;
  if (fs.existsSync(apiRefPath)) {
    const ref = fs.readFileSync(apiRefPath, 'utf8');
    // Rough count: каждая строка в таблице `| GET | /api/...` = одна документированная
    referencedEndpoints = (ref.match(/\|\s*`(GET|POST|PUT|PATCH|DELETE)`\s*\|/g) || []).length;
  }
  const endpointCoverage = totalEndpoints ? Math.min(1, referencedEndpoints / totalEndpoints) : 0;

  // % services с JSDoc module header
  const serviceFiles = walkFiles(servicesDir, ['.js']);
  let docHeaders = 0;
  for (const f of serviceFiles) {
    const c = fs.readFileSync(f.full, 'utf8');
    // Первые 500 символов содержат /** или // с описанием (минимум 50 символов)
    const head = c.slice(0, 500);
    if (/\/\*\*[\s\S]+?\*\//.test(head) || head.split('\n').filter(l => l.startsWith('//') && l.length > 10).length >= 3) {
      docHeaders++;
    }
  }
  const serviceDocCoverage = serviceFiles.length ? docHeaders / serviceFiles.length : 0;

  // docs folder staleness — average age of docs/*.md в днях
  const docsMd = walkFiles(path.join(repoRoot, 'docs'), ['.md']);
  let totalAgeDays = 0;
  let docCount = 0;
  const now = Date.now();
  for (const f of docsMd) {
    const stat = fs.statSync(f.full);
    const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
    totalAgeDays += ageDays;
    docCount++;
  }
  const avgAgeDays = docCount ? totalAgeDays / docCount : 365;
  const stalenessScore = Math.max(0, 1 - (avgAgeDays / 180)); // 180 days = 0

  const score = Math.round(100 * (0.5 * endpointCoverage + 0.3 * serviceDocCoverage + 0.2 * stalenessScore));
  return { score, detail: { endpointCoverage: (endpointCoverage * 100).toFixed(0) + '%', serviceDocCoverage: (serviceDocCoverage * 100).toFixed(0) + '%', avgDocAgeDays: Math.round(avgAgeDays) } };
}

function scoreStaleness(repoRoot) {
  const docsDir = path.join(repoRoot, 'docs');
  const mdFiles = walkFiles(docsDir, ['.md']);
  if (!mdFiles.length) return { score: 0, detail: { error: 'no docs' } };

  const now = Date.now();
  const ages = mdFiles.map(f => {
    const stat = fs.statSync(f.full);
    return (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
  });
  const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
  const score = Math.max(0, Math.min(100, Math.round(100 - avg * 0.5))); // avg=0 → 100, avg=200 → 0
  return { score, detail: { avg_age_days: Math.round(avg), doc_count: mdFiles.length } };
}

function scoreTypeSafety(repoRoot) {
  // Phase: есть ли TypeScript? Иначе — % файлов с JSDoc types в function signatures.
  const tsConfig = path.join(repoRoot, 'tsconfig.json');
  if (fs.existsSync(tsConfig)) {
    return { score: 100, detail: { typescript: true } };
  }

  // JSDoc @param coverage rough heuristic
  const allJs = [
    ...walkFiles(path.join(repoRoot, 'server', 'services'), ['.js']),
    ...walkFiles(path.join(repoRoot, 'server', 'routes'), ['.js']),
  ];
  let withJsdoc = 0;
  for (const f of allJs) {
    const c = fs.readFileSync(f.full, 'utf8');
    if (/@param\s+/.test(c) || /@returns\s+/.test(c)) withJsdoc++;
  }
  const ratio = allJs.length ? withJsdoc / allJs.length : 0;
  const score = Math.round(ratio * 60); // Max 60 без TS migration
  return { score, detail: { jsdoc_files: withJsdoc, total_files: allJs.length, note: 'No TypeScript — max score без миграции = 60' } };
}

function scoreSecretHygiene(repoRoot) {
  // Проверяем .env не в git + .env.example синхронизирован
  const gitignorePath = path.join(repoRoot, '.gitignore');
  let envIgnored = false;
  if (fs.existsSync(gitignorePath)) {
    const gi = fs.readFileSync(gitignorePath, 'utf8');
    envIgnored = /^\.env$|^\/.env$|^\.env$/m.test(gi) || gi.split('\n').some(l => l.trim() === '.env' || l.trim() === '/.env');
  }
  const envPath = path.join(repoRoot, '.env');
  const examplePath = path.join(repoRoot, '.env.example');

  let missingInExample = 0;
  if (fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    const envKeys = extractEnvKeys(fs.readFileSync(envPath, 'utf8'));
    const exKeys = extractEnvKeys(fs.readFileSync(examplePath, 'utf8'));
    missingInExample = envKeys.filter(k => !exKeys.includes(k)).length;
  }

  // Quick pattern scan для hardcoded secrets (повтор security-audit light)
  const PATTERNS = [/(api[_-]?key|secret|password|token)['"\s:=]+['"][A-Za-z0-9_-]{20,}/gi];
  const jsFiles = [
    ...walkFiles(path.join(repoRoot, 'server'), ['.js']),
    ...walkFiles(path.join(repoRoot, 'src'), ['.js', '.jsx']),
  ];
  let hardcodedHits = 0;
  for (const f of jsFiles) {
    if (f.rel.includes('code-review/security-audit')) continue; // skip meta
    const c = fs.readFileSync(f.full, 'utf8');
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      const matches = c.match(re) || [];
      hardcodedHits += matches.length;
    }
  }

  let score = 100;
  if (!envIgnored) score -= 50;
  if (hardcodedHits > 0) score -= Math.min(50, hardcodedHits * 10);
  score -= missingInExample * 5;
  return { score: Math.max(0, score), detail: { env_ignored: envIgnored, hardcoded_hits: hardcodedHits, missing_in_example: missingInExample } };
}

function scoreDependencyFreshness(repoRoot) {
  try {
    const json = execFileSync('npm', ['outdated', '--json'], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    const parsed = JSON.parse(json || '{}');
    const total = Object.keys(parsed).length;
    let majorBehind = 0;
    for (const [, info] of Object.entries(parsed)) {
      const [curMaj] = (info.current || '0').split('.');
      const [wantedMaj] = (info.wanted || '0').split('.');
      const [latestMaj] = (info.latest || '0').split('.');
      if (Number(latestMaj) > Number(curMaj)) majorBehind++;
    }
    const score = Math.max(0, 100 - majorBehind * 8);
    return { score, detail: { outdated: total, major_behind: majorBehind } };
  } catch (e) {
    try {
      const out = (e.stdout || '').toString();
      const parsed = JSON.parse(out || '{}');
      const total = Object.keys(parsed).length;
      return { score: Math.max(0, 100 - total * 3), detail: { outdated: total } };
    } catch {
      return { score: 50, detail: { error: 'npm outdated failed, baseline 50' } };
    }
  }
}

function scoreTests(repoRoot) {
  // Нет tests пока — baseline 0. Когда добавим test suite → score рисует coverage.
  const testFiles = [
    ...walkFiles(repoRoot, ['.test.js', '.spec.js']),
  ];
  if (testFiles.length === 0) return { score: 0, detail: { note: 'Нет test suite. Baseline=0; rollout tests = +40-80' } };
  return { score: 40 + Math.min(40, testFiles.length * 2), detail: { test_files: testFiles.length } };
}

function scoreComplexity(repoRoot) {
  // Files >500 LOC — signal of complexity. Baseline: 100 - 5 × bigFiles
  const allJs = [
    ...walkFiles(path.join(repoRoot, 'server'), ['.js']),
    ...walkFiles(path.join(repoRoot, 'src'), ['.js', '.jsx']),
  ];
  let big = 0, huge = 0;
  for (const f of allJs) {
    const c = fs.readFileSync(f.full, 'utf8');
    const loc = (c.match(/\n/g) || []).length + 1;
    if (loc > 1000) huge++;
    else if (loc > 500) big++;
  }
  const score = Math.max(0, 100 - big * 3 - huge * 10);
  return { score, detail: { big_files: big, huge_files: huge } };
}

function scoreArchitectureCoherence(repoRoot) {
  // Manually scored indicator — service layering + no cross-concerns
  // Phase 1: baseline 75 (мы есть сервисы / routes / UI раздельно),
  // penalties за orphan-файлы (из smell-scan).
  return { score: 75, detail: { note: 'Baseline; нуждается в ручной оценке архитектурной зрелости' } };
}

function scoreApiStability(repoRoot) {
  // Git log: breaking changes в коммитах за last 90 days (search "BREAKING" или major version bumps)
  try {
    const out = execFileSync('git', ['log', '--since=90 days ago', '--grep', 'BREAKING', '--oneline'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const breakingCount = out ? out.split('\n').length : 0;
    const score = Math.max(0, 100 - breakingCount * 15);
    return { score, detail: { breaking_last_90d: breakingCount } };
  } catch { return { score: 80, detail: { note: 'git log unavailable' } }; }
}

function scoreCommitQuality(repoRoot) {
  // Conventional commits % за последние 50 коммитов
  try {
    const out = execFileSync('git', ['log', '-50', '--format=%s'], { cwd: repoRoot, encoding: 'utf8' }).trim();
    const msgs = out.split('\n').filter(Boolean);
    const conventional = msgs.filter(m => /^(feat|fix|docs|chore|refactor|test|perf|style|ci|build)(\([^)]+\))?:/.test(m)).length;
    const ratio = msgs.length ? conventional / msgs.length : 0;
    return { score: Math.round(ratio * 100), detail: { conventional_ratio: (ratio * 100).toFixed(0) + '%', commits_checked: msgs.length } };
  } catch { return { score: 50, detail: { error: 'git log failed' } }; }
}

function scoreGitHygiene(repoRoot) {
  // Detect stale branches, force-pushes audit trail etc.
  // Phase 1: baseline 85 (solo-dev, не сильно критично), check только untracked secrets
  return { score: 85, detail: { note: 'Baseline для solo-dev; для multi-dev — отслеживать stale branches' } };
}

function scoreLicenseClarity(repoRoot) {
  const licensePath = path.join(repoRoot, 'LICENSE');
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const hasLicense = fs.existsSync(licensePath);
  let licenseField = null;
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      licenseField = pkg.license || null;
    } catch {}
  }
  let score = 0;
  if (hasLicense) score += 60;
  if (licenseField && licenseField !== 'UNLICENSED') score += 40;
  return { score, detail: { has_license_file: hasLicense, package_license: licenseField } };
}

function scoreBuildReproducibility(repoRoot) {
  const hasLock = fs.existsSync(path.join(repoRoot, 'package-lock.json'));
  const hasDockerfile = fs.existsSync(path.join(repoRoot, 'Dockerfile'));
  const hasCompose = fs.existsSync(path.join(repoRoot, 'docker-compose.yml'));
  let score = 30;
  if (hasLock) score += 30;
  if (hasDockerfile) score += 20;
  if (hasCompose) score += 20;
  return { score, detail: { has_lock: hasLock, has_dockerfile: hasDockerfile, has_compose: hasCompose } };
}

function scoreDeployReproducibility(repoRoot) {
  // Есть ли deploy-скрипты? setup.sh? docs/DEPLOY.md?
  const setupSh = fs.existsSync(path.join(repoRoot, 'deploy', 'setup.sh'));
  const readme = fs.existsSync(path.join(repoRoot, 'README.md'));
  const scalingChecklist = fs.existsSync(path.join(repoRoot, 'docs', 'scaling-checklist.md'));
  let score = 20;
  if (setupSh) score += 30;
  if (readme) score += 20;
  if (scalingChecklist) score += 30;
  return { score, detail: { has_setup_sh: setupSh, has_readme: readme, has_scaling_checklist: scalingChecklist } };
}

function scoreSecretsRotation(repoRoot) {
  // Manual indicator — нет автоматического source-of-truth
  return { score: 60, detail: { note: 'Manually flagged; производственная ротация env vars рекомендуется раз в квартал' } };
}

// --- Utility ---
function extractEnvKeys(content) {
  return content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => l.split('=')[0].trim()).filter(Boolean);
}

// --- Main ---
export function runExitScorecard(repoRoot) {
  const metrics = {
    documentation_coverage: scoreDocumentationCoverage(repoRoot),
    staleness: scoreStaleness(repoRoot),
    type_safety: scoreTypeSafety(repoRoot),
    secret_hygiene: scoreSecretHygiene(repoRoot),
    dependency_freshness: scoreDependencyFreshness(repoRoot),
    tests: scoreTests(repoRoot),
    code_complexity: scoreComplexity(repoRoot),
    architecture_coherence: scoreArchitectureCoherence(repoRoot),
    api_stability: scoreApiStability(repoRoot),
    commit_quality: scoreCommitQuality(repoRoot),
    git_hygiene: scoreGitHygiene(repoRoot),
    license_clarity: scoreLicenseClarity(repoRoot),
    build_reproducibility: scoreBuildReproducibility(repoRoot),
    deploy_reproducibility: scoreDeployReproducibility(repoRoot),
    secrets_rotation: scoreSecretsRotation(repoRoot),
  };

  // Weighted average — all equal (Phase 1). Phase 2 — custom weights per business-goal.
  const scores = Object.values(metrics).map(m => m.score);
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  const month = new Date().toISOString().slice(0, 7);

  // Compare с предыдущим месяцем
  let previousScore = null;
  try {
    const prev = db.prepare(`SELECT overall_score FROM exit_readiness_scorecards
      WHERE month < ? ORDER BY month DESC LIMIT 1`).get(month);
    previousScore = prev?.overall_score ?? null;
  } catch { /* table may not exist yet */ }

  const delta = previousScore != null ? overall - previousScore : null;

  // Persist
  const scoresJson = JSON.stringify(metrics);
  try {
    db.prepare(`INSERT OR REPLACE INTO exit_readiness_scorecards (month, overall_score, scores_json)
      VALUES (?, ?, ?)`).run(month, overall, scoresJson);
  } catch (e) {
    // Table missing — выполнить миграцию отдельно.
    console.error('[exit-scorecard] DB insert failed:', e.message);
  }

  // Generate markdown
  const lines = [
    '# Exit Readiness Scorecard',
    '',
    `> Auto-generated by code-review-agent monthly. Month: **${month}**.`,
    `> Overall: **${overall}/100** ${delta != null ? `(${delta >= 0 ? '+' : ''}${delta} vs previous month)` : '(first run)'}.`,
    '',
    '## Scores by dimension',
    '',
    '| Dimension | Score | Details |',
    '|---|---|---|',
  ];
  for (const [key, m] of Object.entries(metrics)) {
    const detailStr = Object.entries(m.detail).map(([k, v]) => `${k}: ${v}`).join(', ').slice(0, 200);
    lines.push(`| ${key.replace(/_/g, ' ')} | **${m.score}/100** | ${detailStr} |`);
  }
  lines.push('');

  // Weakest dimensions
  const sorted = Object.entries(metrics).sort((a, b) => a[1].score - b[1].score);
  lines.push('## 🎯 Focus areas (top 3 weakest)');
  lines.push('');
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const [key, m] = sorted[i];
    lines.push(`- **${key.replace(/_/g, ' ')}**: ${m.score}/100 — ${m.detail.note || Object.entries(m.detail).map(([k, v]) => `${k}=${v}`).slice(0, 3).join(', ')}`);
  }
  lines.push('');
  lines.push(`## Interpretation`);
  lines.push('');
  if (overall < 50) lines.push('🔴 Not ready for listing. Major gaps in documentation / tests / reproducibility.');
  else if (overall < 75) lines.push('🟡 Pre-sale stage. Нужно доработать weak-dimensions до выхода на Flippa / MotionInvest.');
  else if (overall < 90) lines.push('🟢 Ready for standard listing. Empire Flippers premium tier требует 90+.');
  else lines.push('⭐ Premium-ready. Attractive для strategic buyers.');

  const markdown = lines.join('\n');
  const outPath = path.join(repoRoot, 'docs', 'exit-readiness.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown);

  return { path: outPath, month, overall, delta, metrics };
}
