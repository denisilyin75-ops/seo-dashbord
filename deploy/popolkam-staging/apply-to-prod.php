<?php
/**
 * apply-to-prod.php — применяет rehub-options.json + customizer.dat
 * к боевому popolkam напрямую через WP options API.
 *
 * Use: docker cp в /tmp/ контейнера wp-popolkam, затем:
 *   docker exec wp-popolkam php /tmp/apply-to-prod.php
 *
 * Бэкапы текущих значений сохраняются в /tmp/popolkam-backup/.
 */

require_once "/var/www/html/wp-load.php";

$backup_dir = "/tmp/popolkam-backup";
if (!is_dir($backup_dir)) mkdir($backup_dir, 0777, true);
$report = array();

// === 1. rehub-options.json → 3 ключа REHub ===
$json = file_get_contents("/tmp/rehub-options.json");
if ($json === false) { echo "FATAL: /tmp/rehub-options.json не найден\n"; exit(1); }
$data = json_decode($json, true);
if (json_last_error() !== JSON_ERROR_NONE) {
  echo "FATAL JSON: " . json_last_error_msg() . "\n"; exit(1);
}
foreach (array("rehub_option", "rehub_design_selector", "rehub_wizard_option") as $k) {
  if (!isset($data[$k])) { $report[] = "skipped $k (нет в файле)"; continue; }
  $old = get_option($k);
  file_put_contents("$backup_dir/$k.bak.json", json_encode($old));
  update_option($k, $data[$k]);
  $size = is_array($data[$k]) ? count($data[$k]) . " keys" : strlen((string)$data[$k]) . " bytes";
  $report[] = "✓ applied $k ($size)";
}

// === 2. customizer.dat (PHP serialized) → theme_mods + custom CSS ===
$raw = file_get_contents("/tmp/customizer.dat");
$cdata = $raw !== false ? @unserialize($raw) : false;
if ($cdata === false || !is_array($cdata)) {
  $report[] = "⚠ customizer.dat не парсится — пропущено";
} else {
  $stylesheet = get_stylesheet();
  $old_mods = get_option("theme_mods_" . $stylesheet);
  file_put_contents("$backup_dir/theme_mods.bak.json", json_encode($old_mods));
  if (isset($cdata["mods"]) && is_array($cdata["mods"])) {
    update_option("theme_mods_" . $stylesheet, $cdata["mods"]);
    $report[] = "✓ applied theme_mods (" . count($cdata["mods"]) . " keys → $stylesheet)";
  }
  if (!empty($cdata["wp_css"])) {
    wp_update_custom_css_post($cdata["wp_css"]);
    $report[] = "✓ applied custom CSS (" . strlen($cdata["wp_css"]) . " bytes)";
  } else {
    $report[] = "skipped custom CSS (пусто)";
  }
  if (isset($cdata["options"])) {
    $report[] = "skipped " . count($cdata["options"]) . " options (НЕ применяем — могут затереть popolkam blogname/permalinks)";
  }
}

// Сбросить кеши
delete_transient("rehub_options_cache");
wp_cache_flush();
$report[] = "✓ caches flushed";

echo implode("\n", $report) . "\n";
echo "\nbackup сохранён в $backup_dir/\n";
