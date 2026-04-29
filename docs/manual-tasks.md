# Manual tasks — что нужно сделать руками

> **Назначение:** единый список задач, которые требуют ручной работы пользователя (логины в админки, покупки лицензий, AI-артефакты в claude.ai, работа с DNS/почтой). Всё, что **не может сделать Claude Code** из текущего сетапа.
> **Не дублирует `backlog.md`** — там общий список всех задач с приоритетами. Здесь только **manual hand-work**.
> **Статус:** v1 — 2026-04-18
> **Проверять:** раз в сессию, отмечать выполненное.

---

## 🔴 P0 — блокирующие (делать первыми)

### Лицензии / покупки (aykakchisto блокер)

- [ ] **REHub theme** (~$59, ThemeForest)
  - После покупки: Purchase Code из ThemeForest → wp-admin aykakchisto → Appearance → Upload Theme → активировать → Registration tab → ввести код
  - Плагины REHub ставить **по одному** (bulk-TGMPA падает на WP 6.9+)
- [ ] **Content Egg Pro** (~$59, CodeCanyon)
  - Upload Plugin → активировать → API keys: Admitad / Я.Маркет / Ozon (те же что на popolkam)
- [ ] **WP All Import Pro + 3 addon** (~$199, wpallimport.com)
  - Upload Plugin × 4 → активировать лицензию
- [ ] **envato-market** (бесплатный, но только через envato.com) — для auto-updates купленного

### popolkam.ru — перенос контента в WordPress

> **Есть готовые templates** в `docs/templates/` — копипаст-ready Gutenberg + REHub shortcodes.

- [ ] **Homepage** — по `docs/templates/popolkam-homepage-blueprint.md`
  - 6 блоков: hero → latest reviews → pillar/comparison → 3 price-tier → об авторе → popular
- [ ] **Category `/kofemashiny/`** — по `docs/templates/popolkam-kofemashiny-category-blueprint.md`
  - 7 блоков: breadcrumbs+H1 → intro Дмитрия → 3 tier cards → pillar+quiz → archive → FAQ → author card
- [ ] **4 обзора** — контент в `content/popolkam/reviews/`:
  - [ ] De'Longhi Magnifica S ECAM22.110 (`obzor-delonghi-magnifica-s-ecam22-110.md`)
  - [ ] Philips 3200 LatteGo EP3241 (`obzor-philips-3200-lattego-ep3241.md`)
  - [ ] Saeco PicoBaristo Deluxe SM5572 (`obzor-saeco-picobaristo-deluxe-sm5572.md`)
  - [ ] Jura E8 (`obzor-jura-e8.md`)
- [ ] **Сравнение** — `content/popolkam/comparisons/delonghi-magnifica-s-vs-philips-3200-lattego.md`
- [ ] **Страница `/o-avtore/`** — `content/popolkam/pages/o-avtore.md`
  - + Schema.org Person по `docs/templates/schema-person.md`

### aykakchisto.ru — перенос контента

- [ ] **Страница `/o-avtore/`** — `content/aykakchisto/pages/o-avtore.md`
  - + Schema.org Person (Дарья Метёлкина) по `docs/templates/schema-person.md`

### popolkam.ru — восстановление REHub-look через staging pipeline

> **Контекст:** popolkam сейчас выглядит как голая стандартная тема — REHub theme + child установлены, но Theme Options + widgets + Customizer не настроены, поэтому header «разъехался» и архивы голые. См. полный анализ в `deploy/popolkam-staging/README.md`.
>
> **Как работает:** spin-staging.sh поднимает на VPS отдельный staging-WP с REHub → ты делаешь 1 клик в staging-admin (Import Demo Magazine) → скрипт экспортирует Theme Options + widgets + customizer → ты применяешь их к боевому popolkam (3-5 кликов).

#### Шаг 1 — DNS (1 клик в твоём DNS-провайдере)

- [ ] **Добавить A-запись** `popolkam-staging` → IP того же VPS, что cmd.bonaka.app

