# popolkam.ru — Category Page Blueprint: /kofemashiny/

> **Назначение:** operator-executable план первой category-страницы портфеля. Копипаст-ready Gutenberg + REHub shortcodes.
> **Статус:** v1 — 2026-04-18
> **Связано с:** `docs/templates/popolkam-homepage-blueprint.md`, `docs/templates/rehub-zones-map.md §4`, `docs/strategies/coffee-machines.md`

---

## Философия category-страницы

Category — это **не свалка обзоров**, а **витрина с экспертным гидом**. Посетитель должен:

1. **За 5 секунд** понять, что это про кофемашины для дома (H1 + intro).
2. **За 30 секунд** получить ориентиры по цене и сценариям (3 подкатегории / price tiers).
3. **За 2 минуты** прочитать мини-гид от Дмитрия (зачем мы вообще это пишем) и уйти в нужный обзор.
4. **Не застрять** — всегда под рукой pillar-гид и сравнение топ-моделей.

**Плохая category:** 10 превью статей подряд без интро. Google видит thin content + high bounce.
**Хорошая category:** intro 120-180 слов → 3 price-tier карточки → список обзоров с фильтром → CTA pillar/quiz → FAQ (опционально).

---

## Структура страницы — 7 блоков

```
┌─────────────────────────────────────────────────────────┐
│ 1. Breadcrumbs + H1                                     │  ← Rank Math / REHub
├─────────────────────────────────────────────────────────┤
│ 2. Intro от Дмитрия (120-180 слов)                      │  ← Gutenberg paragraph
├─────────────────────────────────────────────────────────┤
│ 3. Три price tier — карточки                            │  ← [wpsm_column] × 3
├─────────────────────────────────────────────────────────┤
│ 4. Pillar + Quiz teaser (2 колонки)                     │  ← [wpsm_promobox] × 2
├─────────────────────────────────────────────────────────┤
│ 5. Обзоры в категории (archive loop)                    │  ← REHub archive settings
├─────────────────────────────────────────────────────────┤
│ 6. FAQ — частые вопросы                                 │  ← [wpsm_accordion]
├─────────────────────────────────────────────────────────┤
│ 7. Мини-карточка автора                                 │  ← [wpsm_column] + portrait
└─────────────────────────────────────────────────────────┘
```

Intro + tier cards + pillar/quiz teaser + FAQ = **в описании category** (WP → Posts → Categories → Кофемашины → Description). REHub поддерживает HTML и shortcodes в Description.

Archive loop (список обзоров) — **встроен темой** ниже description.

---

## Block 1 — Breadcrumbs + H1

### Настройка

**Rank Math → Titles & Meta → Post Types → Categories:**
- Title: `Кофемашины — обзоры и рейтинги 2026 — popolkam.ru`
- Description: `Независимые обзоры автоматических кофемашин: De'Longhi, Philips, Jura, Saeco. Инженерный подход, реальные замеры, честные компромиссы. Без «идеально».`
- Schema: `CollectionPage`

**REHub → Category settings → Кофемашины:**
- Name: `Кофемашины`
- Slug: `kofemashiny`
- H1 override (если тема поддерживает): `Кофемашины для дома — обзоры popolkam.ru`

**Breadcrumbs:** включить в `Rank Math → General → Breadcrumbs → Enable`. Формат:
```
Главная › Кофемашины
```

---

## Block 2 — Intro от Дмитрия

### Вставить в Description категории (HTML-режим Gutenberg)

```html
<!-- wp:paragraph {"style":{"typography":{"fontSize":"18px","lineHeight":"1.7"}}} -->
<p style="font-size:18px;line-height:1.7">
Кофемашина — это не «ещё один чайник». Это техника на 5-10 лет, с ежедневной эксплуатацией и стоимостью владения, которая <strong>растёт</strong> от базовой модели к премиуму, но не линейно. Под «автоматической кофемашиной» имеют в виду очень разные машины: от 25-тысячной De'Longhi Magnifica S до 150-тысячной Jura E8 с P.E.P. — и разница не только в деньгах.
</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"style":{"typography":{"fontSize":"18px","lineHeight":"1.7"}}} -->
<p style="font-size:18px;line-height:1.7">
Мы разбираем модели как инженеры: гидросистема, помол, молочник, обслуживание. Меряем время до первой чашки, шум, расход воды на очистку. Считаем <strong>стоимость владения на 5-10 лет</strong>, а не только ценник в магазине. Не ставим «идеально» — в тексте про каждую машину есть <a href="/chestno-o-kompromissah/">раздел компромиссов</a>, потому что идеальных не бывает.
</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"style":{"typography":{"fontSize":"18px","lineHeight":"1.7"}}} -->
<p style="font-size:18px;line-height:1.7">
Если вы выбираете первую машину — начните с <a href="/kak-vybrat-kofemashinu/">гида по выбору</a> или пройдите <a href="/podbor-kofemashiny/">5-минутный квиз</a>. Если уже определились с ценовым сегментом — ниже карточки по бюджету.
</p>
<!-- /wp:paragraph -->
```

