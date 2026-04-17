import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Прогресс контент-плана по рубрикам и фазам.
 * Показывает: сколько в плане, сколько опубликовано, drafts, ideas.
 *
 * Компактная карточка — встраивается над вкладкой Plan или отдельным блоком.
 */
export default function ContentPlanProgress({ siteId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setErr('');
      try {
        const r = await api.siteProgress(siteId);
        if (!cancelled) setData(r);
      } catch (e) { if (!cancelled) setErr(e.message); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [siteId]);

  if (loading && !data) {
    return <div style={{ padding: 10, fontSize: 11, color: '#64748b' }}>Загружаю прогресс…</div>;
  }
  if (err) {
    return <div style={{ padding: 10, fontSize: 11, color: '#ef4444' }}>Ошибка: {err}</div>;
  }
  if (!data) return null;

  const hasAnyRubric = data.rubrics && data.rubrics.length > 0;
  const hasOrphan = data.orphan && data.orphan.total > 0;
  if (!hasAnyRubric && !hasOrphan) return null;

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 8,
      padding: 14,
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
        📊 Прогресс рубрик
      </div>

      {data.rubrics.map((r) => (
        <RubricBlock key={r.rubric} rubric={r} />
      ))}

      {hasOrphan && (
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 10, paddingTop: 8, borderTop: '1px dashed #1e293b' }}>
          Вне плана: <b style={{ color: '#94a3b8' }}>{data.orphan.total}</b> статей
          ({data.orphan.published} опубл.{data.orphan.draft ? ` · ${data.orphan.draft} draft` : ''}{data.orphan.planned ? ` · ${data.orphan.planned} plan` : ''})
          <span style={{ color: '#475569' }}> — обычно импортированные из WP до разбивки по рубрикам</span>
        </div>
      )}
    </div>
  );
}

function RubricBlock({ rubric }) {
  const pctAll = rubric.total ? (rubric.published / rubric.total) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{rubric.rubric}</span>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--mn)' }}>
          <b style={{ color: '#34d399' }}>{rubric.published}</b>
          <span> / </span>
          <b style={{ color: '#94a3b8' }}>{rubric.total}</b>
          <span> опубл.</span>
        </span>
      </div>

      {rubric.phases.map((p) => (
        <PhaseLine key={p.phase} phase={p} />
      ))}
    </div>
  );
}

function PhaseLine({ phase }) {
  const pct = phase.total ? (phase.published / phase.total) * 100 : 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: '#64748b', width: 72 }}>
          {phase.phase === 0 ? 'Без фазы' : `Phase ${phase.phase}`}
        </span>
        <div style={{ flex: 1, height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 80 ? '#34d399' : pct >= 40 ? '#fbbf24' : '#3b82f6',
            transition: 'width .3s',
          }} />
        </div>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--mn)', width: 60, textAlign: 'right' }}>
          {phase.published}/{phase.total}
        </span>
      </div>
      {/* Детализация: опубл / draft / in_progress / queued / idea */}
      <div style={{ fontSize: 9, color: '#475569', marginLeft: 78, display: 'flex', gap: 10 }}>
        {phase.published > 0 && <span>✅ {phase.published}</span>}
        {phase.drafts > 0 && <span>📝 {phase.drafts} draft</span>}
        {phase.inProgress > 0 && <span>⚙️ {phase.inProgress} wip</span>}
        {phase.queued > 0 && <span>📋 {phase.queued} queue</span>}
        {phase.ideas > 0 && <span>💡 {phase.ideas} idea</span>}
      </div>
    </div>
  );
}
