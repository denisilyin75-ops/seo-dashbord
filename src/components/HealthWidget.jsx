import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

// HealthWidget — dashboard-level индикатор "в каком состоянии asset".
// 2 колонки:
//   - Exit Readiness (из monthly scorecard): overall + top-3 weakest dims + кнопка run-now
//   - Portfolio Quality: avg score across sites + red/yellow counts
//
// Оба важны для экзита — покупатель смотрит на эти же метрики.

export default function HealthWidget() {
  const [exit, setExit] = useState(null);
  const [quality, setQuality] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.exitReadiness().catch(() => null), api.portfolioQuality().catch(() => null)])
      .then(([e, q]) => {
        if (cancelled) return;
        setExit(e);
        setQuality(q);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) return null;

  const exitLatest = exit?.latest;
  const qualitySites = quality?.sites || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 14 }}>
      {/* Exit Readiness card */}
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
        padding: 14, position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
            💎 Exit Readiness
          </span>
          {exitLatest && (
            <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--mn)' }}>{exitLatest.month}</span>
          )}
        </div>
        {!exitLatest ? (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Scorecard ещё не запускался (первый прогон 1-го числа месяца или вручную).
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor(exitLatest.overall), fontFamily: 'var(--mn)', lineHeight: 1 }}>
                {exitLatest.overall}
              </div>
              <div style={{ fontSize: 14, color: '#64748b', fontFamily: 'var(--mn)' }}>/100</div>
              {exitLatest.delta != null && (
                <span style={{
                  fontSize: 11,
                  color: exitLatest.delta >= 0 ? '#22c55e' : '#ef4444',
                  fontWeight: 600,
                }}>
                  {exitLatest.delta >= 0 ? '↑ +' : '↓ '}{exitLatest.delta}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 1.4 }}>
              {interpretation(exitLatest.overall)}
            </div>
            {exitLatest.metrics && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {weakestMetrics(exitLatest.metrics, 3).map(([k, m]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b' }}>
                    <span>{k.replace(/_/g, ' ')}</span>
                    <strong style={{ color: scoreColor(m.score), fontFamily: 'var(--mn)' }}>{m.score}</strong>
                  </div>
                ))}
              </div>
            )}
            <a
              href="https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/exit-readiness.md"
              target="_blank" rel="noreferrer"
              style={{ fontSize: 10, color: '#60a5fa', display: 'block', marginTop: 8, textDecoration: 'none' }}
            >
              Full report →
            </a>
          </>
        )}
      </div>

      {/* Portfolio Quality card */}
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
        padding: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
            🩺 Content Quality (30d avg)
          </span>
        </div>
        {!qualitySites.length ? (
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Не было прогонов Content Quality. Откройте сайт → Quality → Analyze 10 posts.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              {quality.portfolio_avg != null && (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(quality.portfolio_avg), fontFamily: 'var(--mn)', lineHeight: 1 }}>
                    {quality.portfolio_avg}
                  </div>
                  <div style={{ fontSize: 9, color: '#64748b' }}>portfolio avg</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <Badge color="#ef4444" label="🔴" value={quality.total_red} />
                <Badge color="#f59e0b" label="🟡" value={quality.total_yellow} />
              </div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {qualitySites.slice(0, 4).map(s => (
                <Link
                  key={s.site_id}
                  to={`/sites/${s.site_id}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '3px 6px', borderRadius: 3, background: '#1e293b30',
                    textDecoration: 'none', color: 'inherit', fontSize: 11,
                  }}
                >
                  <span style={{ color: '#e2e8f0' }}>{s.name}</span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {s.avg_overall != null && (
                      <strong style={{ color: scoreColor(s.avg_overall), fontFamily: 'var(--mn)', fontSize: 12 }}>{s.avg_overall}</strong>
                    )}
                    {s.red > 0 && <span style={{ fontSize: 10, color: '#ef4444' }}>🔴{s.red}</span>}
                    {s.yellow > 0 && <span style={{ fontSize: 10, color: '#f59e0b' }}>🟡{s.yellow}</span>}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function scoreColor(n) {
  if (n == null) return '#64748b';
  if (n >= 85) return '#22c55e';
  if (n >= 70) return '#fbbf24';
  if (n >= 50) return '#f97316';
  return '#ef4444';
}

function interpretation(n) {
  if (n == null) return '';
  if (n < 50) return '🔴 Not ready. Major gaps';
  if (n < 75) return '🟡 Pre-sale stage';
  if (n < 90) return '🟢 Ready for listing';
  return '⭐ Premium-tier ready';
}

function weakestMetrics(metrics, count) {
  return Object.entries(metrics).sort((a, b) => a[1].score - b[1].score).slice(0, count);
}

function Badge({ color, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: 10 }}>{label}</span>
      <strong style={{ fontSize: 13, color, fontFamily: 'var(--mn)' }}>{value}</strong>
    </div>
  );
}