### Почему так

- **Первый абзац:** snapping attention. Сразу «техника на 5-10 лет» — меняет рамку с «гаджет» на «долгосрочная инвестиция». Google это тоже читает — сигнал глубины.
- **Второй абзац:** E-E-A-T. Методология (что меряем, как считаем) + честность (компромиссы).
- **Третий абзац:** internal links к pillar + quiz. Два пути наружу для разных сегментов.

**Длина:** 180 слов. Если нужно короче — убрать третий абзац (но тогда теряем CTA).

---

## Block 3 — Три price tier (карточки)

### Gutenberg HTML

```html
<!-- wp:heading {"level":2,"style":{"typography":{"fontSize":"28px"}}} -->
<h2 style="font-size:28px">По бюджету</h2>
<!-- /wp:heading -->

<!-- wp:columns -->
<div class="wp-block-columns">

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"spacing":{"padding":"24px"},"border":{"radius":"12px","width":"1px","color":"#e5e7eb"},"color":{"background":"#fafafa"}}} -->
<div class="wp-block-group" style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
<!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"22px"}}} -->
<h3 style="font-size:22px">До 30 000 ₽</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>Точка входа.</strong> Базовый эспрессо, ручной капучинатор, пластиковый корпус. Для 1-2 чашек в день без молока — рабочий вариант.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Эталон: <a href="/obzor-delonghi-magnifica-s-ecam22-110/"><strong>De'Longhi Magnifica S ECAM22.110</strong></a> — 25-35k, 8.2/10.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"spacing":{"padding":"24px"},"border":{"radius":"12px","width":"1px","color":"#3b82f6"},"color":{"background":"#eff6ff"}}} -->
<div class="wp-block-group" style="background:#eff6ff;border:1px solid #3b82f6;border-radius:12px;padding:24px">
<!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"22px"}}} -->
<h3 style="font-size:22px">30 000 – 50 000 ₽ ⭐</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>Золотая середина.</strong> Автоматический капучинатор (LatteGo или аналог), цветной дисплей, больше пресетов. Для семьи 2-4 человека — оптимум по соотношению цена/качество.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Эталон: <a href="/obzor-philips-3200-lattego-ep3241/"><strong>Philips 3200 LatteGo EP3241</strong></a> — 38-45k, 8.5/10.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Или сравнение: <a href="/delonghi-magnifica-s-vs-philips-3200-lattego/">Magnifica S vs 3200 LatteGo</a>.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"spacing":{"padding":"24px"},"border":{"radius":"12px","width":"1px","color":"#e5e7eb"},"color":{"background":"#fafafa"}}} -->
<div class="wp-block-group" style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
<!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"22px"}}} -->
<h3 style="font-size:22px">От 50 000 ₽</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p><strong>Премиум.</strong> Двойной бойлер, P.E.P. или аналоги, металлический корпус, 10-15 пресетов. Для энтузиастов и семей 4+ с высокой нагрузкой.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Переходный класс: <a href="/obzor-saeco-picobaristo-deluxe-sm5572/"><strong>Saeco PicoBaristo Deluxe</strong></a> — 48-56k.</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>Флагман: <a href="/obzor-jura-e8/"><strong>Jura E8</strong></a> — 135-155k, 9.1/10.</p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->
```

### Почему так

- **3 колонки** с акцентом на среднюю (синяя рамка + звёздочка) — psychology of choice, средняя — дефолт.
- **Эталон + ссылка** в каждой — прямой путь к обзору, снижает bounce.
- **Sub-links** (comparison, pillar) в средней колонке — внутренняя перелинковка.

**Mobile:** columns схлопываются вертикально, padding сохраняется.

---

## Block 4 — Pillar + Quiz teaser

