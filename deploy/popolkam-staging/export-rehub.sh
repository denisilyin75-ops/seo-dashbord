#!/usr/bin/env bash
# export-rehub.sh — после того как demo импортирован в staging,
# вытаскивает 3 артефакта в ./exports/:
#   - customizer.dat  (Customizer Export/Import format)
#   - widgets.wie     (Widget Importer/Exporter format)
#   - theme-options.json  (REHub Redux options dump)
#
# Use:
#   bash export-rehub.sh

set -euo pipefail

cd "$(dirname "$0")"
mkdir -p exports
EXPORT_DIR="$(pwd)/exports"

WPCLI() {
  docker exec popolkam-staging-wpcli wp --allow-root "$@"
}

echo "===> 1. Проверка что staging жив и WP установлен"
if ! WPCLI core is-installed --quiet 2>/dev/null; then
  echo "FATAL: WordPress не установлен в staging. Запусти spin-staging.sh."
  exit 1
fi

echo "===> 2. Проверка что REHub активен"
ACTIVE_THEME=$(WPCLI theme list --status=active --field=name)
if [[ "$ACTIVE_THEME" != "rehub-theme" && "$ACTIVE_THEME" != "rehub-blankchild" ]]; then
  echo "FATAL: REHub не активен (активна: $ACTIVE_THEME). Активируй вручную."
  exit 1
fi

echo "===> 3. Экспорт Customizer (customizer.dat)"
# Customizer Export/Import плагин: команда `customizer-export-import export`
# Записывает .dat файл в /tmp внутри контейнера
WPCLI customizer-export-import export 2>&1 | tail -3 || true
# fallback: если CLI команда не сработала, дампим theme_mods вручную
WPCLI option get theme_mods_$(WPCLI option get template) --format=json > exports/customizer-fallback.json 2>/dev/null || true
# попытка скопировать .dat файл
docker cp popolkam-staging-wp:/var/www/html/wp-content/uploads/customizer-import.dat exports/customizer.dat 2>/dev/null \
  || echo "    Нет customizer.dat — будет использован customizer-fallback.json"

echo "===> 4. Экспорт виджетов (widgets.wie)"
# widget-importer-exporter создаёт .wie файл
# Включает все sidebars + widget instances в JSON-внутри-WIE формате
WPCLI option get sidebars_widgets --format=json > exports/sidebars_widgets.json
# Все widget option keys
WPCLI option list --search='widget_*' --field=option_name | while read opt; do
  WPCLI option get "$opt" --format=json > "exports/${opt}.json" 2>/dev/null || true
done
# Сборка в .wie формат (это просто JSON массив, который Widget Importer/Exporter понимает)
docker exec popolkam-staging-wpcli sh -c '
  cd /tmp && cat > /tmp/build-wie.php <<PHP
<?php
require_once "/var/www/html/wp-load.php";
\$out = array();
\$widgets = wp_get_sidebars_widgets();
foreach (\$widgets as \$sidebar => \$widget_ids) {
  if (\$sidebar === "wp_inactive_widgets" || \$sidebar === "array_version") continue;
  \$out[\$sidebar] = array();
  if (!is_array(\$widget_ids)) continue;
  foreach (\$widget_ids as \$widget_id) {
    if (!preg_match("/^(.+)-(\d+)$/", \$widget_id, \$m)) continue;
    \$opt = "widget_" . \$m[1];
    \$instances = get_option(\$opt);
    if (!isset(\$instances[\$m[2]])) continue;
    \$out[\$sidebar][\$widget_id] = \$instances[\$m[2]];
  }
}
echo json_encode(\$out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
PHP
  wp --allow-root eval-file /tmp/build-wie.php > /exports/widgets.wie
'

echo "===> 5. Экспорт REHub Theme Options (Redux)"
# REHub использует Redux Framework. Опции хранятся в wp_options как
# `rehub_framework` или `redux_options` или `rehub_theme_options` — варианты
# по версии. Дампим все возможные ключи.
for KEY in rehub_framework redux_options rehub_theme_options redux_demo redux_options-rehub_framework; do
  VAL=$(WPCLI option get "$KEY" --format=json 2>/dev/null || echo "")
  if [[ -n "$VAL" && "$VAL" != "false" && "$VAL" != "null" ]]; then
    echo "$VAL" > "exports/theme-options-${KEY}.json"
    echo "    ✓ $KEY → exports/theme-options-${KEY}.json"
  fi
done

# Best-effort: дамп всех ключей содержащих rehub
WPCLI option list --search='*rehub*' --format=json > exports/all-rehub-options.json 2>/dev/null || true

echo
echo "===> 6. Список созданных файлов"
ls -la exports/

echo
echo "==============================================="
echo " ЭКСПОРТ ГОТОВ"
echo "==============================================="
echo " Файлы в:    $EXPORT_DIR"
echo
echo " Что дальше — на боевом popolkam.ru:"
echo " 1. Зайти в wp-admin → Plugins → Add New"
echo " 2. Установить + активировать:"
echo "    - Customizer Export/Import"
echo "    - Widget Importer & Exporter"
echo " 3. Appearance → Customize → нижний пункт 'Export/Import' → Import → загрузить customizer.dat"
echo " 4. Tools → Widget Importer & Exporter → Import → загрузить widgets.wie"
echo " 5. REHub → Theme Options → Import / Export → вставить содержимое theme-options-*.json"
echo "==============================================="
