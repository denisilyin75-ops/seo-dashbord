# Промпт для Claude Code: реализация дашборда для управления портфелем лендингов

## Роль и режим работы

Ты — старший full-stack инженер, уровня команд Linear / Vercel / Plausible. Строй **production-grade** код: типобезопасный, тестируемый, без магии. Не «демо-проект», но и не преждевременная оптимизация. Когда стоит выбор — выбирай **скучное и надёжное** решение, а не модное.

Работай итерациями по фазам (см. ниже). В каждой фазе: сначала короткий план, потом код, потом прогон тайпчекера и линтера, потом минимальные тесты на ключевую логику, потом короткое резюме «что сделано / что осталось / где компромиссы».

Если встречаешь неоднозначность в этом промпте — **останавливайся и спрашивай**, не додумывай бизнес-логику. Технические детали (имена файлов, структура папок) — решай сам по конвенциям ниже.

## Контекст продукта (сжато)

Платформа для управления портфелем лендингов. Сами лендинги — это **обычные HTML-файлы**, которые маркетолог/разработчик пишет и правит вручную (часто в Claude Code в другом проекте). Дашборд:

1. Хранит эти HTML-файлы, группирует их в проекты.
2. Позволяет не трогая HTML менять: контакты (телефон/почта), заголовки/мета-теги, подключённые счётчики аналитики (GA4, Яндекс.Метрика, пиксели), формы (поля, назначение заявок), домен, редиректы, UTM-подмены, A/B-тесты.
3. Собирает заявки из форм в единый инбокс.
4. Деплоит лендинги на их домены.

Ключевая техническая задача — **связать настройки из БД с исходным HTML** так, чтобы автор лендинга мог писать обычный HTML/CSS/JS, а дашборд прозрачно управлял подменными элементами.

## Tech stack (фиксируем сразу)

- **Язык:** TypeScript strict everywhere.
- **Фреймворк:** Next.js 15 (App Router), React 19, Server Actions + Route Handlers.
- **БД:** PostgreSQL 16 + Prisma (или Drizzle — выбери Drizzle, типы лучше и миграции прозрачнее).
- **Auth:** Auth.js v5 (NextAuth) с email magic link + Google provider.
- **UI:** Tailwind CSS v4 + shadcn/ui как база компонентов, далее дорабатываем под дизайн-систему из дизайн-промпта.
- **Формы:** react-hook-form + zod (zod — единый источник валидации и на клиенте, и на сервере).
- **Storage (HTML-файлов и ассетов):** S3-совместимое (Cloudflare R2 или Minio локально). Для dev — файловая система с той же абстракцией.
- **Очереди/фоновые задачи:** для MVP — простые cron Route Handlers + таблица `jobs`. Если потребуется — BullMQ поверх Redis (не раньше).
- **Почта:** Resend.
- **Мониторинг:** Sentry (dev-лог в консоль).
- **Пакетный менеджер:** pnpm. Монорепо через pnpm workspaces.
- **Тесты:** Vitest для юнит- и интеграционных, Playwright для smoke e2e на критичные пути (логин, создание проекта, публикация лендинга).

Никаких Redux, никаких tRPC на старте (Server Actions хватает), никакого GraphQL. Никаких ORM-обёрток поверх Drizzle.

## Структура монорепо

```
repo/
├── apps/
│   ├── dashboard/          # Next.js app — дашборд и API
│   └── serve/              # Next.js app — отдача лендингов по custom domains
├── packages/
│   ├── db/                 # Drizzle schema, миграции, клиент
│   ├── ui/                 # Общие UI-компоненты (дизайн-система)
│   ├── landing-runtime/    # JS-рантайм, инжектится в лендинги (формы, события)
│   ├── landing-transform/  # Логика трансформации HTML: плейсхолдеры, пиксели
│   ├── config/             # eslint, tsconfig, tailwind presets
│   └── shared/             # zod-схемы, общие типы, утилы
├── .changeset/
├── pnpm-workspace.yaml
└── turbo.json
```

Два Next.js-приложения, а не одно, сознательно: **дашборд и отдача лендингов — разные домены безопасности и разные профили производительности**. Дашборд — тяжёлый, с авторизацией. Serve — холодный, кешируемый на edge, без куков.

