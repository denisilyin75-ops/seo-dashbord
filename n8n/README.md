# n8n workflows

Self-hosted n8n: https://docs.n8n.io/hosting/installation/docker-compose/

Импорт: **Workflows → Import from File → выбрать .json**.

## Список

| Файл                          | Триггер     | Что делает                                              |
|-------------------------------|-------------|---------------------------------------------------------|
| `deploy-wordpress.json`       | Webhook     | Принимает конфиг от SCC, через SSH запускает `deploy-wp.sh` |
| `sync-metrics.json`           | Schedule    | Альтернатива встроенному cron — pull GA4/GSC на n8n     |
| `ai-content-update.json`      | Webhook     | Триггерится из дашборда: Claude → WP REST update post    |
| `price-monitor.json`          | Schedule    | Проверяет актуальность цен через Content Egg API         |
| `alert-traffic-drop.json`     | Schedule    | Telegram/email алерт при падении трафика > X%            |

## Webhook URL

В `.env`:
```
N8N_WEBHOOK_BASE=https://n8n.your-server.com/webhook
```

В коде SCC бэкенда вызовы:
- `${N8N_WEBHOOK_BASE}/deploy-wp` — вместо локального `deployer.js`
- `${N8N_WEBHOOK_BASE}/ai-content-update`

## Credentials в n8n

- **SSH**: для deploy-wordpress (доступ к VPS, SSH key)
- **Google Sheets / Telegram / Email**: для алертов
- **HTTP Header Auth**: для звонков обратно в SCC API (Bearer = AUTH_TOKEN)
