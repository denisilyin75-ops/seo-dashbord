# Brand Book — popolkam.ru

> **Статус:** v1 comprehensive — 2026-04-18
> **Сайт:** popolkam.ru (кухонная техника, обзоры)
> **Цель:** единый справочник по всей визуальной и content identity popolkam — палитра, лого, типографика, персонажи, tone of voice, правила применения.

---

## 1. Позиционирование

**Что мы:** независимый обзорный ресурс по бытовой технике для кухни. От кофемашин до чайников, блендеров, мультиварок, посудомоек.

**Что не мы:**
- ❌ Магазин (продаём через партнёрские ссылки, сами не принимаем платежи)
- ❌ Техника новостного поля (AV, смартфоны, авто)
- ❌ Большая встраиваемая бытовая техника (холодильники — не наш scope)
- ❌ Химия / уборка (это домен `aykakchisto.ru`, не наша территория)
- ❌ Блог «лайфстайл рецепты» (обзоры + подборки, не кулинария)

**Tone of voice одной фразой:**
> Прагматичный инженер-обозреватель. Тёплый, но не уютный. Технический, но не холодный.

**UVP (Unique Value Proposition):**
> Техника, **проверенная инженером** — не TikTok-блогером с unboxing'ом. Замеры, долгосрочный опыт, честные компромиссы.

---

## 2. Палитра (строгая, без расширений)

| Цвет | HEX | RGB | Где использовать |
|---|---|---|---|
| **Orange (основной)** | `#f97316` | 249, 115, 22 | Главный акцент бренда: градиент container'а лого, кнопки CTA, accent'ы |
| **Red (gradient end)** | `#ef4444` | 239, 68, 68 | Только как второй стоп градиента orange→red на container'ах |
| **White** | `#FFFFFF` | 255, 255, 255 | Bars в логотипе, внутренние элементы на orange-фоне |
| **Paper (фон основной)** | `#FAFAF9` | 250, 250, 249 | Body background вместо белого — тёплый off-white |
| **Ink (текст primary)** | `#0f172a` | 15, 23, 42 | H1/H2/body text |
| **Slate-500 (текст secondary)** | `#64748b` | 100, 116, 139 | Tagline, captions, metadata |
| Успех / ошибка (только в state indicators) | `#16a34a` / `#dc2626` | — | Никогда в бренде, только UX |

**Градиент:** `linear-gradient(135deg, #f97316, #ef4444)` — только на container-элементах (rounded square лого, кнопки). НЕ на bars внутри лого, не на фонах больших площадей.

**Правило 1 акцента:** на странице/экране максимум одна орандж-красная область. Если нужно выделить несколько вещей — используем opacity/shade, не больше цветов.

---

## 3. Логотип

### 3.1 Концепция

**«Полочки»** — три горизонтальных полосы разной длины, стёпенно сужающиеся. Читается как:
1. Аккуратно расставленные полки бытовой техники
2. Ясная иерархия информации («по полочкам» = systematized)
3. Спускающаяся последовательность приоритетов

Container: rounded square с orange→red gradient (warm confidence, не cold tech).

### 3.2 Конструкция favicon (64×64 viewBox)

| Элемент | Параметры |
|---|---|
| Container | rect 64×64, rx=14 (22% corner radius), gradient #f97316→#ef4444 |
| Bar 1 | x=14, y=16, width=36 (56% canvas), height=4, rx=2, fill #FFFFFF opacity 1.0 |
| Bar 2 | x=18, y=28, width=28 (44%), h=4, rx=2, fill #FFFFFF opacity 0.85 |
| Bar 3 | x=22, y=40, width=20 (31%), h=4, rx=2, fill #FFFFFF opacity 0.65 |

**Пропорции bars:** 9:7:5 (приблизительно). Indent слева: 14px → 18px → 22px (step 4px).

### 3.3 Файлы

| Файл | Назначение |
|---|---|
| [`../../strategies/assets/popolkam-favicon.svg`](../../strategies/assets/popolkam-favicon.svg) | Текущий favicon 64×64 (legacy, рабочий) |
| [`../../strategies/assets/popolkam-logo.svg`](../../strategies/assets/popolkam-logo.svg) | Horizontal lockup 240×64 (mark + «popolkam» + tagline) |

### 3.4 Upgrade до полной brand system (в backlog)

Планируется аналог `docs/brand/aykakchisto/` — через AI-generated React canvas. Промпт готов (в чате «Промпт для popolkam brand system»). Целевые файлы:

