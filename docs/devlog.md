# SCC Devlog

> Хронология важных изменений, решений и внедрений.
> Каждая значимая итерация оставляет запись здесь.
> Формат: `date → Added / Decided / Learned / Known issues`.
>
> Коммиты см. в git log — здесь фиксируем что сделано и ПОЧЕМУ.

---

## 2026-04-18 — часть 4 · Stage C день 1 (калибровка + интеграции + геймификация Phase A)

### ✅ Added
- **P0-01 Site Valuation калибровка** — `PER_ARTICLE_VALUE` снижены (review 40→15, comparison 60→25, guide 35→10, quiz 70→30, tool 80→40, default 30→10), domain age ×$300 max $3000 → ×$100 max $800, momentum cap $800→$500. Methodology bumped to `v2.1_calibrated_2026-04-18`.
- **Двухуровневая penalty** для asset-mode без revenue: −40% если сайт «zombie» (0 updates за 30 дн), −20% если активен. Раньше была единая −50% — популиruted активные сайты как покинутые.
- **P0-03 OpenRouter credits в Settings UI** — `openRouterCredits()` в claude.js, `GET /api/ai/credits`, новая Card «AI-бюджет (OpenRouter)» с прогресс-баром. На момент коммита: $4.93/$5.00.
- **P0-04 popolkam meta-fields end-to-end** — WP plugin `popolkam-calculators` bumped 1.0.0 → 1.1.0, добавлен `register_post_meta()` для 6 полей (`popolkam_machine_*`, `popolkam_buy_*`, `popolkam_tco_skip`) с `show_in_rest=true`. Backend `PUT /api/articles/:id` принимает `body.meta` и пушит в WP. UI `ArticleRow` — collapsible «🛠 Калькулятор / партнёрка» с 5 inputs, lazy-load через `GET /api/articles/:id/meta`.
- **Gamification Phase A — Live Portfolio Value**
  - `user_prefs` key/value table для toggle'ов и будущих настроек
  - `GET /api/portfolio/valuation` — сумма последних site_valuations + delta 24h/30d + цель + прогресс %
  - `PortfolioWidget` в шапке Layout: «💎 $X · +$Y/24h · progress bar» с 👁 toggle (backend всегда считает, скрытие только UI)
  - Settings → новая карточка «🎮 Гамификация» с 3 toggle (портфель / toasts / impact config [заглушка Phase B])
  - Dashboard: `updArt`/`addArt` добавляют суффикс «💎 +$N» в toast если включено (review $15, comparison $25, guide $10 — из `src/utils/impact.js`)
  - **Delta windows**: baseline 24h берётся из окна [-3д, -1д]; 30d из [-45д, -30д]. Фильтрация по `methodology` — чтобы после рекалибровки формулы не показывать «−$15k за сутки»
- **Legacy spec архив** в `docs/legacy-spec/` (6 файлов из `Downloads/files (1)/` + `GAMIFICATION.md` отдельно). Используем как справочник, не как действующую спецификацию.

### 🧠 Decided
- **Methodology versioning для Site Valuation** — при каждой калибровке формулы бампаем суффикс (сейчас `v2.1_calibrated_2026-04-18`). Это позволяет портфельному виджету не сравнивать post-calibration значения с pre-calibration.
- **Гамификация — заниженные реалистичные цифры, не «motivational»** — review $15 равно тому что реально добавляет формула, а не $35-50 как в спеке. Принцип: цифра должна быть правдой, иначе это анти-мотивация после первого же сравнения с реальностью.
- **Phased rollout gamification** (Phase A-E в backlog.md) — сейчас только Phase A (Live cap + toasts). XP/levels/achievements/rings/AI coach — потом, когда оператор запросит.
- **Toggle-hide ≠ disable** — backend всегда считает. Пользователь прячет UI когда не хочет видеть цифры, но при возвращении видит актуальное состояние.

