---
title: "AI Article Merge: fix SEO cannibalization в 1 клик за $0.10"
date: 2026-04-19
tags: [claude, seo, cannibalization, affiliate, anthropic, buildinpublic]
audience: ["SEO community (r/SEO)", "Indie Hackers", "Anthropic use case"]
canonical: https://github.com/denisilyin75-ops/seo-dashbord
draft: true
---

# AI Article Merge: fix SEO cannibalization в 1 клик за $0.10

## Проблема каждого SEO-портфеля после 6 месяцев

Ты пишешь «Обзор De'Longhi Magnifica S» в январе. В марте пишешь «De'Longhi ECAM22.110 — опыт использования» (та же модель, другой ракурс). В июне — «Делонги Магнифика — полный обзор» для другого подбор ключей.

Проходит год. Три наши страницы конкурируют в Google за один и тот же query `de longhi magnifica s обзор`. Google не знает какую приоритизировать → ранжирует **все три в ~15-20 position** вместо того чтобы одна из них пробилась в топ-5.

Это **cannibalization**. Классический SEO-фейл, который убивает рост портфеля после первых 100 статей.

## Ручное решение: consolidation (классика)

1. Прочитать все 3 статьи (~20 мин)
2. Выделить уникальные факты из каждой
3. Написать новую объединённую статью (~3-4 часа)
4. Решить: какой URL оставить (обычно старейший с backlinks)
5. Настроить 301-редиректы с двух старых на оставшийся
6. Удалить дубликаты (или архив)

**Общее время: 4-6 часов** при квалифицированном SEO-specialist.

## Моё AI-решение: 1 клик → 30 секунд → $0.10

В своём SCC (SEO Command Center) я построил merge-workflow. Вот как это выглядит оператору:

### UI flow

1. В списке статей **bulk select** 2-5 статей через checkboxes
2. Клик **«🔀 Merge AI»** в bulk toolbar
3. Ждёшь 10-30 секунд (Sonnet думает)
4. Получаешь preview page с:
   - Merged title (editable)
   - Merged URL slug (editable)
   - 📊 Dedup stats: paragraphs merged / duplicates removed / unique preserved
   - ⚠️ **Conflicts surfaced** — где source-статьи расходятся в фактах + LLM-рекомендация с reason
   - 🔀 **Redirects plan**: какие URLs → куда
   - Full HTML preview merged content
   - FAQs aggregated
5. Review → **Approve & Commit**:
   - Новая статья создаётся в БД
   - Source статьи → status='archived' + `superseded_by_id`
   - 301 redirects список выводится (для применения в Rank Math Redirections)

### Конкретный conflict resolver пример

Когда AI видит что source A пишет «Pump pressure 15 bar» а source B пишет «19 bar» — он surfaces это явно:

```json
{
  "topic": "Pump pressure",
  "a_claim": "15 bar (source 1: Обзор Magnifica)",
  "b_claim": "19 bar (source 2: ECAM22.110 opyt)",
  "recommendation": "15 bar",
  "reason": "matches manufacturer spec on delonghi.com"
}
```

Оператор видит это в UI и может override (хотя в 90% случаев рекомендация AI точная — Sonnet проверяет против manufacturer data если в context есть).

## Как сделано технически

### Prompt (Sonnet 4.6)

```
Ты — редактор, объединяющий 2-5 наших статей об одном продукте/теме в одну консолидированную.

Правила:
- Не выдумывай факты. Всё что есть в результате — должно быть хотя бы в одном source'е.
- Если source'ы противоречат друг другу в фактах (specs, цифры, даты) — surface как conflict.
- Deduplicate одинаковые абзацы.
- Preserve все уникальные факты из всех source'ов (если не дубликат).
- Proposed URL: если параметр не задан, оставь URL самого большого source'а (SEO equity).
- Все остальные URL → 301 redirect в plan.
```

Input: source articles (truncated до 15k chars each), metadata (type, wordCount, URL, updatedAt).

Output: строгий JSON (code-fence wrapped):

