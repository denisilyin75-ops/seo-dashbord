# 3-day Design Sprint — все 3 сайта портфеля

> **Сроки:** 3 дня (08-10 мая 2026)
> **Цель:** дизайн-ассеты для popolkam.ru + aykakchisto.ru + 4beg.ru, готовые к деплою. Где Claude artifacts вырулит — там Claude.
> **Принцип:** small batch, immediate feedback. Запросил artifact → user одобрил → переходим к следующему.

---

## Total scope: 33 артефакта

| Сайт | Logo | Brand kit doc | Persona portrait | Mascot | Hero × 5 | Featured × 3 | OG × 3 | Favicon | Total |
|---|---|---|---|---|---|---|---|---|---|
| **popolkam** | ✅ done | ✅ done | 1 | 1 | 5 | 3 | 3 | ✅ done | **13** |
| **aykakchisto** | ✅ done | ✅ done | 1 | 1 | 5 | 3 | 3 | ✅ done | **13** |
| **4beg** | 1 | 1 | 1 | (skip) | 4 | (skip) | 1 | 1 | **9** |
| **Total** | | | | | | | | | **33 — 4 done = 29 to make** |

---

## Brand colors (фиксируем сейчас)

### popolkam.ru ✅
- **Orange #f97316** primary
- **Red #ef4444** gradient end (только на container)
- Paper #FAFAF9, Ink #0f172a, Slate #64748b
- Gradient: `linear-gradient(135deg, #f97316, #ef4444)`

### aykakchisto.ru ✅
- **Navy #1E3A5F** primary
- **Copper #E8A04C** accent (одна точка на композицию)
- Paper #F4F6F8

### 4beg.ru — РЕШАЕМ СЕЙЧАС
**Гипотеза 1 (рекомендую):** Carbon Black + Lime Neon
- **Carbon #0F172A** primary (deep navy-черный, "track at night")
- **Lime #84CC16** accent (track-and-field neon — отличает от Nike/Asics красно-оранжевых клише)
- Paper #FAFAFA

**Гипотеза 2:** Cobalt + Signal Orange
- **Cobalt #1E40AF** primary
- **Signal Orange #F97316** accent (но мы в этом цвете уже popolkam — пересечение)

**Гипотеза 3:** Asphalt + Energy Yellow
- **Asphalt #1F2937** primary
- **Yellow #FBBF24** accent

**Решение:** **Carbon Black #0F172A + Lime #84CC16** — отличается от popolkam (orange) и aykakchisto (navy+copper), визуально читается как "running track"

---

## Pipeline по дням

### День 1: popolkam (8 артефактов)

| # | Артефакт | Tool | Где использовать |
|---|---|---|---|
| 1.1 | Дмитрий Полкин — author portrait (PNG) | Claude image gen ИЛИ stock | /o-avtore/, Schema.org Person, post bylines |
| 1.2 | Hero illustration — homepage (SVG) | Claude artifact | replace emoji 👤 в block "Кто пишет" |
| 1.3 | Hero illustration — /kak-my-testiruem/ (SVG) | Claude artifact | методология: dB meter + stopwatch + ваттметр + cup |
| 1.4 | Hero illustration — /partnerskie-ssylki/ (SVG) | Claude artifact | прозрачность: open hand / handshake |
| 1.5 | Hero illustration — /o-avtore/ (SVG) | Claude artifact | abstract espresso pour with engineering elements |
| 1.6 | ПО-3000 mascot illustration (SVG) | Claude artifact | future quiz/chatbot UX, sticky CTA |
| 1.7 | OG-images × 3 (1200×630 PNG) | Claude artifact + Canva-style | homepage, /o-avtore/, /kak-my-testiruem/ |
| 1.8 | Featured images × 3 (lifestyle, не product) | Claude artifact | Top-10 hero, /partnerskie-ssylki/, generic articles |

### День 2: aykakchisto (8 артефактов)

| # | Артефакт | Tool | Где использовать |
|---|---|---|---|
| 2.1 | Дарья Метёлкина — author portrait | Claude / stock | /о-авторе/ |
| 2.2 | Hero illustration — homepage | Claude artifact | главная — chemistry/clean lifestyle |
| 2.3 | Hero — /как-мы-тестируем/ | Claude artifact | spectrometer + spray bottle + microfiber + iPad |
| 2.4 | Hero — /партнёрские-ссылки/ | Claude artifact | прозрачность для нас |
| 2.5 | Hero — /о-авторе/ | Claude artifact | molecule pattern with cleaning supplies |
| 2.6 | Дроп mascot (антропоморфная капля) | Claude artifact | future quiz/chatbot |
| 2.7 | OG-images × 3 | Claude artifact | homepage + key pages |
| 2.8 | Featured images × 3 | Claude artifact | бытовая химия lifestyle |

### День 3: 4beg + finishing (9 артефактов)

| # | Артефакт | Tool | Где использовать |
|---|---|---|---|
| 3.1 | 4beg logo (SVG main + mono) | Claude artifact | header, footer, OG |
| 3.2 | 4beg favicon (SVG 32×32) | Claude artifact | browser tab |
| 3.3 | Брендкит-док (markdown с swatches) | Claude artifact | docs/brand/4beg/README.md |
| 3.4 | Артём Спиридонов — author portrait | Claude / stock | /о-авторе/ |
| 3.5 | Hero — homepage | Claude artifact | running silhouette + sunrise |
| 3.6 | Hero — /о-авторе/ | Claude artifact | Артём running portrait abstract |
| 3.7 | Hero — /как-мы-тестируем/ | Claude artifact | sneaker + treadmill + measuring tools |
| 3.8 | Hero — top-rankings page | Claude artifact | medal/podium/award abstract |
| 3.9 | OG-image — main | Claude artifact | social share |