```html
<!-- wp:heading {"level":2,"style":{"typography":{"fontSize":"28px"}}} -->
<h2 style="font-size:28px">Не знаете с чего начать?</h2>
<!-- /wp:heading -->

<!-- wp:columns -->
<div class="wp-block-columns">

<!-- wp:column -->
<div class="wp-block-column">
[wpsm_promobox title="Гид по выбору кофемашины" button_text="Читать гид" button_link="/kak-vybrat-kofemashinu/" color="#3b82f6"]
Что важнее — бойлер или помол? Нужен ли молочник автомат? Разбираем 7 ключевых параметров с примерами.
[/wpsm_promobox]
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
[wpsm_promobox title="Квиз: 5 минут = ваша модель" button_text="Пройти квиз" button_link="/podbor-kofemashiny/" color="#22c55e"]
Ответьте на 7 вопросов (бюджет, молоко, частота, сценарий) — покажем 3 подходящие модели с обоснованием.
[/wpsm_promobox]
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->
```

**Примечание:** если `[wpsm_promobox]` не рендерится в description категории — fallback на ручной Gutenberg group с кнопкой (см. homepage blueprint §3).

---

## Block 5 — Архив обзоров (REHub archive)

### Настройка REHub

**wp-admin → REHub → Options → Posts → Archives:**
- Layout: `List style with large image` (for reviews) или `Grid 2 columns` (более компактно)
- Posts per page: `12`
- Show excerpt: `Yes`
- Excerpt length: `25 words`
- Show meta: `Date + Author`
- Show scorebox (если review имеет rating): `Yes`
- Show "Read more" button: `Yes`

### Для категории «Кофемашины» override (если отличается от global)

**wp-admin → Posts → Categories → Кофемашины → Edit:**
- REHub: Custom layout for this category → `List with sidebar right`
- Sidebar: `Sidebar: Category — Coffee Machines` (кастомный сайдбар с pillar-CTA + популярными обзорами)

### Pagination

- Стандартная WP paginate_links — REHub рендерит автоматически
- Или `Load more` button (REHub → Options → Advanced → Ajax pagination) — **не включать в MVP** (зависит от AJAX, может ломаться с кэшем)

### Сортировка обзоров

По умолчанию: `date DESC` (новые сверху). Оптимум для начала.

Позже (Phase 2): сортировка по rating DESC — лучшие обзоры первыми. Требует custom query или REHub premium filter.

---

## Block 6 — FAQ (частые вопросы)

В конце description, после tier cards:

```html
<!-- wp:heading {"level":2,"style":{"typography":{"fontSize":"28px"}}} -->
<h2 style="font-size:28px">Частые вопросы</h2>
<!-- /wp:heading -->

[wpsm_accordion]

[wpsm_accordion_section title="Какая кофемашина лучше для новичка?"]
Для первой машины в диапазоне 25-35k рублей — <a href="/obzor-delonghi-magnifica-s-ecam22-110/">De'Longhi Magnifica S ECAM22.110</a>. Минимум электроники (меньше поломок), ручной капучинатор (учит работать с молоком), цена терпимая. Если бюджет 35-45k и нужен автокапучинатор — <a href="/obzor-philips-3200-lattego-ep3241/">Philips 3200 LatteGo</a>.
[/wpsm_accordion_section]

[wpsm_accordion_section title="В чём разница между ручным и автоматическим капучинатором?"]
<strong>Ручной (паровая трубка/panarello):</strong> вы сами взбиваете молоко в питчере. Требует 1-2 недели практики, но даёт контроль над текстурой. Дешевле в обслуживании.
<br><br>
<strong>Автоматический (LatteGo, Latte Crema System):</strong> молоко взбивается и подаётся в чашку автоматически. Удобнее, но нужно чистить систему ежедневно. Дороже на 5-10k в цене машины.
<br><br>
Подробнее в <a href="/kak-vybrat-kofemashinu/#kapuchinator">гиде по выбору</a>.
[/wpsm_accordion_section]

[wpsm_accordion_section title="Сколько живёт кофемашина?"]
При правильном обслуживании (декальцинация раз в 2-3 месяца, чистка ежедневно) — 7-10 лет для De'Longhi/Philips, 10-15 лет для Jura/Saeco. Главный враг — накипь. Вода фильтром через Brita + регулярная декальцинация = 80% долговечности.
[/wpsm_accordion_section]

[wpsm_accordion_section title="Стоит ли брать кофемашину Б/У?"]
<strong>Риски:</strong> накипь в гидросистеме (не видна, сокращает жизнь на 3-5 лет), износ жерновов (замена 3-8k), прошлые поломки. <strong>Когда оправдано:</strong> премиум-модели (Jura E8 за 70k вместо 150k) с чеком сервисного ТО от официального дилера. <strong>Когда нет:</strong> бюджетные модели без истории — дешевле взять новую.
[/wpsm_accordion_section]

[wpsm_accordion_section title="Какую воду использовать в кофемашине?"]
Фильтрованную, с жёсткостью 4-7 °dH (немецких градусов). Слишком мягкая (<3) — кофе кислый, плохо экстрагируется. Слишком жёсткая (>10) — быстрая накипь. Brita + тест-полоска раз в месяц = оптимум. Бутилированную «для кофемашин» покупать необязательно — Brita даёт тот же результат в разы дешевле.
[/wpsm_accordion_section]

[/wpsm_accordion]
```

