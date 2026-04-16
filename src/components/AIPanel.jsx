import { useEffect, useRef, useState } from 'react';
import { Btn, Inp } from './ui.jsx';
import Markdown from './Markdown.jsx';
import { api } from '../api/client.js';

const PRESETS = ['Идеи контента', 'Слабые статьи', 'SEO-план', 'Рост CR', 'Новые ниши'];

export default function AIPanel({ siteId }) {
  const [q, setQ] = useState('');
  const [ld, setLd] = useState(false);
  const [res, setRes] = useState(null);
  const [hist, setHist] = useState([]);
  const inputRef = useRef(null);

  // История живёт по ключу сайта в localStorage (D.13)
  const histKey = `scc:ai-hist:${siteId || 'global'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(histKey);
      setHist(raw ? JSON.parse(raw) : []);
    } catch { setHist([]); }
    setRes(null);
  }, [histKey]);

  // Глобальный хоткей / — ловим через document event
  useEffect(() => {
    const onFocus = () => inputRef.current?.focus();
    document.addEventListener('scc:focus-ai', onFocus);
    return () => document.removeEventListener('scc:focus-ai', onFocus);
  }, []);

  const ask = async (query) => {
    const t = (query || q).trim();
    if (!t) return;
    setLd(true); setRes(null);
    try {
      const r = await api.aiCommand(t, { siteId });
      setRes(r.result);
      const nextHist = [{ q: t, ts: new Date().toISOString(), result: r.result.slice(0, 200) }, ...hist].slice(0, 20);
      setHist(nextHist);
      try { localStorage.setItem(histKey, JSON.stringify(nextHist)); } catch {}
    } catch (e) {
      setRes('⚠️ ' + e.message);
    }
    setLd(false);
    setQ('');
  };

  return (
    <div>
      <div style={{ background: '#0f172a', borderRadius: '8px', padding: '14px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🤖</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#60a5fa' }}>AI Command Center</span>
          </div>
          <span style={{ fontSize: '10px', color: '#475569' }}>
            <kbd>/</kbd> — фокус
          </span>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          <Inp
            value={q}
            onChange={setQ}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="Стратегия, контент, аналитика..."
            sx={{ flex: 1, padding: '9px 12px', fontSize: '13px' }}
            data-hotkey="ai"
            ref={inputRef}
          />
          <Btn onClick={() => ask()} disabled={ld} v="acc" sx={{ padding: '9px 18px', fontSize: '13px' }}>{ld ? '...' : '▶ Go'}</Btn>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '7px', flexWrap: 'wrap' }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { setQ(p); ask(p); }}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', color: '#94a3b8', cursor: 'pointer' }}
            >{p}</button>
          ))}
        </div>
        {ld && (
          <div style={{ marginTop: '10px', padding: '10px 12px', background: '#1e293b', borderRadius: '6px', fontSize: '11px', color: '#60a5fa', animation: 'pulse 1s infinite' }}>
            🤖 Думаю...
          </div>
        )}
        {res && (
          <div style={{ marginTop: '10px', padding: '12px', background: '#1e293b', borderRadius: '6px', borderLeft: '3px solid #3b82f6', maxHeight: '420px', overflowY: 'auto', position: 'relative' }}>
            <Markdown sx={{ fontSize: '12px' }}>{res}</Markdown>
            <button
              type="button"
              onClick={() => { try { navigator.clipboard.writeText(res); } catch {} }}
              title="Скопировать"
              style={{ position: 'absolute', top: '6px', right: '6px', background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontSize: '10px', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
            >📋</button>
          </div>
        )}
      </div>

      {hist.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
            <span>История ({hist.length})</span>
            <button
              type="button"
              onClick={() => { setHist([]); try { localStorage.removeItem(histKey); } catch {} }}
              style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '.5px' }}
            >очистить</button>
          </div>
          {hist.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', padding: '3px 0', borderBottom: '1px solid #1e293b22', cursor: 'pointer' }} onClick={() => { setQ(h.q); inputRef.current?.focus(); }}>
              <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'var(--mn)', flexShrink: 0 }}>
                {new Date(h.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.q}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
