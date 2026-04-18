import { useState } from 'react';

/**
 * Философия портфеля — 5 принципов-якорей на Dashboard.
 *
 * Статичный набор (content в коде) — обновляется через PR по мере
 * формулирования новых принципов. Не CRUD: принцип — это редкое стратегическое
 * решение, не оперативная задача.
 *
 * UI: collapsible <details>. По умолчанию закрыт (не отвлекает), раскрыт
 * выявляет 5 карточек принципов. Дизайн минималистичный: иконка + заголовок +
 * короткое описание + ссылка на подробное обоснование в docs/.
 */

const PRINCIPLES = [
  {
    emoji: '🎯',
    title: 'Supreme — пользователь, не комиссия',
    body: 'Каждое рекомендованное действие должно быть лучшим для читателя. Нет «ангажированного» рейтинга, нет подкрашенных обзоров. Доверие = единственный MOAT, который нельзя купить.',
    ref: 'memory/project_supreme_principle.md',
  },
  {
    emoji: '🌳',
    title: 'Смежный плод — растём в adjacent semantic cluster',
    body: 'Следующая рубрика отстоит от предыдущей не дальше «adjacent keyword»: та же аудитория, те же мерчанты, тот же голос. Кофемашины → чайники, бытовая химия → пылесосы. Семантическая пропасть = новый сайт, не новая рубрика.',
    ref: 'docs/business-model.md §11 Adjacent Fruit',
  },
  {
    emoji: '💎',
    title: 'Expected Value UX — цифра за действием',
    body: '«Опубликовать review → +$15 к капитализации», «Refresh статьи → +$5». Каждое предложение операторской работы показывает свой $-эффект. Абстракт не мотивирует, число мотивирует.',
    ref: 'memory/feedback_expected_value_ux.md',
  },
  {
    emoji: '🤖',
    title: 'Автоматизация для новичка',
    body: 'Каждое повторяющееся действие = кнопка в SCC. Новичок без IT-опыта должен управлять портфелем через UI. Ни SSH, ни CLI для рутины.',
    ref: 'CLAUDE.md §главное правило',
  },
  {
    emoji: '🔄',
    title: 'Итеративность контента',
    body: 'Статья публикуется → собирает трафик → обновляется через 3-6 мес с новыми данными → растёт позициями. Refresh — наш основной механизм роста, не только публикация нового.',
    ref: 'memory/feedback_common_mistakes.md',
  },
];

export default function PhilosophyPanel() {
  return (
    <details
      style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 7,
        padding: '10px 14px', marginBottom: 12,
      }}
    >
      <summary style={{
        cursor: 'pointer', userSelect: 'none', fontSize: 12, fontWeight: 700,
        color: '#94a3b8', outline: 'none', padding: '2px 0',
      }}>
        📜 Философия портфеля <span style={{ color: '#64748b', fontWeight: 500, fontSize: 11 }}>— 5 принципов-якорей</span>
      </summary>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 10, marginTop: 10,
      }}>
        {PRINCIPLES.map((p) => (
          <PrincipleCard key={p.title} {...p} />
        ))}
      </div>
    </details>
  );
}

function PrincipleCard({ emoji, title, body, ref }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 5,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.3 }}>{title}</span>
      </div>
      <p style={{
        margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.55,
        display: expanded ? 'block' : '-webkit-box',
        WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{body}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#60a5fa', fontSize: 10, padding: 0,
          }}
        >
          {expanded ? '⌃ свернуть' : 'развернуть ⌄'}
        </button>
        <code style={{ fontSize: 9, color: '#475569', fontFamily: 'var(--mn)' }}>{ref}</code>
      </div>
    </div>
  );
}