### 🧠 Learned
- **popolkam.ru имел 0 статей в SCC БД** — sync-all никогда не запускался с момента подключения. «Zombie-tier» penalty срабатывал из-за пустой `articles` таблицы (не из-за реальной пустоты сайта). После sync — 2 статьи, penalty −20% вместо −40%, валуация $660 → $2,104.
- **WP REST не возвращает custom post meta без `register_post_meta` + `show_in_rest=true`** — даже если meta есть в БД. Фикс — в плагине.
- **Docker compose recreate race** — при повторном `up -d --build` иногда остаётся orphan контейнер `/xxx_scc`. Лечится через `docker compose down` перед up. Замечено трижды за сессию.
- **Python на Windows (cp1251)** падает на юникод-символах `Δ` при `print`. Используем латиницу `delta` в скриптах для curl-проверок.

### ⚠️ Known issues
- **popolkam overshoot** — $2,104 чуть выше target band $800-1500. Пока оставляем; решим после Phase 1 публикаций (9 обзоров) когда будет осмысленно сверять.
- **Delta24h/30d пока $0** — после рекалибровки сегодня нет baseline с той же methodology. Заполнится натурально когда site_valuation агент запустится завтра и послезавтра.
- **Плагин popolkam-calculators 1.1.0 скопирован только в wp-popolkam контейнер** — не в `wp-content/plugins/popolkam-calculators/.git`. Если WP обновит плагин через UI — затрёт. Нужен post-deploy hook или CI/CD для WP-плагинов (в P2 backlog).

---

## 2026-04-18 — часть 3 (ночь) · закрытие ветки чата

### ✅ Added
- **Site Valuation v2** — двухрежимная модель (asset-based ↔ hybrid ↔ revenue-based) с детальными adjustments. Каждый фактор имеет `impact_usd`, `actionable_hint`, `reason`.
- **ValuationPanel** на SiteDetail (новая вкладка 💰 Капитализация) — текущая оценка с диапазоном + line chart динамики + список факторов с цветовыми маркерами (🟢/🟡/🔴) и конкретными действиями для роста
- **Endpoint `/api/sites/:id/valuations`** — история для графика
- **Soft ALTER migrations** — новые колонки добавляются автоматом при startup (domain_registered_at, adjustments_json, mode, phase, rubric, tokens_used, cost_usd)
- Domain registration dates захардкожены: popolkam 2009-01-03 (17 лет), 4beg 2016-07-04 (10 лет)
- Первые оценки получены: popolkam=$3300, 4beg=$19360 (asset-based) — **завышены**, требуют калибровки

### 🧠 Decided
- **Expected Value UX как product principle** — каждое действие показывает $-эффект («Refresh → +$150», «+1 обзор → +$60»). Зафиксировано в `memory/feedback_expected_value_ux.md`. Применяем везде где применимо.
- **Site Valuation two-mode:** asset-based для новых сайтов (0-$50 profit), hybrid ($50-$500), revenue × multiple (от $500). Переключается автоматически по avg_monthly_profit.
- **Валюация сейчас завышена** — нужна калибровка (задача №1 в следующей сессии). Снизить per-article value в asset-mode (review: 40→15), cap domain_age с $3000 до $800, добавить penalty "нет revenue".

### 🧠 Learned
- **OpenRouter credits check** — GET `https://openrouter.ai/api/v1/credits` с Bearer ключом возвращает `{total_credits, total_usage}`. Текущий баланс: $4.94 из $5 (потрачено 6 центов за всю разработку).
- **529 overloaded_error** — периодически случается у Anthropic/Claude API. Retry восстанавливает. Ни одна задача не потеряна при текущей сессии (проверено git log + prod API).

