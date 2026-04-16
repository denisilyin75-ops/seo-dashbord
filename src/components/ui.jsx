import { forwardRef, useEffect, useRef } from 'react';
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

export const Btn = ({ children, onClick, v = 'def', disabled, sx = {}, title, type = 'button' }) => {
  const b = { border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .15s', opacity: disabled ? 0.5 : 1, ...sx };
  const m = {
    def:     { background: '#1e293b', color: '#94a3b8', ...b },
    acc:     { background: '#3b82f6', color: '#fff',    ...b },
    ghost:   { background: 'transparent', color: '#64748b', padding: '3px 6px', ...b },
    danger:  { background: '#ef4444', color: '#fff',    ...b },
    success: { background: '#059669', color: '#fff',    ...b },
    orange:  { background: '#f97316', color: '#fff',    ...b },
  };
  return <button type={type} onClick={onClick} disabled={disabled} title={title} style={m[v] || m.def}>{children}</button>;
};

export const Inp = forwardRef(function Inp(
  { value, onChange, placeholder, onKeyDown, sx = {}, type = 'text', invalid = false, autoFocus, id, name, required, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      id={id}
      name={name}
      required={required}
      aria-invalid={invalid || undefined}
      style={{
        background: '#0f172a',
        border: `1px solid ${invalid ? '#ef4444' : '#1e293b'}`,
        borderRadius: '5px',
        padding: '7px 10px',
        color: '#e2e8f0',
        fontSize: '12px',
        outline: 'none',
        fontFamily: 'inherit',
        width: '100%',
        ...sx,
      }}
      {...rest}
    />
  );
});

export const Sel = ({ value, onChange, opts, sx = {}, invalid = false }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    aria-invalid={invalid || undefined}
    style={{
      background: '#0f172a',
      border: `1px solid ${invalid ? '#ef4444' : '#1e293b'}`,
      borderRadius: '5px', padding: '6px 8px', color: '#e2e8f0', fontSize: '12px',
      outline: 'none', appearance: 'auto', ...sx,
    }}
  >
    {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
  </select>
);

export const XLink = ({ href, label, icon }) => {
  const disabled = !href || href === '#';
  if (disabled) {
    return (
      <span
        title="Ссылка не настроена"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', background: '#0f172a', color: '#475569', border: '1px dashed #1e293b', cursor: 'not-allowed' }}
      >
        <span style={{ fontSize: '12px', opacity: 0.5 }}>{icon}</span>{label}
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', background: '#1e293b', color: '#60a5fa', textDecoration: 'none', border: '1px solid #1e293b', transition: 'all .15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#60a5fa'; }}
    >
      <span style={{ fontSize: '12px' }}>{icon}</span>{label}
    </a>
  );
};

// ---------------------------------------------------------------------------
// Modal: ESC to close, focus trap, autofocus first input, stack-aware
// ---------------------------------------------------------------------------
const modalStack = [];

export const Modal = ({ title, onClose, children, wide }) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const token = Symbol('modal');
    modalStack.push(token);

    // Предыдущий фокус — чтобы вернуть после закрытия
    const prevFocus = document.activeElement;

    // Автофокус: первый input/textarea/select, иначе первый button НЕ ✕
    const frame = requestAnimationFrame(() => {
      const root = ref.current;
      if (!root) return;
      const firstField = root.querySelector('input:not([type="hidden"]), textarea, select');
      if (firstField && !firstField.disabled) {
        firstField.focus();
        if (firstField.select) try { firstField.select(); } catch {}
      } else {
        const focusables = getFocusables(root);
        // Пропускаем первую кнопку (✕) если она в header
        const target = focusables.find((el) => el.textContent?.trim() !== '✕') || focusables[0];
        target?.focus();
      }
    });

    const onKey = (e) => {
      if (modalStack[modalStack.length - 1] !== token) return; // не верхний — игнорируем

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key === 'Tab' && ref.current) {
        const list = getFocusables(ref.current);
        if (!list.length) return;
        const first = list[0];
        const last  = list[list.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', onKey);

    // Заблокировать скролл body пока модалка открыта
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame);
      const idx = modalStack.indexOf(token);
      if (idx >= 0) modalStack.splice(idx, 1);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === 'function') {
        try { prevFocus.focus(); } catch {}
      }
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      style={{ position: 'fixed', inset: 0, background: '#000b', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn .15s ease' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref}
        style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', width: '100%', maxWidth: wide ? '680px' : '500px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.6)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#e2e8f0' }}>{title}</span>
          <Btn onClick={onClose} v="ghost" title="Esc">✕</Btn>
        </div>
        {children}
      </div>
    </div>
  );
};

function getFocusables(root) {
  return Array.from(root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => el.offsetParent !== null || el === document.activeElement);
}
