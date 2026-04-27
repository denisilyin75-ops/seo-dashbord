import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

// SitesUptimeWidget — single-glance health table per site.
// Колонки: status dot, name, last latency, availability 24h/7d, SSL days.
// Click site → expand с history sparkline (simple inline).

export default function SitesUptimeWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const load = () => {
    setLoading(true);
    api.sitesUptime()
      .then(r => setData(r.sites))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []);

  const checkNow = async () => {
    setChecking(true);
    try {
      await api.sitesUptimeCheck();
      load();
    } catch {} finally { setChecking(false); }
  };

  if (!data) return loading ? <Loading /> : null;

  const downCount = data.filter(s => s.status === 'down').length;
  const upCount = data.filter(s => s.status === 'up').length;
  const sslWarnCount = data.filter(s => s.ssl_warning).length;

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 7, padding: 12, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 12, color: '#e2e8f0' }}>🌐 Sites uptime</strong>
        <span style={{ fontSize: 10, color: downCount ? '#ef4444' : '#22c55e' }}>
          {downCount > 0 ? `${downCount}/${data.length} DOWN` : `${upCount}/${data.length} UP`}
        </span>
        {sslWarnCount > 0 && (
          <span style={{ fontSize: 10, color: '#fbbf24' }}>⚠ {sslWarnCount} SSL expiring soon</span>
        )}
        <button
          onClick={checkNow}
          disabled={checking}
          style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: 10, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: 3, cursor: 'pointer' }}
        >
          {checking ? '…' : '↻ Ping all'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {data.map(s => <SiteRow key={s.site_id} site={s} />)}
      </div>
    </div>
  );
}

function SiteRow({ site }) {
  const statusColor = site.status === 'up' ? '#22c55e' : site.status === 'down' ? '#ef4444' : '#64748b';
  const sslColor = site.ssl_days_left == null ? '#475569'
    : site.ssl_days_left < 7 ? '#ef4444'
    : site.ssl_days_left < 30 ? '#fbbf24'
    : '#22c55e';
  const av24 = site.availability?.['24h'];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '14px 1fr 60px 70px 70px',
      gap: 8, alignItems: 'center',
      padding: '4px 8px', background: '#0a0e17', borderRadius: 3,
      fontSize: 11,
    }}>
      <span style={{ color: statusColor, fontSize: 12 }}>●</span>
      <span style={{ color: '#e2e8f0', fontFamily: 'var(--mn)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {site.name}
      </span>
      <span style={{ color: '#64748b', fontFamily: 'var(--mn)', textAlign: 'right' }}>
        {site.last_latency_ms ? `${site.last_latency_ms}ms` : '—'}
      </span>
      <span style={{ color: av24 == null ? '#475569' : av24 >= 99 ? '#22c55e' : av24 >= 95 ? '#fbbf24' : '#ef4444', fontFamily: 'var(--mn)', textAlign: 'right' }}>
        {av24 != null ? `${av24}%` : '—'}
      </span>
      <span style={{ color: sslColor, fontFamily: 'var(--mn)', textAlign: 'right', fontSize: 10 }} title="SSL days remaining">
        {site.ssl_days_left != null ? `🔒${site.ssl_days_left}d` : '—'}
      </span>
    </div>
  );
}

function Loading() {
  return <div style={{ padding: 10, color: '#64748b', fontSize: 11 }}>Загружаю uptime…</div>;
}
