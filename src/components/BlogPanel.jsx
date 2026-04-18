import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { Btn, Inp } from './ui.jsx';
import Markdown from './Markdown.jsx';
import { useTryToast } from './Toast.jsx';
import { useConfirm } from './ConfirmDialog.jsx';
import { Skeleton } from './Skeleton.jsx';

/**
 * Блог «что сделано» — мотивационная лента в Dashboard.
 *
 * Назначение: человеко-читаемая память прогресса. Открываешь Dashboard,
 * видишь ленту «вчера: X, сегодня утром: Y, только что: Z» — и чувствуешь движение,
 * даже когда ежедневные метрики не меняются.
 */

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(+d)) return iso;
  const now = new Date();
  const diff = (now - d) / (1000 * 60);
  if (diff < 60) return `${Math.max(1, Math.round(diff))} мин назад`;
  if (diff < 60 * 24) return `${Math.round(diff / 60)} ч назад`;
  if (diff < 60 * 24 * 7) return `${Math.round(diff / (60 * 24))} дн назад`;
  return d.toISOString().slice(0, 10);
}

export default function BlogPanel() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', body: '', tags: '' });
  const tryToast = useTryToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const r = await api.listBlog({ limit: 50 });
      setItems(r.items);
      setErr(null);
    } catch (e) { setErr(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setDraft({ title: '', body: '', tags: '' });
    setAdding(true);
  };
  const openEdit = (p) => {
    setEditingId(p.id);
    setDraft({ title: p.title, body: p.body || '', tags: (p.tags || []).join(', '), pinned: p.pinned });
    setAdding(true);
  };
  const cancel = () => { setAdding(false); setEditingId(null); setDraft({ title: '', body: '', tags: '' }); };

  const save = () => {
    if (!draft.title.trim()) return;
    const body = {
      title: draft.title.trim(),
      body: draft.body,
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      pinned: !!draft.pinned,
    };
    const action = editingId
      ? () => api.updateBlog(editingId, body)
      : () => api.createBlog(body);
    tryToast(async () => { await action(); await load(); cancel(); }, {
      success: editingId ? '📝 Запись обновлена' : '📝 Новая запись',
    });
  };

  const del = async (p) => {
    const ok = await confirm({ message: `Удалить запись «${p.title}»?`, okLabel: 'Удалить', danger: true });
    if (!ok) return;
    tryToast(async () => { await api.deleteBlog(p.id); await load(); }, { success: 'Удалено' });
  };

  const togglePin = (p) => tryToast(
    async () => { await api.updateBlog(p.id, { pinned: !p.pinned }); await load(); },
    { success: p.pinned ? 'Открепили' : 'Закрепили' },
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: '#e2e8f0' }}>📝 Блог — что сделано</h2>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            {items ? `${items.length} ${items.length === 1 ? 'запись' : 'записей'}` : ''}
          </span>
        </div>
        {!adding && <Btn v="acc" onClick={openAdd} sx={{ fontSize: 11 }}>➕ Новая запись</Btn>}
      </div>

      {adding && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Inp
            value={draft.title}
            onChange={(v) => setDraft({ ...draft, title: v })}
            placeholder="Заголовок (обязательно)"
          />
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Тело (markdown) — что сделано, почему, что дальше"
            rows={6}
            style={{
              width: '100%', padding: '8px 10px',
              background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4,
              color: '#e2e8f0', fontFamily: 'var(--mn)', fontSize: 12, resize: 'vertical',
            }}
          />
          <Inp
            value={draft.tags}
            onChange={(v) => setDraft({ ...draft, tags: v })}
            placeholder="Теги через запятую (scc, popolkam, gamification, ...)"
          />
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: '#94a3b8' }}>
            <input
              type="checkbox"
              checked={!!draft.pinned}
              onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
              style={{ accentColor: '#3b82f6' }}
            />
            📌 Закрепить сверху
          </label>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Btn onClick={cancel}>Отмена</Btn>
            <Btn v="acc" onClick={save}>💾 {editingId ? 'Сохранить' : 'Опубликовать'}</Btn>
          </div>
        </div>
      )}

      {items === null && !err && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0,1,2].map((i) => <Skeleton key={i} w="100%" h={60} />)}
        </div>
      )}

      {err && <div style={{ fontSize: 12, color: '#ef4444' }}>⚠️ {err}</div>}

      {items?.length === 0 && (
        <div style={{ fontSize: 12, color: '#64748b', padding: 14, textAlign: 'center' }}>
          Пока нет записей. Опубликуй первую — выше кнопка «➕ Новая запись».
        </div>
      )}

      {items?.map((p) => (
        <article key={p.id} style={{
          background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: '10px 12px',
          borderLeft: p.pinned ? '3px solid #fbbf24' : '3px solid transparent',
        }}>
          <header style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0, color: '#e2e8f0', flex: 1, minWidth: 0 }}>
              {p.pinned && <span style={{ color: '#fbbf24', marginRight: 5 }}>📌</span>}
              {p.title}
            </h3>
            <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--mn)' }}>
              {fmtDate(p.createdAt)}
            </span>
            <div style={{ display: 'flex', gap: 2 }}>
              <button type="button" onClick={() => togglePin(p)} title={p.pinned ? 'Открепить' : 'Закрепить'}
                style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 11 }}>
                {p.pinned ? '📌' : '📍'}
              </button>
              <button type="button" onClick={() => openEdit(p)} title="Редактировать"
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>
                ✏️
              </button>
              <button type="button" onClick={() => del(p)} title="Удалить"
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11 }}>
                🗑
              </button>
            </div>
          </header>
          {p.body && (
            <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 }}>
              <Markdown>{p.body}</Markdown>
            </div>
          )}
          {p.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {p.tags.map((t) => (
                <span key={t} style={{
                  fontSize: 9, fontFamily: 'var(--mn)', padding: '1px 6px', borderRadius: 3,
                  background: '#1e293b', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px',
                }}>#{t}</span>
              ))}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
