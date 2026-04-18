# Admin Panel & Site Valuation Agent

> Дополнение к AGENTS.md: админка для управления агентами (cmd.bonaka.app)
> + новый агент оценки стоимости сайтов для подготовки к продаже.

---

## Часть 1. Админка для агентов — cmd.bonaka.app

### 1.1 Концепция

Центральная панель управления всеми агентами с возможностью:
- Включать/выключать каждого агента
- Менять расписание на лету (без деплоя)
- Настраивать уставки индивидуально для каждого сайта
- Мониторить статус, стоимость и эффективность
- Запускать вручную для теста

**URL:** `https://cmd.bonaka.app/agents`

### 1.2 Структура страницы

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Agents                             [+ Custom Agent] [⚙️]  │
├─────────────────────────────────────────────────────────────┤
│ GLOBAL STATS                                                  │
│ ▸ Running: 8/14  ▸ Today's cost: $0.42  ▸ Tasks created: 23  │
├─────────────────────────────────────────────────────────────┤
│ [All] [Critical] [Active] [Disabled]  🔍 Поиск...            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🔴 Content Freshness                        [ON ●]     │   │
│ │ Next: Sun 04:00 · Last: 4h ago ✓ · Cost: $0.12/мес    │   │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │   │
│ │ Flagged: 8 articles · Tasks created: 5 · Tokens: 70k   │   │
│ │ [⚙️ Settings] [▶ Run Now] [📊 History] [📝 Logs]       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐   │
│ │ 🟡 Editor                                   [ON ●]     │   │
│ │ Next: Tue 02:00 · Last: 3d ago ✓ · Cost: $0.08/мес    │   │
│ │ ...                                                    │   │
│ └───────────────────────────────────────────────────────┘   │
```

### 1.3 Детальная карточка агента

При клике на агента — разворачивается полный вид:

```
┌───────────────────────────────────────────────────────────┐
│ 🔴 Content Freshness                              [ON ●]   │
├───────────────────────────────────────────────────────────┤
│ SCHEDULE                                                    │
│ ○ Disabled                                                  │
│ ● Ежедневно       [Время: 04:00]                           │
│ ○ Еженедельно     [День: Вс] [Время: 04:00]               │
│ ○ Раз в 2 недели  [День: Пн] [Время: 04:00]               │
│ ○ Ежемесячно      [Число: 1]  [Время: 04:00]              │
│ ○ Custom cron     [0 4 * * 0                  ]            │
│                                                             │
│ APPLY TO SITES                                              │
│ ☑ popolkam.ru    ☑ koffie-expert.nl   ☐ new-site.com      │
│                                                             │
│ SETTINGS                                                    │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Основные                                            │   │
│ │ min_age_days:              [  90 ] 🔴 Важно          │   │
│ │ traffic_drop_threshold:    [ -25% ] 🔴 Важно         │   │
│ │ min_sessions_to_check:     [ 100 ] 🟡                │   │
│ │                                                     │   │
│ │ Действия                                            │   │
│ │ ☑ check_affiliate_products  🔴 Критично              │   │
│ │ ☑ auto_create_tasks         🟡                       │   │
│ │ ☐ auto_update_prices        🔴 Осторожно!            │   │
│ │                                                     │   │
│ │ Лимиты                                              │   │
│ │ max_tasks_per_run:         [ 10 ]                   │   │
│ │ max_cost_per_run_usd:      [ 0.50 ]                 │   │
│ │ monthly_budget_usd:        [ 5.00 ]                 │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ AI MODEL                                                    │
│ ○ Claude Haiku (дёшево, базовый анализ)                    │
│ ● Claude Sonnet 4 (рекомендуется)                          │
│ ○ Claude Opus 4.7 (для сложных задач, дороже)             │
│                                                             │
│ NOTIFICATIONS                                               │
│ ☑ Telegram @your_bot   ☑ Email  ☐ Dashboard only           │
│ Send only if: [items_flagged > 0 ▼]                        │
│                                                             │
│ STATUS                                                      │
│ Last run:    Sun 04:00 ✓ Success (2m 14s)                  │
│ Next run:    Sun 04:00 (in 6d 8h)                          │
│ This month:  4 runs, 280k tokens, $0.48                    │
│                                                             │
│ [💾 Save] [▶ Test Run] [📊 History] [📝 Logs] [🗑 Reset]  │
└───────────────────────────────────────────────────────────┘
```

### 1.4 История запусков

```
┌───────────────────────────────────────────────────────────┐
│ 📊 Content Freshness — History                             │
├───────────────────────────────────────────────────────────┤
│ Date            Status  Items  Flagged  Cost    Duration   │
│ 2026-04-14 04:00  ✓    47     8        $0.12   2m 14s     │
│ 2026-04-07 04:00  ✓    45     3        $0.11   2m 08s     │
│ 2026-03-31 04:00  ✓    44     5        $0.13   2m 22s     │
│ 2026-03-24 04:00  ⚠    44     —        $0.05   timeout    │
│ 2026-03-17 04:00  ✓    42     2        $0.10   1m 58s     │
├───────────────────────────────────────────────────────────┤
│ [Full Logs] [Export CSV] [Graph]                           │
└───────────────────────────────────────────────────────────┘
```

### 1.5 Глобальный дашборд агентов

```
┌───────────────────────────────────────────────────────────┐
│ ⚙️ Agents Dashboard                                         │
├───────────────────────────────────────────────────────────┤
│ [Chart: Runs per day, last 30 days]                        │
│ [Chart: Cost per agent, last 30 days]                      │
│ [Chart: Tasks created vs closed]                           │
│                                                             │
│ TOP COSTS THIS MONTH                                        │
│ 1. Content Freshness  $0.48  (4 runs)                      │
│ 2. Editor             $0.32  (2 runs)                      │
│ 3. Competitor Scout   $0.28  (4 runs)                      │
│                                                             │
│ ALERTS (7 days)                                             │
│ 🚨 Price Watchdog: 2 OOS products (popolkam.ru)           │
│ ⚠️ Affiliate Auditor: 1 broken link (Jura E8)             │
│ 🚨 Backup: last backup failed (2026-04-12)                │
│                                                             │
│ AGENT HEALTH                                                │
│ 🟢 Healthy: 11  🟡 Warnings: 2  🔴 Failed: 1              │
└───────────────────────────────────────────────────────────┘
```

### 1.6 Per-site vs Global settings

**Принцип иерархии:**
1. `global` — настройки по умолчанию для всех сайтов
2. `per-site` — переопределение для конкретного сайта (опционально)

Пример: Content Freshness по умолчанию `min_age_days: 90`, но для `popolkam.ru` (быстрая ниша) — `60`, для `posuda-site.com` (медленная) — `180`.

В UI:
```
Settings > Content Freshness
  [Global defaults] [popolkam.ru] [koffie-expert.nl] [+]