### Schema FAQ

Rank Math автоматически распознаёт `[wpsm_accordion]` как FAQ если включено в **Rank Math → Titles & Meta → Post Types → Categories → Schema → FAQPage**.

**Проверить:** Google Rich Results Test → URL категории → должен показать FAQ snippet.

---

## Block 7 — Мини-карточка автора (в конце)

```html
<!-- wp:group {"style":{"spacing":{"padding":"32px","margin":{"top":"48px"}},"border":{"radius":"12px","width":"1px","color":"#e5e7eb"},"color":{"background":"#fafafa"}}} -->
<div class="wp-block-group" style="background:#fafafa;border:1px solid #e5e7eb;border-radius:12px;padding:32px;margin-top:48px">

<!-- wp:columns {"verticalAlignment":"center"} -->
<div class="wp-block-columns are-vertically-aligned-center">

<!-- wp:column {"width":"120px"} -->
<div class="wp-block-column" style="flex-basis:120px">
<!-- wp:image {"align":"center","width":100,"height":100,"style":{"border":{"radius":"50%"}}} -->
<figure class="wp-block-image aligncenter is-resized" style="border-radius:50%">
<img src="/wp-content/uploads/dmitri-polkin-portrait.png" alt="Дмитрий Полкин" width="100" height="100" />
</figure>
<!-- /wp:image -->
</div>
<!-- /wp:column -->

<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"20px"}}} -->
<h3 style="font-size:20px">Дмитрий Полкин</h3>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>Инженер-механик, редактор popolkam.ru. Разбирает кофемашины как гидросистемы — с замерами и компромиссами. <a href="/o-avtore/">Подробнее о редакции →</a></p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:column -->

</div>
<!-- /wp:columns -->

</div>
<!-- /wp:group -->
```

---

## Внутренняя перелинковка — checklist

Из category `/kofemashiny/` должны быть ссылки на:

- ✅ `/obzor-delonghi-magnifica-s-ecam22-110/` (в tier-карточке «до 30k»)
- ✅ `/obzor-philips-3200-lattego-ep3241/` (в tier-карточке «30-50k»)
- ✅ `/delonghi-magnifica-s-vs-philips-3200-lattego/` (в tier-карточке «30-50k»)
- ✅ `/obzor-saeco-picobaristo-deluxe-sm5572/` (в tier-карточке «50k+»)
- ✅ `/obzor-jura-e8/` (в tier-карточке «50k+»)
- ✅ `/kak-vybrat-kofemashinu/` (pillar — в intro + tier cards + promobox)
- ✅ `/podbor-kofemashiny/` (quiz — в intro + promobox)
- ✅ `/chestno-o-kompromissah/` (philosophy — в intro)
- ✅ `/o-avtore/` (в author mini-card)

**Входящие ссылки** (обратная перелинковка — должны вести на `/kofemashiny/`):
- Main menu → «Кофемашины»
- Breadcrumbs каждого обзора кофемашины (Главная › Кофемашины › {название})
- Footer → «Рубрики» → «Кофемашины»
- Homepage block 6 (popular in category)

---

## Schema.org

### CollectionPage (через Rank Math)

**Rank Math → Categories → Кофемашины → Schema:**
- Type: `CollectionPage`
- Name: `Кофемашины`
- Description: (копия из meta description)
- URL: `https://popolkam.ru/kofemashiny/`

### BreadcrumbList

Автоматически через Rank Math (если включены breadcrumbs).

### FAQ Schema

Если `[wpsm_accordion]` содержит 3+ вопросов, Rank Math распознаёт и генерирует FAQPage schema.

**Проверить в Rich Results Test:** URL категории должен показать 3 типа: CollectionPage + BreadcrumbList + FAQPage.

---

## SEO — точечные настройки

### URL

- `https://popolkam.ru/kofemashiny/` — без trailing slashes проблем (WP стандарт)
- **Не допустить:** `/category/kofemashiny/` — убрать префикс `/category/` через `Rank Math → General → Categories → Remove base`

### Title (Rank Math template)

