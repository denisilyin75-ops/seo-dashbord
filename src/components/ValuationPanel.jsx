import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { api } from '../api/client.js';
import { Btn } from './ui.jsx';
import { useTryToast } from './Toast.jsx';

const MODE_LABEL = {
  asset_based:   { label: 'Asset-based (ранняя фаза)', color: '#3b82f6' },
  hybrid:        { label: 'Hybrid (переходная)',        color: '#a78bfa' },
  revenue_based: { label: 'Revenue × Multiple',          color: '#34d399' },
};

const CONFIDENCE_COLOR = { high: '#34d399', medium: '#fbbf24', low: '#f97316' };

const fmtMoney = (n) => '$' + Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

export default function ValuationPanel({ siteId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recalcBusy, setRecalcBusy] = useState(false);
  const tryToast = useTryToast();

  const load = async () => {
    if (!siteId) return;
    setLoading(true);
    try {
      const rows = await api.siteValuations(siteId, 180);
      setHistory(rows);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [siteId]);

  const recalc = () => tryToast(async () => {
    setRecalcBusy(true);
    try {
      await api.runAgent('site_valuation');
      await load();
    } finally {
      setRecalcBusy(false);
    }
  }, { success: 'Оценка пересчитана' });

  if (loading && history.length === 0) {
    return <div style={{ padding: 16, color: '#64748b', fontSize: 12 }}>Загружаю историю оценок…</div>;
  }

  const latest = history[0];

  if (!latest) {
    return (
      <div style={{ padding: 20, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 10 }}>
          Оценок ещё нет. Запустите агента Site Valuation — получите первую оценку.
        </div>
        <Btn v="acc" onClick={recalc} disabled={recalcBusy}>
          {recalcBusy ? '⏳ Считаю…' : '▶ Рассчитать'}
        </Btn>
      </div>
    );
  }

  // Подготовка chart data (в хронологическом порядке)
  const chartData = [...history].reverse().map((r) => ({
    date: r.date,
    value: r.valuationExpected,
    low: r.valuationLow,
    high: r.valuationHigh,
  }));

  const modeMeta = MODE_LABEL[latest.mode] || MODE_LABEL.asset_based;
  const confColor = CONFIDENCE_COLOR[latest.confidence] || '#64748b';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Top card — текущая оценка */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        border: '1px solid #1e293b',
        borderRadius: 10,
        padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4 }}>
              Текущая капитализация
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', fontFamily: 'var(--mn)', lineHeight: 1 }}>
              {fmtMoney(latest.valuationExpected)}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              Диапазон: <b style={{ color: '#cbd5e1' }}>{fmtMoney(latest.valuationLow)}</b> — <b style={{ color: '#cbd5e1' }}>{fmtMoney(latest.valuationHigh)}</b>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 10, color: modeMeta.color, background: modeMeta.color + '15', border: `1px solid ${modeMeta.color}40`, padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
              {modeMeta.label}
            </span>
            <span style={{ fontSize: 10, color: confColor, background: confColor + '15', border: `1px solid ${confColor}40`, padding: '3px 8px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>
              ● {latest.confidence} confidence
            </span>
            <Btn v="acc" onClick={recalc} disabled={recalcBusy} sx={{ fontSize: 11 }}>
              {recalcBusy ? '⏳' : '↻ Пересчитать'}
            </Btn>
          </div>
        </div>

        {latest.avgMonthlyProfit > 0 && (
          <div style={{ fontSize: 12, color: '#cbd5e1', padding: '8px 0', borderTop: '1px solid #1e293b', marginTop: 8 }}>
            Avg monthly profit: <b>{fmtMoney(latest.avgMonthlyProfit)}</b>
            {' · '}
            Avg monthly revenue: <b>{fmtMoney(latest.avgMonthlyRevenue)}</b>
          </div>
        )}

        {/* Метаданные оценки — версия формулы и timestamp последнего пересчёта.
            Помогает понять «почему сегодня цифра другая» (формула менялась) и насколько давно считалось. */}
        <div style={{
          fontSize: 10, color: '#64748b', fontFamily: 'var(--mn)',
          padding: '6px 0 0', marginTop: 6, borderTop: '1px dashed #1e293b',
          display: 'flex', flexWrap: 'wrap', gap: 12,
        }}>
          {latest.methodology && (
            <span title="Версия формулы. Бампается при каждой калибровке — гарантия что delta24h не сравнивает несравнимое.">
              📐 формула: <b style={{ color: '#94a3b8' }}>{latest.methodology}</b>
            </span>
          )}
          <span title="Timestamp последнего пересчёта (UTC). Если давно — нажми ↻ Пересчитать выше.">
            🕐 расчёт: <b style={{ color: '#94a3b8' }}>{latest.createdAt || latest.date}</b>
          </span>
          <span style={{ color: '#475569' }}>
            всего замеров: <b style={{ color: '#64748b' }}>{history.length}</b>
          </span>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
            Динамика капитализации (последние {chartData.length} замеров)
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v) => '$' + v} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 4, fontSize: 12 }}
                  formatter={(v) => fmtMoney(v)}
                />
                <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: '#34d399' }} name="Оценка" />
                <Line type="monotone" dataKey="low" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Low" />
                <Line type="monotone" dataKey="high" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" dot={false} name="High" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Adjustments — что влияет на оценку */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
          Факторы оценки — что можно прокачать
        </div>

        {latest.adjustments.map((adj, i) => {
          const isPositive = adj.positive !== false && adj.impact_usd > 0;
          const isPenalty = adj.impact_usd < 0;
          const statusColor = isPenalty ? '#ef4444' : isPositive ? '#34d399' : '#fbbf24';
          const statusIcon = isPenalty ? '🔴' : adj.actionable ? '🟡' : '🟢';

          return (
            <div key={i} style={{
              padding: '10px 12px',
              borderLeft: `3px solid ${statusColor}`,
              background: '#0a0e17',
              marginBottom: 4,
              borderRadius: '0 5px 5px 0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                    {statusIcon} {adj.label}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    Сейчас: {adj.current}
                  </div>
                  {adj.actionable && (
                    <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 4, fontStyle: 'italic' }}>
                      → {adj.actionable}
                    </div>
                  )}
                  {adj.reason && (
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                      {adj.reason}
                    </div>
                  )}
                </div>
                <div style={{
                  fontSize: 16,
                  fontFamily: 'var(--mn)',
                  fontWeight: 800,
                  color: statusColor,
                  minWidth: 80,
                  textAlign: 'right',
                }}>
                  {isPenalty ? '−' : '+'}${Math.abs(adj.impact_usd).toLocaleString('ru-RU')}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: '#475569', padding: '6px 12px', lineHeight: 1.5 }}>
        Оценка обновляется автоматически еженедельно (агент <code style={{ color: '#94a3b8' }}>site_valuation</code>).
        Пересчитать можно в любой момент кнопкой выше или со страницы /agents.
        <br />
        Модель v2 two-mode: asset-based → hybrid → revenue × multiple по мере роста profit.
      </div>
    </div>
  );
}
