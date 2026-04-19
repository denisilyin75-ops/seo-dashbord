#!/usr/bin/env node
// Publish markdown review file → WordPress post draft через WP REST API.
//
// Usage:
//   node server/scripts/publish-review-to-wp.js \
//     --site=popolkam \
//     --file=content/popolkam/reviews/obzor-delonghi-magnifica-s-ecam22-110.md \
//     [--category-ids=16,24] \
//     [--status=draft|publish] \
//     [--post-type=post|page]        (default: post; для pages как /o-avtore/ — page)
//
// Что делает:
//   1. Парсит frontmatter (YAML-like simple parser)
//   2. Конвертирует markdown body → Gutenberg-friendly HTML
//   3. POST к WP REST API (credentials из SCC sites table)
//   4. Заполняет popolkam_* meta fields из machine_attrs
//   5. Заполняет Rank Math SEO fields
//   6. Связывает с SCC article record
//
// Note: REHub shortcodes ([wpsm_pros], [wpsm_offerbox] etc.) НЕ вставляются
// автоматически — они требуют ручной правки в wp-admin. Скрипт создаёт базовый
// HTML draft, который потом докрашивается под REHub через Gutenberg editor.

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// ---- CLI args ----
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

const args = parseArgs(process.argv);
if (!args.site || !args.file) {
  console.error(`Usage: --site=<slug> --file=<path to .md> [--category-ids=16,24] [--status=draft|publish]`);
  process.exit(1);
}

// ---- Parse YAML-like frontmatter ----
// Поддерживает simple k: v, lists с '- item', nested maps с 2-space indent.
function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('No frontmatter found (ожидаем --- в начале)');

  const yamlBlock = match[1];
  const body = match[2];

  const meta = {};
  const lines = yamlBlock.split('\n');
  let currentKey = null;
  let currentList = null;
  let currentMap = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const indent = line.match(/^(\s*)/)[1].length;

    if (indent === 0) {
      currentList = null;
      currentMap = null;
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (!m) continue;
      const [, key, val] = m;
      if (val === '' || val === '|' || val === '>') {
        currentKey = key;
        meta[key] = { _open: true }; // temp marker
      } else {
        meta[key] = parseScalar(val);
        currentKey = key;
      }
    } else if (indent === 2) {
      // list item or nested key
      const listMatch = line.match(/^\s*-\s*(.+)$/);
      const kvMatch = line.match(/^\s*(\w+):\s*(.*)$/);

      if (meta[currentKey]?._open && listMatch) {
        if (!Array.isArray(meta[currentKey]) || meta[currentKey]._open) meta[currentKey] = [];
        meta[currentKey].push(parseScalar(listMatch[1]));
      } else if (meta[currentKey]?._open && kvMatch) {
        if (meta[currentKey]._open) meta[currentKey] = {};
        meta[currentKey][kvMatch[1]] = parseScalar(kvMatch[2]);
      }
    }
  }

  // Cleanup _open markers
  for (const k of Object.keys(meta)) {
    if (meta[k]?._open) delete meta[k]._open;
  }

  return { meta, body: body.trimStart() };
}

function parseScalar(v) {
  v = v.trim();
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  if (v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  return v;
}

// ---- Markdown → Gutenberg HTML (simple converter) ----
// Поддерживает: headings, paragraphs, bold, italic, links, ul/ol lists, tables, blockquote, hr, code.
// Wraps content в Gutenberg block comments (<!-- wp:paragraph --> etc) для правильной структуры.
function mdToGutenbergHtml(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line — skip
    if (!line.trim()) { i++; continue; }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = inlineFormat(headingMatch[2]);
      blocks.push(`<!-- wp:heading {"level":${level}} -->\n<h${level} class="wp-block-heading">${text}</h${level}>\n<!-- /wp:heading -->`);
      i++;
      continue;
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      blocks.push('<!-- wp:separator -->\n<hr class="wp-block-separator has-alpha-channel-opacity"/>\n<!-- /wp:separator -->');
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      const quoteText = quoteLines.map(inlineFormat).join('<br>');
      blocks.push(`<!-- wp:quote -->\n<blockquote class="wp-block-quote"><p>${quoteText}</p></blockquote>\n<!-- /wp:quote -->`);
      continue;
    }

    // Code fence
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // close fence
      const code = escapeHtml(codeLines.join('\n'));
      blocks.push(`<!-- wp:code -->\n<pre class="wp-block-code"><code>${code}</code></pre>\n<!-- /wp:code -->`);
      continue;
    }

    // Table
    if (line.includes('|') && i + 1 < lines.length && /^[\s|\-:]+$/.test(lines[i + 1])) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push(convertTable(tableLines));
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      const li = items.map(t => `<li>${inlineFormat(t)}</li>`).join('');
      blocks.push(`<!-- wp:list -->\n<ul class="wp-block-list">${li}</ul>\n<!-- /wp:list -->`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      const li = items.map(t => `<li>${inlineFormat(t)}</li>`).join('');
      blocks.push(`<!-- wp:list {"ordered":true} -->\n<ol class="wp-block-list">${li}</ol>\n<!-- /wp:list -->`);
      continue;
    }

    // Paragraph (multi-line until empty or special)
    const paraLines = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      const para = inlineFormat(paraLines.join(' '));
      blocks.push(`<!-- wp:paragraph -->\n<p>${para}</p>\n<!-- /wp:paragraph -->`);
    }
  }

  return blocks.join('\n\n');
}

