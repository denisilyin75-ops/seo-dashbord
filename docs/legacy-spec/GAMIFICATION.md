# Gamification & Motivation System

> Система мотивации и геймификации для преодоления "SEO-разрыва" —
> временной дистанции между действием и его результатом.
>
> **Главная идея:** каждое действие немедленно влияет на капитализацию сайта.
> Никаких "жди 6 месяцев" — результат виден сразу.

---

## 0. Проблема, которую решаем

```
Сегодня:  Написал статью
+1 мес:   Она проиндексировалась
+3 мес:   Начала приносить 5-10 сессий/день
+6 мес:   Принесла первую партнёрскую продажу
+12 мес:  Даёт стабильный доход
```

**Разрыв между действием и реальным результатом — до 12 месяцев.**
Это убивает мотивацию. Люди бросают проекты на 3-м месяце, когда
фундамент уже заложен, но результат ещё не виден.

**Решение:** показать **немедленную** оценку влияния каждого действия
на будущую капитализацию. Плюс геймификация для рутины.

---

## 1. Капитализация как главный мотиватор

### 1.1 Принцип "Live Capitalization"

Главная цифра в хедере дашборда — **текущая стоимость портфеля**,
пересчитывается после каждого действия:

```
┌───────────────────────────────────────────────────────┐
│  💎 Portfolio Value: $12,664                            │
│     ↑ +$248 за последние 24 часа                       │
│     ↑ +$3,420 за 30 дней                               │
│     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                    │
│     [#################..] 25% к exit target ($50k)     │
└───────────────────────────────────────────────────────┘
```

Это видно **всегда**. Не надо копать в отчёты — цифра прямо перед глазами.

### 1.2 Формула "Action Impact"

Каждое действие имеет **предсказанное влияние** на капитализацию.
Когда пользователь завершает действие, Valuation Agent пересчитывает
и показывает изменение.

```
User действие: Опубликовал статью "Обзор De'Longhi Dinamica"
               ▼
AI-оценка прироста:
  • Новый контент (+1 published article): +$35
  • Покрытие новой подниши (Dinamica series): +$22
  • Внутренняя перелинковка (3 новых ссылки): +$8
  • Swot для топикальной авторитетности: +$12
               ▼
Итого: +$77 к капитализации
Toast-уведомление: "🎉 +$77 к стоимости сайта!"
```

### 1.3 Таблица "Impact Per Action"

Для каждого типа действия — базовая оценка в $. Это **немедленная
предсказанная** ценность, которая потом уточняется реальными метриками
через 3-6 месяцев.

| Действие | Base Impact | Modifiers |
|----------|-------------|-----------|
| Опубликовать Review | +$35-50 | × 1.5 если топовая ниша, × 0.7 если дубль |
| Опубликовать Comparison | +$45-70 | × 2.0 если уникальная комбинация моделей |
| Опубликовать Guide (пилон) | +$80-150 | Большой вклад в топ. авторитет |
| Опубликовать Quiz/Tool | +$120-200 | Сильный вклад в поведенческие |
| Обновить старую статью | +$15-40 | Пропорционально улучшению score |
| Добавить внутреннюю ссылку | +$2-5 | × кол-во ссылок |
| Получить 1 качественный backlink | +$50-200 | × DA ресурса |
| Подключить нового партнёра | +$500-1500 | Диверсификация = большой прирост |
| Собрать 100 email-подписок | +$50-80 | Email list = актив |
| Ускорить сайт (LCP -0.5s) | +$100-300 | Core Web Vitals → позиции |
| Исправить битую ссылку | +$5-15 | Техническое здоровье |
| Обновить цены (Price Watchdog) | +$3-10 | Свежесть данных |
| Добавить schema.org | +$40-80 | Rich snippets → CTR |
| Опубликовать 7 дней подряд | +$75 бонус | Streak bonus |
| Закрыть все 🔴 таски | +$150 бонус | Maintenance bonus |

### 1.4 Hidden Metrics — "невидимые пузомерки"

То, что не видно в GA4, но влияет на рост. Эти метрики
**растут сейчас**, хотя трафик придёт позже.

