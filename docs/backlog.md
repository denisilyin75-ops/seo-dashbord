# Backlog — единый список всех открытых задач

> **Статус:** живой документ. Обновляется после каждой значимой встречи/сессии.
> **Последнее обновление:** 2026-04-18 (вечер, после v0.4.0)
>
> **Priority levels:**
> - P0 — срочно (горит или блокирует много чего)
> - P1 — ближайшие 1-2 недели
> - P2 — месяц
> - P3 — квартал / когда будет слот

---

## 🚀 Product Vision 2.0 — phased rollout

Закреплено 2026-04-18. Подробно: `docs/business-model.md §11 Product Vision 2.0`, `docs/ai-routing.md`, `docs/agents/site-guardian.md`.

Эволюция: от «affiliate-блог с 30 обзорами» → **Vertical Product Finder** (editorial depth + full catalog coverage через partner feeds + intelligent matching).

| Phase | Что | Блокеры | Таймлайн |
|---|---|---|---|
| **Phase 0 (идём сейчас)** | Editorial layer: CPT `machine` в WP + 10-30 обзоров на popolkam. Static scoring quiz. | Лицензии REHub/WPAI Pro для финального стека | Ближайшие 2-3 недели |
| **Phase 1** | Catalog layer: products table в SCC + `feed_sync` агент (Admitad XML). Basic SQL matching в quiz. | LLM host online (user side, next week+). VPS upgrade 48GB → 120GB. | Week 3-6 |
| **Phase 2** | Enrichment: `attribute_enricher` агент (local LLM). NL quiz parsing (Haiku). Вторая рубрика (чайники/химия). | Phase 1 стабильный | Month 2-3 |
| **Phase 3** | RAG semantic matching. Cross-site products. Site Guardian full deployment. `price_drift` с history. | Phase 2 работает, >1000 products | Month 4-8 |
| **Phase 4** | On-site chatbot, personalization, email alerts price-drop, SaaS exposure | Phase 3 | Month 9-18 |

**Инфра стек** (закреплено):
- **VPS (5.129.245.98)**: thin frontend — WP × 3 + MariaDB + SCC + Traefik. Upgrade нужен (текущий 48GB/3.8GB RAM → 120GB/8GB RAM).
- **LLM host** (пользовательский сервер 2×RTX 3090 48GB VRAM / 96GB RAM / 4TB SSD / 18TB HDD): bulk compute — Qwen-72B flagship, embedding generation, feed processing, site_guardian heavy lifting. Online через Tailscale VPN.
- **AI routing:** local LLM primary для bulk/privacy, OpenRouter Haiku для speed-sensitive UX, Sonnet только для публикационного контента. Экономия $200-500/мес.

---

## ⚖️ Time allocation (ближайшие дни)

Нарезка решения пользователя (2026-04-18):

| Бюджет | Направление | Фокус |
|---|---|---|
| **50%** | **popolkam.ru** (контент + шлифовка) | Публикация Phase 1 — 9 обзоров кофемашин. Дожать флагман до первых органических кликов. |
| **25%** | **SCC (seo-dashbord)** | Expected Value UX + то что напрямую поддерживает публикационный пайплайн popolkam |
| **25%** | **Прочее** (aykakchisto + 4beg + инфра + доки) | aykakchisto ждёт лицензий → контент-стратегия + плагин TCO. 4beg: продлить домен. Docker DNS fix (30 сек). |

**Принцип распределения** (из supreme + смежный плод):
- Контент-движок — главное, без него экзит невозможен
- Инфра / SCC — вспомогательно, делаем ровно столько чтобы не мешало контенту
- Новые сайты (aykakchisto) — параллельно, но не за счёт основного

**Re-assess:** раз в 3-5 дней. Если popolkam дошёл до первых 5k sessions/мес — можно двинуть aykakchisto в 40%.

---

## 🎯 popolkam.ru (50% времени)

### Главное: Phase 1 публикации кофе (9 обзоров)

**Статус:** 9 планов с AI-брифами в content_plan уже есть (из session handoff 2026-04-18). Нужно **довести до публикации**.

