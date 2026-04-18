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

  // Для группировки: показывать date только на смене дня
  let prevDate = '';
  const rowsWithDate = items.map(it => {
    const d = (it.started_at || '').slice(0, 10);
    const showDate = d !== prevDate;
    prevDate = d;
    return { ...it, showDate };
  });

  return (
    <div>
      {/* Compact header — 1 line */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 6, padding: '4px 8px',
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4,
        flexWrap: 'wrap', alignItems: 'center', fontSize: 10,
      }}>
        <span style={{ color: '#64748b', fontWeight: 600 }}>24h</span>
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
            style={{ fontSize: 9, background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
          >✕</button>
        )}
        <span style={{ marginLeft: 'auto', color: '#475569', fontFamily: 'var(--mn)' }}>
          {loading ? '…' : `${items.length}/${data.items.length} · auto 30s`}
        </span>
      </div>

      {/* Dense list — no gap between rows, ~22px each */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, overflow: 'hidden' }}>
        {rowsWithDate.length === 0 ? (
          <div style={{ padding: 10, color: '#64748b', fontSize: 11, textAlign: 'center' }}>
            {filter ? `Нет записей из ${filter}` : 'Activity feed пуст'}
          </div>
        ) : rowsWithDate.map((it, i) => (
          <Row key={`${it.source}_${it.id}_${i}`} item={it} showDate={it.showDate} />
        ))}
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
        display: 'flex', alignItems: 'center', gap: 3,
        padding: '2px 6px', borderRadius: 3,
        background: active ? meta.color + '25' : 'transparent',
        border: `1px solid ${active ? meta.color : '#1e293b'}`,
        color: '#e2e8f0', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      <span>{meta.icon}</span>
      <strong style={{ fontFamily: 'var(--mn)' }}>{total}</strong>
      {errors > 0 && <span style={{ color: '#ef4444' }}>✕{errors}</span>}
    </button>
  );
}

// Компактная форма строки: фиксированная grid, 22px высота, минимум chrome.
// Columns: [status-dot] [time] [source] [label] [summary...] [tokens/cost]
// При наведении — background highlight + фулл-summary в title tooltip.
function Row({ item, showDate }) {
  const meta = SOURCE_META[item.source] || { icon: '•', label: item.source, color: '#64748b' };
  const statusColor = STATUS_COLOR[item.status] || '#64748b';
  const time = (item.started_at || '').slice(11, 16);
  const date = (item.started_at || '').slice(5, 10);

  return (
    <div
      title={`${item.source} · ${item.label} · ${item.status}\n${item.summary || ''}\n${item.started_at}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '6px 42px 16px 130px 1fr auto',
        alignItems: 'center',
        gap: 8,
        padding: '2px 8px',
        fontSize: 11,
        lineHeight: '18px',
        height: 22,
        fontFamily: 'var(--mn)',
        color: '#94a3b8',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#1e293b30'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ color: statusColor, fontSize: 10 }}>●</span>
      <span style={{ color: '#64748b', fontSize: 10 }}>
        {showDate ? date : ''}{showDate ? ' ' : ''}{time}
      </span>
      <span style={{ fontSize: 11 }}>{meta.icon}</span>
      <strong style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </strong>
      <span style={{
        color: '#94a3b8',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        fontSize: 11,
      }}>
        {item.summary}
      </span>
      {item.tokens_used > 0 ? (
        <span style={{ color: '#475569', fontSize: 10, flexShrink: 0 }}>
          {formatTokens(item.tokens_used)}{item.cost_usd > 0 ? ` $${item.cost_usd.toFixed(3)}` : ''}
        </span>
      ) : <span />}
    </div>
  );
}

function formatTokens(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}
