# Brand System — popolkam.ru

> **Статус:** v1 (legacy) — существующий SVG-комплект в `docs/strategies/assets/`, **апгрейд запланирован** — через AI-промпт генерируем full brand system аналогично aykakchisto.
> **Персонажи:** [Дмитрий Полкин](../../personas/popolkam-dmitri-polkin.md) (editor) + [ПО-3000](../../personas/popolkam-po3000.md) (mascot)

---

## Концепция бренда

**«popolkam»** — «по полочкам». Идиома = разобрано, ясно, систематизировано. Визуально это передаётся через **три горизонтальных полосы разной длины** — как полки, сужающиеся с вершины (hierarchy signal).

**Палитра:**
- Orange `#f97316` → Red `#ef4444` — теплый градиент (warm-confident, не cold-tech)
- Белый `#FFFFFF` — bars, wordmark accents
- Slate-900 `#0f172a` — текст в body
- Slate-500 `#64748b` — tagline / secondary

**Tone:** pragmatic engineer-reviewer, warm не cozy, technical не cold.

---

## Текущие ассеты (legacy, до апгрейда)

| Файл | Назначение |
|---|---|
| [`../../strategies/assets/popolkam-favicon.svg`](../../strategies/assets/popolkam-favicon.svg) | Favicon 64×64 — градиент + три полосы |
| [`../../strategies/assets/popolkam-logo.svg`](../../strategies/assets/popolkam-logo.svg) | Horizontal lockup 240×64 — favicon + wordmark + tagline |

Работают и выглядят опрятно. Будем апгрейдить до brand system уровня aykakchisto.

---

## План апгрейда (через AI-генерацию)

**Промпт** для генерации полной системы в виде React design canvas — дан в разговоре (см. message «Промпт для popolkam brand system»). По этому промпту получить:

1. **Primary mark** — тот же favicon, но формализованный construction grid
2. **Construction diagram** — математические кости (9:7:5 ratio, 4-8-12 indent, corner radius formula)
3. **Horizontal lockup** — mark + wordmark + tagline (refine существующий)
4. **Vertical/stacked lockup** — mark сверху, wordmark под ним (для квадратных аватаров)
5. **Favicon variant** — оптимизация 16-32px с thicker strokes
6. **Mono dark** — на slate-900 bg, белые bars
7. **Mono light (inverse)** — orange solid + dark bars
8. **Masthead mock** — site-header real-context
9. **Mascot ПО-3000** — integrated в brand system (характер + color palette + поз)
10. **Rejection panel** — what we avoided

Итог: параллельная структура с `docs/brand/aykakchisto/`:
```
docs/brand/popolkam/
├── README.md (этот)
├── Logo.html (viewer)
├── design-canvas.jsx
├── logo-mark.jsx
├── logo-mark.svg
├── favicon.svg (оптимизированный 16-32)
├── logo-lockup-horizontal.svg
├── logo-lockup-vertical.svg
├── logo-mark-mono-dark.svg
├── logo-mark-mono-light.svg
└── mascot/
    ├── po3000-primary.png
    ├── po3000-quiz-hello.png
    ├── po3000-thinking.png
    ├── po3000-result.png
    ├── po3000-floating.png
    └── po3000-icon.png
```

---

## Персонажи (two-tier)

### Дмитрий Полкин — редактор
- Литературный псевдоним редакции popolkam
- Полный canon: [`docs/personas/popolkam-dmitri-polkin.md`](../../personas/popolkam-dmitri-polkin.md)
- AI-портрет планируется — prompt в canon §4.1
- Supporting E-E-A-T: email `dmitri@popolkam.ru` + Telegram (опц.) + cross-posts Phase 2

### ПО-3000 — mascot
- Ретро-робот-бариста, помощник в quiz/chatbot
- Полный canon: [`docs/personas/popolkam-po3000.md`](../../personas/popolkam-po3000.md)
- Визуал планируется — prompt в canon §2.4

---

## Применение (по мере готовности апгрейда)

### В WordPress (popolkam.ru)
1. **Site Icon** — `favicon.svg` → WP-admin Customize
2. **Header logo** — `logo-lockup-horizontal.svg`
3. **Author box Дмитрия** — `dmitri-portrait-circular.png` + Person schema
4. **ПО-3000 avatar** — в quiz widget, chatbot icon
5. **Open Graph image** — композиция с mark + wordmark + featured image per article

### Маркетинг вне сайта
- Email-подпись от имени редакции: `logo-lockup-horizontal.svg`
- Telegram-канал аватар: `logo-mark.svg` (квадрат на paper)
- Cross-posts habr/Я.Дзен: author bio с `dmitri-portrait-circular.png`

---

## Чек-лист применения

- [ ] Оранжево-красный градиент — только на container / mark, **не на bars** (bars остаются чистые белые)
- [ ] Три bars — пропорции 9:7:5, prose indent 4-8-12
- [ ] Минимум clear-space вокруг mark = половина его ширины
- [ ] Минимальный размер mark = 24×24px (ниже — favicon.svg)
- [ ] Wordmark НЕ растягивается по X
- [ ] Tagline ВСЕГДА с tracking 1.2px и UPPERCASE в masthead
- [ ] ПО-3000 появляется **только** в UI-интерактиве, не в статьях
- [ ] Дмитрий подписывает статьи, **не** ПО-3000

---

## Связанные документы

- [`docs/personas/popolkam-dmitri-polkin.md`](../../personas/popolkam-dmitri-polkin.md)
- [`docs/personas/popolkam-po3000.md`](../../personas/popolkam-po3000.md)
- [`docs/personas/README.md`](../../personas/README.md) — общая архитектура персон
- [`docs/strategies/coffee-machines.md`](../../strategies/coffee-machines.md)
- [`docs/brand/aykakchisto/`](../aykakchisto/) — образец brand folder'а
