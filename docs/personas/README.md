# Personas — редакционные образы и mascot-ассистенты портфеля

> **Статус:** living document v1 — 2026-04-18
> **Обновляется при изменении canon любого персонажа** (имя, возраст, голосовые правила, экспертные рамки, визуал).

---

## Архитектура персон — two-tier pseudonym + mascot

Каждый сайт портфеля имеет **два типа персонажей**:

### 1. Человек-псевдоним (pen name)

**Литературный псевдоним редакции**, как Гоблин Пучков — открытый, заявленный, не скрываемый. Behind the name: команда редакторов, фактчекеров, специалистов.

- Реалистичная биография: имя, возраст, образование, карьера — собирательный образ из реальной отрасли
- Автор статей через schema.org `Person` с `alternateName`, `sameAs`, `email`
- AI-сгенерированный портрет (consistent pipeline, reverse-image-search-resistant если AI модель хорошая)
- На `/o-avtore/` **открыто** сказано что это pseudonym редакции
- Supporting E-E-A-T infrastructure: email, Telegram, cross-posts
- **Цель:** единый голос + authority + SEO-ranking

### 2. Mascot — интерактивный помощник

Fictional character для UX интерактива:
- Ведёт quiz / matcher / chatbot / notifications
- Визуал plain и memorable
- Голосовая роль: помощник редактора, не замена
- Никогда не подписывается под статьёй
- **Цель:** UX-delight, memorable brand, fun в интерактиве

### Почему именно такой гибрид

| Подход | Плюсы | Минусы | Наш выбор? |
|---|---|---|---|
| Только AI persona («редакционный образ») | Простота | Google double-check'ает AI-authors (риск penalty на scale) | ❌ |
| Только pseudonym без mascot | Safe SEO | UX интерактива безлично | ❌ |
| Только mascot | Memorable | Не ранжируется в review-нише (нет author) | ❌ |
| **Pseudonym + mascot** | Sight SEO + fun UX | Две сущности поддерживать | ✅ |

### Google E-E-A-T: что им нужно

Google **не проверяет паспорт** автора. Проверяет:
- **Consistency** — то же имя, лицо, bio везде
- **Disclosure** — прозрачно сказано что это
- **Digital presence** — упоминания, backlinks, cross-posts, email, social

Если у нас Pseudonym + поддерживающая инфра (email + /o-avtore/ + schema.org + Telegram опционально) — это **равно по силе** с real-person author в глазах Google. Примеры: Goblin Пучков, The Economist (no bylines), многие tech-блоги с pen names.

Подробнее — в canon-документе каждой персоны §5 «Disclosure, этика, E-E-A-T инфраструктура».

---

## Реестр персонажей портфеля

### popolkam.ru — кухонная техника

| Тип | Имя | Роль | Canon |
|---|---|---|---|
| 👨‍🔧 Human | **Дмитрий Полкин** | Автор обзоров, инженер-механик | [popolkam-dmitri-polkin.md](popolkam-dmitri-polkin.md) |
| 🤖 Mascot | **ПО-3000** | Ассистент для quiz / matcher / chatbot | [popolkam-po3000.md](popolkam-po3000.md) |

### aykakchisto.ru — бытовая химия + уборка + техника для уборки

| Тип | Имя | Роль | Canon |
|---|---|---|---|
| 👩‍🔬 Human | **Дарья Метёлкина** | Автор обзоров, химик по образованию | [aykakchisto-darya-metyolkina.md](aykakchisto-darya-metyolkina.md) |
| 💧 Mascot | **Дроп** (Drop) | Ассистент для quiz / matcher на aykakchisto | [aykakchisto-drop.md](aykakchisto-drop.md) |

### 4beg.ru — беговые кроссовки и экипировка

| Тип | Имя | Роль | Canon |
|---|---|---|---|
| 🏃 Human | TBD | Автор обзоров | _Определяем при миграции сайта_ |
| 👟 Mascot | TBD | Ассистент | _Определяем при миграции_ |

---

## Правила при работе с персонами

1. **Голос не смешиваем.** Дмитрий не пишет про уборку, Дарья не пишет про кофемашины. Если статья пограничная — честно выбираем голос по основной теме.
2. **Disclosure честный.** На каждой странице /o-avtore/ + в footer явно указано что это редакционный образ.
3. **Visual consistency.** AI-генерация всех портретов по единому pipeline (same prompt template, same style, same lighting). Не «каждый раз новое лицо».
4. **Schema.org Person обязательно** на всех статьях с `author` → `Person` → `description` содержит «редакционный образ».
5. **Mascot не пишет статьи.** Mascot ТОЛЬКО в интерактивных ролях (UI, chat, notifications). Если mascot «говорит» что-то — ясно что это UI, не экспертная позиция.
6. **AI-команды в SCC** используют system prompt с голосом конкретной персоны (см. `popolkam-dmitri-polkin.md §voice-rules`).

---

## Workflow при добавлении нового сайта

1. Определить expertise-angle (какую область закрывает)
2. Написать human canon по шаблону Дмитрия Полкина (био / образование / voice rules / категории)
3. Сгенерировать consistent portrait через AI pipeline
4. Придумать mascot — character matching site's tone
5. Сгенерировать mascot visual
6. Создать `docs/personas/<site>-<name>.md` для обоих
7. Обновить этот README (реестр)
8. Обновить `docs/strategies/<niche>.md` с указанием на персонажа
9. Установить в WP: Schema.org Person, /o-avtore/ page, author byline template

---

## Связанные документы

- `docs/business-model.md §11` — почему two-tier, economic rationale
- `docs/brand/aykakchisto/` — визуальная brand-система aykakchisto (где mascot Дроп появится)
- `docs/brand/popolkam/` — визуальная brand-система popolkam (где mascot ПО-3000 появится)
- `docs/strategies/` — где каждая рубрика ссылается на соответствующего персонажа
- `memory/reference_personas.md` — pointer для AI-ассистента
