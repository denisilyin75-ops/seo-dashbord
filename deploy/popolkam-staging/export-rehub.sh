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
# Customizer Export/Import плагин не предоставляет wp-cli команды.
# Генерируем .dat файл напрямую — это PHP-serialized array вида:
# { template, mods, options, wp_css }, как делает плагин при export.
docker exec popolkam-staging-wpcli sh -c '
cat > /tmp/build-customizer-dat.php <<PHP
<?php
require_once "/var/www/html/wp-load.php";
\$template = get_template();          // активный parent template (rehub-theme)
\$stylesheet = get_stylesheet();      // активный stylesheet (rehub-blankchild)
\$mods = get_option("theme_mods_" . \$stylesheet, array());
// также соберём theme_mods для parent на случай если REHub что-то держит там
\$parent_mods = get_option("theme_mods_" . \$template, array());
// options that Customizer Export/Import плагин обычно тоже захватывает
\$options = array();
\$opt_names = array("blogname", "blogdescription", "show_on_front", "page_on_front", "page_for_posts");
foreach (\$opt_names as \$o) { \$options[\$o] = get_option(\$o); }
\$wp_css = wp_get_custom_css();
\$data = array(
  "template"   => \$template,
  "stylesheet" => \$stylesheet,
  "mods"       => array_merge(\$parent_mods, \$mods),
  "options"    => \$options,
  "wp_css"     => \$wp_css,
);
file_put_contents("/exports/customizer.dat", serialize(\$data));
echo "    customizer.dat: " . count(\$data["mods"]) . " mods, " . count(\$data["options"]) . " options, " . strlen(\$wp_css) . " bytes css\n";
PHP
wp --allow-root eval-file /tmp/build-customizer-dat.php
'

echo "===> 4. Экспорт виджетов (widgets.wie)"
# widgets.wie format = JSON, который Widget Importer/Exporter понимает.
# Структура: { sidebar_id: { widget_id: instance_data, ... }, ... }
docker exec popolkam-staging-wpcli sh -c '
cat > /tmp/build-wie.php <<PHP
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
\$json = json_encode(\$out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents("/exports/widgets.wie", \$json);
\$total = 0; foreach(\$out as \$s) \$total += count(\$s);
echo "    widgets.wie: " . count(\$out) . " sidebars, " . \$total . " widgets\n";
PHP
wp --allow-root eval-file /tmp/build-wie.php
'

echo "===> 5. Экспорт REHub Theme Options (rehub_option = главный)"
# В REHub 19.x главный объект Theme Options — `rehub_option` (~9 КБ JSON).
# Также важны `rehub_design_selector` (выбранный skin) и `rehub_wizard_option`.
docker exec popolkam-staging-wpcli sh -c '
cat > /tmp/build-rehub-options.php <<PHP
<?php
require_once "/var/www/html/wp-load.php";

\$bundle = array();
\$keys = array("rehub_option", "rehub_design_selector", "rehub_wizard_option");
foreach (\$keys as \$k) {
  \$v = get_option(\$k);
  if (\$v !== false && \$v !== "") \$bundle[\$k] = \$v;
}

// Auto-rebrand: meninto/recart magenta → popolkam orange (#f97316)
\$json = json_encode(\$bundle, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
\$replacements = array(
  "#7000f4" => "#f97316",                               // recart magenta
  "#0073aa" => "#f97316",                               // generic blue
  "popolkam-staging.bonaka.app" => "popolkam.ru",       // staging URL → prod
);
foreach (\$replacements as \$from => \$to) {
  \$json = str_ireplace(\$from, \$to, \$json);
}
file_put_contents("/exports/rehub-options.json", \$json);
echo "    rehub-options.json: " . strlen(\$json) . " bytes (rebranded)\n";
PHP
wp --allow-root eval-file /tmp/build-rehub-options.php
'

# Best-effort бэкап: все ключи с "rehub" — для ручного разбора если что
WPCLI option list --search='*rehub*' --format=json > exports/all-rehub-options-raw.json 2>/dev/null || true

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
