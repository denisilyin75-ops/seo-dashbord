import { useEffect, useState } from 'react';
import { AUTH_EVENT, getToken, setToken } from '../api/client.js';
import { Btn, Inp, Modal } from './ui.jsx';

/**
 * Показывает модалку для ввода AUTH_TOKEN при первом 401-ответе от API.
 * После сохранения токена — перезагружает страницу чтобы все вызовы
 * повторились с новым заголовком.
 *
 * Ключи localStorage:
 *   scc:auth-token     — сам токен
 *   scc:auth-dismissed — отметка что пользователь явно закрыл модалку
 *                        (чтобы не показывать бесконечно до refresh)
 */
export default function AuthGate() {
  const [open, setOpen] = useState(false);
  const [token, setTokenState] = useState('');

  useEffect(() => {
    const onAuth = () => {
      // Не показывать повторно в рамках одной сессии, если юзер закрыл
      if (sessionStorage.getItem('scc:auth-dismissed')) return;
      setTokenState(getToken());
      setOpen(true);
    };
    document.addEventListener(AUTH_EVENT, onAuth);
    return () => document.removeEventListener(AUTH_EVENT, onAuth);
  }, []);

  if (!open) return null;

  const save = () => {
    setToken(token.trim());
    // Перезагружаем страницу — проще чем повторять все 8 исходных запросов
    window.location.reload();
  };

  const dismiss = () => {
    sessionStorage.setItem('scc:auth-dismissed', '1');
    setOpen(false);
  };

  return (
    <Modal title="🔒 Требуется авторизация" onClose={dismiss}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
          API вернул <b style={{ color: '#ef4444' }}>401 Unauthorized</b>.
          На сервере задан <code style={{ color: '#60a5fa', background: '#0a0e17', padding: '1px 5px', borderRadius: 3 }}>AUTH_TOKEN</code> —
          вставьте тот же токен здесь:
        </div>

        <Inp
          value={token}
          onChange={setTokenState}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Bearer token (из .env AUTH_TOKEN)"
          type="password"
          sx={{ fontFamily: 'var(--mn)' }}
        />

        <div style={{ fontSize: '10px', color: '#475569', padding: '8px 10px', background: '#0a0e17', borderRadius: 4, border: '1px solid #1e293b' }}>
          💡 Токен хранится в localStorage (<code>scc:auth-token</code>) — только на этом
          устройстве/браузере. Если у вас dev-сервер без токена — поставьте
          <code style={{ color: '#60a5fa' }}> AUTH_TOKEN=</code> (пусто) в <code>.env</code> на сервере.
        </div>

        <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
          <Btn onClick={dismiss} v="ghost">Закрыть</Btn>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Btn onClick={() => { setToken(''); window.location.reload(); }} v="danger" sx={{ fontSize: '11px' }}>
              🗑 Сбросить
            </Btn>
            <Btn onClick={save} v="acc" disabled={!token.trim()}>
              💾 Сохранить и перезагрузить
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}
