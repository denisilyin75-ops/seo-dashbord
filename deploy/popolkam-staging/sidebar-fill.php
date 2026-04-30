<?php
require_once "/var/www/html/wp-load.php";

function add_widget_instance($widget_class, $instance_data, $sidebar_id) {
  $opt_key = "widget_" . $widget_class;
  $instances = get_option($opt_key, array());
  $next_id = 1;
  foreach (array_keys($instances) as $k) {
    if (is_numeric($k) && $k >= $next_id) $next_id = $k + 1;
  }
  $instances[$next_id] = $instance_data;
  $instances["_multiwidget"] = 1;
  update_option($opt_key, $instances);
  $widget_id = "$widget_class-$next_id";
  $sw = get_option("sidebars_widgets");
  if (!isset($sw[$sidebar_id]) || !is_array($sw[$sidebar_id])) $sw[$sidebar_id] = array();
  if (!in_array($widget_id, $sw[$sidebar_id])) $sw[$sidebar_id][] = $widget_id;
  update_option("sidebars_widgets", $sw);
  return $widget_id;
}

// Wipe rhsidebar before refilling
$sw = get_option("sidebars_widgets");
$sw["rhsidebar"] = array();
update_option("sidebars_widgets", $sw);

// 1. Latest Tabs — Свежие + Популярные
$id1 = add_widget_instance("rehub_latest_tabs_widget", array(
  "titlefirst" => "Свежие обзоры",
  "titlesecond" => "Популярные",
  "tabs1" => 5,
  "tabs2" => 5,
  "basedby" => "date",
  "basedbysec" => "comments",
  "dark" => "",
), "rhsidebar");

// 2. Sticky on scroll — CTA "Подобрать кофемашину"
$cta_html = '<div style="text-align:center;padding:14px 12px;background:linear-gradient(135deg,#f97316,#ef4444);border-radius:8px;color:#fff;">'
  . '<div style="font-size:22px;font-weight:800;line-height:1.2;margin-bottom:6px;">Какая кофемашина для вас?</div>'
  . '<div style="font-size:13px;opacity:0.95;margin-bottom:14px;">10 моделей разобраны по бюджету, объёму и типу напитков</div>'
  . '<a href="/kofemashiny/top-10-kofemashin/" style="display:inline-block;padding:10px 22px;background:#fff;color:#f97316;border-radius:6px;font-weight:700;text-decoration:none;">Открыть топ →</a>'
  . '</div>';
$id2 = add_widget_instance("rehub_sticky_on_scroll", array(
  "title" => "",
  "text_code" => $cta_html,
  "type" => "",
  "postid" => "",
  "autocontent" => "",
), "rhsidebar");

// 3. Better menu — Категории через "Главное меню" (id=21)
$id3 = add_widget_instance("rehub_better_menu", array(
  "title" => "Категории",
  "icon" => "none",
  "type" => "simple",
  "nav_menu" => 21,
), "rhsidebar");

wp_cache_flush();

echo "✓ Added to rhsidebar:\n";
echo "  - $id1 (Latest Tabs: Свежие + Популярные)\n";
echo "  - $id2 (Sticky CTA: Подобрать кофемашину)\n";
echo "  - $id3 (Better Menu: Категории)\n";
