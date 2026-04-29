#!/usr/bin/env node
// set-featured-images-popolkam.js — для каждого поста popolkam без featured image
// 1. Подбирает Unsplash query по типу/бренду из title
// 2. Запрашивает SCC API /api/images/unsplash-only
// 3. Скачивает первое фото
// 4. Загружает в WP media library
// 5. PATCH posts/{id}.featured_media = newly_uploaded_id
//
// Use:
//   node server/scripts/set-featured-images-popolkam.js
//
// Требует env: WP_API_URL, WP_USER, WP_APP_PASSWORD, SCC_TOKEN

const SCC_API = 'https://cmd.bonaka.app';
const WP_API = process.env.WP_API_URL || 'https://popolkam.ru/wp-json/wp/v2';
const WP_USER = process.env.WP_USER || 'admin_pp';
const WP_PASS = process.env.WP_APP_PASSWORD;
const SCC_TOKEN = process.env.SCC_TOKEN || 'SeoCmd2026!';

if (!WP_PASS) { console.error('FATAL: WP_APP_PASSWORD env required'); process.exit(1); }

const WP_AUTH = Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64');

// Подбор Unsplash query по title — простая heuristic
function pickQuery(title) {
  const t = title.toLowerCase();
  if (/comparison|vs |сравн/i.test(title)) return { q: 'two espresso cups latte art', tags: 'comparison' };
  if (/топ|рейтинг|лучшие|top.?\d/i.test(title)) return { q: 'modern coffee shop espresso bar', tags: 'listicle' };
  if (/jura/i.test(t)) return { q: 'luxury espresso machine kitchen', tags: 'product' };
  if (/saeco|picobaristo/i.test(t)) return { q: 'espresso machine professional', tags: 'product' };
  if (/philips|lattego/i.test(t)) return { q: 'modern coffee machine kitchen', tags: 'product' };
  if (/delonghi|magnifica/i.test(t)) return { q: 'espresso machine pour kitchen', tags: 'product' };
  return { q: 'espresso machine kitchen', tags: 'generic' };
}

async function fetchPostsWithoutFeatured() {
  const r = await fetch(`${WP_API}/posts?status=draft,publish&per_page=20&_fields=id,title,slug,status,featured_media`, {
    headers: { Authorization: `Basic ${WP_AUTH}` },
  });
  if (!r.ok) throw new Error(`WP posts list HTTP ${r.status}`);
  const posts = await r.json();
  return posts.filter(p => !p.featured_media);
}

async function searchUnsplash(query) {
  const r = await fetch(`${SCC_API}/api/images/unsplash-only`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SCC_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, count: 3, orientation: 'landscape' }),
  });
  if (!r.ok) throw new Error(`SCC unsplash HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`Unsplash: ${j.error}`);
  if (!j.items?.length) throw new Error(`Unsplash: 0 results for "${query}"`);
  return j.items[0]; // первый результат
}

async function downloadImage(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`download HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadToWp(buffer, filename, alt, attribution) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), filename);
  form.append('alt_text', alt);
  form.append('caption', attribution);
  // WP REST требует multipart с custom headers — используем raw fetch
  const r = await fetch(`${WP_API}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${WP_AUTH}`,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Type': 'image/jpeg',
    },
    body: buffer,
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error(`WP media upload HTTP ${r.status}: ${err.slice(0, 300)}`);
  }
  const data = await r.json();
  // Дозаполняем alt_text + caption отдельным PATCH
  await fetch(`${WP_API}/media/${data.id}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${WP_AUTH}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ alt_text: alt, caption: attribution }),
  });
  return data.id;
}

async function setPostFeatured(postId, mediaId) {
  const r = await fetch(`${WP_API}/posts/${postId}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${WP_AUTH}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ featured_media: mediaId }),
  });
  if (!r.ok) throw new Error(`WP post PATCH HTTP ${r.status}`);
  return r.json();
}

async function main() {
  const posts = await fetchPostsWithoutFeatured();
  console.log(`Найдено ${posts.length} постов без featured image\n`);

  for (const p of posts) {
    const title = p.title.rendered;
    const { q, tags } = pickQuery(title);
    process.stdout.write(`[${tags.padEnd(10)}] id=${p.id} ${title.slice(0, 55)} → "${q}"... `);
    try {
      const photo = await searchUnsplash(q);
      const buf = await downloadImage(photo.url);
      const filename = `featured-${p.slug || p.id}.jpg`;
      const alt = `${title.replace(/<[^>]+>/g,'').slice(0, 100)}`;
      const attribution = photo.attribution || 'Photo from Unsplash';
      const mediaId = await uploadToWp(buf, filename, alt, attribution);
      await setPostFeatured(p.id, mediaId);
      console.log(`✓ media=${mediaId}`);
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
