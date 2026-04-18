#!/usr/bin/env node
// Sanitize internal markdown (devlog/review_log/blog_posts) → public-safe.
//
// Usage:
//   node server/scripts/prepare-public-post.js < input.md > output.md
//   node server/scripts/prepare-public-post.js --input docs/devlog.md --output docs/public-blog/sanitized.md
//
// Что убираем:
//   - VPS IPs: 5.129.245.98 → [server]
//   - Owner emails
//   - Admin passwords (patterns типа 16+ символьные случайные строки)
//   - API tokens (Bearer xxx, SeoCmd..., sk-or-v1-...)
//   - SSH paths
//   - Agent-specific jargon / TODO internal
//
// Что сохраняем:
//   - Architecture decisions
//   - Metrics (sessions/revenue/cost — это ценно для proof)
//   - Technical learnings
//   - Agent names (они public anyway)

import fs from 'node:fs';

const RULES = [
  // VPS IP
  { re: /5\.129\.245\.98/g, replace: '[server]' },
  { re: /root@5\.129\.245\.98/g, replace: 'root@[server]' },

  // Owner info
  { re: /denis\.ilyin75@gmail\.com/gi, replace: '[owner@example.com]' },
  { re: /Denis Ilyin/g, replace: '[Owner]' },

  // Domains — оставляем (public facts)
  // popolkam.ru / aykakchisto.ru / 4beg.ru / cmd.bonaka.app остаются

  // Auth tokens — patterns
  { re: /SeoCmd\w+!/g, replace: '[AUTH_TOKEN]' },
  { re: /Bearer\s+[\w\-.]{16,}/g, replace: 'Bearer [TOKEN]' },
  { re: /sk-or-v1-[\w-]+/g, replace: 'sk-or-v1-[REDACTED]' },
  { re: /sk-ant-[\w-]+/g, replace: 'sk-ant-[REDACTED]' },
  { re: /DEPLOY_WORKER_TOKEN=\w{32,}/g, replace: 'DEPLOY_WORKER_TOKEN=[REDACTED]' },

  // WP admin passwords — 16-20-char random base64
  { re: /\b[A-Za-z0-9+/=]{16,24}\b(?=\s*(?:admin|password|CeWn))/g, replace: '[REDACTED_PASSWORD]' },

  // SSH paths
  { re: /~\/\.ssh\/[\w-]+/g, replace: '~/.ssh/[key]' },
  { re: /\/root\/\.ssh\/[\w-]+/g, replace: '/root/.ssh/[key]' },

  // Internal notes markers
  { re: /^>\s+\*\*Status:\*\*.*internal.*$/gim, replace: '' },
  { re: /^(TODO|FIXME|XXX|HACK)[:\s].*$/gim, replace: '' },

  // SSH commands с credentials
  { re: /ssh\s+-o\s+StrictHostKeyChecking=no\s+root@/g, replace: 'ssh root@' },

  // Specific admin passwords if they leaked
  { re: /CeWnMgl2KFZC6PlWDFNV/g, replace: '[REDACTED]' },
];

function sanitize(text) {
  let result = text;
  for (const rule of RULES) {
    result = result.replace(rule.re, rule.replace);
  }
  // Cleanup excessive empty lines after deletions
  result = result.replace(/\n{4,}/g, '\n\n\n');
  return result;
}

// ---- CLI ----
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input')  out.input  = argv[++i];
    if (a === '--output') out.output = argv[++i];
    if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function help() {
  console.log(`Usage:
  node prepare-public-post.js < input.md > output.md
  node prepare-public-post.js --input docs/devlog.md --output docs/public-blog/sanitized.md

Removes: IPs, emails, tokens, admin passwords, SSH paths.
Preserves: architecture, metrics, technical content, domain names.`);
}

const args = parseArgs(process.argv);
if (args.help) { help(); process.exit(0); }

let input;
if (args.input) {
  if (!fs.existsSync(args.input)) {
    console.error(`Input not found: ${args.input}`);
    process.exit(1);
  }
  input = fs.readFileSync(args.input, 'utf8');
} else {
  // Read stdin
  input = fs.readFileSync(0, 'utf8');
}

const output = sanitize(input);

if (args.output) {
  fs.writeFileSync(args.output, output);
  console.error(`[sanitize] Wrote ${args.output} (${output.length} chars)`);
} else {
  process.stdout.write(output);
}