```
┌─────────────────────────────────────────────────────────┐
│ 🔬 Hidden Growth Indicators — popolkam.ru                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 📚 Topical Authority              [████████░░] 78/100    │
│    ↑ +5 за неделю                                        │
│    Насколько Google воспринимает сайт как эксперта в     │
│    нише. Считается через % покрытия ключевых подтем.     │
│                                                           │
│ 🕸️ Internal Link Density          [██████░░░░] 62/100    │
│    ↑ +3 за неделю                                        │
│    Среднее кол-во внутренних ссылок на статью.           │
│    Идеал: 5-8 осмысленных ссылок.                        │
│                                                           │
│ 📖 Content Depth                  [███████░░░] 71/100    │
│    → за неделю                                           │
│    Средняя длина + структурированность статей.           │
│                                                           │
│ 🔄 Content Freshness              [█████████░] 89/100    │
│    ↑ +7 за неделю                                        │
│    % статей, обновлённых за последние 6 месяцев.         │
│                                                           │
│ 🎯 Niche Coverage                 [█████░░░░░] 54/100    │
│    ↑ +2 за неделю                                        │
│    % покрытых подниш из экспертной карты.                │
│                                                           │
│ 🔗 Backlink Momentum              [████░░░░░░] 42/100    │
│    ↑ +4 за неделю                                        │
│    Скорость получения новых ссылок vs конкуренты.        │
│                                                           │
│ 💬 Engagement Signals             [██████░░░░] 63/100    │
│    ↑ +1 за неделю                                        │
│    Bounce rate, time on page, scroll depth.              │
│                                                           │
│ 🎨 Brand Strength                 [███░░░░░░░] 31/100    │
│    → за неделю                                           │
│    Direct traffic + branded searches + soc signals.      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Ключевая фишка:** эти индикаторы растут **быстро** после действий,
даже когда видимый трафик ещё на нуле. Это даёт обратную связь
раньше, чем Google её даст.

### 1.5 Формулы hidden metrics

#### Topical Authority (0-100)
```
TA = (covered_subtopics / total_niche_subtopics) × 100

Где total_niche_subtopics определяется AI-анализом ниши:
  - ищутся все релевантные подтемы
  - строится семантическое дерево
  - каждая статья закрывает 1-3 подтемы
```

#### Internal Link Density (0-100)
```
ILD = min(100, (avg_links_per_article / 8) × 100)
  - 0-2 ссылок: плохо (<25)
  - 3-4: средне (25-50)
  - 5-7: хорошо (50-90)
  - 8+: отлично (90-100)
```

#### Content Depth (0-100)
```
CD = weighted_avg(
  word_count_score (target 1500+),
  structure_score (H2/H3/таблицы/списки),
  multimedia_score (images, videos)
)
```

#### Content Freshness (0-100)
```
CF = (articles_updated_in_6m / total_published) × 100
```

#### Niche Coverage (0-100)
```
NC = AI-анализ: строит "карту ниши" (все relevant темы),
     проверяет какие у нас закрыты.