---

## Claude prompt templates (готовые к запуску)

### Шаблон A — Author portrait (литературный псевдоним)

```
Generate a photorealistic professional headshot portrait, 4:5 aspect ratio.

Subject: {{persona-description}}
Style: documentary photography, natural soft lighting, modern blurred background.
Mood: friendly but serious, trustworthy, technical expertise visible.
Background: subtle hint of {{niche-context}} (out-of-focus).
Clothing: smart casual, no logos.

DISCLOSURE: This will be used for a literary pseudonym character.
The site discloses this in /о-авторе/ as required by E-E-A-T best practices.
Style should look human-realistic but slightly cleaner than candid photography.

Output: PNG, 1200×1500 px, transparent or neutral gradient background.
```

**Variables per site:**
- popolkam: «Russian male, 38, mechanical engineer background, espresso machine slightly visible»
- aykakchisto: «Russian female, 40, chemistry/lab background hint, cleaning supplies softly visible»
- 4beg: «Russian male, 37, athletic build, running gear OK in lower frame, finish line / track visible»

### Шаблон B — Hero illustration (SVG)

```
Generate an SVG hero illustration, 1200×630 viewBox, flat-style.

Theme: {{page-theme}}
Brand colors:
  - primary: {{primary-hex}}
  - accent: {{accent-hex}}
  - paper: {{paper-hex}}
  - ink: #0f172a (text/dark elements)

Style: Modern flat illustration with light geometric shapes,
isometric perspective, generous whitespace. NO real product brands visible
(no DeLonghi, Nike, Mr. Proper, etc — only generic).
Composition: subject occupies left 60%, right 40% empty for text overlay.
Output: clean SVG with viewBox="0 0 1200 630", no <foreignObject>, no embedded raster.
```

**Variables per page:** см. таблицы выше

### Шаблон C — OG image (1200×630 для соцсетей)

```
Generate a 1200×630 OG image for social media share.

Site: {{site-name}}
Page: {{page-title}}
Brand colors: {{primary}}, {{accent}}, {{paper}}, ink {{ink}}

Layout:
- 60% area: subject illustration (см. hero brief)
- 40% area: text overlay area (we'll add page title in WordPress, just visible space)
- Logo bottom-right corner (small)
- Brand color border 4px on outside edges

Output: SVG OR high-res PNG ready to crop to 1200×630.
```

### Шаблон D — Mascot (для popolkam ПО-3000, aykakchisto Дроп)

См. подробные брифы в:
- `docs/personas/popolkam-po3000.md`
- `docs/personas/aykakchisto-drop.md`

Формат: SVG character с 3 поз — neutral / talking / pointing.

### Шаблон E — 4beg logo

```
Generate a logo for "4beg.ru" — Russian running shoes review affiliate site.

Concept: minimal mark + wordmark.
Mark: stylized "4" that morphs into a running figure / shoe sole / track.
OR alternative: abstract "running line" forming an arrow forward.

Brand: Carbon Black #0F172A (mark), Lime #84CC16 (accent dot/element), white (cutouts).
Wordmark font: bold modern sans (similar to Inter / Manrope / Suisse Int'l).

Variants requested:
- Main horizontal lockup (mark + "4beg") 320×80
- Square mark only 200×200
- Mono dark version (для светлого фона)
- Mono light version (для тёмного фона)

Output: SVG для всех вариантов, viewBox чёткий.
```

---

## Где Claude НЕ подходит (обозначаем)

- **Real product photos** (DeLonghi Magnifica на белом фоне) — manufacturer media kits / Я.Маркет / Content Egg
- **Photo-realistic specific human face** (если хотим конкретного актёра) — stock photo / paid model
- **Complex animated GIFs** — отдельно
- **3D rendering** — Blender / Spline (отдельно)

Для всего вышеперечисленного — manual / external tools.

---

## Чек-лист после генерации (per артефакт)

- [ ] Артефакт сохранён в `docs/strategies/assets/{site}/{name}.{ext}`
- [ ] Загружен в WP media библиотеку соответствующего сайта
- [ ] Применён в нужном месте (page content / theme_mod / Schema.org)
- [ ] Проверен визуально на live сайте
- [ ] Закоммичен в git (если SVG — да; если PNG > 500 КБ — gitignore)

---

## Расписание сегодня

**Если стартуем сейчас (день 1, popolkam):**

1. Шаг 1.2 (homepage hero SVG) — самый видимый, прямо сейчас
2. Получаем визуал → user одобряет/корректирует → деплоим
3. Шаг 1.3 (kak-my-testiruem hero)
4. ... и так далее

**Параллельно решить про 4beg colors** (до дня 3): подтверди гипотезу 1 (Carbon + Lime) или предложи свою.

---

## Метрики успеха sprint'а

- [ ] У каждого сайта **уникальный visual identity** (нет визуального плагиата друг у друга)
- [ ] Каждая live страница имеет **branded hero** (не Unsplash generic)
- [ ] Для каждого сайта Schema.org Person.image + OG image работают
- [ ] 0 emojis в hero-секциях (все заменены на SVG/illustrations)
- [ ] PSI mobile score не упал >5 пунктов после добавления изображений (SVG inline или WebP)

---

*Owner: Денис*
*Implementer: Claude artifacts + я (deploy)*
*Last updated: 2026-05-07*
