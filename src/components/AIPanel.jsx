import { useState } from 'react';
import { Btn, Inp } from './ui.jsx';
import { api } from '../api/client.js';

export default function AIPanel({ siteId }) {
  const [q, setQ] = useState('');
  const [ld, setLd] = useState(false);
  const [res, setRes] = useState(null);
  const [hist, setHist] = useState([]);

  const ask = async (query) => {
    const t = query || q;
    if (!t.trim()) return;
    setLd(true); setRes(null);
    try {
      const r = await api.aiCommand(t, { siteId });
      setRes(r.result);
      setHist((p) => [{ q: t, ts: new Date().toLocaleTimeString('ru') }, ...p].slice(0, 10));
    } catch (e) {
      setRes('⚠️ ' + e.message);
    }
    setLd(false);
    setQ('');
  };

  return (
    <div>
      <div style={{ background: '#0f172a', borderRadius: '8px', padding: '14px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '18px' }}>🤖</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa' }}>AI Command Center</span>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <Inp value={q} onChange={setQ} onKeyDown={(e) => e.key === 'Enter' && ask()} placeholder="Стратегия, контент, аналитика..." sx={{ flex: 1, padding: '9px 12px', fontSize: '13px' }} />
          <Btn onClick={() => ask()} disabled={ld} v="acc" sx={{ padding: '9px 18px', fontSize: '13px' }}>{ld ? '...' : '▶ Go'}</Btn>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '7px', flexWrap: 'wrap' }}>
          {['Идеи контента', 'Слабые статьи', 'SEO-план', 'Рост CR', 'Новые ниши'].map((p) => (
            <button
              key={p}
              onClick={() => { setQ(p); ask(p); }}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', color: '#94a3b8', cursor: 'pointer' }}
            >{p}</button>
          ))}
        </div>
        {res && (
          <div style={{ marginTop: '10px', padding: '12px', background: '#1e293b', borderRadius: '6px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.7, borderLeft: '3px solid #3b82f6', whiteSpace: 'pre-wrap', maxHeight: '350px', overflowY: 'auto' }}>
            {res}
          </div>
        )}
      </div>
      {hist.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>История</div>
          {hist.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', padding: '3px 0', borderBottom: '1px solid #1e293b22' }}>
              <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'var(--mn)' }}>{h.ts}</span>
              <span style={{ fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setQ(h.q)}>{h.q}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