```

#### Backlink Momentum (0-100)
```
BM = (new_backlinks_last_30d / competitor_avg_new_backlinks) × 100
```

#### Engagement Signals (0-100)
```
ES = weighted_avg(
  100 - bounce_rate,
  time_on_page_score,
  scroll_depth_score,
  pages_per_session_score
)
```

#### Brand Strength (0-100)
```
BS = weighted_avg(
  direct_traffic_share × 100,
  branded_searches_share × 100,
  social_signals_score
)
```

---

## 2. Геймификация — XP, Levels, Streaks

### 2.1 Система XP

Каждое действие даёт не только $ к капитализации, но и **XP** для прогресса уровня.

```
┌─────────────────────────────────────────────────┐
│ 🎮 Владелец портфеля — Level 12                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│ [████████████░░░░░] 2,450 / 3,000 XP              │
│ До следующего уровня: 550 XP                      │
│                                                   │
│ 🔥 Current Streak: 14 дней                        │
│ 🏆 Total XP: 18,450                               │
│ ⭐ Rank: Top 12% in SEO community*                │
│ *условный бенчмарк с другими пользователями       │
└─────────────────────────────────────────────────┘
```

### 2.2 Таблица XP за действия

| Действие | XP | Условие |
|----------|-----|---------|
| Опубликовать статью | 100 | — |
| Опубликовать pillar (2000+ слов) | 200 | длина + структура |
| Обновить статью | 40 | если прошло >30 дней |
| Провести AI-команду | 10 | макс 50/день |
| Подтвердить AI-предложение агента | 25 | |
| Добавить новый сайт | 500 | |
| Запустить Deploy Wizard | 250 | |
| Подключить нового партнёра | 300 | |
| Получить 100 новых сессий | 50 | |
| Получить первые $10 от нового сайта | 500 | |
| Закрыть критичный алерт | 75 | |
| Написать 7 дней подряд | 500 bonus | streak |
| Написать 30 дней подряд | 3000 bonus | streak |
| Удвоить трафик сайта | 2000 | вехa |
| Удвоить капитализацию сайта | 5000 | вехa |

### 2.3 Уровни и их значение

Уровни — не просто цифра. Каждый даёт "перк" в дашборде.

| Level | Title | XP | Unlock |
|-------|-------|-----|--------|
| 1-5 | 🌱 Starter | 0-2,000 | Basic dashboard |
| 6-10 | 🌿 Builder | 2,000-8,000 | Deploy Wizard |
| 11-15 | 🌳 Operator | 8,000-20,000 | Agent автонастройка |
| 16-20 | 🏛️ Architect | 20,000-50,000 | Portfolio analytics |
| 21-30 | 🚀 Growth Hacker | 50,000-150,000 | AI-стратег на неделю |
| 31+ | 👑 Portfolio Master | 150,000+ | Exit-ready consulting |

Unlocks — это не блокировки, а мотивационные "открытия" фич.
Новые инструменты доступны с ростом.

### 2.4 Streaks (цепочки)

**Daily streak** — делать минимум 1 значимое действие в день.

Значимое = любое из:
- Опубликовать/обновить статью
- Подтвердить 3+ AI-предложения
- Закрыть 3+ задачи из плана
- Добавить новый контент в план (5+ идей)

```
┌────────────────────────────────┐
│ 🔥 Current Streak: 14 days     │
│                                │
│  Mon Tue Wed Thu Fri Sat Sun   │
│   ✅  ✅  ✅  ✅  ✅  ✅  ✅    │
│   ✅  ✅  ✅  ✅  ✅  ✅  ✅    │
│                                │
│  Next milestone: 30 days       │
│  Reward: +3000 XP bonus +      │
│  "Iron Will" achievement       │
└────────────────────────────────┘
```

**Правила:**
- Если пропустил день — streak сбрасывается в 1
- **Но есть 2 "заморозки" в месяц** — можно использовать чтобы не потерять streak (отпуск, болезнь)
- Заморозка активируется автоматически или вручную из настроек

### 2.5 Achievements (ачивки)

Одноразовые бейджи за вехи. Показываются в профиле.

#### Контент
- 🏆 **First Steps** — первая опубликованная статья
- 📝 **Storyteller** — 10 статей
- 📚 **Library Builder** — 50 статей
- 📖 **Encyclopedia** — 200 статей
- ✍️ **Daily Writer** — публикация 7 дней подряд
- 🔥 **Unstoppable** — 30 дней подряд
- 💎 **Diamond Hands** — 100 дней подряд

#### Деньги
- 💵 **First Dollar** — первые $1 заработано
- 💰 **Hundred Club** — $100 за месяц
- 🤑 **Kilo Earner** — $1000 за месяц
- 💎 **Ten K Milestone** — $10k total revenue

#### Капитализация
- 📈 **Thousand Site** — сайт оценён в $1000
- 🏦 **Five Figure** — сайт оценён в $10,000
- 🏰 **Portfolio Builder** — портфель оценён в $25,000
- 👑 **Exit Ready** — портфель оценён в $50,000+

#### SEO
- 🎯 **First Keyword** — первое 1-е место по запросу
- 🏁 **Top 10 Club** — 10 запросов в топ-10
- 🎖️ **Top 3 Club** — 10 запросов в топ-3
- 🔝 **Page One Master** — 100 запросов в топ-10

#### Автоматизация
- 🤖 **Agent Operator** — запустил 5 агентов
- ⚙️ **Automation Wizard** — все агенты работают 30 дней без сбоев
- 🧠 **AI Whisperer** — 500 AI-команд

#### Портфель
- 🌐 **Multi-Site** — 2 сайта
- 🌍 **Portfolio Master** — 5 сайтов
- 🌏 **Empire Builder** — 10 сайтов
- 💼 **First Sale** — продал первый сайт

#### Скрытые
- 🌙 **Night Owl** — работа после 22:00 (30 раз)
- ⚡ **Speed Demon** — 10 AI-команд за 1 час
- 🎪 **Recovery** — сайт с падающим трафиком выведен в рост
- 🎭 **Pivoter** — успешно сменил нишу сайта

### 2.6 Progress Rings (кольца прогресса)

Вдохновлено Apple Watch — три кольца ежедневных целей:

```
┌─────────────────────────────────┐
│ Today's Rings                    │
│                                  │
│   📝          💰          🤖      │
│  ╭──╮        ╭──╮        ╭──╮   │
│  │85│        │40│        │100│   │
│  ╰──╯        ╰──╯        ╰──╯   │
│  Create      Earn        Automate│
│  1/1         $8/$20      3/3     │
└─────────────────────────────────┘
```

- **Create (📝):** минимум 1 контент-действие (статья/обновление)
- **Earn (💰):** цель по доходу за день (adaptive, растёт с портфелем)
- **Automate (🤖):** подтвердить/запустить N AI-действий

Кольца замыкаются — +XP бонус + streak day.

---

## 3. Visibility — видимость роста

### 3.1 Growth Graphs (графики всего)

Отдельная страница "📈 Growth" где все метрики:

```
Capitalization        ↗ +260% за 12 мес
Traffic              ↗ +340% за 12 мес
Revenue              ↗ +180% за 12 мес
Published articles   ↗ +47 за 12 мес
Topical Authority    ↗ 34 → 78 (+44)
Backlinks            ↗ 12 → 120 (+108)
Domain Rating        ↗ 8 → 24 (+16)
Partners             ↗ 1 → 4
Email subscribers    ↗ 0 → 340
```

Каждый график — мотиватор. Визуально видно: **всё растёт**.

### 3.2 Milestone Timeline

```
┌─────────────────────────────────────────────┐
│ 🎯 Your Journey                              │
├─────────────────────────────────────────────┤
│                                               │
│  Jan 15  ●  Launched popolkam.ru              │
│   │        Valuation: $0                     │
│   │                                           │
│  Feb 8   ●  First 100 sessions               │
│   │        Valuation: $120                   │
│   │                                           │
│  Mar 12  ●  First affiliate sale ($12)       │
│   │        Valuation: $680                   │
│   │                                           │
│  Apr 14  ●  Valuation hit $5,000! 🎉         │
│   │        Achievement unlocked              │
│   │                                           │
│  ★ YOU ARE HERE ★  Valuation: $6,664          │
│   │                                           │
│  ?       ○  Next: $10,000 valuation          │
│   │        Estimated: June 2026               │
│                                               │
│  ?       ○  Goal: $50,000 portfolio exit     │
│            Estimated: Oct 2027                │
└─────────────────────────────────────────────┘
```

### 3.3 "Что изменилось сегодня"

Виджет на главной — dopamine hit каждое утро:

```
┌─────────────────────────────────────────────┐
│ ☀️ Доброе утро! Пока ты спал:                │
├─────────────────────────────────────────────┤
│                                               │
│  📈 +87 сессий за ночь                       │
│  💰 +$4.20 заработано                        │
│  🔍 Новая позиция: "кофемашина jura"         │
│      → 14 место (было 18)                    │
│  📝 Статья "Обзор De'Longhi" набрала         │
│      +120 просмотров за ночь                 │
│  🤖 Agents завершили 3 задачи:               │
│     • Price Watchdog: 12 товаров обновлено   │
│     • Metrics Collector: данные за 14.04     │
│     • Content Freshness: 2 статьи помечены   │
│                                               │
│  Твой streak: 🔥 15 дней                      │
│  [Начать день]                                │
└─────────────────────────────────────────────┘
```

### 3.4 Weekly Review

Каждое воскресенье — отчёт недели:

```
📊 Week Review — April 8-14
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Published: 3 articles (+$185 capitalization)
Updated: 7 articles (+$105 capitalization)
New partners: 1 (Awin) (+$850 capitalization)
Total gained: $1,140 📈

