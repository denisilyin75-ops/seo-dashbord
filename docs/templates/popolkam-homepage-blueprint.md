# popolkam.ru Homepage Blueprint — wireframe + готовые блоки

> **Статус:** v1 — 2026-04-18
> **Назначение:** копировать в wp-admin → Pages → Home (static homepage) и получить готовый frontend. Каждый блок снабжён: текстом, shortcode'ами, комментариями.
> **Layout framework:** Gutenberg (основа) + REHub shortcodes (акценты) + Custom HTML (fine-tuning)

---

## Общие принципы

1. **Content-first** — 70% площади под контент (ссылки на обзоры), 30% под conversion-элементы (quiz CTA, author block)
2. **Above the fold** (первый экран) — УТП + quiz CTA + Daily brief (3 недавних обзора)
3. **Mobile-first** — все блоки перестраиваются в 1 колонку < 768px
4. **LCP < 2.5s** — hero без тяжёлых изображений, lazy-load всё что ниже 2-го экрана
5. **No sliders** — доказанно падает CTR / CLS

## Настройка WordPress до вставки

**wp-admin → Settings → Reading:**
- Your homepage displays: **A static page**
- Homepage: создать новую страницу «Главная» (slug: `home`)
- Posts page: создать страницу «Блог» или «Все материалы» (slug: `materialy`) — для листинга всех постов если нужно

**wp-admin → Appearance → Customize → REHub Customizer:**
- Frontpage settings → Layout: **Custom** (использует contents static page)
- Остальные frontpage settings НЕ трогаем — нам не нужен REHub homepage builder, собираем сами

**wp-admin → Pages → Главная:**
- Template: **Full width без sidebar** (REHub Custom Template → "Full Width")
- Копируем из blueprint ниже

---

## Wireframe — блоки в порядке отображения

```
┌─────────────────────────────────────────────────┐
│ [Header + nav + search]  ← REHub header       │
├─────────────────────────────────────────────────┤
│                                                  │
│ ┌─── Block 1: Hero с УТП + Quiz CTA ──────┐   │
│ │  H1 «Техника, проверенная инженером»    │   │
│ │  Лид 2 строки                           │   │
│ │  [Кнопка: Подобрать кофемашину →]       │   │
│ └─────────────────────────────────────────┘   │
│                                                  │
│ ┌─── Block 2: Latest Reviews (3 карточки) ─┐   │
│ │  [Mag.S]  [Philips]  [PicoBaristo]      │   │
│ └─────────────────────────────────────────┘   │
│                                                  │
│ ┌─── Block 3: Pillar + Comparison teaser ──┐   │
│ │  [Как выбрать] [Mag vs Philips]         │   │
│ └─────────────────────────────────────────┘   │
│                                                  │
│ ┌─── Block 4: По сегментам ────────────────┐   │
│ │  [До 30k]  [30-50k]  [Премиум 50k+]     │   │
│ └─────────────────────────────────────────┘   │
│                                                  │
│ ┌─── Block 5: Об авторе (mini-card) ───────┐   │
│ │  [Портрет Дмитрия] [био 3 строки]       │   │
│ │  [Подробнее →]                          │   │
│ └─────────────────────────────────────────┘   │
│                                                  │
│ ┌─── Block 6: Топ-6 популярных ────────────┐   │
│ │  Grid 2×3 карточек                       │   │
│ └─────────────────────────────────────────┘   │
│                                                  │
├─────────────────────────────────────────────────┤
│ [Footer + 3 колонки + disclaimer]              │
└─────────────────────────────────────────────────┘
```

