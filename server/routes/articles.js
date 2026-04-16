import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { clientFromSiteRow, WordPressNotConfiguredError, WordPressApiError } from '../services/wordpress.js';

const router = Router();

function hydrateArticle(row) {
  if (!row) return null;
  return {
    id: row.id,
    siteId: row.site_id,
    wpPostId: row.wp_post_id,
    title: row.title,
    url: row.url,
    type: row.type,
    status: row.status,
    sessions: row.sessions,
    clicks: row.clicks,
    cr: row.cr,
    notes: row.notes,
    wpLastSync: row.wp_last_sync,
    updated: row.updated_at,
  };
}

// GET /api/sites/:siteId/articles
router.get('/sites/:siteId/articles', (req, res) => {
  const rows = db.prepare('SELECT * FROM articles WHERE site_id = ? ORDER BY updated_at DESC').all(req.params.siteId);
  res.json(rows.map(hydrateArticle));
});

// POST /api/sites/:siteId/articles
router.post('/sites/:siteId/articles', (req, res) => {
  const b = req.body || {};
  const id = b.id || `art_${randomUUID().slice(0, 8)}`;
  db.prepare(`INSERT INTO articles
    (id, site_id, title, url, type, status, sessions, clicks, cr, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`).run(
    id, req.params.siteId,
    b.title || 'Без названия',
    b.url || '/',
    b.type || 'review',
    b.status || 'planned',
    b.sessions || 0,
    b.clicks || 0,
    b.cr || 0,
    b.notes || '',
  );
  res.status(201).json(hydrateArticle(db.prepare('SELECT * FROM articles WHERE id = ?').get(id)));
});

// PUT /api/articles/:id
router.put('/articles/:id', (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found' });
  db.prepare(`UPDATE articles SET
    title = ?, url = ?, type = ?, status = ?,
    sessions = ?, clicks = ?, cr = ?, notes = ?,
    updated_at = datetime('now')
    WHERE id = ?`).run(
    b.title ?? existing.title,
    b.url ?? existing.url,
    b.type ?? existing.type,
    b.status ?? existing.status,
    b.sessions ?? existing.sessions,
    b.clicks ?? existing.clicks,
    b.cr ?? existing.cr,
    b.notes ?? existing.notes,
    req.params.id,
  );
  res.json(hydrateArticle(db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id)));
});

// DELETE /api/articles/:id
router.delete('/articles/:id', (req, res) => {
  const r = db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Article not found' });
  res.json({ ok: true });
});

// POST /api/articles/:id/sync-wp — pull актуальной версии из WP по wp_post_id,
// или push нашей версии (?direction=push) в WP.
router.post('/articles/:id/sync-wp', async (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(article.site_id);
  if (!site) return res.status(404).json({ error: 'Site not found' });

  let wp;
  try { wp = clientFromSiteRow(site); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  if (!wp) return res.status(400).json({ error: 'WordPress not configured for this site (need wp_api_url, wp_user, wp_app_password)' });

  const direction = req.query.direction === 'push' ? 'push' : 'pull';
  try {
    if (direction === 'pull') {
      if (!article.wp_post_id) return res.status(400).json({ error: 'Article has no wp_post_id — cannot pull' });
      const post = await wp.getPost(article.wp_post_id);
      db.prepare(`UPDATE articles SET
        title = ?, url = ?, status = ?, wp_last_sync = datetime('now'), updated_at = datetime('now')
        WHERE id = ?`).run(
        post.title?.rendered || article.title,
        post.link ? new URL(post.link).pathname : article.url,
        mapWpStatus(post.status),
        req.params.id,
      );
    } else {
      // push — создать или обновить пост в WP
      let wpId = article.wp_post_id;
      if (wpId) {
        await wp.updatePost(wpId, { title: article.title, status: mapLocalStatus(article.status) });
      } else {
        const created = await wp.createPost({ title: article.title, status: mapLocalStatus(article.status) });
        wpId = created.id;
      }
      db.prepare(`UPDATE articles SET wp_post_id = ?, wp_last_sync = datetime('now') WHERE id = ?`).run(wpId, req.params.id);
    }
    const fresh = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    res.json(hydrateArticle(fresh));
  } catch (e) {
    if (e instanceof WordPressApiError) return res.status(502).json({ error: e.message, status: e.status });
    if (e instanceof WordPressNotConfiguredError) return res.status(400).json({ error: e.message });
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sites/:siteId/articles/sync-all — pull всех опубликованных постов сайта в локальную БД
router.post('/sites/:siteId/articles/sync-all', async (req, res) => {
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(req.params.siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const wp = clientFromSiteRow(site);
  if (!wp) return res.status(400).json({ error: 'WordPress not configured for this site' });

  try {
    const posts = await wp.getPosts({ per_page: 100, status: 'publish,draft' });
    const upsert = db.prepare(`INSERT INTO articles
      (id, site_id, wp_post_id, title, url, type, status, wp_last_sync, updated_at)
      VALUES (?, ?, ?, ?, ?, 'review', ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, url = excluded.url, status = excluded.status,
        wp_last_sync = excluded.wp_last_sync, updated_at = excluded.updated_at`);
    const tx = db.transaction((items) => {
      for (const p of items) {
        const id = `wp_${req.params.siteId}_${p.id}`;
        upsert.run(
          id, req.params.siteId, p.id,
          p.title?.rendered || '(без названия)',
          p.link ? new URL(p.link).pathname : '/',
          mapWpStatus(p.status),
        );
      }
    });
    tx(posts);
    res.json({ synced: posts.length });
  } catch (e) {
    if (e instanceof WordPressApiError) return res.status(502).json({ error: e.message, status: e.status });
    res.status(500).json({ error: e.message });
  }
});

function mapWpStatus(s) {
  if (s === 'publish') return 'published';
  if (s === 'draft' || s === 'pending' || s === 'private') return 'draft';
  return 'planned';
}
function mapLocalStatus(s) {
  if (s === 'published') return 'publish';
  if (s === 'draft') return 'draft';
  return 'draft';
}

export default router;