XP earned: 2,840
Level up: 11 → 12
New achievements: 2
  • 📝 Storyteller (10 articles)
  • 🎯 First Keyword (top 1 for "jura e8 обзор")

Top article this week:
  "Обзор Saeco GranAroma"
  → 480 views, 12 affiliate clicks, $8.40

Weakest area:
  Backlink Momentum dropped -3 points
  [AI Recommendation: focus on outreach next week]

Next week forecast:
  Expected capitalization: $6,800-$7,100
  Recommended focus: 2 comparisons + 1 guide
```

### 3.5 Live Activity Feed

Лента в реальном времени — "что-то всё время происходит":

```
┌─────────────────────────────────────────────┐
│ ⚡ Live Activity                              │
├─────────────────────────────────────────────┤
│                                               │
│  2 min ago  🤖 Price Watchdog updated 3      │
│             products on popolkam.ru           │
│                                               │
│  15 min ago 📈 New visitor from google.com   │
│             → /obzor-delonghi-magnifica-s/    │
│                                               │
│  34 min ago 💰 Affiliate click recorded       │
│             Admitad → De'Longhi store         │
│                                               │
│  1 hour ago 🔍 Position improved              │
│             "кофемашина де лонги" 22 → 19     │
│                                               │
│  2 hours ago 🤖 Content Freshness agent      │
│             flagged 2 articles for update     │
│                                               │
│  5 hours ago 📝 You published:                │
│             "Топ-3 капсульных кофемашин"      │
│                                               │
└─────────────────────────────────────────────┘
```

Даже во время простоя — feed живой. Агенты работают за тебя.

### 3.6 Counterfactual ("что если")

Показывает **alt-реальность без твоих действий** — как выглядел бы
портфель, если бы ты не работал:

```
┌─────────────────────────────────────────────┐
│ 🎯 Your Impact                                │
├─────────────────────────────────────────────┤
│                                               │
│  With your work:     $6,664                   │
│  Without work*:      $2,100                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│  Your contribution:  +$4,564 ✨               │
│                                               │
│  *оценка — если бы сайт продолжал жить       │
│   без новых статей и обновлений               │
└─────────────────────────────────────────────┘
```

Мощнейший мотиватор — видно, что **именно ты** создаёшь ценность.

---

## 4. AI-коуч — персонализированная мотивация

### 4.1 Daily AI Message

Каждое утро — персональное сообщение от AI-коуча (Claude):

```
┌─────────────────────────────────────────────┐
│ 🧠 Ваш AI-коуч                                │
├─────────────────────────────────────────────┤
│                                               │
│  Привет! 👋                                   │
│                                               │
│  Вчера ты опубликовал обзор Saeco — это     │
│  принесло +$45 к капитализации и уже       │
│  собрало 23 просмотра. Отличная работа!    │
│                                               │
│  На этой неделе заметил, что Topical        │
│  Authority вырос на 5 пунктов — сайт       │
│  становится экспертнее. Google скоро это   │
│  оценит.                                     │
│                                               │
│  Предложение на сегодня:                     │
│  Напиши сравнение "Saeco vs De'Longhi" —   │
│  это закрывает 2 дыры в нише и должно     │
│  принести +$65 к капитализации.             │
│                                               │
│  Твой streak 🔥 15 дней. Не ломай!          │
│                                               │
│  [Начать писать] [Другие идеи]              │
└─────────────────────────────────────────────┘
```

### 4.2 Context-aware мотивация

AI подстраивается под ситуацию:

**Если streak 0-3 дня:**
> "Начни с малого — обнови одну старую статью. 15 минут дела."

**Если streak 15+ дней:**
> "Ты на стреке 17 дней! Большинство бросают на 21-м. Докажи, что ты не они."

**Если капитализация упала:**
> "Стоимость упала на $50. Проверь что с трафиком топ-статей — агент Content Freshness пометил 2 кандидата на обновление."

**Если капитализация выросла сильно:**
> "Рост $300 за неделю! Этот темп → $1200/месяц → $14,400/год. Держи."

**Если близок milestone:**
> "До следующего уровня: 120 XP. Одна статья и один AI-команды сет — и ты на 13-м."

### 4.3 Комментарии после действий

После каждого значимого действия — короткий AI-коммент:

```
"Ты обновил статью 'Как выбрать кофемашину'.

