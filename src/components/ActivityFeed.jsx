import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

// ActivityFeed — unified log из 3 систем:
//   - agent_runs (8 registered agents: daily_brief / metrics_sync / offer_health / etc.)
//   - code_review_runs (post-commit / nightly api-ref / weekly security / monthly scorecard)
//   - quality_runs (content-quality batch analysis)
//
// Показывает хронологический поток — полезно для:
//   1. Оператор видит что система жива и что делает
//   2. Exit-buyer видит reliable automation (важный сигнал)
//   3. Debug когда что-то не работает — всё в одном месте

const SOURCE_META = {
  agent:       { icon: '🤖', label: 'Agent', color: '#60a5fa' },
  code_review: { icon: '🔍', label: 'Code Review', color: '#a78bfa' },
  quality:     { icon: '🩺', label: 'Content Quality', color: '#22c55e' },
};

const STATUS_COLOR = {
  success:   '#22c55e',
  completed: '#22c55e',
  error:     '#ef4444',
  failed:    '#ef4444',
  skipped:   '#64748b',
  running:   '#fbbf24',
  partial:   '#fbbf24',
  pending_review: '#fbbf24',
};

export default function ActivityFeed({ limit = 50 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    api.activityFeed(limit)
      .then(r => setData(r))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Auto-refresh каждые 30 сек для live monitoring
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [limit]);

  if (!data) {
    return <div style={{ padding: 14, color: '#64748b', fontSize: 12 }}>Загрузка activity feed…</div>;
  }

  const items = filter
    ? data.items.filter(i => i.source === filter)
    : data.items;

  const agg = data.agg_24h || {};

  return (
    <div>
      {/* 24h aggregate header */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 10, padding: '10px 12px',
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 5,
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>24h:</span>
        {Object.entries(agg).map(([source, stats]) => (
          <SourceBadge
            key={source}
            source={source}
            stats={stats}
            active={filter === source}
            onClick={() => setFilter(filter === source ? '' : source)}
          />
        ))}
        {filter && (
          <button
            onClick={() => setFilter('')}
            style={{ fontSize: 10, background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', marginLeft: 'auto' }}
          >✕ Clear filter</button>
        )}
        <span style={{ marginLeft: filter ? 0 : 'auto', fontSize: 10, color: '#475569', fontFamily: 'var(--mn)' }}>
          {loading ? 'обновляю…' : `auto-refresh 30s · ${items.length}/${data.items.length}`}
        </span>
      </div>

      {/* Item list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {items.map((it, i) => (
          <Row key={`${it.source}_${it.id}_${i}`} item={it} />
        ))}
        {items.length === 0 && (
          <div style={{ padding: 12, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
            {filter ? `Нет записей из ${filter} за последние 50` : 'Activity feed пуст'}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceBadge({ source, stats, active, onClick }) {
  const meta = SOURCE_META[source] || { icon: '•', label: source };
  const total = stats.reduce((a, b) => a + b.n, 0);
  const errors = stats.find(s => s.status === 'error' || s.status === 'failed')?.n || 0;
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 8px', borderRadius: 4,
        background: active ? meta.color + '25' : '#1e293b',
        border: `1px solid ${active ? meta.color : '#334155'}`,
        color: '#e2e8f0', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span>{meta.icon}</span>
      <strong style={{ fontFamily: 'var(--mn)' }}>{total}</strong>
      <span style={{ color: '#64748b' }}>{meta.label}</span>
      {errors > 0 && (
        <span style={{ color: '#ef4444', fontSize: 10 }}>✕{errors}</span>
      )}
    </button>
  );
}

function Row({ item }) {
  const meta = SOURCE_META[item.source] || { icon: '•', label: item.source, color: '#64748b' };
  const statusColor = STATUS_COLOR[item.status] || '#64748b';
  const time = (item.started_at || '').slice(11, 16);
  const date = (item.started_at || '').slice(0, 10);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', background: '#0f172a',
      borderLeft: `3px solid ${meta.color}`,
      borderRadius: 3,
      fontSize: 11,
    }}>
      <span style={{ fontSize: 12 }}>{meta.icon}</span>
      <span style={{ color: statusColor, fontWeight: 700, minWidth: 60, fontSize: 10 }}>
        {item.status?.toUpperCase() || '?'}
      </span>
      <strong style={{ color: '#e2e8f0', minWidth: 120, fontFamily: 'var(--mn)', fontSize: 11 }}>
        {item.label}
      </strong>
      <span style={{ color: '#94a3b8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.summary}
      </span>
      {item.tokens_used > 0 && (
        <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'var(--mn)', flexShrink: 0 }}>
          {item.tokens_used}t
          {item.cost_usd > 0 && ` · $${item.cost_usd.toFixed(4)}`}
        </span>
      )}
      <span style={{ color: '#475569', fontFamily: 'var(--mn)', fontSize: 10, flexShrink: 0 }}>
        {date} {time}
      </span>
    </div>
  );
}
