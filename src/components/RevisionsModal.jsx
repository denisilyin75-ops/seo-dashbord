import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Modal, Btn } from './ui.jsx';

const KIND_META = {
  manual_edit:     { icon: '✏️', label: 'Ручная правка', color: '#94a3b8' },
  wp_sync_pull:    { icon: '📥', label: 'WP Sync (Pull)', color: '#60a5fa' },
  wp_sync_push:    { icon: '📤', label: 'WP Sync (Push)', color: '#60a5fa' },
  ai_refresh:      { icon: '✨', label: 'AI Refresh', color: '#a78bfa' },
  ai_price_update: { icon: '💰', label: 'AI Price Update', color: '#fbbf24' },
  ai_brief:        { icon: '📝', label: 'AI Бриф', color: '#a78bfa' },
  auto_seo:        { icon: '🔍', label: 'Auto SEO', color: '#34d399' },
  import:          { icon: '🆕', label: 'Импорт', color: '#64748b' },
  offer_replaced:  { icon: '🔗', label: 'Замена оффера', color: '#f97316' },
  system_note:     { icon: '💡', label: 'Система', color: '#64748b' },
};

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)       return 'только что';
  if (diff < 3600)     return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400*30) return `${Math.floor(diff / 86400)} дн назад`;
  if (diff < 86400*365)return `${Math.floor(diff / 86400 / 30)} мес назад`;
  return `${Math.floor(diff / 86400 / 365)} г назад`;
}

export default function RevisionsModal({ article, onClose }) {
  const [revs, setRevs] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.articleRevisions(article.id, 50);
        if (!cancelled) setRevs(r);
      } catch (e) { if (!cancelled) setErr(e.message); }
    })();
    return () => { cancelled = true; };
  }, [article.id]);

  return (
    <Modal title={`История: "${article.title.slice(0, 60)}"`} onClose={onClose}>
      <div style={{ minWidth: 500, maxWidth: 700 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
          URL: <code style={{ color: '#94a3b8' }}>{article.url}</code>
          {article.updated && <> · Обновлено {formatWhen(article.updated)}</>}
        </div>

        {err && <div style={{ color: '#ef4444', fontSize: 12 }}>Ошибка: {err}</div>}
        {revs === null && !err && <div style={{ fontSize: 12, color: '#64748b' }}>Загружаю историю...</div>}
        {revs && revs.length === 0 && (
          <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: 12, background: '#0f172a', borderRadius: 6 }}>
            Записей пока нет. История будет накапливаться при каждом изменении статьи
            (правка, sync с WP, AI-refresh, автообновления цен).
          </div>
        )}

        {revs && revs.length > 0 && (
          <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
            {revs.map((r, i) => {
              const meta = KIND_META[r.kind] || { icon: '●', label: r.kind, color: '#64748b' };
              return (
                <div key={r.id} style={{ display: 'flex', gap: 12, paddingBottom: 14, borderLeft: `2px solid ${meta.color}40`, marginLeft: 6, paddingLeft: 14, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -7, top: 2, width: 12, height: 12, borderRadius: '50%', background: meta.color, border: '2px solid #0a0e17' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginBottom: 3 }}>
                      <span style={{ color: meta.color, fontWeight: 700 }}>{meta.icon} {meta.label}</span>
                      <span>·</span>
                      <span>{formatWhen(r.createdAt)}</span>
                      {r.actor && r.actor !== 'system' && <><span>·</span><span>{r.actor}</span></>}
                    </div>
                    <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 }}>
                      {r.summary}
                    </div>
                    {r.detail && Object.keys(r.detail).length > 0 && (
                      <details style={{ marginTop: 3 }}>
                        <summary style={{ fontSize: 10, color: '#475569', cursor: 'pointer' }}>детали</summary>
                        <pre style={{ fontSize: 10, color: '#94a3b8', background: '#0a0e17', padding: 6, borderRadius: 4, overflow: 'auto', marginTop: 4 }}>
                          {JSON.stringify(r.detail, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Btn onClick={onClose}>Закрыть</Btn>
        </div>
      </div>
    </Modal>
  );
}

// helper: вычисление возраста статьи для цветового индикатора
export function freshnessLevel(updatedIso) {
  if (!updatedIso) return { color: '#64748b', label: '—' };
  const d = new Date(updatedIso + (updatedIso.endsWith('Z') ? '' : 'Z'));
  const days = (Date.now() - d.getTime()) / 86400000;
  if (days < 30)  return { color: '#34d399', label: formatWhen(updatedIso), days };
  if (days < 180) return { color: '#fbbf24', label: formatWhen(updatedIso), days };
  if (days < 365) return { color: '#f97316', label: formatWhen(updatedIso), days };
  return { color: '#ef4444', label: formatWhen(updatedIso), days };
}