## Доменная модель (Drizzle schema — ориентир)

```ts
workspaces (id, name, slug, created_at)
members (id, workspace_id, user_id, role: 'owner'|'admin'|'editor'|'viewer')
users (id, email, name, image, created_at)

projects (id, workspace_id, name, slug, description, status: 'active'|'paused'|'archived', created_at, updated_at)

landings (
  id, project_id, name, slug,
  status: 'draft'|'published'|'error',
  published_version_id (nullable FK),
  domain_id (nullable FK),
  path,                       -- путь внутри домена, напр. "/black-friday"
  settings (jsonb),           -- текущий черновик настроек
  created_at, updated_at
)

landing_versions (
  id, landing_id,
  html_hash,                  -- адрес HTML в object storage
  settings_snapshot (jsonb),  -- снапшот настроек на момент публикации
  published_by, published_at,
  note
)

landing_assets (id, landing_id, path, mime, size, storage_key)

forms (id, landing_id, name, schema (jsonb), destinations (jsonb), spam_protection (jsonb), success_message, redirect_url)
submissions (id, form_id, landing_id, payload (jsonb), meta (jsonb: ip, ua, utm, referrer), status: 'new'|'seen'|'in_progress'|'closed', assignee_id, created_at)

integrations (id, workspace_id, kind: 'ga4'|'ya_metrica'|'vk_pixel'|'meta_pixel'|'tiktok_pixel'|'gtm'|'crm_amo'|'crm_bitrix'|'webhook'|..., config (jsonb encrypted))
landing_integrations (landing_id, integration_id, enabled, overrides (jsonb))  -- какой счётчик на каком лендинге

domains (id, workspace_id, hostname, ssl_status, verified, created_at)
redirects (id, domain_id, from_path, to_url, code: 301|302)

ab_tests (id, landing_id, name, variant_a_version_id, variant_b_version_id, split, goal_event, started_at, ended_at)

activity_log (id, workspace_id, actor_id, action, target_type, target_id, diff (jsonb), created_at)

api_keys (id, workspace_id, name, hash, scopes, created_at, last_used_at)
```

Все настройки лендинга (контакты, мета-теги, UTM-правила) — в `landings.settings` как структурированный jsonb, описанный через zod-схему в `packages/shared`. Это даёт атомарное редактирование и простое версионирование через снапшоты.

Всё шифруемое (ключи интеграций, вебхук-секреты) — через конверт-шифрование: ключ в env, шифруем значения перед записью.

## Центральная архитектура: как настройки попадают в HTML

Это самое важное решение. Автор лендинга пишет **обычный HTML**, в котором расставляет «слоты» двух типов.

### Тип 1: статические плейсхолдеры (заменяются на сервере перед отдачей)

```html
<!-- Контакты и тексты -->
<a href="tel:{{ld.phone.tel}}">{{ld.phone.formatted}}</a>
<a href="mailto:{{ld.email}}">{{ld.email}}</a>
<title>{{ld.seo.title}}</title>

<!-- Условные блоки -->
<!-- ld:if source=google -->
  <h1>Приветствуем гостей из Google!</h1>
<!-- ld:endif -->
```

Движок подстановок — собственный, минималистичный, в `packages/landing-transform`. Синтаксис — ограниченный namespace `ld.*`. Никаких выражений, циклов, пользовательского кода — только справочник переменных. Это сознательно (безопасность + предсказуемость).

### Тип 2: автоматические инъекции (без участия автора)

Автор ничего не пишет — система сама вставит:

- **В `<head>`**: мета-теги OG/Twitter (если указаны), favicon, canonical, снипеты подключённых счётчиков (GA4, Метрика, пиксели — в порядке приоритета), cookie-баннер.
- **Перед `</body>`**: `<script src="/_ld/runtime.js">` из пакета `landing-runtime`.

Если автор хочет контролировать порядок — он ставит маркеры:

```html
<!-- ld:head-injections -->
<!-- ld:body-injections -->
```

Если маркеров нет — инжектим в стандартные позиции (конец `<head>`, перед `</body>`).

### Тип 3: формы

Автор пишет обычный `<form>` с атрибутом `data-ld-form="contact"`:

```html
<form data-ld-form="contact">
  <input name="name" required>
  <input name="phone" required>
  <button type="submit">Отправить</button>
</form>
```

`landing-runtime` находит такие формы, **валидирует по схеме** из дашборда (zod-схема приходит вместе с рантаймом для конкретного лендинга), сабмитит в `POST /api/submit/:landing_id/:form_name` на нашем api, показывает success/error, стреляет event в подключённые счётчики.

Это значит: **автор лендинга не пишет JS для форм**. Вёрстка и валидация — дашборд; отправка и доставка — платформа.

### Pipeline отдачи лендинга (serve-приложение)

На каждый запрос к лендингу:

1. Middleware определяет `hostname` и `path` → находит `landing` и опубликованный `landing_version`.
2. Тянет из кеша или из storage исходный HTML.
3. Тянет `settings_snapshot` этой версии.
4. Прогоняет HTML через `transform`:
   - подставляет плейсхолдеры;
   - резолвит UTM-подмены на основе query-параметров;
   - инжектит head (meta, пиксели) и body (runtime);
   - для A/B-теста выбирает вариант (с куки на стабильность);
5. Отдаёт с правильными cache-заголовками.
6. Логирует визит (в свою таблицу — дёшево, агрегировано).

Важно:
- HTML **не пересобирается каждый раз**. После публикации результирующий HTML мемоизируется по `(landing_id, version_id, utm_hash, variant)`.
- Никакого рантайм-чтения из главной БД из serve-приложения на hot path — только из реплики/кеша.
- Отдача заявок и аналитических beacon'ов — через отдельные эндпоинты, CORS строго.

## Маршруты и поверхности

### `apps/dashboard`

App Router. Маршруты:

```
/login
/(app)/
  /overview
  /projects
  /projects/:projectId
  /projects/:projectId/landings/:landingId          -- редактор настроек лендинга
  /forms
  /forms/:submissionId
  /analytics
  /integrations
  /domains
  /activity
  /settings/workspace
  /settings/members
  /settings/api-keys
  /settings/billing
```

API (Route Handlers, только для внешних клиентов; внутри — Server Actions):

```
/api/webhooks/...       -- входящие вебхуки от интеграций
/api/v1/...             -- внешний API по api_keys
```

### `apps/serve`

```
/_ld/runtime.js         -- рантайм-скрипт (возможно с хешем версии)
/_ld/submit             -- POST для заявок
/_ld/beacon             -- POST для событий аналитики (если нужен свой pixel)
*                       -- любой другой путь → отдача лендинга по (hostname, path)
```

## UI-реализация

Визуальная система — из парного дизайн-промпта (light/dark, нейтральная шкала + один акцент, плоские карточки, 1px бордеры, Inter + моноширинный для чисел/ID).

Технически:

- Базовые примитивы берём из shadcn/ui, переопределяем токены Tailwind под дизайн-систему.
- Иконки — `lucide-react`, один набор, 16/20/24.
- Таблицы — `@tanstack/react-table`, но стили наши.
- Графики — `recharts`, только line/bar, кастомный theming, `tabular-nums` на осях и подписях.
- Command palette — `cmdk` + собственный ingester команд.
- Тосты — `sonner`.
- Формы — `react-hook-form` + zod resolver. Никакого Formik.
- Drag-n-drop (поля форм, сортировка) — `@dnd-kit/*`.

Состояния везде: empty / loading (skeleton, не спиннер) / error / partial. Skeleton — отдельные компоненты под каждый список, не generic.

Оптимистичные апдейты — через Server Actions с `useOptimistic`.

## Права и безопасность

- Всё серверное — идёт через единый слой `requireMember(workspaceId, minRole)`. Ни одна Server Action не трогает БД без проверки прав.
- HTML-загрузки от пользователя — санитизация на предмет опасных инжекций **внутрь слотов `ld:head-injections`** (автор не должен через свой HTML ломать политику CSP платформы). Сам исходный HTML лендинга — доверенный (его пишет владелец воркспейса), но CSP на поддомене лендинга строгий и конфигурируемый.
- Сабмиты форм — rate-limit на IP+форма (в памяти Redis или на edge), honeypot-поле, опционально reCAPTCHA/hCaptcha/Turnstile.
- API-ключи — только префикс + последние 4 символа видны после создания, хеш — в БД.
- Вебхук-секреты — HMAC-подпись исходящих вебхуков с `ts` и `v1=...`.
- Секреты интеграций — envelope-encryption (libsodium secretbox), master-key в env.
- CORS на serve-app — точный origin (сам домен лендинга), не `*`.
- Заголовки: строгий `Content-Security-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`.