Обновление даст +$28 к капитализации потому что:
• Статья в топе по трафику (1840 сессий/мес)
• Теперь свежая — Google любит свежее
• Добавленная таблица повысит CTR
• Topical Authority +2 пункта

Прогноз через 30 дней: +120-150 сессий, 1-2 доп. конверсии.
Хорошая работа! 👍"
```

Это превращает рутину в **осмысленную работу с обратной связью**.

---

## 5. Мини-челленджи

### 5.1 Weekly Challenges

Каждый понедельник — 3 челленджа на неделю:

```
┌─────────────────────────────────────────────┐
│ 🎯 Weekly Challenges — April 15-21            │
├─────────────────────────────────────────────┤
│                                               │
│  🟢 EASY — 500 XP                              │
│  Опубликовать 3 статьи                       │
│  [█░░] 1/3                                   │
│                                               │
│  🟡 MEDIUM — 1000 XP                           │
│  Вырастить Topical Authority на +5           │
│  [███░░] текущий 78 → target 83              │
│                                               │
│  🔴 HARD — 2000 XP                             │
│  Получить капитализацию $7000                │
│  [██████░] $6664 → $7000                     │
│                                               │
│  Complete all 3 → Bonus achievement           │
│  "Weekly Warrior" + 1000 extra XP             │
└─────────────────────────────────────────────┘
```

### 5.2 Seasonal Challenges

- **Summer Sprint** — июнь-июль: утроить skorость публикаций
- **Black Friday Rush** — ноябрь: подготовиться к сезону
- **New Year Reset** — январь: обновить топ-20 статей

### 5.3 Portfolio Challenges

Долгосрочные:
- **$10k Valuation** — довести сайт до $10,000 (+5000 XP)
- **$50k Portfolio** — exit-ready ($50k портфель) (+25000 XP)
- **3-Site Empire** — 3 прибыльных сайта (+10000 XP)

---

## 6. Социальные элементы (опционально)

### 6.1 Соло-анонимные бенчмарки

Не соцсеть, но **сравнение с обезличенными сообществом**:

```
Ваши показатели          You    Community Avg
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Articles published       47     38
Daily streak            15     7
Monthly revenue         $245   $180
Valuation/site          $6664  $4200
XP level                12     9

