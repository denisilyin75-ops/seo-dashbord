#!/usr/bin/env bash
# Полировка после provision-site.sh — превращает базовый WP в готовый affiliate-каталог.
# Идемпотентный. Запускается после provision-site.sh, использует тот же preset.
#
# Делает:
#   - Удаляет дефолтный WooCommerce-ный мусор (Shop/Cart/Checkout/My Account/Refund)
#   - Удаляет Uncategorized
#   - Применяет описания категорий из пресета
#   - Создаёт обязательные для E-E-A-T страницы: About, Contacts, How we test, Privacy, Terms
#   - Создаёт Footer-меню с этими страницами
#   - Добавляет footer widgets (About + Categories + Recent + Footer Menu)
#   - Базовые настройки Rank Math
#
# Использование:
#   source presets/popolkam.env && bash polish-site.sh
#
# Требует те же переменные что и provision-site.sh + опционально:
#   AUTHOR_NAME         — имя автора для E-E-A-T страниц
#   BRAND_TAGLINE       — слоган бренда (footer)
#   CATEGORY_DESCRIPTIONS — pipe-separated: "slug=desc;slug=desc;..."

set -euo pipefail

: "${DOMAIN:?DOMAIN required}"
: "${SITE_SLUG:?SITE_SLUG required}"
: "${SITE_TITLE:?SITE_TITLE required}"
: "${SITE_DESCRIPTION:?SITE_DESCRIPTION required}"
: "${CONTAINER:=wp-${SITE_SLUG}}"
: "${AUTHOR_NAME:=Редакция Popolkam}"
: "${BRAND_TAGLINE:=${SITE_DESCRIPTION}}"
: "${ADMIN_EMAIL:=info@${DOMAIN}}"
: "${CATEGORY_DESCRIPTIONS:=}"

log() { echo "[$(date +%H:%M:%S)] $*" >&2; }
wp_exec() { docker exec "$CONTAINER" wp --allow-root "$@"; }

# ============ 1. Удаляем Uncategorized (правильно: смена default → delete) ============
log "1/8  Уборка мусора"
UNCAT_ID=$(wp_exec term list category --slug=uncategorized --field=term_id 2>/dev/null | tr -d '\r' | head -1)
if [[ -n "$UNCAT_ID" ]]; then
  # Берём первую НЕ Uncategorized категорию — назначаем её default
  FIRST_CAT_ID=$(wp_exec term list category --hide_empty=0 --fields=term_id,slug --format=csv 2>/dev/null | \
    awk -F, 'NR>1 && $2 != "uncategorized" {print $1; exit}')
  if [[ -n "$FIRST_CAT_ID" ]]; then
    wp_exec option update default_category "$FIRST_CAT_ID" >/dev/null
    log "      default_category → $FIRST_CAT_ID"
  fi
  wp_exec term delete category "$UNCAT_ID" >/dev/null 2>&1 && log "      Uncategorized удалён" || log "      Uncategorized не удалить"
fi

# ============ 2. Удаляем WooCommerce-страницы (не нужны для affiliate) ============
log "2/8  Удаление WC-страниц (affiliate не торгует напрямую)"
for SLUG in shop cart checkout my-account refund_returns refund-returns; do
  ID=$(wp_exec post list --post_type=page --name="$SLUG" --field=ID --format=ids 2>/dev/null | tr -d '\r' | head -1)
  if [[ -n "$ID" ]]; then
    wp_exec post delete "$ID" --force >/dev/null 2>&1 && log "      удалено /$SLUG/ (id=$ID)"
  fi
done

