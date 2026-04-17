<?php
/**
 * Plugin Name: Popolkam Calculators
 * Description: Интерактивные калькуляторы для обзоров popolkam.ru (TCO кофемашины, окупаемость и др.)
 * Version: 1.0.0
 * Author: Popolkam
 * Text Domain: popolkam-calc
 */

if (!defined('ABSPATH')) exit;

define('POPOLKAM_CALC_VERSION', '1.0.0');
define('POPOLKAM_CALC_URL', plugin_dir_url(__FILE__));

/**
 * Регистрация assets (подключаем только там где есть shortcode)
 */
function popolkam_calc_register_assets() {
    wp_register_style(
        'popolkam-tco-calc',
        POPOLKAM_CALC_URL . 'assets/tco-calc.css',
        [],
        POPOLKAM_CALC_VERSION
    );
    wp_register_script(
        'popolkam-tco-calc',
        POPOLKAM_CALC_URL . 'assets/tco-calc.js',
        [],
        POPOLKAM_CALC_VERSION,
        true
    );
}
add_action('wp_enqueue_scripts', 'popolkam_calc_register_assets');

/**
 * Получить параметры калькулятора — приоритет: shortcode → post_meta → дефолт
 */
function popolkam_tco_get_config($atts = []) {
    $post_id = get_the_ID();
    $meta = [];
    if ($post_id) {
        $meta = [
            'machine_price' => get_post_meta($post_id, 'popolkam_machine_price', true),
            'machine_name'  => get_post_meta($post_id, 'popolkam_machine_name', true) ?: get_the_title($post_id),
            'machine_type'  => get_post_meta($post_id, 'popolkam_machine_type', true),
            'buy_url'       => get_post_meta($post_id, 'popolkam_buy_url', true),
            'buy_label'     => get_post_meta($post_id, 'popolkam_buy_label', true),
        ];
    }

    $atts = wp_parse_args($atts, []);

    return [
        'machine_price' => !empty($atts['machine_price']) ? $atts['machine_price'] : ($meta['machine_price'] ?? ''),
        'machine_name'  => !empty($atts['machine_name'])  ? $atts['machine_name']  : ($meta['machine_name'] ?? ''),
        'machine_type'  => !empty($atts['machine_type'])  ? $atts['machine_type']  : ($meta['machine_type'] ?: 'automatic'),
        'cups_per_day'  => !empty($atts['cups_per_day'])  ? $atts['cups_per_day']  : '3',
        'buy_url'       => !empty($atts['buy_url'])       ? $atts['buy_url']       : ($meta['buy_url'] ?? ''),
        'buy_label'     => !empty($atts['buy_label'])     ? $atts['buy_label']     : ($meta['buy_label'] ?: 'Смотреть цену'),
    ];
}

/**
 * Shortcode: [popolkam_tco_calc]
 * Если параметры не переданы — читает post_meta текущего поста (см. popolkam_tco_get_config).
 *
 * Параметры:
 *   machine_price="30000"                  — цена модели, ₽
 *   machine_name="De'Longhi Magnifica S"   — название
 *   machine_type="automatic|horn|capsule"
 *   cups_per_day="3"
 *   buy_url="..."                          — партнёрская ссылка
 *   buy_label="Смотреть на Я.Маркете"
 */
function popolkam_tco_calc_shortcode($atts) {
    $config = popolkam_tco_get_config($atts ?: []);

    // Подключаем assets только если shortcode реально используется
    wp_enqueue_style('popolkam-tco-calc');
    wp_enqueue_script('popolkam-tco-calc');

    $data = esc_attr(wp_json_encode([
        'machinePrice' => $config['machine_price'] ? (int) $config['machine_price'] : null,
        'machineName' => $config['machine_name'],
        'machineType' => $config['machine_type'],
        'cupsPerDay' => (int) $config['cups_per_day'],
        'buyUrl' => $config['buy_url'],
        'buyLabel' => $config['buy_label'],
    ]));

    return '<div class="popolkam-tco-calc" data-config="' . $data . '"></div>';
}
add_shortcode('popolkam_tco_calc', 'popolkam_tco_calc_shortcode');

/**
 * Автовставка калькулятора в конец обзора кофемашины.
 * Условия:
 *   - single post
 *   - категория "Кофемашины" (slug=kofemashiny) или её дочерняя
 *   - post_meta popolkam_machine_price задан
 *   - в контенте ещё нет shortcode [popolkam_tco_calc] (чтобы не дублировать)
 *
 * Отключить на конкретном посте: установить post_meta popolkam_tco_skip = 1
 */
function popolkam_tco_auto_insert($content) {
    if (!is_singular('post') || !in_the_loop() || !is_main_query()) return $content;

    $post_id = get_the_ID();
    if (!$post_id) return $content;

    // Skip-флаг
    if (get_post_meta($post_id, 'popolkam_tco_skip', true)) return $content;

    // Уже есть shortcode — не дублируем
    if (has_shortcode($content, 'popolkam_tco_calc')) return $content;

    // Должна быть задана цена машины (иначе калькулятор бесполезен)
    $price = get_post_meta($post_id, 'popolkam_machine_price', true);
    if (!$price) return $content;

    // Категория кофемашины (основная или подкатегория)
    $kofe_cat = get_category_by_slug('kofemashiny');
    if (!$kofe_cat) return $content;
    $in_coffee = false;
    foreach (wp_get_post_categories($post_id) as $cat_id) {
        $cat = get_category($cat_id);
        if (!$cat) continue;
        // Прямая категория или дочерняя (parent = kofemashiny)
        if ($cat_id === $kofe_cat->term_id || $cat->parent === $kofe_cat->term_id) {
            $in_coffee = true;
            break;
        }
    }
    if (!$in_coffee) return $content;

    $calc = do_shortcode('[popolkam_tco_calc]');
    return $content . "\n\n" . '<h3 style="margin-top:32px;">💰 Сколько реально стоит эта кофемашина в использовании</h3>' . "\n" . $calc;
}
add_filter('the_content', 'popolkam_tco_auto_insert', 20);
