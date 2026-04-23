import { Router } from 'express';
import {
  findImageCandidates, uploadImageToWp, trackUnsplashDownload, searchUnsplash, generateFluxImage,
} from '../services/image-finder/index.js';

const router = Router();

// POST /api/images/search
// Body: { query, unsplash_count?, ai_prompts?, orientation?, source_id?, site_id? }
// Returns: { candidates: [...], errors: [...] }
router.post('/images/search', async (req, res) => {
  const b = req.body || {};
  if (!b.query && (!b.ai_prompts || !b.ai_prompts.length)) {
    return res.status(400).json({ error: 'query or ai_prompts required' });
  }
  try {
    const r = await findImageCandidates(b);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/images/unsplash-only — только Unsplash search (бесплатно, для быстрых previews)
router.post('/images/unsplash-only', async (req, res) => {
  const b = req.body || {};
  if (!b.query) return res.status(400).json({ error: 'query required' });
  try {
    const r = await searchUnsplash({ query: b.query, count: b.count || 9, orientation: b.orientation });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/images/flux-generate — singular AI image generation
router.post('/images/flux-generate', async (req, res) => {
  const b = req.body || {};
  if (!b.prompt) return res.status(400).json({ error: 'prompt required' });
  try {
    const r = await generateFluxImage({
      prompt: b.prompt,
      aspect: b.aspect,
      negativePrompt: b.negative_prompt,
      source_id: b.source_id,
      site_id: b.site_id,
    });
    if (r.error) return res.status(502).json(r);
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/images/assign — upload to WP + set as featured
// Body: { site_id, post_id, image_url или image_base64, source, attribution?, license?, alt_text?, unsplash_download_url? }
router.post('/images/assign', async (req, res) => {
  const b = req.body || {};
  if (!b.site_id || !b.post_id) return res.status(400).json({ error: 'site_id + post_id required' });
  if (!b.image_url && !b.image_base64) return res.status(400).json({ error: 'image_url или image_base64 required' });

  try {
    // Trigger Unsplash download tracking если источник Unsplash
    if (b.source === 'unsplash' && b.unsplash_download_url) {
      await trackUnsplashDownload(b.unsplash_download_url);
    }

    const image = b.image_base64 ? Buffer.from(b.image_base64, 'base64') : b.image_url;
    const r = await uploadImageToWp({
      site_id: b.site_id,
      post_id: b.post_id,
      image,
      alt_text: b.alt_text,
      attribution: b.attribution,
      license: b.license,
      filename: b.filename,
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
