# WARP.AI Deployment: cmd.bonaka.app

> Инструкция для AI-агента (warp.ai) на сервере `5.129.245.98` (Timeweb).
> **Критично: не сломать существующий `bonaka.app` (Next.js).**

---

## ROLE (read this first)

Ты — DevOps агент. Твоя задача: развернуть дополнительное приложение
"SEO Command Center" на поддомене `cmd.bonaka.app`, **не трогая** уже
работающий `bonaka.app` (Next.js).

- Репо: `https://github.com/denisilyin75-ops/seo-dashbord.git`
- Ветка: `claude/init-seo-dashboard-soKdZ`
- Целевая директория: `/var/www/seo-command-center`
- Express API порт: `3001` (если занят — см. фаза 0.3)

---

## 🚨 NEVER DO

- ❌ Не редактируй `/etc/nginx/sites-available/bonaka*` или `sites-enabled/bonaka*`
- ❌ Не останавливай/рестартуй чужие процессы в `pm2 list`
  (только `scc-api` — наш)
- ❌ Не запускай `rm -rf` на путях выше `/var/www/seo-command-center`
- ❌ Не меняй `/etc/ssh/*`, root-пароль, firewall правила
- ❌ Не запускай `certbot` без флага `-d cmd.bonaka.app` (чтобы он не
  тронул сертификат bonaka.app)
- ❌ Не делай `nginx -s reload` пока `nginx -t` не прошёл

## ✅ STOP AND ASK пользователя если:

- Порт 3001 занят процессом, который не наш
- В `pm2 list` уже есть `scc-api` в unknown состоянии
- `/var/www/seo-command-center` уже существует и не пустой
- `nginx -t` фейлит после наших изменений
- `certbot` просит подтверждение которое неочевидно

---

## PHASE 0 — Pre-flight (read-only, безопасно)

Цель: собрать данные о текущем состоянии сервера перед любыми изменениями.

```bash
# 0.1 Базовые версии
echo "=== Versions ==="
node --version || echo "NO NODE"
nginx -v 2>&1
pm2 --version || echo "NO PM2"
git --version
certbot --version 2>&1 | head -1

# 0.2 Кто я, где я
echo "=== User / pwd ==="
whoami
pwd
groups

# 0.3 Что слушает порт 3001
echo "=== Port 3001 ==="
sudo ss -tlnp 2>/dev/null | grep ':3001' || echo "port 3001 FREE"

# 0.4 Процессы PM2
echo "=== PM2 ==="
pm2 list 2>/dev/null || echo "PM2 not running"

# 0.5 Nginx сайты
echo "=== Nginx enabled sites ==="
ls -la /etc/nginx/sites-enabled/ 2>/dev/null

# 0.6 Есть ли уже наш каталог
echo "=== Target dir ==="
ls -la /var/www/seo-command-center 2>/dev/null || echo "dir not exists (OK)"

# 0.7 Диск и память
echo "=== Resources ==="
df -h / | tail -1
free -m | head -2

# 0.8 DNS проверка
echo "=== DNS ==="
dig +short cmd.bonaka.app || host cmd.bonaka.app || echo "dig/host not installed"
```

**STOP HERE.** Покажи вывод пользователю и подожди подтверждения:
- [ ] Node ≥ v20 установлен (или user согласен обновить)
- [ ] nginx установлен
- [ ] pm2 установлен (если нет — `sudo npm install -g pm2`)
- [ ] порт 3001 свободен (или выбран другой)
- [ ] DNS `cmd.bonaka.app → 5.129.245.98` резолвится
- [ ] целевой каталог не существует (или пустой)

---

## PHASE 1 — Установить недостающее (только при необходимости)

Пропусти этот этап если всё уже есть.

### 1.1 Node 20 (если версия ниже)

```bash
node --version
# если < v20:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
node --version  # VERIFY: v20.x.x
```

### 1.2 Build tools (для нативного better-sqlite3)

```bash
dpkg -l | grep -q build-essential || sudo apt install -y build-essential python3 make g++
```

### 1.3 PM2 (если отсутствует)

```bash
pm2 --version || sudo npm install -g pm2
```

**CHECKPOINT:** все команды выше выполнились без ошибок.

---

## PHASE 2 — Склонировать репо и поставить зависимости

