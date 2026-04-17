import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Btn } from './ui.jsx';

const STATUS_COLORS = {
  green:  { bg: '#05966915', border: '#34d39940', accent: '#34d399', icon: '●' },
  yellow: { bg: '#fbbf2415', border: '#fbbf2440', accent: '#fbbf24', icon: '●' },
  red:    { bg: '#ef444415', border: '#ef444440', accent: '#ef4444', icon: '●' },
};

const TYPE_META = {
  health:   { label: 'Здоровье',     emoji: '🩺' },
  pulse:    { label: 'Метрики',      emoji: '📊' },
  idea:     { label: 'Идея дня',     emoji: '💡' },
  quickWin: { label: 'На сегодня',   emoji: '⚡' },
};

function Card({ card }) {
  if (!card) return null;
  const c = STATUS_COLORS[card.status] || STATUS_COLORS.yellow;
  const meta = TYPE_META[card.type] || { label: card.type, emoji: '•' };

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 8,
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minHeight: 120,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, fontWeight: 700 }}>
          {meta.emoji} {meta.label}
        </span>
        <span style={{ color: c.accent, fontSize: 16, lineHeight: 1 }}>{c.icon}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.35 }}>
        {card.title}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
        {card.summary}
      </div>
    </div>
  );
}

/**
 * DailyBrief — панель из 4 карточек: health/pulse/idea/quickWin.
 * Режимы:
 *   siteId задан — конкретный сайт
 *   siteId пусто — показывает первый активный сайт портфеля
 */
export default function DailyBrief({ siteId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async (refresh = false) => {
    setLoading(true);
    setErr('');
    try {
      const r = await api.dailyBrief({ siteId, refresh });
      // если пришёл список (портфельный режим) — берём первый
      if (r.sites) setData(r.sites[0] || null);
      else setData(r);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { load(false); }, [siteId]);

  if (loading && !data) {
    return (
      <div style={{ padding: 14, color: '#64748b', fontSize: 12 }}>Загружаю брифинг…</div>
    );
  }
  if (err) {
    return (
      <div style={{ padding: 14, color: '#ef4444', fontSize: 12 }}>
        Не удалось загрузить brief: {err}
      </div>
    );
  }
  if (!data) return null;

  const { cards, siteName, fromCache, generatedAt } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#e2e8f0', letterSpacing: -.2 }}>
            На сегодня
          </h2>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            {siteName} {fromCache ? '• из кэша' : '• свежий'} {generatedAt ? `• ${new Date(generatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
        </div>
        <Btn v="ghost" onClick={() => load(true)} disabled={loading} title="Пересоздать брифинг (вызов AI)">
          ↻ Обновить
        </Btn>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 10,
      }}>
        <Card card={cards?.health} />
        <Card card={cards?.pulse} />
        <Card card={cards?.idea} />
        <Card card={cards?.quickWin} />
      </div>
    </div>
  );
}
