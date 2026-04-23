// Image Finder — standalone MVP до catalog-service Phase 1.
//
// Scope:
//   - Input: post context (title, brand, model, keywords)
//   - Cascade: Unsplash (CC0) → OpenRouter Flux (AI concept) → (future: manufacturer press kits)
//   - Output: массив кандидатов { url, thumb_url, source, license, attribution, width, height }
//   - UI выбирает один → upload в WP Media → set as featured
//
// License handling:
//   - Unsplash: CC0 (free for commercial use, attribution optional but polite)
//   - Flux AI: owned by user (generated based on our prompt)
//
// Cost:
//   - Unsplash: $0 (rate limit 50/hour)
//   - Flux: ~$0.04 per image (OpenRouter black-forest-labs/flux-1.1-pro)
//
// Spec reference: docs/agents/image-curator.md (full vision внутри catalog-service).
// Этот файл — MVP до тех пор пока catalog-service Phase 1 не запущен.

import crypto from 'node:crypto';
import { trackLlmCall } from '../llm-tracker.js';
import { computeCost } from '../ai-pricing.js';

const UNSPLASH_BASE = 'https://api.unsplash.com';

// ============================================================
// Unsplash provider — CC0 photos, бесплатно 50/час
// ============================================================

export async function searchUnsplash({ query, count = 6, orientation = 'landscape' }) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return { items: [], error: 'UNSPLASH_ACCESS_KEY not configured' };
  }

  try {
    const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=${orientation}&content_filter=high`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      return { items: [], error: `Unsplash ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = await res.json();

    const items = (data.results || []).map(p => ({
      id: `unsplash:${p.id}`,
      source: 'unsplash',
      license: 'unsplash_license',  // CC0-like, free for commercial, no attribution required
      attribution: p.user?.name ? `Photo by ${p.user.name} on Unsplash` : 'Unsplash',
      attribution_url: p.user?.links?.html || null,
      url: p.urls?.regular,
      thumb_url: p.urls?.small,
      download_url: p.urls?.full,
      width: p.width,
      height: p.height,
      description: p.alt_description || p.description || '',
      // Unsplash требует триггер download endpoint для tracking когда используешь image
      // https://unsplash.com/documentation#triggering-a-download
      track_download_url: p.links?.download_location,
    }));

    return { items, total: data.total || 0 };
  } catch (e) {
    return { items: [], error: e.message };
  }
}

// Unsplash требует hit download endpoint когда изображение реально используется.
// Вызываем после того как оператор выбрал изображение.
export async function trackUnsplashDownload(downloadUrl) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey || !downloadUrl) return;
  try {
    await fetch(downloadUrl, {
      headers: { 'Authorization': `Client-ID ${accessKey}` },
    });
  } catch { /* non-critical */ }
}

// ============================================================
// OpenRouter Flux provider — AI-generated concept illustrations
// ============================================================

const FLUX_MODEL = 'black-forest-labs/flux-1.1-pro';

export async function generateFluxImage({ prompt, aspect = 'landscape', negativePrompt, source_id, site_id }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { error: 'OPENROUTER_API_KEY not configured' };

  // OpenRouter Flux accepts width/height OR aspect_ratio
  const dims = { landscape: { width: 1200, height: 800 }, square: { width: 1024, height: 1024 }, portrait: { width: 800, height: 1200 } }[aspect] || { width: 1200, height: 800 };

  const fullNegative = [
    negativePrompt,
    'text, watermark, logo, trademark, brand name, copyright symbol, AI-artifact, distorted faces, extra fingers',
  ].filter(Boolean).join(', ');

  try {
    const startedAt = Date.now();
    const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'SEO Command Center Image Finder',
      },
      body: JSON.stringify({
        model: FLUX_MODEL,
        prompt,
        negative_prompt: fullNegative,
        width: dims.width,
        height: dims.height,
      }),
    });
    const elapsedMs = Date.now() - startedAt;

    if (!res.ok) {
      const body = await res.text();
      return { error: `Flux ${res.status}: ${body.slice(0, 300)}` };
    }

    const data = await res.json();
    // OpenRouter может вернуть либо base64 image либо URL — пробуем оба
    let imageUrl = null;
    let imageBase64 = null;

    // Формат 1: { data: [{ url }] }
    if (data.data?.[0]?.url) imageUrl = data.data[0].url;
    // Формат 2: { data: [{ b64_json }] }
    else if (data.data?.[0]?.b64_json) imageBase64 = data.data[0].b64_json;
    // Формат 3: { image } (raw base64)
    else if (data.image) imageBase64 = data.image;

    if (!imageUrl && !imageBase64) {
      return { error: 'No image in Flux response', raw: JSON.stringify(data).slice(0, 500) };
    }

    // Track в llm_calls для cost visibility
    // Flux pricing ~$0.04 per image — записываем как flat cost (не token-based)
    const cost = 0.04;
    trackLlmCall({
      source: 'image_finder',
      source_id: source_id || null,
      site_id: site_id || null,
      operation: 'flux_generate',
      provider: 'openrouter',
      model: FLUX_MODEL,
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: elapsedMs,
      status: 'success',
      generationId: data.id || null,
      fullPrompt: `PROMPT: ${prompt}\nNEGATIVE: ${fullNegative}`,
    });
    // Override cost — Flux pricing flat (not per-token)
    const { db } = await import('../../db.js');
    db.prepare(`UPDATE llm_calls SET cost_usd = ? WHERE id = last_insert_rowid()`).run(cost);

    return {
      id: `flux:${data.id || crypto.randomBytes(4).toString('hex')}`,
      source: 'flux',
      license: 'ai_generated',
      attribution: 'AI-generated (Flux)',
      attribution_url: null,
      url: imageUrl,
      base64: imageBase64,
      width: dims.width,
      height: dims.height,
      prompt,
      cost_usd: cost,
      elapsed_ms: elapsedMs,
    };
  } catch (e) {
    return { error: e.message };
  }
}

