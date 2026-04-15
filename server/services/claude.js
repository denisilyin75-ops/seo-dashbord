import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';

let client = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  client = new Anthropic({ apiKey });
  return client;
}

/**
 * Выполнить произвольную AI-команду.
 * @param {string} command
 * @param {object} context  { site?, article?, articles?, plan? }
 * @returns {Promise<{ result: string, tokensUsed: number, model: string, stub?: boolean }>}
 */
export async function executeCommand(command, context = {}) {
  const c = getClient();
  if (!c) {
    return {
      result: `⚠️ ANTHROPIC_API_KEY не задан в .env — AI отключён.\nКоманда: "${command}"\n\n(заглушка: в Фазе 2 здесь будет реальный ответ Claude)`,
      tokensUsed: 0,
      model: MODEL,
      stub: true,
    };
  }

  const systemPrompt = buildSystemPrompt(context);
  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: command }],
  });

  const result = res.content?.map((i) => i.text || '').join('\n') || '—';
  const tokensUsed = (res.usage?.input_tokens || 0) + (res.usage?.output_tokens || 0);
  return { result, tokensUsed, model: MODEL };
}

/**
 * Сгенерировать план для нового сайта (deploy wizard, шаг 2). Возвращает JSON.
 */
export async function generateSitePlan({ niche, market, deployType, parentSite, existingSites }) {
  const c = getClient();
  const prompt = `Ты SEO-стратег. Новый affiliate-сайт.
Ниша: ${niche}
Рынок: ${market}
Размещение: ${deployType === 'newdomain' ? `новый домен` : `${deployType} на ${parentSite || '—'}`}
Существующие сайты: ${(existingSites || []).map((s) => `${s.name} (${s.niche})`).join(', ') || '—'}

Ответь строго JSON без markdown:
{"siteName":"название","seoTitle":"SEO title","description":"мета 160 симв","categories":["кат1","кат2","кат3","кат4","кат5"],"firstArticles":[{"title":"заг","type":"review","priority":"high","slug":"/slug/"},{"title":"заг","type":"comparison","priority":"high","slug":"/slug/"},{"title":"заг","type":"guide","priority":"medium","slug":"/slug/"},{"title":"заг","type":"review","priority":"medium","slug":"/slug/"},{"title":"заг","type":"comparison","priority":"medium","slug":"/slug/"}],"monetization":"рекомендации CPA","estimatedTraffic":"прогноз 3-6 мес","competitionLevel":"low|medium|high","keywords":["кл1","кл2","кл3","кл4","кл5"]}`;

  if (!c) {
    // Заглушка с валидной структурой — чтобы wizard работал без ключа.
    return {
      plan: {
        siteName: `${niche} Expert`,
        seoTitle: `Лучшие ${niche} 2026 — обзоры и сравнения`,
        description: `Независимые обзоры ${niche}, сравнения моделей и рекомендации экспертов.`,
        categories: ['Популярное', 'Бюджетные', 'Премиум', 'Для дома', 'Для офиса'],
        firstArticles: [
          { title: `Топ-10 ${niche} 2026`,           type: 'comparison', priority: 'high',   slug: '/top-10/' },
          { title: `Как выбрать ${niche}`,            type: 'guide',      priority: 'high',   slug: '/kak-vybrat/' },
          { title: `Обзор флагмана`,                   type: 'review',     priority: 'high',   slug: '/obzor-flagman/' },
          { title: `Бюджет vs Премиум: сравнение`,     type: 'comparison', priority: 'medium', slug: '/budget-vs-premium/' },
          { title: `Гайд по уходу`,                    type: 'guide',      priority: 'medium', slug: '/uhod/' },
        ],
        monetization: 'Admitad, Яндекс.Маркет, Ozon CPA',
        estimatedTraffic: '500–1500 sessions/мес через 3 мес',
        competitionLevel: 'medium',
        keywords: [`${niche} купить`, `${niche} обзор`, `лучший ${niche}`, `${niche} 2026`, `${niche} рейтинг`],
      },
      tokensUsed: 0,
      stub: true,
    };
  }

  const res = await c.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  const txt = res.content?.map((i) => i.text || '').join('\n').replace(/```json|```/g, '').trim();
  const plan = JSON.parse(txt);
  return { plan, tokensUsed: (res.usage?.input_tokens || 0) + (res.usage?.output_tokens || 0) };
}

function buildSystemPrompt(ctx) {
  const parts = ['Ты SEO-менеджер портфеля affiliate-сайтов (CPA/CPS). Отвечай конкретно, по-русски, пунктами.'];
  if (ctx.site) {
    const m = ctx.site.metrics || {};
    parts.push(`Сайт: ${ctx.site.name} (${ctx.site.market}, ниша: ${ctx.site.niche}). Метрики: sessions=${m.sessions || 0}, revenue=$${m.revenue || 0}, RPM=$${m.rpm || 0}, CR=${m.cr || 0}%.`);
  }
  if (ctx.article) {
    parts.push(`Статья: "${ctx.article.title}" (${ctx.article.type}, ${ctx.article.status}). CR=${ctx.article.cr}%, sessions=${ctx.article.sessions}.`);
  }
  if (ctx.articles?.length) {
    parts.push(`Статей на сайте: ${ctx.articles.length}.`);
  }
  return parts.join('\n');
}