Global defaults:
  min_age_days: 90

popolkam.ru (overridden):
  min_age_days: 60 ← клик для сброса к global
```

### 1.7 Database schema для агентов

```sql
-- Расширение agent_configs из AGENTS.md
CREATE TABLE agent_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  site_id TEXT,                         -- NULL = global
  enabled BOOLEAN DEFAULT 1,
  schedule_type TEXT,                   -- 'daily', 'weekly', 'biweekly', 'monthly', 'custom'
  schedule_time TEXT,                   -- '04:00' для daily/weekly
  schedule_day TEXT,                    -- 'sun' для weekly, '1' для monthly
  schedule_cron TEXT,                   -- computed или custom
  settings JSON,                        -- все уставки
  ai_model TEXT DEFAULT 'claude-sonnet-4-20250514',
  notification_channels JSON,           -- ["telegram", "email", "dashboard"]
  notification_condition TEXT,          -- "items_flagged > 0"
  monthly_budget_usd REAL DEFAULT 5.00,
  max_cost_per_run_usd REAL DEFAULT 1.00,
  circuit_breaker_state TEXT DEFAULT 'closed',  -- closed, open, half-open
  consecutive_failures INTEGER DEFAULT 0,
  last_run_at TEXT,
  next_run_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(agent_name, site_id)
);