Pipeline per статья (~2-4 часа):
- [ ] Открыть plan item в SCC → посмотреть AI-бриф
- [ ] Создать draft пост в WP (через SCC article + sync-wp push, либо напрямую в wp-admin)
- [ ] Доработать вручную: плюсы/минусы, блок цен (минимум 2 мерчанта Admitad SubID), таблица ТТХ, FAQ
- [ ] Встроить TCO-калькулятор через shortcode `[popolkam_tco_calc]` + meta-fields `popolkam_machine_*`
- [ ] Добавить 3-5 внутренних ссылок на другие обзоры/comparison
- [ ] Публикация → sync в SCC → pushаем на WP через sync-wp

**Trigger для перехода на #2 рубрику (чайники, см. kettles.md):** 9+ обзоров кофе опубликованы, есть первый органический трафик.

### popolkam — шлифовка инфры

- [ ] **Настроить Rank Math wizard полностью** (сейчас базовые настройки, надо тюнинг: meta-templates, sitemap, breadcrumbs)
- [ ] **Проверить главную визуально** на mobile + REHub стилях — зафиксить битые блоки
- [ ] **GA4 + GSC Service Account** — подключить для реальных метрик (сейчас метрики синтетические)
- [ ] **Admitad SubID для каждого партнёра** — проверить что работают, инкапсулировать в Content Egg (когда купим) или вручную

### popolkam — кросс-селл

- [ ] Cross-sell в каждом обзоре кофемашины: блок «Что ещё купить» — зерно, молочник, декальцинатор, чистящие таблетки (одна подборка-хаб: `/kofemashiny/aksessuary/`)
- [ ] Pillar-статья «Уход за кофемашиной» — мост к aykakchisto (внутренняя cross-site ссылка на Дарью про накипь)

---

## 🛠 SCC (25% времени) — поддержка контентного пайплайна

### P0-02: Expected Value UX везде
**Прямо помогает popolkam-операции:** когда открываешь план создать обзор, видишь «+$25 к капитализации» — мотивирует опубликовать сегодня.

**Где применить:**
- Daily Brief Quick Win — переформулировать карточки в «сделай X → +$Y»
- Plan items — показывать `+$N` к капитализации при создании (по типу статьи: review +$15, comparison +$25 и т.д.)
- Offer Health алерты — «Заменить битую ссылку → +$N/мес EPC»
- Content Freshness алерты — «Refresh → возврат $N»

Принцип: `memory/feedback_expected_value_ux.md`.

### Быстрые quality-of-life фичи

- [ ] **Расширить ArticleRow meta-fields** — добавить `popolkam_machine_price`/`name`/`type`/`buy_url`/`buy_label` с валидацией
- [ ] **Кнопка «Запустить агента site_valuation сейчас»** в PortfolioWidget — после новой публикации сразу видеть новую цифру
- [ ] **Sync-all кнопка** на SiteDetail — сейчас через curl, в UI нет

### Stage C идеи (если останется время в 25%)

- Prompt caching в claude.js (−50-80% AI costs)
- AI model picker per-agent (Haiku для простых агентов)
- Circuit Breaker + Budget Control (легаси P1)
- Gamification Phase B — editable impact config

---

## 🌍 Прочее (25%)

### aykakchisto.ru — ждём лицензии, параллельно готовим

- [ ] **WPAI Pro License Key** — когда дашь, ставлю 4 плагина
- [ ] **REHub Purchase Code** — для Registration в wp-admin
- [ ] **Content Egg** — ждёт покупки на след. неделе (не блокер)
- [ ] **ReCompare preset** — перенести с popolkam на aykakchisto после Registration REHub
- [ ] **Плагин `aykakchisto-calc`** (если решим) — по образцу `popolkam-calculators`, для калькуляторов расхода химии / TCO пылесоса
- [ ] **Первые 30 статей по cleaning.md §5** — создать плановые item в SCC

### 4beg.ru

- [ ] **Продлить домен до 2026-07-04** (~2.5 мес осталось)
- [ ] **Собрать доступы** (wp-admin, SSH Timeweb, GA4, SC) — для миграции

### Инфра

