/**
 * AI сервис с поддержкой двух провайдеров:
 *   - anthropic  — прямой SDK @anthropic-ai/sdk (требует ANTHROPIC_API_KEY)
 *   - openrouter — HTTP к https://openrouter.ai/api/v1 (OpenAI-совместимый;
 *                  требует OPENROUTER_API_KEY)
 *
 * Выбор провайдера: env AI_PROVIDER (default: openrouter если есть
 * OPENROUTER_API_KEY, иначе anthropic).
 *
 * Модель: env AI_MODEL. Дефолты:
 *   - anthropic:  claude-sonnet-4-20250514
 *   - openrouter: anthropic/claude-sonnet-4
 */

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODELS = {
  anthropic:  'claude-sonnet-4-20250514',
  openrouter: 'anthropic/claude-sonnet-4',
};

function getProvider() {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === 'anthropic' || explicit === 'openrouter') return explicit;
  // Автовыбор: если есть OpenRouter key — используем его (чаще дешевле/гибче)
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'anthropic'; // не настроено — fallback
}

function getModel(provider) {
  return process.env.AI_MODEL || DEFAULT_MODELS[provider];
}

/**
 * @returns {{configured: boolean, provider: string, model: string, source?: string}}
 */
export function aiStatus() {
  const provider = getProvider();
  const model = getModel(provider);
  if (provider === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    return { configured: true, provider, model, source: 'OPENROUTER_API_KEY' };
  }
  if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return { configured: true, provider, model, source: 'ANTHROPIC_API_KEY' };
  }
  return { configured: false, provider, model };
}

// ---------- Anthropic SDK ----------
let _anthropic = null;
function getAnthropicClient() {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

async function callAnthropic({ system, userMessage, maxTokens = 2000, model }) {
  const c = getAnthropicClient();
  if (!c) return null;
  const res = await c.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userMessage }],
  });
  return {
    text:       res.content?.map((i) => i.text || '').join('\n') || '',
    tokensUsed: (res.usage?.input_tokens || 0) + (res.usage?.output_tokens || 0),
  };
}

// ---------- OpenRouter (OpenAI-compatible) ----------
async function callOpenRouter({ system, userMessage, maxTokens = 2000, model }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: userMessage });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'SEO Command Center',
      ...(process.env.OPENROUTER_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_REFERER } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = await res.json();
  return {
    text:       data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens
      || ((data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0))
      || 0,
  };
}

/**
 * Выполнить произвольную AI-команду.
 * @param {string} command
 * @param {object} context  { site?, article?, articles?, plan? }
 * @returns {Promise<{ result, tokensUsed, model, provider, stub? }>}
 */
export async function executeCommand(command, context = {}) {
  const status = aiStatus();
  if (!status.configured) {
    return {
      result: `⚠️ AI не настроен.\n\nЧтобы включить, добавьте в .env:\n- \`OPENROUTER_API_KEY=sk-or-v1-...\` (и опционально \`AI_PROVIDER=openrouter\`)\nили\n- \`ANTHROPIC_API_KEY=sk-ant-...\`\n\nКоманда: "${command}"`,
      tokensUsed: 0,
      model: status.model,
      provider: status.provider,
      stub: true,
    };
  }

  const systemPrompt = buildSystemPrompt(context);
  const call = status.provider === 'openrouter' ? callOpenRouter : callAnthropic;
  const r = await call({ system: systemPrompt, userMessage: command, model: status.model });
  if (!r) {
    throw new Error(`AI provider "${status.provider}" returned null — проверьте ключ`);
  }
  return { result: r.text, tokensUsed: r.tokensUsed, model: status.model, provider: status.provider };
}

/**
 * Сгенерировать AI-план для нового сайта (deploy wizard, шаг 2). Возвращает JSON.
 */
export async function generateSitePlan({ niche, market, deployType, parentSite, existingSites }) {
  const status = aiStatus();
  const prompt = `Ты SEO-стратег. Новый affiliate-сайт.
Ниша: ${niche}
Рынок: ${market}
Размещение: ${deployType === 'newdomain' ? 'новый домен' : `${deployType} на ${parentSite || '—'}`}
Существующие сайты: ${(existingSites || []).map((s) => `${s.name} (${s.niche})`).join(', ') || '—'}

Ответь строго JSON без markdown, без преамбулы:
{"siteName":"название","seoTitle":"SEO title","description":"мета 160 симв","categories":["кат1","кат2","кат3","кат4","кат5"],"firstArticles":[{"title":"заг","type":"review","priority":"high","slug":"/slug/"},{"title":"заг","type":"comparison","priority":"high","slug":"/slug/"},{"title":"заг","type":"guide","priority":"medium","slug":"/slug/"},{"title":"заг","type":"review","priority":"medium","slug":"/slug/"},{"title":"заг","type":"comparison","priority":"medium","slug":"/slug/"}],"monetization":"рекомендации CPA","estimatedTraffic":"прогноз 3-6 мес","competitionLevel":"low|medium|high","keywords":["кл1","кл2","кл3","кл4","кл5"]}`;

  if (!status.configured) {
    // Заглушка с валидной структурой — wizard работает и без ключа.
    return {
      plan: {
        siteName: `${niche} Expert`,
        seoTitle: `Лучшие ${niche} 2026 — обзоры и сравнения`,
        description: `Независимые обзоры ${niche}, сравнения моделей и рекомендации экспертов.`,
        categories: ['Популярное', 'Бюджетные', 'Премиум', 'Для дома', 'Для офиса'],
        firstArticles: [
          { title: `Топ-10 ${niche} 2026`,       type: 'comparison', priority: 'high',   slug: '/top-10/' },
          { title: `Как выбрать ${niche}`,        type: 'guide',      priority: 'high',   slug: '/kak-vybrat/' },
          { title: `Обзор флагмана`,               type: 'review',     priority: 'high',   slug: '/obzor-flagman/' },
          { title: `Бюджет vs Премиум: сравнение`, type: 'comparison', priority: 'medium', slug: '/budget-vs-premium/' },
          { title: `Гайд по уходу`,                type: 'guide',      priority: 'medium', slug: '/uhod/' },
        ],
        monetization: 'Admitad, Яндекс.Маркет, Ozon CPA',
        estimatedTraffic: '500–1500 sessions/мес через 3 мес',
        competitionLevel: 'medium',
        keywords: [`${niche} купить`, `${niche} обзор`, `лучший ${niche}`, `${niche} 2026`, `${niche} рейтинг`],
      },
      tokensUsed: 0,
      provider: status.provider,
      stub: true,
    };
  }

  const call = status.provider === 'openrouter' ? callOpenRouter : callAnthropic;
  const r = await call({ system: null, userMessage: prompt, maxTokens: 1500, model: status.model });
  const text = (r.text || '').replace(/```json|```/g, '').trim();
  const plan = JSON.parse(text);
  return { plan, tokensUsed: r.tokensUsed, provider: status.provider };
}

function buildSystemPrompt(ctx) {
  const parts = ['Ты SEO-менеджер портфеля affiliate-сайтов (CPA/CPS). Отвечай конкретно, по-русски, markdown с пунктами/списками.'];
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
