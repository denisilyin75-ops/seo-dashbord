/**
 * Daily Brief — 4 карточки для дашборда оператора:
 *   health   — здоровье сайта (HTTP 200, SSL, базовая интеграция)
 *   pulse    — RPM/Revenue за вчера vs позавчера
 *   idea     — 1 AI-идея свежей статьи
 *   quickWin — 1 конкретное действие на сегодня
 *
 * Карточки кэшируются в таблице daily_briefs (один раз в день).
 * Принудительное пересоздание — через refresh=true.
 */

import { db } from '../db.js';
import { executeCommand } from './claude.js';

const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
const dayBefore = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
};

/**
 * Health check — делает HTTP запрос к сайту, проверяет HTTPS и status 200.
 */
async function buildHealthCard(site) {
  const url = `https://${site.name}/`;
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(timer);
    const ms = Date.now() - t0;

    if (r.status >= 200 && r.status < 400) {
      return {
        type: 'health',
        status: ms > 3000 ? 'yellow' : 'green',
        title: 'Сайт работает',
        summary: `HTTP ${r.status} за ${ms}ms${ms > 3000 ? ' (медленно)' : ''}`,
        details: { statusCode: r.status, latencyMs: ms, url },
      };
    }
    return {
      type: 'health',
      status: 'red',
      title: 'Сайт отвечает с ошибкой',
      summary: `HTTP ${r.status}`,
      details: { statusCode: r.status, latencyMs: ms, url },
    };
  } catch (e) {
    return {
      type: 'health',
      status: 'red',
      title: 'Сайт не отвечает',
      summary: e.name === 'AbortError' ? 'Таймаут 8 секунд' : e.message,
      details: { error: e.message, url },
    };
  }
}

/**
 * Pulse — метрики вчера vs позавчера.
 * Если метрик нет — показываем "нет данных" с подсказкой.
 */
function buildPulseCard(site) {
  const yRow = db.prepare('SELECT * FROM site_metrics WHERE site_id = ? AND date = ?').get(site.id, yesterdayStr()) || null;
  const pRow = db.prepare('SELECT * FROM site_metrics WHERE site_id = ? AND date = ?').get(site.id, dayBefore()) || null;

  if (!yRow || yRow.sessions === 0) {
    return {
      type: 'pulse',
      status: 'yellow',
      title: 'Метрики пусты',
      summary: 'Подключите GA4/GSC и запустите Pull, или подождите ночного cron (03:00 UTC)',
      details: { hasGa4: !!site.ga4_property_id, hasGsc: !!site.gsc_site_url },
    };
  }

  const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);
  const rpmDelta = pRow ? pct(yRow.rpm, pRow.rpm) : null;
  const revDelta = pRow ? pct(yRow.revenue, pRow.revenue) : null;

  const status = rpmDelta != null && rpmDelta < -15 ? 'red'
    : rpmDelta != null && rpmDelta < -5 ? 'yellow'
    : 'green';

  return {
    type: 'pulse',
    status,
    title: 'Метрики за вчера',
    summary: `Revenue ${yRow.revenue.toFixed(0)} • RPM ${yRow.rpm.toFixed(1)}${rpmDelta != null ? ` (${rpmDelta > 0 ? '+' : ''}${rpmDelta}% dod)` : ''}`,
    details: {
      yesterday: { date: yRow.date, sessions: yRow.sessions, revenue: yRow.revenue, rpm: yRow.rpm, clicks: yRow.affiliate_clicks, sales: yRow.sales },
      dayBefore: pRow ? { date: pRow.date, sessions: pRow.sessions, revenue: pRow.revenue, rpm: pRow.rpm } : null,
      delta: { rpmPct: rpmDelta, revenuePct: revDelta },
    },
  };
}

/**
 * Idea of the day — AI генерит 1 свежую идею.
 * Короткий промпт, один ответ, не списком.
 */
async function buildIdeaCard(site) {
  const arts = db.prepare('SELECT title FROM articles WHERE site_id = ? LIMIT 30').all(site.id);
  const plan = db.prepare('SELECT title FROM content_plan WHERE site_id = ? AND status != ?').all(site.id, 'done');

  const existing = [...arts.map((a) => a.title), ...plan.map((p) => p.title)].join('; ') || 'пока нет';

  const prompt = `Сайт «${site.name}» — ${site.niche || 'affiliate'}, рынок ${site.market}.
Уже есть/запланировано: ${existing}.
Предложи ОДНУ свежую идею для статьи, которой ещё нет. Формат: "заголовок — в 1 предложении почему это зайдёт (ключ/тренд/сезон)". Без списка.`;

  try {
    const { result, stub, model } = await executeCommand(prompt, {
      site: { ...site, metrics: {} },
    });
    return {
      type: 'idea',
      status: stub ? 'yellow' : 'green',
      title: stub ? 'AI не настроен' : 'Идея на сегодня',
      summary: result.trim().slice(0, 300),
      details: { stub, model, fullResult: result },
    };
  } catch (e) {
    return {
      type: 'idea',
      status: 'yellow',
      title: 'Идея не сгенерирована',
      summary: e.message,
      details: { error: e.message },
    };
  }
}

