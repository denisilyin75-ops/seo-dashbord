import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Btn, Inp, Badge } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';

const TOKEN_KEY = 'scc:auth-token';

export default function Settings() {
  const toast = useToast();
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [health, setHealth] = useState(null);
  const [healthErr, setHealthErr] = useState(null);
  const [sites, setSites] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);

  const checkHealth = async () => {
    setHealthErr(null);
    try {
      const h = await api.health();
      setHealth(h);
    } catch (e) {
      setHealthErr(e.message);
    }
  };

  useEffect(() => {
    checkHealth();
    api.listSites().then(setSites).catch(() => {});
    // дёрнем dummy AI command — заглушка ответит stub:true, реальный ключ — stub:false
    api.aiCommand('ping', {}).then((r) => setAiStatus(r)).catch((e) => setAiStatus({ error: e.message }));
  }, []);

  const saveToken = () => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    toast.success(token ? 'Токен сохранён в localStorage' : 'Токен удалён');
    checkHealth();
  };

  const integrations = [
    {
      name: 'Express API',
      ok: !!health,
      detail: health ? `online · sites: ${health.sites}` : healthErr || '...',
    },
    {
      name: 'Claude AI',
      ok: aiStatus && !aiStatus.error && !aiStatus.stub,
      warn: aiStatus?.stub,
      detail: aiStatus?.error
        ? `error: ${aiStatus.error}`
        : aiStatus?.stub
          ? 'stub mode — ANTHROPIC_API_KEY не задан в .env'
          : aiStatus
            ? `online · model: ${aiStatus.model || '—'}`
            : '...',
    },
    { name: 'WordPress REST', ok: false, warn: true, detail: 'настраивается per-site (WP Application Password)' },
    { name: 'GA4 Data API',   ok: false, warn: true, detail: 'требует GOOGLE_APPLICATION_CREDENTIALS (service account)' },
    { name: 'Search Console', ok: false, warn: true, detail: 'требует GOOGLE_APPLICATION_CREDENTIALS (service account)' },
    { name: 'n8n webhooks',   ok: false, warn: true, detail: 'требует N8N_WEBHOOK_BASE в .env' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>⚙️ Settings</h1>

      <Card title="Авторизация">
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px' }}>
          Bearer-токен для API. Если на сервере <code style={{ color: '#60a5fa' }}>AUTH_TOKEN</code> пустой —
          оставьте пустым (dev-режим). Хранится в <code style={{ color: '#60a5fa' }}>localStorage</code>.
        </p>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Inp value={token} onChange={setToken} placeholder="Bearer token" type="password" sx={{ flex: 1, fontFamily: 'var(--mn)' }} />
          <Btn v="acc" onClick={saveToken}>💾 Сохранить</Btn>
        </div>
      </Card>

      <Card title="Состояние интеграций">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {integrations.map((i) => (
            <div key={i.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i.ok ? '#34d399' : i.warn ? '#fbbf24' : '#ef4444' }} />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{i.name}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--mn)' }}>{i.detail}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px' }}>
          <Btn onClick={checkHealth} sx={{ fontSize: '11px' }}>🔄 Перепроверить</Btn>
        </div>
      </Card>

      <Card title={`Сайты в портфеле (${sites.length})`}>
        {!sites.length ? (
          <div style={{ fontSize: '12px', color: '#475569' }}>Нет сайтов — добавьте на <Link to="/" style={{ color: '#60a5fa' }}>Dashboard</Link>.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sites.map((s) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', alignItems: 'center', padding: '8px 10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--mn)' }}>{s.name}</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{s.market} · {s.niche}</span>
                <Badge s={s.status} />
                <Link to={`/sites/${s.id}`} style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', padding: '3px 8px', background: '#1e293b', borderRadius: '4px' }}>детали →</Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Переменные окружения (.env)">
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px' }}>
          Серверные секреты задаются в <code style={{ color: '#60a5fa' }}>.env</code> на хосте. UI их не редактирует.
        </p>
        <pre style={{ background: '#0a0e17', padding: '10px', borderRadius: '5px', fontSize: '11px', color: '#94a3b8', overflowX: 'auto', margin: 0, fontFamily: 'var(--mn)' }}>
{`PORT=3001
AUTH_TOKEN=                     # пусто = без авторизации
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_APPLICATION_CREDENTIALS=./google-sa-key.json
N8N_WEBHOOK_BASE=https://n8n.your-server.com/webhook
DB_PATH=./data/seo.sqlite`}
        </pre>
      </Card>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 10px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.5px' }}>{title}</h2>
      {children}
    </section>
  );
}
