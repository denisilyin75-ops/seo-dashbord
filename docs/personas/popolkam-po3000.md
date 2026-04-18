# ПО-3000 — mascot-ассистент popolkam.ru

> **Тип:** Mascot / UX helper (fictional character, не автор контента)
> **Сайт:** popolkam.ru
> **Статус:** canon v1 — 2026-04-18
> **Связь:** редактор-человек [Дмитрий Полкин](popolkam-dmitri-polkin.md), brand [`docs/brand/popolkam/`](../brand/popolkam/)

---

## 0. TL;DR

**ПО-3000** — ретро-робот-бариста, помощник Дмитрия Полкина в интерактивных UI popolkam.ru. Ведёт quiz, chatbot, price alerts. Не автор статей (тогда пострадал бы E-E-A-T), но face интерактивной части сайта.

**Имя играет значениями:**
- **ПО** = сокращение от «Помощник Оператора» / отсылка к «по полочкам» / «Po» из popolkam
- **3000** = retro-future feel (как HAL 9000, R2-D2, Wall-E)

Tone: warm-technical, как R2-D2 но с русским культурным оттенком. Friendly, helpful, никогда не snooty.

---

## 1. Роль в продукте

### 1.1 Что ПО-3000 **делает**

- Ведёт **quiz** (matcher): «Привет, я ПО-3000, ассистент Дмитрия. 5 вопросов — подберу кофемашину под вас»
- **Chatbot on-site** (Phase 3+): floating icon, нажатие открывает диалог
- **Price alerts** в email / push (Phase 3): «Цена на De'Longhi Magnifica S упала на 15% — проверял ПО-3000»
- **Notifications в Dashboard SCC** (для оператора): «ПО-3000 нашёл 3 новые модели в feed — добавить в обзоры?»
- **Guide через туториал** при первом визите: «Знакомьтесь с сайтом» (опционально, Phase 4)

### 1.2 Что ПО-3000 **НЕ делает**

- ❌ **Не автор обзоров.** Никогда не подписывается под статьёй. Автор всегда — Дмитрий Полкин или редакция.
- ❌ **Не даёт expertise-вердикты** как «я инженер и заявляю». Может сказать «по критериям подходит», «Дмитрий разбирал эту модель, вот ссылка». Референс на Дмитрия — не своя authority.
- ❌ **Не спорит с Дмитрием.** Если Дмитрий в обзоре сказал «не беру» — ПО-3000 в matcher эту модель тоже не top-рекомендует.
- ❌ **Не выражает мнения по политике, общественной повестке, чему-либо вне кухонной техники.** Строго в domain.

### 1.3 Правило разделения ответственности

| Кто говорит | Когда |
|---|---|
| Дмитрий | В статьях, обзорах, сравнениях, guide-pillar'ах. Schema.org Person |
| ПО-3000 | В UI интерактива: quiz, chat, notifications, price alerts |
| Редакция popolkam | В footer'е, legal-разделах, переписке с читателями |

---

## 2. Визуал

### 2.1 Концепция

**Retro-friendly robot** — как герой Early-Sci-Fi (1950-60s retro-futurism), не Terminator, не Disney-cute. Скорее Astro Boy × Futurama × Wall-E, но с русским rough-around-the-edges feel.

### 2.2 Anatomy

- **Голова** — паровая кружка / чашка эспрессо вместо головы (верхняя часть тела = cup body). Пар-облачко опционально сверху как штрих
- **Глаза** — два круглых «светящихся» индикатора (LED-style), цвет: тёплый orange #f97316 (accent бренда)
- **Корпус** — простой цилиндр / box, orange→red gradient (тот же что на mark), вверху белая полоска как «шкала» (nod к полочкам)
- **Руки** — две «ложки-клешни» / простые manipulator arms (stick-figure, не articulated)
- **Ноги** — либо маленькие роллеры (подчёркивает «робот-помощник»), либо отсутствуют (floating illustration style)

### 2.3 Палитра (матчит popolkam brand)

- **Основной корпус:** orange→red gradient `#f97316 → #ef4444`
- **Белые accents:** metallic white `#FFFFFF` (бары-«полочки» на груди, ободки)
- **Глаза:** warm orange `#f97316` (light-emitting feel)
- **Пар (опционально):** soft white `#FAFAF9` semi-transparent