→ Вы в топ-18% пользователей
```

Данные анонимные, от других пользователей системы или публичных
бенчмарков. Источник подписывается.

### 6.2 Public Leaderboards (opt-in)

Если включить — показываешь под псевдонимом:

```
🏆 Leaderboard — April 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. @coffee_king      $24,500
2. @nordic_niche     $18,200
3. @you              $6,664 ← вы
4. @newbie_grinder   $4,200
```

---

## 7. "Future Self" визуализация

Сильнейший психологический приём — показать **будущую версию** себя.

### 7.1 Forecast Dashboard

```
┌─────────────────────────────────────────────┐
│ 🔮 Your Portfolio in 12 Months                │
├─────────────────────────────────────────────┤
│                                               │
│  IF YOU KEEP CURRENT PACE:                    │
│                                               │
│  Capitalization:    $24,500                   │
│  Monthly revenue:   $920                      │
│  Articles:          147                       │
│  Sites:             3-4                       │
│                                               │
│  IF YOU 2X YOUR PACE:                         │
│                                               │
│  Capitalization:    $58,000 ← EXIT READY 🚀   │
│  Monthly revenue:   $2,100                    │
│                                               │
│  "Будущая версия тебя благодарит за          │
│   сегодняшнюю работу."                        │
└─────────────────────────────────────────────┘
```

### 7.2 Alternative Timelines

```
Sliders для игры с прогнозом:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Articles per month:   [====|=====] 8
Backlinks per month:  [==|=======] 3
Hours per week:       [=====|====] 15

