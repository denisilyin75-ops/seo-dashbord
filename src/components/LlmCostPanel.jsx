import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

// LlmCostPanel — compact breakdown by source/model/operation/day.
// Используется на /agents (рядом с ActivityFeed) + Dashboard health block.
//
// UX: одна строка total header + collapsed table. Click group-row → drill-down.

const GROUPINGS = [
  { v: 'source',    l: 'По источнику' },
  { v: 'model',     l: 'По модели' },
  { v: 'operation', l: 'По операции' },
  { v: 'provider',  l: 'По провайдеру' },
  { v: 'day',       l: 'По дням' },
];

const PERIODS = [
  { v: 7,   l: '7d' },
  { v: 30,  l: '30d' },
  { v: 90,  l: '90d' },
];

export default function LlmCostPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [groupBy, setGroupBy] = useState('source');

  const load = () => {
    setLoading(true);
    api.llmCosts(days, groupBy)
      .then(r => setData(r))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [days, groupBy]);

  if (!data) {
    return <div style={{ padding: 10, color: '#64748b', fontSize: 11 }}>{loading ? 'Загружаю cost breakdown…' : 'Нет данных'}</div>;
  }

  const totals = data.totals || {};
  const projectedMonth = totals.cost ? (totals.cost / days) * 30 : 0;

  return (
    <div>
      {/* Header: single line totals */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 10px', marginBottom: 6,
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4,
        fontSize: 11, flexWrap: 'wrap',
      }}>
        <strong style={{ color: '#e2e8f0', fontSize: 13, fontFamily: 'var(--mn)' }}>
          ${(totals.cost || 0).toFixed(4)}
        </strong>
        <span style={{ color: '#64748b' }}>
          за {days}d · {totals.calls || 0} calls · {formatTokens(totals.tokens)} tokens
        </span>
        {projectedMonth > 0 && (
          <span style={{ color: '#60a5fa', fontFamily: 'var(--mn)' }}>
            ~${projectedMonth.toFixed(2)}/мес
          </span>
        )}
        {totals.errors > 0 && (
          <span style={{ color: '#ef4444' }}>✕ {totals.errors} errors</span>
        )}
        <span style={{ color: '#475569', fontSize: 10 }}>
          {totals.unique_models} модел{(totals.unique_models === 1) ? 'ь' : 'ей'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p.v}
              onClick={() => setDays(p.v)}
              style={{
                padding: '2px 6px', borderRadius: 3, fontSize: 10,
                background: days === p.v ? '#3b82f625' : 'transparent',
                border: `1px solid ${days === p.v ? '#3b82f6' : '#1e293b'}`,
                color: '#e2e8f0', cursor: 'pointer',
              }}
            >{p.l}</button>
          ))}
          <select
            value={groupBy}
            onChange={e => setGroupBy(e.target.value)}
            style={{ padding: '2px 4px', fontSize: 10, background: '#0a0e17', border: '1px solid #1e293b', color: '#e2e8f0', borderRadius: 3, fontFamily: 'inherit' }}
          >
            {GROUPINGS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
          </select>
        </div>
      </div>

      {/* Groups table — compact */}
      {data.groups?.length ? (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, overflow: 'hidden' }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 60px 70px 80px 60px',
            gap: 8, padding: '4px 10px',
            fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase',
            background: '#1e293b30', borderBottom: '1px solid #1e293b',
          }}>
            <span>{groupKey(groupBy)}</span>
            <span style={{ textAlign: 'right' }}>Calls</span>
            <span style={{ textAlign: 'right' }}>Tokens</span>
            <span style={{ textAlign: 'right' }}>Cost</span>
            <span style={{ textAlign: 'right' }}>Avg ms</span>
          </div>
          {data.groups.map((g, i) => {
            const costPct = totals.cost > 0 ? (g.cost / totals.cost) * 100 : 0;
            return (
              <div
                key={g.key + i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 70px 80px 60px',
                  gap: 8, padding: '4px 10px',
                  fontSize: 11, fontFamily: 'var(--mn)',
                  borderBottom: i < data.groups.length - 1 ? '1px solid #1e293b40' : 'none',
                  position: 'relative',
                }}
              >
                {/* Cost bar — background fill showing share */}
                <span style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${costPct}%`, background: '#3b82f615', pointerEvents: 'none',
                }} />
                <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', zIndex: 1 }}>
                  {g.key || <em style={{ color: '#475569' }}>—</em>}
                </span>
                <span style={{ textAlign: 'right', color: '#94a3b8', zIndex: 1 }}>{g.calls}</span>
                <span style={{ textAlign: 'right', color: '#94a3b8', zIndex: 1 }}>{formatTokens(g.tokens)}</span>
                <span style={{ textAlign: 'right', color: '#60a5fa', zIndex: 1 }}>${(g.cost || 0).toFixed(4)}</span>
                <span style={{ textAlign: 'right', color: '#64748b', zIndex: 1 }}>{g.avg_latency_ms ? Math.round(g.avg_latency_ms) : '—'}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: 10, color: '#64748b', fontSize: 11 }}>
          Нет LLM-запросов за последние {days} дней. Записи начнут накапливаться после первых agent runs.
        </div>
      )}
    </div>
  );
}

function formatTokens(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function groupKey(groupBy) {
  return { source: 'Source', model: 'Model', operation: 'Operation', provider: 'Provider', day: 'Day' }[groupBy] || groupBy;
}
