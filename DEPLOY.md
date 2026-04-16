# Deploy: cmd.bonaka.app на Timeweb VPS (5.129.245.98)

Инструкция для развёртывания SEO Command Center **рядом** с уже работающим
Next.js-приложением на bonaka.app, без поломки текущего сайта.

**Результат:**
- `https://cmd.bonaka.app` — дашборд (Vite SPA)
- `https://cmd.bonaka.app/api/*` — Express API
- `https://bonaka.app` — существующий Next.js, нетронут
- SQLite-база в `/var/www/seo-command-center/data/seo.sqlite`
- Процесс под PM2, автостарт после ребута
- SSL от Let's Encrypt, автопродление через certbot

---

## Шаг 0. DNS A-запись

В панели Timeweb (или где у вас зарегистрирован `bonaka.app`):

```
Type: A
Name: cmd           (→ создаст cmd.bonaka.app)
Value: 5.129.245.98
TTL: 3600
```

Проверка:

```bash
dig +short cmd.bonaka.app
# должно вернуть: 5.129.245.98
```

DNS пропагация занимает от минут до часа. **Переходите к шагу 1 сразу** — серверная часть готовится параллельно.

---

## Шаг 1. SSH на сервер

```bash
ssh root@5.129.245.98
# или с вашим пользователем:
# ssh user@5.129.245.98
```

Если при настройке bonaka.app был создан отдельный пользователь (например, `deploy`), лучше использовать его вместо root.

---

## Шаг 2. Проверить что уже установлено

```bash
node --version     # нужно v20+ (для better-sqlite3)
nginx -v
pm2 --version
git --version
```

**Если Next.js уже работает, скорее всего всё это есть.** Если Node < 20:

```bash
# Установить Node 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs build-essential python3
```

`build-essential` + `python3` нужны для компиляции `better-sqlite3` под native.

---

## Шаг 3. Склонировать репозиторий

```bash
cd /var/www
sudo git clone https://github.com/denisilyin75-ops/seo-dashbord.git seo-command-center
sudo chown -R $USER:$USER /var/www/seo-command-center
cd seo-command-center
```

Если у вас приватный репо — используйте SSH clone или Personal Access Token в URL.

---

## Шаг 4. Настроить `.env`

```bash
cp .env.example .env
nano .env
```

Минимально заполнить:

```bash
PORT=3001
NODE_ENV=production

# OpenRouter (ваш ключ)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-ваш-ключ-сюда
OPENROUTER_REFERER=https://cmd.bonaka.app

# Авторизация API (сгенерируйте длинную строку)
AUTH_TOKEN=ваш-секретный-токен-сюда

# SQLite (оставить как есть)
DB_PATH=./data/seo.sqlite
```

Сгенерировать случайный `AUTH_TOKEN`:

```bash
openssl rand -hex 32
```

**GA4/GSC пока можно не заполнять** — дашборд будет работать без них, просто кнопка "Pull GA4/GSC" вернёт ошибку "not configured".

---

## Шаг 5. Установить зависимости + собрать фронтенд

```bash
npm install
npm run build
```

`npm install` может занять 2-3 минуты (компилируется native-модуль better-sqlite3).
`npm run build` создаст папку `dist/` — её nginx будет отдавать.

Проверка: должна быть папка `/var/www/seo-command-center/dist/` с `index.html` и `assets/`.

---

## Шаг 6. Засеять БД демо-данными (опционально)

```bash
npm run seed
# ✅ Seeded demo data
```

Это создаст два демо-сайта (popolkam.ru, koffie-expert.nl) со статьями и планом. Можете удалить из UI позже.

Если не хотите демо — пропустите, БД создастся пустая при первом запуске сервера.

---

## Шаг 7. Запустить Express через PM2

```bash
pm2 start deploy/pm2.ecosystem.cjs --env production
pm2 save
pm2 startup systemd
# → скопируйте и выполните команду, которую pm2 выведет
#   (что-то вроде "sudo env PATH=$PATH pm2 startup systemd -u ...")
```

Проверка:

```bash
pm2 list
# должно показать scc-api online

curl http://127.0.0.1:3001/api/health
# {"ok":true,"sites":2,...,"integrations":{"ai":{"configured":true,"provider":"openrouter",...}}}
```

Если ошибка "port in use" — найдите что на 3001 (`sudo lsof -i :3001`) или поменяйте порт в `.env` + `deploy/pm2.ecosystem.cjs` + `deploy/nginx.conf`.

---

