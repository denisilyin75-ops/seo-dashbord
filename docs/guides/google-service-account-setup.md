# Google Service Account setup для SCC — step-by-step

> **Цель:** подключить GA4 + Search Console к SCC так, чтобы cron `metrics_sync` тянул реальные sessions/revenue/impressions/positions каждую ночь в 03:00 UTC.
>
> **Время:** 20-30 минут кликов в Google Cloud Console + Search Console + SCC Settings.
>
> **Результат:** через 48 часов после настройки в SCC начнут появляться реальные метрики вместо нулей. Exit Readiness scorecard учтёт реальный трафик.

---

## Почему Service Account (а не OAuth с твоим личным логином)

Service Account = **machine identity**. Логин/пароль не нужен, работает автономно. Если твой личный Google account вдруг заблокируют или сменят пароль — cron продолжит работать. Плюс:

- Можно шарить read-access с SA без передачи своего пароля
- Key rotates отдельно от твоего account
- Audit log показывает что именно SA делал (не смешано с твоим personal browsing)

Это стандарт для server-side integrations Google API.

---

## Часть 1 — Google Cloud Console (10 мин)

### Шаг 1.1 — Создать или выбрать проект

1. Открыть https://console.cloud.google.com/
2. Залогиниться своим Google account (тот что имеет доступ к GA4 и Search Console)
3. В верхнем левом углу: dropdown с названием проекта → **«New Project»**
4. Название: `scc-analytics` (или любое запоминающееся)
5. Organization: **No organization** (если это личный account) или выбрать свою
6. **Create** → подождать 30 секунд до появления

### Шаг 1.2 — Включить API

Нужно включить **2 API**:

1. В Console: меню (☰) → **APIs & Services** → **Library**
2. Найти **"Google Analytics Data API"** → **Enable**
3. Снова в Library → найти **"Google Search Console API"** → **Enable**

Проверка: **APIs & Services → Enabled APIs** — должно быть 2 API.

### Шаг 1.3 — Создать Service Account

1. **APIs & Services → Credentials**
2. Сверху кнопка **"+ Create Credentials"** → **Service account**
3. **Service account name:** `scc-metrics-reader`
4. **Service account ID:** автоподставится (например `scc-metrics-reader`)
5. **Service account description:** `Read-only access to GA4 + GSC for SCC cron sync`
6. **Create and Continue**
7. **Grant this service account access to project** — пропустить (клик **Continue**; permissions на уровне проекта не нужны)
8. **Grant users access to this service account** — пропустить (**Done**)

### Шаг 1.4 — Создать JSON key

1. В списке Service accounts найти `scc-metrics-reader@...iam.gserviceaccount.com`
2. Кликнуть на него → вкладка **Keys**
3. **Add Key → Create new key** → выбрать **JSON** → **Create**
4. Браузер автоматически скачает файл типа `scc-analytics-xxx-abc123.json`

**⚠️ Сохрани этот файл безопасно.** Это единственный ключ к auth — restoration невозможна, только создать новый.

### Шаг 1.5 — Запомнить email SA

Открой скачанный JSON в любом редакторе. Там есть поле:
```json
"client_email": "scc-metrics-reader@scc-analytics-xxx.iam.gserviceaccount.com"
```

Скопируй эту строку — пригодится в Часть 2 (нужно дать этому email доступ в GA4 и GSC).

---

## Часть 2 — GA4 permissions (5 мин)

Для каждого сайта где у тебя подключён GA4 (popolkam.ru, aykakchisto.ru, 4beg.ru):

### Шаг 2.1 — Открыть property settings

1. https://analytics.google.com/
2. Внизу слева **Admin** (шестерёнка)
3. В колонке **Property** → выбрать нужный property (например popolkam.ru)

### Шаг 2.2 — Добавить Viewer

1. **Property access management**
2. Сверху синяя **+ → Add users**
3. **Email:** вставь `client_email` из JSON (`scc-metrics-reader@...`)
4. **Role:** **Viewer** (достаточно, не давай Editor)
5. ⬛ Notify new users by email: можно снять галочку (SA email не сможет открыть письмо)
6. **Add**

