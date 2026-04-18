import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

/**
 * Phase A гамификации — Live Portfolio Value в шапке.
 *
 * Принципы:
 * - Сервер всегда считает (через site_valuation агента) — мы только показываем.
 * - Toggle hide/show живёт в user_prefs ключ "gamification.show_portfolio".
 *   Скрытие = чисто визуальное; цифры продолжают копиться, и при включении
 *   виден актуальный snapshot (а не сброс).
 * - Цифры реальные и заниженные — это валюация портфеля по нашей формуле,
 *   а не выдуманный «motivational $».
 *
 * UI: компактный pill "💎 $7,496 ↑ +$X" в шапке. Click по 👁 — toggle.
 * При скрытии — ghost-button "💎" сбоку, чтобы можно было быстро вернуть.
 */

const PREF_KEY = 'gamification.show_portfolio';
const REFRESH_PREF_EVENT = 'scc:gamification-changed';

export function notifyGamificationChanged() {
  document.dispatchEvent(new CustomEvent(REFRESH_PREF_EVENT));
}

function fmtUsd(n) {
  const v = Math.round(Number(n) || 0);
  return '$' + v.toLocaleString('en-US');
}

function fmtSignedUsd(n) {
  const v = Math.round(Number(n) || 0);
  if (v === 0) return '±$0';
  const sign = v > 0 ? '+' : '−';
  return `${sign}$${Math.abs(v).toLocaleString('en-US')}`;
}

export default function PortfolioWidget() {
  const [shown, setShown] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  const loadPref = useCallback(async () => {
    try {
      const r = await api.getPref(PREF_KEY);
      // null = pref не задан → дефолт = показывать
      setShown(r.value === null || r.value === true);
    } catch {
      setShown(true);
    }
  }, []);

  const loadValuation = useCallback(async () => {
    try {
      const r = await api.portfolioValuation();
      setData(r);
      setErr(null);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    loadPref();
    loadValuation();
    const onChanged = () => { loadPref(); loadValuation(); };
    document.addEventListener(REFRESH_PREF_EVENT, onChanged);
    return () => document.removeEventListener(REFRESH_PREF_EVENT, onChanged);
  }, [loadPref, loadValuation]);

  const togglePref = async () => {
    const next = !shown;
    setShown(next);
    try { await api.setPref(PREF_KEY, next); } catch { /* ignore */ }
  };

  if (!shown) {
    // «Возвращалка»: маленькая кнопка, чтобы можно было снова показать виджет
    return (
      <button
        type="button"
        onClick={togglePref}
        title="Показать Portfolio Value"
        style={{
          background: '#1e293b', border: '1px solid #334155', borderRadius: 4,
          padding: '2px 6px', color: '#475569', cursor: 'pointer', fontSize: 12,
        }}
      >💎</button>
    );
  }

  if (err || !data) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 8px', borderRadius: 4, background: '#1e293b',
        fontFamily: 'var(--mn)', fontSize: 11, color: '#64748b',
      }}>
        💎 {err ? '—' : '...'}
      </div>
    );
  }

  const delta = data.delta24h || 0;
  const deltaColor = delta > 0 ? '#34d399' : delta < 0 ? '#ef4444' : '#64748b';
  const pct = Math.max(0, Math.min(100, data.progressPct || 0));

  return (
    <div
      title={`Портфель: ${fmtUsd(data.value)} · цель ${fmtUsd(data.target)} (${pct.toFixed(1)}%)\n` +
             `Изменение за 24ч: ${fmtSignedUsd(data.delta24h)}\nИзменение за 30д: ${fmtSignedUsd(data.delta30d)}\n` +
             `Сайтов: ${data.sitesCount}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 4px 4px 9px',
        borderRadius: 5,
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        border: '1px solid #334155',
        fontFamily: 'var(--mn)',
      }}
    >
      <span style={{ fontSize: 11 }}>💎</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.05 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>{fmtUsd(data.value)}</span>
          <span style={{ fontSize: 9, color: deltaColor, fontWeight: 700 }}>
            {fmtSignedUsd(delta)}/24h
          </span>
        </div>
        <div style={{
          height: 3, width: 110, background: '#0a0e17',
          borderRadius: 2, overflow: 'hidden', marginTop: 1,
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: pct < 25 ? '#475569' : pct < 50 ? '#3b82f6' : pct < 75 ? '#60a5fa' : '#34d399',
            transition: 'width .3s',
          }} />
        </div>
      </div>
      <button
        type="button"
        onClick={togglePref}
        title="Скрыть (продолжит считаться в фоне)"
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#475569', fontSize: 11, padding: '2px 4px',
        }}
      >👁</button>
    </div>
  );
}
