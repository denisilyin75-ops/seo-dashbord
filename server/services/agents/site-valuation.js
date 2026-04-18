/**
 * Agent: Site Valuation — оценка стоимости сайта портфеля.
 *
 * Двухрежимная модель:
 *   - Asset-based (early stage): сайт оценивается как актив — возраст + контент + структура + E-E-A-T
 *   - Revenue-based: когда есть стабильный profit — multiple × profit с adjustments
 *   - Hybrid (средний порог): среднее обеих моделей
 *
 * Каждый фактор имеет impact_usd, actionable_hint, reason —
 * пользователь видит ЧТО можно прокачать и НАСКОЛЬКО это поднимет оценку.
 */

import { db } from '../../db.js';

const PER_ARTICLE_VALUE = { review: 15, comparison: 25, guide: 10, quiz: 30, tool: 40, category: 20 };
const DEFAULT_ARTICLE_VALUE = 10;

function calcAssetBased(site, config) {
  const adjustments = [];
  let total = 0;

  // 0. Baseline — активный домен с SSL и инфраструктурой
  adjustments.push({
    factor: 'baseline', label: 'Базовая стоимость домена',
    current: 'активный домен с SSL', impact_usd: 500, positive: true,
    actionable: null,
    reason: 'Даже пустой домен с работающим WordPress и SSL имеет ценность как готовый актив.',
  });
  total += 500;

  // 1. Domain age (WHOIS data, хранится в sites.domain_registered_at)
  const regAt = site.domain_registered_at;
  let ageYears = 0;
  if (regAt) {
    ageYears = Math.round((Date.now() - Date.parse(regAt)) / (365.25 * 86400 * 1000) * 10) / 10;
  }
  const ageImpact = Math.min(Math.round(ageYears * 100), 800);
  adjustments.push({
    factor: 'domain_age', label: 'Возраст домена',
    current: regAt ? `${ageYears} лет` : 'не указан',
    impact_usd: ageImpact, positive: ageImpact > 0,
    actionable: !regAt ? 'Указать дату регистрации (WHOIS) в настройках сайта' : null,
    reason: 'Google даёт бонус траста за возраст. ~$100/год, максимум $800 (8+ лет).',
  });
  total += ageImpact;

  // 2. Published articles count + types
  const byType = db.prepare(`
    SELECT type, COUNT(*) AS n FROM articles
    WHERE site_id = ? AND status = 'published' GROUP BY type
  `).all(site.id);
  const articlesTotal = byType.reduce((s, r) => s + r.n, 0);
  let contentImpact = 0;
  for (const row of byType) {
    contentImpact += row.n * (PER_ARTICLE_VALUE[row.type] || DEFAULT_ARTICLE_VALUE);
  }
  adjustments.push({
    factor: 'content_volume', label: 'Опубликованные статьи',
    current: articlesTotal
      ? `${articlesTotal} (${byType.map(r => r.n + ' ' + r.type).join(', ')})`
      : 'нет',
    impact_usd: contentImpact, positive: contentImpact > 0,
    actionable: articlesTotal < 30
      ? `Написать ещё ${30 - articlesTotal} обзоров → +$${(30 - articlesTotal) * 15}`
      : null,
    reason: 'Каждая опубликованная статья = долгосрочный SEO-актив. Comparison ($25) ценится выше review ($15) из-за RPM.',
  });
  total += contentImpact;

  // 2b. Bonus к возрасту домена — старый домен с контентом ценнее пустого старого домена
  if (ageYears >= 1 && articlesTotal > 20) {
    adjustments.push({
      factor: 'domain_age_bonus', label: 'Бонус: возраст + наполненность',
      current: `${ageYears} лет × ${articlesTotal} статей`,
      impact_usd: 200, positive: true, actionable: null,
      reason: 'Старый домен с реальным контентом ценится дороже, чем просто старый пустой домен.',
    });
    total += 200;
  }

  // 3. Momentum — статей опубликованных/обновлённых за последние 30 дней
  const momentumRow = db.prepare(`
    SELECT COUNT(*) AS n FROM articles
    WHERE site_id = ? AND status IN ('published','draft')
      AND updated_at >= date('now', '-30 days')
  `).get(site.id);
  const momentum = momentumRow?.n || 0;
  const momentumImpact = Math.min(momentum * 100, 500);
  adjustments.push({
    factor: 'momentum', label: 'Momentum (активность за 30 дн)',
    current: `${momentum} статей`,
    impact_usd: momentumImpact, positive: momentum > 0,
    actionable: momentum < 4
      ? 'Публиковать/обновлять 1 статью в неделю = +$400/мес'
      : null,
    reason: 'Google и покупатель актива ценят сигнал активности.',
  });
  total += momentumImpact;

  // 4. Freshness — % статей обновлённых за последние 6 месяцев
  const freshness = db.prepare(`
    SELECT
      SUM(CASE WHEN updated_at >= date('now','-180 days') THEN 1 ELSE 0 END) AS fresh,
      COUNT(*) AS total
    FROM articles WHERE site_id = ? AND status = 'published'
  `).get(site.id);
  const freshPct = freshness.total > 0 ? freshness.fresh / freshness.total : 0;
  const freshImpact = Math.round(freshPct * 500);
  adjustments.push({
    factor: 'freshness', label: 'Свежесть контента',
    current: freshness.total
      ? `${Math.round(freshPct * 100)}% актуально (≤6 мес)`
      : 'нет опубликованного',
    impact_usd: freshImpact, positive: freshPct > 0.5,
    actionable: freshness.total && freshPct < 0.8
      ? `Refresh ${Math.ceil(freshness.total * (0.8 - freshPct))} статей → +$${Math.round((0.8 - freshPct) * 500)}`
      : null,
    reason: 'Свежий контент ранжируется выше. Refresh ключевых статей каждые 6 мес.',
  });
  total += freshImpact;

  // 5. E-E-A-T pages (about / contacts / how-we-test / privacy)
  // MVP: предполагаем присутствие (мы их создаём polish-site.sh). Позже проверим через WP REST API.
  const eatImpact = 300;
  adjustments.push({
    factor: 'eeat', label: 'E-E-A-T страницы',
    current: 'About + Contacts + How we test + Privacy',
    impact_usd: eatImpact, positive: true, actionable: null,
    reason: 'Google требует прозрачности. Покупатель актива проверяет в первую очередь.',
  });
  total += eatImpact;

  // 6. Structure — наличие article diversity по типам
  const distinctTypes = byType.length;
  const structureImpact = articlesTotal > 0 ? distinctTypes * 100 + 200 : 0;
  adjustments.push({
    factor: 'structure', label: 'Структура и разнообразие типов',
    current: articlesTotal > 0
      ? `${distinctTypes} типов контента (${byType.map(r => r.type).join(', ')})`
      : 'нет статей',
    impact_usd: structureImpact, positive: structureImpact > 0,
    actionable: distinctTypes < 3 && articlesTotal > 0
      ? 'Добавить comparison, guide, tool — разнообразие типов = топики cluster authority'
      : null,
    reason: 'Разные типы (review + comparison + guide + tool) дают topic cluster authority.',
  });
  total += structureImpact;

  // 7. Internal linking density — % статей с ≥3 внутренними ссылками
  // MVP: эвристика (будет точнее когда добавим парсинг content из WP)
  const linkingImpact = articlesTotal > 5 ? 300 : 0;
  adjustments.push({
    factor: 'internal_linking', label: 'Внутренняя перелинковка',
    current: articlesTotal > 5 ? 'предполагается активная' : 'мало статей',
    impact_usd: linkingImpact, positive: linkingImpact > 0,
    actionable: articlesTotal > 5
      ? 'Проверить: каждая статья должна ссылаться на 3-5 других (MVP: heuristic)'
      : 'Растёт с контентом',
    reason: 'Перелинковка = лучшее ранжирование + удержание читателя.',
  });
  total += linkingImpact;

  // ====== Penalties ======

  // Весь контент устарел (>1 года)
  if (freshness.total > 5 && freshness.fresh === 0) {
    adjustments.push({
      factor: 'staleness_penalty', label: '⚠️ Весь контент устарел',
      current: `${freshness.total} статей, все старше 6 мес`,
      impact_usd: -800, positive: false,
      actionable: 'Срочный refresh top-10 статей → возврат +$800',
      reason: 'Устаревший контент теряет позиции. Покупатель увидит "зомби-сайт".',
    });
    total -= 800;
  }

  // Нет опубликованного контента
  if (articlesTotal === 0) {
    adjustments.push({
      factor: 'no_content_penalty', label: '⚠️ Нет опубликованного контента',
      current: '0 published',
      impact_usd: -500, positive: false,
      actionable: 'Опубликовать минимум 5 review → +$700 (не только снять penalty, но и +$200 от content_volume)',
      reason: 'Домен без контента — просто инфраструктура, не актив.',
    });
    total -= 500;
  }

  return {
    mode: 'asset_based',
    total: Math.max(0, total),
    adjustments,
  };
}

