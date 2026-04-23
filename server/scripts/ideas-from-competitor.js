#!/usr/bin/env node
// ideas-from-competitor.js
//
// Качает sitemap конкурента, извлекает slug'и, просит Sonnet адаптировать 30-50 тем
// под нашу нишу + нашу персону + RU рынок. Сохраняет в content_plan.
//
// Usage:
//   node server/scripts/ideas-from-competitor.js \
//     --source=https://ohsospotless.com/post-sitemap.xml \
//     --site=aykakchisto \
//     --persona=darya \
//     --max-ideas=40 \
//     [--dry-run]

import 'dotenv/config';
import { randomUUID } from 'node:crypto';

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
if (!args.source || !args.site) {
  console.error('Usage: --source=<sitemap-url> --site=<slug> [--persona=darya|dmitri] [--max-ideas=40] [--dry-run]');
  process.exit(1);
}

const PERSONAS = {
  darya: {
    label: 'Дарья Метёлкина (aykakchisto.ru)',
    voice: `Дарья — химик по образованию, писательница aykakchisto.ru. Разбирает бытовую химию с pH-значениями, составом, реакциями. НЕ использует слова "волшебное средство", "идеальная чистота", "стопроцентно". Голос нейтральный, практичный, с конкретными методиками и пропорциями.`,
    niches: ['роботы-пылесосы', 'пароочистители', 'стиральные порошки', 'средства для посуды', 'пятновыводители', 'плесень', 'запахи', 'уборка по комнатам'],
  },
  dmitri: {
    label: 'Дмитрий Полкин (popolkam.ru)',
    voice: `Дмитрий — инженер-механик, обозреватель popolkam.ru. Разбирает кофемашины/блендеры/мультиварки с замерами, гидравликой, TCO. НЕ использует "идеально", "бомба", "100%", "никаких недостатков". Голос инженерный, с компромиссами.`,
    niches: ['кофемашины', 'блендеры', 'мультиварки', 'чайники', 'кухонная техника'],
  },
};

