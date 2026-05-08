# aykakchisto.ru — pipeline «как у popolkam»

> **Цель:** воспроизвести visual + SEO красоту popolkam.ru на aykakchisto.ru. Все ассеты (SVG) уже залиты в media из 3-day design sprint.
> **Ожидаемое время:** 2-3 часа моих, минимум твоих кликов.
> **Дата:** план на 2026-05-09 (или ближайшую свободную сессию).

---

## Что уже готово (Day 2 sprint, media id указаны)

| Файл | Media ID | Использовать для |
|---|---|---|
| `darya-avatar.svg` | 43 | замена 👤 в "Кто пишет" + author byline |
| `drop-mascot.svg` | 44 | sticky CTA в sidebar (как ПО-3000 у popolkam) |
| `hero-workspace.svg` | 45 | split hero на homepage |
| `hero-methodology.svg` | 46 | /kak-my-testiruem/ |
| `hero-transparency.svg` | 47 | /partnerskie-ssylki/ |
| `hero-author.svg` | 48 | /o-avtore/ |
| `og-homepage.svg` | 49 | OG для homepage |
| `og-author.svg` | 50 | OG для /o-avtore/ |
| `og-methodology.svg` | 51 | OG для /kak-my-testiruem/ |

**Brand:** navy #1E3A5F + copper #E8A04C + paper #F4F6F8
**Persona:** Дарья Метёлкина (40, химфак МГУ, 16 лет лаборатории) — `docs/personas/aykakchisto-darya-metyolkina.md`
**Mascot:** Дроп (антропоморфная капля воды) — `docs/personas/aykakchisto-drop.md`

---

## Pipeline (повторяем popolkam steps)

### Шаг 1 — REHub Theme Options + plugins (если ещё не сделано)

> **Контекст:** aykakchisto в SCC `status=setup`. REHub theme + Theme Options могут быть не настроены. Проверить состояние и применить наш staging pipeline если нужно.

- [ ] Проверить `curl -s https://aykakchisto.ru/ | grep -oE 'wp-theme-[a-z-]+'`
  - Если `wp-theme-rehub-blankchild` — Theme Options есть, идём дальше
  - Если что-то другое (twentytwentyfive и т.д.) — REHub не активен, надо ставить (см. P0 в backlog: REHub theme + Content Egg licenses нужны)
- [ ] Если REHub есть но options пустые — **скопировать с popolkam staging artifacts**:
  - `rehub-options.json` уже есть в `deploy/popolkam-staging/exports/` — рефакторнуть colors с #f97316 на #1E3A5F и применить
  - Customizer.dat можно собрать ручкой через тот же `apply-to-prod.php` адаптированный

### Шаг 2 — Logo + favicon

- [ ] Установить `darya-avatar.svg` (используем как logo пока нет отдельного aykakchisto-logo SVG — или сделать отдельный logo-mark по аналогии 4beg)
- [ ] Set `rehub_option.rehub_logo` = aykakchisto-logo URL (через PHP eval)
- [ ] Site Icon (favicon) — установить через Customizer

### Шаг 3 — Меню в header

- [ ] Создать «Главное меню» (id?) с пунктами:
  - Главная / Бытовая химия (основная категория) / Как мы тестируем / Об авторе
- [ ] Привязать к `primary-menu` + `top-menu` location
- [ ] Использовать `wp_update_nav_menu_item` через PHP eval (как с popolkam)

### Шаг 4 — Footer (4 колонки + legal links)

- [ ] **4 legal страницы**: создать markdown по аналогии с popolkam:
  - `/politika-konfidentsialnosti/` (152-ФЗ + GDPR — переиспользовать popolkam content + замена названия + перс данных)
  - `/partnerskie-ssylki/` (affiliate disclosure)
  - `/kontakty/` (email darya@aykakchisto.ru)
  - `/kak-my-testiruem/` (методология — другая, химия + 3 цикла)
  - `/o-avtore/` (Дарья canon)
- [ ] Footer menu (`Footer меню` id) — пересобрать с 5 рабочих ссылок
- [ ] `rehub_footer_text` = «© 2026 Aykakchisto.ru — независимые обзоры бытовой химии»
- [ ] Categories widget hide_empty=1
- [ ] Recent posts widget с 5 свежими

### Шаг 5 — Sidebar (3 REHub widgets)

- [ ] **Latest Tabs**: «Свежие обзоры» + «Популярные» (по аналогии popolkam)
- [ ] **Sticky on scroll** — подложить **Дроп mascot** в HTML с CTA «Какое средство для вас?»
- [ ] **Better Menu**: категории через nav_menu

### Шаг 6 — Homepage v2 single-focus

- [ ] Создать homepage Gutenberg-content по образцу popolkam-homepage v2:
  - Hero split-layout: H2 «Чище без нервов и без вреда» + 2 CTA (left) + `hero-workspace.svg` (right)
  - 3 принципа (тестируем 3 цикла / pH-замеры / прозрачно про деньги)
  - «Свежее на сайте» dark-секция
  - «Кто пишет» mini-card → /о-авторе/ с `darya-avatar.svg`
- [ ] Page title: «Что почистить — без нервов и без вреда | Aykakchisto»

### Шаг 7 — Cookie banner

- [ ] Скопировать `wp-plugins/popolkam-cookie-banner/` → переименовать → адаптировать колорсхему (navy + copper) → задеплоить

### Шаг 8 — Featured images for posts

- [ ] Создать `set-featured-images-aykakchisto.js` по аналогии с popolkam
- [ ] Прогнать на existing posts (если есть) — Unsplash query «cleaning supplies» / «laundry» / «chemistry lab»

### Шаг 9 — OG meta mu-plugin

- [ ] Скопировать `wp-plugins/popolkam-og-meta/` → `aykakchisto-og-meta`
  - Изменить page-ID mapping → SVG URLs
  - Default OG: `og-homepage.svg`
- [ ] Деплой как mu-plugin через docker exec

### Шаг 10 — Smoke test

- [ ] Открыть [aykakchisto.ru](https://aykakchisto.ru) — header / hero / sidebar / footer
- [ ] Inkogno — увидеть cookie banner
- [ ] Поделиться ссылкой в Telegram → должна появиться preview с navy/copper SVG
- [ ] Проверить мобайл (DevTools 360px)

---

## Что нужно от тебя ДО запуска

1. **Подтвердить что aykakchisto.ru REHub theme установлен** (через wp-admin → Appearance)
   - Если нет — нужны лицензии REHub + Content Egg + WPAI Pro (есть в `manual-tasks.md` как P0)
2. **Email** `darya@aykakchisto.ru` — настроить через Yandex 360 (для author E-E-A-T)
3. **Юрлицо** — у тебя ИП / самозанятый / ООО? — для замены в /политика-конфиденциальности/

Если 1 не готово — pipeline блокируется на REHub install. Если REHub есть — могу запускать сразу, твоего участия не нужно.

---

## Ссылки

- popolkam pipeline reference: `deploy/popolkam-staging/`, `wp-plugins/popolkam-cookie-banner/`, `wp-plugins/popolkam-og-meta/`
- Aykakchisto persona/brand: `docs/personas/aykakchisto-*`, `docs/brand/aykakchisto/`
- Day 2 sprint summary: блог-пост `blog_2026-05-08_d0ba6b` в SCC dashboard

---

*Owner: Денис · Last updated: 2026-05-08*
