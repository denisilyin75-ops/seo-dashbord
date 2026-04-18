# REHub Zones Map — где что применять

> **Статус:** v1 — 2026-04-18
> **Назначение:** исчерпывающий справочник по тому, какие REHub features использовать в каждой зоне сайта. Дополняет [`rehub-review-template.md`](rehub-review-template.md) (там — только review-статьи).
> **Aудитория:** оператор/редактор, которому нужно понять «что ставить на этой странице».
>
> **REHub version:** 19.9.9.7 (установленная на popolkam)
> **Greenshift:** 12.9.0 (Gutenberg blocks от того же автора)

---

## 0. Hybrid philosophy напоминание

- **Core Gutenberg** — основной текст, заголовки, простые списки и таблицы (portable, AI-generatable)
- **REHub shortcodes/blocks** — ТОЛЬКО где даёт уникальный value: Review schema, Offer boxes, Compare, Pros/Cons, Scorebox, Archive layouts
- **Rank Math** — SEO-schema (Article, FAQPage, Breadcrumbs)
- **Elementor** — НЕ используем для обычных страниц (тяжелее Gutenberg, lock-in). Только если нужен сложный landing — и то подумать

Правило: **не ставим REHub блок без понимания зачем**.

---

## 1. Главная страница (Homepage)

Главная — это витрина бренда и воронка. Она **не** должна быть статичным текстом.

### 1.1 Что показывать

| Блок | Зачем | Tool |
|---|---|---|
| Hero / Banner | Первое впечатление, УТП | REHub Customizer → Header settings **или** Elementor section |
| «Актуальные обзоры» (последние 6) | Свежесть контента для Google + UX | `[wpsm_recent_posts_list count="6" category="kofemashiny"]` |
| «Топ кофемашин 2026» (pillar-teaser) | Ссылка на main guide | Custom Gutenberg columns + ссылка |
| «Подобрать кофемашину» (quiz CTA) | Конверсия в quiz | REHub `[wpsm_promobox]` + `[wpsm_button]` |
| Подборки по сегментам: «до 30k», «до 50k», «премиум» | Разбиение трафика по ценам | `[wpsm_three_col_posts]` с tag-фильтрами |
| «Последние сравнения» | Long-tail SEO | Custom loop через shortcode или Gutenberg Query Loop block |
| «Об авторе — Дмитрий Полкин» (мини-карточка) | E-E-A-T + переход на `/o-avtore/` | Custom HTML block или REHub `[wpsm_member]` |

### 1.2 REHub Homepage templates (если используем)

REHub даёт **готовые homepage layouts** через REHub Customizer:
- **Magazine** — журнальная сетка, подходит для review-сайта
- **Affiliate** — с блоком «Hot deals» сверху (когда у нас будет Content Egg)
- **Blog-style** — простая лента
- **Shop** — для WooCommerce (**не наш случай**)

**Наш выбор:** **Magazine layout** + custom секции между стандартными. REHub Customizer → Frontpage settings.

### 1.3 Что **НЕ** делать на главной

- ❌ Слайдер с 5+ баннерами (CWV страдает, CTR на слайде <3 падает радикально)
- ❌ Огромный hero-видео (weight, LCP)
- ❌ Мега-меню с 50+ ссылками
- ❌ «Свежие деалы» если у нас нет ещё Content Egg — нечего хранить динамически
- ❌ Elementor для всей главной (попробуйте Gutenberg + REHub — обычно хватает)

### 1.4 Чек-лист главной

- [ ] Hero с УТП + CTA «Подобрать кофемашину»
- [ ] Последние 6 обзоров
- [ ] 3 ценовых сегмента как teaser
- [ ] Author block (Дмитрий)
- [ ] Footer с disclaimer pseudonym
- [ ] LCP < 2.5s (проверить после сборки)
- [ ] Schema: Organization schema на `<body>`

---

## 2. Category / Archive pages (рубрики и архивы)

Страницы `/kofemashiny/`, `/chayniki/`, `/blendery/` и архивы тегов.

### 2.1 REHub Archive Layouts

