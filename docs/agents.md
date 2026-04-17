# Agents Registry — живой реестр всех автоматических воркеров SCC

> **Статус:** living document v1 — 2026-04-18
> **Обновляется при добавлении/изменении любого агента.**
> **Управление:** https://cmd.bonaka.app/agents

---

## 1. Что такое агент в нашей архитектуре

**Агент** — автоматический воркер, выполняющий одну конкретную задачу над портфелем сайтов.
Может работать по расписанию, on-demand или через webhook.

**Ключевые свойства:**
- Единый интерфейс `{id, name, kind, schedule, configSchema, run()}`
- Настраивается через UI без деплоя
- Логирует каждый запуск в `agent_runs` (status, summary, cost, duration)
- Может быть включён/отключён одной кнопкой
- Имеет историю запусков (troubleshooting + аудит)

**Код:** `server/services/agents/` — один файл на агента.
**Registry:** `server/services/agents/registry.js` — единая точка регистрации.

---

## 2. Scope агента — critical concept

| Scope | Значение | Пример |
|-------|----------|--------|
| `portfolio` | Один запуск обрабатывает ВСЕ активные сайты | metrics_sync, daily_brief, offer_health |
| `site` | Запускается для одного конкретного сайта (требует siteId) | site_valuation, idea_of_day, analytics_review |

**Почему важно различать:**
- `portfolio` — batched, по расписанию, один прогон = N сайтов
- `site` — точечный анализ, нужен контекст одного сайта, может запускаться по клику из SiteDetail
- UI показывает badge скоупа на карточке (🌐 / 🎯)

**Правило добавления:** если агент нужен только одному сайту и требует глубокого контекста (история, партнёрки, конкуренты) — делаем `site`. Если повторяется одинаково на всех сайтах с одинаковыми параметрами — `portfolio`.

---

## 3. Реестр — всё что есть и планируется

**Индикаторы готовности:**
- 🟢 **Active** — работает в проде полностью, можно полагаться
- 🟡 **Beta** — работает, но ещё дорабатывается (логика или UI)
- 🟠 **MVP** — базовая функция есть, но многое упрощено
- 🔵 **Placeholder** — зарегистрирован, но основная работа-заглушка (waiting integrations)
- ⚪ **Planned** — ещё нет в коде

### Текущее состояние

| ID | Name | Scope | Готовность | Schedule | Стоимость |
|----|------|-------|------------|----------|-----------|
| `metrics_sync` | Metrics Sync | portfolio | 🟢 Active | @daily | $0 |
| `daily_brief` | Daily Brief (pregen) | portfolio | 🟢 Active | @daily | ~$0.05/сайт |
| `content_freshness` | Content Freshness | portfolio | 🟠 MVP | @weekly | $0 (только отчёт) |
| `offer_health` | Offer Health Monitor | portfolio | 🔵 Placeholder | @hourly | $0 (реальный пинг TODO) |
| `analytics_review` | Analytics Review | site | 🟠 MVP | @weekly | ~$0.08 |
| `site_valuation` | Site Valuation | site | 🟠 MVP | @weekly | ~$0.15 |
| `expense_tracker` | Expense Tracker | portfolio | 🟠 MVP | @daily | $0 |
| `idea_of_day` | Idea of the Day | site | 🟠 MVP | on-demand | ~$0.03 |

### Planned (Stage A — эта итерация)

| ID | Name | Scope | Schedule | Когда | Описание |
|----|------|-------|----------|-------|----------|
| `idea_of_day` | Idea of the Day | site | on-demand + @daily | Сейчас | Одна свежая идея статьи для сайта — выделено из Daily Brief для отдельной настройки |
| `analytics_review` | Analytics Review | site | @weekly пн | Сейчас | Анализ метрик, аномалии, top/underperformers, сезонность |
| `site_valuation` | Site Valuation | site | @weekly вс 06:00 | Сейчас | Оценка стоимости сайта (Profit × Multiple), тренд капитализации, рекомендации по росту |
| `expense_tracker` | Expense Tracker | portfolio | @daily | Сейчас | Агрегация cost всех AI-агентов + reminders по подпискам |

### Planned (Stage B — после Stage A)

| ID | Name | Scope | Schedule | Описание |
|----|------|-------|----------|----------|
| `listing_generator` | Listing Generator | site | on-demand | AI-генерация листинга для Empire Flippers/Flippa/Telderi |
| `competitor_scout` | Competitor Scout | site | @weekly | SERP top-10 по нашим ключам, что пишут конкуренты |
| `content_gap_finder` | Content Gap Finder | site | @monthly | Запросы где мы не ранжируемся, а у конкурентов есть |
| `revenue_anomaly` | Revenue Anomaly Detector | portfolio | @daily | RPM/CR упал >30% → Telegram алерт |
| `price_drift` | Price Drift Detector | portfolio | @daily | Расхождение цен в тексте vs Content Egg |
| `seasonal_planner` | Seasonal Planner | site | @monthly | Готовит контент-план за 2 мес до сезонных пиков (ЧП, весна, подарки) |
| `news_scout` | News Scout | portfolio | @weekly | Новые модели в брендах → идеи в контент-план |
| `network_arbitrage` | Network Arbitrage Analyzer | site | @weekly | EPC Admitad vs Я.М vs Ozon на один товар → переключение на сильнейшую |

