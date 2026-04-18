import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

/**
 * GET /api/portfolio/valuation
 *
 * Сумма последних оценок всех активных сайтов + дельты за 24h и 30d.
 * Используется виджетом «Live Portfolio Value» в шапке (Phase A гамификации).
 *
 * Без записи в БД, без AI-вызовов — чистое чтение из site_valuations.
 */
router.get('/valuation', (_req, res) => {
  const sites = db.prepare("SELECT id, name FROM sites WHERE status IN ('active','setup')").all();

  // Последняя оценка каждого сайта
  const latestStmt = db.prepare(`
    SELECT valuation_expected, date FROM site_valuations
    WHERE site_id = ? ORDER BY date DESC, id DESC LIMIT 1
  `);
  // Оценка на дату не позже X
  const atOrBeforeStmt = db.prepare(`
    SELECT valuation_expected, date FROM site_valuations
    WHERE site_id = ? AND date <= ? ORDER BY date DESC, id DESC LIMIT 1
  `);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);

  let total = 0, t24h = 0, t30d = 0;
  const breakdown = [];

  for (const s of sites) {
    const cur = latestStmt.get(s.id);
    if (!cur) continue;
    const v = cur.valuation_expected || 0;
    total += v;

    const prev24h = atOrBeforeStmt.get(s.id, yesterday);
    const prev30d = atOrBeforeStmt.get(s.id, monthAgo);

    // Если истории за нужный момент нет — считаем что сайта тогда «не существовало» с точки зрения оценки.
    t24h += prev24h?.valuation_expected || v;
    t30d += prev30d?.valuation_expected || v;

    breakdown.push({
      siteId: s.id,
      name: s.name,
      value: v,
      date: cur.date,
      prev24h: prev24h?.valuation_expected ?? null,
      prev30d: prev30d?.valuation_expected ?? null,
    });
  }

  // Цель из настроек агента site_valuation, либо дефолт $50k
  const cfgRow = db.prepare("SELECT config_json FROM agents WHERE id = 'site_valuation'").get();
  let target = 50000;
  try {
    const cfg = cfgRow?.config_json ? JSON.parse(cfgRow.config_json) : null;
    if (cfg?.target_exit_valuation_usd) target = Number(cfg.target_exit_valuation_usd);
  } catch { /* ignore */ }

  res.json({
    value: total,
    delta24h: total - t24h,
    delta30d: total - t30d,
    target,
    progressPct: target > 0 ? (total / target) * 100 : 0,
    sitesCount: breakdown.length,
    breakdown,
    asOf: today,
  });
});

export default router;