// ============================================================
// Orchestrator — combined search over Unsplash + Flux prompts
// ============================================================

/**
 * Основной entry — находит candidates для статьи.
 * @param {object} opts
 * @param {string} opts.query — search text для Unsplash
 * @param {number} [opts.unsplash_count=6] — сколько photos от Unsplash
 * @param {Array<string>} [opts.ai_prompts] — prompts для AI-generated options (пустой = skip Flux)
 * @param {string} [opts.orientation='landscape']
 * @returns {Promise<{ candidates: Array }>}
 */
export async function findImageCandidates(opts) {
  const candidates = [];
  const errors = [];

  // 1. Unsplash search
  if (opts.query) {
    const u = await searchUnsplash({ query: opts.query, count: opts.unsplash_count || 6, orientation: opts.orientation });
    if (u.error) errors.push({ provider: 'unsplash', error: u.error });
    candidates.push(...(u.items || []));
  }

  // 2. Flux AI generations — по одной per prompt (каждая $0.04)
  if (opts.ai_prompts && opts.ai_prompts.length) {
    for (const prompt of opts.ai_prompts) {
      const f = await generateFluxImage({ prompt, aspect: opts.orientation, source_id: opts.source_id, site_id: opts.site_id });
      if (f.error) errors.push({ provider: 'flux', error: f.error, prompt });
      else candidates.push(f);
    }
  }

  return { candidates, errors };
}

/**
 * Upload image в WP Media Library + assign as featured_media поста.
 * @param {object} opts
 * @param {string} opts.site_id
 * @param {number} opts.post_id — WP post ID
 * @param {string|Buffer} opts.image — URL или Buffer данных
 * @param {string} [opts.alt_text]
 * @param {string} [opts.attribution]
 * @param {string} [opts.license]
 * @returns {Promise<{ media_id, featured_set }>}
 */
export async function uploadImageToWp({ site_id, post_id, image, alt_text, attribution, license, filename }) {
  const { db } = await import('../../db.js');
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(site_id);
  if (!site) throw new Error('Site not found');
  if (!site.wp_api_url || !site.wp_user || !site.wp_app_password) {
    throw new Error('Site WP creds missing');
  }

  // Скачиваем если url, иначе берём buffer
  let buffer;
  let contentType = 'image/jpeg';
  if (typeof image === 'string') {
    const r = await fetch(image);
    if (!r.ok) throw new Error(`Image fetch failed: ${r.status}`);
    contentType = r.headers.get('content-type') || 'image/jpeg';
    buffer = Buffer.from(await r.arrayBuffer());
  } else if (Buffer.isBuffer(image)) {
    buffer = image;
  } else {
    throw new Error('image must be URL string or Buffer');
  }

  // Determine extension из content-type
  const extMap = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = extMap[contentType] || 'jpg';
  const finalFilename = filename || `scc-image-${Date.now()}.${ext}`;

  // POST в WP REST /media
  const auth = Buffer.from(`${site.wp_user}:${site.wp_app_password}`).toString('base64');
  const mediaRes = await fetch(`${site.wp_api_url.replace(/\/$/, '')}/media`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${finalFilename}"`,
    },
    body: buffer,
  });
  if (!mediaRes.ok) {
    const err = await mediaRes.text();
    throw new Error(`WP media upload failed ${mediaRes.status}: ${err.slice(0, 300)}`);
  }
  const media = await mediaRes.json();

  // Update alt_text + caption с attribution
  const metaUpdate = {};
  if (alt_text) metaUpdate.alt_text = alt_text;
  const caption = attribution ? `${attribution}${license ? ` · License: ${license}` : ''}` : null;
  if (caption) metaUpdate.caption = caption;

  if (Object.keys(metaUpdate).length) {
    await fetch(`${site.wp_api_url.replace(/\/$/, '')}/media/${media.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metaUpdate),
    }).catch(() => { /* non-critical */ });
  }

  // Set as featured_media
  const updateRes = await fetch(`${site.wp_api_url.replace(/\/$/, '')}/posts/${post_id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ featured_media: media.id }),
  });
  // pages использует /pages endpoint — try fallback
  let featured_set = updateRes.ok;
  if (!updateRes.ok) {
    const pageRes = await fetch(`${site.wp_api_url.replace(/\/$/, '')}/pages/${post_id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ featured_media: media.id }),
    });
    featured_set = pageRes.ok;
  }

  return {
    media_id: media.id,
    media_url: media.source_url,
    featured_set,
  };
}
