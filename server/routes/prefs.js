import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/**
 * Простой key/value JSON-store для UX-настроек одиночного пользователя.
 * Используется для gamification toggle, action impact overrides и т.д.
 *
 * Frontend по умолчанию читает defaults — если ключа нет, отдаём { value: null }.
 */

// GET /api/prefs/:key
router.get('/:key', (req, res) => {
  const row = db.prepare('SELECT value, updated_at FROM user_prefs WHERE key = ?').get(req.params.key);
  if (!row) return res.json({ key: req.params.key, value: null, updatedAt: null });
  let parsed = null;
  try { parsed = row.value ? JSON.parse(row.value) : null; } catch { parsed = row.value; }
  res.json({ key: req.params.key, value: parsed, updatedAt: row.updated_at });
});

// PUT /api/prefs/:key  body: { value: any }
router.put('/:key', (req, res) => {
  const v = req.body?.value;
  const json = v == null ? null : JSON.stringify(v);
  db.prepare(`
    INSERT INTO user_prefs (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(req.params.key, json);
  res.json({ key: req.params.key, value: v });
});

// DELETE /api/prefs/:key — сброс к default
router.delete('/:key', (req, res) => {
  const r = db.prepare('DELETE FROM user_prefs WHERE key = ?').run(req.params.key);
  res.json({ key: req.params.key, deleted: r.changes > 0 });
});

export default router;