### Шаг 2.3 — Запомнить Property ID

На той же странице **Admin → Property Settings**:
- **Property ID:** `123456789` (9-digit number)

Формат для SCC: `properties/123456789`

### Повторить для всех сайтов

Записать все Property ID:
- popolkam.ru → `properties/XXXXXXXXX`
- 4beg.ru → `properties/YYYYYYYYY`
- aykakchisto.ru → (когда будет подключён GA4)

---

## Часть 3 — Search Console permissions (5 мин)

Для каждого сайта:

### Шаг 3.1 — Открыть property

1. https://search.google.com/search-console
2. В левой панели выбрать property (например `https://popolkam.ru/`)

### Шаг 3.2 — Добавить User

1. Внизу слева **Settings** (шестерёнка) → **Users and permissions**
2. Сверху **Add User**
3. **Email address:** `client_email` из JSON (тот же SA)
4. **Permission:** **Full** (иначе API будет отдавать ограниченные данные)
5. **Add**

### Шаг 3.3 — Запомнить Property URL

URL property как он отображается в списке slева:
- `https://popolkam.ru/` (с trailing slash — важно)
- `sc-domain:popolkam.ru` (для Domain property)

В SCC это значение идёт в поле `gsc_site_url` для сайта.

---

## Часть 4 — Подключить в SCC (5 мин)

### Шаг 4.1 — Загрузить JSON на VPS

На своей машине:

```bash
# Переименовать скачанный JSON для ясности
mv ~/Downloads/scc-analytics-xxx-abc123.json ~/Downloads/google-sa-key.json

# Загрузить на VPS в /opt/scc/data/ (mounted volume, persists между restarts)
scp ~/Downloads/google-sa-key.json root@5.129.245.98:/opt/scc/data/google-sa-key.json

# Проверить права
ssh root@5.129.245.98 "chmod 600 /opt/scc/data/google-sa-key.json && ls -la /opt/scc/data/google-sa-key.json"
```

### Шаг 4.2 — Прописать путь в .env

На VPS:

```bash
ssh root@5.129.245.98
cd /opt/scc
nano .env
```

Добавить строку (или раскомментировать если есть):

```
GOOGLE_APPLICATION_CREDENTIALS=/app/data/google-sa-key.json
```

(Путь `/app/data/` — это как volume виден изнутри контейнера; на хосте это `/opt/scc/data/`)

Сохранить (Ctrl+X → Y → Enter).

### Шаг 4.3 — Restart SCC

```bash
docker compose restart scc
```

### Шаг 4.4 — Заполнить Property ID / Site URL для каждого сайта

Вариант A — через UI SCC:
1. https://cmd.bonaka.app/
2. Кликнуть на сайт (например popolkam.ru) → **Edit** (значок карандаша)
3. Поля **GA4 property_id** и **GSC site URL** — заполнить
4. Save

Вариант B — через API (быстрее для 3 сайтов):

```bash
curl -X PUT "https://cmd.bonaka.app/api/sites/site_04197e82" \
  -H "Authorization: Bearer SeoCmd2026!" \
  -H "Content-Type: application/json" \
  -d '{
    "ga4_property_id": "properties/123456789",
    "gsc_site_url": "https://popolkam.ru/"
  }'
```

(Замени `site_04197e82` на реальный ID из `/api/sites` + подставь свои значения.)

---

## Часть 5 — Проверить что работает (5 мин)

### Шаг 5.1 — Manual sync trigger

В SCC UI: `/sites/:id` → кнопка **"↻ Pull GA4/GSC"**.

Или через API:

```bash
curl -X POST "https://cmd.bonaka.app/api/sites/site_04197e82/sync-metrics?days=7" \
  -H "Authorization: Bearer SeoCmd2026!"
```

Response должен вернуть:

```json
{
  "ga4": { "rows": 7 },
  "gsc": { "rows": 7 },
  "upserted": 7
}
```

### Шаг 5.2 — Проверить данные в БД