- [ ] **Docker DNS fix** (30 сек работы + 1 мин простоя) — убирает временный extra_hosts хотфикс
- [ ] **IPv6 на сервере** (P2, отдельная сессия с rescue console)

### Документация (фоново)

- [ ] **docs/strategies/running-shoes.md** — после миграции 4beg
- [ ] **Перенести** `Downloads/ay-kak-chisto-brief.md` → `docs/briefs/aykakchisto.md` (архивно, уже отражено в cleaning.md)

---

## ✅ Сделано в сессии 2026-04-18 (Stage C, день 1 — big day)

### Валюация + UI
- **P0-01 Site Valuation калибровка** — PER_ARTICLE_VALUE снижены, age × $100 max $800, momentum cap $500. Двухуровневая penalty за нет-revenue (−40% zombie / −20% active). Methodology bumped `v2.1_calibrated_2026-04-18`. [72fd153, 26355bc, cf87209]
- **P0-03 OpenRouter credits в Settings UI** — карточка с прогресс-баром, текстовыми рекомендациями. $4.93/$5.00 на проде. [e7472ac]
- **P0-04 popolkam meta-fields в ArticleRow** — WP плагин 1.1.0 + backend PUT с meta + UI collapsible «🛠 Калькулятор / партнёрка». End-to-end. [f85d1bf]
- **Methodology badge + timestamp в ValuationPanel** — видно какой формулой считалось. [d86c216]

### Геймификация + Blog
- **Gamification Phase A** — Live Portfolio Value widget в шапке, action impact toasts (+$N), user_prefs для toggle'ов, GET /api/portfolio/valuation с delta 24h/30d фильтром по methodology. [d5f02d6, 362901d, 3bba57f]
- **Blog «что сделано»** в Dashboard — DB + CRUD + BlogPanel UI + 5 ретроспективных seed-записей за 2026-04-17/18. [25f2887]

### Документация
- `docs/legacy-spec/` — импорт 4 .md + GAMIFICATION.md + jsx прототип (архив старых спек)
- `docs/devlog.md` часть 4 + `docs/gamification.md` user-guide [6f6263c, 707a303]
- `docs/scaling-checklist.md` — живой чек-лист запуска нового сайта (Фаза 1 скриптами / Фаза 2 руки+лицензии / Фаза 3 контент) + таблица 9 «известных гвоздей» [7261705]

### Новый сайт
- **aykakchisto.ru провижен** — wp-aykakchisto контейнер, 12 рубрик, E-E-A-T, Let's Encrypt cert, зарегистрирован в SCC (site_a43088d3). Бесплатный эталонный стек установлен (elementor / greenshift / woocommerce / cyr2lat / rank-math + allow-svg mu-plugin). [b272bf8]
- Портфель: **$9,120 / $50k (18.2%)**

---

## 🔥 P0 — следующая сессия, первым

### [ ] **aykakchisto: докупить лицензии и поставить платные плагины**
Блокирует переход сайта в active. Нужно:
- **REHub theme + rehub-framework** — ~$59 на ThemeForest. После покупки: wp-admin → Appearance → Upload Theme → активировать → плагины REHub ставить по одному (bulk-TGMPA падает на WP 6.9+), активировать лицензию в Registration tab.
- **Content Egg Pro** — ~$59 на CodeCanyon. Upload Plugin → активировать → настроить API keys (Admitad, Я.Маркет, Ozon — те же что на popolkam).
- **WP All Import Pro + 3 addon** — ~$199 на wpallimport.com. Upload Plugin × 4, активировать.
- **envato-market** (бесплатный, но только с envato.com) — для auto-updates купленного.

**Когда сделано:** применить ReCompare preset как на popolkam, поменять status на active, прогнать site_valuation — ожидаем рост $180 → $500-700 (базовая инфра + тема + E-E-A-T насыщеннее).

### [ ] **Продлить домен 4beg.ru** до 2026-07-04
Осталось ~2.5 мес. Потеря = 10-летний домен с трафиком.

### [ ] **Собрать доступы к 4beg.ru** для миграции
- wp-admin логин/пароль
- SSH/FTP Timeweb (БД дамп + uploads)
- GA4 / Search Console email
- Активные партнёрские аккаунты

