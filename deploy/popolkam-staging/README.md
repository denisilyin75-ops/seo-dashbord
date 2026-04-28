# popolkam-staging — pipeline для восстановления REHub-look

> **Назначение:** одноразовый staging WordPress, на котором импортируется
> REHub demo skin → экспортируем 3 артефакта (Theme Options, widgets, customizer)
> → импортируем в production popolkam без риска для контента.
>
> **Запускается на bonaka VPS** через docker-compose, удаляется после.

## Что нужно положить в эту папку

- [ ] `rehub-theme.zip` — основная REHub theme (платная, ThemeForest)
- [ ] `rehub-blankchild.zip` — child theme (опц., если есть отдельно — иначе создадим)

После этого: `bash spin-staging.sh` поднимает контейнер и автоматически:
1. Создаёт MariaDB + WP контейнеры
2. `wp core install` с дефолтными credentials
3. Активирует REHub child theme
4. Запускает REHub demo importer (Magazine skin)
5. Готово — staging доступен по `popolkam-staging.bonaka.app`

## Что внутри (после построения)

- `docker-compose.yml` — WP + MariaDB definition
- `spin-staging.sh` — bootstrap скрипт
- `export-rehub.sh` — после demo-импорта вытаскивает 3 артефакта в `exports/`:
  - `customizer.dat` (Customizer Export/Import format)
  - `widgets.wie` (Widget Importer/Exporter format)
  - `theme-options.json` (REHub Redux export)

## Как использовать (краткий гайд для оператора)

См. `docs/manual-tasks.md` секция «popolkam REHub-look restore».