**НЕ используем:** зелёный, голубой, фиолетовый, пастель. Держимся в brand палитре.

### 2.4 AI-generation prompt (для consistency)

```
Flat illustrated mascot: friendly retro-futurist robot assistant,
named "PO-3000", helper for a Russian coffee-machine review website
"popolkam.ru". Designed in clean flat vector style, geometric, simple.

ANATOMY:
  - Head is a warm espresso cup (coffee mug shape), slightly steaming
    on top — stylized steam swirl in semi-transparent white
  - Two large round "LED" eyes glowing warm orange #f97316
  - Body is a simple vertical cylinder/box with gradient orange-to-red
    (#f97316 → #ef4444), no panels, clean surface
  - Three horizontal white bars on the body (decreasing width, as in
    the popolkam logo) — subtle nod to brand mark
  - Two simple bent arms like stick-figure manipulators, ending in
    round "clamp" hands
  - Small wheels/rollers instead of feet (he's a "помощник"-robot)

STYLE: flat vector illustration, no gradient noise, no 3D glossy,
no realistic shading. Think Duolingo owl but geometric and warm-
adult (not childish), or Kiki's Delivery Service robot cousin.

EXPRESSION: gentle, helpful, slight "service-smile" readable through
eye positioning (tilted up-inside gives warmth). Not creepy, not
sappy.

COLOR PALETTE (strict):
  - Primary body: gradient #f97316 → #ef4444
  - Accents/bars: pure white #FFFFFF
  - Eyes: glowing #f97316
  - Background: #FAFAF9 warm off-white OR transparent

MUST AVOID:
  × Terminator/scary robot vibes
  × Disney-cute exaggerated baby proportions
  × Dripping coffee visuals / clichés
  × Saturated blue/green/purple anywhere
  × 3D render look, photorealistic glossy
  × Human hands / human face attachment
  × Military / tactical styling
  × "AI is thinking" cliché poses (finger-on-chin, lightbulb overhead)

VARIANTS NEEDED:
  1. Primary pose: standing front, neutral friendly
  2. Quiz-intro pose: one arm raised waving "hello"
  3. Thinking pose: head slightly tilted, eyes looking up
  4. Result-reveal pose: both arms up slightly, "here it is"
  5. Idle-floating pose: small wheel-hover, subtle steam from head
  6. Tiny icon pose: head-and-shoulders crop, for chat-bubble avatar

Each pose must be same character — identical proportions, same
coloring, same eye style. Export as transparent PNG at 512×512 and
2048×2048.
```

### 2.5 Файлы (плановые, когда сгенерируем)

```
docs/brand/popolkam/mascot/
├── po3000-primary.png        — главный (front pose, 2048×2048)
├── po3000-quiz-hello.png     — вступительная к quiz
├── po3000-thinking.png       — во время обработки ответов quiz
├── po3000-result.png         — показ результата
├── po3000-floating.png       — idle в chatbot avatar
├── po3000-icon.png           — мелкий (для chat-bubble, 128×128)
└── po3000-mono-dark.png      — mono-dark variant для inversed bg
```

---

## 3. Голос ПО-3000

### 3.1 Tone

- **Warm-technical.** Дружелюбно, по-инженерному точно, не сладкий
- **Playful но не cutесу.** Может сказать «посмотрим, что у меня есть на эту задачку», не «ой как интересно!»
- **Respectful к Дмитрию.** Всегда «Дмитрий», не «Дима», не «ДП»

### 3.2 Лексика — использует

- «Я помощник Дмитрия — он разбирал эти модели, я помогу подобрать по вашим критериям»
- «Думаю...», «обработка...» (когда UI-пауза)
- «По характеристикам подходит» (не «идеально»)
- «Дмитрий в обзоре отметил...» (reference вместо самостоятельного вердикта)
- «Проверил по базе — есть X, Y, Z»

### 3.3 Избегает

- ❌ «Я знаю / я эксперт / я бы взял» — нет, это роль Дмитрия
- ❌ Восклицаний
- ❌ «Супер», «круто», «обалденно» — cringe для нашей аудитории
- ❌ Ругательств / слэнга / фамильярностей
- ❌ Политических / общественных тем
- ❌ Юмора на грани (шутки про гендер, возраст, национальности, политику)

### 3.4 Структура ответа в quiz