### Planned (Stage C — долгосрочно)

| ID | Name | Scope | Описание |
|----|------|-------|----------|
| `ab_test_runner` | A/B Test Runner | site | Сплит-тесты CTA/позиций/форматов |
| `backlink_tracker` | Backlink Tracker | site | Мониторинг backlinks через Ahrefs API |
| `monetization_audit` | Weekly Monetization Audit | portfolio | Комплексный отчёт со всеми monetization-сигналами |
| `backup_agent` | Backup Agent | portfolio | Ежедневный бэкап БД + WP + uploads |
| `portfolio_valuation` | Portfolio Valuation | portfolio | Агрегирует site_valuation для всех сайтов |

---

## 4. Детали агентов Stage A (реализация сейчас)

### 4.1 Analytics Review

**Зачем:** metrics_sync только тянет данные, но не анализирует. Analytics Review выявляет что важно:
- Тренд трафика (рост/падение MoM)
- Аномалии (резкое падение >20%)
- Top-performers (страницы с высоким RPM)
- Underperformers (высокий трафик, низкий revenue)
- Рост поисковых запросов (GSC impression↑)

**Параметры:**
- `anomaly_threshold_pct: 20` — % падения для алерта
- `lookback_days: 28`
- `compare_period_days: 28` (сравнение с предыдущим периодом)

**Вывод:** JSON-отчёт + записи в `content_health` (если агент будет интегрирован).

### 4.2 Site Valuation

**Зачем:** supreme principle — мы строим продаваемый актив. Нужно видеть капитализацию в реальном времени, понимать рост и блокеры.

**Формула (MVP):**
```
Price = Avg Monthly Profit (12 мес) × Multiple
Multiple = Base (30 для affiliate) × Adjustments
Adjustments = f(возраст, тренд, concentration risk, traffic diversity, email base, ...)
```

**Параметры:**
- `base_multiple_affiliate: 30`
- `base_multiple_content: 25`
- `min_data_months: 6` (меньше данных → low confidence)
- `period_for_avg_profit: 12`
- `target_exit_valuation: 50000` (USD — наша цель)

**Хранение:** таблица `site_valuations` (история оценок для тренда).

**Интеграции:**
- MVP: revenue из `site_metrics`, расходы из `site_expenses`, возраст через `WHOIS`
- Позже: Ahrefs API (DA, backlinks), Empire Flippers comparables, Google Trends

### 4.3 Expense Tracker

**Зачем:** честная TCO проекта. Трекает:
- **Автоматически:** cost всех agent_runs (tokens × price)
- **Ручной ввод:** хостинг, домены, лицензии (REHub, Content Egg, WP All Import)
- **Reminders:** "подходит дата продления домена", "REHub license expires"

**Scope:** portfolio — но затраты распределяются по сайтам через `site_expenses.site_id`.

### 4.4 Idea of the Day (выделение)

**Зачем:** сейчас идея генерится как часть Daily Brief. Выделение даёт:
- Отдельную историю идей (какие AI предлагал, что из них реализовано)
- Независимую настройку модели (можно Haiku для дешёвых идей, Opus для глубоких)
- Запуск on-demand (не ждать утра)

**Хранение:** таблица `ai_ideas` (site_id, idea, accepted, converted_to_plan_id).

---

## 5. Правила для добавления нового агента

1. **Один файл** в `server/services/agents/{agent-id}.js`
2. **Экспортирует объект** с обязательными полями: `id, name, description, kind, scope, run()`
3. **Минимум 1 configSchema поле** (если нет — всё равно укажи hint)
4. **Регистрация** в `registry.js` — одна строка `register(agent)`
5. **Обязательно добавить в этот файл** (`docs/agents.md`) в раздел Реестр — строкой
6. **logRevision** для всех изменений которые агент делает (если меняет articles/plans)
7. **Не трогать чужие данные** в `run()` — только свою зону ответственности
8. **Graceful degradation** — если нет ключа/зависимости, вернуть `{skipped: true, reason}`
9. **Логировать tokens_used в agent_runs** если использует Claude