```
docs/brand/popolkam/
├── Logo.html                            — viewer canvas (все 8 artboards)
├── design-canvas.jsx                    — React layout
├── logo-mark.jsx                        — source of truth (mark + wordmark)
├── logo-mark.svg                        — primary mark
├── favicon.svg                          — оптимизированный 16-32px (+25% stroke)
├── logo-lockup-horizontal.svg           — mark + wordmark + tagline
├── logo-lockup-vertical.svg             — stacked
├── logo-mark-mono-dark.svg              — slate-900 container для photo bg
├── logo-mark-mono-light.svg             — inverse (orange solid + dark bars)
└── mascot/
    ├── po3000-primary.png (2048×2048)
    ├── po3000-quiz-hello.png
    ├── po3000-thinking.png
    ├── po3000-result.png
    ├── po3000-floating.png              — idle chatbot
    └── po3000-icon.png (128×128)
```

---

## 4. Типографика

### 4.1 Стек шрифтов

| Роль | Шрифт | Fallback chain |
|---|---|---|
| **Wordmark «popolkam»** | system-ui, Inter, Roboto | Уже в core браузеров, не нужна загрузка |
| **H1-H3** | Inter | system-ui → sans-serif |
| **Body** | Inter 400/500 | system-ui → -apple-system → Segoe UI |
| **Mono (цифры, цены, специфика)** | JetBrains Mono | «Roboto Mono», monospace |

**Веса:**
- Wordmark: 800 (extra-bold, мы хотим силу)
- H1/H2: 700-800
- H3: 600
- Body: 400 (regular) + 500 (emphasis)
- Tagline: 500 + tracking +1.2px + uppercase для small caps

### 4.2 Размеры (на desktop body 16px)

- H1: 32px / 1.2
- H2: 24px / 1.3
- H3: 19px / 1.35
- Body: 16px / 1.6
- Caption / meta: 13px / 1.4
- Tagline в masthead: 10px uppercase + tracking 1.2px

---

## 5. Персонажи бренда (two-tier architecture)

### 5.1 Человек-редактор: **Дмитрий Полкин**

**Роль:** автор обзоров, schema.org Person якорь, E-E-A-T.

**Кратко:** 38 лет, инженер-механик (МГТУ им. Баумана), 12 лет R&D в бытовой технике. Литературный псевдоним редакции popolkam (как Гоблин = Пучков).

**Категории которые закрывает:**
- Primary: кофемашины, чайники, блендеры, мультиварки
- Secondary: посудомойки, микроволновки, кофемолки, кухонные комбайны
- НЕ: пылесосы/химия (→ Дарья), кроссовки (→ 4beg), холодильники/встраиваемая, AV

**Голос:**
- Использует: «разбирал», «тестировал», «замерил ваттметром», конкретные цифры
- Избегает: «идеально», «лучший в мире», «дорогие читатели», восклицаний

**Канон:** [`docs/personas/popolkam-dmitri-polkin.md`](../../personas/popolkam-dmitri-polkin.md) — полная биография, voice-rules, AI-prompt портрета, schema.org Person, E-E-A-T инфра.

**Визуальный вклад в бренд:**
- Фото-портрет в byline каждой статьи (`dmitri-portrait-circular.png` 48×48 или 200×200 на `/o-avtore/`)
- Консистентный AI-generated portrait pack (6 вариантов)
- Формат подписи: «Автор — Дмитрий Полкин, инженер-механик» + ссылка на `/o-avtore/`

**Disclosure (в каждой статье):**
> *«Дмитрий Полкин» — литературный псевдоним редакции popolkam.ru.*

### 5.2 Mascot-помощник: **ПО-3000**

**Роль:** интерактивный ассистент в UI popolkam (quiz, chatbot, price alerts, notifications). НЕ автор.

**Имя обыграно:**
- **ПО** = Помощник Оператора / Po из popolkam
- **3000** = retro-future feel (HAL 9000, R2-D2, Wall-E)

**Визуал:**
- Ретро-робот-бариста в flat vector стиле
- Голова — espresso cup (кружка с носиком + лёгкий пар)
- Глаза: два round LED, glowing orange `#f97316`
- Корпус: простой цилиндр с gradient `#f97316 → #ef4444`
- Три белые полоски (9:7:5) на корпусе — nod к логотипу
- Руки: stick-figure manipulators / clamp hands
- Ноги: маленькие ролики (он «помощник», не supervisor)