```bash
ssh root@5.129.245.98 "docker exec scc node -e 'import(\"better-sqlite3\").then(m=>{const db=new m.default(\"/app/data/seo.sqlite\"); const r=db.prepare(\"SELECT * FROM site_metrics WHERE site_id = ? ORDER BY date DESC LIMIT 7\").all(\"site_04197e82\"); console.table(r);})'"
```

Должны появиться не-нулевые `sessions` / `impressions` (если сайт получает трафик).

### Шаг 5.3 — Посмотреть в UI

`/sites/:id` → chart **Sessions / Revenue** должен показывать не flat-line нулей.

---

## Троубулшутинг

### «Permission denied» при API call

- Проверь что email SA **действительно** добавлен в GA4 property (Часть 2)
- Подожди 5-10 минут — permission propagates не мгновенно
- Проверь что SA JSON лежит по пути `GOOGLE_APPLICATION_CREDENTIALS` внутри контейнера:
  ```bash
  ssh root@5.129.245.98 "docker exec scc ls -la /app/data/google-sa-key.json"
  ```

### «API not enabled»

- Вернись в Часть 1.2, проверь что **оба** API включены в том же проекте где Service Account

### Метрики всё равно 0

- Сайт действительно получает трафик? Открой GA4 напрямую и проверь.
- GSC property указан правильно? Формат: `https://popolkam.ru/` (с точкой и slash) vs `sc-domain:popolkam.ru` — зависит от того как ты его зарегистрировал в Search Console
- Сайт только что добавлен в GSC — нужно 2-3 дня прежде чем появятся первые impressions

### Ротация ключа (раз в полгода-год)

1. В Google Cloud Console → Credentials → Service account → Keys → **Create new key**
2. Загрузить новый JSON в `/opt/scc/data/google-sa-key.json` (overwrite)
3. `docker compose restart scc`
4. Удалить старый ключ в Console (чтобы он больше не работал)

---

## Что дальше (после настройки)

**Сразу:**
- Cron в 03:00 UTC будет тянуть последний день каждого сайта автоматически
- UI Dashboard начнёт показывать trend (MetricsChart)
- Exit Readiness scorecard учтёт реальный `site_valuation` (formula использует sessions × RPM)

**Через 1-2 недели:**
- Daily Brief «Pulse» card будет показывать недельные trend'ы
- Analytics Review agent (weekly) начнёт генерить insights

**Через месяц:**
- Site Valuation компонент получит серьёзную historical data
- Первый GSC report (positions/CTR) выйдет полезным для priorities

**Через 3 месяца:**
- SEO Drift detection (Site Guardian agent — когда реализуем) начнёт ловить regression paterns
- Cannibalization Detector получит query overlap data

---

## Сохранность key'а

- ⛔ **Никогда не коммить в git** — он уже в `.gitignore` для `/data/`, но проверь
- ⛔ **Никогда не публикуй JSON** — это equivalent root-доступа к твоей аналитике
- ✅ Backup JSON в менеджер паролей (1Password / Bitwarden) — на случай если VPS упадёт
- ✅ Rotate раз в 6-12 месяцев (Часть Troubleshooting → Rotation)

---

## Checklist

После выполнения всех шагов:

- [ ] Google Cloud project создан
- [ ] Enabled: Google Analytics Data API + Google Search Console API
- [ ] Service Account создан, JSON key скачан
- [ ] JSON загружен на VPS в `/opt/scc/data/google-sa-key.json`
- [ ] `.env` содержит `GOOGLE_APPLICATION_CREDENTIALS=/app/data/google-sa-key.json`
- [ ] SCC restarted (`docker compose restart scc`)
- [ ] popolkam.ru: GA4 added + GSC added + SCC fields заполнены
- [ ] 4beg.ru: GA4 added + GSC added + SCC fields заполнены
- [ ] aykakchisto.ru: пока пропустить (ещё 0 sessions)
- [ ] Manual sync triggered успешно (hot test)
- [ ] Данные в `site_metrics` table появились не-нулевыми

После этого я могу дальше работать с реальными цифрами. Пинг когда пройдёшь — проверим что всё катит.
