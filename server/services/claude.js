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

/**
 * Остаток кредитов OpenRouter.
 * @returns {Promise<{configured:boolean, total?:number, used?:number, remaining?:number, error?:string}>}
 */
export async function openRouterCredits() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { configured: false };
  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { 'Authorization': `Bearer ${key}` },
    });
    if (!res.ok) return { configured: true, error: `HTTP ${res.status}` };
    const body = await res.json();
    const d = body?.data || body || {};
    const total = Number(d.total_credits ?? 0);
    const used  = Number(d.total_usage   ?? 0);
    return { configured: true, total, used, remaining: Math.max(0, total - used) };
  } catch (e) {
    return { configured: true, error: e.message };
  }
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
// Exported для специализированных агентов (code-review), которые хотят
// вызывать LLM с собственными system/model/maxTokens без общего buildSystemPrompt.
export { callAnthropic, callOpenRouter };

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

/**
 * Сгенерировать структурированный бриф для статьи контент-плана.
 * Учитывает тип (review/comparison/guide/quiz/tool/category),
 * применяет правила popolkam (блок цен в начале, честные минусы, E-E-A-T).
 *
 * @param {object} params
 * @param {object} params.planItem    { title, type, priority, deadline }
 * @param {object} params.site        { name, niche, market, metrics? }
 * @param {Array}  params.existingArticles  массив {title,type,url?} — для внутренних ссылок
 * @returns {Promise<{brief, tokensUsed, model, provider, stub?}>}
 */
