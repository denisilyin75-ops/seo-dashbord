# 4beg.ru — brand kit

> **Niche:** обзоры беговых кроссовок (RU). Affiliate / Admitad + Я.Маркет.
> **Persona:** Артём Спиридонов (литературный псевдоним редакции). См. `docs/personas/4beg-artem-spiridonov.md`.
> **Tone:** спокойный экспертный регистр, замеры в граммах/мм/мс, личный пробег после замеров.
> **Status:** v1 — 2026-05-08 (создан в 3-day design sprint).

---

## 1. Палитра

```
┌──────────────────────────────────────────────────┐
│  Carbon Black  #0F172A   primary, mark, body     │
│  Lime Neon     #84CC16   accent, motion, CTA     │
│  Asphalt       #1E293B   gradient stop end       │
│  Paper         #FAFAFA   primary background      │
│  Slate         #64748B   secondary text          │
│  White         #FFFFFF   card / cutout           │
└──────────────────────────────────────────────────┘

Gradient (only on container elements):
  linear-gradient(135deg, #0F172A → #020617)
```

Никогда не использовать:
- ❌ Красный / оранжевый — клише Nike/Asics + конфликт с popolkam
- ❌ Синий насыщенный — конфликт с aykakchisto navy
- ❌ Pure white background — слишком офисно для running niche

---

## 2. Лого

| Файл | Использовать |
|---|---|
| `logo-mark.svg` (200×200) | square mark, social avatars, large hero badges |
| `logo-lockup-horizontal.svg` (360×90) | website header, email signature |
| `favicon.svg` (64×64) | browser tab |

**Концепт:**
- «4» — основной символ, белый на carbon-фоне, с простой геометрией (без засечек)
- Кроссовок-силуэт справа от «4», лайм-зелёный — символ движения
- Track lines под маркой — отсылка к беговой дорожке
- Лайм-точка в правом-верхнем углу square mark — сигнал «active», как пульсация

**Wordmark:** `4`<span style="color:#84cc16">`beg`</span> — две части: «4» в carbon, «beg» в lime → визуально читается как «4beg» = «4 для бега» / «for run».

---

## 3. Типографика

| Использование | Шрифт | Notes |
|---|---|---|
| Headings (H1, H2, H3) | DM Sans 800 | weight bold, tracking tight |
| Body text | DM Sans 400 | line-height 1.55 |
| Mono (замеры, dB, ms) | JetBrains Mono 600 | для числовых значений |
| Display (hero) | DM Sans 800 + letter-spacing -1.5 | большие H1 |

---

## 4. Иконография — running niche specific

Ключевые объекты, которые рекомендую использовать в иллюстрациях:

| Объект | Когда применять |
|---|---|
| 👟 Беговой кроссовок (силуэт) | hero / featured, cutaway возможен |
| ⏱ Stopwatch / chrono | замеры темпа, секундомер |
| 📏 Линейка / drop-meter | drop в мм, midsole stack |
| 🏁 Finish line / chequered | соревновательная тема |
| 🌅 Sunrise / dawn | утренние тренировки |
| 🛣 Track lines (4 параллельные полосы) | running track, motion |
| 📊 Heart rate / pace chart | тренировочные данные |

---

## 5. Mascot — TBD

Память (`reference_personas.md`): «4beg.ru — TBD».

**Гипотезы для будущего mascot:**
1. **Подошва** — антропоморфный кроссовок-tread/sole с лицом (фраза «без замеров — никуда»)
2. **Хроно** — антропоморфный stopwatch с лицом (точность времени)
3. **Финишинг** — silhouette фигура с финиш-лентой

**Решение:** отложить до Q3 2026 — сначала набираем 30+ обзоров. Mascot нужен только для quiz/chatbot UX, не для статей.

---

## 6. Связанные документы

- `docs/personas/4beg-artem-spiridonov.md` — Артём Спиридонов canon
- `docs/strategies/running-shoes.md` — стратегия рубрики
- `docs/strategies/assets/4beg/` — все brand assets

---

*Owner: Денис · Last updated: 2026-05-08*