`REHub Customizer → Category Layout` — 15+ вариантов, большинство лишние. Реально полезные:

| Layout | Когда |
|---|---|
| **communitylist** (текущий на popolkam) | Компактный list с thumbnail + title + excerpt. Универсальный, рекомендуется |
| **moduleoffer** | Offer-box style — когда страница про товары с ценами (подходит для /sovety/mashiny/ в будущем) |
| **magazinegrid** | Журнальная сетка 3 колонки — для pillar-категорий с фото-focused content |
| **smalllist** | Ультра-компактный — для /tagi/ архивов или второстепенных категорий |

**Не используем:** gridlarge, shopgrid, grid_loop_mod (избыточные варианты, усложняют maintenance).

### 2.2 Category intro block

На `/kofemashiny/` сверху — text block от Дмитрия на 120-180 слов:

- Краткое описание рубрики (что здесь есть)
- Сигнал экспертности («мы разбираем…»)
- Ссылки на pillar-гайды и топ-comparison

Это через **core Gutenberg** (paragraph + internal links), НЕ через REHub (простой текст).

### 2.3 Category filters

REHub имеет `category_filter_panel` option — отключено по умолчанию, и правильно:
- Для 50-100 постов в рубрике фильтры избыточны
- Нагружают JS
- Лучше — **хорошо структурированные подкатегории** (`/kofemashiny/avtomaticheskie/`, `/kofemashiny/kapsulnye/`)

**Не включаем**, пока не будет 200+ постов в одной рубрике.

### 2.4 Pagination

REHub по умолчанию — numbered pagination. Оставляем (лучше для SEO crawl), не infinite scroll.

### 2.5 Чек-лист category page

- [ ] Intro text 120-180 слов с internal links
- [ ] Layout: communitylist (default)
- [ ] Pagination включена (numbered)
- [ ] Breadcrumbs (Rank Math)
- [ ] Schema: BreadcrumbList + CollectionPage

---

## 3. Single review post — каноническая review-статья

Детально в [`rehub-review-template.md`](rehub-review-template.md). Коротко — ключевые блоки:

| Зона | Блок | Tool |
|---|---|---|
| Title + Hero | H1 + лид 40-60 слов | Core Gutenberg |
| Pros/Cons | Плюсы/минусы с Review schema | `[wpsm_pros]` + `[wpsm_cons]` |
| Блок цен | Цены у 2-4 ретейлеров с CTA | `[wpsm_offer_list]` или набор `[wpsm_offerbox]` |
| ТТХ | Таблица спецификаций | `[wpsm_specification]` |
| Deep dive | Текст, H2/H3, параграфы | Core Gutenberg |
| Personal tip | Выделенный совет от Дмитрия | `[wpsm_box]` |
| Сравнение | Side-by-side таблица | Gutenberg Table **или** `[wpsm_woo_versus]` (если на CPT) |
| FAQ | 5-7 вопросов | Rank Math FAQ Block |
| Итоговый rating | 8.2/10 с breakdown | `[wpsm_scorebox]` |
| Author byline | Дмитрий + pseudonym note | Custom HTML + Schema.org Person |

### 3.1 REHub Review post meta

REHub имеет **custom fields на review-постах**:
- Product name
- Price
- Affiliate URLs
- Rating (5 параметров)

**Используем** — это даёт Review schema автоматически. Через `REHub → Post → Review meta box` снизу от редактора.

### 3.2 Sticky panel (CTA на scroll)

REHub `[wpsm_stickypanel]` — плавающая панель которая появляется когда scroll'ишь вниз. **Хорошо работает** для:
- «Смотреть цену» sticky CTA (не теряется при прокрутке)

**Не** перегружайте — 1 sticky panel максимум, с отключением на mobile (размер экрана).

Включаем **только на review-статьях**, не на guides / pillar.

---

## 4. Single comparison post — сравнительная статья

Уникальный тип. Пример: `delonghi-magnifica-s-vs-philips-3200-lattego.md`.

### 4.1 Специфичные REHub tools

