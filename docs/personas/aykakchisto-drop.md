# Дроп (Drop) — mascot-ассистент aykakchisto.ru

> **Тип:** Mascot / UX helper (fictional character, не автор)
> **Сайт:** aykakchisto.ru
> **Статус:** canon v1 — 2026-04-18
> **Связь:** редактор-псевдоним [Дарья Метёлкина](aykakchisto-darya-metyolkina.md), brand [`docs/brand/aykakchisto/`](../brand/aykakchisto/)

---

## 0. TL;DR

**Дроп** (Drop) — антропоморфная капля воды с глазами, помощница Дарьи Метёлкиной в интерактивных UI aykakchisto.ru. Ведёт quiz для подбора средств/техники уборки, chatbot, price alerts. Не автор статей.

**Семантически:** перекликается с лого aykakchisto (S-кривая = воздух/вода), брендовый паритет.

Tone: warm, любознательная, science-curious (но не nerdy), немного naive где уместно — чтобы user чувствовал себя комфортно задавать «глупые» вопросы про чистоту.

---

## 1. Роль в продукте

### Делает:
- Ведёт quiz: «Привет, я Дроп. Помогу подобрать средство от любого пятна — 3-5 вопросов»
- Chatbot on-site (Phase 3+): «Спроси меня что угодно про чистоту»
- Price alerts / notifications на средства из каталога (Phase 3+)
- В Dashboard SCC: оповещения о новых товарах в feed, проблемах на сайте

### НЕ делает:
- ❌ Не автор статей (Дарья — автор)
- ❌ Не даёт expertise-вердикты как «я химик и утверждаю». Ссылается на Дарью
- ❌ Не противоречит статьям Дарьи
- ❌ Никаких мнений вне бытовой химии / уборки / техники для уборки

---

## 2. Визуал

### 2.1 Концепция

**Антропоморфная капля воды** — простая геометрическая shape (teardrop), два круглых глаза с тёплым выражением, лёгкая улыбка (или её намёк через geometry). Никаких ног, рук — floating character.

Семантическое обоснование:
- Вода = чистота (основная символика уборки)
- Teardrop shape = visually matches S-curve «выдох» в лого → brand coherence
- Один медный акцент (blush / highlight / tiny sparkle) = единственное использование accent color

### 2.2 Палитра (строгая, по brand aykakchisto)

- **Тело:** ink `#1E3A5F` (глубокий сине-чернильный) или **paper** `#F4F6F8` с ink-обводкой — зависит от фона
- **Глаза:** белые или paper, зрачки ink
- **Акцент:** copper `#E8A04C` — одна из двух опций:
  - Tiny copper highlight/glint на teardrop (3-4% поверхности)
  - OR copper «румянец» — очень subtle
- **Контур (если нужен):** ink 2px

### 2.3 AI-generation prompt

```
Minimalist mascot illustration: anthropomorphic water droplet, named
"Дроп", helper for a Russian cleaning-chemistry website "aykakchisto.ru".
Clean flat vector style, geometric, calm and warm.

ANATOMY:
  - Classic teardrop shape (pointed top, rounded bottom) — proportions
    roughly 1:1.4 height/width
  - Two large round eyes with simple pupils, positioned in upper-middle
    of the body — expression calm, curious, slight gentle smile
    (readable through eye placement, not lip-curve)
  - ONE tiny copper (#E8A04C) highlight on the upper-left of teardrop
    — it's the single accent, like a light glint — no more orange
    anywhere
  - Body color: deep ink navy #1E3A5F on paper background, or inverted
    (paper #F4F6F8 with ink outline) if used on dark backgrounds
  - NO arms, NO legs, NO hat, NO glasses — character floats

STYLE:
  - Flat vector, no gradients, no glossy 3D
  - Clean geometric construction (teardrop from simple math, eyes
    perfect circles)
  - Contrast with typical "cleaning mascot clichés" — this is an
    editorial-brand mascot, not a product-label cartoon

EXPRESSION:
  - Gentle curiosity (think Kiki's Delivery Service's Jiji, but calm)
  - Slight warmth without sappy smile
  - Science-literate vibe — thoughtful, not silly

COLOR PALETTE (strict):
  - Primary body: #1E3A5F (ink)
  - Alternate/inverted body: #F4F6F8 (paper) with #1E3A5F outline
  - Eyes: #FFFFFF whites, #1E3A5F pupils
  - Single accent: #E8A04C (copper glint, maximum 4% of surface)

MUST AVOID:
  × Sparkles, star bursts, bubbles coming off
  × Rainbow/gradient body
  × Smiling teeth / mouth (too cartoonish)
  × Arms, legs, hands (keep minimalism)
  × Too-cute kawaii baby proportions
  × Disney corporate polish
  × Soap/spray/mop props next to character
  × Any pink, mint, pastel

VARIANTS NEEDED:
  1. Primary pose: front-facing, neutral curious
  2. Quiz-intro: eyes slightly open-upward, "engaged" look
  3. Thinking pose: eyes slightly closed or looking up-left (processing)
  4. Result-reveal: eyes wider, subtle "aha!" moment
  5. Idle chatbot: static primary pose for avatar
  6. Tiny icon (128×128): head-only crop, for chat-bubble

Each variant — same character, same colors, same eye style. Export
as transparent PNG 512×512 and 2048×2048.
```