async function main() {
  const persona = PERSONAS[args.persona || 'darya'];
  if (!persona) throw new Error(`Unknown persona: ${args.persona}`);

  // 1. Fetch sitemap
  console.log(`[ideas] Fetching sitemap: ${args.source}`);
  const res = await fetch(args.source, {
    headers: { 'User-Agent': 'Popolkam SCC Research Bot (+research)' },
  });
  if (!res.ok) throw new Error(`Sitemap fetch failed ${res.status}`);
  const xml = await res.text();

  // 2. Extract slugs (обычный regex — sitemap XML простой)
  const urlMatches = [...xml.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)].map(m => m[1]);
  const slugs = urlMatches
    .filter(u => !u.includes('/wp-content/'))
    .filter(u => !u.endsWith('.xml'))
    .filter(u => !u.includes('/page/') && !u.includes('/tag/') && !u.includes('/category/'))
    .map(u => {
      try {
        return new URL(u).pathname.replace(/^\/|\/$/g, '');
      } catch { return null; }
    })
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // unique

  console.log(`[ideas] Extracted ${slugs.length} unique URLs`);

  // Limit to 250 для prompt budget
  const sampled = slugs.slice(0, 250);

  // 3. Build prompt
  const maxIdeas = Math.min(60, Math.max(10, Number(args['max-ideas']) || 40));

  const system = `Ты — content strategist для русского affiliate-сайта ${args.site}.ru (ниша: ${persona.niches.join(', ')}).

Persona автора: ${persona.label}.
${persona.voice}

Задача: я даю тебе список slug'ов с американского конкурента. Ты:
1. Выбираешь темы подходящие для RU-рынка (без западного-specific context типа US utilities).
2. Адаптируешь title под русский SEO и голос персоны.
3. Предлагаешь angle — что именно будет differentiate от конкурента.
4. Никакой воды. Конкретные заголовки + бриф.

Формат ответа — СТРОГО JSON (можешь обернуть в code-fence):
{
  "ideas": [
    {
      "title": "Как избавиться от запаха от кота на диване: химия + 3 метода",
      "type": "guide",
      "priority": "high|medium|low",
      "rubric": "запахи",
      "search_intent": "как убрать запах кота из дивана",
      "competitor_slug": "how-to-remove-cat-odor-from-couch",
      "angle": "Разбираем почему методы типа 'посыпать содой' работают только частично. Энзимные cleaners vs окислители. Пропорции. Тест на 3 материалах.",
      "estimated_word_count": 1500
    }
  ]
}

Приоритет: high = явно высокий search volume + понятный intent + хорошо под химика-persona. medium = норма. low = edge cases.

Не переводи slug'и дословно — адаптируй под русские search queries (Wordstat-style). Тип — review (обзор конкретного продукта) / comparison (vs) / guide (как сделать) / quiz / tool.

Выдай ровно ${maxIdeas} идей. Никаких preamble — только JSON.`;

  const user = `Ниша на мониторинге (что покрывает аудитория): ${persona.niches.join(', ')}.

Вот ${sampled.length} slug'ов конкурента (${new URL(args.source).host}):

${sampled.join('\n')}

Выдай ${maxIdeas} лучших адаптированных идей для нашего сайта.`;

  console.log(`[ideas] Prompt: ${(system.length + user.length).toLocaleString()} chars, calling Sonnet...`);

  // 4. Call Sonnet
  process.env.DB_PATH = process.env.DB_PATH || '/var/lib/docker/volumes/scc_scc-data/_data/seo.sqlite';
  const { callOpenRouter } = await import('../services/claude.js');
  const { trackLlmCall } = await import('../services/llm-tracker.js');

  const started = Date.now();
  const r = await callOpenRouter({
    system,
    userMessage: user,
    maxTokens: 8000,
    model: 'anthropic/claude-sonnet-4.6',
  });
  const elapsedMs = Date.now() - started;
  if (!r) throw new Error('Sonnet returned null');

  // Track cost
  trackLlmCall({
    source: 'ideas_from_competitor',
    source_id: new URL(args.source).host,
    site_id: args.site,
    operation: 'bulk_ideas_generation',
    provider: 'openrouter',
    model: 'anthropic/claude-sonnet-4.6',
    tokensIn: r.tokensIn || 0,
    tokensOut: r.tokensOut || 0,
    latencyMs: elapsedMs,
    status: 'success',
    generationId: r.generationId,
    fullPrompt: `SYSTEM:\n${system}\n\nUSER:\n${user}`,
    fullResponse: r.text,
  });

  console.log(`[ideas] Sonnet: ${r.tokensIn} in + ${r.tokensOut} out (${elapsedMs}ms)`);

  // 5. Parse JSON
  let parsed;
  try {
    const match = r.text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    const candidate = match ? match[1] : r.text;
    parsed = JSON.parse(candidate);
  } catch (e) {
    const start = r.text.indexOf('{');
    const end = r.text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      parsed = JSON.parse(r.text.slice(start, end + 1));
    } else {
      console.error('[ideas] JSON parse failed. Raw response:');
      console.error(r.text.slice(0, 1000));
      process.exit(1);
    }
  }

  const ideas = parsed.ideas || [];
  console.log(`[ideas] ✓ Parsed ${ideas.length} ideas`);

  if (args['dry-run']) {
    console.log('[ideas] DRY RUN — выводим ideas, не сохраняя в content_plan');
    ideas.forEach((i, idx) => {
      console.log(`\n${idx + 1}. [${i.priority}] ${i.title}`);
      console.log(`   ${i.rubric} · intent: ${i.search_intent}`);
      console.log(`   angle: ${i.angle?.slice(0, 150)}`);
    });
    return;
  }

  // 6. Save в content_plan
  const { db } = await import('../db.js');
  const site = db.prepare('SELECT id, name FROM sites WHERE name LIKE ? OR id = ?').get(`%${args.site}%`, args.site);
  if (!site) {
    console.error(`Site not found: ${args.site}`);
    process.exit(1);
  }

  const source_host = new URL(args.source).host;
  let inserted = 0;
  const insert = db.prepare(`INSERT INTO content_plan
    (id, site_id, title, type, priority, deadline, status, rubric, ai_brief)
    VALUES (?, ?, ?, ?, ?, ?, 'idea', ?, ?)`);

  const tx = db.transaction(() => {
    for (const idea of ideas) {
      const id = `plan_${randomUUID().slice(0, 8)}`;
      const briefBlob = [
        `**Search intent:** ${idea.search_intent || '—'}`,
        `**Angle:** ${idea.angle || '—'}`,
        `**Estimated words:** ${idea.estimated_word_count || '—'}`,
        `**Source:** competitor ${source_host}${idea.competitor_slug ? ` → /${idea.competitor_slug}/` : ''}`,
        `**Imported:** ${new Date().toISOString().slice(0, 10)} via ideas-from-competitor.js`,
      ].join('\n\n');
      insert.run(
        id,
        site.id,
        idea.title,
        idea.type || 'guide',
        idea.priority || 'medium',
        null, // no deadline set
        idea.rubric || null,
        briefBlob,
      );
      inserted++;
    }
  });
  tx();

  console.log(`\n[ideas] ✓ Inserted ${inserted} ideas в content_plan для ${site.name} (${site.id})`);
  console.log(`[ideas] Открой https://cmd.bonaka.app/sites/${site.id} → tab "План" для ревью`);
  console.log(`[ideas] Cost: \$${((r.tokensIn * 3 + r.tokensOut * 15) / 1_000_000).toFixed(4)} (Sonnet 4.6)`);
}

main().catch(e => {
  console.error('[ideas] FATAL:', e.stack || e.message);
  process.exit(2);
});