## Конвенции кода

- `tsconfig` strict: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- ESLint flat config, prettier, `import/order`, `unused-imports`.
- Файлы: `kebab-case` для директорий и не-React файлов, `PascalCase.tsx` для компонентов.
- React: server components по умолчанию, client components только когда реально нужен стейт/браузерные API. Комментарий сверху `'use client'` + короткое объяснение почему.
- Ошибки: **никаких `throw new Error('foo')` в бизнес-логике**. Результаты — `Result<T, E>` (свой лёгкий тип в `shared`). Границы (Route Handlers, Server Actions) — приводят Result к HTTP-ответу.
- Логи: структурные (`pino`), никаких `console.log` в мердже.
- Ни одного `any`. Если совсем надо — `unknown` + zod.
- Каждый jsonb в БД имеет zod-схему и парсится на чтении.
- Миграции Drizzle версионированные, rollback-ready. Никаких `drizzle-kit push` в проде.
- Все даты — `Date` объекты в коде, `timestamptz` в БД, UTC. Форматирование — только в UI через `date-fns`.

## Фазы реализации

Работай строго по фазам. Не перескакивай вперёд. В конце каждой фазы — коммит с понятным сообщением и сводка.

### Фаза 0. Инфраструктура и каркас

- Монорепо, pnpm workspaces, turborepo.
- Два Next.js-приложения, общие пакеты.
- `docker-compose.yml` для локала: postgres, minio, mailpit.
- Базовый CI: тайпчек + lint + миграции проверка.
- Базовая дизайн-система: токены Tailwind, базовые компоненты (Button, Input, Select, Dialog, Toast, Card, Badge, Tabs, DropdownMenu, Table, Skeleton).

Acceptance: `pnpm dev` поднимает оба app'а и всю инфру, логин через magic-link работает (на mailpit), пустой дашборд рендерится.

### Фаза 1. Workspaces, members, projects

- Создание workspace при первом логине.
- Инвайты по email, роли.
- CRUD проектов, список карточек проектов с моками метрик.
- Сайдбар, шапка, breadcrumbs, command palette (пустая, только навигация по проектам).

Acceptance: два пользователя в одном workspace, один создаёт проект, второй его видит согласно роли.

### Фаза 2. Лендинги: источник, версии, редактор настроек

- Загрузка HTML лендинга (upload .html или вставка в textarea с подсветкой). Ассеты — опционально через ZIP-импорт.
- Парсер HTML, детекция используемых плейсхолдеров `ld.*`, вывод списка «что автор использует» в UI.
- Редактор настроек лендинга: general, contacts, SEO. Валидация через zod.
- Версии: черновик vs опубликовано, история версий, откат.
- Превью (desktop/mobile) в iframe с прогнанным transform.

Acceptance: можно залить HTML с `{{ld.phone.formatted}}`, задать телефон в UI, увидеть его в превью, опубликовать, увидеть на serve-приложении.

### Фаза 3. Домены и отдача

- Добавление custom domain, инструкция по DNS, проверка верификации.
- SSL через caddy / managed (документируй предположения, реализуй абстракцию).
- Привязка домена и пути к лендингу.
- Serve-app: hostname-роутинг, отдача опубликованной версии, кеш.

Acceptance: лендинг доступен на `example.ru` через 5 минут после привязки, смена телефона в UI отражается на сайте в течение 30 сек.

### Фаза 4. Счётчики и интеграции аналитики

- CRUD интеграций на уровне workspace.
- Подключение к лендингу, toggle on/off.
- Инжекция снипетов в `<head>` в правильной последовательности.
- «Health»-проверка счётчика: последний зафиксированный хит (через собственный beacon, который параллельно с пикселями собирает анонимный факт загрузки).
- UI бейджей и статусов.

Acceptance: подключил GA4, открыл лендинг — через минуту в карточке видно «последний хит N сек назад».

### Фаза 5. Формы и заявки