CREATE TABLE agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_name TEXT NOT NULL,
  site_id TEXT,
  started_at TEXT,
  finished_at TEXT,
  status TEXT,                          -- success, failed, partial, timeout
  items_processed INTEGER DEFAULT 0,
  items_flagged INTEGER DEFAULT 0,
  tasks_created INTEGER DEFAULT 0,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  duration_seconds INTEGER,
  error TEXT,
  summary JSON,
  triggered_by TEXT DEFAULT 'schedule', -- 'schedule', 'manual', 'webhook'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_name, started_at);
CREATE INDEX idx_agent_runs_site ON agent_runs(site_id, started_at);
```

### 1.8 API для управления

```
GET    /api/agents                        — список всех агентов со статусом
GET    /api/agents/:name                  — детали агента
GET    /api/agents/:name/configs          — все конфиги (global + per-site)
PUT    /api/agents/:name/configs/:siteId  — обновить конфиг (siteId='global' для глобального)
POST   /api/agents/:name/run              — запустить вручную (body: { siteId? })
POST   /api/agents/:name/enable           — включить
POST   /api/agents/:name/disable          — выключить
GET    /api/agents/:name/runs             — история запусков
GET    /api/agents/:name/runs/:id/logs    — детальный лог
GET    /api/agents/dashboard              — агрегированная статистика

GET    /api/agents/budget                 — общий бюджет и расходы
PUT    /api/agents/budget                 — изменить лимиты
```

### 1.9 Scheduler: перезапуск при изменении

Когда пользователь меняет расписание в админке:

```javascript
// server/agents/base/Scheduler.js
class AgentScheduler {
  async updateSchedule(agentName, siteId, newCron) {
    // 1. Снять старый cron job
    this.stopJob(agentName, siteId);

    // 2. Вычислить next_run_at
    const nextRun = parseCron(newCron).next();

    // 3. Обновить БД
    await db.run(
      'UPDATE agent_configs SET schedule_cron = ?, next_run_at = ? WHERE agent_name = ? AND site_id = ?',
      [newCron, nextRun, agentName, siteId]
    );

    // 4. Перезарегистрировать новый cron job
    this.registerJob(agentName, siteId, newCron);
  }
}
```

### 1.10 UI-компонент для cron

Вместо сложного cron-выражения — дружелюбный UI:

```jsx
<ScheduleBuilder>
  <RadioOption value="disabled">Отключено</RadioOption>
  <RadioOption value="daily">
    Ежедневно в <TimeInput />
  </RadioOption>
  <RadioOption value="weekly">
    Каждый <DaySelect /> в <TimeInput />
  </RadioOption>
  <RadioOption value="biweekly">
    Раз в 2 недели, <DaySelect /> в <TimeInput />
  </RadioOption>
  <RadioOption value="monthly">
    <DayNumber /> числа в <TimeInput />
  </RadioOption>
  <RadioOption value="custom">
    Cron: <Input placeholder="0 4 * * 0" />
    <CronHelp /> {/* показывает человекочитаемое описание */}
  </RadioOption>