Total высота desktop: ~2800-3200px (разумное количество scroll'а для homepage).

---

## Блок 1 — Hero с УТП + Quiz CTA

### Назначение

Первый экран. За 3 секунды user должен понять: что это за сайт, что он может получить, куда кликнуть.

### Gutenberg composition

```html
<!-- wp:cover {"overlayColor":"paper","minHeight":480,"minHeightUnit":"px","contentPosition":"center center","isDark":false} -->
<div class="wp-block-cover is-light" style="min-height:480px">
  <div class="wp-block-cover__inner-container">

    <!-- wp:heading {"level":1,"align":"center","style":{"typography":{"fontSize":"48px","fontWeight":"800","lineHeight":"1.1"}}} -->
    <h1 class="has-text-align-center" style="font-size:48px;font-weight:800;line-height:1.1">
      Техника,<br>проверенная инженером
    </h1>
    <!-- /wp:heading -->

    <!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"18px"},"color":{"text":"#64748b"}}} -->
    <p class="has-text-align-center" style="color:#64748b;font-size:18px;max-width:640px;margin:20px auto 30px">
      Обзоры кофемашин, чайников и бытовой техники для кухни. Реальные замеры, долгосрочный опыт, честные компромиссы. Никаких TikTok-unboxing.
    </p>
    <!-- /wp:paragraph -->

    <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
    <div class="wp-block-buttons" style="display:flex;justify-content:center;gap:12px">

      <!-- wp:button {"style":{"color":{"background":"#f97316","text":"#ffffff"},"border":{"radius":"6px"}},"className":"is-style-fill"} -->
      <div class="wp-block-button is-style-fill">
        <a class="wp-block-button__link" href="/podbor-kofemashiny/" style="background-color:#f97316;color:#fff;border-radius:6px;padding:14px 28px;font-weight:700">
          🤖 Подобрать кофемашину за 5 вопросов
        </a>
      </div>
      <!-- /wp:button -->

      <!-- wp:button {"style":{"color":{"background":"#ffffff","text":"#0f172a"},"border":{"radius":"6px","width":"1px","color":"#0f172a"}},"className":"is-style-outline"} -->
      <div class="wp-block-button is-style-outline">
        <a class="wp-block-button__link" href="#latest-reviews" style="background-color:#fff;color:#0f172a;border:1px solid #0f172a;border-radius:6px;padding:14px 28px;font-weight:500">
          Смотреть свежие обзоры
        </a>
      </div>
      <!-- /wp:button -->

    </div>
    <!-- /wp:buttons -->

  </div>
</div>
<!-- /wp:cover -->
```

### Tone

- **H1 не про SEO,** а про бренд. «Техника, проверенная инженером» — узнаваемый УТП. SEO-ключи закрываются category/review страницами.
- Лид конкретный и контрастный («реальные замеры», «не TikTok-unboxing»)
- Primary CTA — **quiz** (высокая конверсия)
- Secondary CTA — скролл к latest reviews (для user'ов которым quiz не подходит)

### Mobile

- Font-size H1: 32px (вместо 48px)
- Кнопки — full width, stacked вертикально, gap 10px
- Padding: 60px сверху/снизу (не 120px)

### Нельзя

- ❌ Картинка кофемашины в hero (weight + CLS + отвлекает от CTA)
- ❌ Видео автоплей
- ❌ 3+ кнопок (paradox of choice)
- ❌ Длинный абзац описания (user сразу уходит)

---

## Блок 2 — Latest Reviews (3 свежих обзора)

### Назначение

Signal свежести контента для Google. Trust-signal для user (не архив древних обзоров). Hook — к детальному контенту.

### Composition

```html
<!-- wp:heading {"level":2,"align":"center","style":{"typography":{"fontSize":"32px","fontWeight":"700"}},"anchor":"latest-reviews"} -->
<h2 class="has-text-align-center" id="latest-reviews" style="font-size:32px;font-weight:700;margin-top:60px">
  Свежие обзоры
</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","style":{"color":{"text":"#64748b"}}} -->
<p class="has-text-align-center" style="color:#64748b;margin-bottom:30px">
  Каждый обзор — от разбора «что внутри» до замеров дБ/Вт/°C
</p>
<!-- /wp:paragraph -->

<!-- REHub shortcode: 3 recent posts из категории Кофемашины -->
[wpsm_three_col_posts cats="kofemashiny" number="3" show_date="true" show_excerpt="true" excerpt_length="20"]
```

**Альтернатива (если shortcode глючит)** — Gutenberg Columns с тремя вручную вставленными постами через Query Loop block.

### Настройка

- Number: 3 (не 6 — первый экран не должен быть перегружен)
- Show date: true (signal свежести)
- Excerpt: 20 слов (hook, не весь лид)
- Hover effect: subtle — lift на 2-3px + shadow (REHub делает это автоматом в communitylist/magazinegrid style)

### Мobile

- 1 колонка вместо 3
- Показывать все 3 (не срезать до 2)

---

## Блок 3 — Pillar + Comparison teaser

### Назначение

Показать 2 самых ценных типа контента: **guide** (верх воронки, информационный интент) и **comparison** (середина воронки, сравнительный интент).

### Composition

```html
<!-- wp:heading {"level":2,"align":"center"} -->
<h2 class="has-text-align-center" style="margin-top:60px">Не знаете с чего начать?</h2>
<!-- /wp:heading -->

<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide" style="max-width:1200px;margin:30px auto 0">

  <!-- wp:column -->
  <div class="wp-block-column">

    [wpsm_promobox
      title="Как выбрать кофемашину"
      border_color="#e2e8f0"
      background="#fafaf9"]
    Полный гайд по выбору: автоматическая или рожковая, на что смотреть в ТТХ, бюджетные vs премиум, что ломается и какая гарантия реальна.
    <br><br>
    <a href="/kak-vybrat-kofemashinu/" style="color:#f97316;font-weight:700">Читать гайд →</a>
    [/wpsm_promobox]

  </div>
  <!-- /wp:column -->

  <!-- wp:column -->
  <div class="wp-block-column">

    [wpsm_promobox
      title="De'Longhi Magnifica S vs Philips 3200 LatteGo"
      border_color="#e2e8f0"
      background="#fafaf9"]
    Честное сравнение двух популярных моделей среднего сегмента. Цена, молоко, надёжность, экономика владения на 5 лет.
    <br><br>
    <a href="/delonghi-magnifica-s-vs-philips-3200-lattego/" style="color:#f97316;font-weight:700">Читать сравнение →</a>
    [/wpsm_promobox]

  </div>
  <!-- /wp:column -->

</div>
<!-- /wp:columns -->
```

### Rationale

- Обе ссылки — long-form контент (high time-on-site)
- Pillar (левый) — для user'ов не знающих какую модель искать
- Comparison (правый) — для user'ов уже сузивших до 2-3 моделей
- Оба блока — pseudo-cards с border и padding, чтобы выделялись

### Mobile

- Stacked колонки (1 под другой)

---

## Блок 4 — По сегментам (3 ценовые категории)

### Назначение

Разбиение трафика по purchase intent. User понимает бюджет → кликает на свой сегмент → получает фильтрованный список моделей.

### Composition

```html
<!-- wp:heading {"level":2,"align":"center"} -->
<h2 class="has-text-align-center" style="margin-top:60px">Подборки по цене</h2>
<!-- /wp:heading -->

<!-- wp:paragraph {"align":"center","style":{"color":{"text":"#64748b"}}} -->
<p class="has-text-align-center" style="color:#64748b">
  Разбили модели по бюджетам — выберите свой
</p>
<!-- /wp:paragraph -->

<!-- wp:columns {"align":"wide"} -->
<div class="wp-block-columns alignwide" style="max-width:1200px;margin:30px auto 0">

  <!-- Column 1: до 30k -->
  <!-- wp:column -->
  <div class="wp-block-column" style="background:#fafaf9;padding:24px;border-radius:8px;text-align:center">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Бюджетный</div>
    <div style="font-size:28px;font-weight:800;color:#0f172a;margin-bottom:8px">до 30 000 ₽</div>
    <div style="font-size:14px;color:#64748b;margin-bottom:16px">Простые и надёжные автоматы для эспрессо и базового капучино</div>
    <a href="/kofemashiny/budget/" style="color:#f97316;font-weight:700">4 модели →</a>
  </div>
  <!-- /wp:column -->

  <!-- Column 2: 30-50k -->
  <!-- wp:column -->
  <div class="wp-block-column" style="background:#fafaf9;padding:24px;border-radius:8px;text-align:center">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Средний сегмент</div>
    <div style="font-size:28px;font-weight:800;color:#0f172a;margin-bottom:8px">30 000 – 50 000 ₽</div>
    <div style="font-size:14px;color:#64748b;margin-bottom:16px">Автокапучинаторы, LCD-дисплеи, больше настроек. Sweet spot для семьи</div>
    <a href="/kofemashiny/middle/" style="color:#f97316;font-weight:700">6 моделей →</a>
  </div>
  <!-- /wp:column -->

  <!-- Column 3: премиум -->
  <!-- wp:column -->
  <div class="wp-block-column" style="background:#fafaf9;padding:24px;border-radius:8px;text-align:center">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Премиум</div>
    <div style="font-size:28px;font-weight:800;color:#0f172a;margin-bottom:8px">50 000 ₽ и выше</div>
    <div style="font-size:14px;color:#64748b;margin-bottom:16px">Ресурс 10+ лет, премиум-материалы, профессиональный автокапучинатор</div>
    <a href="/kofemashiny/premium/" style="color:#f97316;font-weight:700">3 модели →</a>
  </div>
  <!-- /wp:column -->

</div>
<!-- /wp:columns -->
```

### Рубрики-теги для реализации

В WP создайте 3 **тега**:
- `budget` (attached к Magnifica S)
- `middle` (attached к Philips 3200, PicoBaristo Deluxe)
- `premium` (attached к Jura E8)

Ссылки ведут на tag archive: `/tag/budget/` и т.д. — но лучше сделать кастомные страницы для красоты.

**Либо** — создать кастомные pages `/kofemashiny/budget/` с вручную подобранными моделями (больше работы, но полнее контроль).

### Mobile

- 1 колонка
- Всё 3 видны (не срезать)

---

## Блок 5 — Об авторе (mini-card)

### Назначение

E-E-A-T signal. User видит что за автором стоит **человек с биографией**, не обезличенный бренд.

### Composition

```html
<!-- wp:group {"align":"wide","style":{"spacing":{"padding":{"top":"60px","bottom":"60px"}}}} -->
<div class="wp-block-group alignwide" style="padding:60px 0;max-width:960px;margin:60px auto;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0">

  <!-- wp:columns {"verticalAlignment":"center"} -->
  <div class="wp-block-columns are-vertically-aligned-center">

    <!-- wp:column {"width":"180px","verticalAlignment":"center"} -->
    <div class="wp-block-column is-vertically-aligned-center" style="flex-basis:180px">
      <!-- wp:image {"width":160,"height":160,"style":{"border":{"radius":"50%"}}} -->
      <figure class="wp-block-image" style="border-radius:50%;overflow:hidden;width:160px;height:160px;margin:0">
        <img src="/wp-content/uploads/dmitri-portrait-circular.png" alt="Дмитрий Полкин" width="160" height="160" />
      </figure>
      <!-- /wp:image -->
    </div>
    <!-- /wp:column -->

    <!-- wp:column {"verticalAlignment":"center"} -->
    <div class="wp-block-column is-vertically-aligned-center">

      <!-- wp:paragraph -->
      <p style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 4px">Автор</p>
      <!-- /wp:paragraph -->

      <!-- wp:heading {"level":3} -->
      <h3 style="font-size:24px;font-weight:800;margin:0 0 8px">Дмитрий Полкин</h3>
      <!-- /wp:heading -->

      <!-- wp:paragraph -->
      <p style="color:#64748b;margin:0 0 12px">Инженер-механик, МГТУ им. Н.Э. Баумана. 12 лет в R&D бытовой техники.</p>
      <!-- /wp:paragraph -->

      <!-- wp:paragraph -->
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;max-width:560px">
        Разбираю, тестирую, замеряю. Пишу только про то, что держал в руках или у кого есть глубокий долгосрочный опыт от forum'ов.
      </p>
      <!-- /wp:paragraph -->

      <!-- wp:paragraph -->
      <p style="margin:0">
        <a href="/o-avtore/" style="color:#f97316;font-weight:700">Подробнее об авторе →</a>
      </p>
      <!-- /wp:paragraph -->

      <!-- wp:paragraph -->
      <p style="font-size:11px;color:#94a3b8;margin-top:12px;margin-bottom:0">
        «Дмитрий Полкин» — литературный псевдоним редакции popolkam.ru
      </p>
      <!-- /wp:paragraph -->

    </div>
    <!-- /wp:column -->

  </div>
  <!-- /wp:columns -->

</div>
<!-- /wp:group -->
```

### Критичный момент

- **Pseudonym disclaimer прямо здесь** (последний параграф малым шрифтом) — не прячем
- Portrait не должен быть 500×500 на десктопе — 160×160 достаточно
- Bordered group (top + bottom) выделяет секцию от общего потока

### Mobile

- Portrait центрируется наверху
- Текст центрируется снизу

---

## Блок 6 — Популярное (6 постов)

### Назначение

Возможность пойти «вширь», показать всё портфолио contents'а. Для user'ов которые не решили что искать.

### Composition

```html
<!-- wp:heading {"level":2,"align":"center"} -->
<h2 class="has-text-align-center" style="margin-top:60px">Популярное в рубрике Кофемашины</h2>
<!-- /wp:heading -->

[wpsm_three_col_posts cats="kofemashiny" number="6" show_date="false" show_excerpt="false" orderby="comment_count"]
```

### Альтернативы orderby

- `comment_count` — по количеству комментариев (proxy для популярности, но у нас их пока мало)
- `meta_value_num` с custom field «views» — если используем Views counter plugin
- **Просто `rand` + cache** — случайная подборка, обновляется раз в день (для Phase 0, пока нет реальной аналитики)

Для Phase 0 — `rand` подходит. Позже перейдём на meta-based ranking.

### Mobile

- 1 колонка × 6 постов (не 6 сразу, 3 + «Показать ещё 3»)
- Альтернатива — уменьшить до 4 постов (2 ряда по 2)

---

## Обязательные метаданные страницы Главная

### Title & Meta

Через Rank Math:
- **Title:** `popolkam.ru — кухонная техника по полочкам`
- **Description:** `Независимые обзоры кофемашин, чайников и бытовой техники. Реальные замеры, долгосрочный опыт, честные компромиссы от инженера-обозревателя.`
- **Focus keyword:** `кухонная техника обзоры`

### Schema.org (на главной)

Через Rank Math Custom Schema:
- **Organization** (см. `docs/templates/schema-person.md §Organization`)
- **WebSite** с SearchAction

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "popolkam.ru",
  "url": "https://popolkam.ru/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://popolkam.ru/?s={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### Open Graph

- **og:title:** то же что Title
- **og:description:** то же что Description
- **og:image:** 1200×630 composition с mark + slogan (создать в Figma/Canva по brand палитре)
- **og:type:** `website`

---

## Чек-лист перед публикацией главной

- [ ] Hero с УТП + quiz CTA размещён
- [ ] Latest reviews (3) подгружаются корректно (shortcode работает)
- [ ] Pillar + comparison teaser отображаются
- [ ] 3 ценовых сегмента с правильными URL
- [ ] Author block с pseudonym-disclaimer
- [ ] Популярное (6 постов) — пока random, потом views-based
- [ ] Mobile — все блоки в 1 колонку, ничего не вылезает
- [ ] LCP < 2.5s (тест в PageSpeed Insights)
- [ ] CLS < 0.1 (hero без CLS скачков)
- [ ] Title + Meta через Rank Math
- [ ] Schema: Organization + WebSite
- [ ] Open Graph image 1200×630

---

## Next iterations (Phase 1+)

### После 10+ обзоров
- Блок «Недавно обновлено» — показать refresh-статьи (E-E-A-T signal «мы обновляем»)
- Блок «Топ брендов» — сетка логотипов De'Longhi / Philips / Saeco / Jura / Melitta

### После Content Egg
- Блок «Горячие цены сегодня» — автообновляемый через CE feed
- Countdown до конца акции (если таковые)

### После quiz MVP
- Inline quiz-виджет прямо на главной (не отдельная страница)
- Social proof: «N пользователей подобрали кофемашину через нас»
