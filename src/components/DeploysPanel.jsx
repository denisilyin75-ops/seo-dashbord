import { Badge } from './ui.jsx';
import { d2s } from '../utils/format.js';

export default function DeploysPanel({ deploys }) {
  if (!deploys?.length) {
    return <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>Нет развёртываний. Нажмите 🚀 Deploy.</div>;
  }
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
        Развёртывания ({deploys.length})
      </div>
      {deploys.map((d) => (
        <div key={d.id} style={{ background: '#0f172a', borderRadius: '5px', padding: '10px', marginBottom: '4px', border: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>🌐</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', fontFamily: 'var(--mn)' }}>
                {d.config?.url || d.config?.domain || d.siteId || d.id}
              </span>
            </div>
            <Badge s={d.status} />
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>
            {d.config?.niche || d.config?.nicheRu} · {d.config?.market} · {d.config?.deployType} · {d2s(d.ts)}
          </div>
          {d.aiPlan?.categories?.length > 0 && (
            <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {d.aiPlan.categories.slice(0, 5).map((c, j) => (
                <span key={j} style={{ padding: '1px 6px', background: '#1e293b', borderRadius: '3px', fontSize: '9px', color: '#94a3b8' }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