</ScheduleBuilder>
```

Под капотом конвертирует в cron-выражение.

### 1.11 Защита от ошибок

**Circuit Breaker:** если агент упал 3 раза подряд → автоматически disabled + алерт пользователю.

**Budget Control:** если агент превысил месячный бюджет → пауза до следующего месяца.

**Rate Limiting:** не более X параллельных запусков агентов (чтобы не выжрать Claude API limits).

**Dry Run Mode:** тест изменений без реального выполнения действий.

```
[Run Now]  — реальный запуск
[🧪 Dry Run] — симуляция без изменений в БД/WP
```

---

## Часть 2. Site Valuation Agent — Оценка стоимости сайта

### 2.1 Зачем это нужно

Твоя цель — **экзит (продажа портфеля)**. Чтобы:
- Понимать текущую капитализацию портфеля
- Отслеживать рост стоимости во времени
- Принимать решения о продаже отдельных сайтов
- Готовить сайты к продаже (понимать, что увеличит цену)

**Площадки для продажи affiliate сайтов:**
- **Empire Flippers** (премиум, дорогие сайты)
- **Motion Invest** (средние)
- **Flippa** (массовый рынок)
- **FE International**
- **Telderi** (для RU-сегмента)
- Прямые продажи через сообщества

### 2.2 Формулы оценки сайтов (индустриальные стандарты)

#### A. Мультипликатор от прибыли (самая распространённая)
```
Цена = Monthly Net Profit × Multiple
```

**Multiples по рынку (2025):**
- Affiliate-сайты: **25-40x monthly profit** (зависит от качества)
- Высококачественные SEO-сайты: **35-50x**
- Низкокачественные/рискованные: **15-25x**

**Что влияет на множитель:**
| Фактор | Влияние |
|--------|---------|
| Возраст сайта (>2 года) | +20-30% |
| Стабильный трафик | +15-25% |
| Разнообразие источников трафика | +10-15% |
| Количество партнёрских программ | +10-20% |
| Документация и процессы | +10-15% |
| Бренд, прямой трафик | +15-25% |
| Email-база | +10-20% |
| Сезонность низкая | +10% |
| Зависимость от 1 источника (Google) | -15-25% |
| Зависимость от 1 партнёра | -20-30% |
| Падающий тренд | -30-50% |

#### B. Множитель от выручки (для быстрорастущих)
```
Цена = Monthly Revenue × Multiple (обычно 15-30x)
```

#### C. DCF / Intrinsic Value (для больших сайтов)
Дисконтированные денежные потоки с учётом роста.

### 2.3 Агент: Site Valuation

**Миссия:** Регулярно пересчитывать стоимость каждого сайта в портфеле.

**Частота:** Еженедельно (воскресенье 06:00) + по запросу

**Что делает:**

#### Шаг 1: Сбор данных
```javascript
const data = {
  // Финансы (за 12 месяцев)
  monthlyRevenue: [...],        // массив месячной выручки
  monthlyExpenses: [...],       // хостинг, домены, контент, плагины
  monthlyNetProfit: [...],

  // Метрики
  trafficTrend: 'growing|stable|declining',
  trafficSources: { organic: 85, direct: 8, referral: 5, social: 2 },

  // Качество
  domainAge: 2.4,                // годы
  articlesCount: 47,
  publishedInLast90Days: 8,

  // Риски
  top3PagesRevenueShare: 0.62,   // % выручки от топ-3 страниц
  dominantPartner: 'Admitad',
  dominantPartnerShare: 0.78,
  googleDependency: 0.85,

  // Бренд
  directTraffic: 0.08,
  brandedSearches: 0.12,
  emailList: 0,
  socialFollowers: 0,

  // Техническое
  domainAuthority: 24,            // Moz/Ahrefs
  backlinks: 120,
  referringDomains: 35,

  // Сезонность
  seasonalityIndex: 0.3,          // 0 = нет сезонности, 1 = сильная
};
```

#### Шаг 2: AI-анализ через Claude

Claude получает данные и возвращает:
```json
{
  "baseMultiple": 30,
  "adjustments": [
    { "factor": "domain_age", "value": 2.4, "impact": "+15%", "reason": "Сайту 2.4 года — зрелый" },
    { "factor": "traffic_trend", "value": "growing", "impact": "+20%", "reason": "Трафик растёт 8% MoM" },
    { "factor": "google_dependency", "value": 0.85, "impact": "-15%", "reason": "85% трафика из Google — высокий риск" },
    { "factor": "partner_concentration", "value": 0.78, "impact": "-20%", "reason": "78% дохода от одного партнёра (Admitad)" },
    { "factor": "top_pages_concentration", "value": 0.62, "impact": "-10%", "reason": "62% дохода от 3 страниц" },
    { "factor": "no_email_list", "impact": "-5%", "reason": "Нет email-базы" }
  ],
  "finalMultiple": 27.2,
  "averageMonthlyProfit": 245,
  "valuation": {
    "low": 5000,
    "expected": 6664,
    "high": 8500
  },
  "recommendations": [
    "Добавить Awin/Яндекс.Маркет для диверсификации партнёров (+15-20% к цене)",
    "Собирать email-лист (+10%)",
    "Написать 10-15 статей под разные ключи для снижения концентрации (+5-10%)",
    "Получить 5+ качественных бэклинков (+5%)"
  ],
  "potentialValuation": 9500,
  "timeToPotential": "6-9 месяцев"
}
```

#### Шаг 3: Запись в БД

```sql
CREATE TABLE site_valuations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  date TEXT NOT NULL,

  -- Финансы
  revenue_last_12m REAL,
  profit_last_12m REAL,
  avg_monthly_revenue REAL,
  avg_monthly_profit REAL,

  -- Множители
  base_multiple REAL,              -- базовый для ниши (25-40)
  final_multiple REAL,             -- после корректировок
  adjustments JSON,                -- массив факторов с impact

  -- Оценка (в USD)
  valuation_low INTEGER,
  valuation_expected INTEGER,
  valuation_high INTEGER,

  -- Потенциал
  recommendations JSON,
  potential_valuation INTEGER,
  potential_timeline_months INTEGER,

  -- Метаданные
  methodology TEXT,                -- 'profit_multiple', 'revenue_multiple', 'dcf'
  confidence TEXT,                 -- 'high', 'medium', 'low'
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 2.4 UI в дашборде

