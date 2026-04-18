import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Btn } from './ui.jsx';
import EmptyState from './EmptyState.jsx';

// IdeasHistoryPanel — аккумулированная лента «идея дня» из daily_briefs.
// Группирует по дате (+ сайту если portfolio view). Показывает 💰 impact если есть.
// Props:
//   siteId — если задан, показывает идеи только одного сайта; иначе смесь всех.
//
// Идея:
//   - «Идея дня» генерируется ежедневно Daily Brief agent'ом
//   - Часто оператор не успевает её реализовать в тот же день
//   - Раньше идеи терялись; теперь — сохраняются в daily_briefs.cards_json → видим историю
//   - Можно пересмотреть за неделю/месяц, вернуться к пропущенному
export default function IdeasHistoryPanel({ siteId, limit = 30 }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setErr(null);
    api.ideasHistory(siteId, limit)
      .then(r => { if (!cancelled) setIdeas(r.ideas || []); })
      .catch(e => { if (!cancelled) setErr(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [siteId, limit]);

  const toggle = (key) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  if (loading) return <div style={{ padding: 14, color: '#64748b', fontSize: 12 }}>Загружаю ленту идей…</div>;
  if (err) return <div style={{ padding: 14, color: '#ef4444', fontSize: 12 }}>Ошибка: {err}</div>;
  if (!ideas.length) {
    return (
      <EmptyState
        icon="💡"
        title="История идей пуста"
        description={`Idea-карточки Daily Brief накапливаются тут. Откройте Daily Brief и обновите — ${siteId ? 'появится' : 'появятся'} первая идея.`}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>💡 История идей</h3>
        <span style={{ fontSize: 10, color: '#64748b' }}>{ideas.length} запис{ideas.length === 1 ? 'ь' : 'ей'}</span>
      </div>

      {ideas.map((item, i) => {
        const key = `${item.siteId}_${item.date}_${i}`;
        const isExpanded = expanded.has(key);
        return (
          <div
            key={key}
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderLeft: '3px solid #fbbf24',
              borderRadius: 4,
              padding: '8px 10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--mn)' }}>{item.date}</span>
              {!siteId && (
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#1e293b', color: '#94a3b8', fontFamily: 'var(--mn)' }}>
                  {item.siteName}
                </span>
              )}
              <strong style={{ fontSize: 12, color: '#e2e8f0', flex: 1, minWidth: 0 }}>
                {item.idea.title}
              </strong>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>
              {item.idea.summary}
            </div>
            {item.idea.impact && (
              <div style={{ fontSize: 10, color: '#60a5fa', marginTop: 4, fontWeight: 600 }}>
                💰 {item.idea.impact}
              </div>
            )}
            {item.idea.details && (
              <button
                onClick={() => toggle(key)}
                style={{ fontSize: 10, background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0, marginTop: 4 }}
              >
                {isExpanded ? '▼ Скрыть' : '▶ Подробности'}
              </button>
            )}
            {isExpanded && item.idea.details && (
              <pre style={{ fontSize: 10, background: '#0a0e17', padding: 6, borderRadius: 3, marginTop: 4, overflow: 'auto', color: '#94a3b8', fontFamily: 'var(--mn)', maxHeight: 200 }}>
{JSON.stringify(item.idea.details, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