### 2.1 Подготовка директории

```bash
# Создать директорию и дать права текущему пользователю
sudo mkdir -p /var/www/seo-command-center
sudo chown -R $USER:$USER /var/www/seo-command-center
cd /var/www/seo-command-center
pwd  # VERIFY: /var/www/seo-command-center
```

### 2.2 Клон репозитория

```bash
# Клонировать целевую ветку
git clone --branch claude/init-seo-dashboard-soKdZ \
  https://github.com/denisilyin75-ops/seo-dashbord.git .

# VERIFY: в текущем каталоге появились package.json, server/, src/
ls -la package.json server src | head -5
```

Если репо приватный и нужен токен — спроси пользователя; **не** используй
`git clone` с `sudo`.

### 2.3 Зависимости

```bash
npm install
# ожидать 2-3 минуты, будет компиляция better-sqlite3
# VERIFY: в конце должно быть "added N packages", БЕЗ "npm ERR"
```

Если ошибка компиляции `better-sqlite3`:

```bash
# установить build tools и повторить
sudo apt install -y build-essential python3 make g++
rm -rf node_modules
npm install
```

**CHECKPOINT:** `ls node_modules/.bin/vite` должен существовать.

### 2.4 Конфиг .env

**Агент: спроси у пользователя OpenRouter API-ключ** (формат `sk-or-v1-...`),
НЕ подставляй ничего сам.

```bash
cp .env.example .env

# Сгенерировать AUTH_TOKEN
AUTH_TOKEN=$(openssl rand -hex 32)
echo "Generated AUTH_TOKEN: $AUTH_TOKEN (сохрани, понадобится в Settings UI)"

# Записать значения атомарно
cat > .env <<EOF
PORT=3001
NODE_ENV=production
AUTH_TOKEN=$AUTH_TOKEN

AI_PROVIDER=openrouter
OPENROUTER_API_KEY=SK_OR_V1_ЗАМЕНИ_НА_РЕАЛЬНЫЙ_КЛЮЧ
OPENROUTER_REFERER=https://cmd.bonaka.app

DB_PATH=./data/seo.sqlite
EOF

# Агент: попроси пользователя вписать свой ключ:
nano .env   # или пусть пользователь пришлёт ключ — замени через sed

# VERIFY без утечки ключа:
grep -c OPENROUTER_API_KEY .env  # должно быть 1
test -s .env && echo "OK .env not empty"
chmod 600 .env
```

### 2.5 Сборка фронта

```bash
npm run build
# VERIFY: создалась папка dist/ с index.html
ls dist/index.html dist/assets/ | head -3
```

### 2.6 Seed демо-данных (опционально)

Спроси пользователя, нужны ли демо-сайты (popolkam.ru, koffie-expert.nl):

```bash
# ТОЛЬКО если пользователь согласился:
npm run seed
# → "✅ Seeded demo data"
```

**CHECKPOINT:** `.env` валидный, `dist/` собран.

---

## PHASE 3 — PM2 (запуск Express)

### 3.1 Убедиться что scc-api ещё не запущен

```bash
pm2 list | grep scc-api && echo "ALREADY RUNNING — stop first" || echo "OK, not running"

# Если запущен — удалить старую копию:
# pm2 delete scc-api
```

### 3.2 Запустить

```bash
cd /var/www/seo-command-center
pm2 start deploy/pm2.ecosystem.cjs --env production
sleep 2

# VERIFY: статус online
pm2 list | grep scc-api
# VERIFY: health через loopback
curl -s http://127.0.0.1:3001/api/health | head -c 500
```

Ожидается JSON `{"ok":true,"sites":...,"integrations":{...}}`.

### 3.3 Автостарт после ребута

```bash
pm2 save
# Команду pm2 startup нужно запустить + выполнить ту, что она напечатает:
pm2 startup systemd -u $USER --hp $HOME
# → скопируй и выполни команду, которую pm2 выведет (начинается с sudo env PATH=...)
```

**CHECKPOINT:** `curl http://127.0.0.1:3001/api/health` возвращает JSON.

---

## PHASE 4 — Nginx (самый рискованный этап)

### 4.1 ЗАЩИТА: бэкап текущих конфигов

