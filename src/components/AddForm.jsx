import { useState } from 'react';
import { Btn, Inp, Sel } from './ui.jsx';

export default function AddForm({ type, onAdd }) {
  const isA = type === 'article';
  const [d, setD] = useState(
    isA
      ? { title: '', url: '/', type: 'review', status: 'planned', sessions: 0, clicks: 0, cr: 0 }
      : { title: '', type: 'review', priority: 'medium', deadline: '', status: 'idea' }
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Inp value={d.title} onChange={(v) => setD({ ...d, title: v })} placeholder={isA ? 'Заголовок' : 'Название'} />
      {isA && <Inp value={d.url} onChange={(v) => setD({ ...d, url: v })} placeholder="/url/" />}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Sel value={d.type} onChange={(v) => setD({ ...d, type: v })} opts={[
          { v: 'review', l: 'Обзор' }, { v: 'comparison', l: 'Сравнение' }, { v: 'guide', l: 'Гайд' }, { v: 'quiz', l: 'Квиз' }, { v: 'tool', l: 'Инструмент' },
        ]} />
        {isA ? (
          <Sel value={d.status} onChange={(v) => setD({ ...d, status: v })} opts={[
            { v: 'planned', l: 'Planned' }, { v: 'draft', l: 'Draft' }, { v: 'published', l: 'Published' },
          ]} />
        ) : (
          <>
            <Sel value={d.priority} onChange={(v) => setD({ ...d, priority: v })} opts={[
              { v: 'high', l: '🔴 High' }, { v: 'medium', l: '🟡 Med' }, { v: 'low', l: '🟢 Low' },
            ]} />
            <Sel value={d.status} onChange={(v) => setD({ ...d, status: v })} opts={[
              { v: 'idea', l: 'Идея' }, { v: 'queued', l: 'Очередь' }, { v: 'in_progress', l: 'В работе' },
            ]} />
          </>
        )}
      </div>
      {!isA && <Inp value={d.deadline} onChange={(v) => setD({ ...d, deadline: v })} placeholder="YYYY-MM-DD" />}
      <Btn v="acc" onClick={() => onAdd(d)}>{isA ? 'Создать' : 'Добавить'}</Btn>
    </div>
  );
}
