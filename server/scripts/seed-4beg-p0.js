/**
 * One-shot: заливает 20 P0 идей contennt-плана в content_plan для 4beg.ru.
 * Источник идей: docs/strategies/running-shoes.md §4 HIGH (P0).
 *
 * Usage (на VPS, изнутри scc контейнера):
 *   docker exec scc node server/scripts/seed-4beg-p0.js
 */

import { randomUUID } from 'node:crypto';
import { db } from '../db.js';

const SITE_ID = 'site_f981a1bc'; // 4beg.ru

const IDEAS = [
  // Главный pillar
  { title: 'Как выбрать беговые кроссовки в 2026 — гид новичка', type: 'guide', rubric: 'pillar' },
  { title: 'Топ-10 беговых кроссовок Asics 2026 — все линейки сравнили', type: 'top', rubric: 'top-by-brand' },
  { title: 'Топ-10 беговых кроссовок Nike 2026', type: 'top', rubric: 'top-by-brand' },
  { title: 'Топ-10 беговых кроссовок Saucony 2026', type: 'top', rubric: 'top-by-brand' },
  { title: 'Топ-10 беговых кроссовок Adidas 2026', type: 'top', rubric: 'top-by-brand' },

  // Top by use-case
  { title: 'Лучшие беговые кроссовки для марафона 2026 — топ-12', type: 'top', rubric: 'top-by-usecase' },
  { title: 'Лучшие кроссовки для полумарафона и 10k 2026', type: 'top', rubric: 'top-by-usecase' },
  { title: 'Лучшие кроссовки для тренировок и восстановления 2026', type: 'top', rubric: 'top-by-usecase' },
  { title: 'Лучшие трейловые кроссовки 2026 — Hoka, Salomon, Asics, Saucony', type: 'top', rubric: 'top-by-usecase' },
  { title: 'Лучшие кроссовки для начинающего бегуна 2026', type: 'top', rubric: 'top-by-usecase' },

  // Top by price
  { title: 'Лучшие беговые кроссовки до 8 000 ₽ — топ бюджет 2026', type: 'top', rubric: 'top-by-price' },
  { title: 'Лучшие беговые кроссовки 8 000 – 15 000 ₽ — оптимальный mid 2026', type: 'top', rubric: 'top-by-price' },

  // Эволюции линеек (vs-сравнения)
  { title: 'Nike Pegasus: 38 vs 39 vs 40 vs 41 — какой год брать в 2026', type: 'comparison', rubric: 'evolution' },
  { title: 'Asics Gel Cumulus 23 vs 24 vs 25 vs 26 — стоит ли апгрейд', type: 'comparison', rubric: 'evolution' },
  { title: 'Asics Gel Nimbus 23 vs 24 vs 25 vs 26 — какой Nimbus выбрать', type: 'comparison', rubric: 'evolution' },
  { title: 'Asics Gel Kayano 28 vs 29 vs 30 vs 31 — все Kayano последних 4 лет', type: 'comparison', rubric: 'evolution' },
  { title: 'Saucony Triumph 17 vs 19 vs 21 vs 22 — все Triumph', type: 'comparison', rubric: 'evolution' },

  // Direct flagship vs flagship
  { title: 'Nike Pegasus 41 vs Asics Cumulus 26 — daily trainer 2026, что взять', type: 'comparison', rubric: 'flagship-vs' },
  { title: 'Asics Nimbus 26 vs Saucony Triumph 22 vs NB 1080 v13 — флагман подушки', type: 'comparison', rubric: 'flagship-vs' },
  { title: 'Asics Kayano 31 vs Brooks Adrenaline GTS 23 — лучшие stability 2026', type: 'comparison', rubric: 'flagship-vs' },
];

const insert = db.prepare(`INSERT INTO content_plan
  (id, site_id, title, type, priority, status, rubric, phase)
  VALUES (?, ?, ?, ?, 'high', 'idea', ?, 'A')`);

let inserted = 0, skipped = 0;
const tx = db.transaction(() => {
  for (const idea of IDEAS) {
    const dup = db.prepare(`SELECT id FROM content_plan WHERE site_id = ? AND title = ?`)
      .get(SITE_ID, idea.title);
    if (dup) { skipped++; continue; }
    const id = `plan_${randomUUID().slice(0, 8)}`;
    insert.run(id, SITE_ID, idea.title, idea.type, idea.rubric);
    inserted++;
  }
});
tx();

console.log(`[seed-4beg-p0] inserted=${inserted}, skipped (dup)=${skipped}, total=${IDEAS.length}`);