→ Predicted exit: Aug 2027 at $52,000
→ Predicted MRR:  $2,400
```

Позволяет **видеть**, как изменения в поведении влияют на цель.
Игровой калькулятор мечты.

---

## 8. UX-принципы геймификации

### 8.1 Что работает

✅ **Немедленная обратная связь** — toast после каждого действия
✅ **Прогресс-бары** — всё должно иметь видимый прогресс
✅ **Цифры растут** — графики только вверх (даже если день плохой — видно накопленное)
✅ **Маленькие победы** — много ачивок, даже простых
✅ **Персонализация** — AI-коуч помнит контекст
✅ **Выбор сложности** — челленджи на любой день (easy/med/hard)

### 8.2 Чего избегать

❌ **Только очки без смысла** — XP без привязки к бизнесу = пусто
❌ **Навязчивые уведомления** — можно отключить звуки/push
❌ **Потеря прогресса навсегда** — streak freezes обязательны
❌ **Токсичный сравнение** — бенчмарки только опциональные
❌ **Дешёвые ачивки** — каждая должна быть значимой
❌ **Блокировка функций** — уровни разблокируют, а не запирают

### 8.3 Антивыгорание

Система должна **замечать** когда ты перегрет:

```
🧠 AI Coach Alert

"Замечаю, что ты работаешь 20+ часов 5 дней подряд.
Валуация растёт, но я вижу снижение качества обновлений.

Предложение: завтра — восстановительный день. Я включу
freeze на streak, чтобы не потерять цепочку. Агенты
будут работать за тебя.

Выгорание = главный убийца соло-проектов. Заботься о себе."

[Согласен, freeze завтра] [Я в порядке]
```

---

## 9. Технические заметки

### 9.1 БД-схема для геймификации

```sql
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY,
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  streak_freezes_available INTEGER DEFAULT 2,
  last_activity_date TEXT,
  settings JSON
);

CREATE TABLE xp_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT,             -- 'publish', 'update', 'ai_command', etc
  action_ref TEXT,              -- article_id, command_id, etc
  xp_gained INTEGER,
  cap_impact_usd REAL,
  site_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE achievements (
  id TEXT PRIMARY KEY,          -- 'first_steps', 'storyteller', etc
  name TEXT,
  description TEXT,
  icon TEXT,
  category TEXT,
  rarity TEXT                   -- 'common', 'rare', 'epic', 'legendary'
);

CREATE TABLE user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TEXT DEFAULT (datetime('now')),
  UNIQUE(achievement_id)
);

CREATE TABLE hidden_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id),
  date TEXT NOT NULL,
  topical_authority INTEGER,
  internal_link_density INTEGER,
  content_depth INTEGER,
  content_freshness INTEGER,
  niche_coverage INTEGER,
  backlink_momentum INTEGER,
  engagement_signals INTEGER,
  brand_strength INTEGER,
  UNIQUE(site_id, date)
);

CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  type TEXT,                    -- 'weekly', 'seasonal', 'portfolio'
  difficulty TEXT,              -- 'easy', 'medium', 'hard'
  name TEXT,
  description TEXT,
  target_metric TEXT,
  target_value REAL,
  xp_reward INTEGER,
  starts_at TEXT,
  ends_at TEXT,
  completed_at TEXT
);

CREATE TABLE daily_rings (
  date TEXT PRIMARY KEY,
  create_progress INTEGER,      -- %
  earn_progress INTEGER,
  automate_progress INTEGER,
  all_closed BOOLEAN DEFAULT 0
);

CREATE TABLE action_impacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT,
  action_ref TEXT,
  predicted_cap_impact REAL,
  actual_cap_impact REAL,       -- пересчёт через 90-180 дней
  prediction_accuracy REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 9.2 API endpoints

```
GET  /api/user/profile             — уровень, XP, стрик
GET  /api/user/achievements        — ачивки (полученные + доступные)
GET  /api/user/rings/today         — кольца сегодня
GET  /api/user/activity-feed       — live feed
GET  /api/user/weekly-review       — weekly
GET  /api/user/morning-brief       — "доброе утро"

GET  /api/sites/:id/hidden-metrics — hidden pizomerki
GET  /api/sites/:id/timeline       — milestone timeline
GET  /api/sites/:id/impact         — counterfactual

GET  /api/challenges/active        — активные челленджи
POST /api/challenges/:id/claim     — забрать награду

POST /api/xp/record                — зарегистрировать действие
POST /api/cap/recalculate          — пересчёт капитализации

GET  /api/coach/message            — daily AI message
POST /api/coach/context            — контекст для персонализации
```