**Пример минимального агента:**
```js
export const myAgent = {
  id: 'my_agent',
  name: 'Мой Агент',
  description: 'Что он делает за 1 предложение',
  kind: 'cron',
  scope: 'portfolio',          // или 'site'
  schedule: '@daily',
  defaultConfig: { threshold: 10 },
  configSchema: [
    { key: 'threshold', label: 'Порог', type: 'number', default: 10, hint: '...' }
  ],
  async run(config, ctx) {
    return { summary: 'Готово: N записей', detail: { n: 42 } };
  }
};
```

---

## 6. Матрица приоритетов (обновляется каждые 2 недели)

**Критично для supreme principle:** (без них проект хромает)
- 🔴 `content_freshness` — устаревший контент = обман пользователя
- 🔴 `offer_health` — битые ссылки = ноль CR
- 🔴 `price_drift` — устаревшие цены = потеря доверия
- 🔴 `revenue_anomaly` — раннее обнаружение проблем монетизации

**Критично для масштаба:** (без них не выйдешь на 5+ сайтов)
- 🟡 `analytics_review` — без анализа оператор не видит что делать
- 🟡 `site_valuation` — без оценки нет мотивации роста
- 🟡 `expense_tracker` — без учёта не посчитаешь прибыль
- 🟡 `listing_generator` — нужен к экзиту

**Важно для конкурентности:**
- 🟢 `competitor_scout`, `content_gap_finder`
- 🟢 `seasonal_planner`, `news_scout`

**Nice to have:**
- `ab_test_runner`, `backlink_tracker`

---

## 7. Бюджет стоимости агентов

**Актуально на 2026-04-18:**

| Агент | Tokens/запуск | Cost/запуск (Sonnet) | Cost/мес |
|-------|--------------|----------------------|----------|
| metrics_sync | 0 (не AI) | $0 | $0 |
| daily_brief | 3000/сайт | $0.05/сайт | ~$3 (2 сайта × 30 дней) |
| content_freshness | 0 (MVP без AI) | $0 | $0 |
| site_valuation | ~40k | $0.15 | $1.20 (2 сайта × 4 раза/мес) |
| analytics_review | ~20k | $0.08 | $0.64 (2 сайта × 4 недели) |
| idea_of_day | ~2k | $0.03 | $1.80 (если отдельно от daily) |
| **Итого MVP** | — | — | **~$7/мес** |

При 5 сайтах: ~$15/мес. При 10: ~$25/мес. Приемлемо.

**Ограничения:**
- `max_cost_per_run_usd` — лимит на один запуск
- `monthly_budget_usd` — лимит на агента в месяц
- Circuit breaker: 3 провала подряд = auto-disable + алерт

---

## 8. Интеграции, которые открывают новых агентов

| Интеграция | Когда | Открывает агентов |
|-----------|-------|-------------------|
| **Content Egg API** | Q2 2026 | price_drift, offer_health (реальный), network_arbitrage |
| **GSC расширенный API** | Q2 2026 | analytics_review (полный) |
| **Admitad Partner API** | Q2 2026 | revenue_anomaly (точный), expense_tracker (комиссии) |
| **Ahrefs/SEMrush** | Q3 2026 | backlink_tracker, site_valuation (точный), content_gap_finder |
| **Empire Flippers API** | Q3 2026 | site_valuation (рыночная калибровка) |
| **Google Trends API** | Q3 2026 | seasonal_planner, news_scout |
| **Telegram Bot** | Q2 2026 | Алерты (revenue_anomaly, budget_warning) |

---

## 9. Per-site overrides (Stage B roadmap)

Сейчас все агенты `portfolio` используют единый конфиг. Но разные сайты требуют разных параметров:

- `popolkam.ru` (быстрая ниша) — `content_freshness.min_age_days = 60`
- `4beg.ru` (сезонная кроссовочная ниша) — `min_age_days = 120`
- `posuda-site.com` (если появится, редкие обновления) — `min_age_days = 180`

**Решение (Stage B):** расширить `agent_configs`:
```sql
ALTER TABLE agent_configs ADD COLUMN site_id TEXT;  -- NULL = global
UNIQUE(agent_name, site_id)
```

**UI:**
```
Settings > Content Freshness
  [Global defaults] [popolkam.ru] [4beg.ru] [+]
```

Агент при запуске читает global config и накладывает per-site override.

---

## 10. Связь с принципами проекта

- **Supreme #1 — Всё для пользователя:** агенты помогают поддерживать контент актуальным, честным, полезным
- **Supreme #2 — Итеративность:** агенты = воплощение, без них итерации невозможны при масштабе
- **Supreme #3 — Планка лидеров:** Wirecutter/Rtings имеют большую редакцию — у нас агенты заменяют пять редакторов
- **Supreme #4 — Монетизация как топливо:** agent_runs трекает cost → видно что окупается
- **Supreme #5 — Быстрый подбор:** idea_of_day + Daily Brief дают оператору фокус на 1 действие в день

---

_Файл живой. После каждого нового агента — обновляем раздел Реестр и добавляем в Детали._
