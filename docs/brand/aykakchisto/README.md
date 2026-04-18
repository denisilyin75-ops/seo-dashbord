# Brand System — «Ай как чисто!»

> Бренд-идентичность для aykakchisto.ru. Создана 2026-04-18 по промпту.
> Концепция: стилизованная кириллическая «А», перекладина которой — S-кривая
> (читается как воздух / выдох). Один медный акцент — точка выхода «дыхания».

---

## Концепция

**Mark** — кириллическая «А», где:
- Две ноги (ink) = geometric construction: apex (50,14), база (18,86) / (82,86)
- Перекладина — S-curve вместо горизонтали = **exhale / breath** визуально
- Медная точка в выходе кривой = **единственное** использование акцентного цвета

Лого одновременно несёт две идеи: **«А» для бренда** + **дом с проходящим через него воздухом** (перекладина-кривая = воздушный поток). Tagline «Дом, в котором дышится» из этого напрямую.

## Палитра (строгая, без расширений)

| Роль | HEX | Назначение |
|---|---|---|
| **Ink** | `#1E3A5F` | Основной цвет mark + wordmark + body text |
| **Copper** | `#E8A04C` | Акцент — **одна точка на всю композицию** (breath exit, подпись !, hover state). **Не для фонов, не для заголовков, не для плашек.** |
| **Paper** | `#F4F6F8` | Основной фон (off-white с лёгким холодным оттенком) |

Вне этой палитры — только стандартные серые (#5B6166 для вторичного текста, #1A1A1A для максимально жирного). Успех / ошибка — приглушённые классические зелёный / красный.

## Типографика

- **Headings / wordmark:** Unbounded Medium 500 (Google Fonts) — геометрический гротеск с характером
- **Body:** Inter Regular / Medium — гуманистический гротеск, читаемость в любых размерах
- **Mono (цифры, цены, ингредиенты):** JetBrains Mono

Fallback chain: Unbounded → Inter → Helvetica Neue → system-ui.

## Файлы в папке

| Файл | Назначение |
|---|---|
| [`logo-mark.svg`](logo-mark.svg) | Символ (только mark) — для favicon большого размера, схемы, метаданных |
| [`favicon.svg`](favicon.svg) | Оптимизированный favicon (16-32px, толщина штриха +15% для optical clarity) |
| [`logo-mark-mono-light.svg`](logo-mark-mono-light.svg) | Mono-белый для тёмных фонов (header section, photo hero) |
| [`logo-lockup-horizontal.svg`](logo-lockup-horizontal.svg) | Символ + wordmark + tagline в одной композиции — для header сайта и outgoing материалов |
| [`Logo.html`](Logo.html) | Standalone интерактивный viewer всей системы (открыть в браузере) |
| [`design-canvas.jsx`](design-canvas.jsx) | React-компонент бренд-canvas (8 artboards с construction grid, rejection panel, masthead mock) |
| [`logo-mark.jsx`](logo-mark.jsx) | React-компонент `<LogoMark />` и `<Wordmark />` — source of truth для геометрии |

## Чего нет в марке (документировано осознанно)

- ❌ Резиновые перчатки, распылители, пузыри
- ❌ Блёстки, звёздочки, sun-rays
- ❌ Градиенты, 3D-глянец, металлический блеск
- ❌ Акварельные пятна, hand-drawn charm
- ❌ Латиница «Ay Kak Chisto» — только Cyrillic
- ❌ Пастельно-розовые / мятно-зелёные оттенки
- ❌ Stock «улыбающаяся женщина в перчатках»
- ❌ Религиозные / эзотерические символы

Отказ — вполне продуктовый: мы editorial-бренд (химик + редакция), не TikTok-блог про уборку.

## Где применяем

### В WordPress (aykakchisto.ru)

1. **Site Icon (favicon)** — `favicon.svg` → WP-admin → Appearance → Customize → Site Identity → Site Icon
2. **Header logo** — `logo-lockup-horizontal.svg` как тема-лого REHub (или child theme customizer)
3. **Author box Дарьи Метёлкиной** — `logo-mark.svg` как decoration рядом с Person schema
4. **Open Graph image** (генерируется отдельно) — композиция на paper фоне с mark + wordmark + tagline + featured image

### В маркетинге / вне сайта

- Email-signature — `logo-lockup-horizontal.svg` компактно
- «Памятки» (см. бриф §16) — mark в левом верхнем углу карточки, 40px высота
- Социальные аватары — `logo-mark.svg` на paper фоне квадратом
- Slide decks — `logo-mark-mono-light.svg` на ink фоне

## Чек-лист применения (перед публикацией)

- [ ] Медный акцент **только в одной точке** композиции
- [ ] Минимальный clear space вокруг mark = половина его ширины
- [ ] Минимальный размер для mark = 24×24px (меньше — используем favicon.svg с thicker strokes)
- [ ] Wordmark НЕ растягивается и НЕ сжимается по X — только пропорционально
- [ ] Восклицательный знак в wordmark обязателен (но небольшой, «спокойный»)
- [ ] При mono-версии (одноцветной) — медный акцент исчезает, заменяется той же краской

## Ссылки

- [Канва бренд-системы в HTML-виде](Logo.html) — открыть в браузере, все 8 artboards наглядно
- [`Downloads/ay-kak-chisto-brief.md`](../../../Downloads/ay-kak-chisto-brief.md) §10 — оригинальный бренд-бриф (палитра, шрифты, ограничения)
- [`docs/strategies/cleaning.md`](../../strategies/cleaning.md) — стратегия рубрики, где бренд применяется