### ⚠️ Known issues / TODO первой очереди
- **Валюация завышена** — корректировать формулу (review value, cap age, penalty за нет revenue)
- **Expected Value UX не применён везде** — только в ValuationPanel. Добавить в Daily Brief Quick Win, Plan items, Offer Health, Content Freshness
- **OpenRouter credits не показаны в SCC** — эндпоинт есть, UI нет (добавить на Settings или Dashboard)
- **Meta-fields popolkam_machine_\* в ArticleRow** — чтобы заполнять из SCC без wp-cli (для TCO-калькулятора)
- **4beg миграция** — ждёт доступов SSH + продления домена (истекает 2026-07-04)

## 2026-04-18 — часть 2 (вечер)

### ✅ Added
- **docs/business-model.md §11** — Longevity & Adaptation раздел: горизонты уверенности (5/10/20 лет), основные угрозы + ответы, механизмы адаптации, pivot paths, ежеквартальный self-review
- **docs/migration-plan.md** — полный runbook миграции на новый сервер (<2 часа downtime) + disaster recovery
- **docs/devlog.md + docs/README.md** — новая документационная дисциплина: каждая итерация → запись в devlog, docs/ единое место для решений
- **memory: feedback_documentation_discipline.md** — правило write-through после каждой итерации

### 🧠 Decided
- **Managed Services (Слой E)** добавлен в монетизационную модель — 3 подмодели: done-for-you (revenue share / fixed), coaching ($200-500/мес), portfolio acquisition (покупаем-прокачиваем-продаём). popolkam + 4beg = наш собственный Portfolio Acquisition case.
- **Текущий сервер 5.129.245.98 — временный.** Держим план миграции актуальным, сверяем раз в месяц.
- **Документация = блог + справочник** — не ради себя, а для: повторного входа, передачи, продажи, AI-ассистента в новом чате.

## 2026-04-18 — часть 1 (день)

### ✅ Added
- **Agents Panel расширен** — 4 новых агента (analytics_review, site_valuation, expense_tracker, idea_of_day). Все с метаданными `scope` (portfolio / site) и `readiness` (active / mvp / placeholder). UI показывает бейджи и TODO-список.
- **Article Revisions MVP** — таблица `article_revisions`, timeline в модалке с цветовой индикацией свежести (🟢 <30д / 🟡 1-6м / 🟠 6-12м / 🔴 >12м). Логгеры подключены в основные операции: manual edit, WP sync pull/push, AI-бриф, bulk import.
- **Dashboard: пагинация + поиск + 3 фильтра (статус / тип / свежесть) + scroll-to-top** — важно для 4beg с 366 статьями.
- **Content Plan Progress** — эндпоинт `/api/sites/:id/progress` + компонент ContentPlanProgress с прогресс-барами по рубрикам и фазам. Добавлены поля `phase` + `rubric` в content_plan.
- **Top-10 кофемашин 2026** — pillar-статья на popolkam с 10 встроенными TCO-калькуляторами (по одному на модель).
- **TCO-калькулятор кофемашин** — WP-плагин `popolkam-calculators` с shortcode, post_meta fallback, и авто-вставкой в обзоры категории Кофемашины.
- **4beg.ru подключён к SCC** — 366 постов синхронизировано (после фикса пагинации sync-all).
- **Стратегии рубрик** в `docs/strategies/` — coffee-machines.md и vacuum-robots.md (живые документы).
- **docs/agents.md** — живой реестр всех агентов с scope, readiness, TODO, стоимостью.
- **docs/business-model.md** — product vision: solo → SaaS с bring-your-own AI и Managed Services слоем.

