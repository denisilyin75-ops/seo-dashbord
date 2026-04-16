import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Btn, Modal } from './ui.jsx';

const Ctx = createContext(null);

/**
 * Провайдер. Используется в App.jsx один раз.
 *
 * const confirm = useConfirm();
 * const ok = await confirm('Удалить?');
 * const ok = await confirm({
 *   title: 'Удалить сайт',
 *   message: 'Все статьи и план будут удалены без возможности восстановления.',
 *   okLabel: 'Удалить навсегда',
 *   cancelLabel: 'Отмена',
 *   danger: true,
 * });
 */
export function ConfirmProvider({ children }) {
  const [opts, setOpts] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((input) => new Promise((resolve) => {
    const normalized = typeof input === 'string' ? { message: input } : (input || {});
    resolverRef.current = resolve;
    setOpts(normalized);
  }), []);

  const finish = (result) => {
    const r = resolverRef.current;
    resolverRef.current = null;
    setOpts(null);
    r?.(result);
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {opts && (
        <Modal title={opts.title || '⚠️ Подтвердите действие'} onClose={() => finish(false)}>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
            {opts.message}
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <Btn onClick={() => finish(false)}>
              {opts.cancelLabel || 'Отмена'} <kbd style={{ marginLeft: 6 }}>Esc</kbd>
            </Btn>
            <Btn v={opts.danger ? 'danger' : 'acc'} onClick={() => finish(true)}>
              {opts.okLabel || 'OK'} <kbd style={{ marginLeft: 6 }}>↵</kbd>
            </Btn>
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
