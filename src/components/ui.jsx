import { ST } from '../utils/constants.js';
import { fmt } from '../utils/format.js';

export const Badge = ({ s }) => {
  const x = ST[s] || { l: s, c: '#64748b' };
  return (
    <span style={{ padding: '2px 6px', borderRadius: '4px', background: x.c + '15', color: x.c, fontSize: '10px', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase', border: `1px solid ${x.c}30` }}>
      {x.l}
    </span>
  );
};

export const Metric = ({ label, value, sfx }) => (
  <div style={{ flex: 1, minWidth: '65px' }}>
    <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: '1px' }}>{label}</div>
    <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--mn)', color: '#e2e8f0' }}>
      {fmt(value)}
      <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '1px' }}>{sfx}</span>
    </div>
  </div>
);

export const Btn = ({ children, onClick, v = 'def', disabled, sx = {} }) => {
  const b = { border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .15s', opacity: disabled ? 0.5 : 1, ...sx };
  const m = {
    def:     { background: '#1e293b', color: '#94a3b8', ...b },
    acc:     { background: '#3b82f6', color: '#fff',    ...b },
    ghost:   { background: 'transparent', color: '#64748b', padding: '3px 6px', ...b },
    danger:  { background: '#ef4444', color: '#fff',    ...b },
    success: { background: '#059669', color: '#fff',    ...b },
    orange:  { background: '#f97316', color: '#fff',    ...b },
  };
  return <button onClick={onClick} disabled={disabled} style={m[v] || m.def}>{children}</button>;
};

export const Inp = ({ value, onChange, placeholder, onKeyDown, sx = {}, type = 'text' }) => (
  <input
    type={type}
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '5px', padding: '7px 10px', color: '#e2e8f0', fontSize: '12px', outline: 'none', fontFamily: 'inherit', width: '100%', ...sx }}
  />
);

export const Sel = ({ value, onChange, opts, sx = {} }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '5px', padding: '6px 8px', color: '#e2e8f0', fontSize: '12px', outline: 'none', appearance: 'auto', ...sx }}
  >
    {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

export const XLink = ({ href, label, icon }) => (
  <a
    href={href || '#'}
    target="_blank"
    rel="noopener noreferrer"
    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', background: '#1e293b', color: '#60a5fa', textDecoration: 'none', border: '1px solid #1e293b', transition: 'all .15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#60a5fa'; }}
  >
    <span style={{ fontSize: '12px' }}>{icon}</span>{label}
  </a>
);

export const Modal = ({ title, onClose, children, wide }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: '#000b', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', width: '100%', maxWidth: wide ? '680px' : '500px', maxHeight: '85vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>{title}</span>
        <Btn onClick={onClose} v="ghost">✕</Btn>
      </div>
      {children}
    </div>
  </div>
);
