import { useState } from 'react';
import { Btn, Inp } from '../components/ui.jsx';
import { setToken, api } from '../api/client.js';

export default function Login({ onSuccess }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed) { setError('Введите токен'); return; }

    setLoading(true);
    setError('');
    setToken(trimmed);

    try {
      const h = await api.listSites();
      onSuccess();
    } catch (e) {
      setToken('');
      if (e.status === 401) {
        setError('Неверный токен');
      } else {
        setError(`Ошибка: ${e.message}`);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ background: '#0a0e17', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>☕</div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#e2e8f0', letterSpacing: '-.5px' }}>SEO Command Center</div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Вход в панель управления</div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>
              API Token
            </div>
            <Inp
              value={value}
              onChange={setValue}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Вставьте AUTH_TOKEN из .env"
              type="password"
              invalid={!!error}
              autoFocus
              sx={{ padding: '10px 12px', fontSize: '13px', fontFamily: 'var(--mn)' }}
            />
            {error && (
              <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          <Btn type="submit" v="acc" disabled={loading} sx={{ width: '100%', padding: '10px', fontSize: '13px' }}>
            {loading ? '⏳ Проверка...' : '🔐 Войти'}
          </Btn>

          <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center', lineHeight: 1.5 }}>
            Токен задаётся на сервере в <code style={{ color: '#60a5fa', background: '#0a0e17', padding: '1px 4px', borderRadius: '3px' }}>AUTH_TOKEN</code> переменной.
            Если вы владелец — посмотрите его в Dokploy → Environment.
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '9px', color: '#334155', fontFamily: 'var(--mn)' }}>
          v0.3 · cmd.bonaka.app
        </div>
      </div>
    </div>
  );
}
