# SCC Devlog

> Хронология важных изменений, решений и внедрений.
> Каждая значимая итерация оставляет запись здесь.
> Формат: `date → Added / Decided / Learned / Known issues`.
>
> Коммиты см. в git log — здесь фиксируем что сделано и ПОЧЕМУ.

---

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
