import { useState, useEffect, useCallback, useMemo } from 'react';
import ArticleRow from './ArticleRow.jsx';
import EmptyState from './EmptyState.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { Btn, Inp, Sel } from './ui.jsx';
import { api } from '../api/client.js';

// ArticlesPanel — расширенная версия Articles tab с search/filter/bulk.
// Работает в 2 режимах:
//   - Нет активных filters + нет selected → простой список (как было раньше)
//   - Есть search/filter → paginated API, facets в sidebar
//
// Props:
//   siteId — string, обязателен
//   onAdd  — callback для "+ Статья" (открывает modal addArticle)
//   onImport — callback для "Import from WP" (если доступно)
//   canImportWp — boolean
//   onUpdate, onDelete — callbacks для ArticleRow

const SORT_OPTIONS = [
  { v: 'modified_desc', l: 'Недавно изменены' },
  { v: 'modified_asc',  l: 'Давно не изменялись' },
  { v: 'created_desc',  l: 'Новые первые' },
  { v: 'title_asc',     l: 'Название А-Я' },
  { v: 'sessions_desc', l: 'По сессиям' },
  { v: 'clicks_desc',   l: 'По кликам' },
  { v: 'word_count_desc', l: 'По объёму' },
];

const PAGE_SIZES = [20, 50, 100, 200];