- Конструктор формы (типы полей, валидация, маски, placeholder, required).
- Назначения: email, Telegram-бот, вебхук, CRM-заглушка.
- Рантайм: биндинг `data-ld-form`, сабмит на `/_ld/submit`, success/error UI, события в счётчики.
- Инбокс заявок: фильтры, детали, смена статуса, экспорт CSV.
- Spam protection: honeypot + rate-limit, опциональный Turnstile.

Acceptance: заявка с лендинга доходит до инбокса и на email за <5 сек, спам-атака с одного IP отсекается.

### Фаза 6. UTM-подмены и A/B-тесты

- Правила подмен: `ld.if source=... ld.endif` + таблица переменных по UTM.
- A/B-тест: запуск с двумя версиями, раздача по куке, цель — конкретное form submission или custom event, UI с результатами и статзначимостью.

Acceptance: в A/B тесте с 50/50 после 200 заявок видно лидера с доверительным интервалом.

### Фаза 7. Аналитика, Activity, API

- Агрегаты визитов и заявок (дневные партиции). Без попытки заменить GA.
- Activity-лента (уже пишется на каждом действии).
- Публичный API v1 (read-only для MVP): list projects, list landings, get submissions, create submission programmatically.

### Фаза 8. Полировка

- Пустые состояния везде.
- Клавиатурные шорткаты и `⌘K`-действия.
- Темы light/dark.
- Onboarding (через empty states, без туров).
- Playwright-сценарии на critical path.
- Документация в `/docs` (как подключить лендинг, справочник `ld.*` плейсхолдеров, формат форм, custom events).

## Тесты — минимум, но обязательный

- **landing-transform**: полный юнит на все ветки (плейсхолдеры, condition-блоки, head/body injections, UTM overrides, A/B выбор). Снапшоты на реальные HTML-образцы.
- **API submit**: интеграционный тест, что заявка попадает в БД и триггерит назначения.
- **Auth / permissions**: что viewer не может публиковать, editor не может приглашать, и т.д.
- **Playwright smoke**: залогиниться → создать проект → загрузить HTML → задать телефон → опубликовать → увидеть на serve.

Тесты — не «для покрытия», а на инварианты, которые дорого чинить в проде: трансформация HTML, права, сабмит.

## Что считается «done» для MVP

- Пользователь заходит, создаёт workspace, приглашает коллегу.
- Загружает HTML-лендинг, задаёт телефон/почту/SEO в UI.
- Привязывает домен, публикует — лендинг работает.
- Подключает GA4 и Meta Pixel, видит «здоровье» счётчиков.
- Настраивает форму, получает заявки в инбокс и на почту.
- Запускает A/B-тест между двумя версиями.
- Второй коллега не может снести проект (права).
- Все экраны имеют empty/loading/error-состояния.
- Dark-тема не отстаёт от light.

## Что явно вне скоупа MVP

- Встроенный WYSIWYG-редактор лендингов (автор редактирует HTML сам, в Claude Code).
- Встроенная CRM (только интеграции с внешними).
- Глубокая аналитика (только агрегаты и ссылки в GA/Метрику).
- White-label, SSO, SCIM.
- Мобильное приложение.

## Формат ответа в каждой фазе

1. План фазы в 5–10 bullet'ов.
2. Дерево создаваемых/правленых файлов.
3. Код (полными файлами, а не диффами для новых; диффами — для правок).
4. Миграции БД отдельно и читаемо.
5. Результат `pnpm typecheck && pnpm lint && pnpm test`.
6. Сводка: «готово / риски / что сделал иначе, чем в промпте, и почему / вопросы».

## Антипаттерны (чего не делать)

- Не тащить в MVP фичи из «вне скоупа».
- Не реализовывать свой визуальный конструктор лендингов — это другой продукт.
- Не смешивать serve и dashboard в один процесс / один домен.
- Не класть секреты в env без шифрования на БД-уровне.
- Не писать кастомный state-manager — серверные компоненты и Server Actions справляются.
- Не делать «универсальные» абстракции в первый проход (repository, service, factory). Сначала прямой код, абстракции — когда повторится трижды.
- Не логировать PII из submissions в прод-логи.
- Не блокировать hot-path отдачи лендинга вызовами в главную БД.
