#!/usr/bin/env bash
# VPS bootstrap (Ubuntu 22.04+).
# Запускать от root: bash deploy/setup.sh
#
# Что делает:
#   - apt update & upgrade
#   - Node 20.x (NodeSource)
#   - nginx
#   - certbot + nginx плагин
#   - MariaDB (для разворачиваемых WP-сайтов)
#   - PHP-CLI + WP-CLI (для деплоя WordPress)
#   - PM2 + автостарт через systemd
#   - Каталоги /var/www/seo-command-center, /var/log/pm2, /var/www/<site>
#   - UFW: 22, 80, 443

set -euo pipefail

DOMAIN="${1:-cmd.popolkam.ru}"
APP_DIR="/var/www/seo-command-center"

echo "==> Update OS"
apt update -y && apt upgrade -y

echo "==> Base packages"
apt install -y curl wget git unzip software-properties-common ufw

echo "==> Node.js 20.x"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20.* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
node -v && npm -v

echo "==> Build tools (для better-sqlite3 native)"
apt install -y build-essential python3 make g++

echo "==> nginx + certbot"
apt install -y nginx certbot python3-certbot-nginx

echo "==> MariaDB (для WordPress сайтов)"
apt install -y mariadb-server
systemctl enable --now mariadb
# echo "  Запустите 'mysql_secure_installation' вручную после bootstrap"

echo "==> PHP CLI + WP-CLI"
apt install -y php-cli php-mysql php-curl php-xml php-mbstring php-zip php-gd php-intl
if ! command -v wp >/dev/null 2>&1; then
  curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
  chmod +x wp-cli.phar
  mv wp-cli.phar /usr/local/bin/wp
fi
wp --info --allow-root || true

echo "==> PM2"
npm install -g pm2

echo "==> Каталоги"
mkdir -p "$APP_DIR" "$APP_DIR/data" /var/log/pm2 /var/www
chown -R "$SUDO_USER:$SUDO_USER" "$APP_DIR" 2>/dev/null || true

echo "==> UFW"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

echo
echo "==> Дальнейшие шаги:"
echo "1. Склонировать репо в $APP_DIR:"
echo "     git clone <repo-url> $APP_DIR"
echo "2. cd $APP_DIR && cp .env.example .env && nano .env  # вписать ключи"
echo "3. npm install && npm run build"
echo "4. cp deploy/nginx.conf /etc/nginx/sites-available/scc"
echo "   ln -s /etc/nginx/sites-available/scc /etc/nginx/sites-enabled/"
echo "   nginx -t && systemctl reload nginx"
echo "5. certbot --nginx -d $DOMAIN"
echo "6. pm2 start deploy/pm2.ecosystem.cjs --env production"
echo "   pm2 save && pm2 startup systemd  # выполнить выведенную команду"
echo "7. Настроить cron для бэкапов: crontab -e и добавить:"
echo "     0 4 * * * /var/www/seo-command-center/deploy/backup.sh >> /var/log/scc-backup.log 2>&1"