#### Шаг 2 — staging admin (1 клик после моего ping'a)

- [ ] **Зайти в staging:** https://popolkam-staging.bonaka.app/wp-admin
  - login: `admin` / pass: `stg_admin_a8f3c2b1`
- [ ] **Appearance → Import Demo Data** → выбрать "Magazine" → Import (ждать ~5 мин)
- [ ] **Сообщить мне «готово»** — я запускаю export-rehub.sh, кладу артефакты на твой Dropbox/SCC

#### Шаг 3 — popolkam.ru (3 артефакта × ~2 клика = 6 кликов)

Все 3 файла лежат локально в `deploy/popolkam-staging/exports/`:
- `rehub-options.json` (12 КБ) — **главный**: REHub Theme Options + design selector + wizard. Уже отребрендирован: цвет magenta → наш `#f97316`, URL staging → popolkam.ru
- `customizer.dat` (3 КБ) — Customizer mods (theme_mods)
- `widgets.wie` (1.2 КБ) — sidebars (минимальные generic-блоки, REHub демо почти не использует виджеты)

**Шаг 3.1: Загрузка REHub Options (главное, делать первым)**

- [ ] **Plugins → Add New → Upload Plugin** → загрузить `wp-plugins/rehub-options-importer.zip` → Активировать
- [ ] **Tools → REHub Options Importer** → выбрать файл `rehub-options.json` → «Импортировать»
- [ ] **Зайти в REHub → Theme Options** — убедиться что цвет `#f97316`, archive_layout=communitylist, остальное на месте
- [ ] *(опционально)* После проверки: Plugins → деактивировать и удалить REHub Options Importer

**Шаг 3.2: Customizer mods**

- [ ] **Plugins → Add New** → найти «Customizer Export/Import» → Установить + Активировать
- [ ] **Appearance → Customize** → секция «Export/Import» внизу → Import → выбрать `customizer.dat` → Apply

**Шаг 3.3: Widgets (опционально — почти ничего не даст, в demo widgets были голые)**

- [ ] **Plugins → Add New** → найти «Widget Importer & Exporter» → Установить + Активировать
- [ ] **Tools → Widget Importer & Exporter** → Import Widgets → выбрать `widgets.wie`

#### Шаг 4 — после применения (опционально, 2-3 клика)

- [ ] **Customizer → Site Identity:** проверить что логотип не сбросился (если сбросился — загрузить заново)
- [ ] **Customizer → Colors:** убедиться что primary остался `#f97316` (наш брендовый)
- [ ] **Settings → Reading → Front page displays:** убедиться что выбрана наша главная (page-id=24), не demo

#### Шаг 5 — снос staging (1 команда)

После того как popolkam ОК — staging больше не нужен:
```
ssh root@cmd.bonaka.app 'cd /opt/popolkam-staging && docker compose down -v'
```
- [ ] **Удалить A-запись** `popolkam-staging` из DNS

---

### 4beg.ru — псевдоним-редактор Phase 0 (перед первой статьёй из P0 плана)

> **Контекст:** в content_plan залиты 20 P0 идей (см. `docs/strategies/running-shoes.md`). Перед публикацией первой статьи под Артёмом Спиридоновым нужна минимальная E-E-A-T инфра. См. полный canon в `docs/personas/4beg-artem-spiridonov.md §4`.

- [ ] **Email `artem@4beg.ru`** — через хостинг 4beg (Timeweb / Yandex 360)
- [ ] **Страница `/o-avtore/`** — pseudonym disclosure (готовая формулировка в `docs/personas/4beg-artem-spiridonov.md §5`)
- [ ] **Schema.org Person** — в footer / about page с `alternateName`, `email`, `sameAs` по `docs/templates/schema-person.md`
- [ ] **Footer disclaimer** — «Артём Спиридонов — литературный псевдоним редакции 4beg.ru»
- [ ] **Avatar** — спортивная фотография для author page (можно AI-сгенерированная с явным disclaimer)

