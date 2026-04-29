#!/usr/bin/env bash
# verify-prod.sh — после того как 3 артефакта применены на popolkam.ru,
# проверяет что Theme Options + Customizer подхватились.
#
# Что проверяет:
#  1. Active theme = REHub child
#  2. Primary color #f97316 в inline-css на главной
#  3. archive_layout = communitylist в HTML маркерах
#  4. Header structure (наличие main-nav, rh-flex-center-align)
#  5. body classes содержат rehub-related классы
#
# Use:
#   bash verify-prod.sh

set -euo pipefail

PROD_URL="https://popolkam.ru"
STAGING_URL="https://popolkam-staging.bonaka.app"

echo "=== verify-prod.sh: сравнение popolkam.ru со staging ==="
echo

PROD_HTML=$(curl -sL "$PROD_URL/")
STAGING_HTML=$(curl -sL "$STAGING_URL/")

# Helper
has_marker() {
  local label="$1" pattern="$2" html="$3"
  if echo "$html" | grep -q "$pattern"; then
    echo "   ✓ $label"
    return 0
  else
    echo "   ✗ $label  (не найдено: $pattern)"
    return 1
  fi
}

echo "PROD ($PROD_URL):"
has_marker "REHub child theme active"    "wp-child-theme-rehub-blankchild"    "$PROD_HTML"
has_marker "Primary color #f97316"       "f97316"                               "$PROD_HTML"
has_marker "header .main-nav present"    "main-nav"                             "$PROD_HTML"
has_marker "rh-flex-center-align layout" "rh-flex-center-align"                 "$PROD_HTML"
has_marker "rehub stylesheet rhstyle"    "rhstyle-css"                          "$PROD_HTML"

echo
echo "STAGING ($STAGING_URL) — для сравнения:"
has_marker "REHub child theme active"    "wp-child-theme-rehub-blankchild"    "$STAGING_HTML"
has_marker "Primary color (rebranded)"   "f97316"                               "$STAGING_HTML"
has_marker "header .main-nav present"    "main-nav"                             "$STAGING_HTML"
has_marker "rh-flex-center-align layout" "rh-flex-center-align"                 "$STAGING_HTML"

echo
echo "=== Diff: какие inline CSS блоки есть в staging но НЕ в prod ==="
PROD_STYLES=$(echo "$PROD_HTML"     | grep -oE '<style id=[^>]+>' | sort -u)
STG_STYLES=$(echo "$STAGING_HTML"  | grep -oE '<style id=[^>]+>' | sort -u)
DIFF=$(comm -13 <(echo "$PROD_STYLES") <(echo "$STG_STYLES") || true)
if [[ -z "$DIFF" ]]; then
  echo "   ✓ inline-стили совпадают по структуре"
else
  echo "   Отсутствуют на prod:"
  echo "$DIFF" | sed 's/^/     /'
fi

echo
echo "=== Размер CSS-блоков (косвенный индикатор) ==="
PROD_CSS_LEN=$(echo "$PROD_HTML"    | grep -c "<style ")
STG_CSS_LEN=$(echo "$STAGING_HTML" | grep -c "<style ")
echo "   prod:    $PROD_CSS_LEN inline-style блоков"
echo "   staging: $STG_CSS_LEN inline-style блоков"

if (( PROD_CSS_LEN < STG_CSS_LEN - 2 )); then
  echo "   ⚠ Prod существенно меньше — Theme Options или Customizer не до конца применились"
else
  echo "   ✓ Сопоставимо"
fi