**Tone:**
- Warm-technical, playful но не cute
- «Я помощник Дмитрия. Он разбирал эти модели — я помогу подобрать»
- Всегда ссылается на Дмитрия в case expertise
- Никогда: «я эксперт», «я знаю точно», восклицаний

**Канон:** [`docs/personas/popolkam-po3000.md`](../../personas/popolkam-po3000.md) — AI-prompt (6 поз), voice rules, интеграция с quiz/chatbot/notifications.

**Визуальный вклад в бренд:**
- Face интерактивной части popolkam
- Появляется в quiz widget, chatbot floating icon, email-алертах цен
- Может быть в social-контенте / memes (легко шерится, fictional by design)
- НЕ заменяет логотип (mark остаётся pricing anchor бренда)

### 5.3 Правило разделения ответственности

| Функция | Кто делает |
|---|---|
| Автор статьи (schema.org Article.author) | 👨‍🔧 Дмитрий Полкин |
| Атрибуция под текстом обзора | Дмитрий |
| Ведёт quiz / matcher | 🤖 ПО-3000 |
| Chatbot на сайте | ПО-3000 |
| Email price alerts | ПО-3000 |
| Notifications в SCC Dashboard | ПО-3000 |
| Ответ на юр. вопросы / переписку | Редакция popolkam (не Дмитрий лично, не ПО-3000) |
| Face логотипа | Mark (3 полоски), НЕ персонаж |

---

## 6. Голос и tone

### 6.1 Принципы

1. **Pragmatic engineer-reviewer** — не entertainer, не лектор. Равный диалог с читателем-практиком.
2. **Warm, not cozy** — тёплый в подаче (не robot), но не «дорогая моя» / «милые читательницы».
3. **Technical, not cold** — с цифрами и замерами, но не как datasheet. Цифры **с контекстом**.
4. **Honest about compromises** — каждая модель имеет минусы, признаём их открыто.
5. **Не хайп** — никаких «революционный», «изменит вашу жизнь», «топовый».

### 6.2 Обязательные элементы в каждом обзоре

- Прямой ответ в первые 40 слов
- Блок «Когда не подходит» — честный
- Блок цен в верхней трети (не в конце)
- Минимум 2 ретейлера-партнёра в блоке цен
- FAQ (5-7 вопросов) с FAQPage schema
- Внутренние ссылки на 3-5 релевантных статей
- Подпись Дмитрия + pseudonym disclosure

### 6.3 Запрещено

- Восклицания в лидах и H2
- «Дорогие читатели», «друзья», «ребята»
- «Безусловно», «идеально», «лучший»
- «В этой статье мы расскажем» (SEO-заглушки)
- Эмодзи в теле (допустимы в H1, блоках ПО-3000)
- Скрытые платные обзоры без disclosure

---

## 7. Визуальные правила применения

### 7.1 Minimum sizes

- Mark (логотип): мин. 24×24px. Меньше — использовать `favicon.svg` с thicker strokes
- Wordmark: мин. 16px высоты (иначе нечитаемо)
- Лого-lockup: мин. 160px ширины

### 7.2 Clear space

Вокруг mark — padding минимум **половина ширины mark** (если mark 64px, padding >=32px со всех сторон).

### 7.3 Что можно, что нельзя с mark

| ✅ Можно | ❌ Нельзя |
|---|---|
| Использовать на paper / white background | Ставить на saturated цветные фоны (сломает gradient) |
| Монохромная версия на тёмных фонах (mono-dark) | Менять пропорции (растягивать по X/Y) |
| Увеличивать пропорционально | Добавлять тени / outer glow / эффекты |
| Использовать в rounded / square / circular контекстах | Помещать в другую форму (мы — rounded square, не круг и не pill) |
| Комбинировать с wordmark справа / снизу | Разделять (mark — неделимая единица) |

### 7.4 Mascot ПО-3000 — отдельная форма

- ПО-3000 **не заменяет** логотип
- В quiz/chatbot ПО-3000 — главный визуальный элемент, логотип в шапке
- На social avatars (Telegram-канал) — используем mark (логотип), не ПО-3000
- Merch (если будет): mark = официальный, ПО-3000 = fun / семьи-friendly

---

## 8. Применение в WordPress popolkam.ru

### 8.1 Site Icon / Favicon

```
wp-admin → Appearance → Customize → Site Identity → Site Icon
Upload: popolkam-favicon.svg
Title: "popolkam — кухонная техника по полочкам"
Tagline: "Обзоры, сравнения, честные рекомендации"
```

### 8.2 Header logo

