import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client.js';
import { Btn } from './ui.jsx';
import EmptyState from './EmptyState.jsx';

// ContentHealthPanel — Phase 1 deterministic checks dashboard per site.
// Секции:
//   - Summary: red/yellow count + avg score (7 дней) + кнопка "Analyze last 10"
//   - Filter bar: severity + category
//   - Issues list: severity icon, message, suggestion, actions (resolve / ignore)
//
// Когда нажата [Analyze last 10] — батч-запуск checkSeoHygiene+Schema+LinkHealth по 10 статьям.

const SEVERITY_STYLE = {
  red:    { bg: '#7f1d1d30', border: '#ef4444', color: '#fca5a5', label: '🔴 RED', dotColor: '#ef4444' },
  yellow: { bg: '#78350f30', border: '#f59e0b', color: '#fbbf24', label: '🟡 YELLOW', dotColor: '#f59e0b' },
  green:  { bg: '#14532d30', border: '#22c55e', color: '#86efac', label: '🟢 GREEN', dotColor: '#22c55e' },
};

const CATEGORY_LABEL = {
  seo_hygiene:   'SEO',
  link_health:   'Ссылки',
  schema:        'Schema',
  factual:       'Факты',
  voice:         'Голос',
  eeat:          'E-E-A-T',
  readability:   'Читаемость',
  freshness:     'Свежесть',
  image_issue:   'Картинки',
};

export default function ContentHealthPanel({ siteId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [err, setErr] = useState(null);
  const [fSeverity, setFSeverity] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true); setErr(null);
    try {
      const r = await api.contentHealth(siteId, { severity: fSeverity, category: fCategory, limit: 200 });
      setData(r);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, [siteId, fSeverity, fCategory]);

  useEffect(() => { load(); }, [load]);

  const runBatch = async () => {
    setAnalyzing(true); setErr(null);
    try {
      const r = await api.analyzeSiteBatch(siteId, 10);
      await load();
      alert(`Проанализировано: ${r.posts_checked}. Issues: ${r.results.reduce((a, b) => a + (b.issues || 0), 0)}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const resolve = async (id, action) => {
    const reason = action === 'ignored' ? prompt('Причина игнорирования (для аудита):') : undefined;
    if (action === 'ignored' && !reason) return;
    await api.resolveHealthIssue(id, action, reason);
    load();
  };

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (!siteId) return null;

  return (
    <div>
      {/* Summary header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
        padding: '10px 14px', background: '#0f172a', borderRadius: 5, border: '1px solid #1e293b',
      }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>Content Health:</div>
        <Stat label="🔴 Red" val={data?.summary?.red ?? '—'} color="#ef4444" />
        <Stat label="🟡 Yellow" val={data?.summary?.yellow ?? '—'} color="#f59e0b" />
        {data?.avg_score != null && (
          <Stat
            label="Avg score (7d)"
            val={`${data.avg_score}/100`}
            color={data.avg_score >= 80 ? '#22c55e' : data.avg_score >= 60 ? '#f59e0b' : '#ef4444'}
          />
        )}
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'var(--mn)' }}>
          {data?.recent_analyzed ? `${data.recent_analyzed} posts за 7 дней` : ''}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn onClick={runBatch} disabled={analyzing} v="acc" sx={{ fontSize: 10 }}>
            {analyzing ? 'Анализ…' : '🔍 Analyze 10 posts'}
          </Btn>
          <Btn onClick={load} disabled={loading} v="ghost" sx={{ fontSize: 10 }}>↻</Btn>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <select value={fSeverity} onChange={e => setFSeverity(e.target.value)} style={selStyle(fSeverity)}>
          <option value="">Все severity</option>
          <option value="red">🔴 Red</option>
          <option value="yellow">🟡 Yellow</option>
        </select>
        <select value={fCategory} onChange={e => setFCategory(e.target.value)} style={selStyle(fCategory)}>
          <option value="">Все категории</option>
          {Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {err && (
        <div style={{ padding: 8, background: '#991b1b20', border: '1px solid #ef4444', borderRadius: 4, color: '#fca5a5', fontSize: 11, marginBottom: 8 }}>
          Ошибка: {err}
        </div>
      )}

      {/* Issues list */}
      {!data?.issues?.length ? (
        <EmptyState
          icon="✨"
          title={loading ? 'Загрузка…' : 'Нет открытых проблем'}
          description={data?.recent_analyzed ? 'Все проверенные статьи чистые.' : 'Нажмите «Analyze 10 posts» для первого прогона.'}
        />
      ) : (
        <div>
          {data.issues.map(issue => {
            const style = SEVERITY_STYLE[issue.severity] || SEVERITY_STYLE.yellow;
            const isExpanded = expanded.has(issue.id);
            let detail = null;
            if (issue.detail) {
              try { detail = JSON.parse(issue.detail); } catch {}
            }
            return (
              <div
                key={issue.id}
                style={{
                  marginBottom: 6,
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderLeft: `3px solid ${style.border}`,
                  borderRadius: 4,
                  padding: '8px 10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: style.dotColor, fontSize: 14, lineHeight: 1 }}>●</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 12, color: '#e2e8f0' }}>{issue.message}</strong>
                      <Pill>{CATEGORY_LABEL[issue.signal_category] || issue.signal_category}</Pill>
                      {issue.auto_fixable ? <Pill color="#22c55e">auto-fix</Pill> : null}
                    </div>
                    {issue.post_url && (
                      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--mn)', marginTop: 2, wordBreak: 'break-all' }}>
                        <a href={issue.post_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                          {issue.post_url.replace(/^https?:\/\//, '').slice(0, 80)}
                        </a>
                      </div>
                    )}
                    {issue.suggestion && (
                      <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, lineHeight: 1.4 }}>
                        💡 {issue.suggestion}
                      </div>
                    )}
                    {detail && (
                      <div style={{ marginTop: 6 }}>
                        <button onClick={() => toggle(issue.id)} style={{ fontSize: 10, background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0 }}>
                          {isExpanded ? '▼ Скрыть detail' : '▶ Detail'}
                        </button>
                        {isExpanded && (
                          <pre style={{ fontSize: 10, background: '#0a0e17', padding: 6, borderRadius: 3, marginTop: 4, overflow: 'auto', color: '#94a3b8', fontFamily: 'var(--mn)' }}>
{JSON.stringify(detail, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <Btn onClick={() => resolve(issue.id, 'resolved')} v="ghost" sx={{ fontSize: 9 }}>✓ Resolved</Btn>
                    <Btn onClick={() => resolve(issue.id, 'ignored')} v="ghost" sx={{ fontSize: 9, color: '#64748b' }}>Ignore</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, val, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
      <strong style={{ fontSize: 13, color: color || '#e2e8f0', fontFamily: 'var(--mn)' }}>{val}</strong>
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{
      fontSize: 9, padding: '1px 5px', borderRadius: 3,
      background: color ? color + '30' : '#1e293b',
      color: color || '#94a3b8', fontFamily: 'var(--mn)', textTransform: 'uppercase', letterSpacing: 0.3,
    }}>{children}</span>
  );
}

function selStyle(activeValue) {
  return {
    padding: '5px 8px', fontSize: 11,
    background: activeValue ? '#1e293b' : '#0a0e17',
    border: `1px solid ${activeValue ? '#3b82f6' : '#1e293b'}`,
    borderRadius: 4, color: '#e2e8f0', fontFamily: 'inherit',
  };
}
