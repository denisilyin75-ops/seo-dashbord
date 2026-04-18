import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { clientFromSiteRow, WordPressNotConfiguredError, WordPressApiError } from '../services/wordpress.js';
import { logRevision, logBulkRevision, listRevisions, REVISION_KINDS } from '../services/revisions.js';

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
  logRevision(id, req.params.siteId, REVISION_KINDS.MANUAL_EDIT,
    `Создана статья "${(b.title || 'Без названия').slice(0, 80)}"`,
    { type: b.type, status: b.status });
  res.status(201).json(hydrateArticle(db.prepare('SELECT * FROM articles WHERE id = ?').get(id)));
});

// PUT /api/articles/:id
router.put('/articles/:id', async (req, res) => {
  const b = req.body || {};
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found' });

  // Собираем список что реально поменялось (для человекочитаемого summary)
  const changed = [];
  if (b.title != null && b.title !== existing.title) changed.push('title');
  if (b.url != null && b.url !== existing.url) changed.push('url');
  if (b.type != null && b.type !== existing.type) changed.push(`type: ${existing.type}→${b.type}`);
  if (b.status != null && b.status !== existing.status) changed.push(`status: ${existing.status}→${b.status}`);
  if (b.notes != null && b.notes !== existing.notes) changed.push('notes');

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

  if (changed.length) {
    logRevision(req.params.id, existing.site_id, REVISION_KINDS.MANUAL_EDIT,
      `Правка: ${changed.join(', ')}`,
      { changes: changed });
  }

  // Опциональный пуш WP-meta (popolkam_machine_*, popolkam_buy_*) — если переданы и есть wp_post_id
  let metaResult = null;
  if (b.meta && typeof b.meta === 'object' && Object.keys(b.meta).length > 0) {
    if (!existing.wp_post_id) {
      metaResult = { ok: false, error: 'Article has no wp_post_id — meta может быть записан только после первой синхронизации с WP' };
    } else {
      const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(existing.site_id);
      try {
        const wp = clientFromSiteRow(site);
        if (!wp) throw new Error('WordPress not configured for this site');
        await wp.updatePost(existing.wp_post_id, { meta: b.meta });
        const metaKeys = Object.keys(b.meta).join(', ');
        logRevision(req.params.id, existing.site_id, REVISION_KINDS.WP_SYNC_PUSH,
          `Push meta в WordPress: ${metaKeys}`,
          { meta_keys: Object.keys(b.meta) });
        metaResult = { ok: true, pushed: Object.keys(b.meta) };
      } catch (e) {
        metaResult = { ok: false, error: e.message };
      }
    }
  }

  const fresh = hydrateArticle(db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id));
  res.json(metaResult ? { ...fresh, _meta: metaResult } : fresh);
});

// GET /api/articles/:id/meta — подтянуть meta-поля из WP (для редактора)
router.get('/articles/:id/meta', async (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  if (!article.wp_post_id) return res.json({ meta: {}, source: 'no-wp-post' });
  const site = db.prepare('SELECT * FROM sites WHERE id = ?').get(article.site_id);
  try {
    const wp = clientFromSiteRow(site);
    if (!wp) return res.status(400).json({ error: 'WordPress not configured for this site' });
    const post = await wp.getPost(article.wp_post_id);
    res.json({ meta: post.meta || {}, source: 'wp' });
  } catch (e) {
    if (e instanceof WordPressApiError) return res.status(502).json({ error: e.message, status: e.status });
    res.status(500).json({ error: e.message });
  }
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
      logRevision(req.params.id, article.site_id, REVISION_KINDS.WP_SYNC_PULL,
        `Pull из WordPress (wp_id=${article.wp_post_id})`);
    } else {
      // push — создать или обновить пост в WP
      let wpId = article.wp_post_id;
      const isCreate = !wpId;
      if (wpId) {
        await wp.updatePost(wpId, { title: article.title, status: mapLocalStatus(article.status) });
      } else {
        const created = await wp.createPost({ title: article.title, status: mapLocalStatus(article.status) });
        wpId = created.id;
      }
      db.prepare(`UPDATE articles SET wp_post_id = ?, wp_last_sync = datetime('now') WHERE id = ?`).run(wpId, req.params.id);
      logRevision(req.params.id, article.site_id, REVISION_KINDS.WP_SYNC_PUSH,
        isCreate ? `Создан пост в WordPress (wp_id=${wpId})` : `Push обновления в WordPress (wp_id=${wpId})`);
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
    // Пагинация: забираем все страницы пока WP не вернёт меньше per_page
    const allPosts = [];
    const maxPages = 30; // safety cap: 30 × 100 = 3000 постов
    for (let page = 1; page <= maxPages; page++) {
      const posts = await wp.getPosts({ per_page: 100, status: 'publish,draft', page });
      if (!posts.length) break;
      allPosts.push(...posts);
      if (posts.length < 100) break;
    }

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
    tx(allPosts);
    logBulkRevision(req.params.siteId, REVISION_KINDS.WP_SYNC_PULL,
      `Bulk sync: ${allPosts.length} постов из WordPress (${Math.ceil(allPosts.length / 100)} стр)`,
      { count: allPosts.length });
    res.json({ synced: allPosts.length, pages: Math.ceil(allPosts.length / 100) });
  } catch (e) {
    if (e instanceof WordPressApiError) return res.status(502).json({ error: e.message, status: e.status });
    res.status(500).json({ error: e.message });
  }
});

// GET /api/articles/:id/revisions — история изменений статьи
router.get('/articles/:id/revisions', (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  const article = db.prepare('SELECT id FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(listRevisions(req.params.id, { limit }));
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
