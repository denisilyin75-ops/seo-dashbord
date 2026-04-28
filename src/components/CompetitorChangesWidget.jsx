import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

// CompetitorChangesWidget — лента «конкуренты обновили статью».
// Источник: re-fetch monitor пересчитывает content_hash imported_articles
// с заданным refetch_interval_days. Сюда падают unseen changes.
// Hide-when-empty: если 0 unseen — компонент не рендерит ничего.

export default function CompetitorChangesWidget() {
  const [data, setData] = useState(null);

  const load = () => {
    api.importedChangesUnseen(20)
      .then(r => setData(r))
      .catch(() => setData({ items: [], total_unseen: 0 }));
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 5 * 60_000);
    return () => clearInterval(iv);
  }, []);

  if (!data || !data.total_unseen) return null;

  const markSeen = async (id) => {
    setData(d => ({
      ...d,
      items: d.items.filter(x => x.id !== id),
      total_unseen: Math.max(0, d.total_unseen - 1),
    }));
    try { await api.markImportedChangeSeen(id); } catch {}
  };

  const markAllSeen = async () => {
    const ids = data.items.map(i => i.id);
    setData({ items: [], total_unseen: 0 });
    for (const id of ids) {
      try { await api.markImportedChangeSeen(id); } catch {}
    }
  };

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 7, padding: 12, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 12, color: '#e2e8f0' }}>🔄 Конкуренты обновили статью</strong>
        <span style={{ fontSize: 10, color: '#fbbf24' }}>{data.total_unseen} unseen</span>
        <button
          onClick={markAllSeen}
          style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: 10, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: 3, cursor: 'pointer' }}
        >
          ✓ Отметить все
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {data.items.map(it => <ChangeRow key={it.id} item={it} onSeen={() => markSeen(it.id)} />)}
      </div>
    </div>
  );
}

function ChangeRow({ item, onSeen }) {
  const wordDelta = (item.new_word_count || 0) - (item.old_word_count || 0);
  const deltaColor = wordDelta > 0 ? '#22c55e' : wordDelta < 0 ? '#ef4444' : '#64748b';
  const typeIcon = item.change_type === 'title' ? '✏️' : '📝';
  const detected = item.detected_at ? new Date(item.detected_at + 'Z').toLocaleString('ru-RU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '18px 1fr 70px 90px 22px',
      gap: 8, alignItems: 'center',
      padding: '4px 8px', background: '#0a0e17', borderRadius: 3,
      fontSize: 11,
    }}>
      <span style={{ fontSize: 11 }}>{typeIcon}</span>
      <a
        href={item.source_url}
        target="_blank"
        rel="noopener"
        style={{ color: '#e2e8f0', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={item.new_title || item.source_url}
      >
        <span style={{ color: '#64748b' }}>{item.source_domain}</span>{' '}
        {item.new_title || item.source_url}
      </a>
      <span style={{ color: deltaColor, fontFamily: 'var(--mn)', textAlign: 'right' }}>
        {wordDelta > 0 ? `+${wordDelta}` : wordDelta} слов
      </span>
      <span style={{ color: '#64748b', fontFamily: 'var(--mn)', fontSize: 10, textAlign: 'right' }}>
        {detected}
      </span>
      <button
        onClick={onSeen}
        title="Отметить просмотренным"
        style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12, padding: 0 }}
      >
        ✓
      </button>
    </div>
  );
}
