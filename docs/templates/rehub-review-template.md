# REHub Review Template — шаблон обзора на popolkam.ru

> **Статус:** v1 — 2026-04-18
> **Назначение:** канонический шаблон для обзоров бытовой техники. Использовать при написании всех review-статей на popolkam. Совместно с голосом [Дмитрия Полкина](../personas/popolkam-dmitri-polkin.md).
> **Inventory REHub shortcodes** — актуален для установленной сборки REHub 19.9.9.7

---

## Философия: hybrid подход

**Основной текст** — core Gutenberg blocks (paragraph, heading, list, table). Portable, AI-generatable.

**REHub shortcodes** — ТОЛЬКО там где даёт уникальный affiliate-value (ценовые блоки, сравнения, pros/cons со schema, рейтинги). Не везде подряд.

## REHub Inventory — что установлено и где использовать

### 🔥 Критически используем (ядро affiliate-обзора)

| Shortcode | Где в статье | Зачем |
|---|---|---|
| `[wpsm_offerbox]` | Блок цен в верхней трети | Карточка товара с ценой + CTA, нативная affiliate-карточка |
| `[wpsm_offer_list]` | Там же | Список цен из 3-4 ретейлеров под конкретную модель |
| `[wpsm_pros]` / `[wpsm_cons]` | После верхнего блока цен | Генерирует Review schema → rich snippet в SERP |
| `[wpsm_specification]` | Таблица ТТХ | Структурированная specs table + Product schema |
| `[wpsm_scorebox]` | Конец статьи | Итоговый рейтинг (8.2/10 по 5 параметрам) + Review schema |
| `[wpsm_woo_versus]` | Comparison-статьи | Side-by-side сравнение двух моделей |
| `[wpsm_compare_button]` | В обзоре | Добавить к сравнению (если есть comparison page) |
| `[rehub_affbtn]` | Любой CTA | Стилизованная affiliate-кнопка «Смотреть цену» |

### 🟢 Полезно для UX (стилистические)

| Shortcode | Зачем |
|---|---|
| `[wpsm_box]` | Info-блок (серый бокс с информацией) |
| `[wpsm_promobox]` | Promo-блок с акцентом |
| `[wpsm_numbox]` | Нумерованные блоки (пошаговые инструкции) |
| `[wpsm_accordion]` / `[wpsm_accordion_section]` | FAQ как аккордеон (альтернатива Rank Math FAQ) |
| `[wpsm_tabgroup]` / `[wpsm_tab]` | Табы («Характеристики / Тесты / Отзывы») |
| `[wpsm_button]` | Стилизованная кнопка |
| `[wpsm_bar]` | Прогресс-бар (рейтинги «шум 7/10», «надёжность 9/10») |
| `[wpsm_quote]` | Выделенная цитата (например, мнение из форума — с атрибуцией) |
| `[wpsm_colortable]` | Цветная таблица (сравнение вариантов) |

### 🟡 Ситуативно (когда реально подходит)

| Shortcode | Когда |
|---|---|
| `[wpsm_countdown]` | Акция с дедлайном (Black Friday) |
| `[wpsm_price_table]` / `[wpsm_price_column]` | Тарифная сетка (для подписочных сервисов — у нас редко) |
| `[wpsm_top]` / `[wpsm_toptable]` | Топ-подборки («Топ-5 кофемашин до 30k») |
| `[wpsm_toggle]` | Свёрнутые blocks для длинных статей |
| `[wpsm_charts]` | Визуализация рейтингов (если есть данные) |

### ❌ НЕ используем (альтернатива есть)

| Shortcode | Почему не |
|---|---|
| `[gallery]` (core WP) | Core WP proще и portable, не REHub карусели (тяжёлые) |
| FAQ блоки REHub | Rank Math FAQ Block — универсальнее, корректный FAQPage schema. REHub не дублирует |
| `[rehub_title]` | Обычный H2 достаточно, не загружаем REHub styling без нужды |
| `[wpsm_dropcap]` | Украшательство без value |
| `[wpsm_lightbox]` | Core WP lightbox достаточно |
| `[wpsm_minigallery]` | См. выше |

### WooCommerce-специфичные (НЕ используем)

Мы НЕ на CPT `product`, а на кастомном `machine` (см. `docs/business-model.md §11 Product Vision 2.0`). Все `wpsm_woo*` — для WC products, нам не подходят.

### Content Egg (когда купим — след. неделе)

