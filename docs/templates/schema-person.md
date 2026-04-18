# Schema.org Person — готовые snippets для WP

> **Назначение:** JSON-LD блоки для установки на каждом сайте портфеля через Rank Math Code Snippet, REHub Custom Code или прямо в `functions.php` child-темы.
> **Статус:** v1 — 2026-04-18

---

## Где вставлять

### Вариант A (рекомендуется): Rank Math — Custom Schema

1. `wp-admin → Rank Math → Titles & Meta → Global Meta`
2. Или: `wp-admin → Posts → Edit → Rank Math меню справа → Schema → Custom Schema`
3. Вставить JSON (без `<script>` обёрток — Rank Math сам обернёт)

### Вариант B: через `functions.php` child-темы

Вставить вывод schema в head на **каждой странице where applicable**:

```php
// rehub-blankchild/functions.php

function popolkam_inject_author_schema() {
  // Только на single posts и /o-avtore/
  if ( ! is_single() && ! is_page( 'o-avtore' ) ) return;

  $schema = [
    /* JSON-LD object — см. ниже */
  ];

  echo '<script type="application/ld+json">';
  echo wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
  echo '</script>';
}
add_action( 'wp_head', 'popolkam_inject_author_schema' );
```

### Вариант C: через REHub Custom Code

`wp-admin → REHub Options → Advanced → Custom HTML → Header` — вставить `<script type="application/ld+json">...</script>` блок.

**Примечание:** использовать **только один из трёх вариантов**. Дубль schema ≥ 2 раза = Google penalty.

---

## popolkam.ru — Дмитрий Полкин

### Вставлять на:
- `/o-avtore/` — как `Person` (главная схема страницы)
- Каждая review-статья — как `author` поле внутри `Article` schema (Rank Math делает автоматически если установлено authorship)

### JSON для `/o-avtore/` (standalone Person)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Дмитрий Полкин",
  "alternateName": "Dmitri Polkin",
  "jobTitle": "Инженер-механик, редактор popolkam.ru",
  "description": "Литературный псевдоним редакции popolkam.ru — команда инженеров-обозревателей, фактчекеров и редакторов. Обзоры бытовой техники для кухни.",
  "alumniOf": {
    "@type": "EducationalOrganization",
    "name": "МГТУ им. Н.Э. Баумана",
    "url": "https://bmstu.ru/"
  },
  "knowsAbout": [
    "Кофемашины",
    "Бытовая техника",
    "Теплотехника",
    "Чайники электрические",
    "Блендеры",
    "Мультиварки",
    "Посудомоечные машины"
  ],
  "image": "https://popolkam.ru/wp-content/uploads/dmitri-polkin-portrait.png",
  "url": "https://popolkam.ru/o-avtore/",
  "email": "mailto:dmitri@popolkam.ru",
  "sameAs": [
    "https://t.me/popolkam_review"
  ],
  "worksFor": {
    "@type": "Organization",
    "name": "popolkam.ru",
    "url": "https://popolkam.ru/"
  }
}
```

### JSON для вставки в `Article.author` (через Rank Math)

Если Rank Math автоматически заполняет author — ничего делать не надо. Если не заполняет — через `Rank Math → Schema → Custom → Author`:

```json
{
  "@type": "Person",
  "name": "Дмитрий Полкин",
  "url": "https://popolkam.ru/o-avtore/",
  "image": "https://popolkam.ru/wp-content/uploads/dmitri-polkin-portrait.png"
}
```

---

## aykakchisto.ru — Дарья Метёлкина

### Вставлять на:
- `/o-avtore/`
- Каждая статья — `Article.author`

### JSON для `/o-avtore/` (standalone Person)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Дарья Метёлкина",
  "alternateName": "Daria Metyolkina",
  "jobTitle": "Химик, редактор aykakchisto.ru",
  "description": "Литературный псевдоним редакции aykakchisto.ru — команда специалистов по бытовой химии, фактчекеров, редакторов. Справочник по чистоте в доме.",
  "alumniOf": {
    "@type": "EducationalOrganization",
    "name": "Московский государственный университет имени М.В. Ломоносова",
    "url": "https://www.msu.ru/"
  },
  "knowsAbout": [
    "Бытовая химия",
    "Полимеры",
    "Чистота дома",
    "Уборка",
    "Удаление пятен",
    "Роботы-пылесосы",
    "Пароочистители"
  ],
  "image": "https://aykakchisto.ru/wp-content/uploads/darya-metyolkina-portrait.png",
  "url": "https://aykakchisto.ru/o-avtore/",
  "email": "mailto:darya@aykakchisto.ru",
  "sameAs": [
    "https://t.me/aykakchisto_notes"
  ],
  "worksFor": {
    "@type": "Organization",
    "name": "aykakchisto.ru",
    "url": "https://aykakchisto.ru/"
  }
}
```