| Блок | Tool |
|---|---|
| Таблица сравнения | `[wpsm_woo_versus]` (если модели в CPT) или Gutenberg Table |
| Vs блоки каждой модели | `[wpsm_offerbox]` для каждой + Pros/Cons рядом |
| Scorebox двойной | Два `[wpsm_scorebox]` side-by-side через `[wpsm_column]` |
| «Кому что» матрица | Gutenberg Table с badge-маркерами |
| Final verdict | `[wpsm_promobox]` с 1-2 CTA |

### 4.2 Layout

Comparison post часто длинный (2000+ слов). Используем:
- `[wpsm_tabgroup]` → `[wpsm_tab]` для разделения «Эспрессо / Молоко / Надёжность / Цена» — если user хочет focused read
- **НО:** это ломает SEO-crawl (tabs прячут контент). На review-статьях не надо. На comparison — только если contents short версия в H2 тоже есть

**Рекомендация:** большинство comparison — **без табов**, с хорошей H2-структурой и table of contents (Rank Math TOC).

### 4.3 Чек-лист comparison

- [ ] H1 «X vs Y: что выбрать»
- [ ] Таблица сравнения в первой трети
- [ ] Матрица «кому X, кому Y»
- [ ] Для каждой модели — Pros/Cons блок
- [ ] Двойной scorebox
- [ ] Cross-sell на полные обзоры обеих моделей
- [ ] FAQ

---

## 5. Single pillar / guide post — длинный гайд

Пример: «Как выбрать кофемашину для дома» (pillar для всей рубрики).

### 5.1 Layout philosophy

- Длина 3000-6000 слов
- **Обязательный** table of contents (Rank Math TOC block)
- Сегментация через H2/H3, не tabs
- Частые «Блок: запомните» и `[wpsm_box]` для ключевых идей
- В конце — «Готовы выбрать? Запустите quiz» CTA

### 5.2 REHub blocks для pillar

| Блок | Где в гайде |
|---|---|
| `[wpsm_numhead]` + `[wpsm_numbox]` | Пошаговые разделы «Шаг 1 / Шаг 2» |
| `[wpsm_titlebox]` | Ключевые итоговые блоки в конце каждого раздела |
| `[wpsm_bar]` | Прогресс-бары для визуализации («Цена: средняя 7/10») |
| `[wpsm_box]` | «Важно», «Запомните», «Ошибка которую делают» — выделение |
| `[wpsm_accordion]` | **ТОЛЬКО** для FAQ-раздела (не основного контента!) |
| `[wpsm_offerbox]` | «Топ-3 по нашему рейтингу» в конце |

### 5.3 НЕ использовать в pillar

- ❌ `[wpsm_tabgroup]` — прячет контент, лишает SEO-value
- ❌ `[wpsm_scorebox]` — нет одного продукта для оценки
- ❌ Pros/Cons без привязки к конкретной модели (не даёт Review schema)

### 5.4 Schema для pillar

- Article schema через Rank Math (обязательно)
- **НЕ** Review schema (не делает отзыв на продукт)
- BreadcrumbList
- TOC schema если включили Table of Contents

---

## 6. Quiz / Matcher page

Специальная page — подбор по вопросам. Пример: `/podbor-kofemashiny/`.

### 6.1 Layout

- Минималистичная — убираем sidebar, footer-widgets, sticky panels
- Focus на quiz-widget в центре
- Вверху — **ПО-3000 avatar** + 2-3 строчки intro
- Снизу — небольшой FAQ про сам quiz («Как это работает?»)

### 6.2 Реализация

**Phase 0 (MVP):** статичный JavaScript quiz с hardcoded 3-5 вопросов и 3 моделями в результате. Через shortcode нашего плагина:

```
[popolkam_quiz category="kofemashiny"]
```

**Phase 1+:** полноценный quiz читающий `machines` CPT через REST API.

### 6.3 REHub blocks

Минимум:
- `[wpsm_promobox]` в шапке для intro + CTA
- Quiz-widget (наш custom shortcode)
- `[wpsm_accordion]` для «Как работает quiz» FAQ внизу

### 6.4 НЕ использовать