```json
{
  "proposed_title": "...",
  "proposed_url_slug": "/...",
  "proposed_content": "<merged HTML>",
  "proposed_excerpt": "...",
  "proposed_faqs": [{ "q": "...", "a": "..." }],
  "conflicts": [ { "topic": "...", "a_claim": "...", "b_claim": "...", "recommendation": "...", "reason": "..." } ],
  "redirects_plan": [ { "from_url": "/old/", "to_url": "/new/", "reason": "superseded by merge" } ],
  "dedup_stats": {
    "total_source_paragraphs": 47,
    "deduplicated": 12,
    "unique_preserved": 35
  }
}
```

### Backend flow

```javascript
export async function planMerge({ site_id, article_ids, params }) {
  // 1. Validate: 2-5 articles, same site_id (cross-site = future work)
  // 2. Load source articles with truncation to 15k chars each
  // 3. Build prompt, call Sonnet
  // 4. Parse JSON (extract from code-fence если нужно)
  // 5. Track в llm_calls для cost analysis
  // 6. Save в merge_previews с status='pending_review'
  // 7. Return preview ID — frontend polls для готовности
}
```

### Commit transaction

```javascript
const tx = db.transaction(() => {
  // 1. Create new article (type=review, status=draft, merged_from_ids=[...])
  db.prepare(`INSERT INTO articles ...`).run(newId, ...);

  // 2. Archive source articles + link to new
  for (const sid of sourceIds) {
    db.prepare(`UPDATE articles SET
      status = 'archived',
      superseded_by_id = ?
      WHERE id = ?`).run(newId, sid);
  }

  // 3. Mark preview as approved
  db.prepare(`UPDATE merge_previews SET
    status = 'approved',
    result_article_id = ?
    WHERE id = ?`).run(newId, id);
});
tx();
```

Redirects — **НЕ applied автоматически**. UI выдаёт оператору список для manual add в Rank Math Redirections. Supreme principle: preview-first, не auto-destroy.

## Точный cost (из llm-tracker)

Merge 3 статей ≈ 8-12k input tokens + 5-6k output = **$0.08-0.15** на Sonnet.

Альтернатива — 4 часа SEO-specialist × $30/час = **$120**.

**ROI: ×800-1500 vs ручной консолидация.**

## Когда НЕ merge

Есть случаи где AI-merge противопоказан и UI показывает warning:

- **Разные query intents** — не объединять "обзор DeLonghi" и "отзывы DeLonghi" даже если про одну модель (разный поисковый intent)
- **Low-quality source** — если одна статья thin content, лучше её удалить вместо включения
- **Backlinks разные** — если у source A 50 domains pointing, у B — 2, merge может испортить link equity (decision: keep A's URL obligatoriy)

Эти случаи UI surfaces но не блокирует — оператор решает.

## Результат на моём портфеле

Пока что **0 merges выполнено** в production (портфель young, cannibalization не набралось). Но infra готова — когда popolkam.ru дойдёт до 30-50 статей и появятся первые конкурирующие страницы, это будет first-click workflow.

Design-decision которым я доволен: **infra заранее**. Когда проблема материализуется — не строим в аварийном режиме, а используем tested tool.

## Код

- **Backend service:** [server/services/merge/index.js](https://github.com/denisilyin75-ops/seo-dashbord/blob/main/server/services/merge/index.js)
- **Frontend:** [src/pages/MergePreviewPage.jsx](https://github.com/denisilyin75-ops/seo-dashbord/blob/main/src/pages/MergePreviewPage.jsx)
- **Design doc:** [docs/features/article-import-and-actions.md §6](https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/features/article-import-and-actions.md)

## Next steps

- Cross-site merge (когда portfolio имеет overlapping niches)
- Auto-push redirects → WP Rank Math API (сейчас manual)
- Merge candidate detection agent — проактивно flag кандидатов на consolidation через GSC query overlap analysis

---

*Building affiliate SEO empire in public. Code Review Agent ($0.50/мес), Content Quality Agent (6 dims), Article Import (Readability + 5 AI actions) + deploy wizard. Весь код open-source: [github.com/denisilyin75-ops/seo-dashbord](https://github.com/denisilyin75-ops/seo-dashbord)*