#### Вкладка "💰 Valuation" на каждом сайте:

```
┌─────────────────────────────────────────────────────────┐
│ popolkam.ru — Site Valuation                             │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Текущая оценка                                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │         $6,664                                     │  │
│  │    ───────────────                                 │  │
│  │    $5,000 ─ $8,500                                │  │
│  │                                                    │  │
│  │  Базис: $245/мес profit × 27.2 multiple            │  │
│  │  Confidence: Medium                                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  [Chart: Динамика оценки за 12 месяцев]                  │
│    $8k┤              ╱─                                   │
│    $6k┤         ╱────                                     │
│    $4k┤    ────                                           │
│    $2k┤────                                               │
│        Jan  Apr  Jul  Oct  Jan                            │
│                                                           │
│  Потенциал: $9,500 (+43%) за 6-9 мес при выполнении:     │
│                                                           │
│  📈 ЧТО ПОВЫСИТ СТОИМОСТЬ                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🟢 +15-20%  Добавить 2-й партнёр (Awin/ЯМ)         │  │
│  │ 🟢 +10%     Собрать email-лист (1000+ подписок)    │  │
│  │ 🟡 +5-10%   Диверсифицировать топ-страницы         │  │
│  │ 🟡 +5%      Нарастить бэклинки (5+ качеств.)       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  🎯 ФАКТОРЫ ОЦЕНКИ                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Базовый множитель:      30x (Affiliate средний)    │  │
│  │ + Возраст 2.4 года      +15%                       │  │
│  │ + Рост трафика          +20%                       │  │
│  │ − Google dependency     −15%                       │  │
│  │ − Partner concentration −20%                       │  │
│  │ − Top-pages concentr.   −10%                       │  │
│  │ − Нет email-базы        −5%                        │  │
│  │ ═══════════════════════════════                    │  │
│  │ Итоговый множитель:     27.2x                      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  💼 СРАВНЕНИЕ С РЫНКОМ                                    │
│  Empire Flippers avg:   35x profit                        │
│  Motion Invest avg:     25-30x profit                     │
│  Flippa avg:            20-25x profit                     │
│  → Ваш сайт ближе к Motion Invest сегменту                │
│                                                           │
│  [📋 Подготовить к продаже] [🔄 Пересчитать] [📊 История] │
└─────────────────────────────────────────────────────────┘
```

#### Главный дашборд — общая стоимость портфеля:

```
┌─────────────────────────────────────────────────────────┐
│ 💎 Portfolio Valuation                                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│    Общая стоимость:   $12,244                            │
│    12 месяцев назад:  $3,400  (↑ 260%)                   │
│    Потенциал:         $18,500                            │
│                                                           │
│  ┌─── popolkam.ru ───────────── $6,664 (54%) ──────┐    │
│  ┌─── koffie-expert.nl ──────── $580  (5%)  ──────┐    │
│  ┌─── chainiki.site.ru ──────── $5,000 (41%) ─────┐    │
│                                                           │
│  Средний множитель: 26.8x                                 │
│  Target exit: $50,000+ (через 12-18 мес)                 │
│                                                           │
│  [График роста за 12 мес]                                 │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Настройки агента Valuation

| Параметр | Default | Важность | Описание |
|----------|---------|----------|----------|
| `base_multiple_affiliate` | 30 | 🔴 Критическая | Базовый мультипликатор — корректируй под текущий рынок (меняется!) |
| `base_multiple_content` | 25 | 🔴 Критическая | Для сайтов без affiliate |
| `min_data_months` | 6 | 🔴 Критическая | Минимум данных для оценки. Меньше — пометка "low confidence" |
| `period_for_avg_profit` | 12 | 🟡 Средняя | Брать среднее за 12 мес (стандарт) или 6 |
| `expense_auto_tracking` | true | 🔴 Высокая | Включить — считает расходы автоматически |
| `include_amortization` | false | 🟡 Средняя | Включать ли стоимость созданного контента в расходы |
| `market_data_source` | 'manual' | 🟡 Средняя | 'manual' или 'empire_flippers_api' (если появится) |
| `target_exit_valuation` | 50000 | 🟢 Низкая | Ваша цель — отображается в прогрессе |
| `exit_timeline_months` | 18 | 🟢 Низкая | Сроки выхода |

### 2.6 Что учитывается в расчётах

#### Финансовые данные (из БД):
- **Выручка:** из partner APIs (Admitad, Awin, ЯМ, Bol.com)
- **Расходы:** хостинг, домены, плагины, подписки, контент

Нужна отдельная таблица `site_expenses`:
```sql
CREATE TABLE site_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  date TEXT NOT NULL,
  category TEXT,                    -- 'hosting', 'domain', 'plugins', 'content', 'ai_agents', 'other'
  description TEXT,
  amount_usd REAL,
  is_recurring BOOLEAN DEFAULT 0,
  recurring_period TEXT             -- 'monthly', 'yearly'
);
```

**Автоматический трекинг расходов:**
- Стоимость AI-агентов (из `agent_runs.cost_usd`) → автоматически
- Хостинг, домены — заполняется вручную, но с reminder
- Content Egg, REHub лицензии — вручную

#### Метрические данные:
- Трафик (GA4) за 12 месяцев
- Источники трафика
- Возраст домена (WHOIS API)
- Backlinks (Ahrefs API / Majestic API / ручной ввод)

#### AI-анализ:
Claude анализирует качественные факторы:
- Читает контент-план, историю обновлений
- Смотрит структуру сайта (сколько категорий, статей)
- Оценивает "здоровье" (как давно обновлялся, есть ли свежий контент)

### 2.7 Подготовка к продаже — чеклист

Отдельная фича **"Prepare for Sale"**:

```
┌─────────────────────────────────────────────────────────┐
│ 📋 Prepare popolkam.ru for Sale                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Progress: 8/15 ✓                                          │
│                                                           │
│ ФИНАНСЫ                                                   │
│ ☑ 12+ месяцев истории доходов                           │
│ ☑ Все доходы задокументированы                          │
│ ☐ Все расходы задокументированы                         │
│ ☐ P&L отчёт за 12 месяцев готов                        │
│ ☐ Трендовый график доходов                              │
│                                                           │
│ ТРАФИК                                                    │
│ ☑ GA4 доступ для покупателя                              │
│ ☑ GSC доступ                                              │
│ ☑ Минимум 12 мес traffic data                            │
│ ☐ Diversification > 30% (non-Google traffic)             │
│                                                           │
│ КАЧЕСТВО                                                  │
│ ☑ Нет бан-фильтров Google                                │
│ ☑ Свежий контент (последние 30 дней)                     │
│ ☐ Нет битых ссылок                                       │
│                                                           │
│ ПРОЦЕССЫ                                                  │
│ ☐ SOP (Standard Operating Procedures)                    │
│ ☐ Список всех паролей и доступов                         │
│ ☐ Контакты фрилансеров/подрядчиков                       │
│                                                           │
│ ДОМЕН / ТЕХНИЧЕСКОЕ                                       │
│ ☑ Домен зарегистрирован на имя владельца                 │
│ ☐ Email-база экспортируема                               │
│                                                           │
│ [🤖 AI: Сгенерировать listing] [📄 Экспорт пакета]       │
└─────────────────────────────────────────────────────────┘
```

### 2.8 AI-генерация listing для продажи

Кнопка "Generate Listing" → Claude создаёт готовое описание для Empire Flippers/Flippa:

```markdown
# popolkam.ru — Affiliate Coffee Machine Website