### 9.3 Event Bus

Все действия пользователя и агентов — через event bus:

```javascript
// Пример обработки публикации статьи
eventBus.on('article.published', async (article) => {
  // 1. XP
  await addXP(article.userId, 100, 'publish', article.id);

  // 2. Capitalization impact
  const impact = await calculateImpact(article);
  await recordActionImpact('publish', article.id, impact);
  await updateSiteValuation(article.siteId);

  // 3. Hidden metrics recalc
  await recalcHiddenMetrics(article.siteId);

  // 4. Streak
  await updateStreak(article.userId);

  // 5. Ring progress
  await updateDailyRings(article.userId, 'create', 1);

  // 6. Check achievements
  await checkAchievements(article.userId, 'article_count');

  // 7. Toast notification
  broadcast({
    type: 'action_completed',
    xp: 100,
    capImpact: impact.total,
    message: `+$${impact.total} к капитализации`
  });

  // 8. AI coach comment
  const comment = await generateAICoachComment(article, impact);
  broadcast({ type: 'coach_comment', comment });
});
```

---

## 10. Последовательность внедрения

### Фаза 1 — Base motivation (сразу)
- Живая капитализация в хедере
- Action impact toasts
- XP + levels
- Streak counter

### Фаза 2 — Hidden metrics
- Расчёт 8 невидимых пузомерок
- UI для их отображения
- Графики роста hidden metrics

### Фаза 3 — Achievements & rings
- Система ачивок (40+)
- Daily rings
- Weekly challenges

### Фаза 4 — AI coach
- Morning brief
- Daily coach messages
- Contextual reactions

### Фаза 5 — Advanced
- Timeline & milestones
- Future self / counterfactual
- Seasonal challenges
- Leaderboards (opt-in)
- Burnout protection

---

## 11. Критические моменты

### 11.1 Accuracy предсказаний

Предсказанная капитализация должна уточняться реальными данными
через 3-6 месяцев. Система **учится** точности своих предсказаний:

```
Опубликована 2026-01-15: "Обзор Jura E8"
Предсказано: +$55 к капитализации
Спустя 90 дней:
  • Реальная прибавка: +$78
  • Статья превзошла прогноз на 42%
  • Система теперь знает: Jura reviews = высокий impact
```

Этот feedback loop делает оценки точнее со временем.

### 11.2 Анти-читерство

Чтобы не накручивать XP:
- Нельзя публиковать 20 статей за час (rate limit)
- AI проверяет уникальность и качество контента
- Ачивки с реальными метриками (трафик, доход) нельзя хакнуть
- Капитализация основана на реальных данных GA4/GSC

### 11.3 Баланс пряника и кнута

**Только поощрение** — становится скучно.
**Только давление** — выгорание.

Формула:
- 70% позитивной обратной связи (+$, +XP, achievements)
- 20% конструктивных предупреждений (агенты находят проблемы)
- 10% mild давления (streak может сломаться)

---

## 12. Главный принцип

> **Каждое действие пользователя должно давать три вещи:**
>
> 1. **Результат для бизнеса** (реальное влияние на капитализацию)
> 2. **Немедленное ощущение прогресса** (XP, toast, ring update)
> 3. **Долгосрочную ценность** (накопление hidden metrics)
>
> Если действие не даёт все три — его нет смысла предлагать.

---

## 13. Связь с другими документами

- **CLAUDE.md** — базовая архитектура
- **AGENTS.md** — агенты генерируют события для XP/rings
- **ADMIN_AND_VALUATION.md** — валюация = основа мотивации
- **GAMIFICATION.md** ← этот файл — наслаивает мотивацию поверх всего

Всё работает в связке: действие → агент реагирует → метрики пересчитываются →
капитализация обновляется → XP/achievement выдаётся → coach реагирует.