### [ ] **P0-02: Expected Value UX везде**
Применить принцип «сделай X → +$Y» в:
- Daily Brief Quick Win
- Plan items (показывать +$N при создании)
- Offer Health алерты (+$N/мес EPC)
- Content Freshness алерты (+$N возврат)

Сейчас применён только в ValuationPanel + Gamification toast'ах. Принцип: `memory/feedback_expected_value_ux.md`.

### [ ] **aykakchisto контент-стратегия** → `docs/strategies/cleaning.md`
После покупки лицензий. Взять за основу бриф (`Downloads/ay-kak-chisto-brief.md` или импортировать в `docs/briefs/aykakchisto.md`). Адаптировать под наши шаблоны coffee-machines.md / vacuum-robots.md: персоны + модели по приоритету + pillar-cluster + фазы публикаций + монетизация + KPI.

---

## 🔧 Infra: Docker daemon DNS → 8.8.8.8 / 1.1.1.1 (P2)

**Зачем:** хостинговый DNS (Timeweb) не отвечает на внешние запросы и медленно пропагирует новые записи. Когда регистрируем свежий домен (как сегодня `aykakchisto.ru`), SCC-контейнер кэширует NXDOMAIN и не может дотянуться до нового WP через HTTPS Traefik.

**Сейчас (хотфикс):** `/opt/scc/docker-compose.yml` содержит `extra_hosts` для `aykakchisto.ru` → 5.129.245.98. Работает, но каждый новый сайт потребует правки. Не в repo.

**Что сделать:**
1. На `/etc/docker/daemon.json` добавить `"dns": ["8.8.8.8", "1.1.1.1"]`
2. `systemctl restart docker` (все контейнеры bounce, ~30-60с простоя)
3. Проверить что все сайты (cmd.bonaka.app, popolkam.ru, aykakchisto.ru) поднялись
4. Удалить `extra_hosts` из SCC compose

**Делать в спокойный момент**, не в пик работы.

---

## 🌐 Infra: настроить IPv6 на 5.129.245.98 (P2)

**Зачем:** Timeweb выделяет каждому VPS IPv6 адрес (например `2a03:6f00:a::1:12f0` для нашего), но по умолчанию **не конфигурит** его на `eth0`. На интерфейсе только link-local `fe80::...`. Из-за этого AAAA записи доменов, указывающие на выданный IPv6, не работают — клиент идёт по v6, получает таймаут, fallback на v4 (лишние 5-10 секунд).

**Сейчас:** popolkam.ru / 4beg.ru / cmd.bonaka.app без AAAA (только A). aykakchisto.ru — была AAAA от registrar автоматом, удалили 2026-04-18.

**Что сделать:**
1. Узнать IPv6 gateway через Router Advertisements (`rdisc6 eth0` или `ip -6 route`)
2. Добавить в `/etc/netplan/*.yaml` IPv6 адрес и default route
3. `netplan apply` (рискованно — держать rescue console Timeweb как fallback)
4. Проверить `ping6 google.com`
5. Вернуть AAAA записи для всех доменов → Let's Encrypt выпустит dual-stack cert

**Blast radius:** высокий (ошибка в netplan = потеря SSH). Делать отдельной сессией.

---

## 🆕 Stage C — следующий этап (выбрано из legacy spec + новые идеи)

### Из legacy spec (downloads/files (1)/, см. `docs/legacy-spec/`)

#### [ ] **Circuit Breaker + Budget Control + Notification Routing для агентов** — P1
- Поля в `agent_configs`: `circuit_breaker_state`, `consecutive_failures`, `monthly_budget_usd`, `max_cost_per_run_usd`, `notification_channels`, `notification_condition`
- Если 3 раза подряд fail → auto-disable + алерт; если over-budget → пауза до следующего месяца
- **Без этого нельзя масштабировать на 10 сайтов** (тихое выжирание бюджета, зацикленные ошибки)
- Источник: `ADMIN_AND_VALUATION.md §1.7+1.11`