```bash
sudo mkdir -p /root/nginx-backup-$(date +%F)
sudo cp -a /etc/nginx/sites-available /etc/nginx/sites-enabled /etc/nginx/nginx.conf \
  /root/nginx-backup-$(date +%F)/
echo "Backup saved in /root/nginx-backup-$(date +%F)/"
```

### 4.2 Добавить новый конфиг как ОТДЕЛЬНЫЙ файл

```bash
# Копируем — НЕ перезаписывает существующие файлы
sudo cp /var/www/seo-command-center/deploy/nginx.conf \
  /etc/nginx/sites-available/cmd.bonaka.app

# VERIFY: файл для bonaka.app не тронут
ls -la /etc/nginx/sites-available/ | grep bonaka
```

### 4.3 ВРЕМЕННО закомментировать SSL-блок (сертификата ещё нет)

`deploy/nginx.conf` ссылается на `/etc/letsencrypt/live/cmd.bonaka.app/`,
которого ещё нет. Нужно на время закомментировать весь HTTPS-server-блок
чтобы `nginx -t` прошёл. Certbot потом сам восстановит.

```bash
sudo cp /etc/nginx/sites-available/cmd.bonaka.app \
        /etc/nginx/sites-available/cmd.bonaka.app.orig

# Оставить только HTTP-блок (порт 80), убрав редирект:
sudo tee /etc/nginx/sites-available/cmd.bonaka.app > /dev/null <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name cmd.bonaka.app;

    location /.well-known/acme-challenge/ { root /var/www/html; }

    root /var/www/seo-command-center/dist;
    index index.html;

    location / { try_files $uri $uri/ /index.html; }

    location /api/ {
        proxy_pass         http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
NGINX
```

### 4.4 Активировать и проверить

```bash
# Симлинк в sites-enabled
sudo ln -sf /etc/nginx/sites-available/cmd.bonaka.app \
             /etc/nginx/sites-enabled/cmd.bonaka.app

# КРИТИЧНО: тест конфигов
sudo nginx -t
```

**STOP IF** `nginx -t` фейлит:

```bash
# Откатиться — удалить симлинк, не трогая живой bonaka.app
sudo rm /etc/nginx/sites-enabled/cmd.bonaka.app
sudo nginx -t  # должен быть OK (вернулись к исходному состоянию)
```

И отрепортуй ошибку пользователю.

### 4.5 Reload (только если тест прошёл)

```bash
sudo systemctl reload nginx

# VERIFY: bonaka.app не пострадал
curl -sI https://bonaka.app | head -3
# → должно быть 200 OK или редирект 30x

# VERIFY: cmd.bonaka.app отдаёт фронт (через HTTP пока)
curl -sI http://cmd.bonaka.app | head -3
# → должно быть 200 OK
```

**CHECKPOINT:** bonaka.app работает, cmd.bonaka.app отвечает по HTTP.

---

## PHASE 5 — SSL через certbot

### 5.1 Запустить только для нашего поддомена

```bash
# КРИТИЧНО: флаг -d указывает ТОЛЬКО cmd.bonaka.app, сертификат bonaka.app не трогаем
sudo certbot --nginx -d cmd.bonaka.app --non-interactive \
  --agree-tos --email admin@bonaka.app --redirect
```

Опции:
- `--non-interactive` — без ручного подтверждения
- `--redirect` — добавит редирект HTTP→HTTPS
- `-d cmd.bonaka.app` — ТОЛЬКО наш субдомен

### 5.2 Заменить nginx-конфиг на полный (теперь SSL есть)

Certbot дописал SSL-директивы в наш временный конфиг, но лучше заменить
на "правильный" из репо:

```bash
# Сохранить что сделал certbot (на всякий):
sudo cp /etc/nginx/sites-available/cmd.bonaka.app \
        /etc/nginx/sites-available/cmd.bonaka.app.certbot

# Поставить конфиг из репо (в нём уже правильные SSL-пути)
sudo cp /var/www/seo-command-center/deploy/nginx.conf \
        /etc/nginx/sites-available/cmd.bonaka.app

sudo nginx -t && sudo systemctl reload nginx
```

Если `nginx -t` фейлит — откатиться:

```bash
sudo cp /etc/nginx/sites-available/cmd.bonaka.app.certbot \
        /etc/nginx/sites-available/cmd.bonaka.app
sudo nginx -t && sudo systemctl reload nginx
```