# ============ 3. Описания категорий (SEO + UX) ============
log "3/8  Описания категорий"
if [[ -n "$CATEGORY_DESCRIPTIONS" ]]; then
  IFS=';' read -ra DESC_LIST <<< "$CATEGORY_DESCRIPTIONS"
  for DESC_LINE in "${DESC_LIST[@]}"; do
    DESC_LINE=$(echo "$DESC_LINE" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [[ -z "$DESC_LINE" ]] && continue
    CAT_SLUG=$(echo "$DESC_LINE" | cut -d'=' -f1)
    CAT_DESC=$(echo "$DESC_LINE" | cut -d'=' -f2-)
    TERM_ID=$(wp_exec term list category --slug="$CAT_SLUG" --field=term_id 2>/dev/null | tr -d '\r' | head -1)
    if [[ -n "$TERM_ID" ]]; then
      wp_exec term update category "$TERM_ID" --description="$CAT_DESC" >/dev/null
      log "      $CAT_SLUG — описание обновлено"
    fi
  done
else
  log "      CATEGORY_DESCRIPTIONS не задано — пропуск"
fi

# ============ 4. E-E-A-T страницы (About, Contacts, How we test, Privacy, Terms) ============
log "4/8  Обязательные страницы"

create_page_if_missing() {
  local SLUG="$1"
  local TITLE="$2"
  local CONTENT="$3"
  local EXISTS
  EXISTS=$(wp_exec post list --post_type=page --name="$SLUG" --field=ID --format=ids 2>/dev/null | tr -d '\r' | head -1)
  if [[ -z "$EXISTS" ]]; then
    local PID
    PID=$(wp_exec post create --post_type=page --post_status=publish --post_title="$TITLE" --post_name="$SLUG" --post_content="$CONTENT" --porcelain)
    log "      /$SLUG/ создана (id=$PID)"
    echo "$PID"
  else
    log "      /$SLUG/ уже есть (id=$EXISTS) — пропуск"
    echo "$EXISTS"
  fi
}

ABOUT_CONTENT="<h2>О ${SITE_TITLE%% *}</h2>
<p>${BRAND_TAGLINE}</p>
<p>Мы пишем независимые обзоры и сравнения. Не принимаем деньги от производителей за похвалу. Монетизация — через партнёрские ссылки на официальные магазины: когда вы покупаете товар по нашей ссылке, мы получаем небольшую комиссию от магазина (не от вас).</p>
<h3>Наш подход</h3>
<ul>
<li><strong>Честные минусы.</strong> Даже топовые модели имеют недостатки — мы их называем.</li>
<li><strong>Глубокий разбор.</strong> Не пересказ маркетинговых материалов, а реальный опыт и тесты.</li>
<li><strong>Актуальные цены.</strong> Обновляем цены автоматически, чтобы вы видели реальную картину.</li>
<li><strong>Аудиторная ответственность.</strong> Рекомендуем только то, что покупают и не возвращают.</li>
</ul>
<h3>Автор</h3>
<p><strong>${AUTHOR_NAME}</strong> — редакция ${DOMAIN}. Связаться: <a href=\"/contacts/\">контакты</a>.</p>"

CONTACTS_CONTENT="<h2>Контакты</h2>
<p>Мы всегда рады обратной связи — исправлениям, советам, предложениям о новых обзорах.</p>
<ul>
<li><strong>Email:</strong> <a href=\"mailto:${ADMIN_EMAIL}\">${ADMIN_EMAIL}</a></li>
<li><strong>Сотрудничество:</strong> если вы производитель или продавец — напишите на тот же адрес с темой «Партнёрство»</li>
</ul>
<p>Мы не берём деньги за положительные обзоры. Мы можем бесплатно протестировать ваш товар — но результат теста публикуем честно.</p>"

HOW_WE_TEST_CONTENT="<h2>Как мы тестируем</h2>
<p>Наши обзоры — не пересказ характеристик с сайта производителя. Каждая модель проверяется по единой методологии, чтобы вы могли сравнивать разные товары по сопоставимым параметрам.</p>
<h3>Этапы теста</h3>
<ol>
<li><strong>Распаковка и сборка.</strong> Фиксируем комплектацию, качество упаковки, удобство первого запуска.</li>
<li><strong>Повседневное использование.</strong> Минимум 2 недели в реальных условиях: кухня / квартира / типовые задачи.</li>
<li><strong>Измерения.</strong> Там, где возможно — числа: децибелы, ватты, секунды, граммы.</li>
<li><strong>Сравнение.</strong> С 2-3 конкурентами в той же ценовой категории.</li>
<li><strong>Экспертное мнение.</strong> Общий вердикт: кому подойдёт, кому не стоит брать.</li>
</ol>
<h3>Что мы НЕ делаем</h3>
<ul>
<li>Не переписываем обзоры с других сайтов — это палит Google и бьёт по доверию.</li>
<li>Не умалчиваем недостатки ради партнёрской комиссии.</li>
<li>Не рекомендуем товары, которые лично не видели или не проанализировали по достоверным источникам.</li>
</ul>
<h3>Обновления</h3>
<p>Топ-обзоры обновляем каждые 6 месяцев — меняются цены, появляются конкуренты, обновляется прошивка у производителя.</p>"

PRIVACY_CONTENT="<h2>Политика конфиденциальности</h2>
<p>Последнее обновление: $(date +%d.%m.%Y)</p>
<h3>Какие данные мы собираем</h3>
<ul>
<li><strong>Аналитика посещений</strong> — обезличенные данные (страны, устройства, источники трафика) через Google Analytics.</li>
<li><strong>Поисковые данные</strong> — обезличенные запросы через Google Search Console (не содержат персональных данных).</li>
<li><strong>Партнёрские клики</strong> — факт перехода по нашим ссылкам на магазины-партнёры.</li>
<li><strong>Формы обратной связи</strong> — если вы пишете нам, мы сохраняем email для ответа.</li>
</ul>
<h3>Cookies</h3>
<p>Сайт использует cookies для аналитики и отслеживания партнёрских переходов. Вы можете отключить cookies в настройках браузера, но некоторые функции могут работать некорректно.</p>
<h3>Третьи стороны</h3>
<p>Данные могут обрабатываться: Google (аналитика), Admitad/Яндекс.Маркет (партнёрские сети), хостинг-провайдер (логи сервера). Мы не продаём и не передаём ваши данные рекламодателям.</p>
<h3>Ваши права</h3>
<p>Вы можете запросить удаление своих данных на <a href=\"mailto:${ADMIN_EMAIL}\">${ADMIN_EMAIL}</a>.</p>"

TERMS_CONTENT="<h2>Пользовательское соглашение</h2>
<p>Последнее обновление: $(date +%d.%m.%Y)</p>
<h3>Информация на сайте</h3>
<p>Все обзоры, сравнения и рекомендации носят информационный характер. Мы стараемся предоставить точные и актуальные сведения, но не гарантируем отсутствие ошибок. Цены и характеристики могут меняться — всегда проверяйте финальную информацию в магазине перед покупкой.</p>
<h3>Партнёрские ссылки</h3>
<p>Сайт содержит партнёрские ссылки. Переходя по ним и совершая покупку, вы не платите больше — цена остаётся той же, что и при прямом переходе на сайт магазина. Мы получаем комиссию от магазина, что позволяет нам работать и создавать контент.</p>
<h3>Ответственность</h3>
<p>Мы не несём ответственности за качество товаров и услуг магазинов-партнёров. Все претензии по товарам решайте напрямую с продавцом согласно его правилам и законодательству РФ.</p>
<h3>Интеллектуальная собственность</h3>
<p>Тексты и изображения на сайте защищены авторским правом. Перепечатка возможна только с активной ссылкой на источник.</p>
<h3>Изменения</h3>
<p>Мы можем обновлять это соглашение. Дата последнего обновления указана в начале документа.</p>"

ABOUT_ID=$(create_page_if_missing "about" "О нас" "$ABOUT_CONTENT")
CONTACTS_ID=$(create_page_if_missing "contacts" "Контакты" "$CONTACTS_CONTENT")
HOW_ID=$(create_page_if_missing "how-we-test" "Как мы тестируем" "$HOW_WE_TEST_CONTENT")
PRIVACY_ID=$(create_page_if_missing "privacy" "Политика конфиденциальности" "$PRIVACY_CONTENT")
TERMS_ID=$(create_page_if_missing "terms" "Пользовательское соглашение" "$TERMS_CONTENT")

# ============ 5. Footer меню с E-E-A-T страницами ============
log "5/8  Footer меню"
FOOTER_MENU_ID=$(wp_exec menu list --format=json 2>/dev/null | docker exec -i "$CONTAINER" php -r "
  \$j = json_decode(file_get_contents('php://stdin'), true);
  foreach (\$j as \$m) { if (\$m['name'] === 'Footer меню') { echo \$m['term_id']; exit; } }
" 2>/dev/null || echo "")

if [[ -z "$FOOTER_MENU_ID" ]]; then
  FOOTER_MENU_ID=$(wp_exec menu create "Footer меню" --porcelain)
  log "      Footer меню создано ID=$FOOTER_MENU_ID"

  wp_exec menu item add-post "$FOOTER_MENU_ID" "$ABOUT_ID" --title="О нас" >/dev/null
  wp_exec menu item add-post "$FOOTER_MENU_ID" "$HOW_ID" --title="Как мы тестируем" >/dev/null
  wp_exec menu item add-post "$FOOTER_MENU_ID" "$CONTACTS_ID" --title="Контакты" >/dev/null
  wp_exec menu item add-post "$FOOTER_MENU_ID" "$PRIVACY_ID" --title="Конфиденциальность" >/dev/null
  wp_exec menu item add-post "$FOOTER_MENU_ID" "$TERMS_ID" --title="Условия" >/dev/null
else
  log "      Footer меню уже есть ID=$FOOTER_MENU_ID — пропуск"
fi

# ============ 6. Footer widgets (About + Categories + Recent + Menu) ============
log "6/8  Footer widgets"

# Проверяем, что footerfirst ещё не имеет text widget
if ! wp_exec widget list footerfirst --fields=id 2>/dev/null | grep -q "text-"; then
  wp_exec widget add text footerfirst --title="О ${SITE_TITLE%% *}" \
    --text="${BRAND_TAGLINE}" >/dev/null
  log "      footerfirst: About text"
fi

if ! wp_exec widget list footersecond --fields=id 2>/dev/null | grep -q "categories-"; then
  wp_exec widget add categories footersecond --title="Категории" --count=0 --hierarchical=0 --dropdown=0 >/dev/null
  log "      footersecond: Categories"
fi

if ! wp_exec widget list footerthird --fields=id 2>/dev/null | grep -q "recent-posts-"; then
  wp_exec widget add recent-posts footerthird --title="Свежие обзоры" --number=5 --show_date=1 >/dev/null
  log "      footerthird: Recent posts"
fi

# Footer menu widget в footercustom (если есть такой sidebar)
if ! wp_exec widget list footercustom --fields=id 2>/dev/null | grep -q "nav_menu-"; then
  wp_exec widget add nav_menu footercustom --title="Информация" --nav_menu="$FOOTER_MENU_ID" >/dev/null 2>&1 && \
    log "      footercustom: Navigation menu" || log "      footercustom не поддерживается, пропуск"
fi

# ============ 7. Rank Math базовая настройка ============
log "7/8  Rank Math"
if wp_exec plugin is-active seo-by-rank-math 2>/dev/null; then
  # Базовые настройки: включить SEO для main types, указать бренд
  wp_exec eval '
    $title_opts = get_option("rank-math-options-titles", []);
    if (!is_array($title_opts)) $title_opts = [];
    $title_opts["knowledgegraph_type"] = "company";
    $title_opts["knowledgegraph_name"] = "'"${SITE_TITLE}"'";
    $title_opts["knowledgegraph_description"] = "'"${SITE_DESCRIPTION}"'";
    $title_opts["pt_post_default_rich_snippet"] = "article";
    $title_opts["pt_page_default_rich_snippet"] = "off";
    update_option("rank-math-options-titles", $title_opts);

    $general_opts = get_option("rank-math-options-general", []);
    if (!is_array($general_opts)) $general_opts = [];
    $general_opts["strip_category_base"] = "on";
    update_option("rank-math-options-general", $general_opts);

    echo "Rank Math options updated\n";
  ' 2>&1 | tail -1
else
  log "      Rank Math неактивен — пропуск"
fi

# ============ 8. Финальная проверка + rewrite flush ============
log "8/8  Rewrite flush + итог"
wp_exec rewrite flush --hard >/dev/null

PAGES_COUNT=$(wp_exec post list --post_type=page --post_status=publish --format=count 2>/dev/null | tr -d '\r')
CATS_COUNT=$(wp_exec term list category --hide_empty=0 --format=count 2>/dev/null | tr -d '\r')
MENUS_COUNT=$(wp_exec menu list --format=count 2>/dev/null | tr -d '\r')

echo ""
echo "════════════════════════════════════════════════════"
echo " ✅ Полировка $DOMAIN завершена"
echo "════════════════════════════════════════════════════"
echo "   Страниц publish : $PAGES_COUNT"
echo "   Категорий       : $CATS_COUNT"
echo "   Меню            : $MENUS_COUNT"
echo ""
echo " E-E-A-T страницы:"
echo "   https://${DOMAIN}/about/"
echo "   https://${DOMAIN}/how-we-test/"
echo "   https://${DOMAIN}/contacts/"
echo "   https://${DOMAIN}/privacy/"
echo "   https://${DOMAIN}/terms/"
echo "════════════════════════════════════════════════════"