### 🧠 Decided
- **Supreme principle expanded** до 5 правил: всё для пользователя + итеративность + планка лидеров + монетизация как топливо + быстрый подбор (quiz/calc > long read).
- **Managed Services как отдельный monetization слой** (E) — done-for-you, coaching, portfolio acquisition. popolkam + 4beg уже сейчас = наш собственный Portfolio Acquisition case.
- **AI Provider abstraction — на будущее** — код не зашиваем в Anthropic, в TODO: интерфейс `services/ai/providers/` с поддержкой Anthropic, OpenRouter, OpenAI, **Ollama**, **LM Studio**, **любой OpenAI-compatible endpoint** (local LLM через Cloudflare Tunnel / Tailscale).
- **Per-site overrides = Stage B** — в Stage A все агенты используют глобальный конфиг, site-scope агенты итерируются внутри по active сайтам.
- **«Честный калькулятор» — УТП рубрики кофемашин** — мы единственные учитываем фирменные расходники (декальцинатор Jura vs универсальный Eco-Decalk и т.д.).
- **Не делаем auth/multi-user сейчас**, но ни одно архитектурное решение не должно закрыть этот путь (workspace_id в новых таблицах — just in case).

### 🧠 Principles formalized
- Документация структурирована: `docs/business-model.md` (видение), `docs/agents.md` (реестр), `docs/strategies/*.md` (контент), `docs/backlog.md` (план), `docs/devlog.md` (ретроспектива), `memory/*.md` (кэш для AI-ассистента).
- Правило: **каждая значимая итерация → запись в devlog**. Это блог и справочник для масштабирования.

### ⚠️ Known issues / TODO
- content_freshness — пока только отчёт, нет записей в content_health
- offer_health — placeholder, реальный пинг ждёт Content Egg интеграции
- site_valuation — работает на базовом multiple, без adjustments (age / trend / concentration)
- Нет UI для `popolkam_machine_*` полей в ArticleRow — надо заполнять через wp-cli post meta
- AI API ключи глобальные (в .env сервера), будущий multi-user требует шифрованного хранения

---

## 2026-04-17

### ✅ Added
- **Daily Brief agent** — Health / Pulse / Idea of the Day / Quick Win карточки на Dashboard
- **AI Brief endpoint** — `POST /api/plan/:id/generate-brief`, работает для всех 9 Phase 1 планов popolkam
- **Agents panel** — `/agents` с 4 стартовыми агентами (metrics_sync, daily_brief, content_freshness, offer_health)
- **popolkam.ru развёрнут** — WordPress 6.9.4 + REHub child (ReCompare preset) + 5 категорий + 5 подкатегорий под Кофемашинами + E-E-A-T страницы
- **SCC favicon** (оригинальный SVG bar-chart) + popolkam SVG логотип
- **wp-provision scripts** — provision-site.sh + polish-site.sh + preset popolkam.env (идемпотентные, параметризованные)

### 🧠 Decided
- **popolkam.ru = category hub для БТ для дома** (не single-niche, не «сайт про всё»). Модель Wirecutter/Rtings.
- **Одна главная popolkam + категории-поддиректории** (не отдельные сайты под ниши). Маленький single-domain trust копится быстрее, чем 5 доменов с нуля.
- **Ай как чисто (lifestyle) = отдельный домен** — catalog vs blog-voice разные форматы, ломают SEO-сигнал.
- **4beg.ru** — добавлен в портфель (обзоры беговых кроссовок, 343 поста, 10-летний чистый домен), миграция отложена до получения доступов.
- **REHub ReCompare preset** (не ReCart/ReMart) — подходит для каталога обзоров с comparison-таблицами.
- **Cyr-to-Lat обязательно для RU-сайтов** — транслит кириллических URL.

### ⚠️ Known issues
- popolkam-home имеет двойной H1 (entry-title + блок в контенте) — косметика, не критично
- REHub TGMPA bulk-install падает на WP 6.9+ — плагины ставить по одному

---

## Правила формата

- **Added** — что реализовано за день (новая функциональность / агент / сайт / документ)
- **Decided** — архитектурные/продуктовые решения с кратким обоснованием
- **Learned** — что узнали, проверили (полезно для будущих решений)
- **Known issues** — баги/долги которые осознаём, но не правим сейчас

Каждая запись — 1-2 предложения. Длинные разборы → в тематические документы (business-model.md, agents.md, strategies).

Ссылки на коммиты не дублируем — они в git log.
