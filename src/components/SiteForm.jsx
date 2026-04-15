import { useState } from 'react';
import { Btn, Inp, Sel } from './ui.jsx';

const EMPTY = {
  name: '', market: 'RU', niche: '', status: 'setup',
  wpAdmin: '', ga4: '', gsc: '', affiliate: '',
};

export default function SiteForm({ site, onSave }) {
  const [d, setD] = useState(site ? { ...EMPTY, ...site } : EMPTY);
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
      <Inp value={d.wpAdmin} onChange={(v) => setD({ ...d, wpAdmin: v })} placeholder="WP Admin URL" />
      <Inp value={d.ga4} onChange={(v) => setD({ ...d, ga4: v })} placeholder="GA4 property / URL" />
      <Inp value={d.gsc} onChange={(v) => setD({ ...d, gsc: v })} placeholder="GSC site URL" />
      <Inp value={d.affiliate} onChange={(v) => setD({ ...d, affiliate: v })} placeholder="Affiliate dashboard URL" />
      <Btn v="acc" onClick={() => onSave(d)}>{site ? 'Сохранить' : 'Добавить'}</Btn>
    </div>
  );
}
