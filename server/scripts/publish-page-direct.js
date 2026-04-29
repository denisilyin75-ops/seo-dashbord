#!/usr/bin/env node
// publish-page-direct.js — публикует markdown файл как WP page напрямую
// через REST API. Запускается локально (не нужен docker volume mount).
//
// Usage:
//   node server/scripts/publish-page-direct.js \
//     --md=content/popolkam/pages/o-avtore.md \
//     --site=popolkam \
//     [--status=publish|draft]
//
// Креды читает из:
//   - WP_API_URL, WP_USER, WP_APP_PASSWORD env-переменных, ИЛИ
//   - --site=<slug> → SCC API (требует AUTH_TOKEN env или --token=)

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.length ? rest.join('=') : (argv[i + 1] && !argv[i + 1].startsWith('--') ? (i++, argv[i]) : 'true');
  }
  return out;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^(\w+):\s*"?(.+?)"?$/);
    if (mm) meta[mm[1]] = mm[2];
  }
  return { meta, body: m[2] };
}

// Минимальный markdown → HTML с Gutenberg-friendly блоками (paragraph, heading, list, hr).
// REHub отрендерит классы поверх — ничего экзотичного делать не надо.
function md2html(md) {
  const lines = md.split('\n');
  const out = [];
  let inList = false;
  for (let line of lines) {
    if (/^---\s*$/.test(line)) { if (inList) { out.push('</ul>'); inList = false; } out.push('<hr />'); continue; }
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      if (inList) { out.push('</ul>'); inList = false; }
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inlineMd(h[2])}</h${lvl}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineMd(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (inList && line.trim() === '') { out.push('</ul>'); inList = false; out.push(''); continue; }
    if (inList) { out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ' ' + inlineMd(line) + '</li>'); continue; }
    if (line.trim() === '') { out.push(''); continue; }
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function inlineMd(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

async function getCreds(args) {
  if (process.env.WP_API_URL && process.env.WP_USER && process.env.WP_APP_PASSWORD) {
    return { wp_api_url: process.env.WP_API_URL, wp_user: process.env.WP_USER, wp_app_password: process.env.WP_APP_PASSWORD };
  }
  if (!args.site) throw new Error('Нужны WP_API_URL+WP_USER+WP_APP_PASSWORD env или --site=<slug> (тогда creds возьмём через SCC API)');
  const token = args.token || process.env.AUTH_TOKEN || 'SeoCmd2026!';
  const r = await fetch('https://cmd.bonaka.app/api/sites', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`SCC API HTTP ${r.status}`);
  const sites = await r.json();
  const s = sites.find(x => x.name === `${args.site}.ru` || x.name === args.site || x.id === args.site);
  if (!s) throw new Error(`site ${args.site} не найден в SCC`);
  // SCC API возвращает только wpHasCreds, без app password — пробрасываем через VPS docker exec
  // Альтернатива: env vars. Если creds не отдаются — fail и просим env.
  throw new Error('SCC API не возвращает wp_app_password — задай WP_API_URL/WP_USER/WP_APP_PASSWORD env (см. SCC DB)');
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.md) { console.error('Usage: --md=<path> --site=<slug> [--status=publish|draft]'); process.exit(1); }
  const status = args.status || 'publish';
  const mdPath = path.resolve(args.md);
  if (!fs.existsSync(mdPath)) { console.error(`File не найден: ${mdPath}`); process.exit(1); }

  const raw = fs.readFileSync(mdPath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const title = meta.title?.replace(/^"(.+)"$/, '$1') || path.basename(mdPath, '.md');
  const slug = meta.slug || path.basename(mdPath, '.md');
  const html = md2html(body.trim());

  const creds = await getCreds(args);
  const auth = Buffer.from(`${creds.wp_user}:${creds.wp_app_password}`).toString('base64');

  // Проверяем нет ли уже страницы с этим slug
  const lookup = await fetch(`${creds.wp_api_url}/pages?slug=${encodeURIComponent(slug)}&status=any&context=edit`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const existing = lookup.ok ? await lookup.json() : [];

  let res, action;
  if (Array.isArray(existing) && existing.length > 0) {
    const id = existing[0].id;
    res = await fetch(`${creds.wp_api_url}/pages/${id}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: html, status, slug }),
    });
    action = `UPDATE pages/${id}`;
  } else {
    res = await fetch(`${creds.wp_api_url}/pages`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: html, status, slug }),
    });
    action = 'CREATE pages';
  }

  if (!res.ok) {
    const err = await res.text();
    console.error(`${action} FAILED: HTTP ${res.status}\n${err.slice(0, 500)}`);
    process.exit(1);
  }
  const result = await res.json();
  console.log(`✓ ${action}: ${result.link} (id=${result.id}, status=${result.status})`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