export default function ArticlesPanel({ siteId, articles: fallbackArticles, onAdd, onImport, canImportWp, onUpdate, onDelete }) {
  // Filter state
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [tagsInput, setTagsInput] = useState(''); // comma-separated
  const [sort, setSort] = useState('modified_desc');
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Data state
  const [items, setItems] = useState(null);  // null = not loaded yet (use fallback)
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState({ byType: [], byStatus: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Selection state (id → true)
  const [selected, setSelected] = useState(() => new Set());
  const [confirm, setConfirm] = useState(null); // {message, onOk}

  // Отслеживаем есть ли активные фильтры. Если нет и ничего не выбрано —
  // показываем fallback (non-paginated список). Это backward-compat + faster.
  const hasActiveFilters = Boolean(q || type || status || tagsInput.trim() || sort !== 'modified_desc' || offset > 0);

  const tags = useMemo(
    () => tagsInput.split(',').map(t => t.trim()).filter(Boolean),
    [tagsInput]
  );

  const load = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setErr(null);
    try {
      const filters = { q, type, status, tags, sort, limit, offset };
      // Принудительная пагинация даже без фильтров — для paged view.
      const res = await api.searchArticles(siteId, filters);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setFacets(res.facets || { byType: [], byStatus: [] });
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [siteId, q, type, status, tags.join('|'), sort, limit, offset]);

  // Debounced search по q; остальные filters — immediate.
  useEffect(() => {
    if (!hasActiveFilters && items === null) return; // ещё не нужно загружать — fallback используется
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, hasActiveFilters, q]);

  // Если включили поиск/фильтр первый раз — загрузить сразу.
  useEffect(() => {
    if (hasActiveFilters && items === null) load();
  }, [hasActiveFilters, items, load]);

  // При ручных update/delete/refresh — если мы в paged mode, перезагружаем.
  const reload = () => { if (hasActiveFilters || items !== null) load(); };

  // Reset selection при смене фильтров
  useEffect(() => { setSelected(new Set()); }, [q, type, status, tagsInput]);

  const clearFilters = () => {
    setQ(''); setType(''); setStatus(''); setTagsInput('');
    setSort('modified_desc'); setOffset(0);
    setItems(null);
    setSelected(new Set());
  };

  // Данные для рендера: либо paged items, либо fallback.
  const renderList = hasActiveFilters || items !== null ? items || [] : (fallbackArticles || []);
  const renderTotal = hasActiveFilters || items !== null ? total : (fallbackArticles?.length || 0);

  // Selection helpers
  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(prev => {
    if (prev.size === renderList.length) return new Set();
    return new Set(renderList.map(a => a.id));
  });
  const clearSel = () => setSelected(new Set());

  const bulkArchive = () => {
    const ids = [...selected];
    setConfirm({
      message: `Архивировать ${ids.length} статей? Можно восстановить (status→draft) позже.`,
      onOk: async () => {
        await api.bulkArticles(ids, 'archive');
        clearSel();
        reload();
      },
    });
  };
  const bulkTagAdd = () => {
    const input = prompt('Теги через запятую (будут добавлены к выделенным):');
    const tagsToAdd = (input || '').split(',').map(t => t.trim()).filter(Boolean);
    if (!tagsToAdd.length) return;
    api.bulkArticles([...selected], 'tag_add', { tags: tagsToAdd }).then(() => { clearSel(); reload(); });
  };
  const bulkStatus = (newStatus) => {
    api.bulkArticles([...selected], 'status', { status: newStatus }).then(() => { clearSel(); reload(); });
  };

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(renderTotal / limit));

  return (
    <div>
      {/* Header + search + actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setOffset(0); }}
            placeholder="🔍 Поиск по статьям..."
            style={{
              width: '100%', padding: '6px 28px 6px 10px', fontSize: 12,
              background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4,
              color: '#e2e8f0', fontFamily: 'inherit',
            }}
          />
          {q && (
            <button
              onClick={() => { setQ(''); setOffset(0); }}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}
            >✕</button>
          )}
        </div>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--mn)' }}>
          {loading ? '…' : `${renderTotal} статей`}
          {hasActiveFilters && ` (фильтр)`}
        </span>
        {hasActiveFilters && (
          <Btn onClick={clearFilters} v="ghost" sx={{ fontSize: 10 }}>Сбросить</Btn>
        )}
        <div style={{ flex: '0 0 auto', marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn onClick={onAdd} v="acc" sx={{ fontSize: 10 }}>＋ Статья</Btn>
          {canImportWp && <Btn onClick={onImport} sx={{ fontSize: 10 }}>↻ Import WP</Btn>}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <FilterSel value={type} onChange={v => { setType(v); setOffset(0); }} opts={facets.byType} label="Все типы" />
        <FilterSel value={status} onChange={v => { setStatus(v); setOffset(0); }} opts={facets.byStatus} label="Все статусы" />
        <input
          value={tagsInput}
          onChange={e => { setTagsInput(e.target.value); setOffset(0); }}
          placeholder="Теги: кофе, флагман"
          style={{ padding: '5px 8px', fontSize: 11, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, color: '#e2e8f0', width: 180, fontFamily: 'inherit' }}
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{ padding: '5px 8px', fontSize: 11, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, color: '#e2e8f0', fontFamily: 'inherit' }}
        >
          {SORT_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setOffset(0); }}
          style={{ padding: '5px 8px', fontSize: 11, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, color: '#e2e8f0', fontFamily: 'inherit' }}
        >
          {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / стр</option>)}
        </select>
      </div>

      {/* Bulk toolbar */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          padding: '6px 10px', background: '#1e293b', borderRadius: 4,
          border: '1px solid #334155',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#60a5fa' }}>{selected.size} выбрано</span>
          <Btn onClick={() => bulkStatus('draft')} sx={{ fontSize: 10 }}>→ Draft</Btn>
          <Btn onClick={() => bulkStatus('published')} sx={{ fontSize: 10 }}>→ Published</Btn>
          <Btn onClick={bulkTagAdd} sx={{ fontSize: 10 }}>+ Теги</Btn>
          <Btn onClick={bulkArchive} sx={{ fontSize: 10, color: '#f97316' }}>Архивировать</Btn>
          <Btn onClick={clearSel} v="ghost" sx={{ fontSize: 10, marginLeft: 'auto' }}>Отменить</Btn>
        </div>
      )}

      {/* Error */}
      {err && (
        <div style={{ padding: 8, background: '#991b1b20', border: '1px solid #ef4444', borderRadius: 4, color: '#fca5a5', fontSize: 11, marginBottom: 8 }}>
          Ошибка: {err}
        </div>
      )}

      {/* List */}
      {renderList.length > 0 ? (
        <>
          {/* Select-all bar (появляется только при paged mode или когда статей >5) */}
          {(hasActiveFilters || renderList.length > 5) && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
              fontSize: 11, color: '#64748b', cursor: 'pointer',
              marginBottom: 4,
            }}>
              <input
                type="checkbox"
                checked={selected.size === renderList.length && renderList.length > 0}
                ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < renderList.length; }}
                onChange={toggleAll}
                style={{ cursor: 'pointer' }}
              />
              {selected.size === renderList.length ? 'Снять выделение' : `Выделить все на странице (${renderList.length})`}
            </label>
          )}

          {renderList.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <input
                type="checkbox"
                checked={selected.has(a.id)}
                onChange={() => toggle(a.id)}
                style={{ marginTop: 12, cursor: 'pointer', flex: '0 0 auto' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <ArticleRow
                  article={a}
                  onUpdate={async (...args) => { await onUpdate(...args); reload(); }}
                  onDelete={async (...args) => { await onDelete(...args); reload(); }}
                />
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 12, alignItems: 'center', fontSize: 11 }}>
              <Btn
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                v="ghost"
                sx={{ fontSize: 10 }}
              >← Пред</Btn>
              <span style={{ color: '#64748b', fontFamily: 'var(--mn)', padding: '0 8px' }}>
                Стр. {page} / {totalPages}
              </span>
              <Btn
                onClick={() => setOffset(offset + limit)}
                disabled={page >= totalPages}
                v="ghost"
                sx={{ fontSize: 10 }}
              >След →</Btn>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={hasActiveFilters ? '🔍' : '📄'}
          title={hasActiveFilters ? 'Ничего не найдено' : 'Нет статей'}
          description={hasActiveFilters ? 'Попробуйте изменить фильтры или поисковый запрос.' : 'Добавьте вручную или импортируйте из WordPress.'}
          actions={
            hasActiveFilters ? <Btn onClick={clearFilters}>Сбросить фильтры</Btn> :
            <>
              <Btn v="acc" onClick={onAdd}>＋ Первая статья</Btn>
              {canImportWp && <Btn onClick={onImport}>↻ Import from WP</Btn>}
            </>
          }
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={async () => {
            await confirm.onOk();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function FilterSel({ value, onChange, opts, label }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '5px 8px', fontSize: 11,
        background: value ? '#1e293b' : '#0a0e17',
        border: `1px solid ${value ? '#3b82f6' : '#1e293b'}`,
        borderRadius: 4, color: '#e2e8f0', fontFamily: 'inherit',
      }}
    >
      <option value="">{label}</option>
      {(opts || []).filter(o => o.k).map(o => (
        <option key={o.k} value={o.k}>{o.k} ({o.n})</option>
      ))}
    </select>
  );
}