function isBlockStart(line) {
  return /^(#{1,6})\s/.test(line)
    || /^[-*]\s+/.test(line)
    || /^\d+\.\s+/.test(line)
    || /^>\s+/.test(line)
    || line.startsWith('```')
    || /^---+$/.test(line.trim())
    || (line.includes('|') && line.trim().startsWith('|'));
}

function inlineFormat(text) {
  return text
    // Images ![alt](src) — skip inline для MVP, просто escape
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Bold **
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic *
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Inline code `
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function convertTable(lines) {
  // lines[0] = header, lines[1] = separator, lines[2+] = data
  const parseRow = (l) => l.split('|').slice(1, -1).map(c => c.trim());
  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  const thead = '<thead><tr>' + headers.map(h => `<th>${inlineFormat(h)}</th>`).join('') + '</tr></thead>';
  const tbody = '<tbody>' + rows.map(r =>
    '<tr>' + r.map(c => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>'
  ).join('') + '</tbody>';

  return `<!-- wp:table -->\n<figure class="wp-block-table"><table>${thead}${tbody}</table></figure>\n<!-- /wp:table -->`;
}

// ---- Main ----
async function main() {
  const filePath = path.isAbsolute(args.file) ? args.file : path.join(REPO_ROOT, args.file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);

  console.log(`[publish] Parsed: ${meta.title}`);
  console.log(`[publish]   slug: ${meta.slug}`);
  console.log(`[publish]   type: ${meta.type} / rubric: ${meta.rubric}`);
  console.log(`[publish]   words: ${body.split(/\s+/).length}`);

  // Load SCC site credentials
  const { db } = await import('../db.js');
  const site = db.prepare('SELECT * FROM sites WHERE name LIKE ? OR id = ?')
    .get(`%${args.site}%`, args.site);
  if (!site) {
    console.error(`Site not found in SCC (searched by name/id: ${args.site})`);
    process.exit(1);
  }
  if (!site.wp_api_url || !site.wp_user || !site.wp_app_password) {
    console.error(`Site ${site.name} missing WP credentials (wp_api_url/wp_user/wp_app_password)`);
    process.exit(1);
  }

  // Extract WP body — strip H1 (WP title renders separately)
  const bodyWithoutH1 = body.replace(/^#\s+.+\n/, '').trimStart();
  const html = mdToGutenbergHtml(bodyWithoutH1);

  // Category IDs
  const categoryIds = args['category-ids']
    ? args['category-ids'].split(',').map(Number)
    : [];

  // Build WP payload
  const payload = {
    title: meta.title,
    slug: meta.slug,
    status: args.status || 'draft',
    content: html,
    excerpt: meta.excerpt || '',
    categories: categoryIds,
    meta: {},
  };

  // popolkam_machine_* meta fields
  if (meta.machine_attrs) {
    const m = meta.machine_attrs;
    const metaFields = {};
    if (m.price_min_rub != null) metaFields.popolkam_machine_price = String(m.price_min_rub);
    if (m.brand && m.model_code) metaFields.popolkam_machine_name = `${m.brand === 'delonghi' ? "De'Longhi" : m.brand} ${m.model_line || ''} ${m.model_code}`.trim();
    if (m.type) metaFields.popolkam_machine_type = m.type;
    payload.meta = { ...payload.meta, ...metaFields };
  }

  // Rank Math SEO (если primary_keyword есть)
  if (meta.primary_keyword) {
    payload.meta.rank_math_focus_keyword = meta.primary_keyword;
  }

  // POST to WP — для pages используется /pages endpoint (нет categories там)
  const postType = args['post-type'] || 'post';
  const endpointSegment = postType === 'page' ? 'pages' : 'posts';
  if (postType === 'page') {
    delete payload.categories; // pages не имеют categories taxonomy
  }
  const wpEndpoint = `${site.wp_api_url.replace(/\/$/, '')}/${endpointSegment}`;
  const auth = Buffer.from(`${site.wp_user}:${site.wp_app_password}`).toString('base64');

  console.log(`[publish] POST ${wpEndpoint}...`);
  const res = await fetch(wpEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[publish] FAIL ${res.status}: ${err.slice(0, 400)}`);
    process.exit(1);
  }

  const wpPost = await res.json();
  console.log(`[publish] ✓ Created WP post #${wpPost.id}`);
  console.log(`[publish]   Edit: ${site.wp_api_url.replace('/wp-json/wp/v2', '')}/wp-admin/post.php?post=${wpPost.id}&action=edit`);
  console.log(`[publish]   Preview: ${wpPost.link}`);
  console.log(`[publish]   Status: ${wpPost.status}`);

  // Register в SCC articles table
  try {
    const articleId = `art_${Math.random().toString(16).slice(2, 10)}`;
    db.prepare(`INSERT OR REPLACE INTO articles
      (id, site_id, wp_post_id, title, url, type, status, content_text, tags, word_count, wp_last_sync, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
        articleId, site.id, wpPost.id,
        meta.title,
        new URL(wpPost.link).pathname,
        meta.type || 'review',
        wpPost.status === 'publish' ? 'published' : 'draft',
        body.replace(/<[^>]+>/g, ' ').slice(0, 50_000),
        JSON.stringify([meta.rubric, ...(meta.lsi_keywords || []).slice(0, 3)].filter(Boolean)),
        body.split(/\s+/).length,
      );
    console.log(`[publish] ✓ SCC article registered: ${articleId}`);
  } catch (e) {
    console.error(`[publish] SCC registration failed: ${e.message}`);
  }

  console.log(`[publish] Done.`);
}

main().catch(e => {
  console.error('[publish] FATAL:', e.stack || e.message);
  process.exit(2);
});