- Не перегружать sidebar — пустой или убрать для focus
- НЕ REHub sticky panel — отвлекает от quiz

---

## 7. Author page (`/o-avtore/`)

Страница про Дмитрия Полкина.

### 7.1 Обязательные блоки

| Блок | Tool |
|---|---|
| H1 «Об авторе» | Core Gutenberg |
| Portrait + Name + Role (как карточка) | Custom HTML блок (template в `docs/templates/schema-person.md`) |
| Bio текст | Core Gutenberg paragraphs |
| «Что я делаю» | Gutenberg list |
| Зоны экспертизы | Gutenberg table |
| **Секция про псевдоним** — открытая | Custom HTML (dedicated block) |
| Contact | Gutenberg paragraph + email link |
| Monetization disclaimer | `[wpsm_box]` с warning-style |
| Editorial policy | Numbered list |

### 7.2 Schema.org Person

ОБЯЗАТЕЛЬНО на этой странице — через Rank Math Custom Schema или `functions.php`. JSON в `docs/templates/schema-person.md`.

### 7.3 Что **не** на author page

- ❌ Review schema (не обзор)
- ❌ Pros/Cons, Scorebox, Offerbox (не про продукт)
- ❌ Quiz widget
- ❌ Sticky panel
- ❌ Related posts (не нужно — user сознательно зашёл на author page)

---

## 8. Legal / service pages

`/privacy/`, `/terms/`, `/contacts/`, `/how-we-test/`, `/partnerskie-ssylki/`

### 8.1 Layout

- Максимально простые
- Core Gutenberg тексты
- Нет REHub blocks (они излишни для legal)
- H1 + H2 структура + последнее обновление

### 8.2 Стандартный footer disclaimer

В каждом post есть footer с pseudonym-note. На legal pages — **полный** блок disclosure как в `docs/personas/popolkam-dmitri-polkin.md §5.2`.

---

## 9. Header & Navigation

### 9.1 REHub Header Styles

REHub Customizer → Header layout: **8 вариантов**. Реально:
- **default** — classical magazine header с логотипом слева и меню. Рекомендуется
- **centered** — логотип по центру, меню снизу. Для более editorial ощущения
- **minimal** — компактный. Для mobile-first подхода

**Не используем:** splitheader, sidebarheader, megamenu-heavy (перегружают).

### 9.2 Menu structure

Максимум **7 пунктов** в top menu:
1. Кофемашины
2. Чайники (когда добавим)
3. Блендеры (когда добавим)
4. Сравнения
5. Подбор (quiz)
6. Об авторе
7. Поиск (icon)

**НЕ** мега-меню с подкатегориями — увеличивает CLS, путает Google crawl.

### 9.3 Search

REHub имеет `[wpsm_searchbox]` встроенный. Включить в header. Оформление дефолтное — не custom.

### 9.4 Portfolio widget (SCC-source)

Это наш SCC feature, не REHub. Но для internal tool: отображаем "💎 Portfolio Value" в SCC header, не на popolkam public.

---

## 10. Footer

### 10.1 Column layout

3-4 колонки:
1. **О проекте** — лого + 1 параграф + «Об авторе» link + email
2. **Рубрики** — список основных
3. **Популярное** — топ 5 постов (auto)
4. **Служебное** — Privacy / Terms / Contacts / Как мы тестируем

### 10.2 REHub footer widgets

В REHub Customizer можно задать **footer widgets per-column**. Используем стандартные WP widgets:
- Recent Posts (не REHub recent, просто core)
- Navigation Menu
- Custom HTML (для pseudonym disclaimer)
- Contact Info

### 10.3 Pseudonym disclaimer (обязательно)

**Малым шрифтом в конце footer:**

```html
<p class="pseudonym-footer-disclaimer" style="font-size:11px; color:#94a3b8; text-align:center; margin-top:20px;">
  «Дмитрий Полкин» — литературный псевдоним редакции popolkam.ru.
  Партнёрские ссылки не влияют на редакционную позицию.
  <a href="/o-avtore/">Подробнее</a> / <a href="/partnerskie-ssylki/">Раскрытие</a>.
</p>
```