#### [ ] **AI model picker per-agent (Haiku/Sonnet/Opus)** — P1
- Radio-выбор в карточке агента: Haiku для price-watch/links, Sonnet для аналитики, Opus только для критичных
- Экономия 50-80% на простых агентах
- Поле: `agent_configs.ai_model`
- Источник: `ADMIN §1.3`

#### [ ] **Adjustment table + market benchmarks для Site Valuation** — P1
- Таблица «factors с ±%»: возраст, traffic diversity, partners count, email base, концентрация топ-страниц, Google dependency
- Бенчмарки EF / MotionInvest / Flippa
- Прямо улучшит уже сделанную P0-01
- Источник: `ADMIN §2.2`

#### [ ] **Prompt caching в server/services/claude.js** — P1
- 50-80% экономии на повторяющихся system prompts (например, каждый Daily Brief гонит один и тот же контекст)
- Anthropic SDK поддерживает `cache_control: {type: "ephemeral"}`
- OpenRouter тоже поддерживает (через специальный header)
- Источник: `AGENTS.md §6`

#### [ ] **Sale Preparation Checklist (15 пунктов)** — P2
- UI вкладка `/sites/:id/prepare-sale` + таблица `sale_checklist`
- 15 пунктов: финансы / трафик / качество / процессы / домен. Progress 8/15
- Превращает абстрактный «exit» в конкретный progress-bar — точно в духе supreme principle
- Источник: `ADMIN §2.7`

#### [ ] **Schedule Builder UI (без cron)** — P2
- «Каждый ⟨день⟩ в ⟨время⟩» вместо `0 4 * * 0` в карточке агента
- Принцип «новичок управляет» из CLAUDE.md
- Источник: `ADMIN §1.10`

#### [ ] **Cannibalization Detector** — P2 (новый агент)
- GSC-запросы → ищет страницы конкурирующие в топ-20 → AI предлагает merge / redirect / repurpose
- Реальная проблема при 50+ статьях; **в нашем backlog отсутствует**
- Источник: `AGENTS.md §2.12`

### 🎮 Gamification — фазовый rollout (новый блок, см. `docs/legacy-spec/GAMIFICATION.md`)

**Цель:** преодолеть «SEO-разрыв» (12 мес от действия до результата) — показать немедленный feedback на каждое действие.

**Принципы пользователя:**
- ⚠️ **Реальные заниженные суммы** — не $35-50 за review (как в спеке), а $15 (= то что реально добавляет наш Site Valuation). Никакого «надувания»
- 🎚 **Настраиваемые** — оператор сам редактирует impact_per_action
- 👁 **Toggle hide/show** — backend всегда считает в фоне; toggle прячет UI. Включил → видишь актуальные цифры
- 🚫 Никакого «токсичного сравнения» — без public leaderboards в MVP

**Phase A — Live Capitalization (P1, делаем сейчас)**
- Виджет в шапке: Portfolio Value $X · ↑ +$Y/24h · прогресс к target
- Toast «+$X к капитализации» после publish/update статьи
- Toggle в Settings (eye icon в виджете тоже)
- Backend: `GET /api/portfolio/valuation` (сумма + delta 24h/30d), `user_prefs` table

**Phase B — Configurable impacts (P2)**
- Полная таблица «Action → Impact $» в Settings (редактируемая)
- Source-of-truth для toast'ов
- Сохранять реальные impact в `xp_log` (для калибровки в будущем)

**Phase C — XP / Levels / Streaks (P2)**
- `user_profile` таблица (level, total_xp, current_streak, longest_streak)
- Daily streak с 2 freezes/мес
- Levels 1-30 с unlock'ами (тоже toggleable)

**Phase D — Achievements + Daily Rings (P3)**
- 30-40 ачивок (Apple-Watch-style 3 кольца Create/Earn/Automate)
- Подбор низкая-средняя-высокая значимость

**Phase E — AI Coach + Hidden Metrics + Burnout protection (P3)**
- Morning brief, contextual reactions, 8 «невидимых пузомерок» (Topical Authority, Internal Link Density, etc — нужны Ahrefs/SEMrush API для honest расчёта)
- Anti-burnout: detect перегруз → предложить freeze

### Дополнительные идеи (мои 5)