## 🔥 Key Highlights
- 2.4 years old, growing 8% MoM
- $245 avg monthly profit (last 12 months)
- 95% organic traffic from Google
- Niche: Coffee machines (high-ticket affiliate)

## 💰 Financials (Last 12 Months)
- Revenue: $3,960
- Expenses: $1,020
- Net Profit: $2,940
- Avg Monthly Profit: $245

## 📊 Traffic
- Sessions: 4,820/month avg
- Top pages: Coffee machine reviews
- Traffic sources: 85% Organic / 8% Direct / 5% Referral / 2% Social

## 🎯 Monetization
- Admitad (Russia affiliate network)
- ...

## 📈 Growth Opportunities
- Email list monetization (currently no list)
- Expand to related niches (grinders, beans)
- Add video content

## 🔧 Tech Stack
- WordPress + REHub theme
- Content Egg for price aggregation
...

## 📋 What's Included
- Domain: popolkam.ru
- 47 articles (all original)
- Full content history
- GA4 + GSC access
- Affiliate accounts transfer
- 30 days support after sale

## 💵 Asking Price: $8,500
(27x monthly profit)
```

### 2.9 Трекинг эффективности рекомендаций

Система запоминает рекомендации и проверяет их выполнение:

```
Рекомендации от 2026-01-15:
✅ Добавить email-капчу        — выполнено 2026-02-10
✅ Добавить Awin               — выполнено 2026-03-05
⏳ Диверсификация топ-страниц  — в процессе
❌ 5 бэклинков                 — не начато

Результат:
Оценка 2026-01-15: $5,200
Оценка 2026-04-14: $6,664 (+28%)
Прогноз был: +25% → Точность AI: 89%
```

### 2.10 Стоимость работы агента

| Операция | Tokens | Частота | Cost/сайт/мес |
|----------|--------|---------|---------------|
| Сбор данных | — | 4x | $0 (БД) |
| AI-анализ | 30k in, 5k out | 4x | $0.12 |
| Генерация рекомендаций | 15k in, 10k out | 4x | $0.20 |
| **Итого** | | | **~$0.32/сайт/мес** |

Для портфеля 5 сайтов = $1.60/мес. Копейки за инсайты.

---

## 3. План внедрения

### Неделя 1
- БД: agent_configs, agent_runs, site_valuations, site_expenses
- API endpoints для агентов
- Scheduler (node-cron) с поддержкой динамических изменений

### Неделя 2
- UI страница "Agents" — список + карточки
- UI детальная настройка (settings form + schedule builder)
- История запусков и логи

### Неделя 3
- Site Valuation Agent — базовый расчёт
- UI страница "Valuation" для каждого сайта
- Portfolio Dashboard с общей стоимостью

### Неделя 4
- Preparation checklist
- AI generation листинга
- Экспорт пакета для продажи (PDF + ZIP с данными)

---

## 4. Ключевые принципы

1. **Всё конфигурируется** — не зашивать расписания и уставки в код
2. **Каждая настройка имеет default** — новый сайт работает сразу
3. **Per-site override всегда возможен** — разные ниши = разные параметры
4. **Прозрачность стоимости** — каждый агент показывает свою цену
5. **Аудируемость** — история всех запусков и решений
6. **Защита от накруток** — circuit breaker, budget limits, rate limits
7. **Valuation — не истина, а ориентир** — цена определяется на переговорах

---

## 5. Интеграции для Valuation Agent

### MVP (что можно сделать сразу)
- Выручка из БД (Admitad API уже настроен)
- Расходы — ручной ввод + auto-tracking AI-агентов
- Traffic из GA4
- Возраст домена — одноразовый WHOIS lookup

### Позже
- **Ahrefs API** / **SEMrush API** — для backlinks, DA
- **Empire Flippers marketplace API** — для сравнения с рынком (если доступен)
- **Google Trends** — для анализа трендов ниши
- **Partner APIs:** Awin, Bol.com, Яндекс.Маркет
