# WARP.AI Deployment: cmd.bonaka.app (Dokploy + Traefik)

> Инструкция для AI-агента (warp.ai) на сервере `5.129.245.98`.
> На сервере: Dokploy + Traefik v3 + Docker сеть `web`.
> Уже работают: bonaka.app, mob/disp/api.bonaka.app.
> **Критично: не сломать существующие сервисы.**

---

## ROLE

Ты — DevOps агент. Задача: развернуть SEO Command Center как новый сервис
в существующей Dokploy-инфраструктуре, **не трогая** уже запущенные
контейнеры (bonaka.app и др.).

- Репо: `https://github.com/denisilyin75-ops/seo-dashbord.git`
- Ветка: `claude/init-seo-dashboard-soKdZ`
- Имя сервиса: `scc`
- Домен: `cmd.bonaka.app`
- Внутренний порт контейнера: `3001`
- Сеть Docker: `web` (внешняя, уже создана Dokploy)

---

## 🚨 NEVER DO

- ❌ Не редактируй чужие docker-compose.yml в `/etc/dokploy/` или где они лежат
- ❌ Не делай `docker stop`, `docker rm` чужих контейнеров
- ❌ Не удаляй сеть `web` (`docker network rm web`)
- ❌ Не трогай контейнер Traefik (`docker restart` его — не делать)
- ❌ Не удаляй volume других сервисов
- ❌ Не запускай `docker system prune` без флага `--filter` (снесёт чужие образы)

## ✅ STOP AND ASK если:

- Сервис с именем `scc` уже существует (`docker ps -a | grep scc`)
- Volume `scc-data` уже существует и не пустой
- DNS `cmd.bonaka.app` не резолвится в `5.129.245.98`
- В `docker network inspect web` нет (или сеть называется по-другому)
- Не понятно имя certResolver в Traefik (проверить через docker inspect <traefik>)

---

## PHASE 0 — Pre-flight (read-only)

```bash
echo "=== Versions ==="
docker --version
docker compose version
git --version

echo "=== Текущие сервисы (НЕ ТРОГАТЬ) ==="
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'

echo "=== Сеть web ==="
docker network inspect web --format '{{.Name}}: {{len .Containers}} contрainers' \
  || echo "❌ сеть web НЕ НАЙДЕНА"

echo "=== Traefik certResolver ==="
TRAEFIK=$(docker ps --filter "label=org.opencontainers.image.title=Traefik" -q | head -1)
[ -z "$TRAEFIK" ] && TRAEFIK=$(docker ps --filter "ancestor=traefik" -q | head -1)
[ -z "$TRAEFIK" ] && TRAEFIK=$(docker ps --format '{{.Names}}' | grep -i traefik | head -1)
if [ -n "$TRAEFIK" ]; then
  echo "Traefik container: $TRAEFIK"
  docker inspect "$TRAEFIK" --format '{{range .Args}}{{println .}}{{end}}' \
    | grep -i certresolver | head -3
else
  echo "❌ Traefik не найден в docker ps"
fi

echo "=== Уже занят scc? ==="
docker ps -a --filter "name=scc" --format '{{.Names}}: {{.Status}}'

echo "=== DNS ==="
getent hosts cmd.bonaka.app || echo "DNS не резолвится"

echo "=== Существующие домены (для проверки что bonaka.app живой) ==="
for host in bonaka.app mob.bonaka.app disp.bonaka.app api.bonaka.app; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://$host || echo "ERR")
  echo "  $host → HTTP $code"
done

echo "=== Disk / RAM ==="
df -h / | tail -1
free -m | head -2
```

**STOP HERE.** Покажи вывод пользователю. Подтверди:
- [ ] Сеть `web` существует
- [ ] Traefik запущен, имя certResolver известно (по умолчанию `letsencrypt`)
- [ ] Сервиса `scc` ещё нет
- [ ] DNS `cmd.bonaka.app → 5.129.245.98` работает
- [ ] Все 4 существующих домена возвращают 200/30x

---

## PHASE 1 — Получить от пользователя

Задай вопросы:

1. **OpenRouter API ключ** (формат `sk-or-v1-...`) — для AI-команд
2. **Имя certResolver** в Traefik (по умолчанию `letsencrypt`, но
   если в Phase 0 нашлось другое — уточнить)
3. **Метод деплоя:**
   - **A** — через Dokploy UI (рекомендуется, ты подскажешь шаги пользователю)
   - **B** — напрямую `docker compose` (агент делает сам)

Если **A** — переход к [Section A](#section-a--через-dokploy-ui).
Если **B** — переход к [Section B](#section-b--через-docker-compose).

---

## SECTION A — через Dokploy UI

Агент НЕ деплоит сам. Он составляет пользователю чёткий чек-лист с
готовыми значениями для копи-паста в Dokploy UI.

```
Открой Dokploy и сделай:

1. Create → Application
   - Name: seo-command-center
   - Source: GitHub denisilyin75-ops/seo-dashbord
   - Branch: claude/init-seo-dashboard-soKdZ
   - Build Type: Dockerfile

2. Environment (вставить блок):
   ----
   NODE_ENV=production
   PORT=3001
   AUTH_TOKEN=<СГЕНЕРИРОВАННЫЙ_АГЕНТОМ>
   AI_PROVIDER=openrouter
   OPENROUTER_API_KEY=<ИЗ_ВВОДА_ПОЛЬЗОВАТЕЛЯ>
   OPENROUTER_REFERER=https://cmd.bonaka.app
   DB_PATH=/app/data/seo.sqlite
   ----

3. Domains → Add:
   - Host: cmd.bonaka.app
   - Port: 3001
   - HTTPS: ON, certResolver: <ИЗ_PHASE_0>

4. Volumes → Add:
   - Name: scc-data
   - Mount Path: /app/data

5. Deploy
```

Сгенерировать AUTH_TOKEN:
```bash
echo "AUTH_TOKEN=$(openssl rand -hex 32)"
```

После того как пользователь нажал Deploy — мониторь:
```bash
# Подождать 60-120 сек на build, потом:
docker ps --filter "name=seo-command-center" --format '{{.Names}}: {{.Status}}'
docker logs --tail 30 $(docker ps -q --filter "name=seo-command-center")
```

Переходи к [PHASE 4 (smoke tests)](#phase-4--smoke-tests).

---

## SECTION B — через docker compose (агент делает сам)

### B.1 Подготовить рабочую директорию

```bash
sudo mkdir -p /opt/scc
sudo chown -R $USER:$USER /opt/scc
cd /opt/scc

# Клонируем нужную ветку
git clone --branch claude/init-seo-dashboard-soKdZ \
  https://github.com/denisilyin75-ops/seo-dashbord.git .

# VERIFY
ls -la Dockerfile docker-compose.yml package.json | head -5
```

### B.2 Создать .env

Запросить у пользователя `OPENROUTER_API_KEY` если ещё не дали.

```bash
AUTH_TOKEN=$(openssl rand -hex 32)
echo "AUTH_TOKEN=$AUTH_TOKEN — сохрани, понадобится в Settings UI"

cat > .env <<EOF
NODE_ENV=production
PORT=3001
AUTH_TOKEN=$AUTH_TOKEN

AI_PROVIDER=openrouter
OPENROUTER_API_KEY=ВСТАВИТЬ_ОТ_ПОЛЬЗОВАТЕЛЯ
OPENROUTER_REFERER=https://cmd.bonaka.app

DB_PATH=/app/data/seo.sqlite
EOF

chmod 600 .env

# Подставить ключ (если пользователь дал)
# sed -i 's|OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=sk-or-v1-XXXX|' .env

# VERIFY (без утечки ключа)
grep -c OPENROUTER_API_KEY .env  # = 1
```

### B.3 Проверить и поправить certResolver если нужно

Если в Phase 0 нашлось имя resolver'а отличное от `letsencrypt`:

```bash
# Заменить в docker-compose.yml
sed -i 's|certresolver=letsencrypt|certresolver=ИМЯ_ИЗ_PHASE_0|' docker-compose.yml
grep certresolver docker-compose.yml
```

### B.4 Сборка + запуск

```bash
docker compose build
# build занимает 3-5 минут (вкл. better-sqlite3 native)

docker compose up -d
sleep 5

# VERIFY
docker compose ps
docker compose logs --tail 30 scc
```

Должно быть `Up (healthy)` через 30-60 сек (healthcheck даёт start-period 15s + retries).

### B.5 Подключить к сети web (если не подключился)

```bash
docker network inspect web --format '{{range .Containers}}{{.Name}} {{end}}' | grep scc \
  && echo "OK: scc в сети web" \
  || docker network connect web scc
```

(В docker-compose.yml уже указана `networks: [web]`, так что подключится автоматом.)

---

## PHASE 4 — Smoke tests

```bash
# 1. Контейнер живой
docker ps --filter "name=scc" --format '{{.Names}}: {{.Status}}'
# → "scc: Up X minutes (healthy)"

# 2. Health через loopback в контейнере
docker exec scc node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>r.text()).then(console.log)"
# → JSON с "ok":true

# 3. SSL и роутинг через Traefik (даёт 30-60 сек на выпуск SSL)
sleep 30
curl -sS https://cmd.bonaka.app/api/health | head -c 600
# → JSON {"ok":true,...,"integrations":{"ai":{"configured":true,"provider":"openrouter",...}}}

# 4. UI отдаётся
curl -sI https://cmd.bonaka.app/ | head -3
# → 200 OK, content-type: text/html

# 5. Auth работает
curl -sS https://cmd.bonaka.app/api/sites
# → {"error":"Unauthorized"}

curl -sS https://cmd.bonaka.app/api/sites \
  -H "Authorization: Bearer <AUTH_TOKEN из .env>"
# → массив сайтов

# 6. КРИТИЧНО: bonaka.app и др. живы
for host in bonaka.app mob.bonaka.app disp.bonaka.app api.bonaka.app; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 https://$host)
  echo "$host → $code"
done
# Все должны быть 200/30x как в Phase 0
```

---

## ROLLBACK

Если что-то пошло не так — наш сервис убирается одной командой,
не трогая чужие:

```bash
# Через Dokploy UI: Stop / Delete Application
# Или CLI:
cd /opt/scc
docker compose down            # остановить
# docker compose down -v       # + удалить volume (потеря SQLite!)

# Полная очистка
sudo rm -rf /opt/scc
docker volume ls | grep scc-data
# docker volume rm scc_scc-data   # если нужно

# Проверить что чужие живы
docker ps --format '{{.Names}}: {{.Status}}'
```

Traefik автоматически снимет роутинг как только контейнер исчезнет.

---

## ОБНОВЛЕНИЕ после push в git

### В Dokploy UI:
**Deploy** заново.

### Через CLI:
```bash
cd /opt/scc
git pull
docker compose up -d --build
docker compose logs -f --tail 50 scc
```

---

## АГЕНТ-ЧЕК-ЛИСТ

Перед "готово":

- [ ] Phase 0 показал нормальное состояние (web сеть, Traefik, нет конфликтов)
- [ ] Контейнер `scc` в `docker ps` → `Up ... (healthy)`
- [ ] `docker exec scc curl 127.0.0.1:3001/api/health` → JSON с `ok:true`
- [ ] `curl https://cmd.bonaka.app/api/health` → JSON с `ok:true`
- [ ] `integrations.ai.configured = true`
- [ ] `curl -I https://bonaka.app` → 200/30x (не сломано)
- [ ] `curl -I https://mob.bonaka.app` → 200/30x
- [ ] `curl -I https://disp.bonaka.app` → 200/30x
- [ ] `curl -I https://api.bonaka.app` → 200/30x
- [ ] Volume для SQLite смонтирован (`docker exec scc ls /app/data` показывает файл базы)
- [ ] AUTH_TOKEN сохранён и сообщён пользователю

Если хоть одно красное — НЕ репортуй "готово", покажи что не прошло
и подожди решения от пользователя.