```
REHub theme → Header settings → Logo
Upload: popolkam-logo.svg (240×64)
Alt: "popolkam — обзоры бытовой техники"
```

### 8.3 Author byline в обзорах

```html
<footer class="article-byline">
  <img src="/images/dmitri-portrait-circular.png" alt="Дмитрий Полкин" width="48" height="48" />
  <div>
    <div class="author-name">Дмитрий Полкин</div>
    <div class="author-role">Инженер-механик, редактор popolkam.ru</div>
    <small class="author-pseudonym-note">
      Литературный псевдоним редакции.
    </small>
  </div>
  <a href="/o-avtore/" class="author-more">Об авторе →</a>
</footer>
```

### 8.4 Schema.org Person на каждой странице (через Rank Math Code Snippet)

См. `docs/personas/popolkam-dmitri-polkin.md §5.4` — готовый JSON.

### 8.5 ПО-3000 widget в quiz

```
[wpsm_offerbox]  ← не ПО-3000 тут. offerbox для товаров.
[popolkam_quiz_widget assistant="po3000"]  ← custom shortcode (в плагине popolkam-widgets, TBD)
```

### 8.6 Footer disclaimer

```html
<footer class="site-footer">
  ...
  <p class="disclaimer-line">
    «Дмитрий Полкин» и «ПО-3000» — образы редакции popolkam.ru.
    Партнёрские ссылки не влияют на редакционную позицию.
  </p>
</footer>
```

---

## 9. Open Graph / социальные превью

Для каждой статьи:
- **og:image** 1200×630 — composition: mark в углу (80px) + featured image статьи + H1 (48px Inter 800)
- **og:title** = title статьи
- **og:description** = первые 160 симв лида
- **og:site_name** = "popolkam.ru — кухонная техника по полочкам"

Template для OG-image (Phase 2): автоматическая генерация через WordPress plugin, для Phase 0 — вручную через Figma / Canva.

---

## 10. Чек-лист перед публикацией любого материала

### Визуал
- [ ] Mark / favicon используется в допустимой форме
- [ ] Gradient orange→red только на container, не на bars
- [ ] Palette строго соблюдена (нет blue/green/purple вне state indicators)
- [ ] Минимальные sizes соблюдены

### Персонажи
- [ ] Автор обзора указан: Дмитрий Полкин
- [ ] Pseudonym disclosure в byline + footer
- [ ] Schema.org Person корректный
- [ ] ПО-3000 появляется только в UI-интерактиве, не в тексте статьи

### Tone
- [ ] Прямой ответ в первые 40 слов
- [ ] Нет восклицаний в лидах
- [ ] Блок цен в верхней трети
- [ ] «Когда не подходит» есть
- [ ] Не используется «дорогие читатели», «идеально», «лучший в мире»

### SEO
- [ ] Rank Math schema Article
- [ ] REHub Review schema (через pros/cons/scorebox)
- [ ] Rank Math FAQ Block
- [ ] Нет duplicate schemas

---

## 11. Эволюция брендбука

### Можно менять без формальной процедуры:
- Добавлять новые примеры применения
- Уточнять voice-правила по реальному feedback
- Дополнять mascot поses (новые use-cases)

### Требует согласования:
- Палитра (ядро идентичности)
- Логотип (mark + wordmark)
- Имена персонажей (Дмитрий, ПО-3000)
- Основной tone («pragmatic engineer»)

Изменения core-элементов фиксируем в `docs/devlog.md` + pinned blog entry на Dashboard.

---

## 12. Связанные документы

- [`docs/personas/popolkam-dmitri-polkin.md`](../../personas/popolkam-dmitri-polkin.md) — полный canon Дмитрия (био, голос, категории, E-E-A-T инфра)
- [`docs/personas/popolkam-po3000.md`](../../personas/popolkam-po3000.md) — полный canon ПО-3000 (визуал, голос, UX-интеграция)
- [`docs/personas/README.md`](../../personas/README.md) — общая two-tier архитектура
- [`docs/strategies/coffee-machines.md`](../../strategies/coffee-machines.md) — первая рубрика, где бренд применяется
- [`docs/strategies/kettles.md`](../../strategies/kettles.md) — вторая рубрика (очередь)
- [`docs/templates/rehub-review-template.md`](../../templates/rehub-review-template.md) — как структурировать review с сохранением бренд-правил
- [`docs/brand/aykakchisto/README.md`](../aykakchisto/README.md) — sibling brand book для сравнения
- [`docs/business-model.md §11`](../../business-model.md) — two-tier personas rationale + adjacent fruit