---

## Organization schema (для `/` главной)

### popolkam.ru

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "popolkam.ru",
  "alternateName": "popolkam — кухонная техника по полочкам",
  "url": "https://popolkam.ru/",
  "logo": {
    "@type": "ImageObject",
    "url": "https://popolkam.ru/wp-content/uploads/popolkam-logo.svg",
    "width": 240,
    "height": 64
  },
  "description": "Независимые обзоры бытовой техники для кухни: кофемашины, чайники, блендеры, мультиварки. Инженерный подход, реальные замеры, честные компромиссы.",
  "foundingDate": "2026-04-01",
  "sameAs": [
    "https://t.me/popolkam_review"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "editorial",
    "email": "dmitri@popolkam.ru",
    "availableLanguage": "Russian"
  }
}
```

### aykakchisto.ru

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "aykakchisto.ru",
  "alternateName": "Ай как чисто!",
  "url": "https://aykakchisto.ru/",
  "logo": {
    "@type": "ImageObject",
    "url": "https://aykakchisto.ru/wp-content/uploads/aykakchisto-lockup.svg",
    "width": 600,
    "height": 160
  },
  "description": "Справочник по чистоте в доме от химика по образованию. Решение бытовых трудных случаев: пятна, запахи, налёт, плесень, выбор техники для уборки.",
  "foundingDate": "2026-04-18",
  "sameAs": [
    "https://t.me/aykakchisto_notes"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "editorial",
    "email": "darya@aykakchisto.ru",
    "availableLanguage": "Russian"
  }
}
```

---

## Validation checklist

После вставки:

1. **Google Rich Results Test** — https://search.google.com/test/rich-results
   - Вводим URL опубликованной `/o-avtore/` страницы
   - Ожидаем: ✅ Person detected, ✅ валидные поля
   - ❌ Дубль Person schema = ошибка Rank Math + custom (оставить один)

2. **Schema.org validator** — https://validator.schema.org/
   - Вставляем JSON напрямую
   - Проверяем что все поля типизированы правильно

3. **В Google Search Console (когда подключён):**
   - Enhancements → Person / Article / Organization
   - Отслеживаем какие страницы детектятся как валидные

---

## Disclosure на `/o-avtore/` (в body страницы, НЕ в schema)

Дополнительно к schema — **явный абзац про pseudonym** в HTML-теле страницы:

```html
<!-- на /o-avtore/ popolkam -->
<section class="pseudonym-disclosure">
  <h2>О псевдониме</h2>
  <p>
    <strong>«Дмитрий Полкин» — литературный псевдоним редакции popolkam.ru.</strong>
    Под этим именем публикует команда инженеров-обозревателей, фактчекеров,
    редакторов. Подобная практика принята у многих изданий: Гоблин-Пучков,
    Elena Ferrante, The Economist (без авторских byline). Биография персонажа —
    собирательный опыт реальных инженеров отрасли, портрет сгенерирован AI.
    Мы не выдаём Дмитрия за реального человека в СМИ, конференциях, на
    юридических документах.
  </p>
</section>
```

**Эта секция важна для:**
- SEO (Google читает, понимает честность pseudonym'а)
- Юр. защиты (нельзя сказать что вы вводили в заблуждение)
- Пользовательского доверия (честнее чем скрывать)

---

## Чек-лист деплоя

### popolkam.ru
- [ ] Страница `/o-avtore/` создана из `content/popolkam/pages/o-avtore.md`
- [ ] Schema.org Person добавлена (Variant A/B/C)
- [ ] Валидация через Rich Results Test прошла
- [ ] Email `dmitri@popolkam.ru` настроен (Yandex 360 / Timeweb mail)
- [ ] Telegram-канал создан (`@popolkam_review`) — опционально, Phase 1
- [ ] В footer добавлен disclaimer малым шрифтом (строка про псевдоним)
- [ ] На review-статьях author byline ссылается на `/o-avtore/`

### aykakchisto.ru
- [ ] Страница `/o-avtore/` создана из `content/aykakchisto/pages/o-avtore.md`
- [ ] Schema.org Person добавлена
- [ ] Валидация прошла
- [ ] Email `darya@aykakchisto.ru` настроен
- [ ] Telegram-канал `@aykakchisto_notes` — опционально
- [ ] Footer disclaimer
- [ ] На review-статьях author byline

---

## Связанные документы

- `docs/personas/popolkam-dmitri-polkin.md §5.4` — Schema.org Person полная версия canon
- `docs/personas/aykakchisto-darya-metyolkina.md §5.4` — Schema Дарьи
- `docs/brand/popolkam/README.md §8.4` — применение schema в WP
- `content/popolkam/pages/o-avtore.md` — draft страницы Дмитрия
- `content/aykakchisto/pages/o-avtore.md` — draft страницы Дарьи