/**
 * Expected Value UX per memory feedback_expected_value_ux.md — каждое действие
 * с вычислимым эффектом показывает + $X к капитализации или потенциалу EPC/мес.
 * Значения синхронизированы с PER_ARTICLE_VALUE из agents/site-valuation.js.
 */
const IMPACT = {
  WP_SETUP:        '+$500 к капитализации (разблокирует ежедневный пайплайн)',
  GA4_SETUP:       '+$200 к капитализации (без метрик невозможно оптимизировать)',
  GSC_SETUP:       '+$150 к капитализации (видишь что ранжируется)',
  OLD_DRAFT:       '+$15-40 к капитализации (каждая публикация = бесплатный актив)',
  IDEA_BRIEF:      '+$15-40 к капитализации когда пост выйдет (шаг к публикации)',
  OVERDUE:         'Держит momentum (momentum факторы ×$500 к valuation)',
  FIRST_ARTICLE:   '+$40 к капитализации + разблокирует все остальное',
  CONTENT_HEALTH_RED: 'Красные issue снижают quality score → GSC position → -$N/мес',
  CONTENT_HEALTH_BATCH: '1 запуск = ~$0 (всё локально), результат = список fix-able issues',
};

/**
 * Quick win — детерминированные проверки, наиболее срочное первым.
 * Каждая check теперь содержит поле impact — expected value на бюджет оператора.
 */