function calcRevenueBased(site, avgMonthlyProfit, config) {
  const baseMultiple = Number(config.base_multiple_affiliate) || 30;
  // MVP: без тонких adjustments (age, trend, concentration) — те попадают в asset-based
  // или добавятся когда будет больше данных
  const finalMultiple = baseMultiple;
  const total = Math.max(0, avgMonthlyProfit * finalMultiple);

  return {
    mode: 'revenue_based',
    total,
    adjustments: [{
      factor: 'profit_multiple', label: `${baseMultiple}× месячной прибыли`,
      current: `$${avgMonthlyProfit.toFixed(0)}/мес × ${baseMultiple}`,
      impact_usd: total, positive: true, actionable: null,
      reason: 'Стандартный multiple для affiliate-сайтов (industry benchmark 25-40).',
    }],
  };
}

export const siteValuationAgent = {
  id: 'site_valuation',
  name: 'Site Valuation',
  description: 'Оценивает капитализацию каждого сайта портфеля. Двухрежимная модель: asset-based (для ранних сайтов без стабильного revenue) и revenue × multiple (когда есть профит). Показывает какие факторы увеличат стоимость.',
  kind: 'cron',
  scope: 'site',
  readiness: 'mvp',
  todo: [
    'WHOIS API для автоматического domain_registered_at',
    'Парсинг WP REST для реального E-E-A-T проверки и internal linking',
    'Revenue-based adjustments (traffic trend, partner concentration, top-pages concentration)',
    'Ahrefs/SEMrush для DA и backlinks',
    'Empire Flippers comparables API для рыночной калибровки multiple',
    'Per-site overrides множителей',
    'AI Listing Generator — отдельный агент',
    'Portfolio rollup (общая капитализация с диверсификацией)',
  ],
  schedule: '@weekly',

  defaultConfig: {
    base_multiple_affiliate: 30,
    base_multiple_content: 25,
    period_for_avg_profit: 12,
    min_profit_for_revenue_mode_usd: 50,
    pure_revenue_profit_threshold_usd: 500,
    target_exit_valuation_usd: 50000,
  },

  configSchema: [
    { key: 'base_multiple_affiliate', label: 'Multiple (affiliate)', type: 'number', default: 30, hint: 'Базовый множитель для affiliate-сайтов (25-40 по рынку)' },
    { key: 'base_multiple_content', label: 'Multiple (content)', type: 'number', default: 25 },
    { key: 'period_for_avg_profit', label: 'Усреднение прибыли (мес)', type: 'number', default: 12 },
    { key: 'min_profit_for_revenue_mode_usd', label: 'Порог для revenue-mode ($)', type: 'number', default: 50, hint: 'Ниже — asset-based, выше — hybrid/revenue' },
    { key: 'pure_revenue_profit_threshold_usd', label: 'Порог pure revenue-mode ($)', type: 'number', default: 500 },
    { key: 'target_exit_valuation_usd', label: 'Целевая капитализация портфеля ($)', type: 'number', default: 50000 },
  ],

  async run(config, ctx) {
    const sites = db.prepare("SELECT * FROM sites WHERE status IN ('active','setup')").all();
    const results = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const site of sites) {
      const months = Number(config.period_for_avg_profit) || 12;
      const revenueRow = db.prepare(`
        SELECT SUM(revenue) AS total, COUNT(DISTINCT substr(date,1,7)) AS months
        FROM site_metrics
        WHERE site_id = ? AND date >= date('now','-${months} months')
      `).get(site.id);
      const totalRevenue = revenueRow?.total || 0;
      const monthsCount = revenueRow?.months || 0;
      const avgMonthlyRevenue = monthsCount > 0 ? totalRevenue / monthsCount : 0;

      const expRow = db.prepare(`
        SELECT SUM(amount_usd) AS total FROM site_expenses
        WHERE (site_id = ? OR site_id IS NULL) AND date >= date('now','-${months} months')
      `).get(site.id);
      const totalExpenses = expRow?.total || 0;
      const avgMonthlyExpenses = monthsCount > 0 ? totalExpenses / monthsCount : 0;
      const avgMonthlyProfit = avgMonthlyRevenue - avgMonthlyExpenses;

      const minRevMode = Number(config.min_profit_for_revenue_mode_usd) || 50;
      const pureRevMode = Number(config.pure_revenue_profit_threshold_usd) || 500;

      let asset = calcAssetBased(site, config);
      let revenue = null, mode, total, adjustments;

      if (avgMonthlyProfit >= minRevMode) {
        revenue = calcRevenueBased(site, avgMonthlyProfit, config);
        if (avgMonthlyProfit >= pureRevMode) {
          mode = 'revenue_based';
          total = revenue.total;
          adjustments = revenue.adjustments;
        } else {
          mode = 'hybrid';
          total = (asset.total + revenue.total) / 2;
          adjustments = [
            { factor: 'hybrid_note', label: 'Hybrid mode', current: `Asset: $${asset.total.toFixed(0)}, Revenue: $${revenue.total.toFixed(0)}`, impact_usd: total, positive: true, reason: 'Среднее asset-based и revenue-based (сайт в переходной фазе)', actionable: null },
            ...asset.adjustments,
            ...revenue.adjustments,
          ];
        }
      } else {
        mode = 'asset_based';
        total = asset.total;
        adjustments = asset.adjustments;
      }

      // Penalty: asset-mode без подтверждённого revenue — оценка чисто теоретическая.
      // Двухуровневая: -40% если сайт «зомби» (нет momentum), -20% если активный.
      if (mode === 'asset_based' && avgMonthlyRevenue === 0) {
        const momentumRow = db.prepare(`
          SELECT COUNT(*) AS n FROM articles
          WHERE site_id = ? AND status IN ('published','draft')
            AND updated_at >= date('now', '-30 days')
        `).get(site.id);
        const isZombie = (momentumRow?.n || 0) === 0;
        const penaltyRate = isZombie ? 0.4 : 0.2;
        const penalty = -Math.round(total * penaltyRate);
        const pctLabel = `${Math.round(penaltyRate * 100)}%`;
        adjustments = [
          ...adjustments,
          {
            factor: 'no_revenue_penalty', label: `⚠️ Нет подтверждённого revenue (−${pctLabel})`,
            current: isZombie ? 'нет revenue + 0 активности за 30 дн' : 'нет revenue, но сайт активен',
            impact_usd: penalty, positive: false,
            actionable: `Подключить GA4 + affiliate API для регистрации revenue → возврат +$${Math.abs(penalty)}`,
            reason: isZombie
              ? 'Сайт без cash flow и без активности воспринимается покупателем как «зомби»: −40% к asset-оценке.'
              : 'Сайт активен (контент обновляется), но без подтверждённого revenue покупатель закладывает риск что монетизация не взлетит: умеренная скидка −20%.',
          },
        ];
        total = Math.max(0, total + penalty);
      }

      const valuationExpected = Math.round(total);
      const valuationLow = Math.round(total * 0.75);
      const valuationHigh = Math.round(total * 1.3);

      // confidence
      const minMonths = 6;
      const confidence = monthsCount >= minMonths * 2 ? 'high' : monthsCount >= minMonths ? 'medium' : 'low';

      // Сохраняем в историю
      db.prepare(`
        INSERT INTO site_valuations
          (site_id, date, revenue_last_12m, profit_last_12m,
           avg_monthly_revenue, avg_monthly_profit,
           base_multiple, final_multiple,
           valuation_low, valuation_expected, valuation_high,
           adjustments_json, mode, methodology, confidence)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        site.id, today,
        totalRevenue, totalRevenue - totalExpenses,
        avgMonthlyRevenue, avgMonthlyProfit,
        Number(config.base_multiple_affiliate) || 30,
        Number(config.base_multiple_affiliate) || 30,
        valuationLow, valuationExpected, valuationHigh,
        JSON.stringify(adjustments),
        mode,
        'v2_two_mode',
        confidence,
      );

      results.push({
        site: site.name, mode, confidence,
        avgMonthlyProfit: avgMonthlyProfit.toFixed(2),
        valuationLow, valuationExpected, valuationHigh,
        adjustmentsCount: adjustments.length,
      });
    }

    const portfolioValue = results.reduce((s, r) => s + r.valuationExpected, 0);
    const target = Number(config.target_exit_valuation_usd) || 50000;
    const progressPct = target > 0 ? (portfolioValue / target) * 100 : 0;

    return {
      summary: `Портфель: $${portfolioValue.toLocaleString('ru-RU')} · ${progressPct.toFixed(0)}% от цели $${target.toLocaleString('ru-RU')}`,
      detail: { results, portfolioValue, target, progressPct },
    };
  },
};