- `[content-egg]` — AmazonFeed-style блок с автообновляющимися товарами
- `[content-egg-block]` — отдельный блок товара
- `[content-egg-price-movers]` — «цена упала / выросла за N дней»

Интегрируем когда будет CE. Сейчас — `[wpsm_offer_list]` с ручными URL.

---

## Канонический шаблон — структура review-статьи

### Секция 1 — Hero (лид, 40-60 слов)

```markdown
# [Заголовок с моделью + годом + крючком]

[Прямой ответ на запрос в 40-60 слов. Кому подходит, за что, какой компромисс.]
```

**Пример:** «Если нужна автоматическая кофемашина до 30 тысяч...»

### Секция 2 — Вердикт (pros/cons через REHub)

```
## Коротко: плюсы, минусы, кому брать

[wpsm_pros title="Что хорошо"]
✓ Пункт 1
✓ Пункт 2
[/wpsm_pros]

[wpsm_cons title="Что минус"]
✗ Пункт 1
✗ Пункт 2
[/wpsm_cons]

**Кому берём:** ...
**Кому не берём:** ...
```

**Важно:** pros/cons **обязательно** через REHub — даёт Review schema → rich snippet в SERP (CTR +15-30%).

### Секция 3 — Блок цен в верхней трети

```
## 💰 Где купить

[wpsm_offer_list display_type="list" ids="offer1,offer2,offer3"]

либо ручная таблица (если нет CE):

[wpsm_offerbox logo="..." price="27 990 ₽" affiliate_url="..." button_text="Смотреть на Ozon"]
Описание offer
[/wpsm_offerbox]
```

**Правило:** минимум 2 ретейлера, через Admitad SubID, rel="sponsored nofollow".

### Секция 4 — Технические характеристики

```
## Технические характеристики

[wpsm_specification title="Основные параметры"]
Тип: автоматическая
Давление: 15 бар
Мощность: 1450 Вт
...
[/wpsm_specification]
```

Или обычная Gutenberg Table если не нужен schema.

### Секция 5 — Deep dive (текст)

Core Gutenberg — paragraphs, H3, lists. Голос Дмитрия (§3 canon).

Секции:
- Эспрессо / основная функция
- Молоко / капучино
- Ежедневный уход
- Долгосрочная надёжность (что ломается)

Inline используем:
- `[wpsm_box]` для «Мой совет по цене» блоков
- `[wpsm_numbox]` для шагов
- `[wpsm_quote]` если цитируем форум / эксперта

### Секция 6 — Сравнение с альтернативами

```
## С чем сравнить

### Model A vs Model B

[wpsm_woo_versus] shortcode если продукты в CPT
либо Gutenberg table:

| Параметр | Model A | Model B |
|---|---|---|
| Цена | 28k | 38k |
| ...
```

Ссылки на полные обзоры / comparison-статьи через internal links.

### Секция 7 — Cross-sell

```
## Что берут вместе

- Зерно
- Средства для ухода
- Аксессуары
```

Core Gutenberg list.

### Секция 8 — FAQ (Rank Math, НЕ REHub)

**Используем Rank Math FAQ Block** (Gutenberg → FAQ Block → Rank Math):

```
## FAQ

[Rank Math FAQ Block с 5-7 вопросов]
```

FAQPage schema автоматом через Rank Math. НЕ `[wpsm_accordion]` для FAQ — дубль schema ломает Google.

### Секция 9 — Итоговый рейтинг

```
## Наш вердикт

[wpsm_scorebox title="Итоговая оценка"]
Качество эспрессо: 9
Удобство: 7
Надёжность: 9
Цена/качество: 8
Поддержка: 8
[/wpsm_scorebox]
```

Даёт Aggregate Review schema → звёздочки в SERP.

### Секция 10 — Author byline

```
---
**Автор:** Дмитрий Полкин, редакция popolkam.ru
«Дмитрий Полкин» — литературный псевдоним редакции popolkam.ru.
Последнее обновление: [дата].
```

Байлайн + pseudonym disclosure + Schema.org Person auto-injection (REHub или Rank Math — проверить какой активен).

---

## Тестирование REHub blocks — чек-лист ПЕРЕД запуском в production

Для **каждого новго REHub blocка** который добавляем, проходим:

### 1. Core Web Vitals

```
PageSpeed Insights: https://pagespeed.web.dev/?url=https://popolkam.ru/[slug]/

Цели:
- LCP < 2.5s
- INP < 200ms
- CLS < 0.1
- Mobile + Desktop оба
```