function buildQuickWinCard(site) {
  const checks = [];

  // 1. Нет WP-креды
  if (!site.wp_api_url || !site.wp_app_password) {
    checks.push({
      priority: 10,
      title: 'Подключи WordPress',
      summary: 'Без Application Password — синк статей, WP meta, редактирование из SCC не работают',
      impact: IMPACT.WP_SETUP,
      action: { type: 'edit_site', siteId: site.id },
    });
  }

  // 2. Нет GA4/GSC
  if (!site.ga4_property_id) {
    checks.push({
      priority: 8,
      title: 'Подключи GA4',
      summary: 'Без GA4 не увидишь трафик и revenue — невозможно считать RPM / EPC',
      impact: IMPACT.GA4_SETUP,
      action: { type: 'edit_site', siteId: site.id },
    });
  }
  if (!site.gsc_site_url) {
    checks.push({
      priority: 7,
      title: 'Подключи Search Console',
      summary: 'GSC = источник Ранг-позиций, топ-запросов, CTR сниппетов',
      impact: IMPACT.GSC_SETUP,
      action: { type: 'edit_site', siteId: site.id },
    });
  }

  // 3. Старые черновики
  const oldDraft = db.prepare(`SELECT id, title, type FROM articles
    WHERE site_id = ? AND status = 'draft' AND updated_at < date('now', '-7 days')
    ORDER BY updated_at ASC LIMIT 1`).get(site.id);
  if (oldDraft) {
    // PER_ARTICLE_VALUE — synced с site-valuation agent
    const VALUES = { review: 15, comparison: 25, guide: 10, quiz: 30, tool: 40, category: 20 };
    const v = VALUES[oldDraft.type] || 15;
    checks.push({
      priority: 6,
      title: `Опубликуй черновик "${oldDraft.title.slice(0, 50)}"`,
      summary: `Лежит в drafts больше недели — доведи до публикации`,
      impact: `+$${v} к капитализации после публикации`,
      action: { type: 'open_article', articleId: oldDraft.id },
    });
  }

  // 4. Идеи без брифа
  const ideaNoBrief = db.prepare(`SELECT id, title, type FROM content_plan
    WHERE site_id = ? AND status = 'idea' AND (ai_brief IS NULL OR ai_brief = '')
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      deadline ASC
    LIMIT 1`).get(site.id);
  if (ideaNoBrief) {
    const VALUES = { review: 15, comparison: 25, guide: 10, quiz: 30, tool: 40, category: 20 };
    const v = VALUES[ideaNoBrief.type] || 15;
    checks.push({
      priority: 5,
      title: `Сгенерируй бриф для "${ideaNoBrief.title.slice(0, 50)}"`,
      summary: 'В плане есть идея без брифа — AI подготовит структуру статьи',
      impact: `+$${v} к капитализации когда пост выйдет (шаг к публикации)`,
      action: { type: 'generate_brief', planId: ideaNoBrief.id },
    });
  }

  // 5. Просроченный дедлайн
  const overdue = db.prepare(`SELECT id, title, deadline FROM content_plan
    WHERE site_id = ? AND status != 'done' AND deadline IS NOT NULL AND deadline < date('now')
    ORDER BY deadline ASC LIMIT 1`).get(site.id);
  if (overdue) {
    checks.push({
      priority: 9,
      title: `Просрочен: "${overdue.title.slice(0, 50)}"`,
      summary: `Дедлайн был ${overdue.deadline} — перенеси или закрой`,
      impact: IMPACT.OVERDUE,
      action: { type: 'open_plan', planId: overdue.id },
    });
  }

  // 6. Совсем пусто
  const articleCount = db.prepare('SELECT COUNT(*) AS n FROM articles WHERE site_id = ?').get(site.id).n;
  if (articleCount === 0) {
    checks.push({
      priority: 3,
      title: 'Напиши первую статью',
      summary: 'Каталог пуст. Начни с обзора одной ключевой модели',
      impact: IMPACT.FIRST_ARTICLE,
      action: { type: 'new_article', siteId: site.id },
    });
  }

  // 7. Content Quality red issues
  try {
    const healthRed = db.prepare(`SELECT COUNT(*) AS n FROM content_health
      WHERE site_id = ? AND severity = 'red' AND resolved_at IS NULL AND ignored = 0`).get(site.id).n;
    if (healthRed > 0) {
      checks.push({
        priority: 7,
        title: `${healthRed} red issue${healthRed > 1 ? 's' : ''} в Content Health`,
        summary: 'Проверка качества нашла критичные проблемы — открой таб Quality и закрой топ-3',
        impact: IMPACT.CONTENT_HEALTH_RED,
        action: { type: 'open_quality', siteId: site.id },
      });
    } else if (healthRed === 0) {
      // Если quality-прогон ещё не запускался, подталкиваем к batch-анализу
      const hasAnyScore = db.prepare(`SELECT 1 FROM content_quality_scores WHERE site_id = ? LIMIT 1`).get(site.id);
      if (!hasAnyScore && articleCount > 0) {
        checks.push({
          priority: 4,
          title: 'Запусти Content Quality batch',
          summary: 'Проверка ещё не запускалась — SEO/schema/links для 10 последних постов за минуту',
          impact: IMPACT.CONTENT_HEALTH_BATCH,
          action: { type: 'quality_batch', siteId: site.id },
        });
      }
    }
  } catch (_) { /* таблицы могут отсутствовать на старых БД до миграции */ }

  checks.sort((a, b) => b.priority - a.priority);
  const top = checks[0];

  if (!top) {
    return {
      type: 'quickWin',
      status: 'green',
      title: 'Всё под контролем',
      summary: 'Никаких срочных задач — можешь заняться глубокой работой (SEO-аудит, новая категория)',
      details: { checks: 0 },
    };
  }

  return {
    type: 'quickWin',
    status: top.priority >= 8 ? 'red' : top.priority >= 5 ? 'yellow' : 'green',
    title: top.title,
    summary: top.summary,
    impact: top.impact,
    action: top.action,
    details: { totalChecks: checks.length, allSuggestions: checks.slice(0, 5) },
  };
}

/**
 * Собирает все 4 карточки для одного сайта.
 */
export async function generateBrief(site) {
  const [health, pulse, idea, quickWin] = await Promise.all([
    buildHealthCard(site),
    Promise.resolve(buildPulseCard(site)),
    buildIdeaCard(site),
    Promise.resolve(buildQuickWinCard(site)),
  ]);

  return {
    siteId: site.id,
    siteName: site.name,
    date: todayStr(),
    generatedAt: new Date().toISOString(),
    cards: { health, pulse, idea, quickWin },
  };
}

/**
 * Получает brief из кэша или генерирует новый. refresh=true обходит кэш.
 */
export async function getOrGenerateBrief(site, { refresh = false } = {}) {
  const date = todayStr();
  if (!refresh) {
    const cached = db.prepare('SELECT cards_json, created_at FROM daily_briefs WHERE site_id = ? AND date = ?').get(site.id, date);
    if (cached) {
      return {
        siteId: site.id,
        siteName: site.name,
        date,
        generatedAt: cached.created_at,
        fromCache: true,
        cards: JSON.parse(cached.cards_json),
      };
    }
  }

  const brief = await generateBrief(site);
  db.prepare(`INSERT INTO daily_briefs (site_id, date, cards_json)
              VALUES (?, ?, ?)
              ON CONFLICT(site_id, date) DO UPDATE SET
                cards_json = excluded.cards_json,
                created_at = datetime('now')`).run(site.id, date, JSON.stringify(brief.cards));

  return { ...brief, fromCache: false };
}
