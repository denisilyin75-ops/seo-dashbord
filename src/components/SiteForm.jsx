import { useState } from 'react';
import { Btn, Inp, Sel } from './ui.jsx';

const EMPTY = {
  name: '', market: 'RU', niche: '', status: 'setup',
  wpAdmin: '', wpApi: '', wpUser: '', wpAppPassword: '',
  ga4: '', gsc: '', affiliate: '',
};

export default function SiteForm({ site, onSave }) {
  const [d, setD] = useState(site ? { ...EMPTY, ...site, wpAppPassword: '' } : EMPTY);
  const [showWp, setShowWp] = useState(!!site?.wpHasCreds);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Inp value={d.name} onChange={(v) => setD({ ...d, name: v })} placeholder="domain.com" />
      <div style={{ display: 'flex', gap: '6px' }}>
        <Sel value={d.market} onChange={(v) => setD({ ...d, market: v })} opts={[
          { v: 'RU', l: '🇷🇺' }, { v: 'NL', l: '🇳🇱' }, { v: 'DE', l: '🇩🇪' }, { v: 'US', l: '🇺🇸' },
        ]} />
        <Inp value={d.niche} onChange={(v) => setD({ ...d, niche: v })} placeholder="Ниша" sx={{ flex: 1 }} />
        <Sel value={d.status} onChange={(v) => setD({ ...d, status: v })} opts={[
          { v: 'active', l: 'Active' }, { v: 'setup', l: 'Setup' }, { v: 'paused', l: 'Paused' },
        ]} />
      </div>
      <Inp value={d.wpAdmin} onChange={(v) => setD({ ...d, wpAdmin: v })} placeholder="WP Admin URL (https://site.ru/wp-admin)" />
      <Inp value={d.ga4} onChange={(v) => setD({ ...d, ga4: v })} placeholder="GA4 property (properties/123456) или URL" />
      <Inp value={d.gsc} onChange={(v) => setD({ ...d, gsc: v })} placeholder="GSC site URL (sc-domain:site.ru)" />
      <Inp value={d.affiliate} onChange={(v) => setD({ ...d, affiliate: v })} placeholder="Affiliate dashboard URL" />

      <button
        type="button"
        onClick={() => setShowWp(!showWp)}
        style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '11px', textAlign: 'left', padding: '4px 0' }}
      >
        {showWp ? '▼' : '▶'} WordPress REST API credentials {site?.wpHasCreds && <span style={{ color: '#34d399' }}>(сохранены ✓)</span>}
      </button>
      {showWp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: '#0a0e17', borderRadius: '5px', border: '1px solid #1e293b' }}>
          <Inp value={d.wpApi} onChange={(v) => setD({ ...d, wpApi: v })} placeholder="https://site.ru (или https://site.ru/wp-json/wp/v2)" />
          <Inp value={d.wpUser} onChange={(v) => setD({ ...d, wpUser: v })} placeholder="WP username" />
          <Inp value={d.wpAppPassword} onChange={(v) => setD({ ...d, wpAppPassword: v })} placeholder={site?.wpHasCreds ? '(оставить пустым — не менять)' : 'Application Password (xxxx xxxx xxxx xxxx)'} type="password" />
          <div style={{ fontSize: '10px', color: '#64748b' }}>
            Создать в WP: <code style={{ color: '#60a5fa' }}>Users → Profile → Application Passwords</code>
          </div>
        </div>
      )}

      <Btn v="acc" onClick={() => onSave(d)}>{site ? 'Сохранить' : 'Добавить'}</Btn>
    </div>
  );
}
