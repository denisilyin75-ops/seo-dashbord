import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { setToken } from '../api/client.js';
import useHotkeys from '../hooks/useHotkeys.js';
import HotkeysHelp from './HotkeysHelp.jsx';

const navLinks = [
  { to: '/',         label: 'Dashboard', icon: '📊' },
  { to: '/settings', label: 'Settings',  icon: '⚙️' },
];

export default function Layout({ children, headerExtra }) {
  const loc = useLocation();
  const nav = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  // Глобальные навигационные хоткеи
  useHotkeys('?',    () => setShowHelp(true));
  useHotkeys('g d',  () => nav('/'));
  useHotkeys('g s',  () => nav('/settings'));

  return (
    <div style={{ background: '#0a0e17', color: '#e2e8f0', minHeight: '100vh' }}>
      <header style={{ padding: '14px 14px 10px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>☕</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-.3px' }}>SEO Command Center</div>
              <div style={{ fontSize: '9px', color: '#475569', fontFamily: 'var(--mn)' }}>v0.3.1</div>
            </div>
          </Link>
          <nav style={{ display: 'flex', gap: '4px' }}>
            {navLinks.map((n) => {
              const active = n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 700, textDecoration: 'none', background: active ? '#1e293b' : 'transparent', color: active ? '#60a5fa' : '#64748b', border: '1px solid', borderColor: active ? '#1e293b' : 'transparent', transition: 'all .15s' }}
                >
                  <span>{n.icon}</span>{n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {headerExtra}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            title="Клавиатурные шорткаты"
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '2px 6px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
          >?</button>
          <div style={{ padding: '3px 8px', borderRadius: '4px', background: '#1e293b', fontSize: '10px', fontFamily: 'var(--mn)', color: '#64748b' }}>
            {new Date().toLocaleDateString('ru-RU')}
          </div>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d39944' }} title="API online" />
          <button
            type="button"
            onClick={() => { setToken(''); window.location.href = '/'; }}
            title="Выйти"
            style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '2px 8px', color: '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
          >Выйти</button>
        </div>
      </header>
      <main style={{ padding: '14px' }}>{children}</main>
      {showHelp && <HotkeysHelp onClose={() => setShowHelp(false)} />}
    </div>
  );
}
