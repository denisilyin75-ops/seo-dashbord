# popolkam.ru — Design Roadmap

> **Назначение:** план визуальных и UX-улучшений сайта на ближайшие 1-2 месяца. Расставлены приоритеты, отмечено где требуется Claude (artifacts / image gen) и что делается по wp-admin / WP REST.
> **Статус:** v1 — 2026-05-07
> **Текущее состояние** (что уже сделано):
> - REHub theme + Theme Options applied (header style 7, цвет #f97316)
> - Меню в header (9 пунктов с dropdown)
> - Footer: 4 виджета + 5 legal links + popolkam copyright
> - Sidebar: 3 REHub-виджета (Latest Tabs / Sticky CTA / Better Menu)
> - Homepage v2 — single-focus на кофемашины
> - 6 постов с featured images (Unsplash)
> - 4 legal pages + /o-avtore/
> - Cookie banner (152-ФЗ + GDPR)
> - Logo с popolkam SVG, 0 битых ссылок

---

## Принципы дизайна

1. **Single-focus** — пока только Кофемашины. Категории «Уборка/Кухня/Стирка» не показываем (404)
2. **#f97316 везде** — оранжевый = primary action color. Не размываем второстепенными цветами
3. **Mobile-first** — 60-70% трафика по affiliate-нишам с телефона. Тестируем mobile до desktop
4. **CTR > CVR** — главная метрика обзоров: clicks из контента в Я.Маркет/Ozon. Без партнёрских URL обзор не зарабатывает
5. **E-E-A-T everywhere** — каждая статья ссылается на /o-avtore/, /kak-my-testiruem/, /partnerskie-ssylki/

---

## P0 — Критическое (сразу заметно, влияет на конверсию)

### P0-1. REHub offerbox в обзорах ⚡

**Проблема**: в Top-10 (id=52) и 5 драфтах **нет ни одной CTA-кнопки** «Купить». В Top-10 14 секций по моделям, 14 цен текстом, 0 кликабельных переходов.

**Решение**: REHub `[wpsm_offerbox]` shortcode после каждой модели:

```
[wpsm_offerbox showas="moduleoffer" name="DeLonghi Magnifica S ECAM22.110"
  pros="Простой UI; Тихая помпа 56 дБ; Доступная цена"
  cons="Ручной капучинатор; Требует декальцинации каждые 60 чашек"
  price="29 990 ₽"
  buy_btn="Цена на Я.Маркете"
  buy_btn_link="https://market.yandex.ru/search?text=delonghi+magnifica+s+ecam22.110"]
```

**Реализация** (~30 мин моих + 0 твоих):
- Парсер по H2 заголовкам в каждом обзоре → извлечь модель + цену
- Подставить wpsm_offerbox с placeholder Я.Маркет search URL (заменим на партнёрки когда соберёшь URLs)
- Применить через WP REST PATCH на 1 published пост, проверить визуал
- Если ОК — применить на 5 драфтов

**Claude/AI помощь**: нет, чисто парсинг + REHub shortcode

**Приоритет**: НЕМЕДЛЕННО. Без этого сайт = голый текст.

---

### P0-2. Featured images — заменить Unsplash generic на product photos

**Проблема**: на 6 постах сейчас Unsplash «espresso machine» — генерик кофемашина, **не та модель из обзора**. Когда reader открывает «Обзор DeLonghi Magnifica S» и видит Saeco на hero — диссонанс, доверие падает.

**Решение** (3 пути по убыванию приоритета):
1. **Manual paste 5 URLs** (1 час твоего времени): открой Я.Маркет/Ozon карточку каждой модели → копируй URL изображения → закидываешь сюда → я заменяю featured на каждом посту автоматом
2. **Content Egg** (когда купим, на след неделе): он автоматически тянет product photos из source
3. **Claude image artifact**: можем запросить styling-совместимое product visual (no logo) — но для product reviews это плохо, лучше реальное

**Claude/AI помощь**: Claude artifact может **сгенерировать stylized hero illustrations** для:
- Top-10 listicle (без конкретной модели — espresso bar/coffee shop scene)
- /kak-my-testiruem/ (методология) — illustration с приборами, dB meter, stopwatch
- /partnerskie-ssylki/ — иллюстрация прозрачности (handshake / open book)

**Приоритет**: P0 — очень видимое. Идти через path 1 (manual URLs от тебя).

---

### P0-3. Cross-references между обзорами

**Проблема**: 0 internal links между обзорами. Каждый пост — изолированный остров. Падает PageRank distribution + не используется engagement.

**Решение**: внизу каждого обзора блок «Сравнить с» с 3-4 ссылками на другие обзоры:

```
## Что ещё посмотреть
- [Обзор Philips 3200 LatteGo](/...) — тот же ценовой класс, авто-молочник
- [Обзор Saeco PicoBaristo Deluxe](/...) — премиум-альтернатива
- [DeLonghi vs Philips — что выбрать](/...) — сравнение
```

**Реализация** (~10 мин моих): автоматический генератор links из доступных опубликованных обзоров.

**Claude/AI помощь**: нет.

**Приоритет**: P0 — после publish 5 драфтов.

---

## P1 — Высокий (1-2 недели, серьёзно влияет на восприятие)

### P1-1. Hero illustrations — Claude design

**Что**: заменить эмодзи/icon-text-only hero на **branded illustration**.

**Где нужны**:
- Главная: hero «Какую кофемашину купить» — оранжевый gradient + illustrated barista pour scene
- /o-avtore/: portrait Дмитрия (литературный персонаж) — **критично для E-E-A-T**, Google смотрит author photos
- /kak-my-testiruem/: hero с лабораторными приборами (dB meter + stopwatch + ваттметр + кофейная чашка)
- /partnerskie-ssylki/: hero с метафорой прозрачности (open book / handshake)

**Claude artifact prompt**:
```
Generate a 1200x630 hero illustration for an affiliate coffee machine review site
"popolkam.ru". Style: flat illustration, isometric, brand color #f97316 (orange)
+ supporting #1e293b (navy), #fff. No real product brands visible.
Subject: <varies per page>
Output: SVG OR PNG with transparent background.
```

**Реализация**:
- Запросить 4 illustrations через Claude artifacts (один раз)
- Скачать → upload в WP media → set as featured / hero block

**Приоритет**: P1, ~1 час моих + 30 мин Claude artifact.

---

### P1-2. Author portrait для Дмитрия — Claude image gen

**Что**: AI-сгенерированный портрет литературного псевдонима «Дмитрий Полкин» — инженер 38, технический типаж.

**Зачем**: Google Article schema требует Person.image. Без портрета E-E-A-T неполный.

**Pre-requisite**: упомянуть в /o-avtore/ что это AI-generated portrait литературного псевдонима (уже есть в disclosure формулировке).

**Где использовать**:
- /o-avtore/ hero
- Schema.org Person.image
- Author byline под каждым обзором: «Автор: [photo] Дмитрий Полкин»
- Sidebar widget «Об авторе» (когда добавим)

**Claude artifact prompt**:
```
Photorealistic portrait, professional headshot. 38-year-old Russian male,
mechanical engineer background. Friendly but serious expression. Modern
home kitchen background slightly blurred (espresso machine visible).
Wearing casual smart shirt (no logos). Style: documentary photography,
natural lighting, 4:5 portrait crop.
NOTE: Mark as "AI-generated literary persona portrait" — disclosure
required.
```

**Альтернатива**: stock photo Russian engineer (Unsplash/Pexels — free) — менее уникально, но 0 risk.

**Приоритет**: P1, ~30 мин Claude (или 5 мин stock).

---

### P1-3. Custom favicon

**Что**: сейчас favicon = WordPress default. Заменить на оранжевый «P» в нашем стиле.

**Реализация**: уже есть `docs/strategies/assets/popolkam-favicon.svg`. Залить через Customizer → Site Identity → Site Icon.

**Claude/AI помощь**: нет, есть готовый SVG.

**Приоритет**: P1, 5 мин моих.

---

### P1-4. Структурированные данные (Article + FAQPage schema)

**Что**: на каждый обзор добавить JSON-LD:
- `Article` (с author=Дмитрий, datePublished, dateModified, image, publisher=Organization)
- `FAQPage` для FAQ-секций (Top-10 уже имеет такой раздел)
- `BreadcrumbList` для category+post pages

**Зачем**: Google rich snippets, AEO (AI Overviews пьют structured data в первую очередь).

**Реализация** (~20 мин моих):
- Rank Math плагин уже стоит — настроить шаблоны schema через его UI ИЛИ программно через `seo_post_meta`
- Альтернатива: custom function в child theme functions.php — добавляет JSON-LD в `<head>`

**Claude/AI помощь**: нет.

**Приоритет**: P1, для AEO критично.

---

### P1-5. Sticky compare bar в обзорах

**Что**: REHub имеет [wpsm_compare] floating bar, который собирает «выбранные модели» по мере скролла. Когда читатель смотрит Top-10 и кликает «Сравнить» на 2-3 моделях — внизу появляется панель «Сравнить эти 3».

**Зачем**: engagement + conversion (выводит на comparison page).

**Реализация** (~15 мин моих): включить REHub option `enable_compare` + `[re_compare_addremove]` shortcode рядом с каждым offerbox.

**Claude/AI помощь**: нет.

**Приоритет**: P1, после offerbox.

---

## P2 — Средний (1 месяц, polishing)

### P2-1. Mobile UX audit

**Что**: пройти лoy сайт на телефоне (iPhone 12 + Android Chrome), зафиксить:
- Touch target sizes (≥44px)
- Header sticky behavior на свайпе
- Footer collapse / accordion для длинных секций
- Sidebar — на mobile не показывается (норма) — но проверить что Sticky CTA не съезжает

**Реализация** (~30 мин): я через DevTools mobile emulation + screenshots, дать пунктовый отчёт.

**Claude/AI помощь**: нет.

**Приоритет**: P2, после offerbox/cross-links.

---

### P2-2. Page speed / Core Web Vitals

**Что**: REHub грузит ~30 JS-файлов и 2 MB CSS. LCP/INP можно улучшить:
- Defer non-critical JS (dropdownmenu, compareconfig)
- Preload hero image
- Disable unused REHub features (Woocommerce, BBpress)
- Critical CSS inline в `<head>`

**Реализация** (~1 час моих): PSI audit → applies через REHub options + child theme tweaks.

**Claude/AI помощь**: нет (но может быть Phase 5 SEO/AEO Strategist Agent — Prompt 8 CWV fixes).

**Приоритет**: P2, замерить через PSI baseline сначала.

---

### P2-3. Custom 404 page

**Что**: сейчас 404 — стандартная REHub страница «Страница не найдена». Можно сделать helpful 404:
- «Возможно вы искали…» + 5 popular posts
- Search box
- Кнопки на pillar-страницы
- Эмоджи / иллюстрация (Claude artifact)

**Claude/AI помощь**: artifact для 404 illustration (lost coffee bean / broken espresso machine).

**Приоритет**: P2, ~20 мин моих + 10 мин artifact.

---

### P2-4. Newsletter sign-up (когда будет email infra)

**Что**: бар «Подпишись на новые обзоры» в footer / sidebar / exit intent.

**Pre-requisite**: настроить Mailchimp / SendPulse / Yandex 360 mailer.

**Claude/AI помощь**: нет.

**Приоритет**: P3 — когда будет 10+ опубликованных постов и хоть какой-то трафик.

---

## P3 — Долгосрочные эксперименты

### P3-1. Quiz «Подобрать кофемашину»

**Что**: 5-7 вопросов (бюджет / напитки / частота / молоко / габариты) → подборка 2-3 моделей.

**Где**: страница `/podobrat-kofemashinu/`, плюс sticky CTA в sidebar (уже есть кнопка).

**Реализация**: REHub Quiz built-in feature (`wpsm_quiz`) ИЛИ кастомный JS.

**Claude/AI помощь**: написание логики quiz (decision tree), но генерация UI делается на чистом JS.

**Приоритет**: P3, после 10+ обзоров (нечего рекомендовать пока).

---

### P3-2. TCO calculator widget

**Что**: интерактивный калькулятор «Сколько стоит владение кофемашиной за 5 лет?» — пользователь выбирает модель, получает разбивку: модель + сервис + декальцинация + молоко + зерно.

**Где**: на каждой странице обзора + standalone /kalkulyator-tco/.

**Pre-requisite**: meta-fields на каждом обзоре (popolkam_machine_price, popolkam_machine_service_3y, etc) + плагин popolkam-calculators (уже стоит, но empty).

**Claude/AI помощь**: дизайн UI калькулятора через Claude artifacts (interactive HTML).

**Приоритет**: P3, дифференциирующий feature.

---

### P3-3. Comparison-table builder

**Что**: WordPress shortcode `[popolkam_compare model1=delonghi-magnifica-s model2=philips-3200-lattego]` → автоматическая comparison table из meta-fields этих обзоров.

**Pre-requisite**: meta-fields везде.

**Claude/AI помощь**: нет.

**Приоритет**: P3.

---

## Где Claude design помогает

### Через Claude artifacts (сразу)

| Элемент | Время | Output формат |
|---|---|---|
| Hero illustrations × 4 (homepage, /o-avtore/, /kak-my-testiruem/, /partnerskie-ssylki/) | 30 мин | SVG / PNG |
| Author portrait (Дмитрий) | 20 мин | PNG (если в Claude есть image gen) или stock photo path |
| 404 illustration | 10 мин | SVG |
| Sticky compare bar UI mockup | 15 мин | HTML/CSS preview |
| Quiz UI prototype | 20 мин | Interactive HTML artifact |
| TCO calculator UI | 30 мин | Interactive HTML artifact |

### Через Claude API в SCC (планируется в SEO/AEO Strategist Agent)

См. `docs/agents/seo-aeo-strategist-agent.md`:
- Prompt 4: CTR-optimization (новые titles + meta)
- Prompt 6: Schema validation (Article/FAQPage/BreadcrumbList)
- Prompt 8: CWV fixes (LCP/INP recommendations)

### Не подходит для Claude (всегда manual или через other tools)

- Реальные product photos (manufacturer media kits / Я.Маркет cards / Content Egg)
- Партнёрские SubID URLs (твоё подключение к Admitad)
- A/B-тесты (Google Optimize / VWO)

---

## Phased rollout (рекомендация)

### Спринт 1 (эта неделя)
- [ ] **P0-1** REHub offerbox в Top-10 + 5 драфтах (30 мин моих)
- [ ] **P1-3** Custom favicon (5 мин моих)
- [ ] **P1-4** Article + FAQPage schema через Rank Math (20 мин моих)

### Спринт 2 (следующая неделя)
- [ ] **P0-2** Product photos (manual URLs от тебя) — заменить Unsplash на real
- [ ] **P0-3** Cross-references между обзорами (после publish 5 drafts)
- [ ] **P1-1** Hero illustrations через Claude artifacts (4 штуки)
- [ ] **P1-2** Author portrait

### Спринт 3 (через 2 недели)
- [ ] **P1-5** Sticky compare bar
- [ ] **P2-1** Mobile UX audit + fixes
- [ ] **P2-2** PSI baseline + первый раунд CWV optimization

### Спринт 4 (через месяц)
- [ ] **P2-3** Custom 404
- [ ] **P3-1** Quiz prototype через Claude artifact

---

## Метрики оценки эффекта

После каждого спринта замерять:

| Метрика | Baseline (now) | Target после спринта 2 | Target после спринта 4 |
|---|---|---|---|
| **CTR в партнёрки** (clicks/sessions) | 0% (нет URLs) | 2-3% | 4-5% |
| **Bounce rate** | n/a | <70% | <60% |
| **Session duration** | n/a | >1 мин | >2 мин |
| **Pages/session** | n/a | >1.3 | >1.7 |
| **PSI mobile score** | unknown | >70 | >85 |
| **Indexed pages** | ~10 | >50 | >100 |

---

*Owner: Денис*
*Implementer: SCC + Claude*
*Last updated: 2026-05-07*
