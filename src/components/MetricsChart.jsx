import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = {
  sessions: '#60a5fa',
  revenue:  '#34d399',
  affiliate_clicks: '#fbbf24',
  cr:       '#f97316',
};

export default function MetricsChart({ data, height = 240, lines = ['sessions', 'revenue'] }) {
  const formatted = useMemo(
    () => data.map((d) => ({ ...d, date: d.date?.slice(5) /* MM-DD */ })),
    [data],
  );

  const hasData = data.some((d) => (d.sessions || 0) + (d.revenue || 0) + (d.affiliate_clicks || 0) > 0);

  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '12px', background: '#0a0e17', borderRadius: '6px', border: '1px dashed #1e293b' }}>
        Нет данных за период
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {!hasData && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2, padding: '2px 6px', borderRadius: '4px', background: '#fbbf2415', color: '#fbbf24', fontSize: '9px', fontWeight: 700, border: '1px solid #fbbf2430' }}>
          NO METRICS YET
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#1e293b" />
          <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }} stroke="#1e293b" />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '11px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
          {lines.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={COLORS[k] || '#60a5fa'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: COLORS[k] || '#60a5fa' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
