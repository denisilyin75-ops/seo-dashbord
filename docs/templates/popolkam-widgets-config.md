# popolkam.ru — рекомендованный widgets-config (после применения Theme Options)

> Применять **после** того как rehub-options.json и customizer.dat загружены.
> Каждый виджет = 4-6 кликов в wp-admin. На все ~10 минут.

## Sidebar locations REHub (где виджеты появляются)

| ID | Где показывается | Использовать? |
|---|---|---|
| `rhsidebar` | Sidebar архивов и singular постов (главный) | ✅ Да |
| `rhcustomsidebar` | Альтернативный sidebar (assignable per post) | ⏭ позже |
| `rhcustomsidebarsec` | Второй альтернативный | ⏭ позже |
| `blog-sidebar` | Sidebar блог-листа | ✅ Да (минимально) |
| `footerfirst` | Footer column 1 | ✅ Да |
| `footersecond` | Footer column 2 | ✅ Да |
| `footerthird` | Footer column 3 | ✅ Да |
| `footercustom` | Footer column 4 / custom | ✅ Да |
| `dealstore-sidebar` | Sidebar страниц deals | ⏭ когда Content Egg |

## Recommended starter set (Phase 0 — без Content Egg)

### `rhsidebar` (3 виджета)

**1. ReHub: Tabs** (latest_tabs_widget)
- Title: «Что почитать»
- Tab 1: «Свежие обзоры» → `recent posts` → 6 постов
- Tab 2: «Популярные» → `most viewed` (если есть) или `most_commented` → 6 постов
- Show thumbnail: ✓
- Path: **Appearance → Widgets → rhsidebar → + → ReHub: Tabs**

**2. ReHub: Sticky on scroll**
- Title: «Подобрать кофемашину»
- Custom HTML / Image: фото 320×240 + кнопка «Открыть подбор» → ссылка на quiz/category page
- Sticky: ✓ (прилипает при скролле)
- Path: **Appearance → Widgets → rhsidebar → + → ReHub: Sticky on scroll**

**3. ReHub: Better menu** (better_menu)
- Title: «Категории»
- Menu source: «Главное меню» (или категории)
- Show post count per item: ✓
- Path: **Appearance → Widgets → rhsidebar → + → ReHub: Better menu**

### `footerfirst` (1 виджет)

**ReHub: Posts List** (posts_widget)
- Title: «Лучшие обзоры месяца»
- Show: 4 posts
- Order: most viewed (или by date)
- Show thumbnail: ✓
- Excerpt length: 0 (только title + date)

### `footersecond` (1 виджет)

**ReHub: Better Categories** (better_woocat) — или **WP Categories**
- Title: «Рубрики»
- Show count: ✓
- Hide empty: ✓

### `footerthird` (1 виджет)

**Text widget**
- Title: «Об авторе»
- Content (HTML):
  ```html
  <p>Дмитрий Полкин — инженер МГТУ Баумана, обзорщик кофемашин с 2018 года.</p>
  <p><a href="/o-avtore/" class="rh-button-secondary">Подробнее →</a></p>
  ```

### `footercustom` (1 виджет)

**ReHub: Social icons** (social_link)
- Title: «Мы в соцсетях»
- Telegram URL: (пока пусто, добавим когда заведём канал)
- VK URL: (опц.)
- RSS: `https://popolkam.ru/feed/`

## После добавления

- [ ] Открыть https://popolkam.ru/ — проверить footer 4 колонки
- [ ] Открыть любой обзор — проверить sidebar (3 виджета сверху вниз)
- [ ] Mobile: убедиться что sidebar складывается под контент

## Что НЕ настраиваем сейчас (ждём Content Egg)

- ❌ ReHub: Top Offers — нужен Content Egg для источника товаров
- ❌ ReHub: Featured Slider — нужны featured images у драфтов сначала
- ❌ ReHub: Deal of day — для WooCommerce-товаров
- ❌ ReHub: Latest Woo Comparisons — для woo-товаров

Эти виджеты вернёмся настраивать на след. этапе после покупки Content Egg.
