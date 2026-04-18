import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Btn, Inp, Sel } from '../components/ui.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';

// ImportsPage — Phase 2 MVP.
// Слева — форма импорта (URL + purpose + tags).
// Справа — список impotred articles с фильтрами (search, purpose, domain).
// Клик на строке — переход на detail.

const PURPOSES = [
  { v: 'research',             l: '🔍 Research' },
  { v: 'competitor_research',  l: '⚔️ Competitor research' },
  { v: 'source_material',      l: '📚 Source material' },
  { v: 'migration',            l: '📦 Migration (old sites)' },
  { v: 'inspiration',          l: '💡 Inspiration' },
];

export default function ImportsPage() {
  const [form, setForm] = useState({ url: '', purpose: 'research', user_tags: '' });
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState(null);
  const [err, setErr] = useState(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState('');
  const [fPurpose, setFPurpose] = useState('');
  const [selected, setSelected] = useState(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await api.listImported({ q, purpose: fPurpose, limit: 50 });
      setItems(r.items || []);
      setTotal(r.total || 0);
    } catch (e) { setErr(e.message); }
    finally { setListLoading(false); }
  }, [q, fPurpose]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.url.trim()) return;
    setImporting(true); setErr(null); setLastImport(null);
    try {
      const tags = form.user_tags.split(',').map(s => s.trim()).filter(Boolean);
      const r = await api.importUrl({
        url: form.url.trim(),
        purpose: form.purpose,
        user_tags: tags,
      });
      setLastImport(r);
      setForm(f => ({ ...f, url: '', user_tags: '' }));
      load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setImporting(false);
    }
  };

  const archiveOne = async (id, title) => {
    const ok = await confirm({
      title: 'Архивировать импорт',
      message: `"${title.slice(0, 80)}" будет помечен как archived. Можно восстановить руками в БД.`,
      okLabel: 'Архивировать',
    });
    if (!ok) return;
    await api.archiveImported(id);
    if (selected?.article?.id === id) setSelected(null);
    load();
  };

  const openDetail = async (id) => {
    setErr(null);
    try {
      const r = await api.getImported(id);
      setSelected(r);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        <Link to="/" style={{ fontSize: 11, color: '#64748b', textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>📥 Import & Research</h1>
        <span style={{ fontSize: 11, color: '#64748b' }}>{total} imported</span>
      </div>

      {/* Legal framing */}
      <div style={{ padding: 10, background: '#7f1d1d20', border: '1px solid #7f1d1d', borderRadius: 5, fontSize: 11, color: '#fca5a5', lineHeight: 1.5 }}>
        📎 Imported articles — research material. Publishing as-is = copyright violation. Используйте transforms (translate / rewrite / brief) или обогащайте своим контентом.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 14 }}>
        {/* LEFT: Import form */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: 14 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700 }}>Import from URL</h3>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Inp
              value={form.url}
              onChange={v => setForm(f => ({ ...f, url: v }))}
              placeholder="https://wirecutter.nytimes.com/reviews/..."
            />
            <Sel
              value={form.purpose}
              onChange={v => setForm(f => ({ ...f, purpose: v }))}
              opts={PURPOSES}
            />
            <Inp
              value={form.user_tags}
              onChange={v => setForm(f => ({ ...f, user_tags: v }))}
              placeholder="Tags через запятую"
            />
            <Btn type="submit" v="acc" disabled={importing || !form.url.trim()}>
              {importing ? 'Импорт…' : '📥 Import'}
            </Btn>
          </form>

          {lastImport && (
            <div style={{ marginTop: 10, padding: 8, background: '#14532d30', border: '1px solid #22c55e', borderRadius: 4, fontSize: 11 }}>
              ✓ <strong>{lastImport.article.title.slice(0, 60)}</strong>
              <div style={{ color: '#94a3b8', marginTop: 3 }}>
                {lastImport.article.wordCount} слов · {lastImport.article.language} · confidence {Math.round(lastImport.article.extractionConfidence * 100)}%
              </div>
              {lastImport.article.extractionWarnings?.length > 0 && (
                <div style={{ color: '#fbbf24', marginTop: 3 }}>
                  ⚠️ {lastImport.article.extractionWarnings.join(', ')}
                </div>
              )}
            </div>
          )}
          {err && (
            <div style={{ marginTop: 10, padding: 8, background: '#7f1d1d30', border: '1px solid #ef4444', borderRadius: 4, fontSize: 11, color: '#fca5a5' }}>
              Ошибка: {err}
            </div>
          )}
        </div>

        {/* RIGHT: List or Detail */}
        <div>
          {selected ? (
            <ImportDetail
              data={selected}
              onBack={() => setSelected(null)}
              onArchive={() => archiveOne(selected.article.id, selected.article.title)}
            />
          ) : (
            <ImportsList
              items={items}
              total={total}
              loading={listLoading}
              q={q} setQ={setQ}
              fPurpose={fPurpose} setFPurpose={setFPurpose}
              onOpen={openDetail}
              onArchive={archiveOne}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ImportsList({ items, total, loading, q, setQ, fPurpose, setFPurpose, onOpen, onArchive }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="🔍 Поиск по title/URL..."
          style={{ flex: 1, padding: '5px 10px', fontSize: 12, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, color: '#e2e8f0', fontFamily: 'inherit' }}
        />
        <select
          value={fPurpose}
          onChange={e => setFPurpose(e.target.value)}
          style={{ padding: '5px 8px', fontSize: 11, background: fPurpose ? '#1e293b' : '#0a0e17', border: `1px solid ${fPurpose ? '#3b82f6' : '#1e293b'}`, borderRadius: 4, color: '#e2e8f0', fontFamily: 'inherit' }}
        >
          <option value="">Все purpose</option>
          {PURPOSES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
        </select>
      </div>

      {loading && !items.length ? (
        <div style={{ padding: 14, color: '#64748b', fontSize: 12 }}>Загрузка…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="📥"
          title={q ? 'Не найдено' : 'Пока нет импортов'}
          description={q ? 'Попробуйте другой запрос' : 'Вставьте URL слева и нажмите Import — появится здесь.'}
        />
      ) : (
        <div>
          {items.map(a => (
            <div
              key={a.id}
              onClick={() => onOpen(a.id)}
              style={{
                background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4,
                padding: '8px 10px', marginBottom: 4, cursor: 'pointer',
                transition: 'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#334155'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1e293b'}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 12, color: '#e2e8f0', flex: 1, minWidth: 0 }}>{a.title}</strong>
                <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--mn)' }}>{a.sourceDomain}</span>
                <span style={{ fontSize: 10, color: '#475569' }}>{a.wordCount} слов</span>
                <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: '#1e293b', color: '#94a3b8', fontFamily: 'var(--mn)' }}>
                  {a.language || '?'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onArchive(a.id, a.title); }}
                  style={{ fontSize: 10, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >✕</button>
              </div>
              {a.autoTags?.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {a.autoTags.slice(0, 5).map(t => (
                    <span key={t} style={{ fontSize: 9, padding: '0 4px', borderRadius: 2, background: '#1e293b40', color: '#94a3b8', fontFamily: 'var(--mn)' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportDetail({ data, onBack, onArchive }) {
  const a = data.article;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Btn onClick={onBack} v="ghost">← Список</Btn>
        <Btn onClick={onArchive} sx={{ color: '#ef4444', marginLeft: 'auto' }}>Архивировать</Btn>
      </div>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, padding: 14 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{a.title}</h2>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
          {a.sourceDomain} · {a.language} · {a.wordCount} слов · ~{a.readingTimeMin} мин чтения
          {a.author && <> · {a.author}</>}
          {a.publishedAt && <> · {String(a.publishedAt).slice(0, 10)}</>}
        </div>
        <a href={a.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#60a5fa', wordBreak: 'break-all' }}>
          {a.sourceUrl}
        </a>

        {a.extractionWarnings?.length > 0 && (
          <div style={{ marginTop: 10, padding: 8, background: '#78350f30', border: '1px solid #f59e0b', borderRadius: 4, fontSize: 11, color: '#fbbf24' }}>
            ⚠️ Warnings: {a.extractionWarnings.join(', ')}
          </div>
        )}

        {a.excerpt && (
          <div style={{ marginTop: 10, padding: 10, background: '#0a0e17', borderRadius: 4, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, fontStyle: 'italic' }}>
            {a.excerpt}
          </div>
        )}

        {/* Tags */}
        {(a.autoTags?.length > 0 || a.userTags?.length > 0) && (
          <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {a.autoTags.map(t => (
              <span key={'a-' + t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#1e293b', color: '#94a3b8', fontFamily: 'var(--mn)' }}>auto: {t}</span>
            ))}
            {a.userTags.map(t => (
              <span key={'u-' + t} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: '#3b82f620', color: '#60a5fa', fontFamily: 'var(--mn)' }}>{t}</span>
            ))}
          </div>
        )}

        {/* Content preview */}
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            📝 Content preview ({a.wordCount} слов)
          </summary>
          <div
            style={{ marginTop: 8, padding: 12, background: '#0a0e17', borderRadius: 4, fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, maxHeight: 600, overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: a.contentHtml || '<p style="color:#475569">Контент не извлечён</p>' }}
          />
        </details>

        {/* Images */}
        {data.images?.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
              🖼 Images ({data.images.length})
            </summary>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.images.map(img => (
                <a key={img.id} href={img.original_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#60a5fa', wordBreak: 'break-all', padding: 4, background: '#0a0e17', borderRadius: 3 }}>
                  {img.original_url}
                </a>
              ))}
            </div>
          </details>
        )}

        {/* Actions placeholder (Phase 3) */}
        <div style={{ marginTop: 14, padding: 10, background: '#1e293b40', border: '1px dashed #334155', borderRadius: 4, fontSize: 11, color: '#64748b' }}>
          🚧 Actions (translate / rewrite / PDF / structural analysis / facts) — Phase 3.
          MVP Phase 2 только import + view + archive.
        </div>
      </div>
    </div>
  );
}