### Инфра — срочно

- [ ] **Продлить домен 4beg.ru** до 2026-07-04 (осталось ~2.5 мес)
- [ ] **Собрать доступы 4beg.ru** (для миграции):
  - wp-admin логин/пароль
  - SSH/FTP Timeweb
  - GA4 + Search Console email
  - Активные партнёрские аккаунты

---

## 🟡 P1 — ближайшие 1-2 недели

### AI-генерация через claude.ai (artifacts)

- [ ] **Портрет Дмитрия Полкина** — по промпту в `docs/personas/popolkam-dmitri-polkin.md §5.3`
  - Сохранить как `dmitri-polkin-portrait.png` в WP media (`/wp-content/uploads/`)
- [ ] **Портрет Дарьи Метёлкиной** — по промпту в `docs/personas/aykakchisto-darya-metyolkina.md`
  - Сохранить как `darya-metyolkina-portrait.png`
- [ ] **Маскот ПО-3000** (popolkam — робот-помощник)
- [ ] **Маскот Дроп** (aykakchisto)
- [ ] **Popolkam brand visual upgrade** — React-артефакт → WP plugin (обновление визуала сайта)

### Google / Analytics setup

- [ ] **GA4 Service Account JSON** — создать в Google Cloud Console → скачать ключ → добавить в SCC Settings
  - Дать Service Account email доступ к GA4 property (Viewer)
- [ ] **GSC property access** — для того же Service Account email
- [ ] **Проверить GA4 property_id** для popolkam + aykakchisto (в SCC `sites.ga4_property_id`)

### API keys в SCC `.env`

- [ ] **`ANTHROPIC_API_KEY`** или **`OPENROUTER_API_KEY`** (OpenRouter дешевле, уже $4.93/$5 на балансе)
- [ ] **Admitad** — партнёр ID + SubID для каждого сайта
- [ ] **Яндекс.Маркет** — API key
- [ ] **Ozon** — API key
- [ ] **Bol.com** / **Awin** — когда запустим koffie-expert.nl

### Email setup

- [ ] **dmitri@popolkam.ru** (Yandex 360 или Timeweb mail)
- [ ] **darya@aykakchisto.ru** — аналогично
- [ ] MX-записи настроены на DNS обоих доменов

### Schema.org Person deploy

- [ ] **popolkam.ru** — через Rank Math (вариант A из `docs/templates/schema-person.md`)
  - wp-admin → Rank Math → Edit `/o-avtore/` → Schema → Custom → вставить JSON
- [ ] **aykakchisto.ru** — аналогично
- [ ] **Валидация** через https://search.google.com/test/rich-results для обоих
- [ ] **Organization schema** на `/` главной (отдельный JSON)

### Testing после переноса контента в WP

- [ ] **Google Rich Results Test** — для каждой страницы: review / comparison / category / homepage / o-avtore
- [ ] **Schema duplicate check** — не должно быть 2× Person (Rank Math + custom = penalty)
- [ ] **Mobile Core Web Vitals** (PageSpeed Insights): LCP < 2.5s, CLS < 0.1, INP < 200ms
  - По каждой странице: homepage, /kofemashiny/, 1-2 обзора
- [ ] **Broken links check** — Screaming Frog или в WP admin → Broken Link Checker
- [ ] **Breadcrumbs** — визуально + в Rich Results
- [ ] **OG image** (1200×630) для каждой страницы — Facebook debugger / Twitter card validator

### Telegram (опционально Phase 1)

- [ ] **`@popolkam_review`** канал создать, описание, закреп с `/o-avtore/`
- [ ] **`@aykakchisto_notes`** канал создать
- [ ] Ссылки добавить в footer сайтов + в Schema.org `sameAs`

---

## 🟢 P2 — месяц

### Инфраструктура (SSH работа)

- [ ] **LLM host online** — user side, сервер 2×RTX 3090 48GB VRAM / 96GB RAM
  - Tailscale VPN установка
  - Ollama + Qwen-72B (или через vLLM) для bulk compute
  - Endpoint expose в SCC `.env` → `LOCAL_LLM_URL`
