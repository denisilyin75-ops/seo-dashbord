# SCC Documentation Index

> Гид по документации SCC. Если не уверен куда писать — начни отсюда.

## Стратегические документы (что и зачем делаем)

| Файл | Что это | Кому читать |
|------|---------|-------------|
| [`business-model.md`](business-model.md) | Product vision, 4 персоны, монетизация, стадии запуска, архитектурные решения на multi-user | **Обязательно для входящих в проект** |
| [`backlog.md`](backlog.md) | Единый список задач с P0/P1/P2/P3 приоритетами. Живой | Перед каждой новой задачей |
| [`agents.md`](agents.md) | Живой реестр всех агентов: scope, readiness, TODO, roadmap | При добавлении нового агента |
| [`devlog.md`](devlog.md) | Хронология изменений и решений | Для понимания «как мы до этого дошли» |
| [`migration-plan.md`](migration-plan.md) | Runbook миграции на новый сервер + disaster recovery | При переезде или ЧП |
| [`scaling-checklist.md`](scaling-checklist.md) | Чек-лист запуска нового сайта портфеля (от 0 до боевого за 30-60 мин) | При добавлении нового сайта |
| [`sources.md`](sources.md) | Каталог источников информации по рубрикам (производители, форумы, YouTube, SEO-ресёрч, партнёрки) | При подготовке обзоров и сравнений |
| [`personas/`](personas/) | Редакторы-псевдонимы и mascot-ассистенты каждого сайта портфеля | При разработке UX интерактива, AI prompt'ов, страниц /o-avtore/ |
| [`brand/aykakchisto/`](brand/aykakchisto/) | Brand system aykakchisto — SVG mark, favicon, lockup, React canvas | При использовании лого / работе с визуалом |
| [`brand/popolkam/`](brand/popolkam/) | Brand system popolkam — legacy SVG + план апгрейда до полной системы | При использовании лого / планировании апгрейда |
| [`gamification.md`](gamification.md) | User guide к Live Portfolio Value виджету + toast'ам (Phase A) | При вопросах «откуда эта цифра в шапке?» |
| [`ai-routing.md`](ai-routing.md) | Гибридная стратегия AI: local LLM (Qwen-72B) + OpenRouter. Routing по task type. Hardware spec | При добавлении нового AI-вызова, при вопросе про costs |
| [`agents/site-guardian.md`](agents/site-guardian.md) | Спека агента поиска и улучшения: 6 категорий checks, интеграция с local LLM | При реализации Site Guardian (Phase 2+) |

## Операционные стратегии (контент, SEO, монетизация)

| Файл | Что это |
|------|---------|
| [`strategies/coffee-machines.md`](strategies/coffee-machines.md) | Полная стратегия рубрики Кофемашины popolkam.ru |
| [`strategies/vacuum-robots.md`](strategies/vacuum-robots.md) | Стратегия рубрики Роботы-пылесосы |
| `strategies/running-shoes.md` | TODO: после миграции 4beg.ru |

## Дизайн-ассеты

| Файл | Что это |
|------|---------|
| [`strategies/assets/popolkam-logo.svg`](strategies/assets/popolkam-logo.svg) | SVG-логотип popolkam.ru |
| [`strategies/assets/popolkam-favicon.svg`](strategies/assets/popolkam-favicon.svg) | Favicon popolkam.ru |

## Deployment артефакты

| Файл | Что это |
|------|---------|
| [`../deploy/`](../deploy/) | Nginx configs, PM2, backup скрипты, docker-compose для popolkam WP, allow-svg mu-plugin |
| [`../server/scripts/wp-provision/`](../server/scripts/wp-provision/) | provision-site.sh + polish-site.sh + presets для разворачивания новых WP-сайтов |

## Правило: куда писать что

| Тип информации | Куда |
|----------------|------|
| Архитектурное решение | `business-model.md` (если касается product vision) или `devlog.md` |
| Новая фича / агент / сайт (итерация) | `devlog.md` **+** тематический документ (agents.md если про агента) |
| План задачи на ближайшие N дней | `backlog.md` |
| Стратегия рубрики | `strategies/{niche}.md` (создать если нет) |
| Гайд для разработчика | Сюда в README или новый файл |
| Deployment / provisioning | `../deploy/` или `../server/scripts/` |

## Правило: после каждой значимой итерации

1. Изменения в код → коммит
2. Краткая запись в **devlog.md** (что Added / что Decided / Known issues)
3. Если решение стратегическое → обновить **business-model.md** или **agents.md**
4. Если фича закрыта → вычеркнуть из **backlog.md**
5. Если появилась новая стратегическая задача → добавить в **backlog.md**

## Cross-reference с memory

Файлы в `~/.claude/projects/c--Users-Bonaka-projects-seo-dashbord/memory/` — это кеш для AI-ассистента (Claude Code), чтобы в каждом новом чате быстро войти в контекст.

**Правило:** стратегические решения живут в `docs/` (в repo, видно всем). Память — только pointer-файлы с одним-двумя абзацами и ссылкой на docs.
