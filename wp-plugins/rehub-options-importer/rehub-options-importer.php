<?php
/**
 * Plugin Name: REHub Options Importer (popolkam staging pipeline)
 * Description: Загружает JSON-файл с rehub_option / rehub_design_selector / rehub_wizard_option, экспортированный со staging WP. Одноразовый плагин — после применения можно удалить.
 * Version: 1.0
 * Author: SCC pipeline
 */

if (!defined('ABSPATH')) exit;

add_action('admin_menu', function () {
  add_management_page(
    'REHub Options Importer',
    'REHub Options Importer',
    'manage_options',
    'rehub-options-importer',
    'rehub_options_importer_page'
  );
});

function rehub_options_importer_page() {
  if (!current_user_can('manage_options')) wp_die('Forbidden');

  $msg = '';
  if (!empty($_POST['rehub_oi_nonce']) && wp_verify_nonce($_POST['rehub_oi_nonce'], 'rehub_oi')) {
    if (!empty($_FILES['rehub_oi_file']['tmp_name'])) {
      $raw = file_get_contents($_FILES['rehub_oi_file']['tmp_name']);
      $data = json_decode($raw, true);
      if (json_last_error() !== JSON_ERROR_NONE) {
        $msg = '<div class="error"><p>JSON parse error: ' . esc_html(json_last_error_msg()) . '</p></div>';
      } else {
        $applied = array();
        $allowed_keys = array('rehub_option', 'rehub_design_selector', 'rehub_wizard_option');
        foreach ($allowed_keys as $k) {
          if (isset($data[$k])) {
            // backup before overwrite
            $old = get_option($k);
            update_option('rehub_oi_backup_' . $k, $old);
            update_option($k, $data[$k]);
            $applied[] = $k;
          }
        }
        $msg = '<div class="updated"><p>Импортировано: <code>' . esc_html(implode(', ', $applied)) . '</code>. '
             . 'Старые значения сохранены в rehub_oi_backup_*. Очисти кеш REHub в Theme Options если он есть.</p></div>';
      }
    }
  }

  // Показ rollback при наличии бэкапов
  $rollback_keys = array();
  foreach (array('rehub_option', 'rehub_design_selector', 'rehub_wizard_option') as $k) {
    if (get_option('rehub_oi_backup_' . $k, null) !== null) $rollback_keys[] = $k;
  }
  if (!empty($_POST['rehub_oi_rollback']) && wp_verify_nonce($_POST['rehub_oi_nonce'], 'rehub_oi')) {
    foreach ($rollback_keys as $k) {
      $old = get_option('rehub_oi_backup_' . $k);
      update_option($k, $old);
      delete_option('rehub_oi_backup_' . $k);
    }
    $msg = '<div class="updated"><p>Rollback выполнен — старые значения восстановлены.</p></div>';
    $rollback_keys = array();
  }

  ?>
  <div class="wrap">
    <h1>REHub Options Importer</h1>
    <p>Одноразовый плагин для применения экспортированных опций из staging. После применения можно деактивировать и удалить.</p>
    <?php echo $msg; ?>

    <h2>1. Импорт</h2>
    <form method="post" enctype="multipart/form-data" style="background:#fff;padding:20px;border:1px solid #ccc;">
      <?php wp_nonce_field('rehub_oi', 'rehub_oi_nonce'); ?>
      <p>Загрузи <code>rehub-options.json</code> из staging:</p>
      <input type="file" name="rehub_oi_file" accept=".json" required />
      <p style="margin-top:15px;">
        <button type="submit" class="button button-primary">Импортировать в rehub_option</button>
      </p>
      <p><em>Перед записью все текущие значения сохраняются в <code>rehub_oi_backup_*</code> (можно откатить).</em></p>
    </form>

    <?php if (!empty($rollback_keys)): ?>
    <h2 style="margin-top:30px;">2. Rollback (есть бэкапы)</h2>
    <form method="post" style="background:#fff;padding:20px;border:1px solid #ccc;">
      <?php wp_nonce_field('rehub_oi', 'rehub_oi_nonce'); ?>
      <p>Восстановить ключи <code><?php echo esc_html(implode(', ', $rollback_keys)); ?></code> из бэкапа:</p>
      <button type="submit" name="rehub_oi_rollback" value="1" class="button" onclick="return confirm('Откатить настройки REHub?')">Откатить</button>
    </form>
    <?php endif; ?>

    <h2 style="margin-top:30px;">Текущие значения (preview)</h2>
    <table class="widefat">
      <thead><tr><th>Key</th><th>Size</th><th>First 100 chars</th></tr></thead>
      <tbody>
        <?php foreach (array('rehub_option', 'rehub_design_selector', 'rehub_wizard_option') as $k):
          $v = get_option($k);
          $j = is_string($v) ? $v : wp_json_encode($v);
          ?>
          <tr>
            <td><code><?php echo esc_html($k); ?></code></td>
            <td><?php echo strlen((string)$j); ?> bytes</td>
            <td><code><?php echo esc_html(substr((string)$j, 0, 100)); ?>...</code></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
  <?php
}
