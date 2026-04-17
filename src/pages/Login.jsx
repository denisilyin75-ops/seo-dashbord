import { useState } from 'react';
import { Btn, Inp } from '../components/ui.jsx';
import { setToken, api } from '../api/client.js';

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const trimmed = password.trim();
    if (!trimmed) { setError('Введите пароль'); return; }

    setLoading(true);
    setError('');
    setToken(trimmed);

    try {
      await api.listSites();
      onSuccess();
    } catch (e) {
      setToken('');
      if (e.status === 401) {
        setError('Неверный пароль');
      } else {
        setError(`Ошибка подключения: ${e.message}`);
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
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Панель управления сайтами</div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>
              Пароль
            </div>
            <Inp
              value={password}
              onChange={setPassword}
              placeholder="Введите пароль"
              type="password"
              invalid={!!error}
              autoFocus
              sx={{ padding: '12px 14px', fontSize: '14px' }}
            />
            {error && (
              <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          <Btn type="submit" v="acc" disabled={loading} sx={{ width: '100%', padding: '12px', fontSize: '14px' }}>
            {loading ? 'Проверка...' : 'Войти'}
          </Btn>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '9px', color: '#334155', fontFamily: 'var(--mn)' }}>
          cmd.bonaka.app
        </div>
      </div>
    </div>
  );
}
