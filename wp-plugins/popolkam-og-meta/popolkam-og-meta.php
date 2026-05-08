<?php
/**
 * Plugin Name: Popolkam OG Meta
 * Description: Выводит og:image, twitter:card, og:title/description в head, обходя Rank Math (не работающий с REHub). Привязка SVG OG-images к конкретным page ID.
 * Version: 1.0
 */

if (!defined('ABSPATH')) exit;

const POPOLKAM_OG_DEFAULT = 'https://popolkam.ru/wp-content/uploads/2026/05/og-homepage.svg';

function popolkam_og_image_for_page() {
  $map = array(
    24 => 'https://popolkam.ru/wp-content/uploads/2026/05/og-homepage.svg',
    59 => 'https://popolkam.ru/wp-content/uploads/2026/05/og-author.svg',
    88 => 'https://popolkam.ru/wp-content/uploads/2026/05/og-methodology.svg',
    86 => 'https://popolkam.ru/wp-content/uploads/2026/05/og-homepage.svg',
    87 => 'https://popolkam.ru/wp-content/uploads/2026/05/og-homepage.svg',
    85 => 'https://popolkam.ru/wp-content/uploads/2026/05/og-homepage.svg',
  );
  $id = is_singular() ? get_queried_object_id() : 0;
  if (isset($map[$id])) return $map[$id];
  if (is_singular()) {
    $thumb = get_post_thumbnail_id();
    if ($thumb) {
      $url = wp_get_attachment_url($thumb);
      if ($url) return $url;
    }
  }
  return POPOLKAM_OG_DEFAULT;
}

add_action('wp_head', function () {
  if (is_admin()) return;
  $title = wp_get_document_title();
  $desc = is_singular() ? get_the_excerpt() : get_bloginfo('description');
  $desc = wp_strip_all_tags($desc);
  if (mb_strlen($desc) > 200) $desc = mb_substr($desc, 0, 197) . '…';
  $url = is_singular() ? get_permalink() : home_url('/');
  $og_image = popolkam_og_image_for_page();
  $type = is_single() ? 'article' : (is_singular() ? 'website' : 'website');
  $site_name = get_bloginfo('name');

  echo "\n<!-- Popolkam OG meta -->\n";
  echo '<meta property="og:locale" content="ru_RU" />' . "\n";
  echo '<meta property="og:type" content="' . esc_attr($type) . '" />' . "\n";
  echo '<meta property="og:title" content="' . esc_attr($title) . '" />' . "\n";
  echo '<meta property="og:description" content="' . esc_attr($desc) . '" />' . "\n";
  echo '<meta property="og:url" content="' . esc_url($url) . '" />' . "\n";
  echo '<meta property="og:site_name" content="' . esc_attr($site_name) . '" />' . "\n";
  echo '<meta property="og:image" content="' . esc_url($og_image) . '" />' . "\n";
  echo '<meta property="og:image:width" content="1200" />' . "\n";
  echo '<meta property="og:image:height" content="630" />' . "\n";
  echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
  echo '<meta name="twitter:title" content="' . esc_attr($title) . '" />' . "\n";
  echo '<meta name="twitter:description" content="' . esc_attr($desc) . '" />' . "\n";
  echo '<meta name="twitter:image" content="' . esc_url($og_image) . '" />' . "\n";
  if (is_single()) {
    echo '<meta property="article:published_time" content="' . esc_attr(get_the_date('c')) . '" />' . "\n";
    echo '<meta property="article:modified_time" content="' . esc_attr(get_the_modified_date('c')) . '" />' . "\n";
    $author_id = get_the_author_meta('ID');
    if ($author_id) {
      echo '<meta property="article:author" content="' . esc_attr(get_the_author_meta('display_name', $author_id)) . '" />' . "\n";
    }
  }
}, 5);
