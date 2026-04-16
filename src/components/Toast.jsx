import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastCtx = createContext(null);

const STYLES = {
  success: { bg: '#05966915', border: '#059669', color: '#34d399', icon: '✓' },
  error:   { bg: '#ef444415', border: '#ef4444', color: '#ef4444', icon: '⚠' },
  info:    { bg: '#3b82f615', border: '#3b82f6', color: '#60a5fa', icon: 'ℹ' },
  warn:    { bg: '#fbbf2415', border: '#fbbf24', color: '#fbbf24', icon: '⚠' },
};

let _counter = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind, message, ttl = 4000) => {
    const id = ++_counter;
    setItems((prev) => [...prev, { id, kind, message }]);
    if (ttl > 0) setTimeout(() => remove(id), ttl);
    return id;
  }, [remove]);

  const toast = {
    success: (m, ttl) => push('success', m, ttl),
    error:   (m, ttl) => push('error',   m, ttl ?? 6000),
    info:    (m, ttl) => push('info',    m, ttl),
    warn:    (m, ttl) => push('warn',    m, ttl),
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', bottom: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 2000, maxWidth: 'min(380px, 90vw)' }}>
        {items.map((t) => {
          const s = STYLES[t.kind] || STYLES.info;
          return (
            <div
              key={t.id}
              onClick={() => remove(t.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '6px', color: s.color, fontSize: '12px', fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)', animation: 'fadeIn .2s ease', boxShadow: '0 4px 12px rgba(0,0,0,.4)' }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{s.icon}</span>
              <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{t.message}</span>
              <span style={{ color: '#64748b', fontSize: '11px' }}>✕</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

/** Универсальный wrapper для async действий с автоматическим toast'ом. */
export function useTryToast() {
  const toast = useToast();
  return useCallback(async (fn, { success, error } = {}) => {
    try {
      const result = await fn();
      if (success) toast.success(typeof success === 'function' ? success(result) : success);
      return result;
    } catch (e) {
      const msg = error ? (typeof error === 'function' ? error(e) : error) : `Ошибка: ${e.message}`;
      toast.error(msg);
      throw e;
    }
  }, [toast]);
}
