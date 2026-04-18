# Backlog — единый список всех открытых задач

> **Статус:** живой документ. Обновляется после каждой значимой встречи/сессии.
> **Последнее обновление:** 2026-04-18
>
> **Priority levels:**
> - P0 — срочно (горит или блокирует много чего)
> - P1 — ближайшие 1-2 недели
> - P2 — месяц
> - P3 — квартал / когда будет слот

---

## ✅ Сделано в сессии 2026-04-18 (Stage C, день 1)

- **P0-01: Site Valuation калибровка** — `PER_ARTICLE_VALUE` снижены, age × $100 (cap $800) + bonus $200 за «возраст × наполненность», momentum cap $500. Penalty за нет-revenue **двухуровневая**: −40% для «зомби» (нет momentum), −20% для активных. Прод: portfolio $7,496 (popolkam $660, 4beg $6,836). [commits 72fd153, 26355bc]
- **P0-03: OpenRouter credits в Settings UI** — endpoint `GET /api/ai/credits`, карточка с прогресс-баром (зелёный/жёлтый/красный) и текстовой рекомендацией. На проде показывает $4.93/$5.00. [commit e7472ac]
- **P0-04: popolkam meta-fields в ArticleRow** — WP-плагин 1.1.0 регистрирует 6 полей с `show_in_rest=true`; backend PUT /api/articles/:id принимает `body.meta` и пушит в WP; UI — collapsible-секция «🛠 Калькулятор / партнёрка» с 5 inputs, lazy-loaded. End-to-end проверено. [commit f85d1bf]
- **Побочно: popolkam синкнут с WP** — оказалось 0 статей в БД SCC, поэтому zombie-tier penalty сработал. После sync — 2 статьи (это реальное число опубликованных постов на popolkam).

---

## 🔥 P0 — следующим

### [ ] Продлить домен 4beg.ru
**Дедлайн:** до 2026-07-04 (осталось ~2.5 мес)
**Риск:** потеряем 10-летний домен с трафиком
**Действие:** продлить на год+ в Timeweb/любом registrar

### [ ] Собрать доступы к 4beg.ru
**Блокирует:** миграцию, подключение к SCC
**Нужно:**
- Логин/пароль админки `4beg.ru/wp-admin/`
- SSH/FTP к Timeweb (для экспорта БД + uploads)
- Доступ к GA4 + Search Console (email, который там зарегистрирован)
- Список активных партнёрских аккаунтов (если есть)

### [ ] **P0-02: Expected Value UX везде** — применить principle
**Где:**
- Daily Brief Quick Win — переформулировать в «сделай X → +$Y»
- Plan items — показывать +$N к капитализации при создании обзора
- Offer Health алерты — «Заменить битую → +$N/мес EPC»
- Content Freshness алерты — «Refresh → возврат $N»

**Принцип:** `memory/feedback_expected_value_ux.md`

### [ ] **Доразобраться с popolkam недотягом до таргета**
После калибровки popolkam = $660 (таргет был $800-1500). Сейчас 2 статьи в БД. Возможно после публикации Phase 1 (9 статей) попадём в таргет естественно. **Решить:** оставить, или дополнительно подкрутить формулу под текущие 2 статьи.

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
- `docs/strategies/coffee-machines.md` — полная стратегия кофемашин
- `docs/strategies/vacuum-robots.md` — полная стратегия роботов-пылесосов
- `docs/strategies/running-shoes.md` — **создать после миграции 4beg**
- `server/scripts/wp-provision/` — provisioning scripts для новых сайтов

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
- **2026-04-18 (Stage C, день 1)** — P0-01 / P0-03 / P0-04 закрыты. Изучена legacy spec из `Downloads/files (1)/` — отобраны 7 идей и добавлены в backlog как Stage C. Добавлены 5 собственных идей (Site Health card, Audit Log, AI commentary, Cross-site benchmark, Onboarding Wizard). Двухуровневая penalty в site-valuation. popolkam впервые синкнут в БД SCC (был 0 статей).