export async function generateContentBrief({ planItem, site, existingArticles = [] }) {
  const status = aiStatus();

  const typeGuide = {
    review: `Формат REVIEW:
- H1: "Обзор [МОДЕЛЬ] [ГОД]: [крючок]"
- Лид 40-60 слов (ответ на вопрос читателя за 10 секунд)
- Вердикт-коробка: 3-5 плюсов, 2-3 минуса, "Кому подойдёт"
- БЛОК ЦЕН в верхней трети страницы (Я.Маркет + М.Видео/Ozon + специализированный)
- Таблица ТТХ
- Детальный разбор: Дизайн / Функции / Работа / Приложение
- Сравнение с 2-3 альтернативами (таблица + внутренние ссылки)
- Раздел "Реальный опыт" — ТО ЧТО НЕ ИЗ ТТХ (шум, тактильно, сюрпризы)
- "Кому брать / кому не брать" — явная рекомендация
- FAQ (5-7 вопросов)
- Финальный CTA "Лучшая цена сейчас"
- Cross-sell: зерно, молочник, чистящие (если кофемашина) или соответствующие аксессуары`,

    comparison: `Формат COMPARISON:
- H1: "[X] vs [Y]: что выбрать в [ГОД]"
- Вердикт сразу: "X для A, Y для B"
- Таблица ключевых отличий (5-8 параметров)
- Сценарии ("если ковры — X", "если бюджет — Y")
- Плюсы/минусы каждой
- БЛОК ЦЕН обоих моделей (минимум 2 мерчанта на каждую)
- FAQ
- Внутренние ссылки на review каждой модели`,

    guide: `Формат GUIDE:
- H1: "Как выбрать [CATEGORY] в [ГОД]"
- Лид: проблема читателя
- Критерии выбора (4-7 параметров) с объяснением
- Рекомендации по бюджетам (до 30к / 30-50к / 50-100к / премиум)
- В каждом бюджете — 2-3 ссылки на наши review/comparison (внутренние!)
- FAQ
- Guide = верх воронки, RPM ниже, но приводит трафик`,

    quiz: `Формат QUIZ:
- 5-7 коротких вопросов (бюджет, сценарий, предпочтения)
- Логика результата: для каждой комбинации — 2-3 рекомендованные модели
- Ссылка на review каждой рекомендации
- Возможность поделиться результатом
- Внизу — FAQ про выбор категории`,

    tool: `Формат TOOL (интерактивный калькулятор):
- Входные параметры (что пользователь вводит)
- Формула/логика расчёта
- Выходные данные (что показываем)
- Объяснение формулы
- Примеры использования
- Ссылки на релевантные review/comparison`,

    category: `Формат CATEGORY (hub-страница):
- H1: название категории с описанием
- Короткое вступление (экспертиза, критерии нашей оценки)
- Блоки подкатегорий (если есть)
- Сетка свежих обзоров (review)
- Топ comparison
- Guide'ы под категорией
- Внутренняя перелинковка обязательна`,
  };

  const typeSection = typeGuide[planItem.type] || typeGuide.review;

  const internalLinks = existingArticles.length
    ? existingArticles.slice(0, 15).map((a) => `- ${a.title} (${a.type}${a.url ? `, ${a.url}` : ''})`).join('\n')
    : '(на сайте пока нет опубликованных статей — внутренние ссылки пока невозможны, учти это)';

  const prompt = `Ты SEO-редактор affiliate-каталога ${site.name} (ниша: ${site.niche}, рынок ${site.market}).

Универсальные правила popolkam:
- Блок цен ВСЕГДА в верхней трети статьи (не в конце)
- Честные минусы обязательны (без них E-E-A-T падает)
- "Реальный опыт" — то что не из ТТХ (шум, тактильно, сюрпризы)
- Минимум 2 партнёрки в блоке цен (диверсификация)
- Внутренние ссылки на 3-5 релевантных материалов
- Cross-sell блок (что ещё купить)
- НЕ писать: переписывание с других сайтов, скрытие минусов, фейковые фото

${typeSection}

Существующие материалы на сайте (для внутренних ссылок):
${internalLinks}

Подготовь ПОДРОБНЫЙ БРИФ на публикацию:

Заголовок: ${planItem.title}
Тип: ${planItem.type}
Приоритет: ${planItem.priority}${planItem.deadline ? `\nДедлайн: ${planItem.deadline}` : ''}

Структура брифа (обязательные пункты):

## 1. Цель статьи
Какому запросу читателя отвечаем, какая стадия воронки (cold/warm/hot)

## 2. Целевая аудитория
2-3 персоны читателей, их боль и мотивация

## 3. SEO meta
- **Title** (до 60 симв, с ключом)
- **Description** (до 160 симв, с CTA)
- **Slug URL** (транслит, короткий)
- **Primary keyword** + 3-5 LSI-фраз

## 4. Структура H2/H3
Подробные заголовки с 1-2 строчками тезисов для каждого

## 5. Ключевые факты
Что должно быть подтверждено цифрами/источниками (ТТХ, цены, тесты)

## 6. Блоки и их расположение
Где блок цен, где CTA, где cross-sell, где внутренние ссылки

## 7. Внутренние ссылки
Из существующих материалов — какие и куда вставлять

## 8. Партнёрки
Какие мерчанты использовать (Я.Маркет / М.Видео / Ozon / DNS / специализированные)

## 9. Распространённые ошибки темы
Что обычно делают не так в обзорах этой тематики

## 10. Картинки
Какие фото/скриншоты нужны, что не брать (stock vs реальные, нейросетевые нельзя)

Ответ строго markdown. Без преамбул. Начни с "# Бриф: ${planItem.title}".`;

  if (!status.configured) {
    return {
      brief: `# Бриф: ${planItem.title}\n\n⚠️ AI не настроен — бриф не может быть сгенерирован автоматически.\n\nДобавьте \`OPENROUTER_API_KEY\` или \`ANTHROPIC_API_KEY\` в .env сервера SCC.\n\nДо настройки: используйте шаблон из \`reference_content_structure.md\` и ручное заполнение на основе стратегии рубрики.`,
      tokensUsed: 0,
      model: status.model,
      provider: status.provider,
      stub: true,
    };
  }

  const call = status.provider === 'openrouter' ? callOpenRouter : callAnthropic;
  const r = await call({ system: null, userMessage: prompt, maxTokens: 3500, model: status.model });
  if (!r) throw new Error(`AI provider "${status.provider}" returned null`);

  return { brief: r.text, tokensUsed: r.tokensUsed, model: status.model, provider: status.provider };
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