### 10.4 Footer bottom

- Copyright + год
- Ссылки на основные legal страницы (Privacy / Terms)
- Social links (Telegram, если будет) — **НЕ** перегружать иконками несуществующих аккаунтов

---

## 11. Sidebar

### 11.1 Применение

На **review-постах** и comparison-постах:
- Sticky sidebar (rehub_sticky_sidebar option)
- Widgets:
  - Recent reviews (3 штуки)
  - «Подобрать модель» CTA с ПО-3000 avatar
  - Author mini-card (Дмитрий portrait + ссылка)
  - Newsletter signup (Phase 2+, после email setup)

На **category/pillar/author/legal** страницах:
- **Без sidebar** — full-width layout (через post-level option REHub или custom template)

### 11.2 Что **не** в sidebar

- ❌ Реклама ретейлеров не-партнёров
- ❌ Календари / tag-clouds (устарело)
- ❌ «Search» (уже в header)
- ❌ Images без context

### 11.3 Mobile

На mobile sidebar → под контент. Не в drawer (плохой UX для casual reader).

---

## 12. Cross-site features (работают везде)

### 12.1 Scroll progress bar

REHub Customizer → опция reading progress bar. **Включаем** — полезный UX signal на длинных статьях.

### 12.2 Back to top button

Core feature REHub. **Включаем** — standard UX.

### 12.3 Share buttons

REHub — встроенные share buttons. **Включаем минимум** для review/comparison/pillar:
- Telegram, WhatsApp, VK (для RU аудитории)
- **НЕ** включаем Twitter (умер для RU), Facebook (заблокирован), LinkedIn (irrelevant для B2C)

### 12.4 Compare / Wishlist

REHub feature для сравнения товаров через сохранённый list. **Опционально** (Phase 1+):
- Полезно когда у нас будет 10+ обзоров в одной рубрике и user может собирать shortlist
- Требует CPT с товарами — наш `machine` когда зарегистрируем

Для Phase 0 — **откладываем**, не включаем.

### 12.5 Dark mode toggle

REHub есть `enable_dark_style` option. **Не включаем пока** — сначала нужно тестировать палитру в dark, сейчас бренд orange-на-light не готов к dark inversion.

### 12.6 Sticky panel на scroll

Для review — **да** (CTA «Смотреть цену»).
Для category / pillar / quiz — **нет**.

---

## 13. Theme Options / Customizer — ключевые настройки

### 13.1 Что обязательно настроить

**REHub Customizer → Styling Options:**
- `rehub_custom_color` → **#f97316** (наш orange) — главный акцент
- `rehub_sec_color` → **#0f172a** (slate-900) — текст
- `rehub_btnoffer_color` → **#f97316** — CTA buttons
- `width_layout` → `regular` (не boxed — выглядит old-school)

**REHub Customizer → Typography:**
- Heading font → **Inter 700** (Google Fonts)
- Body font → **Inter 400**
- Menu font → **Inter 500**

**REHub Customizer → Category Layout:**
- `category_layout` → **communitylist** (текущий — OK)

**REHub Customizer → Single Post Layout:**
- `post_layout_style` → **default** (стандартный review-layout)
- Включить sidebar для postов
- Включить reading progress bar

### 13.2 Что отключить

- `buddypress` / `dokan` / `MultiVendorX` templates — **наша тема единолична**, не multi-vendor
- `bpge` — BuddyPress Group Extension, вообще не наш кейс
- Dark mode (пока)
- Mega-menu
- Slider на главной

### 13.3 Custom CSS

Сейчас в `rehub_custom_css`:
```css
.woocommerce .onsale { background: #6dab3c; }
```

Это для WooCommerce, **нам не нужно**. Убрать. Вместо — написать small CSS для:
- Скрытие ненужных metabox'ов в admin
- Tweaks для pseudonym disclaimer в footer
- Любые brand-specific overrides

---

## 14. Что REHub даёт, но мы **НЕ** используем