## Шаг 8. Nginx-конфиг для cmd.bonaka.app

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cmd.bonaka.app
sudo ln -s /etc/nginx/sites-available/cmd.bonaka.app /etc/nginx/sites-enabled/
sudo nginx -t
# → должно быть: syntax is ok / test is successful
```

На этом этапе `nginx -t` **может ругнуться** на отсутствие SSL-сертификата
(который ещё не выпущен). Временный обход — закомментировать `ssl_*` директивы
и блок `listen 443` перед запуском certbot:

```bash
sudo nano /etc/nginx/sites-available/cmd.bonaka.app
# Закомментировать всё внутри второго server { listen 443 ... },
# оставить только первый server { listen 80 ... } без редиректа:
#   location / { return 301 https://...; }  →  убрать
```

Перезапустить nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Шаг 9. SSL через certbot

```bash
sudo certbot --nginx -d cmd.bonaka.app
# - согласиться с условиями
# - указать email для уведомлений о продлении
# - при вопросе "redirect HTTP to HTTPS" — выбрать 2 (Redirect)
```

Certbot сам допишет SSL-директивы в ваш nginx-конфиг и перезагрузит nginx.
Проверка автопродления:

```bash
sudo certbot renew --dry-run
```

---

## Шаг 10. Проверить всё работает

```bash
# Health-check через HTTPS
curl https://cmd.bonaka.app/api/health
# → {"ok":true,...}

# Открыть в браузере:
# https://cmd.bonaka.app
# → должен загрузиться дашборд с демо-сайтами
```

Если API требует `AUTH_TOKEN`:

```bash
curl https://cmd.bonaka.app/api/health \
  -H "Authorization: Bearer ваш-секретный-токен"
```

В UI: откройте `https://cmd.bonaka.app/settings` → раздел **"Авторизация"** → вставьте токен → Сохранить.

---

## Шаг 11. Бэкапы SQLite (через cron)

```bash
crontab -e
```

Добавить строку:

```
0 4 * * * /var/www/seo-command-center/deploy/backup.sh >> /var/log/scc-backup.log 2>&1
```

Это будет делать ежедневный hot-backup в 04:00 с ротацией 30 дней
(файлы в `/var/www/seo-command-center/data/backups/`).

---

## Обновление кода после пуша в GitHub

```bash
cd /var/www/seo-command-center
git pull
npm install       # если изменились зависимости
npm run build     # пересобрать фронт
pm2 restart scc-api
```

Можно сделать одной командой:

```bash
git pull && npm install && npm run build && pm2 restart scc-api
```

Позже подключим **GitHub Actions** для автодеплоя — расскажу как, когда понадобится.

---

## Типичные проблемы

### "EACCES: permission denied" при `npm install`
Запускаем из-под не-root пользователя, но `/var/www/seo-command-center` принадлежит root:

```bash
sudo chown -R $USER:$USER /var/www/seo-command-center
```

### `better-sqlite3` не компилируется
Нужны build tools:

```bash
sudo apt install -y build-essential python3 make g++
rm -rf node_modules && npm install
```

### nginx 502 Bad Gateway
Express не запущен или на другом порту:

```bash
pm2 list              # проверить scc-api статус
pm2 logs scc-api      # посмотреть ошибки
curl http://127.0.0.1:3001/api/health
```

### AI команды возвращают "заглушку"
`.env` не подхватился PM2. Нужно рестартовать с `--update-env`:

```bash
pm2 restart scc-api --update-env
```

### Next.js (bonaka.app) сломался
Мы **не трогали** его nginx-конфиг и процесс. Если что-то сломалось — дело
не в нашем деплое. Откатиться:

```bash
sudo rm /etc/nginx/sites-enabled/cmd.bonaka.app
sudo systemctl reload nginx
pm2 stop scc-api
```

---

## Минимальный чек-лист (для копипасты)

```bash
# 1. DNS: A-запись cmd → 5.129.245.98 (в панели Timeweb)

# 2. SSH и клон
ssh root@5.129.245.98
cd /var/www
sudo git clone https://github.com/denisilyin75-ops/seo-dashbord.git seo-command-center
sudo chown -R $USER:$USER seo-command-center
cd seo-command-center

# 3. .env
cp .env.example .env
nano .env   # вписать OPENROUTER_API_KEY и AUTH_TOKEN

# 4. Сборка
npm install && npm run build && npm run seed

# 5. PM2
pm2 start deploy/pm2.ecosystem.cjs --env production
pm2 save && pm2 startup systemd

# 6. nginx + SSL
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cmd.bonaka.app
sudo ln -s /etc/nginx/sites-available/cmd.bonaka.app /etc/nginx/sites-enabled/
# (закомментировать ssl-строки временно если nginx -t фейлит)
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d cmd.bonaka.app

# 7. Проверить
curl https://cmd.bonaka.app/api/health
```

Готово. Откройте `https://cmd.bonaka.app` в браузере.