- [ ] **VPS upgrade** 48GB/3.8GB RAM → 120GB/8GB RAM (Timeweb panel)
  - Без этого не влезет Phase 1 (Content Egg Pro + WPAI + 3 сайта)
- [ ] **Docker daemon DNS fix** (30 сек работы + 1 мин простоя)
  - На VPS: `/etc/docker/daemon.json` → `{"dns": ["8.8.8.8", "1.1.1.1"]}`
  - `systemctl restart docker`
  - Удалить `extra_hosts` из `/opt/scc/docker-compose.yml`
- [ ] **IPv6 на 5.129.245.98** (P2, отдельной сессией — рискованно, держать rescue console Timeweb)
  - `/etc/netplan/*.yaml` → IPv6 adress + default route
  - `netplan apply`
  - Вернуть AAAA записи для popolkam / 4beg / cmd.bonaka / aykakchisto

### popolkam.ru — финальные шлифовки

- [ ] **Rank Math wizard полностью** (сейчас базово)
  - Meta-templates для review/comparison/guide
  - sitemap.xml проверка
  - Breadcrumbs полная настройка
- [ ] **Главная визуально на mobile** — проверить что не ломается в REHub стилях
- [ ] **Footer disclaimer** обоих сайтов — малым шрифтом про псевдоним + про партнёрские ссылки
- [ ] **Admitad SubID** — проверить что работает для каждого партнёра

### aykakchisto.ru — после лицензий

- [ ] **ReCompare preset** перенести с popolkam (после активации REHub Registration)
- [ ] **Status → active** в SCC (сейчас setup)
- [ ] **Первые 30 plan-items** создать по `docs/strategies/cleaning.md` (когда стратегия готова)

### 4beg.ru — миграция

- [ ] **Экспорт БД + uploads из Timeweb** (когда доступы собраны)
- [ ] **Contentный аудит** старых статей для refresh 2026

---

## ⚪ Optional / будущие

### Claude.ai artefacts (когда будет слот)

- [ ] **Quiz "Подбор кофемашины"** — React-артефакт → WP plugin (6 вопросов: бюджет / чашек / молоко / место / простота / эспрессо)
- [ ] **Quiz "Подбор робота-пылесоса"** (aykakchisto)
- [ ] **TCO-калькулятор кофемашины** — React-артефакт с эксперт/normal режимами
- [ ] **SVG-иконки категорий popolkam** — заменить emoji ☕🧹🍲❄️👕

### Phase 2 контент

- [ ] **Phase 1 публикации кофе** — 9 обзоров из `docs/strategies/coffee-machines.md` (после того как первые 4 + comparison залиты и работают)
- [ ] **Phase 1 публикации чайники** — после 9 кофе-обзоров
- [ ] **Phase 1 публикации роботы-пылесосы** (aykakchisto)

---

## 📌 Как пользоваться этим файлом

1. **Перед каждой сессией** — глянуть P0 секцию, отметить сделанное галочкой `[x]`
2. **Закрыл задачу** — вычеркнуть или переместить в раздел «Сделано» (внизу)
3. **Новая ручная задача из разговора** — сразу сюда, не в backlog
4. **Правило:** если Claude Code может это сделать сам → это в `backlog.md`, не сюда

---

## ✅ Сделано

*(пустой — добавлять по мере выполнения с датой)*

---

## Связанные документы

- `docs/backlog.md` — общий backlog задач (автоматизируемых + ручных)
- `docs/templates/popolkam-homepage-blueprint.md` — copy-paste блок для homepage
- `docs/templates/popolkam-kofemashiny-category-blueprint.md` — copy-paste для category
- `docs/templates/schema-person.md` — JSON-LD snippets для обоих сайтов
- `docs/templates/rehub-review-template.md` — шаблон single review
- `docs/scaling-checklist.md` — чек-лист запуска нового сайта
