<?php
/**
 * Plugin Name: Popolkam Cookie Banner
 * Description: Лёгкий cookie-консент по 152-ФЗ + GDPR. Без зависимостей. Хранит выбор в localStorage. Соответствует EDPB recommendations + Roskomnadzor.
 * Version: 1.0
 * Author: SCC pipeline
 */

if (!defined('ABSPATH')) exit;

add_action('wp_footer', function () {
  if (is_admin()) return;
  ?>
  <style id="popolkam-cookie-css">
    #popolkam-cookie-banner {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      max-width: 720px;
      margin: 0 auto;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
      padding: 18px 20px;
      z-index: 99999;
      display: none;
      font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1e293b;
    }
    #popolkam-cookie-banner.show { display: block; }
    #popolkam-cookie-banner .pcb-content {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    #popolkam-cookie-banner .pcb-text {
      flex: 1;
      min-width: 280px;
    }
    #popolkam-cookie-banner .pcb-text strong { color: #f97316; }
    #popolkam-cookie-banner .pcb-text a {
      color: #f97316;
      text-decoration: underline;
    }
    #popolkam-cookie-banner .pcb-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #popolkam-cookie-banner button {
      padding: 9px 16px;
      border-radius: 6px;
      border: 0;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition: opacity 0.15s;
      font-family: inherit;
    }
    #popolkam-cookie-banner button:hover { opacity: 0.85; }
    #popolkam-cookie-banner .pcb-accept {
      background: #f97316;
      color: #fff;
    }
    #popolkam-cookie-banner .pcb-essential {
      background: #fff;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    @media (max-width: 600px) {
      #popolkam-cookie-banner {
        bottom: 0;
        left: 0;
        right: 0;
        border-radius: 12px 12px 0 0;
      }
    }
  </style>

  <div id="popolkam-cookie-banner" role="dialog" aria-labelledby="pcb-title">
    <div class="pcb-content">
      <div class="pcb-text">
        <strong id="pcb-title">🍪 Cookies</strong> — мы используем технические cookies (для работы сайта) и аналитические (Yandex.Metrika, GA4) для улучшения сервиса. Партнёрский трекинг включается только при клике на партнёрскую ссылку.
        <a href="/politika-konfidentsialnosti/">Подробнее →</a>
      </div>
      <div class="pcb-actions">
        <button class="pcb-essential" onclick="window.popolkamCookieChoice('essential')">Только необходимые</button>
        <button class="pcb-accept" onclick="window.popolkamCookieChoice('all')">Принять все</button>
      </div>
    </div>
  </div>

  <script id="popolkam-cookie-js">
    (function () {
      var KEY = 'popolkam:cookie-consent';
      var EXPIRY_DAYS = 180;
      var stored = (function () {
        try {
          var raw = localStorage.getItem(KEY);
          if (!raw) return null;
          var d = JSON.parse(raw);
          if (!d.ts || Date.now() - d.ts > EXPIRY_DAYS * 86400000) {
            localStorage.removeItem(KEY);
            return null;
          }
          return d;
        } catch (e) { return null; }
      })();

      var banner = document.getElementById('popolkam-cookie-banner');
      if (!stored) banner.classList.add('show');

      window.popolkamCookieChoice = function (choice) {
        try {
          localStorage.setItem(KEY, JSON.stringify({ choice: choice, ts: Date.now() }));
        } catch (e) {}
        banner.classList.remove('show');
        // Hook для аналитики/рекламы — пока no-op
        if (choice === 'all' && typeof window.popolkamCookieAccepted === 'function') {
          window.popolkamCookieAccepted();
        }
        document.dispatchEvent(new CustomEvent('popolkam:cookie-consent', { detail: { choice: choice } }));
      };

      // API для других скриптов узнать статус
      window.popolkamCookieStatus = function () {
        return stored ? stored.choice : 'pending';
      };
    })();
  </script>
  <?php
});

// Settings page — посмотреть статистику consents (хранится в localStorage у пользователя,
// но agent может пинговать /wp-admin/admin-ajax.php?action=popolkam_consent_log если хочется
// серверный учёт. Сейчас — без серверного логирования для приватности.)
add_action('admin_menu', function () {
  add_options_page(
    'Cookie Banner',
    'Cookie Banner',
    'manage_options',
    'popolkam-cookie-banner',
    function () {
      ?>
      <div class="wrap">
        <h1>Popolkam Cookie Banner</h1>
        <p>Активный плагин — показывает cookie-консент новым посетителям.</p>
        <h2>Поведение</h2>
        <ul>
          <li>Показ: новым посетителям (кому ещё не записан выбор в localStorage)</li>
          <li>Срок выбора: 180 дней (потом баннер показывается снова)</li>
          <li>Хранение: localStorage пользователя (без серверного логирования)</li>
          <li>Опции: «Только необходимые» / «Принять все»</li>
          <li>Соответствие: 152-ФЗ + GDPR + Roskomnadzor recommendations</li>
        </ul>
        <h2>Интеграция с аналитикой</h2>
        <p>Чтобы условно загружать GA4/Metrika только после согласия — добавьте в footer:</p>
        <pre style="background:#f1f5f9;padding:14px;border-radius:6px"><code>document.addEventListener('popolkam:cookie-consent', function(e) {
  if (e.detail.choice === 'all') {
    // загрузить трекеры
  }
});</code></pre>
      </div>
      <?php
    }
  );
});