```
%term% — обзоры и рейтинги %year% — %sitename%
```

→ `Кофемашины — обзоры и рейтинги 2026 — popolkam.ru`

### Meta description (точная)

```
Независимые обзоры автоматических кофемашин: De'Longhi, Philips, Jura, Saeco. Инженерный подход, реальные замеры, честные компромиссы. Без «идеально».
```

**157 символов** — укладывается в 160-char limit Google.

### Canonical

Автоматически `self` — проверить что Rank Math не добавил дубль canonical.

### OG / Twitter Card

**Rank Math → Categories → Кофемашины → Social:**
- OG image: `https://popolkam.ru/wp-content/uploads/og-kofemashiny.png` (1200×630, с H1 + логотип)
- OG title: копия title
- OG description: копия description

---

## Mobile considerations

- **Tier cards (3 колонки):** на <768px схлопываются в 3 вертикальных блока. Padding сохраняется.
- **Promobox 2 колонки:** → 2 вертикальных блока.
- **FAQ accordion:** родной REHub, адаптивен по умолчанию.
- **Author mini-card (2 колонки: портрет + текст):** → вертикально, портрет сверху, текст снизу.
- **Archive grid (если 2 колонки):** → 1 колонка на mobile.

**Обязательно проверить:**
- Google PageSpeed → Mobile → Core Web Vitals для URL `/kofemashiny/`
- LCP < 2.5s, CLS < 0.1, INP < 200ms
- Если LCP страдает — tier card background images → WebP, lazy load ниже-fold

---

## Чек-лист перед публикацией

### Контент
- [ ] Intro от Дмитрия 150-180 слов, 3 абзаца
- [ ] 3 tier cards с ссылками на эталонные модели
- [ ] Pillar + Quiz promobox (2 колонки)
- [ ] Archive loop: 12 постов per page, list layout
- [ ] FAQ: минимум 5 вопросов
- [ ] Author mini-card внизу

### Перелинковка
- [ ] Проверены все internal links (скрипт или Screaming Frog)
- [ ] Breadcrumbs показывают: Главная › Кофемашины
- [ ] Main menu → «Кофемашины» ведёт на `/kofemashiny/`
- [ ] Footer → Рубрики → Кофемашины

### Schema
- [ ] Rich Results Test: CollectionPage ✅
- [ ] Rich Results Test: BreadcrumbList ✅
- [ ] Rich Results Test: FAQPage ✅
- [ ] Нет дублей schema

### SEO
- [ ] URL без `/category/` префикса
- [ ] Title ≤ 60 символов
- [ ] Meta description ≤ 160 символов
- [ ] OG image 1200×630 загружен
- [ ] Canonical = self

### Performance
- [ ] Mobile PageSpeed > 85
- [ ] LCP < 2.5s
- [ ] Images lazy-loaded ниже-fold
- [ ] Нет render-blocking CSS/JS

### Analytics
- [ ] GA4 event `view_category` на load (через GTM или REHub custom)
- [ ] GSC: URL добавлен в sitemap
- [ ] Rank Math → Analytics: URL отслеживается

---

## Post-launch мониторинг (первые 30 дней)

**Неделя 1:**
- GSC → Coverage → URL indexed ✅
- GSC → Performance → impressions начались
- GA4 → Landing Page `/kofemashiny/` → bounce rate < 70%

**Неделя 2-4:**
- Avg position в GSC по «кофемашины обзоры», «какую кофемашину купить»
- CTR > 3% для top-10 запросов
- Avg session duration > 90s (признак чтения intro + tier cards)

**Сигналы, что страница работает:**
- Bounce < 65%, session > 2 min, CTR на обзоры из tier cards > 15%
- Ранжирование в top-30 по 3+ запросам за 30 дней

**Сигналы, что не работает:**
- Bounce > 80% → проблема с intro или tier cards (не цепляют)
- Низкий CTR на обзоры → перестроить tier cards (разные CTA)
- Не ранжируется через 30 дней → внешние backlinks нужны (Phase 2)

---

## Связанные документы

- `docs/templates/popolkam-homepage-blueprint.md` — homepage blueprint (парный)
- `docs/templates/rehub-zones-map.md §4` — category zone REHub spec
- `docs/templates/rehub-review-template.md` — single review blueprint
- `docs/strategies/coffee-machines.md` — контент-стратегия рубрики
- `docs/personas/popolkam-dmitri-polkin.md` — голос Дмитрия

---

## Changelog

- **v1 (2026-04-18):** первая версия, копипаст-ready. Базируется на 4 готовых обзорах + 1 сравнении.
