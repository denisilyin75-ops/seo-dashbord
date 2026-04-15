import { d2s } from '../utils/format.js';

export default function LogPanel({ log }) {
  if (!log?.length) {
    return <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>Лог пуст</div>;
  }
  return (
    <div>
      <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
        AI-лог ({log.length})
      </div>
      {log.slice(0, 20).map((e) => (
        <div key={e.id} style={{ background: '#0f172a', borderRadius: '4px', padding: '6px 8px', marginBottom: '3px', border: '1px solid #1e293b', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{e.articleId ? `Article ${e.articleId.slice(0, 8)}` : e.siteId ? `Site ${e.siteId}` : 'Global'}</span>
            <span style={{ color: '#475569', fontFamily: 'var(--mn)', fontSize: '9px' }}>{d2s(e.ts)}</span>
          </div>
          <div style={{ color: '#94a3b8' }}>→ {e.command}</div>
        </div>
      ))}
    </div>
  );
}
