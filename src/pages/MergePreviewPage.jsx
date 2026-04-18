import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Btn } from '../components/ui.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';

// MergePreviewPage — review AI-предложения объединения 2+ статей.
// Оператор видит:
//   - Proposed title / URL / excerpt
//   - Dedup stats (сколько parapraphs merged / removed / unique)
//   - Conflicts с recommendations (пока без explicit override в MVP — LLM recommendation применяется)
//   - Redirects plan (301 from old to new)
//   - Merged content preview (HTML)
//   - Actions: Approve / Reject

export default function MergePreviewPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const confirm = useConfirm();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await api.getMergePreview(id);
        if (cancelled) return;
        setPreview(r);
        setEditTitle(r.proposedTitle || '');
        setEditUrl(r.proposedUrlSlug || '');
        if (r.status === 'generating') {
          setTimeout(poll, 2000);
        }
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [id]);

  const approve = async () => {
    const ok = await confirm({
      title: 'Approve merge',
      message: `Создастся новая статья "${editTitle.slice(0, 60)}". ${preview.sourceArticleIds.length} source-статей перейдут в archived.`,
      okLabel: 'Approve & Commit',
    });
    if (!ok) return;
    setCommitting(true);
    try {
      const r = await api.approveMerge(id, { title: editTitle, url_slug: editUrl });
      alert(`Merge committed: new article ${r.article_id}\nRedirects to apply: ${r.redirects_to_apply.length}`);
      nav('/');
    } catch (e) {
      setErr(e.message);
    } finally {
      setCommitting(false);
    }
  };

  const reject = async () => {
    const reason = prompt('Причина отклонения merge (для аудита):');
    if (reason == null) return;
    try {
      await api.rejectMerge(id, reason);
      nav('/');
    } catch (e) { setErr(e.message); }
  };

  if (loading) return <div style={{ padding: 20, color: '#64748b' }}>Загрузка…</div>;
  if (err) return <div style={{ padding: 20, color: '#ef4444' }}>Ошибка: {err}</div>;
  if (!preview) return <div style={{ padding: 20 }}>Not found</div>;

  if (preview.status === 'generating') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 16, color: '#60a5fa', marginBottom: 10 }}>⏳ AI строит merge…</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Sonnet анализирует {preview.sourceArticleIds.length} источников (10-30 сек)</div>
      </div>
    );
  }

  if (preview.status === 'failed') {
    return (
      <div style={{ padding: 20 }}>
        <Link to="/" style={{ fontSize: 11, color: '#64748b' }}>← Dashboard</Link>
        <h1 style={{ fontSize: 20, margin: '10px 0' }}>❌ Merge failed</h1>
        <div style={{ padding: 10, background: '#7f1d1d30', border: '1px solid #ef4444', borderRadius: 4, color: '#fca5a5' }}>
          {preview.error || 'Unknown error'}
        </div>
      </div>
    );
  }

  const isDecided = preview.status === 'approved' || preview.status === 'rejected';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <Link to="/" style={{ fontSize: 11, color: '#64748b', textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🔀 Merge Preview</h1>
        <Pill color={preview.status === 'approved' ? '#22c55e' : preview.status === 'rejected' ? '#ef4444' : '#fbbf24'}>
          {preview.status}
        </Pill>
        <span style={{ fontSize: 11, color: '#64748b' }}>{preview.llmModel} · {preview.llmTokensUsed}t · ${preview.llmCostUsd?.toFixed(4)}</span>
      </div>

      {/* Source articles */}
      <Panel title={`Объединяемые статьи (${preview.sourceArticleIds.length})`}>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          {preview.sourceArticleIds.map(sid => (
            <span key={sid} style={{ fontFamily: 'var(--mn)', marginRight: 6 }}>{sid}</span>
          ))}
        </div>
      </Panel>

      {/* Dedup stats */}
      {preview.dedupStats && Object.keys(preview.dedupStats).length > 0 && (
        <Panel title="📊 Dedup stats">
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            {Object.entries(preview.dedupStats).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#64748b' }}>{k}:</span> <strong style={{ color: '#e2e8f0', fontFamily: 'var(--mn)' }}>{v}</strong>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Conflicts */}
      {preview.conflicts?.length > 0 && (
        <Panel title={`⚠️ Conflicts (${preview.conflicts.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {preview.conflicts.map((c, i) => (
              <div key={i} style={{ padding: 8, background: '#78350f30', border: '1px solid #f59e0b', borderRadius: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>{c.topic}</div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3 }}>
                  <strong>A:</strong> {c.a_claim}
                </div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>
                  <strong>B:</strong> {c.b_claim}
                </div>
                <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>
                  ✓ <strong>Recommendation:</strong> {c.recommendation} {c.reason && `— ${c.reason}`}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Proposed title/URL */}
      <Panel title="📝 Proposed output">
        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>Title:</label>
        <input
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          disabled={isDecided}
          style={{ width: '100%', padding: '6px 10px', fontSize: 14, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, color: '#e2e8f0', fontFamily: 'inherit', marginBottom: 8 }}
        />
        <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3 }}>URL slug:</label>
        <input
          type="text"
          value={editUrl}
          onChange={e => setEditUrl(e.target.value)}
          disabled={isDecided}
          style={{ width: '100%', padding: '6px 10px', fontSize: 12, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, color: '#e2e8f0', fontFamily: 'var(--mn)' }}
        />
        {preview.proposedExcerpt && (
          <>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 8, marginBottom: 3 }}>Excerpt:</label>
            <div style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>{preview.proposedExcerpt}</div>
          </>
        )}
      </Panel>

      {/* Redirects plan */}
      {preview.redirectsPlan?.length > 0 && (
        <Panel title={`🔀 Redirects plan (${preview.redirectsPlan.length})`}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>
            После approve — применить эти 301-ы в WP (Rank Math → Redirections):
          </div>
          {preview.redirectsPlan.map((r, i) => (
            <div key={i} style={{ fontSize: 11, fontFamily: 'var(--mn)', color: '#94a3b8', padding: '2px 0' }}>
              {r.from_url} <span style={{ color: '#60a5fa' }}>→</span> {r.to_url} <span style={{ color: '#475569' }}>({r.reason})</span>
            </div>
          ))}
        </Panel>
      )}

      {/* Merged content preview */}
      <Panel title="📄 Merged content preview">
        <details open>
          <summary style={{ cursor: 'pointer', fontSize: 11, color: '#94a3b8' }}>Развернуть ({preview.proposedContent?.length || 0} chars)</summary>
          <div
            style={{ marginTop: 8, padding: 12, background: '#0a0e17', borderRadius: 4, fontSize: 13, color: '#cbd5e1', lineHeight: 1.6, maxHeight: 500, overflow: 'auto' }}
            dangerouslySetInnerHTML={{ __html: preview.proposedContent || '' }}
          />
        </details>
      </Panel>

      {/* FAQs */}
      {preview.proposedFaqs?.length > 0 && (
        <Panel title={`❓ FAQs (${preview.proposedFaqs.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {preview.proposedFaqs.map((f, i) => (
              <div key={i} style={{ padding: 6, background: '#0a0e17', borderRadius: 3 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{f.q}</div>
                <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Actions */}
      {!isDecided && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <Btn onClick={reject} sx={{ color: '#ef4444' }}>Reject</Btn>
          <Btn onClick={approve} disabled={committing || !editTitle.trim()} v="acc">
            {committing ? 'Committing…' : '✓ Approve & Commit'}
          </Btn>
        </div>
      )}

      {isDecided && (
        <div style={{ padding: 10, background: '#0f172a', borderRadius: 4, border: '1px solid #1e293b', textAlign: 'center' }}>
          <strong style={{ color: preview.status === 'approved' ? '#22c55e' : '#ef4444' }}>
            {preview.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
          </strong>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
            {preview.decidedAt} · {preview.decidedBy}
            {preview.resultArticleId && <> · Result: <code style={{ color: '#60a5fa' }}>{preview.resultArticleId}</code></>}
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 5, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 10,
      background: color ? color + '25' : '#1e293b',
      color: color || '#94a3b8',
      fontFamily: 'var(--mn)', textTransform: 'uppercase', letterSpacing: .5, fontWeight: 700,
    }}>{children}</span>
  );
}