**Красный флаг:** если после добавления REHub блока LCP растёт >500ms → откатываем или ищем lazy-load.

### 2. Rich Results Validation

```
Тест: https://search.google.com/test/rich-results
Вводим URL опубликованной статьи.

Проверяем:
- Review schema (wpsm_pros/wpsm_cons/wpsm_scorebox генерят)
- Product schema (wpsm_specification генерит)
- Article schema (Rank Math генерит)
- FAQPage (Rank Math FAQ Block)

Должно быть: ≥2 валидных schema. НЕТ duplicates!
```

**Красный флаг:** дубль Review schema (REHub + Rank Math) → Google может понизить ranking.

### 3. Mobile rendering

- Safari iOS (iPhone 14 viewport)
- Chrome Android
- Проверяем: offerbox не ломается в узком viewport, accordion открывается
- Скрин в папку `docs/qa/rehub-blocks/<block-name>-mobile.png` если есть bug

### 4. Schema.org duplicate check

Иногда REHub + Rank Math генерят дублирующиеся schemas для одной сущности. Правило:
- **Article schema** — только Rank Math
- **Review schema** — только REHub (pros/cons/scorebox)
- **Product schema** — REHub (wpsm_specification), Rank Math делает НЕ для продуктов
- **FAQPage** — только Rank Math (не используем REHub accordion FAQ)
- **Person schema** — только Rank Math (Author)

В REHub Options → SEO → отключить все schema которые дублируют Rank Math. Оставить только Review/Product.

### 5. Performance impact

Раз в квартал — профилирование:
- GTmetrix waterfall
- Чек что REHub JS bundle не слишком разросся (>300KB минимум, >500KB — проблема)
- Если есть unused JS — проверить какие блоки реально используем, отключить неиспользуемые через REHub Options

## Workflow создания обзора

1. **Writer (AI или человек)** пишет plain markdown draft (как текущий De'Longhi Magnifica S)
2. **Редактор** копирует в WP → Gutenberg
3. **Заменяет ключевые блоки** на REHub shortcodes по этому шаблону:
   - Pros/Cons → `[wpsm_pros]` / `[wpsm_cons]`
   - Блок цен → `[wpsm_offerbox]` или `[wpsm_offer_list]`
   - Taxn. характеристики → `[wpsm_specification]`
   - Рейтинг → `[wpsm_scorebox]`
4. **FAQ** → Rank Math FAQ Block
5. **Author byline** — добавляется автоматом через REHub (или руки, если настройка не включает)
6. **Проверка Rich Results Test** ПЕРЕД публикацией
7. **Пост индексации (7-14 дней)** — проверка Core Web Vitals через PageSpeed Insights
8. **Через 30 дней** — проверка CTR в GSC, решение использовать этот pattern дальше или корректировать

## Файл reference для будущих обзоров

Хранить **один «gold standard» обзор** как living reference:

- Location: `content/popolkam/reviews/obzor-delonghi-magnifica-s-ecam22-110.md`
- Статус после полной разметки в WP: это **template-reference** для всех будущих обзоров popolkam
- Если появляется новый review pattern (например, для mega-guide) — создаём отдельный template: `rehub-guide-template.md`

## Ошибки которые мы НЕ делаем

- ❌ Использовать REHub shortcode «потому что красиво» — должна быть конкретная ценность (schema, affiliate, UX)
- ❌ Дублировать schema (REHub Review + Rank Math Article одновременно для той же сущности)
- ❌ Загружать статью всеми доступными блоками — page weight пострадает
- ❌ Использовать `[wpsm_woo*]` shortcodes — мы не на WC products
- ❌ REHub accordion для FAQ — Rank Math правильнее
- ❌ REHub gallery — core WP достаточно

## Связанные документы

- [`docs/strategies/coffee-machines.md §11`](../strategies/coffee-machines.md) — структура review статьи (каноническая)
- [`docs/personas/popolkam-dmitri-polkin.md §3`](../personas/popolkam-dmitri-polkin.md) — voice и tone
- [`docs/sources.md`](../sources.md) — откуда брать данные
- [`content/popolkam/reviews/obzor-delonghi-magnifica-s-ecam22-110.md`](../../content/popolkam/reviews/obzor-delonghi-magnifica-s-ecam22-110.md) — первый обзор (reference)
