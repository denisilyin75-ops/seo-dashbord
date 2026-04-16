import { useState } from 'react';
import { Btn, Inp, Sel } from './ui.jsx';
import Field, { isDomain, isUrl } from './Field.jsx';

const EMPTY = {
  name: '', market: 'RU', niche: '', status: 'setup',
  wpAdmin: '', wpApi: '', wpUser: '', wpAppPassword: '',
  ga4: '', gsc: '', affiliate: '',
};

function validate(d, isEdit) {
  const e = {};
  if (!d.name?.trim()) e.name = 'Введите домен';
  else if (!isDomain(d.name.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))) e.name = 'Формат: domain.com';

  if (d.wpAdmin  && !isUrl(d.wpAdmin))  e.wpAdmin  = 'Должен начинаться с http(s)://';
  if (d.wpApi    && !isUrl(d.wpApi))    e.wpApi    = 'Должен начинаться с http(s)://';
  if (d.affiliate && d.affiliate !== '#' && !isUrl(d.affiliate)) e.affiliate = 'Должен начинаться с http(s)://';

  // Если заданы wpApi+wpUser — нужен и пароль (кроме случая редактирования, когда он уже сохранён)
  const wantsWp = d.wpApi || d.wpUser || d.wpAppPassword;
  if (wantsWp) {
    if (!d.wpApi)  e.wpApi  = e.wpApi  || 'Нужен WP API URL';
    if (!d.wpUser) e.wpUser = 'Нужен WP username';
    if (!isEdit && !d.wpAppPassword) e.wpAppPassword = 'Нужен Application Password';
  }
  return e;
}

export default function SiteForm({ site, onSave }) {
  const [d, setD] = useState(site ? { ...EMPTY, ...site, wpAppPassword: '' } : EMPTY);
  const [showWp, setShowWp] = useState(!!site?.wpHasCreds);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const upd = (k, v) => { setD({ ...d, [k]: v }); setTouched({ ...touched, [k]: true }); };
  const liveErrors = validate(d, !!site);
  const shown = Object.fromEntries(Object.entries(liveErrors).filter(([k]) => touched[k] || errors[k]));
  const disabled = Object.keys(liveErrors).length > 0;

  const submit = () => {
    setTouched({ name: true, wpAdmin: true, wpApi: true, wpUser: true, wpAppPassword: true, affiliate: true });
    setErrors(liveErrors);
    if (Object.keys(liveErrors).length === 0) onSave(d);
  };

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <Field label="Домен" required error={shown.name} hint="без https:// и слэшей, например popolkam.ru">
        <Inp value={d.name} onChange={(v) => upd('name', v)} placeholder="domain.com" invalid={!!shown.name} />
      </Field>

      <div style={{ display: 'flex', gap: '6px' }}>
        <Field label="Рынок" sx={{ width: '90px' }}>
          <Sel value={d.market} onChange={(v) => upd('market', v)} opts={[
            { v: 'RU', l: '🇷🇺 RU' }, { v: 'NL', l: '🇳🇱 NL' }, { v: 'DE', l: '🇩🇪 DE' }, { v: 'US', l: '🇺🇸 US' },
          ]} />
        </Field>
        <Field label="Ниша" sx={{ flex: 1 }}>
          <Inp value={d.niche} onChange={(v) => upd('niche', v)} placeholder="Кофемашины" />
        </Field>
        <Field label="Статус" sx={{ width: '110px' }}>
          <Sel value={d.status} onChange={(v) => upd('status', v)} opts={[
            { v: 'active', l: 'Active' }, { v: 'setup', l: 'Setup' }, { v: 'paused', l: 'Paused' },
          ]} />
        </Field>
      </div>

      <Field label="WP Admin URL" error={shown.wpAdmin}>
        <Inp value={d.wpAdmin} onChange={(v) => upd('wpAdmin', v)} placeholder="https://site.ru/wp-admin" invalid={!!shown.wpAdmin} />
      </Field>
      <Field label="GA4 property / URL">
        <Inp value={d.ga4} onChange={(v) => upd('ga4', v)} placeholder="properties/123456789" />
      </Field>
      <Field label="GSC site URL">
        <Inp value={d.gsc} onChange={(v) => upd('gsc', v)} placeholder="sc-domain:site.ru или https://site.ru/" />
      </Field>
      <Field label="Affiliate dashboard URL" error={shown.affiliate}>
        <Inp value={d.affiliate} onChange={(v) => upd('affiliate', v)} placeholder="https://www.admitad.com/..." invalid={!!shown.affiliate} />
      </Field>

      <button
        type="button"
        onClick={() => setShowWp(!showWp)}
        style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '11px', textAlign: 'left', padding: '4px 0' }}
      >
        {showWp ? '▼' : '▶'} WordPress REST API credentials {site?.wpHasCreds && <span style={{ color: '#34d399' }}>· сохранены ✓</span>}
      </button>
      {showWp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: '#0a0e17', borderRadius: '5px', border: '1px solid #1e293b' }}>
          <Field label="WP API base URL" error={shown.wpApi} hint="корень сайта или прямой wp-json/wp/v2">
            <Inp value={d.wpApi} onChange={(v) => upd('wpApi', v)} placeholder="https://site.ru" invalid={!!shown.wpApi} />
          </Field>
          <Field label="WP username" error={shown.wpUser}>
            <Inp value={d.wpUser} onChange={(v) => upd('wpUser', v)} placeholder="admin" invalid={!!shown.wpUser} />
          </Field>
          <Field label="Application Password" error={shown.wpAppPassword}
                 hint={site?.wpHasCreds ? 'оставьте пустым чтобы не менять' : 'Users → Profile → Application Passwords в WP'}>
            <Inp value={d.wpAppPassword} onChange={(v) => upd('wpAppPassword', v)}
                 type="password" placeholder="xxxx xxxx xxxx xxxx" invalid={!!shown.wpAppPassword} />
          </Field>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <Btn type="submit" v="acc" disabled={disabled}>{site ? 'Сохранить' : 'Добавить'}</Btn>
      </div>
    </form>
  );
}