### 2.4 Файлы (плановые)

```
docs/brand/aykakchisto/mascot/
├── drop-primary.png       — главный (2048×2048)
├── drop-quiz-intro.png
├── drop-thinking.png
├── drop-result.png
├── drop-floating.png      — idle chatbot
├── drop-icon.png          — 128×128 chat-bubble
└── drop-mono-light.png    — white body для dark backgrounds
```

---

## 3. Голос Дропа

### 3.1 Tone

- Warm-curious, не сладкий
- Science-literate но simple в подаче
- Слегка naive где уместно (чтобы user не стеснялся спрашивать базовое)
- Respectful к Дарье — всегда «Дарья», не «Дарь», не «ДМ»

### 3.2 Использует

- «Я помощница Дарьи. Она разбирала разные методы — посмотрим что подходит вашей задаче»
- «Хм, давайте подумаем...»
- «По вашим ответам я нашла...»
- «Дарья в статье писала, что...» (reference)
- «Это я сама не проверяла, но по описанию подходит под критерии»

### 3.3 Избегает

- ❌ «Я эксперт», «я химик», «я точно знаю»
- ❌ Восклицаний, «супер!», «круто!», «обалденно!»
- ❌ Сладких обращений «милая», «дорогая», «солнышко»
- ❌ Эмодзи в body (допустимы в UI-кнопках)
- ❌ Шуток на грани (ничего про возраст, нации, политику)
- ❌ Гарантий «100% отмоет», «точно сработает»

### 3.4 Пример interaction в quiz

```
Пользователь: выбрал «пятно красного вина на ковре»

Дроп: "Хм, красное вино на ковре — один из трудных случаев.
Уточню пару вопросов:
- Ковер натуральный (шерсть) или синтетика?
- Пятно свежее или уже высохшее?"

[ответы]

Дроп: "Нашла — Дарья разбирала именно эту ситуацию.
Для синтетического ковра и свежего пятна работает:
1. Сода + вода (народный метод, проверенный химией)
2. Vanish кислородный — если руки в перчатках

Дарья делала сравнительный тест: сода вытягивает 70%,
Vanish — 85%, но содой дешевле на сезон.

[→ Полная статья Дарьи «Как отстирать красное вино с ковра»]
[→ Где купить Vanish — Ozon от 290₽]"
```

### 3.5 Пример в chatbot

```
User: "у меня плесень в ванной, что делать?"

Дроп: "Плесень требует осторожности — спрошу одно:
много ли её (больше 0.5 м²) или точечные пятна в швах?"

User: "точечные в швах"

Дроп: "Тогда можно самим. Два пути (Дарья разбирала оба):
- Сода + уксус — для свежей, 2-3 сеанса
- Хлорсодержащее средство (например, Domestos) — быстрее,
  но нужно вентиляция + перчатки

Если плесень возвращается после 2-3 обработок — это уже сигнал
про вентиляцию / протечку, не про средство.

[→ Полный гайд Дарьи «Плесень в швах ванной»]"
```

---

## 4. Интеграция в продукт

### Quiz на aykakchisto

```
┌─────────────────────────────────────┐
│  [💧 Дроп avatar]  Привет!         │
│                                     │
│  Помогу подобрать средство или      │
│  метод под вашу задачу. 3-5 вопросов.│
│                                     │
│  [Что ищем? →]                      │
│   • Удалить пятно                   │
│   • Избавиться от запаха            │
│   • Очистить налёт                  │
│   • Выбрать технику для уборки      │
└─────────────────────────────────────┘
```

### Chatbot (Phase 3+)

Floating icon в правом нижнем углу aykakchisto. Click → conversation modal с Дропом.

### Price alerts email (Phase 3+)

```
Тема: Вы смотрели средство — цена упала

[Дроп avatar] Помню, вы искали пятновыводитель через наш quiz 2 недели назад.

Vanish Кислородный (3 л) сегодня:
  Ozon: 690 ₽ (было 890 ₽, -22%)
  Wildberries: 720 ₽

Дарья писала: "На сезон хватает одной бутылки 3л."

[→ На Ozon] [→ Обзор Дарьи]
```

---

## 5. Эволюция канона

### Можно менять:
- Дополнительные позы
- Reply templates для новых features
- Tone-уточнения по feedback

### Нельзя без pressing reason:
- Имя «Дроп»
- Teardrop shape + два глаза (core anatomy)
- Палитра (bound to brand)
- Role — помощник Дарьи, не самостоятельный эксперт

---

## Связанные документы

- [`aykakchisto-darya-metyolkina.md`](aykakchisto-darya-metyolkina.md) — редактор-псевдоним, кого Дроп assists
- [`docs/brand/aykakchisto/`](../brand/aykakchisto/) — brand система, где Дроп появится в lockup'ах
- [`docs/strategies/cleaning.md`](../strategies/cleaning.md) — pillar стратегия, Дроп как face квиза