| Feature | Почему нет |
|---|---|
| MultiVendorX / Dokan templates | Не marketplace |
| BuddyPress integration | Не community |
| WooCommerce templates (shop, cart, checkout) | Не магазин |
| REHub Login/Register pages | WP стандарт достаточен |
| REHub User Profile pages | Не соц-сеть |
| REHub Chat (если есть) | ПО-3000 чат-бот делается нами |
| Paid Memberships | Не подписочная модель |
| AMP templates | AMP умер, не стоит effort |
| REHub Gallery carousels | Core WP gallery легче |
| Mega-menu | 7 пунктов меню не требуют |
| Boxed width | Outdated стиль |
| Dark mode (Phase 0) | Бренд не готов |
| Countdown на hero | Не акционный бизнес |
| Price comparison plugin (full) | Через Content Egg (когда купим) |

---

## 15. Тестирование zones (CWV, Schema, Mobile)

### 15.1 После настройки любой зоны

1. **CWV тест** — https://pagespeed.web.dev/
   - LCP < 2.5s, CLS < 0.1, INP < 200ms
   - Mobile + Desktop оба
2. **Rich Results Test** — https://search.google.com/test/rich-results
   - Проверить что schemas валидны, нет дубликатов
3. **Mobile** — iPhone + Android Chrome
4. **Accessibility** — axe DevTools, Lighthouse
5. **Screen reader** — минимум NVDA/VoiceOver быстрый проход

### 15.2 Регрессия

Каждые 3 месяца — проверить что зоны работают после:
- Обновлений REHub
- Обновлений плагинов (WPAI, Rank Math и др.)
- Изменений config'а

---

## 16. Governance — кто что может менять

### 16.1 Без согласования:
- Content в existing templates (тексты, числа)
- Добавление новых review-постов
- Мелкие CSS-правки

### 16.2 Требует согласования (→ запись в `devlog.md`):
- Смена layout архивных страниц (`category_layout`)
- Включение/отключение крупных REHub features (dark mode, mega-menu, AMP)
- Изменения Customizer styling (цвета, шрифты)
- Добавление нового shortcode в обязательный review-template

### 16.3 Требует полного ревью:
- Миграция на другую тему
- Удаление/изменение меню структуры
- Изменения Header/Footer layout
- Удаление Schema.org Person / Article

---

## 17. Roadmap REHub-настройки

### Phase 0 (сейчас)
- [x] Базовая настройка Customizer (цвета, шрифты)
- [x] Archive layout: communitylist
- [x] Sidebar включён для review-постов
- [ ] Homepage настроена (Magazine layout + custom sections)
- [ ] Custom CSS — удалить WC-специфичные правила
- [ ] Pseudonym disclaimer в footer

### Phase 1 (после заливки 4 обзоров + 1 comparison)
- [ ] Sticky panel на review-постах
- [ ] Scroll progress bar
- [ ] Share buttons (только RU-relevant)
- [ ] Back to top button

### Phase 2 (10+ обзоров)
- [ ] Compare / Wishlist (когда будет много моделей для сравнения)
- [ ] Content Egg integration (после покупки CE)
- [ ] Dark mode (протестировать brand палитру в dark)
- [ ] Newsletter signup block в sidebar

### Phase 3 (30+ обзоров)
- [ ] Category filters (если архивы перегружены)
- [ ] Personalization (user-based recommendations через SCC)

---

## Связанные документы

- [`docs/templates/rehub-review-template.md`](rehub-review-template.md) — детальный review template
- [`docs/templates/schema-person.md`](schema-person.md) — Schema.org Person snippets
- [`docs/brand/popolkam/README.md`](../brand/popolkam/README.md) — brand identity (палитра, типографика, персонажи)
- [`docs/personas/popolkam-dmitri-polkin.md`](../personas/popolkam-dmitri-polkin.md) — Дмитрий
- [`docs/personas/popolkam-po3000.md`](../personas/popolkam-po3000.md) — ПО-3000 mascot
- [`content/popolkam/reviews/obzor-delonghi-magnifica-s-ecam22-110.md`](../../content/popolkam/reviews/obzor-delonghi-magnifica-s-ecam22-110.md) — первый боевой обзор
