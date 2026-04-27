import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Btn } from './ui.jsx';

// LlmInsightsPanel — deep cost understanding beyond simple breakdown:
//   1. Daily timeline с anomaly markers
//   2. Reconciliation: computed vs actual OpenRouter billing
//   3. Drill-down в single call (full prompt + response)
//   4. Manual reconcile trigger
//
// Место: на /agents под LlmCostPanel. Группировка даёт "где уходит", timeline даёт "когда + аномалии".

const BAR_HEIGHT = 48;

export default function LlmInsightsPanel() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [callDetail, setCallDetail] = useState(null);
  const [reconciling, setReconciling] = useState(false);

  const load = () => {
    setLoading(true);
    api.llmTimeline(days)
      .then(r => setData(r))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [days]);

  useEffect(() => {
    if (selectedCallId) {
      api.llmCall(selectedCallId).then(setCallDetail).catch(() => setCallDetail(null));
    } else {
      setCallDetail(null);
    }
  }, [selectedCallId]);

  const triggerReconcile = async () => {
    setReconciling(true);
    try {
      const r = await api.llmReconcile(100);
      alert(`Reconciled: ${r.reconciled}/${r.total}\nErrors: ${r.errors}, Skipped: ${r.skipped}`);
      load();
    } catch (e) {
      alert('Reconcile failed: ' + e.message);
    } finally {
      setReconciling(false);
    }
  };

  if (!data) {
    return <div style={{ padding: 10, color: '#64748b', fontSize: 11 }}>{loading ? 'Загрузка…' : 'Нет данных'}</div>;
  }

  const maxCost = Math.max(0.001, ...data.timeline.map(d => d.cost || 0));
  const totalCost = data.timeline.reduce((a, d) => a + (d.cost || 0), 0);
  const totalActual = data.timeline.reduce((a, d) => a + (d.cost_effective || 0), 0);
  const totalCalls = data.timeline.reduce((a, d) => a + (d.calls || 0), 0);
  const reconcileRate = data.reconciliation.total_calls > 0
    ? (data.reconciliation.reconciled_calls / data.reconciliation.total_calls) * 100
    : 0;
  const gap = data.reconciliation.computed && data.reconciliation.actual
    ? ((data.reconciliation.actual - data.reconciliation.computed) / data.reconciliation.computed) * 100
    : null;
  const anomalies = data.timeline.filter(d => d.anomaly).length;

  return (
    <div>
      {/* Header: totals + reconciliation status */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 10, padding: '8px 12px',
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4,
        fontSize: 11,
      }}>
        <div>
          <span style={{ color: '#64748b', marginRight: 4 }}>Total:</span>
          <strong style={{ color: '#e2e8f0', fontFamily: 'var(--mn)', fontSize: 13 }}>${totalCost.toFixed(4)}</strong>
          <span style={{ color: '#475569', marginLeft: 4, fontSize: 10 }}>/{days}d</span>
        </div>
        {reconcileRate > 0 && (
          <div>
            <span style={{ color: '#64748b', marginRight: 4 }}>Actual:</span>
            <strong style={{ color: '#e2e8f0', fontFamily: 'var(--mn)' }}>${totalActual.toFixed(4)}</strong>
            {gap != null && (
              <span style={{
                marginLeft: 4, fontSize: 10,
                color: Math.abs(gap) < 5 ? '#22c55e' : Math.abs(gap) < 15 ? '#fbbf24' : '#ef4444',
              }}>
                ({gap > 0 ? '+' : ''}{gap.toFixed(1)}%)
              </span>
            )}
          </div>
        )}
        <div>
          <span style={{ color: '#64748b', marginRight: 4 }}>Calls:</span>
          <strong style={{ color: '#e2e8f0', fontFamily: 'var(--mn)' }}>{totalCalls}</strong>
        </div>
        {anomalies > 0 && (
          <div style={{ color: '#fbbf24' }}>
            ⚠ {anomalies} anomaly день{anomalies > 1 ? 'я' : ''}
          </div>
        )}
        <div style={{ color: '#475569', fontSize: 10 }}>
          Reconciled: {data.reconciliation.reconciled_calls}/{data.reconciliation.total_calls}
          {reconcileRate > 0 && ` (${reconcileRate.toFixed(0)}%)`}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '2px 6px', borderRadius: 3, fontSize: 10,
                background: days === d ? '#3b82f625' : 'transparent',
                border: `1px solid ${days === d ? '#3b82f6' : '#1e293b'}`,
                color: '#e2e8f0', cursor: 'pointer',
              }}
            >{d}d</button>
          ))}
          <Btn onClick={triggerReconcile} disabled={reconciling} v="ghost" sx={{ fontSize: 10 }}>
            {reconciling ? '…' : '↻ Reconcile'}
          </Btn>
        </div>
      </div>

      {/* Timeline chart — simple SVG bars */}
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4,
        padding: '10px 8px', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: BAR_HEIGHT, gap: 1 }}>
          {data.timeline.map((d, i) => {
            const h = maxCost > 0 ? (d.cost / maxCost) * BAR_HEIGHT : 0;
            const reconciledH = maxCost > 0 ? ((d.cost_effective || d.cost) / maxCost) * BAR_HEIGHT : 0;
            return (
              <div
                key={d.day}
                title={`${d.day}\n${d.calls} calls · ${formatNum(d.tokens)} tokens · $${(d.cost || 0).toFixed(4)}${d.anomaly ? '\n⚠ anomaly' : ''}`}
                style={{
                  flex: 1, minWidth: 4, position: 'relative',
                  height: BAR_HEIGHT,
                  display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                  cursor: 'pointer',
                }}
              >
                {d.anomaly && (
                  <div style={{
                    position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                    width: 4, height: 4, background: '#fbbf24', borderRadius: '50%',
                  }} />
                )}
                <div style={{
                  height: Math.max(h, d.cost > 0 ? 1 : 0),
                  background: d.anomaly ? '#fbbf24' : d.cost_effective && d.cost_effective > d.cost ? '#ef4444' : '#3b82f6',
                  opacity: d.cost > 0 ? 0.85 : 0,
                  borderRadius: '1px 1px 0 0',
                }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#475569', marginTop: 4, fontFamily: 'var(--mn)' }}>
          <span>{data.timeline[0]?.day.slice(5)}</span>
          <span style={{ color: '#64748b' }}>daily spend · max ${maxCost.toFixed(3)}</span>
          <span>{data.timeline[data.timeline.length - 1]?.day.slice(5)}</span>
        </div>
      </div>

      {/* Waste detection findings */}
      <WastePanel days={days} />

      {/* Recent calls list for drill-down */}
      <RecentCallsList onSelect={setSelectedCallId} />

      {/* Modal — single call detail */}
      {selectedCallId && callDetail && (
        <CallDetailModal call={callDetail} onClose={() => setSelectedCallId(null)} />
      )}
    </div>
  );
}

function WastePanel({ days }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    api.llmWaste(days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setData(null); }, [days]);

  if (!data && !loading) {
    return (
      <div style={{ marginTop: 10, padding: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, fontSize: 11 }}>
        <span style={{ color: '#64748b' }}>💡 Waste detection — patterns экономии</span>
        <button
          onClick={run}
          style={{ marginLeft: 10, padding: '3px 8px', background: '#3b82f625', border: '1px solid #3b82f6', borderRadius: 3, color: '#e2e8f0', cursor: 'pointer', fontSize: 10 }}
        >Run analysis</button>
      </div>
    );
  }
  if (loading) return <div style={{ marginTop: 10, padding: 8, color: '#64748b', fontSize: 11 }}>Анализирую…</div>;

  const { findings, summary } = data || { findings: [], summary: {} };

  return (
    <div style={{ marginTop: 10, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, padding: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11 }}>
        <strong style={{ color: '#e2e8f0' }}>💡 Waste analysis ({days}d)</strong>
        <span style={{ color: '#64748b' }}>{summary.total_findings} pattern{summary.total_findings === 1 ? '' : 's'}</span>
        {summary.projection_monthly > 0 && (
          <span style={{ color: '#22c55e', fontWeight: 600 }}>
            potential ${summary.projection_monthly}/mo
          </span>
        )}
        <button onClick={run} style={{ marginLeft: 'auto', padding: '2px 6px', background: 'transparent', border: '1px solid #334155', color: '#64748b', borderRadius: 3, cursor: 'pointer', fontSize: 10 }}>
          ↻ Re-run
        </button>
      </div>
      {!findings.length ? (
        <div style={{ fontSize: 11, color: '#22c55e', padding: 6 }}>✓ Нет patterns waste — оптимально.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {findings.map((f, i) => (
            <Finding key={i} f={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function Finding({ f }) {
  const [expanded, setExpanded] = useState(false);
  const sevColor = { critical: '#ef4444', high: '#f97316', medium: '#fbbf24', low: '#94a3b8', info: '#60a5fa' }[f.severity] || '#64748b';
  return (
    <div style={{ padding: 8, background: '#0a0e17', borderLeft: `3px solid ${sevColor}`, borderRadius: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{f.title}</div>
          {f.detail?.savings_usd > 0 && (
            <div style={{ fontSize: 10, color: '#22c55e', marginTop: 2 }}>
              💰 экономия ${f.detail.savings_usd.toFixed(4)} ({f.detail.savings_pct}%)
            </div>
          )}
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>
            {f.recommendation}
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 10 }}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>
      {expanded && (
        <pre style={{ marginTop: 6, padding: 6, background: '#0f172a', borderRadius: 3, fontSize: 9, color: '#94a3b8', overflow: 'auto', maxHeight: 250, fontFamily: 'var(--mn)' }}>
{JSON.stringify(f.detail, null, 2)}
        </pre>
      )}
    </div>
  );
}

function RecentCallsList({ onSelect }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.llmCalls({ limit: 25 })
      .then(r => setItems(r.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading && !items.length) return <div style={{ padding: 10, color: '#64748b', fontSize: 11 }}>Загрузка calls…</div>;

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 110px 110px 1fr 55px 55px 18px',
        gap: 6, padding: '4px 8px',
        fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase',
        background: '#1e293b30', borderBottom: '1px solid #1e293b',
      }}>
        <span>Time</span>
        <span>Source</span>
        <span>Operation</span>
        <span>Model</span>
        <span style={{ textAlign: 'right' }}>Tokens</span>
        <span style={{ textAlign: 'right' }}>Cost</span>
        <span></span>
      </div>
      {items.map(it => {
        const hasActual = it.actual_cost_usd != null;
        const gap = hasActual && it.cost_usd > 0 ? ((it.actual_cost_usd - it.cost_usd) / it.cost_usd) * 100 : null;
        return (
          <div
            key={it.id}
            onClick={() => onSelect(it.id)}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 110px 110px 1fr 55px 55px 18px',
              gap: 6, padding: '4px 8px',
              fontSize: 10, fontFamily: 'var(--mn)', color: '#94a3b8',
              cursor: 'pointer',
              borderBottom: '1px solid #1e293b40',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e293b30'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ color: '#64748b' }}>{it.created_at?.slice(11, 16)}</span>
            <span style={{ color: '#e2e8f0' }}>{it.source}</span>
            <span>{it.operation || '—'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.model?.replace('anthropic/claude-', '')}
            </span>
            <span style={{ textAlign: 'right', color: '#64748b' }}>{formatNum(it.tokens_total)}</span>
            <span style={{ textAlign: 'right', color: '#60a5fa' }}>
              ${(it.actual_cost_usd ?? it.cost_usd).toFixed(4)}
            </span>
            <span style={{ color: hasActual ? '#22c55e' : '#475569', fontSize: 8 }}>
              {hasActual ? '✓' : '○'}
            </span>
          </div>
        );
      })}
      {items.length === 0 && (
        <div style={{ padding: 12, color: '#64748b', fontSize: 11, textAlign: 'center' }}>
          Calls не было. Запусти article action / merge / code review.
        </div>
      )}
    </div>
  );
}

function CallDetailModal({ call, onClose }) {
  const detail = (() => {
    try { return { ...call, promptLen: call.full_prompt?.length || 0, respLen: call.full_response?.length || 0 }; } catch { return call; }
  })();
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: '#000000a0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
          padding: 16, maxWidth: 900, width: '100%',
          maxHeight: '85vh', overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
              LLM call #{detail.id} — {detail.operation || 'unknown'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--mn)', marginTop: 3 }}>
              {detail.model} · {detail.provider} · {detail.created_at}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12, fontSize: 11 }}>
          <Stat label="Tokens in"    value={formatNum(detail.tokens_in)} />
          <Stat label="Tokens out"   value={formatNum(detail.tokens_out)} />
          <Stat label="Computed"     value={`$${(detail.cost_usd || 0).toFixed(5)}`} color="#60a5fa" />
          {detail.actual_cost_usd != null && (
            <Stat label="Actual"     value={`$${detail.actual_cost_usd.toFixed(5)}`} color="#22c55e" />
          )}
          <Stat label="Latency"      value={`${detail.latency_ms || 0}ms`} />
          <Stat label="Source"       value={detail.source} />
          {detail.source_id && <Stat label="Source ID" value={detail.source_id} />}
          {detail.site_id && <Stat label="Site" value={detail.site_id} />}
          {detail.generation_id && <Stat label="Gen ID" value={detail.generation_id.slice(0, 12) + '…'} />}
        </div>

        {detail.full_prompt && (
          <details open style={{ marginBottom: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
              📤 Prompt ({detail.full_prompt.length} chars)
            </summary>
            <pre style={{
              marginTop: 6, padding: 10, background: '#0a0e17', borderRadius: 4,
              fontSize: 10, color: '#cbd5e1', lineHeight: 1.5,
              maxHeight: 300, overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'var(--mn)',
            }}>{detail.full_prompt}</pre>
          </details>
        )}

        {detail.full_response && (
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>
              📥 Response ({detail.full_response.length} chars)
            </summary>
            <pre style={{
              marginTop: 6, padding: 10, background: '#0a0e17', borderRadius: 4,
              fontSize: 10, color: '#cbd5e1', lineHeight: 1.5,
              maxHeight: 300, overflow: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: 'var(--mn)',
            }}>{detail.full_response}</pre>
          </details>
        )}

        {detail.error && (
          <div style={{ marginTop: 8, padding: 8, background: '#7f1d1d30', border: '1px solid #ef4444', borderRadius: 4, fontSize: 11, color: '#fca5a5' }}>
            Error: {detail.error}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: '4px 8px', background: '#0a0e17', borderRadius: 3 }}>
      <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 11, color: color || '#e2e8f0', fontFamily: 'var(--mn)', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function formatNum(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}