#### [ ] **A. Site Health summary card** — P1
Per-site widget: uptime, SSL expiry, GA4/GSC connected, last metric sync, broken links count, freshness %, momentum. Зелёный/жёлтый/красный одной картинкой. Заменяет 10 кликов по разным экранам, сразу видно «где сейчас пожар».

#### [ ] **B. Audit Log + Activity Feed UI** — P1
Каждое действие в SCC (кто, что, когда). Принцип уже задекларирован в CLAUDE.md (#9), но не реализован. **Без него нельзя нанимать операторов** — нечем разбирать инциденты.

#### [ ] **C. AI commentary в Daily Brief** — P2
Каждая карточка не только цифра, а 1-2 строки «почему могло измениться» + suggested action. Конкретное применение Expected Value UX через AI.

#### [ ] **D. Cross-site benchmark в SiteDetail** — P2
Каждая ключевая метрика рядом с медианой портфеля («RPM $3.2 — 35% выше portfolio avg $2.4»). Помогает identify outliers без переключения сайтов.

#### [ ] **E. Onboarding Wizard для нового сайта** — P2
5 шагов с проверками (WP credentials → GA4 → first sync → first plan item). Цель из CLAUDE.md: «новый сайт за 15 минут с нуля».

---

## 🎯 P1 — ближайшие 2 недели (из legacy P1)

### Монетизация / Контент

#### [ ] Калькулятор полной стоимости владения (TCO) кофемашины
**Зачем:** уникальная фича. Большинство калькуляторов считают только "машина ÷ (кофейня - зерно)". Честная формула учитывает декальцинатор, чистящие таблетки, фильтры, амортизацию.
**Формула:**
```
Стоимость чашки = зерно + декальцинация + таблетки + фильтр + молоко + амортизация машины
3-year TCO = машина + расходники × 36 + зерно × 36
Экономия = (кофейня 300₽ - наша чашка) × чашек/день × 365 × 3
Окупаемость = цена машины / (месячная экономия)
```
**Режимы:** обычный (фиксированные дефолты) + экспертный (редактируемые параметры)
**Где:** `popolkam.ru/kofemashiny/kalkulyator-okupaemosti/` + в каждом review модели отдельный блок
**Формат:** React-компонент (Claude.ai artifact → WP plugin)

#### [ ] Скелет статьи "Топ-10 кофемашин 2026"
**Зачем:** главная comparison-страница рубрики, максимальный RPM. Ставим структуру, AI наполнит
**URL:** `/kofemashiny/top-10/`
**Что включить:** таблица 10 моделей с сортировкой, блоки "бюджет/среднее/премиум", CTA по каждой, FAQ

### SCC функции

#### [ ] Dashboard блок "Прогресс по фазам рубрики"
**Зачем:** визуализация сколько статей написано / опубликовано / осталось по каждой фазе (см. `docs/strategies/coffee-machines.md`)
**Что:** виджет на SiteDetail, группировка plan-items по phase, progress bar, счётчик
**Данные:** `content_plan.phase` (поле уже добавлено в схему)

#### [ ] 🤖 Content Freshness Agent — MVP (Phase 1)
**Спец:** memory `project_content_freshness_agent.md`
**Зачем:** supreme principle #2 (итеративность) — без агента оператор физически не может следить за 200-500 статьями
**Фаза 1 (минимум):**
- Таблица `content_health` в SQLite
- Cron `offer-ping` (пинг партнёрских URL раз в час)
- Новая страница `/content-health/:siteId` в SCC: read-only список с severity и action-кнопками
- Эндпоинты: `GET/PATCH /api/content-health`
**Фаза 2-4:** price-drift, SEO-drift, AI-refresh, автоматика (см. spec)

#### [ ] Content Egg: подключение к API
**Зачем:** автообновление цен в блоках «где купить» без ручной правки
**Блокирует:** честные цены в обзорах (supreme principle)
**Нужно:** API-ключи Admitad (partner ID), Яндекс.Маркет API, Ozon API, М.Видео

### popolkam.ru

#### [ ] Проверить главную визуально
**Статус:** Gutenberg-блоки применены, но не проверены на мобайле и REHub стилях
**Что:** открыть popolkam.ru в разных устройствах, зафиксить что поломалось

#### [ ] Настроить Rank Math wizard полностью
**Сейчас:** базовые настройки (organization schema, strip category)
**Что дотюнить:** meta-templates для review/comparison/guide, sitemap.xml, breadcrumbs

---

## 📅 P2 — месяц

### Миграция 4beg.ru

#### [ ] Перенос 4beg.ru на наш сервер
**Процесс (после получения доступов из P0):**
1. Экспорт БД + uploads из Timeweb
2. Создать контейнер wp-4beg через provision-site.sh (preset: 4beg.env)
3. Import БД + uploads в новый контейнер
4. Сменить DNS → 5.129.245.98 (Traefik выпустит SSL)
5. Добавить в SCC как отдельный `site`
6. Применить polish-site.sh (E-E-A-T страницы, Cyr-to-Lat)
7. Проверка всех URL (редиректы если нужны)

#### [ ] Стратегия рубрики "Беговые кроссовки"
**Файл:** `docs/strategies/running-shoes.md`
**Когда:** после миграции (увидим существующий контент)
**Включить:** Nike/Adidas/Asics/Saucony/Salomon линейки, персоны (новички/марафонцы/трейл), контент-план на 12 мес, партнёрки RU (Ozon, Wildberries, Lamoda)

#### [ ] Refresh топ-20 статей 4beg
**Зачем:** контент 2024 устарел для 2026
**Что:** AI-обновление цен, добавление моделей 2025-2026, рефактор под supreme principle

### SCC — автоматизация

#### [ ] GA4 / GSC Service Account setup
**Нужно:** JSON ключ Service Account, доступ к property + GSC
**Даёт:** реальные метрики в Daily Brief, revenue-аналитику, автосинк каждый день

#### [ ] AI API keys в .env SCC
**Варианты:** `OPENROUTER_API_KEY` (дешевле) или `ANTHROPIC_API_KEY`
**Даёт:** работающий generate-brief, Daily Brief idea, AI-команды в панели

#### [ ] Первый реальный обзор через AI конвейер
**После ключей:** взять первый pun из content_plan (De'Longhi Magnifica S), нажать AI-бриф → отредактировать → сгенерить черновик → опубликовать в WP через sync

---

## 🌟 P3 — квартал / сезон

### Claude Design артефакты

#### [ ] Quiz "Подбор кофемашины"
**Формат:** React-артефакт через claude.ai → WP-плагин
**6 вопросов:** бюджет, чашек/день, молоко, место, простота, эспрессо/американо
**Результат:** 2-3 рекомендации с ссылками на наши обзоры + партнёрку

#### [ ] Quiz "Подбор робота-пылесоса"
Аналогично, под рубрику Уборка

#### [ ] SVG-иконки категорий popolkam
**Заменить:** emoji ☕🧹🍲❄️👕 на кастомные SVG
**Плюс:** бренд-консистентность, скорость загрузки

### SCC — monetization tooling

#### [ ] Offer Health Monitor (cron)
**Что:** таблица `offers(site_id, url, status, last_check)`, ежедневный пинг URL, алерт на 404/disabled
**Supreme:** не даём пользователю битые ссылки

#### [ ] Price Staleness Detector
**Что:** сравнение цен в текстах vs Content Egg, флаг >10% расхождения
**Supreme:** актуальные цены у юзера

#### [ ] Weekly Monetization Report
**Что:** эндпоинт `/api/ai/monetization-audit`, топ-10 underperforming, network arbitrage, CTA предложения

### popolkam — контент

#### [ ] Phase 1 публикации (9 статей по стратегии coffee-machines.md)
**Blocked by:** AI ключи + возможно часть обзоров требует личный опыт / фото

#### [ ] Phase 1 публикации пылесосы (8 статей по vacuum-robots.md)
**После:** первых 9 кофе-статей

### 4beg.ru — после миграции

#### [ ] Калькулятор подбора кроссовок по типу пронации
**Уникально:** учёт супинации, беговой дистанции, веса

#### [ ] Quiz "Подбор кроссовок"
После изучения существующего контента

---

## 📚 Документы, на которые ссылаемся

- **Supreme principle** (память) — всё для пользователя
- [`docs/scaling-checklist.md`](scaling-checklist.md) — чек-лист запуска нового сайта (Фаза 1-3)
- [`docs/gamification.md`](gamification.md) — user guide к Live Portfolio Value виджету
- [`docs/strategies/coffee-machines.md`](strategies/coffee-machines.md) — стратегия кофемашин
- [`docs/strategies/vacuum-robots.md`](strategies/vacuum-robots.md) — стратегия пылесосов
- `docs/strategies/cleaning.md` — **создать** для aykakchisto (P0)
- `docs/strategies/running-shoes.md` — **создать после миграции 4beg**
- [`server/scripts/wp-provision/`](../server/scripts/wp-provision/) — provisioning scripts
- [`docs/legacy-spec/`](legacy-spec/) — архив старых спек (GAMIFICATION.md, AGENTS.md и др.)

---

## 🎯 Что делаем в ближайшую сессию

**Очерёдность (рекомендация):**

1. **Лицензии aykakchisto → платные плагины → ReCompare preset** (P0, главный unblock)
2. **Контент-стратегия aykakchisto** → `docs/strategies/cleaning.md` (P0)
3. **Docker DNS fix** (P2 infra — 30 сек работы + 1 мин простоя) — пока у нас хотфикс через extra_hosts
4. **Expected Value UX везде** (P0-02) — Daily Brief / Plan / Offer Health
5. **Продлить 4beg.ru домен** — deadline 2026-07-04

**Параллельно (когда есть слоты):**
- Stage C идеи из legacy spec: Circuit Breaker / Budget Control для агентов (P1)
- AI model picker per-agent — экономия 50-80% на Haiku (P1)
- Site Health summary card (P1 — моя идея)
- Gamification Phase B — editable impact config (P2)
- Prompt caching в claude.js (P1 — −50-80% AI costs)

**Не срочное:**
- IPv6 infra (P2, отдельная сессия с rescue console fallback)
- Audit Log + Activity Feed (P1)
- Schedule Builder UI, Per-site overrides, Cannibalization Detector, Sale Preparation Checklist (P2 — см. Stage C)

---

## 🎨 Принципы выбора что делать следующим

1. **Что блокирует больше всего?** Это P0
2. **Что даёт самый большой эффект на пользователя?** Priority
3. **Что быстро закрывается без зависимостей?** Quick win — делаем параллельно
4. **Supreme principle applies** — если задача ведёт к ангажированности, ставим красный флажок

---

## 🔄 История решений

- **2026-04-17** — формулирован supreme principle ("всё для пользователя")
- **2026-04-17** — 4beg.ru добавлен в портфель (ожидает доступов для миграции)
- **2026-04-17** — ReCompare выбран как REHub preset для popolkam
- **2026-04-17** — popolkam развёрнут + полирован + стратегия coffee/vacuum в файлах
- **2026-04-17** — SCC: Daily Brief + AI-бриф endpoint реализованы
- **2026-04-17** — favicon SCC + logo/favicon popolkam загружены
- **2026-04-18** — Расширены supreme principles: итеративность + планка лидеров + монетизация как топливо + быстрый подбор
- **2026-04-18** — Content Freshness Agent спроектирован (spec в памяти), добавлен в P1
- **2026-04-18 (Stage C, день 1)** — P0-01 / P0-03 / P0-04 закрыты. Изучена legacy spec из `Downloads/files (1)/` — отобраны 7 идей и добавлены в backlog как Stage C. Добавлены 5 собственных идей. Двухуровневая penalty в site-valuation. popolkam впервые синкнут в БД SCC.
- **2026-04-18 (вечер)** — Gamification Phase A (Live Portfolio Value + toast'ы + Settings toggle). Blog «что сделано» как виджет в Dashboard. `docs/scaling-checklist.md` собран по итогам сессии. **Третий сайт aykakchisto.ru провижен** (WP + бесплатная часть стека + E-E-A-T + Let's Encrypt + SCC) — ждёт докупки REHub/Content Egg/WPAI Pro. Собраны 2 инфра-задачи в backlog P2: Docker daemon DNS, IPv6 на сервере.