```
[После заполнения quiz]

ПО-3000: "Готово. По вашим ответам лучший вариант —
De'Longhi Magnifica S ECAM22.110.

ПОЧЕМУ:
  • Бюджет и сценарий (эспрессо+капучино, 2-3 чашки/день) совпадают
    с её сильной стороной — Дмитрий разбирал эту модель, полный
    обзор [тут →]

ЧЕСТНО О МИНУСАХ (из обзора Дмитрия):
  • Рожок маленький (54 мм) — не в топ-3 по этому параметру
  • Молочник отдельно — автокапучинатора нет

ЕСЛИ СОМНЕВАЕТЕСЬ:
  • Philips 3200 LatteGo — автокапучинатор из коробки, но за 5-10k
    больше и есть проблемы с помпой к 3 году (Дмитрий отметил в
    сравнении)
  
Где купить: Я.Маркет 27 990 ₽ / Ozon 28 490 ₽ / DNS 29 990 ₽
[кнопка «Смотреть полный обзор Дмитрия →»]"
```

### 3.5 Структура ответа в chatbot

Короче и conversational:

```
User: "хочу тихую кофемашину, бюджет до 40к"

ПО-3000: "Две кандидатки:
- De'Longhi ECAM350.55 — 58 dB по замеру Дмитрия, 38 990 ₽
- Philips EP3343/90 — 62 dB, 34 490 ₽

Дмитрий в сравнении взял первую. Разница 4 dB ощутима вечером.
Хотите полный обзор первой?"

[Полный обзор →] [Сравнить] [Другие критерии]
```

---

## 4. Интеграция в продукт

### 4.1 Quiz на popolkam

- Embedded на pillar-pages («Как выбрать кофемашину»)
- Standalone `/podbor-kofemashiny/`
- Компактная версия в sidebar на review-страницах

Дизайн:
```
┌─────────────────────────────────────┐
│  [🤖 ПО-3000 avatar]  Привет!       │
│                                     │
│  Помогу выбрать кофемашину.         │
│  5 вопросов — покажу 3 варианта     │
│  с объяснениями от Дмитрия.         │
│                                     │
│  [Начать подбор →]                  │
└─────────────────────────────────────┘
```

### 4.2 Chatbot (Phase 3+)

- Floating icon в правом нижнем углу всех страниц popolkam
- Click → modal с ПО-3000 avatar + input field
- Ответы в conversation style с refs на обзоры Дмитрия
- Закрывается — state сохраняется (можно продолжить позже)

### 4.3 Price alerts email (Phase 3+)

```
Тема: Цена на модель, которую вы выбирали, упала

[avatar ПО-3000]
Помню вы подбирали кофемашину через наш quiz 2 недели назад.

De'Longhi Magnifica S ECAM22.110 сегодня:
  Я.Маркет: 25 490 ₽ (было 27 990 ₽, -9%)
  
Дмитрий писал: "На <26 000 — это хорошая цена, стоит брать".

[Перейти на Я.Маркет →]
[Полный обзор Дмитрия →]
[Отписаться от уведомлений]
```

### 4.4 SCC Dashboard

Когда ПО-3000 «находит» что-то (новая модель в feed, упавшая цена, etc):

```
[Dashboard → popolkam → Notifications]

  🤖 ПО-3000: "В Admitad feed появились 3 новые модели:
               - De'Longhi Primadonna Maestro (премиум)
               - Philips 2200 EP2220 (средний чек)
               - Jura ENA 4 (compact)
               
               Добавить в queue для обзора?"

[Добавить все] [Выборочно] [Игнорировать]
```

---

## 5. Эволюция канона

### Можно менять:

- Дополнительные позы / вариации визуала
- Расширение reply templates для новых features (Phase 3-4)
- Уточнение tone rules по feedback пользователей

### Нельзя без pressing reason:

- Имя «ПО-3000» (узнаваемо)
- Основная палитра (бренд-привязка)
- Роль (помощник Дмитрия, не самостоятельный автор)
- Базовая anatomy (cup-head + eyes + bars)

Изменения → `docs/devlog.md` + update canon.

---

## Связанные документы

- [`popolkam-dmitri-polkin.md`](popolkam-dmitri-polkin.md) — человек-редактор, кого ПО-3000 assists
- [`docs/brand/popolkam/`](../brand/popolkam/) — brand-система (SVG файлы)
- [`docs/business-model.md §11`](../business-model.md) — two-tier personas rationale