### 5.3 Автопродление

```bash
sudo certbot renew --dry-run
# VERIFY: "Congratulations, all simulated renewals succeeded"
```

Systemd-таймер certbot.timer обычно уже активен — проверить:

```bash
systemctl status certbot.timer | head -5
```

---

## PHASE 6 — Финальные smoke-тесты

```bash
# 1. Health через HTTPS
curl -sS https://cmd.bonaka.app/api/health | head -c 600
# → JSON с "ok":true, "integrations":{"ai":{"configured":true,...}}

# 2. Dashboard отдаёт HTML
curl -sI https://cmd.bonaka.app/ | head -3
# → 200 OK, content-type: text/html

# 3. Auth работает (если AUTH_TOKEN задан)
curl -sS https://cmd.bonaka.app/api/sites
# → {"error":"Unauthorized"}  (это норма без токена)

curl -sS https://cmd.bonaka.app/api/sites \
  -H "Authorization: Bearer <AUTH_TOKEN из .env>"
# → массив сайтов

# 4. bonaka.app жив
curl -sI https://bonaka.app | head -3
# → 200 OK или 30x

# 5. PM2 пережил reload nginx
pm2 list | grep scc-api
# → online
```

**ВСЕ ТЕСТЫ ЗЕЛЁНЫЕ?** Доложи пользователю:

```
✅ Dev готов:
- https://cmd.bonaka.app — UI
- https://cmd.bonaka.app/api/health — API
- AUTH_TOKEN: <вставить из .env>
- Bonaka.app работает: ✓
- PM2 scc-api: online
- SSL: valid until <certbot expiry>
```

---

## PHASE 7 — Бэкапы SQLite (опционально, рекомендуется)

```bash
# Добавить в crontab (4:00 UTC ежедневно, хранение 30 дней)
( crontab -l 2>/dev/null | grep -v "seo-command-center.*backup"; \
  echo "0 4 * * * /var/www/seo-command-center/deploy/backup.sh >> /var/log/scc-backup.log 2>&1" \
) | crontab -
crontab -l | grep backup
```

---

## ROLLBACK (если что-то пошло не так)

Полный откат в одну пачку команд — не трогает bonaka.app:

```bash
# 1. Остановить Express
pm2 delete scc-api 2>/dev/null

# 2. Удалить наш nginx-конфиг
sudo rm -f /etc/nginx/sites-enabled/cmd.bonaka.app
sudo rm -f /etc/nginx/sites-available/cmd.bonaka.app*
sudo nginx -t && sudo systemctl reload nginx

# 3. (опционально) удалить сертификат
sudo certbot delete --cert-name cmd.bonaka.app

# 4. Удалить код
sudo rm -rf /var/www/seo-command-center

# 5. Восстановить nginx из бэкапа если надо
# sudo cp -a /root/nginx-backup-*/sites-* /etc/nginx/

echo "Rollback complete. bonaka.app не тронут."
```

---

## ОБНОВЛЕНИЕ после push в git

```bash
cd /var/www/seo-command-center
git pull
npm install && npm run build
pm2 restart scc-api --update-env
```

---

## АГЕНТ-ЧЕК-ЛИСТ

Перед отчётом "готово" убедись что:

- [ ] Phase 0 pre-flight показал нормальное состояние
- [ ] `/var/www/seo-command-center/dist/index.html` существует
- [ ] `pm2 list` показывает `scc-api` → `online`
- [ ] `curl http://127.0.0.1:3001/api/health` возвращает JSON с `"ok":true`
- [ ] `curl -I https://bonaka.app` возвращает 200 или 30x (не сломано)
- [ ] `curl -I https://cmd.bonaka.app` возвращает 200
- [ ] `curl https://cmd.bonaka.app/api/health` возвращает JSON
- [ ] `integrations.ai.configured` = `true` (ключ OpenRouter работает)
- [ ] `sudo certbot certificates` показывает оба сертификата
      (bonaka.app + cmd.bonaka.app)
- [ ] Crontab бэкапа добавлен
- [ ] `AUTH_TOKEN` сохранён и сообщён пользователю

Если хоть один пункт красный — **не репортуй "готово"**, покажи
пользователю что не прошло и подожди решения.
